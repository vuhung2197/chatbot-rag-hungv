import pool from '#db';
import { getEmbedding } from '#services/embeddingVector.js';
import { hashQuestion } from '#utils/hash.js';
import conversationService from './conversation.service.js';
import usageService from '#modules/usage/services/usage.service.js';
import {
    multiStageRetrieval,
    semanticClustering,
    multiHopReasoning,
    fuseContext,
    adaptiveRetrieval,
    rerankContext
} from '#services/advancedRAGFixed.js';
import { callLLM } from '#services/llmService.js';
import { performWebSearch } from '#services/webSearch.service.js';
import { classifyIntent, INTENTS } from '#services/intentRouter.js';

// ==================== HELPER FUNCTIONS ====================

/**
 * Chuyển đổi văn bản AI trả lời thành Markdown giống ChatGPT. (Deprecated/Simple)
 */
function toMarkdown(text) {
    if (!text) return '';
    // ... logic (simplified or full)
    // For now using the advanced one as primary
    return toAdvancedMarkdown(text);
}

/**
 * Chuyển đổi văn bản AI trả lời thành Markdown với cấu trúc tốt hơn (Advanced)
 */
function toAdvancedMarkdown(text) {
    if (!text) return '';
    const paragraphs = text.split(/\n{2,}/);
    let markdown = '';
    for (const para of paragraphs) {
        const trimmed = para.trim();
        if (!trimmed) continue;
        if (trimmed.match(/^#{1,6}\s/)) { markdown += `${trimmed}\n\n`; continue; }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^[•\-+]\s/.test(trimmed)) {
            const points = trimmed.split(/(?:^|\n)[•\-+*]?\s*/).map(p => p.trim()).filter(p => p.length > 0);
            points.forEach(point => { markdown += `- ${point}\n`; });
            markdown += '\n';
            continue;
        }
        if (trimmed.startsWith('```')) { markdown += `${trimmed}\n\n`; continue; }
        markdown += `${trimmed}\n\n`;
    }
    return markdown.trim();
}

/**
 * Ẩn thông tin nhạy cảm
 */
function maskSensitiveInfo(text, mapping = {}) {
    let counter = 1;
    // Phone
    text = text.replace(/\b\d{2,4}[-\s]?\d{3,4}[-\s]?\d{3,4}\b/g, (match) => {
        const key = `[PHONE_${counter++}]`;
        mapping[key] = match;
        return key;
    });
    // Email
    text = text.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, (match) => {
        const key = `[EMAIL_${counter++}]`;
        mapping[key] = match;
        return key;
    });
    return text;
}

/**
 * Khôi phục thông tin nhạy cảm
 */
function unmaskSensitiveInfo(text, mapping) {
    for (const [key, value] of Object.entries(mapping)) {
        text = text.replaceAll(key, value);
    }
    return text;
}

// ==================== WEB SEARCH HELPERS ====================

