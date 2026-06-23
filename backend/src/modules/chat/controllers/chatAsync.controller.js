import { randomUUID } from 'node:crypto';
import { StatusCodes } from 'http-status-codes';
import { publishMessage } from '../../../kafka/producer.js';
import { TOPICS } from '../../../kafka/topics.js';
import { getJobResult } from '../../../redis/redisClient.js';

/**
 * POST /chat/async
 * Nhận message, đẩy vào Kafka, trả về requestId ngay lập tức.
 * Client dùng WebSocket (ws://host/ws) để nhận kết quả khi worker xử lý xong.
 */
export async function chatAsync(req, res) {
  const { message, model, conversationId, utilityModel, webSearch, webOnly, stream, forceAgent, mcpServer } = req.body;
  const userId = req.user?.id ?? null;
  // JWT thô để worker forward cho ai-service (USER_PROGRESS gọi ngược Node API).
  const authToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || undefined;

  if (!message) {
    return res.status(StatusCodes.BAD_REQUEST).json({ error: 'No message provided' });
  }

  const requestId = randomUUID();

  try {
    await publishMessage(TOPICS.CHAT_REQUESTS, requestId, {
      requestId,
      userId,
      message,
      model,
      conversationId,
      utilityModel,
      webSearch,
      webOnly,
      authToken,
      forceAgent,   // Agentic RAG: ép đường AGENT (dùng tool)
      mcpServer,    // chọn 1 MCP server (tên, khớp allowlist ai-service)
      stream: stream === true, // true -> worker stream token qua WS; false -> trả cục qua chat-responses
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

/**
 * GET /chat/result/:jobId
 * Polling lấy kết quả async job từ Redis.
 * - 200: đã có kết quả ({requestId, status:'success'|'error', data|error})
 * - 202: chưa xong (pending) -> client poll lại sau
 * - 503: kho kết quả (Redis) không sẵn sàng
 */
export async function getChatResult(req, res) {
  const { jobId } = req.params;
  if (!jobId) return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Missing jobId' });

  try {
    const result = await getJobResult(jobId);
    if (!result) {
      return res.status(StatusCodes.ACCEPTED).json({ requestId: jobId, status: 'pending' });
    }
    return res.status(StatusCodes.OK).json(result);
  } catch (err) {
    console.error('❌ [getChatResult] Redis error:', err.message);
    return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({ error: 'Result store unavailable' });
  }
}
