import { hashQuestion } from '#utils/hash.js';
import conversationService from './conversation.service.js';
import usageService from '#modules/usage/services/usage.service.js';
import { classifyIntentRule, INTENTS } from '#services/intentRouter.js';
import { saveChatAndTrack } from '../handlers/chat.helpers.js';
import { handleGreeting } from '../handlers/greeting.handler.js';
import { handleLiveSearch } from '../handlers/live-search.handler.js';
import { handleKnowledge, handleCatalog } from '../handlers/knowledge.handler.js';
import { handleProgress } from '../handlers/progress.handler.js';
import chatRepository from '../repositories/chat.repository.js';
import { aiServiceEnabled, aiChat, aiChatStream } from '#services/aiServiceClient.js';

class ChatService {
    async logUnanswered(question) {
        try {
            const hash = hashQuestion(question);
            const existing = await chatRepository.findUnansweredByHash(hash);
            if (!existing) {
                await chatRepository.insertUnanswered(question, hash);
            }
        } catch (e) {
            console.warn('⚠️ Không thể ghi log unanswered:', e.message);
        }
    }

    async getChatHistory(userId, conversationId, limit = 6) {
        if (!conversationId || !userId) return [];
        try {
            const rows = await chatRepository.getChatHistory(userId, conversationId, limit);
            const history = [];
            for (let i = rows.length - 1; i >= 0; i--) {
                if (rows[i].question) history.push({ role: 'user', content: rows[i].question });
                if (rows[i].bot_reply) history.push({ role: 'assistant', content: rows[i].bot_reply });
            }
            return history;
        } catch (e) {
            console.warn('⚠️ Failed to fetch history:', e.message);
            return [];
        }
    }

