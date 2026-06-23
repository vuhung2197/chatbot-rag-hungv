import axios from 'axios';
import '#bootstrap/env.js';

/**
 * Client gọi sang ai-service (Python/FastAPI) — lõi AI mới (intent + RAG + agent).
 * Bật/tắt bằng AI_SERVICE_ENABLED. Khi tắt (mặc định), backend dùng luồng Node cũ.
 * Persistence (lưu hội thoại/usage) VẪN ở Node — đây chỉ thay phần SINH câu trả lời.
 */

const BASE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export function aiServiceEnabled() {
    return process.env.AI_SERVICE_ENABLED === 'true';
}

// Header shared-secret giữa Node ↔ ai-service (nếu cấu hình). Chống truy cập trực tiếp.
function internalHeaders() {
    const token = process.env.INTERNAL_API_TOKEN;
    return token ? { 'X-Internal-Token': token } : {};
}

/** Liệt kê MCP tool khả dụng (cho UI dropdown). Trả { servers, tools }. */
export async function aiTools() {
    const { data } = await axios.get(`${BASE_URL}/tools`, {
        timeout: 15000,
        headers: internalHeaders(),
    });
    return data;
}

/** Gọi /chat (non-stream). Trả { reply, source_type, citations, meta }. */
export async function aiChat({ message, model, history, userId, authToken, forceAgent, mcpServer }) {
    const { data } = await axios.post(
        `${BASE_URL}/chat`,
        {
            message,
            model,
            history,
            user_id: userId ?? null,
            auth_token: authToken ?? null,
            force_agent: forceAgent ?? false,
            mcp_server: mcpServer ?? null,
        },
        { timeout: 60000, headers: internalHeaders() }
    );
    return data;
}

/**
 * Gọi /chat/stream (SSE) và forward từng event qua onEvent(type, payload).
 * Tự gom 'text' làm reply cuối; trả { reply, meta } khi xong.
 */
export async function aiChatStream(
    { message, model, history, userId, authToken, forceAgent, mcpServer },
    onEvent
) {
    const resp = await axios.post(
        `${BASE_URL}/chat/stream`,
        {
            message,
            model,
            history,
            user_id: userId ?? null,
            auth_token: authToken ?? null,
            force_agent: forceAgent ?? false,
            mcp_server: mcpServer ?? null,
        },
        { responseType: 'stream', timeout: 120000, headers: internalHeaders() }
    );

    let buffer = '';
    let reply = '';
    let meta = {};

    await new Promise((resolve, reject) => {
        resp.data.on('data', (chunk) => {
            buffer += chunk.toString('utf8');
            // SSE: các event ngăn cách bằng "\n\n", mỗi dòng "data: {json}"
            let idx;
            while ((idx = buffer.indexOf('\n\n')) !== -1) {
                const raw = buffer.slice(0, idx).trim();
                buffer = buffer.slice(idx + 2);
                if (!raw.startsWith('data:')) continue;
                let evt;
                try {
                    evt = JSON.parse(raw.slice(5).trim());
                } catch {
                    continue;
                }
                const { type, ...payload } = evt;
                if (type === 'text') reply = payload.content || reply;
                else if (type === 'done') meta = payload;
                onEvent?.(type, payload);
            }
        });
        resp.data.on('end', resolve);
        resp.data.on('error', reject);
    });

    return { reply, meta };
}
