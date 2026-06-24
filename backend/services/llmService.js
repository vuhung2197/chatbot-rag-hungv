import axios from 'axios';

/**
 * Quyết định header Authorization an toàn cho 1 endpoint LLM.
 * - Chặn SSRF: chỉ cho http/https, chặn IP metadata nội bộ của cloud.
 * - Chống rò rỉ key: KHÔNG gửi OPENAI_API_KEY của server tới host lạ.
 *   Ưu tiên key riêng của model (client cung cấp); nếu là host OpenAI thì dùng
 *   key server; còn lại (local LM Studio/Ollama) dùng placeholder vô hại.
 */
function resolveAuthHeader(fullUrl, modelKey) {
    let u;
    try {
        u = new URL(fullUrl);
    } catch {
        throw new Error(`Invalid model URL: ${fullUrl}`);
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        throw new Error(`Unsupported protocol: ${u.protocol}`);
    }
    // Chặn cloud metadata endpoint (SSRF phổ biến)
    if (u.hostname === '169.254.169.254' || u.hostname === 'metadata.google.internal') {
        throw new Error(`Blocked host (SSRF protection): ${u.hostname}`);
    }

    const isOpenAI = /(^|\.)openai\.com$/i.test(u.hostname);
    if (modelKey) return `Bearer ${modelKey}`;            // key riêng của model (do client cấu hình)
    if (isOpenAI) return `Bearer ${process.env.OPENAI_API_KEY}`; // chỉ gửi key server tới OpenAI
    return 'Bearer lm-studio';                            // local: token placeholder, không phải secret
}

/**
 * Chuẩn bị thông số gọi LLM dùng chung cho cả gọi thường và streaming:
 * - resolve URL (Docker host, chuẩn hoá /api/v1 -> /v1, nối /chat/completions)
 * - tính temperature/maxTokens/name
 * - dựng header Authorization an toàn
 */
function prepareCall(model, _temperature, _maxTokens) {
    if (!model || !model.url || !model.name) {
        throw new Error('Invalid model configuration: missing url or name');
    }

    // Khi chạy trong Docker, localhost/127.0.0.1 của client trỏ về Mac host
    const resolvedUrl = model.url
        .replace('localhost', 'host.docker.internal')
        .replace('127.0.0.1', 'host.docker.internal');

    const normalizedUrl = resolvedUrl
        .replace(/\/api\/v1(\/?$)/, '/v1$1')
        .replace(/\/$/, '');
    const fullUrl = `${normalizedUrl}/chat/completions`;

    return {
        fullUrl,
        nameModel: model.name,
        temperatureModel: model.temperature !== undefined ? model.temperature : _temperature,
        maxTokensModel: model.maxTokens !== undefined ? model.maxTokens : _maxTokens,
        authHeader: resolveAuthHeader(fullUrl, model.key),
    };
}

/**
 * Gọi API mô hình ngôn ngữ (non-streaming) — trả về toàn bộ content.
 */
export async function callLLM(model, messages, _temperature = 0.2, _maxTokens = 512) {
    const { fullUrl, nameModel, temperatureModel, maxTokensModel, authHeader } = prepareCall(model, _temperature, _maxTokens);

    console.log('🔗 Calling LLM:', {
        url: fullUrl, model: nameModel, temperature: temperatureModel,
        max_tokens: maxTokensModel, messages_count: messages.length
    });

    try {
        const response = await axios.post(
            fullUrl,
            { model: nameModel, messages, temperature: temperatureModel, max_tokens: maxTokensModel },
            { headers: { 'Content-Type': 'application/json', 'Authorization': authHeader }, timeout: 180000 }
        );

        // Chỉ lấy content (câu trả lời thật). KHÔNG fallback sang reasoning_content vì đó là
        // phần "suy nghĩ" thô — nếu dùng làm output sẽ nhét rác vào rewriteQuery/classifyIntent.
        const msg = response.data.choices[0].message;
        const content = (msg.content || '').trim();
        if (!content) console.warn('⚠️ LLM trả về content rỗng (model reasoning chưa sinh xong content — có thể tăng max_tokens).');
        console.log('✅ LLM response received successfully');
        return content;
    } catch (error) {
        console.error('❌ LLM call error:', {
            message: error.message, response: error.response?.data, status: error.response?.status,
        });
        throw new Error(`LLM API Error: ${error.message} - ${error.response?.data ? JSON.stringify(error.response.data) : ''}`);
    }
}

/**
 * Gọi API mô hình ngôn ngữ (STREAMING) — đẩy từng token qua onToken(delta).
 * Trả về toàn bộ content đã ghép. Dùng cho bước sinh câu trả lời cuối để UX mượt.
 * @param {function(string):void} onToken - callback nhận từng đoạn text (delta.content)
 */
export async function callLLMStream(model, messages, _temperature = 0.2, _maxTokens = 512, onToken) {
    const { fullUrl, nameModel, temperatureModel, maxTokensModel, authHeader } = prepareCall(model, _temperature, _maxTokens);

    console.log('🔗 Calling LLM (stream):', { url: fullUrl, model: nameModel, max_tokens: maxTokensModel });

    const response = await axios.post(
        fullUrl,
        { model: nameModel, messages, temperature: temperatureModel, max_tokens: maxTokensModel, stream: true },
        { headers: { 'Content-Type': 'application/json', 'Authorization': authHeader }, timeout: 180000, responseType: 'stream' }
    );

    return await new Promise((resolve, reject) => {
        let full = '';
        let buffer = '';

        response.data.on('data', (chunk) => {
            buffer += chunk.toString('utf-8');
            // SSE: mỗi sự kiện cách nhau bằng \n; mỗi dòng dạng "data: {json}" hoặc "data: [DONE]"
            const lines = buffer.split('\n');
            buffer = lines.pop(); // giữ lại dòng cuối chưa trọn vẹn
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data:')) continue;
                const payload = trimmed.slice(5).trim();
                if (payload === '[DONE]') continue;
                try {
                    const json = JSON.parse(payload);
                    const delta = json.choices?.[0]?.delta?.content;
                    if (delta) {
                        full += delta;
                        if (onToken) onToken(delta);
                    }
                } catch {
                    // bỏ qua dòng JSON chưa trọn vẹn / keep-alive
                }
            }
        });

        response.data.on('end', () => {
            const content = full.trim();
            if (!content) console.warn('⚠️ LLM stream trả về content rỗng.');
            console.log('✅ LLM stream completed');
            resolve(content);
        });

        response.data.on('error', (err) => {
            console.error('❌ LLM stream error:', err.message);
            reject(new Error(`LLM Stream Error: ${err.message}`));
        });
    });
}
