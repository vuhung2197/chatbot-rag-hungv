import Redis from 'ioredis';

/**
 * Redis client singleton (ioredis).
 * Dùng cho: lưu kết quả async job (polling + chống race), cache dùng chung.
 * An toàn khi Redis down: ioredis tự reconnect; caller nên try/catch.
 */
let client = null;

export function getRedis() {
    if (!client) {
        client = new Redis({
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
            // Cho lệnh chờ khi đang kết nối (tránh fail "Stream isn't writeable" lúc mới khởi động);
            // maxRetriesPerRequest giới hạn để không treo mãi nếu Redis thật sự chết.
            maxRetriesPerRequest: 3,
            enableOfflineQueue: true,
            retryStrategy: (times) => Math.min(times * 200, 2000),
        });
        client.on('error', (e) => console.warn('⚠️ Redis error:', e.message));
        client.on('connect', () => console.log('✅ Redis connected'));
    }
    return client;
}

const RESULT_PREFIX = 'chat:result:';
const RESULT_TTL_SEC = parseInt(process.env.CHAT_RESULT_TTL_SEC || '3600', 10); // 1 giờ

/** Lưu kết quả async job theo requestId (TTL). */
export async function saveJobResult(requestId, payloadJsonString) {
    try {
        await getRedis().set(RESULT_PREFIX + requestId, payloadJsonString, 'EX', RESULT_TTL_SEC);
    } catch (e) {
        console.warn('⚠️ saveJobResult failed:', e.message);
    }
}

/** Đọc kết quả async job; trả object đã parse, hoặc null nếu chưa có. */
export async function getJobResult(requestId) {
    const raw = await getRedis().get(RESULT_PREFIX + requestId);
    return raw ? JSON.parse(raw) : null;
}

// ── Pub/Sub cho mô hình lai (stream token qua WebSocket) ──────────────
export const STREAM_CHANNEL_PREFIX = 'chat:stream:';

/** Worker publish 1 event (status/token/text/done) cho luồng stream của 1 requestId. */
export async function publishStreamEvent(requestId, event) {
    try {
        await getRedis().publish(STREAM_CHANNEL_PREFIX + requestId, JSON.stringify(event));
    } catch (e) {
        console.warn('⚠️ publishStreamEvent failed:', e.message);
    }
}

/**
 * Tạo connection SUBSCRIBER riêng (kết nối ở chế độ subscribe không chạy lệnh thường được).
 * Dùng ở API server để psubscribe chat:stream:* rồi forward về WebSocket.
 */
export function getRedisSubscriber() {
    return getRedis().duplicate();
}
