import '#bootstrap/env.js';
import { Kafka, logLevel } from 'kafkajs';
import { TOPICS } from '../kafka/topics.js';
import { publishMessage } from '../kafka/producer.js';
import chatService from '#modules/chat/services/chat.service.js';

const kafka = new Kafka({
  clientId: 'chat-worker',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9094').split(','),
  logLevel: logLevel.WARN,
  retry: { initialRetryTime: 300, retries: 8 },
});

const consumer = kafka.consumer({ groupId: 'chat-worker-group' });

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: TOPICS.CHAT_REQUESTS, fromBeginning: false });

  console.log('🚀 Chat worker started — listening on topic:', TOPICS.CHAT_REQUESTS);

  await consumer.run({
    eachMessage: async ({ message }) => {
      const requestId = message.key?.toString();
      const payload = JSON.parse(message.value.toString());

      console.log(`📨 [Worker] Processing requestId: ${requestId}`);

      try {
        const result = await chatService.processChat(payload);

        await publishMessage(TOPICS.CHAT_RESPONSES, requestId, {
          requestId,
          status: 'success',
          data: result,
        });

        console.log(`✅ [Worker] Done requestId: ${requestId}`);
      } catch (err) {
        console.error(`❌ [Worker] Failed requestId: ${requestId}`, err.message);

        await publishMessage(TOPICS.CHAT_RESPONSES, requestId, {
          requestId,
          status: 'error',
          error: err.message,
        });
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