    async rewriteQuery(message, history, modelConfig) {
        if (!history || history.length === 0) return message;
        const { callLLM } = await import('#services/llmService.js');
        const historyText = history.slice(-4).map(h => `${h.role === 'user' ? 'User' : 'AI'}: ${h.content}`).join('\n');
        const systemPrompt = `Bạn là chuyên gia về ngôn ngữ. Nhiệm vụ của bạn là viết lại câu hỏi follow-up của người dùng thành một câu hỏi độc lập (Standalone Question) đầy đủ ngữ cảnh, dựa trên lịch sử hội thoại.
- GIỮ NGUYÊN nội dung cốt lõi của câu hỏi.
- THAY THẾ các đại từ thay thế (nó, anh ấy, cái đó...) bằng danh từ cụ thể từ lịch sử.
- NẾU câu hỏi đã rõ ràng, giữ nguyên.
- CHỈ TRẢ VỀ CÂU HỎI ĐÃ VIẾT LẠI. KHÔNG trả lời câu hỏi.`;
        try {
            const rewritten = await callLLM(modelConfig, [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Lịch sử hội thoại:\n${historyText}\n\nCâu hỏi hiện tại: ${message}\n\nViết lại:` }
            ], 0.3, 600);
            const cleaned = rewritten.trim().replace(/(?:^['"])|(?:['"]$)/g, '').trim();
            // Một số model (đặc biệt model reasoning) có thể trả về rỗng -> fallback về câu gốc
            // để tránh processingMessage rỗng làm hỏng intent routing và web search.
            return cleaned || message;
        } catch (e) {
            console.error('Rewrite query failed:', e.message);
            return message;
        }
    }

    async _prepareRequest({ userId, message, model, conversationId }) {
        const modelConfig = (model?.url && model?.name)
            ? model
            : { url: 'https://api.openai.com/v1', name: 'gpt-4o-mini' };

        let history = [];
        let processingMessage = message;
        if (userId && conversationId) {
            history = await this.getChatHistory(userId, conversationId);
            // Tối ưu: KHÔNG gọi LLM để rewrite nữa — dùng heuristic ghép ngữ cảnh (0 LLM call).
            if (history.length > 0) {
                processingMessage = this.buildSearchQuery(message, history);
            }
        }
        return { modelConfig, history, processingMessage };
    }

    /**
     * Tạo query cho tìm kiếm/định tuyến mà KHÔNG gọi LLM.
     * Nếu câu chứa đại từ tham chiếu hoặc quá ngắn (follow-up) -> ghép câu hỏi user gần nhất
     * để bổ sung ngữ cảnh; ngược lại giữ nguyên.
     */
    buildSearchQuery(message, history) {
        if (!history || history.length === 0) return message;
        // Ranh giới Unicode (?<!\p{L})...(?!\p{L}) thay cho \b: \w chỉ ASCII nên \b hỏng
        // với đại từ tiếng Việt có dấu (ấy, đó, vậy, điều đó...). Cờ 'u' bật \p{L}.
        const hasPronoun = /(?<!\p{L})(nó|anh ấy|cô ấy|họ|chúng|cái đó|cái này|điều đó|việc đó|đó|này|ấy|vậy)(?!\p{L})/iu.test(message);
        const isShort = message.trim().split(/\s+/).length <= 4;
        if (hasPronoun || isShort) {
            const lastUser = [...history].reverse().find(h => h.role === 'user' && h.content);
            if (lastUser) return `${lastUser.content} ${message}`.trim();
        }
        return message;
    }

    _routeIntent(processingMessage) {
        // Tối ưu: phân loại bằng LUẬT (regex), KHÔNG gọi LLM.
        const { intent, reasoning } = classifyIntentRule(processingMessage);
        console.log(`🧭 Intent (rule): ${intent} | ${reasoning}`);
        return { intent, reasoning };
    }

    async processChat({ userId, message, model, conversationId, utilityModel, webSearch, webOnly, debug, authToken }) {
        if (!message) throw new Error('No message provided');

        // Hybrid: nếu bật ai-service (Python), ủy quyền phần SINH câu trả lời sang đó.
        // Persistence vẫn ở Node. Tắt flag -> luồng Node cũ bên dưới (rollback an toàn).
        if (aiServiceEnabled()) {
            return await this._processViaAiService({ userId, message, model, conversationId, authToken });
        }

        const webSearchEnabled = webSearch !== false; // mặc định bật
        const { modelConfig, history, processingMessage } = await this._prepareRequest({ userId, message, model, conversationId });

        // Chế độ Web Only: đi thẳng web search, BỎ QUA phân loại intent + RAG.
        let intent, reasoning;
        if (webOnly) {
            intent = INTENTS.LIVE_SEARCH;
            reasoning = 'Web Only mode (bỏ qua phân loại ý định & RAG)';
        } else {
            ({ intent, reasoning } = this._routeIntent(processingMessage));
        }

        let result;

        if (intent === INTENTS.OFF_TOPIC) {
            return { reply: 'Xin lỗi, tôi không thể thảo luận về chủ đề này do các quy định về an toàn nội dung.', reasoning_steps: [`Intent: OFF_TOPIC (${reasoning})`], chunks_used: [] };
        }

        if (intent === INTENTS.GREETING) {
            result = await handleGreeting({ message, history, modelConfig, reasoning });
            return result;
        }

        if (intent === INTENTS.KB_CATALOG) {
            result = await handleCatalog({ message, history, modelConfig, reasoning });
        } else if (intent === INTENTS.USER_PROGRESS) {
            if (!userId) return { reply: 'Bạn cần đăng nhập để xem tiến độ học tập của mình.', reasoning_steps: ['Require authentication'], chunks_used: [] };
            result = await handleProgress({ userId, message, processingMessage, history, modelConfig });
        } else if (intent === INTENTS.LIVE_SEARCH) {
            result = await handleLiveSearch({ message, processingMessage, history, modelConfig, reasoning, webSearchEnabled, debug });
        } else {
            result = await handleKnowledge({ message, processingMessage, history, modelConfig, intent, reasoning, webSearchEnabled, debug });
        }

        if (userId) {
            const { _meta = {} } = result;
            const isWebSearch = result.source_type === 'web_search' || result.source_type === 'kb_fallback_web';
            const finalConversationId = await saveChatAndTrack(this, {
                userId, conversationId, message, reply: result.reply,
                metadata: { model: modelConfig.name, ..._meta },
                usageType: intent === INTENTS.USER_PROGRESS ? 'progress_query' : isWebSearch ? 'web_search' : 'advanced_rag',
                usageData: { tokens: _meta.tokens || result.reply.length }
            });
            return { ...result, conversationId: finalConversationId };
        }

        return result;
    }

    /** Đường hybrid (non-stream): gọi ai-service sinh câu trả lời, Node lo lưu trữ. */
    async _processViaAiService({ userId, message, model, conversationId, authToken }) {
        const { modelConfig, history } = await this._prepareRequest({ userId, message, model, conversationId });
        const data = await aiChat({ message, model: modelConfig, history, userId, authToken });
        const result = {
            reply: data.reply,
            chunks_used: [],
            source_type: data.source_type,
            web_sources: [],
            reasoning_steps: [`Intent: ${data.meta?.intent} (ai-service)`],
            _meta: { ...(data.meta || {}), via: 'ai-service' }
        };
        if (userId) {
            const finalConversationId = await saveChatAndTrack(this, {
                userId, conversationId, message, reply: result.reply,
                metadata: { model: modelConfig.name, ...result._meta },
                usageType: 'advanced_rag',
                usageData: { tokens: result.reply.length }
            });
            return { ...result, conversationId: finalConversationId };
        }
        return result;
    }

    /** Đường hybrid (stream): forward SSE từ ai-service xuống client, Node lo lưu trữ. */
    async _streamViaAiService({ userId, message, model, conversationId, authToken }, sendEvent) {
        const reqStart = Date.now();
        const { modelConfig, history } = await this._prepareRequest({ userId, message, model, conversationId });

        const { reply, meta } = await aiChatStream({ message, model: modelConfig, history, userId, authToken }, (type, payload) => {
            if (type === 'status') sendEvent('status', { content: payload.content });
            else if (type === 'token') sendEvent('token', { content: payload.content });
            else if (type === 'text') sendEvent('text', { content: payload.content });
            // 'done' do Node tự phát sau khi lưu (kèm conversationId)
        });

        const processingTime = Date.now() - reqStart;
        let finalConversationId = conversationId;
        if (userId) {
            finalConversationId = await conversationService.getOrCreateConversationId(userId, conversationId);
            const isWebSearch = meta.source_type === 'web_search' || meta.source_type === 'kb_fallback_web';
            await this.saveChat(userId, finalConversationId, message, reply, {
                processing_time: processingTime, model: modelConfig.name,
                total_chunks: meta.total_chunks ?? 0, intent: meta.intent, source: meta.source_type, via: 'ai-service'
            });
            await usageService.trackUsage(userId, isWebSearch ? 'web_search' : 'stream_chat', { tokens: reply.length / 4 });
        }

        sendEvent('done', {
            chunks_used: [], conversationId: finalConversationId,
            source_type: meta.source_type, web_sources: [],
            processing_time: processingTime, intent: meta.intent, model: modelConfig.name
        });
    }

    async saveChat(userId, conversationId, question, reply, metadata) {
        const count = await chatRepository.countMessages(userId, conversationId);
        const conversationTitle = count === 0 ? question.trim().substring(0, 50) : null;
        await chatRepository.insertMessage(userId, conversationId, conversationTitle, question, reply, metadata);
    }

    async streamChat({ userId, message, model, conversationId, utilityModel, webSearch, webOnly, authToken }, sendEvent) {
        // Hybrid: bật ai-service -> stream từ Python; tắt -> luồng Node cũ bên dưới.
        if (aiServiceEnabled()) {
            return await this._streamViaAiService({ userId, message, model, conversationId, authToken }, sendEvent);
        }

        const reqStart = Date.now(); // mốc bắt đầu để tính THỜI LƯỢNG xử lý (ms)
        const webSearchEnabled = webSearch !== false; // mặc định bật
        const { modelConfig, history, processingMessage } = await this._prepareRequest({ userId, message, model, conversationId });

        // Chế độ Web Only: đi thẳng web search, bỏ qua phân loại intent + RAG.
        let intent, reasoning;
        if (webOnly) {
            intent = INTENTS.LIVE_SEARCH;
            reasoning = 'Web Only mode (bỏ qua phân loại ý định & RAG)';
            sendEvent('status', { content: '🌐 Chế độ Web Only — tìm thẳng trên internet...' });
        } else {
            sendEvent('status', { content: '🧭 Đang phân tích câu hỏi...' });
            ({ intent, reasoning } = this._routeIntent(processingMessage));
            sendEvent('status', { content: `🔍 Intent detected: ${intent}` });
        }

        const onStatus = (msg) => sendEvent('status', { content: msg });
        // Stream từng token của câu trả lời cuối xuống client (UX mượt, không phải chờ sinh xong).
        const onToken = (delta) => sendEvent('token', { content: delta });
        let result;

        if (intent === INTENTS.OFF_TOPIC) {
            result = { reply: 'Xin lỗi, tôi không thể thảo luận về chủ đề này.', chunks_used: [], source_type: 'stream', web_sources: [], reasoning_steps: [] };
        } else if (intent === INTENTS.GREETING) {
            result = await handleGreeting({ message, history, modelConfig, reasoning, onStatus, onToken });
        } else if (intent === INTENTS.KB_CATALOG) {
            result = await handleCatalog({ message, history, modelConfig, reasoning, onStatus, onToken });
        } else if (intent === INTENTS.USER_PROGRESS) {
            if (!userId) {
                result = { reply: 'Bạn cần đăng nhập để xem tiến độ học tập của mình.', chunks_used: [], source_type: 'stream', web_sources: [], reasoning_steps: [] };
            } else {
                result = await handleProgress({ userId, message, processingMessage, history, modelConfig, onStatus, onToken });
            }
        } else if (intent === INTENTS.LIVE_SEARCH) {
            result = await handleLiveSearch({ message, processingMessage, history, modelConfig, reasoning, onStatus, onToken, webSearchEnabled });
        } else {
            result = await handleKnowledge({ message, processingMessage, history, modelConfig, intent, reasoning, onStatus, onToken, webSearchEnabled });
        }

        // Gửi bản đầy đủ (đã format Markdown) để client chốt lại nội dung cuối cùng.
        sendEvent('text', { content: result.reply });

        const processingTime = Date.now() - reqStart; // THỜI LƯỢNG thật (ms), không phải timestamp

        let finalConversationId = conversationId;
        if (userId) {
            finalConversationId = await conversationService.getOrCreateConversationId(userId, conversationId);
            const isWebSearch = result.source_type === 'web_search' || result.source_type === 'kb_fallback_web';
            await this.saveChat(userId, finalConversationId, message, result.reply, {
                processing_time: processingTime, model: modelConfig.name,
                total_chunks: result.chunks_used?.length ?? 0, intent, source: result.source_type
            });
            await usageService.trackUsage(userId, isWebSearch ? 'web_search' : 'stream_chat', { tokens: result.reply.length / 4 });
        }

        sendEvent('done', {
            reply: result.reply,
            reasoning_steps: result.reasoning_steps,
            chunks_used: result.chunks_used,
            conversationId: finalConversationId,
            source_type: result.source_type,
            web_sources: result.web_sources,
            processing_time: processingTime,
            intent,
            model: modelConfig.name,
        });
    }
}

export default new ChatService();
