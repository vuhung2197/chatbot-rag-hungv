import '#bootstrap/env.js';
import { Kafka, logLevel } from 'kafkajs';
import { TOPICS } from '../kafka/topics.js';
import { publishMessage } from '../kafka/producer.js';
import chatService from '#modules/chat/services/chat.service.js';
import { publishStreamEvent, saveJobResult } from '../redis/redisClient.js';

const kafka = new Kafka({
  clientId: 'chat-worker',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9094').split(','),
  logLevel: logLevel.WARN,
  connectionTimeout: 10000,
  requestTimeout: 60000, // > maxWaitTimeInMs để Fetch dài không bị timeout
  retry: { initialRetryTime: 300, retries: 12, maxRetryTime: 30000 },
});

const consumer = kafka.consumer({
  groupId: 'chat-worker-group',
  sessionTimeout: 60000,      // rộng: xử lý LLM lâu không bị rớt khỏi group
  heartbeatInterval: 5000,    // gửi heartbeat đều để broker biết worker còn sống
  maxWaitTimeInMs: 5000,      // fetch chờ tối đa 5s (< requestTimeout)
  retry: {
    retries: Infinity,                 // không bỏ cuộc
    restartOnFailure: async () => true, // tự khởi động lại consumer sau crash (tự phục hồi)
  },
});

// Log khi consumer crash để theo dõi (restartOnFailure lo việc khởi động lại)
consumer.on(consumer.events.CRASH, ({ payload }) => {
  console.error(`⚠️ [Worker] Consumer crash: ${payload?.error?.message} — sẽ tự khởi động lại.`);
});

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: TOPICS.CHAT_REQUESTS, fromBeginning: false });

  console.log('🚀 Chat worker started — listening on topic:', TOPICS.CHAT_REQUESTS);

  await consumer.run({
    eachMessage: async ({ message }) => {
      const requestId = message.key?.toString();
      const payload = JSON.parse(message.value.toString());

      console.log(`📨 [Worker] Processing requestId: ${requestId}${payload.stream ? ' (stream)' : ''}`);

      try {
        if (payload.stream) {
          // MÔ HÌNH LAI: stream từng token qua Redis pub/sub -> API relay về WebSocket.
          // Tái dùng nguyên pipeline streamChat, chỉ đổi đích sendEvent sang Redis.
          let doneData = null;
          const sendEvent = (type, data) => {
            publishStreamEvent(requestId, { type, ...data });
            if (type === 'done') doneData = data;
          };
          await chatService.streamChat(payload, sendEvent);
          // Lưu kết quả cuối để hỗ trợ polling GET /chat/result/:jobId (chống mất khi rớt WS)
          if (doneData) {
            await saveJobResult(requestId, JSON.stringify({ requestId, status: 'success', data: doneData }));
          }
          console.log(`✅ [Worker] Done (stream) requestId: ${requestId}`);
          return;
        }

        // Mặc định: xử lý xong trả CỤC qua chat-responses (Kafka)
        const result = await chatService.processChat(payload);

        await publishMessage(TOPICS.CHAT_RESPONSES, requestId, {
          requestId,
          status: 'success',
          data: result,
        });

        console.log(`✅ [Worker] Done requestId: ${requestId}`);
      } catch (err) {
        console.error(`❌ [Worker] Failed requestId: ${requestId}`, err.message);

        if (payload.stream) {
          // stream mode: báo lỗi qua kênh Redis client đang nghe
          await publishStreamEvent(requestId, { type: 'error', message: err.message });
        } else {
          await publishMessage(TOPICS.CHAT_RESPONSES, requestId, {
            requestId,
            status: 'error',
            error: err.message,
          });
        }
      }
    },
  });
}

async function shutdown() {
  console.log('🛑 Chat worker shutting down...');
  await consumer.disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

run().catch((err) => {
  console.error('💥 Chat worker fatal error:', err);
  process.exit(1);
});
