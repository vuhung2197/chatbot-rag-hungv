import { v4 as uuidv4 } from 'uuid';
import { StatusCodes } from 'http-status-codes';
import { publishMessage } from '../../../kafka/producer.js';
import { TOPICS } from '../../../kafka/topics.js';

/**
 * POST /chat/async
 * Nhận message, đẩy vào Kafka, trả về requestId ngay lập tức.
 * Client dùng WebSocket (ws://host/ws) để nhận kết quả khi worker xử lý xong.
 */
export async function chatAsync(req, res) {
  const { message, model, conversationId } = req.body;
  const userId = req.user?.id ?? null;

  if (!message) {
    return res.status(StatusCodes.BAD_REQUEST).json({ error: 'No message provided' });
  }

  const requestId = uuidv4();

  try {
    await publishMessage(TOPICS.CHAT_REQUESTS, requestId, {
      requestId,
      userId,
      message,
      model,
      conversationId,
    });

    return res.status(StatusCodes.ACCEPTED).json({
      requestId,
      status: 'queued',
      wsHint: 'Connect to ws://<host>/ws then send {"type":"subscribe","requestId":"<id>"}',
    });
  } catch (err) {
    console.error('❌ [chatAsync] Failed to publish to Kafka:', err.message);
    return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
      error: 'Queue unavailable, try /chat for synchronous fallback',
    });
  }
}