class ChatService {
    async logUnanswered(question) {
        try {
            const hash = hashQuestion(question);
            const [rows] = await pool.execute(
                'SELECT 1 FROM unanswered_questions WHERE hash = ? LIMIT 1',
                [hash]
            );
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
                const row = rows[i];
                if (row.question) history.push({ role: 'user', content: row.question });
                if (row.bot_reply) history.push({ role: 'assistant', content: row.bot_reply });
            }
            return history;
        } catch (e) {
            console.warn('⚠️ Filed to fetch history:', e.message);
            return [];
        }
    }

    async rewriteQuery(message, history, modelConfig) {
        if (!history || history.length === 0) return message;
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
            return rewritten.trim().replace(/^['"]|['"]$/g, '');
        } catch (e) {
            console.error('Rewrite query failed:', e.message);
            return message;
        }
    }

    async processChat({ userId, message, model, conversationId }) {
        if (!message) throw new Error('No message provided');

        // Validate Model Config
        const modelConfig = (model && model.url && model.name)
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

        // Router
        const { intent, reasoning } = await classifyIntent(processingMessage, modelConfig);
        console.log(`🧭 Intent: ${intent} | ${reasoning}`);

        // Handle OFF_TOPIC
        if (intent === INTENTS.OFF_TOPIC) {
            return {
                reply: "Xin lỗi, tôi không thể thảo luận về chủ đề này do các quy định về an toàn nội dung.",
                reasoning_steps: [`Intent: OFF_TOPIC (${reasoning})`, 'Action: Refusal'],
                chunks_used: []
            };
        }

        // Handle GREETING
        if (intent === INTENTS.GREETING) {
            const directSystemPrompt = "Bạn là trợ lý AI thân thiện. Hãy trả lời người dùng một cách tự nhiên, lịch sự và ngắn gọn.";
            const messages = [
                { role: 'system', content: directSystemPrompt },
                ...history.slice(-4),
                { role: 'user', content: message }
            ];
            const directReply = await callLLM(modelConfig, messages, 0.7, 200);
            return {
                reply: directReply,
                reasoning_steps: [`Intent: GREETING (${reasoning})`, 'Action: Direct Chat (No RAG)'],
                chunks_used: []
            };
        }

        // Handle LIVE_SEARCH
        if (intent === INTENTS.LIVE_SEARCH) {
            const t0 = Date.now();
            const searchResult = await performWebSearch(processingMessage);
            const { context: searchContext, sources: webSources } = searchResult;

            const systemPrompt = `Bạn là một trợ lý cập nhật tin tức thông minh. Nhiệm vụ của bạn là trả lời câu hỏi của người dùng dựa trên kết quả tìm kiếm web mới nhất được cung cấp.\nThời gian hiện tại: ${new Date().toLocaleString('vi-VN')}\n\nYêu cầu:\n1. Trả lời chính xác, ngắn gọn.\n2. DẪN NGUỒN (Link URL) ở cuối câu trả lời dạng [Title](URL).\n3. Nếu không tìm thấy thông tin, hãy thành thật nói không biết.\n4. Trình bày đẹp bằng Markdown.`;

            const replyRaw = await callLLM(modelConfig, [
                { role: 'system', content: systemPrompt },
                ...history.slice(-4),
                { role: 'user', content: `# Câu hỏi: ${message}\n\n${searchContext}` }
            ], 0.4, 800);

            const reply = toAdvancedMarkdown(replyRaw);
            const processTime = Date.now() - t0;
            const reasoningSteps = [
                `Intent: LIVE_SEARCH (${reasoning})`,
                `Performed Web Search via Tavily AI`,
                `Synthesized answer from ${webSources.length} web results`,
                `Processing time: ${processTime}ms`
            ];

            if (userId) {
                const finalConversationId = await conversationService.getOrCreateConversationId(userId, conversationId);
                await this.saveChat(userId, finalConversationId, message, reply, { processing_time: processTime, model: modelConfig.name, intent: intent, source: 'web_search' });
                await usageService.trackUsage(userId, 'web_search', { tokens: searchContext.length });
                // Gap 4: Include web_sources + source_type in response
                return { reply, conversationId: finalConversationId, chunks_used: [], reasoning_steps: reasoningSteps, source_type: 'web_search', web_sources: webSources };
            }
            return { reply, chunks_used: [], reasoning_steps: reasoningSteps, source_type: 'web_search', web_sources: webSources };
        }

        // Handle KNOWLEDGE (RAG)
        const t0 = Date.now();
        const questionEmbedding = await getEmbedding(processingMessage);
        const retrievalParams = await adaptiveRetrieval(processingMessage, questionEmbedding);

        const rawChunks = await multiStageRetrieval(
            questionEmbedding,
            processingMessage,
            retrievalParams.maxChunks
        );

        let finalChunks = [];
        try {
            finalChunks = await rerankContext(rawChunks, questionEmbedding, processingMessage);
        } catch (error) {
            console.error('❌ Re-ranking Error:', error);
            finalChunks = rawChunks;
        }

        if (finalChunks.length === 0) {
            await this.logUnanswered(message);

            // Fallback: Thử tìm trên Web thay vì bỏ cuộc
            console.log('📭 KB returned 0 chunks, falling back to Web Search...');
            {
                try {
                    const searchResult = await performWebSearch(processingMessage);
                    const { context: searchContext, sources: webSources } = searchResult;
                    if (searchContext && !searchContext.includes('chưa được cấu hình') && !searchContext.includes('gặp lỗi')) {
                        const fallbackPrompt = `Bạn là một trợ lý AI thông minh. Câu hỏi của người dùng không tìm thấy trong cơ sở dữ liệu nội bộ, nên bạn sẽ trả lời dựa trên kết quả tìm kiếm web.
Thời gian hiện tại: ${new Date().toLocaleString('vi-VN')}

Yêu cầu:
1. Trả lời chính xác, ngắn gọn.
2. DẪN NGUỒN (Link URL) ở cuối câu trả lời dạng [Title](URL).
3. Nếu không tìm thấy thông tin, hãy thành thật nói không biết.
4. Trình bày đẹp bằng Markdown.
5. Lưu ý: Kết quả này từ internet, KHÔNG phải từ tài liệu nội bộ.`;

                        const replyRaw = await callLLM(modelConfig, [
                            { role: 'system', content: fallbackPrompt },
                            ...history.slice(-4),
                            { role: 'user', content: `# Câu hỏi: ${message}\n\n${searchContext}` }
                        ], 0.4, 800);

                        const reply = toAdvancedMarkdown(replyRaw);
                        const processTime = Date.now() - t0;
                        const reasoningSteps = [
                            `Intent: KNOWLEDGE (${reasoning})`,
                            `Retrieval returned 0 relevant chunks from KB`,
                            `Fallback: Performed Web Search via Tavily AI`,
                            `Synthesized answer from ${webSources.length} web results`,
                            `Processing time: ${processTime}ms`
                        ];

                        if (userId) {
                            const finalConversationId = await conversationService.getOrCreateConversationId(userId, conversationId);
                            await this.saveChat(userId, finalConversationId, message, reply, {
                                processing_time: processTime, model: modelConfig.name,
                                intent: 'KNOWLEDGE_FALLBACK_WEB', source: 'kb_fallback_web'
                            });
                            await usageService.trackUsage(userId, 'web_search', { tokens: searchContext.length });
                            return { reply, conversationId: finalConversationId, chunks_used: [], reasoning_steps: reasoningSteps, source_type: 'kb_fallback_web', web_sources: webSources };
                        }
                        return { reply, chunks_used: [], reasoning_steps: reasoningSteps, source_type: 'kb_fallback_web', web_sources: webSources };
                    }
                } catch (fallbackError) {
                    console.warn('⚠️ Web Search fallback failed:', fallbackError.message);
                }
            }

            // Nếu fallback cũng thất bại → trả lời gốc
            return {
                reply: 'Tôi chưa có đủ thông tin trong cơ sở dữ liệu để trả lời câu hỏi này chính xác.',
                reasoning_steps: ['Retrieval returned 0 relevant chunks', 'Web Search fallback also failed'],
                chunks_used: []
            };
        }

        // Context Synthesis
        let clusters = [], reasoningChains = [];
        if (retrievalParams.useMultiHop) {
            try {
                const results = await Promise.all([
                    semanticClustering(finalChunks, questionEmbedding),
                    multiHopReasoning(finalChunks.slice(0, 5), questionEmbedding, processingMessage)
                ]);
                clusters = results[0];
                reasoningChains = results[1];
            } catch (e) { console.warn('Advanced synthesis skipped:', e); }
        }

        const fusedContext = fuseContext(finalChunks, reasoningChains, processingMessage);
        const systemPrompt = `Bạn là một trợ lý AI chuyên nghiệp. Hãy trả lời câu hỏi dựa trên thông tin được cung cấp dưới đây.\nNếu thông tin không có trong ngữ cảnh, hãy nói "Tôi không biết".\nLuôn trích dẫn nguồn (nếu có thể) và trình bày mạch lạc bằng Markdown.\n\n---\n${fusedContext}\n---`;

        let reply = '';
        try {
            const replyRaw = await callLLM(modelConfig, [
                { role: 'system', content: systemPrompt },
                ...history.slice(-6),
                { role: 'user', content: message }
            ], 0.3, 1000);
            reply = toAdvancedMarkdown(replyRaw);
        } catch (error) {
            console.error('❌ LLM Generation Error:', error);
            reply = "Xin lỗi, đã xảy ra lỗi khi tạo câu trả lời.";
        }

        const processTime = Date.now() - t0;
        const reasoningSteps = [
            `Intent: ${intent}`,
            `Retrieved ${rawChunks.length} chunks (Hybrid Search)`,
            `Selected ${finalChunks.length} chunks after Re-ranking`,
            `Processing time: ${processTime}ms`
        ];

        const chunksForClient = finalChunks.map(c => ({
            id: c.id,
            title: c.title,
            content: c.content,
            score: c.final_score || c.score,
            source: c.source_type || 'unknown'
        }));

        if (userId) {
            const finalConversationId = await conversationService.getOrCreateConversationId(userId, conversationId);
            const metadata = {
                processing_time: processTime,
                model: modelConfig.name,
                total_chunks: finalChunks.length,
                intent: intent
            };
            await this.saveChat(userId, finalConversationId, message, reply, metadata);
            await usageService.trackUsage(userId, 'advanced_rag', { tokens: fusedContext.length });
            return { reply, conversationId: finalConversationId, chunks_used: chunksForClient, reasoning_steps: reasoningSteps };
        }

        return { reply, chunks_used: chunksForClient, reasoning_steps: reasoningSteps };
    }

    async saveChat(userId, conversationId, question, reply, metadata) {
        // Decide conversation title if new
        const [existingMessages] = await pool.execute(
            'SELECT COUNT(*) as count FROM user_questions WHERE user_id = ? AND conversation_id = ?',
            [userId, conversationId]
        );
        let conversationTitle = null;
        if (existingMessages[0].count === 0) {
            conversationTitle = question.trim().substring(0, 50);
        }
        await pool.execute(
            'INSERT INTO user_questions (user_id, conversation_id, conversation_title, question, bot_reply, is_answered, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, conversationId, conversationTitle, question, reply, true, JSON.stringify(metadata)]
        );
    }

    async streamChat({ userId, message, model, conversationId }, sendEvent) {
        // Validate Model
        const modelConfig = (model && model.url && model.name)
            ? model
            : { url: 'https://api.openai.com/v1', name: 'gpt-4o-mini' };

        // Step 1: Router
        sendEvent('status', { content: '🧭 Đang phân tích ngữ cảnh & câu hỏi...' });

        // Prepare History & Context
        let history = [];
        let processingMessage = message;
        if (userId && conversationId) {
            history = await this.getChatHistory(userId, conversationId);
            if (history.length > 0) {
                processingMessage = await this.rewriteQuery(message, history, modelConfig);
            }
        }

        const { intent, reasoning } = await classifyIntent(processingMessage, modelConfig);
        sendEvent('status', { content: `🔍 Intent detected: ${intent}` });

        let reply = '';
        let reasoningDetail = [`Intent: ${intent}`];
        let chunksUsed = [];
        let webSources = [];
        let sourceType = 'stream';
        let finalConversationId = conversationId;
        const streamStartTime = Date.now();

        try {
            // Case 1: Greeting
            if (intent === INTENTS.GREETING) {
                sendEvent('status', { content: '👋 Đang soạn câu trả lời...' });
                const directReply = await callLLM(modelConfig, [
                    { role: 'system', content: "Bạn là trợ lý AI thân thiện. Hãy trả lời ngắn gọn." },
                    ...history.slice(-4),
                    { role: 'user', content: message }
                ]);
                reply = directReply;
                sendEvent('text', { content: reply });
            }
            // Case 2: Live Search
            else if (intent === INTENTS.LIVE_SEARCH) {
                sendEvent('status', { content: '🌍 Đang tìm kiếm trên internet...' });
                const searchResult = await performWebSearch(processingMessage);
                const { context: searchContext, sources } = searchResult;
                webSources = sources;
                sourceType = 'web_search';

                sendEvent('status', { content: '📝 Đang tổng hợp thông tin...' });
                const systemPrompt = `Bạn là một trợ lý cập nhật tin tức thông minh. Nhiệm vụ của bạn là trả lời câu hỏi của người dùng dựa trên kết quả tìm kiếm web mới nhất được cung cấp.\nThời gian hiện tại: ${new Date().toLocaleString('vi-VN')}\n\nYêu cầu:\n1. Trả lời chính xác, ngắn gọn.\n2. DẪN NGUỒN (Link URL) ở cuối câu trả lời dạng [Title](URL).\n3. Nếu không tìm thấy thông tin, hãy thành thật nói không biết.\n4. Trình bày đẹp bằng Markdown.`;

                const replyRaw = await callLLM(modelConfig, [
                    { role: 'system', content: systemPrompt },
                    ...history.slice(-4),
                    { role: 'user', content: `# Câu hỏi: ${message}\n\n${searchContext}` }
                ], 0.4, 800);
                reply = toAdvancedMarkdown(replyRaw);
                reasoningDetail.push(
                    `Performed Web Search via Tavily AI`,
                    `Synthesized answer from ${webSources.length} web results`
                );
                sendEvent('text', { content: reply });
            }
            // Case 3: Knowledge RAG
            else if (intent === INTENTS.KNOWLEDGE) {
                sendEvent('status', { content: '🧠 Đang tra cứu dữ liệu nội bộ...' });
                const questionEmbedding = await getEmbedding(processingMessage);
                const rawChunks = await multiStageRetrieval(questionEmbedding, processingMessage, 5);
                chunksUsed = rawChunks.map(c => ({
                    id: c.id,
                    title: c.title,
                    content: c.content,
                    score: c.score,
                    source: c.source_type || 'vector',
                    stage: c.retrieval_stage || 'retrieval'
                }));

                if (rawChunks.length === 0) {
                    // Fallback: Thử tìm trên Web thay vì bỏ cuộc
                    sendEvent('status', { content: '📭 Không tìm thấy trong tài liệu, đang thử tìm trên web...' });
                    try {
                        const searchResult = await performWebSearch(processingMessage);
                        const { context: searchContext, sources } = searchResult;
                        if (searchContext && !searchContext.includes('chưa được cấu hình') && !searchContext.includes('gặp lỗi')) {
                            sendEvent('status', { content: '📝 Đang tổng hợp từ kết quả web...' });
                            const fallbackPrompt = `Bạn là một trợ lý AI thông minh. Câu hỏi của người dùng không tìm thấy trong cơ sở dữ liệu nội bộ, nên bạn sẽ trả lời dựa trên kết quả tìm kiếm web.\nThời gian hiện tại: ${new Date().toLocaleString('vi-VN')}\n\nYêu cầu:\n1. Trả lời chính xác, ngắn gọn.\n2. DẪN NGUỒN (Link URL) ở cuối câu trả lời dạng [Title](URL).\n3. Nếu không tìm thấy thông tin, hãy thành thật nói không biết.\n4. Trình bày đẹp bằng Markdown.\n5. Lưu ý: Kết quả này từ internet, KHÔNG phải từ tài liệu nội bộ.`;

                            const replyRaw = await callLLM(modelConfig, [
                                { role: 'system', content: fallbackPrompt },
                                ...history.slice(-4),
                                { role: 'user', content: `# Câu hỏi: ${message}\n\n${searchContext}` }
                            ], 0.4, 800);
                            reply = toAdvancedMarkdown(replyRaw);
                            webSources = sources;
                            sourceType = 'kb_fallback_web';
                            reasoningDetail.push(
                                `Retrieval returned 0 relevant chunks from KB`,
                                `Fallback: Performed Web Search via Tavily AI`,
                                `Synthesized answer from ${sources.length} web results`
                            );
                        } else {
                            reply = "Xin lỗi, tôi không tìm thấy thông tin trong tài liệu nội bộ và cũng không thể tìm trên web.";
                        }
                    } catch (fallbackError) {
                        console.warn('⚠️ Stream Web Search fallback failed:', fallbackError.message);
                        reply = "Xin lỗi, tôi không tìm thấy thông tin trong tài liệu.";
                    }
                } else {
                    sendEvent('status', { content: '💡 Đang suy luận...' });
                    const fusedContext = fuseContext(rawChunks, [], processingMessage);
                    reply = await callLLM(modelConfig, [
                        { role: 'system', content: "Trả lời câu hỏi dựa trên context sau:\n" + fusedContext },
                        ...history.slice(-6),
                        { role: 'user', content: message }
                    ]);
                }
                sendEvent('text', { content: reply });
            }
            // Case 4: Off Topic
            else {
                reply = "Xin lỗi, tôi không thể trả lời câu hỏi này.";
                sendEvent('text', { content: reply });
            }

            // Save to DB
            if (userId) {
                finalConversationId = await conversationService.getOrCreateConversationId(userId, conversationId);
                const processTime = Date.now() - streamStartTime;
                const isWebSearch = sourceType === 'web_search' || sourceType === 'kb_fallback_web';
                const metadata = {
                    processing_time: processTime,
                    model: modelConfig.name,
                    total_chunks: chunksUsed.length,
                    intent: intent,
                    source: sourceType
                };
                reasoningDetail.push(`Processing time: ${processTime}ms`);
                await this.saveChat(userId, finalConversationId, message, reply, metadata);
                await usageService.trackUsage(userId, isWebSearch ? 'web_search' : 'stream_chat', { tokens: reply.length / 4 });
            }

            // Finalize - Gap 4: Include web_sources + source_type
            sendEvent('done', {
                reply,
                reasoning_steps: reasoningDetail,
                chunks_used: chunksUsed,
                conversationId: finalConversationId,
                source_type: sourceType,
                web_sources: webSources
            });

        } catch (error) {
            console.error('Stream processing error:', error);
            throw error;
        }
    }

    async getHistory(userId) {
        const [rows] = await pool.execute(
            `SELECT id, question, bot_reply, is_answered, created_at 
       FROM user_questions 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
            [userId]
        );
        return rows;
    }

    async getAdvancedRAGStats() {
        const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_questions,
        AVG(CAST(metadata->>'total_chunks' AS NUMERIC)) as avg_chunks,
        AVG(CAST(metadata->>'processing_time' AS NUMERIC)) as avg_processing_time,
        COUNT(CASE WHEN CAST(metadata->>'reasoning_chains' AS NUMERIC) > 0 THEN 1 END) as complex_questions
      FROM user_questions 
      WHERE metadata IS NOT NULL
    `);
        return stats[0];
    }
}

export default new ChatService();
