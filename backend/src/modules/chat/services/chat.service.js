import pool from '#db';
import { hashQuestion } from '#utils/hash.js';
import conversationService from './conversation.service.js';
import usageService from '#modules/usage/services/usage.service.js';
import { classifyIntent, INTENTS } from '#services/intentRouter.js';
import { saveChatAndTrack } from '../handlers/chat.helpers.js';
import { handleGreeting } from '../handlers/greeting.handler.js';
import { handleLiveSearch } from '../handlers/live-search.handler.js';
import { handleKnowledge } from '../handlers/knowledge.handler.js';
import { handleProgress } from '../handlers/progress.handler.js';

class ChatService {
    async logUnanswered(question) {
        try {
            const hash = hashQuestion(question);
            const [rows] = await pool.execute('SELECT 1 FROM unanswered_questions WHERE hash = ? LIMIT 1', [hash]);
            if (rows.length === 0) {
                await pool.execute(
                    'INSERT INTO unanswered_questions (question, hash, created_at) VALUES (?, ?, NOW())',
                    [question, hash]
                );
            }
        } catch (e) {
            console.warn('⚠️ Không thể ghi log unanswered:', e.message);
        }
    }

    async getChatHistory(userId, conversationId, limit = 6) {
        if (!conversationId || !userId) return [];
        try {
            const [rows] = await pool.execute(
                `SELECT question, bot_reply FROM user_questions
                 WHERE user_id = ? AND conversation_id = ?
                 ORDER BY created_at DESC LIMIT ?`,
                [userId, conversationId, limit]
            );
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
            ], 0.3, 200);
            return rewritten.trim().replace(/(?:^['"])|(?:['"]$)/g, '');
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
            if (history.length > 0) {
                processingMessage = await this.rewriteQuery(message, history, modelConfig);
            }
        }
        return { modelConfig, history, processingMessage };
    }

    async _routeIntent(processingMessage, modelConfig) {
        const { intent, reasoning } = await classifyIntent(processingMessage, modelConfig);
        console.log(`🧭 Intent: ${intent} | ${reasoning}`);
        return { intent, reasoning };
    }

    async processChat({ userId, message, model, conversationId }) {
        if (!message) throw new Error('No message provided');

        const { modelConfig, history, processingMessage } = await this._prepareRequest({ userId, message, model, conversationId });
        const { intent, reasoning } = await this._routeIntent(processingMessage, modelConfig);

        let result;

        if (intent === INTENTS.OFF_TOPIC) {
            return { reply: 'Xin lỗi, tôi không thể thảo luận về chủ đề này do các quy định về an toàn nội dung.', reasoning_steps: [`Intent: OFF_TOPIC (${reasoning})`], chunks_used: [] };
        }

        if (intent === INTENTS.GREETING) {
            result = await handleGreeting({ message, history, modelConfig, reasoning });
            return result;
        }

        if (intent === INTENTS.USER_PROGRESS) {
            if (!userId) return { reply: 'Bạn cần đăng nhập để xem tiến độ học tập của mình.', reasoning_steps: ['Require authentication'], chunks_used: [] };
            result = await handleProgress({ userId, message, processingMessage, history, modelConfig });
        } else if (intent === INTENTS.LIVE_SEARCH) {
            result = await handleLiveSearch({ message, processingMessage, history, modelConfig, reasoning });
        } else {
            result = await handleKnowledge({ message, processingMessage, history, modelConfig, intent, reasoning });
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

    async saveChat(userId, conversationId, question, reply, metadata) {
        const [existing] = await pool.execute(
            'SELECT COUNT(*) as count FROM user_questions WHERE user_id = ? AND conversation_id = ?',
            [userId, conversationId]
        );
        const conversationTitle = existing[0].count === 0 ? question.trim().substring(0, 50) : null;
        await pool.execute(
            'INSERT INTO user_questions (user_id, conversation_id, conversation_title, question, bot_reply, is_answered, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, conversationId, conversationTitle, question, reply, true, JSON.stringify(metadata)]
        );
    }

    async streamChat({ userId, message, model, conversationId }, sendEvent) {
        const { modelConfig, history, processingMessage } = await this._prepareRequest({ userId, message, model, conversationId });

        sendEvent('status', { content: '🧭 Đang phân tích ngữ cảnh & câu hỏi...' });
        const { intent, reasoning } = await this._routeIntent(processingMessage, modelConfig);
        sendEvent('status', { content: `🔍 Intent detected: ${intent}` });

        const onStatus = (msg) => sendEvent('status', { content: msg });
        let result;

        if (intent === INTENTS.OFF_TOPIC) {
            result = { reply: 'Xin lỗi, tôi không thể thảo luận về chủ đề này.', chunks_used: [], source_type: 'stream', web_sources: [], reasoning_steps: [] };
        } else if (intent === INTENTS.GREETING) {
            result = await handleGreeting({ message, history, modelConfig, reasoning, onStatus });
        } else if (intent === INTENTS.USER_PROGRESS) {
            if (!userId) {
                result = { reply: 'Bạn cần đăng nhập để xem tiến độ học tập của mình.', chunks_used: [], source_type: 'stream', web_sources: [], reasoning_steps: [] };
            } else {
                result = await handleProgress({ userId, message, processingMessage, history, modelConfig, onStatus });
            }
        } else if (intent === INTENTS.LIVE_SEARCH) {
            result = await handleLiveSearch({ message, processingMessage, history, modelConfig, reasoning, onStatus });
        } else {
            result = await handleKnowledge({ message, processingMessage, history, modelConfig, intent, reasoning, onStatus });
        }

        sendEvent('text', { content: result.reply });

        let finalConversationId = conversationId;
        if (userId) {
            const streamStartTime = Date.now();
            finalConversationId = await conversationService.getOrCreateConversationId(userId, conversationId);
            const isWebSearch = result.source_type === 'web_search' || result.source_type === 'kb_fallback_web';
            await this.saveChat(userId, finalConversationId, message, result.reply, {
                processing_time: streamStartTime, model: modelConfig.name,
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
            web_sources: result.web_sources
        });
    }
}

export default new ChatService();
