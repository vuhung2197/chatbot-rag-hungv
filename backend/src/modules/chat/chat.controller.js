import pool from '../../../db.js';
import { getEmbedding } from '../../../services/embeddingVector.js';
import { retrieveTopChunks } from '../../../services/rag_retrieve.js';
import { hashQuestion } from '../../../utils/hash.js';
import { StatusCodes } from 'http-status-codes';
import '../../../bootstrap/env.js';
import { trackUsage } from '../usage/usage.controller.js';
import { getOrCreateConversationId } from './conversation.controller.js';
import {
    multiStageRetrieval,
    semanticClustering,
    multiHopReasoning,
    fuseContext,
    adaptiveRetrieval,
    rerankContext,
    rerankWithCohere
} from '../../../services/advancedRAGFixed.js';
import { callLLM } from '../../../services/llmService.js';
import { performWebSearch } from '../../../services/webSearch.service.js';
import { classifyIntent, INTENTS } from '../../../services/intentRouter.js';

// ==================== HELPER FUNCTIONS ====================

/**
 * Chuyển đổi văn bản AI trả lời thành Markdown giống ChatGPT.
 */
function toMarkdown(text) {
    if (!text) return '';

    const paragraphs = text.split(/\n{2,}/);
    const firstPara = paragraphs.shift()?.trim();
    let markdown = '';

    // B1: Câu đầu tiên in đậm
    if (firstPara) {
        const sentences = firstPara.split(/(?<=\.)\s+/);
        const firstSentence = sentences.shift();
        markdown += `**${firstSentence.trim()}**\n\n`;
        if (sentences.length) {
            markdown += `${sentences.join(' ')}\n\n`;
        }
    }

    // B2: Duyệt các đoạn còn lại
    for (let para of paragraphs) {
        para = para.trim();
        if (!para) continue;

        const isList =
            para.startsWith('- ') ||
            para.startsWith('* ') ||
            /^[•\-+]\s/.test(para) ||
            (/(,|\.)\s/.test(para) && para.length < 200);

        if (isList) {
            const points = para
                .split(/(?:^|\n)[•\-+*]?\s*/)
                .map((p) => p.trim())
                .filter((p) => p.length > 0);
            points.forEach((point) => {
                markdown += `- ${point}\n`;
            });
            markdown += '\n';
        } else {
            markdown += `${para}\n\n`;
        }
    }

    return markdown.trim();
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

        // Detect headers
        if (trimmed.match(/^#{1,6}\s/)) {
            markdown += `${trimmed}\n\n`;
            continue;
        }

        // Detect lists
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^[•\-+]\s/.test(trimmed)) {
            const points = trimmed
                .split(/(?:^|\n)[•\-+*]?\s*/)
                .map(p => p.trim())
                .filter(p => p.length > 0);

            points.forEach(point => {
                markdown += `- ${point}\n`;
            });
            markdown += '\n';
            continue;
        }

        // Detect code blocks
        if (trimmed.startsWith('```')) {
            markdown += `${trimmed}\n\n`;
            continue;
        }

        // Regular paragraph
        markdown += `${trimmed}\n\n`;
    }

    return markdown.trim();
}

/**
 * Ẩn thông tin nhạy cảm
 */
export function maskSensitiveInfo(text, mapping = {}) {
    let counter = 1;
    // Số điện thoại
    text = text.replace(/\b\d{2,4}[-\s]?\d{3,4}[-\s]?\d{3,4}\b/g, (match) => {
        const key = `[PHONE_${counter++}]`;
        mapping[key] = match;
        return key;
    });
    // Email
    text = text.replace(
        /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
        (match) => {
            const key = `[EMAIL_${counter++}]`;
            mapping[key] = match;
            return key;
        }
    );
    // Địa chỉ
    text = text.replace(
        /(\d{1,4}\s?[\w\s,./-]+(đường|phố|tòa nhà)[^\n,.]*)/gi,
        (match) => {
            const key = `[ADDR_${counter++}]`;
            mapping[key] = match;
            return key;
        }
    );
    return text;
}

/**
 * Khôi phục thông tin nhạy cảm
 */
export function unmaskSensitiveInfo(text, mapping) {
    for (const [key, value] of Object.entries(mapping)) {
        text = text.replaceAll(key, value);
    }
    return text;
}

// function callLLM moved to services/llmService.js

/**
 * Log unanswered questions
 */
async function logUnanswered(question) {
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

/**
 * Gọi OpenAI ChatGPT (Basic)
 */
export async function askChatGPT(
    question,
    context,
    systemPrompt = 'Bạn là trợ lý AI chuyên trả lời dựa trên thông tin được cung cấp.',
    model
) {
    const mapping = {};
    const maskedQuestion = maskSensitiveInfo(question, mapping);

    let prompt = '';
    if (context && context.trim().length > 0) {
        const maskedContext = maskSensitiveInfo(context, mapping);
        prompt = `Thông tin tham khảo:\n${maskedContext}\n\nCâu hỏi: ${maskedQuestion}`;
    } else {
        prompt = maskedQuestion;
    }

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
    ];

    let reply = await callLLM(model, messages, 0.2, 512);
    reply = unmaskSensitiveInfo(reply, mapping);

    return reply;
}

/**
 * Gọi LLM với context nâng cao (Advanced)
 */
async function askAdvancedChatGPT(question, context, systemPrompt, model) {
    const maxContextLength = 6000;
    const truncatedContext = context.length > maxContextLength
        ? `${context.substring(0, maxContextLength)}...`
        : context;

    console.log(`📝 Context size: ${context.length} chars, truncated to: ${truncatedContext.length} chars`);

    const prompt = `# Câu hỏi: ${question}
 
 # Thông tin tham khảo:
 ${truncatedContext}
 
 # Hướng dẫn:
 Hãy phân tích câu hỏi và sử dụng thông tin tham khảo để tạo câu trả lời toàn diện. 
 Kết hợp thông tin từ nhiều nguồn một cách logic và có cấu trúc.`;

    const messages = [
        { role: 'system', content: (systemPrompt || '').substring(0, 4000) },
        { role: 'user', content: prompt.substring(0, 8000) }
    ];

    const reply = await callLLM(model, messages, 0.3, 800);
    return reply;
}


// ==================== NEW HELPER FUNCTIONS (CONTEXT) ====================

/**
 * Lấy lịch sử chat gần nhất để làm context
 */
async function getChatHistory(userId, conversationId, limit = 6) {
    if (!conversationId || !userId) {
        console.log('⚠️ getChatHistory: Missing userId or conversationId', { userId, conversationId });
        return [];
    }
    try {
        console.log(`🔍 Fetching history for User: ${userId}, Conv: ${conversationId}`);
        const [rows] = await pool.execute(
            `SELECT question, bot_reply FROM user_questions 
             WHERE user_id = ? AND conversation_id = ? 
             ORDER BY created_at DESC LIMIT ?`,
            [userId, conversationId, limit]
        );
        console.log(`✅ Found ${rows.length} history items.`);

        // Rows are DESC (newest first), so reverse them to get chronological order
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

/**
 * Viết lại câu hỏi dựa trên lịch sử để search tốt hơn (Query Expansion)
 */
async function rewriteQuery(message, history, modelConfig) {
    if (!history || history.length === 0) return message;

    // Create a mini-history string (last 2 turns)
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

        const clean = rewritten.trim().replace(/^['"]|['"]$/g, '');
        console.log(`📝 Query Rewrite: "${message}" -> "${clean}"`);
        return clean;
    } catch (e) {
        console.error('Rewrite query failed:', e.message);
        return message;
    }
}

// ==================== CONTROLLER FUNCTIONS ====================

/**
 * Xử lý API chat chính sử dụng thuần RAG.
 */
/**
 * CONTROLLER CHÍNH: Xử lý Chat với Advanced RAG Pipeline
 * Quy trình: Router -> Hybrid Retrieval -> Re-ranking -> Context Fusion -> LLM
 */
export async function chat(req, res) {
    const { message, model, conversationId } = req.body;
    const userId = req.user?.id;

    if (!message)
        return res.status(StatusCodes.BAD_REQUEST).json({ reply: 'No message!' });

    // Validate Model Config
    const modelConfig = (model && model.url && model.name)
        ? model
        : { url: 'https://api.openai.com/v1', name: 'gpt-4o-mini' }; // Default fallback

    try {
        // Prepare History & Context
        let history = [];
        let processingMessage = message; // Message used for Processing (Intent, Search) - NOT display

        if (userId && conversationId) {
            history = await getChatHistory(userId, conversationId);
            if (history.length > 0) {
                processingMessage = await rewriteQuery(message, history, modelConfig);
            }
        }

        // =================================================================
        // BƯỚC 1: ROUTER - Phân loại ý định (Intent Classification)
        // =================================================================
        const { intent, reasoning } = await classifyIntent(processingMessage, modelConfig);
        console.log(`🧭 Intent: ${intent} | ${reasoning}`);

        // Xử lý các intent không cần tra cứu kiến thức (Non-Knowledge)
        if (intent === INTENTS.OFF_TOPIC) {
            return res.json({
                reply: "Xin lỗi, tôi không thể thảo luận về chủ đề này do các quy định về an toàn nội dung.",
                reasoning_steps: [`Intent: OFF_TOPIC (${reasoning})`, 'Action: Refusal'],
                chunks_used: []
            });
        }

        if (intent === INTENTS.GREETING) {
            const directSystemPrompt = "Bạn là trợ lý AI thân thiện. Hãy trả lời người dùng một cách tự nhiên, lịch sự và ngắn gọn.";
            const messages = [
                { role: 'system', content: directSystemPrompt },
                ...history.slice(-4),
                { role: 'user', content: message }
            ];
            const directReply = await callLLM(modelConfig, messages, 0.7, 200);
            return res.json({
                reply: directReply,
                reasoning_steps: [`Intent: GREETING (${reasoning})`, 'Action: Direct Chat (No RAG)'],
                chunks_used: []
            });
        }

        // Xử lý tìm kiếm web (Live Search)
        if (intent === INTENTS.LIVE_SEARCH) {
            console.log('🌍 Performing LIVE_SEARCH...');
            const t0 = Date.now();
            const searchContext = await performWebSearch(processingMessage);

            const systemPrompt = `Bạn là một trợ lý cập nhật tin tức thông minh. 
Nhiệm vụ của bạn là trả lời câu hỏi của người dùng dựa trên kết quả tìm kiếm web mới nhất được cung cấp.
Thời gian hiện tại: ${new Date().toLocaleString('vi-VN')}

Yêu cầu:
1. Trả lời chính xác, ngắn gọn và đi thẳng vào vấn đề.
2. NẾU kết quả tìm kiếm có chứa thông tin, HÃY DẪN NGUỒN (Link URL) ở cuối câu trả lời dạng [Title](URL).
3. Nếu không tìm thấy thông tin, hãy thành thật nói không biết.
4. Trình bày đẹp bằng Markdown.`;

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
                `Synthesized answer from top web results`,
                `Processing time: ${processTime}ms`
            ];

            // Save to DB and return response (similar logic)
            if (userId) {
                const finalConversationId = await getOrCreateConversationId(userId, conversationId);
                const metadata = { processing_time: processTime, model: modelConfig.name, intent: intent, source: 'web_search' };
                await pool.execute(
                    'INSERT INTO user_questions (user_id, conversation_id, conversation_title, question, bot_reply, is_answered, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [userId, finalConversationId, null, message, reply, true, JSON.stringify(metadata)]
                );
                await trackUsage(userId, 'web_search', { tokens: searchContext.length });
                return res.json({
                    reply,
                    conversationId: finalConversationId,
                    chunks_used: [], // Web search doesn't use RAG chunks
                    reasoning_steps: reasoningSteps
                });
            }

            return res.json({
                reply,
                chunks_used: [],
                reasoning_steps: reasoningSteps
            });
        }

        // =================================================================
        // BƯỚC 2: RETRIEVAL - Tìm kiếm dữ liệu (Hybrid Search)
        // =================================================================
        console.log('🧠 Starting RAG Pipeline for:', message);
        const t0 = Date.now();

        // 2.1 Tạo Embedding cho câu hỏi (Dùng rewritten query)
        let questionEmbedding;
        try {
            questionEmbedding = await getEmbedding(processingMessage);
        } catch (error) {
            console.error('❌ Embedding Error:', error);
            return res.json({ reply: 'Lỗi hệ thống khi xử lý câu hỏi (Embedding).' });
        }

        // 2.2 Adaptive Retrieval Parameters (Tuỳ chọn: có thể hardcode nếu muốn đơn giản)
        const retrievalParams = await adaptiveRetrieval(processingMessage, questionEmbedding);

        // 2.3 Thực hiện tìm kiếm (Vector + Keyword + RRF Fusion)
        const rawChunks = await multiStageRetrieval(
            questionEmbedding,
            processingMessage,
            retrievalParams.maxChunks
        );

        // =================================================================
        // BƯỚC 3: RE-RANKING & THRESHOLDING (Cohere)
        // =================================================================
        let finalChunks = [];
        try {
            finalChunks = await rerankContext(rawChunks, questionEmbedding, processingMessage);
        } catch (error) {
            console.error('❌ Re-ranking Error:', error);
            finalChunks = rawChunks; // Fallback
        }

        if (finalChunks.length === 0) {
            await logUnanswered(message);
            return res.json({
                reply: 'Tôi chưa có đủ thông tin trong cơ sở dữ liệu để trả lời câu hỏi này chính xác.',
                reasoning_steps: ['Retrieval returned 0 relevant chunks (after thresholding)'],
                chunks_used: []
            });
        }

        // =================================================================
        // BƯỚC 4: CONTEXT SYNTHESIS (Tổng hợp ngữ cảnh)
        // =================================================================

        // 4.1 Tiền xử lý: Semantic Clustering & Reasoning (Advanced)
        let clusters = [], reasoningChains = [];
        if (retrievalParams.useMultiHop) {
            // Chỉ chạy nếu cần thiết để tiết kiệm thời gian
            try {
                const results = await Promise.all([
                    semanticClustering(finalChunks, questionEmbedding),
                    multiHopReasoning(finalChunks.slice(0, 5), questionEmbedding, processingMessage)
                ]);
                clusters = results[0];
                reasoningChains = results[1];
            } catch (e) { console.warn('Advanced synthesis skipped:', e); }
        }

        // 4.2 Tạo prompt ngữ cảnh
        const fusedContext = fuseContext(finalChunks, reasoningChains, processingMessage);

        // =================================================================
        // BƯỚC 5: LLM GENERATION (Sinh câu trả lời)
        // =================================================================
        const systemPrompt = `Bạn là một trợ lý AI chuyên nghiệp. Hãy trả lời câu hỏi dựa trên thông tin được cung cấp dưới đây.
Nếu thông tin không có trong ngữ cảnh, hãy nói "Tôi không biết".
Luôn trích dẫn nguồn (nếu có thể) và trình bày mạch lạc bằng Markdown.

---
${fusedContext}
---`;

        let reply = '';
        try {
            // Cho phép context dài hơn cho câu hỏi phức tạp
            const replyRaw = await callLLM(modelConfig, [
                { role: 'system', content: systemPrompt },
                ...history.slice(-6), // Pass history (max 6 turns)
                { role: 'user', content: message }
            ], 0.3, 1000);

            // Format lại markdown nếu cần (tuỳ chọn)
            reply = toAdvancedMarkdown(replyRaw);

        } catch (error) {
            console.error('❌ LLM Generation Error:', error);
            reply = "Xin lỗi, đã xảy ra lỗi khi tạo câu trả lời.";
        }

        const t1 = Date.now();
        const processTime = t1 - t0;
        console.log(`⏱️ Total RAG Time: ${processTime}ms`);

        // =================================================================
        // BƯỚC 6: LOGGING & RESPONSE
        // =================================================================
        const reasoningSteps = [
            `Intent: ${intent}`,
            `Retrieved ${rawChunks.length} chunks (Hybrid Search)`,
            `Selected ${finalChunks.length} chunks after Re-ranking`,
            `Processing time: ${processTime}ms`
        ];

        // Format chunks for client
        const chunksForClient = finalChunks.map(c => ({
            id: c.id,
            title: c.title,
            content: c.content,
            score: c.final_score || c.score,
            source: c.source_type || 'unknown'
        }));

        if (userId) {
            // Lưu vào DB nếu đã đăng nhập
            const finalConversationId = await getOrCreateConversationId(userId, conversationId);

            // Logic tạo title hội thoại mới (nếu cần) - giữ nguyên logic cũ
            const [existingMessages] = await pool.execute(
                'SELECT COUNT(*) as count FROM user_questions WHERE user_id = ? AND conversation_id = ?',
                [userId, finalConversationId]
            );
            let conversationTitle = null;
            if (existingMessages[0].count === 0) {
                conversationTitle = message.trim().substring(0, 50);
            }

            const metadata = {
                processing_time: processTime,
                model: modelConfig.name,
                total_chunks: finalChunks.length,
                intent: intent
            };

            await pool.execute(
                'INSERT INTO user_questions (user_id, conversation_id, conversation_title, question, bot_reply, is_answered, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userId, finalConversationId, conversationTitle, message, reply, true, JSON.stringify(metadata)]
            );

            await trackUsage(userId, 'advanced_rag', { tokens: fusedContext.length });

            res.json({
                reply,
                conversationId: finalConversationId,
                chunks_used: chunksForClient,
                reasoning_steps: reasoningSteps
            });
        } else {
            // Guest mode
            res.json({
                reply,
                chunks_used: chunksForClient,
                reasoning_steps: reasoningSteps
            });
        }

    } catch (err) {
        console.error('❌ Critical Error in Chat Controller:', err);
        res.status(500).json({ reply: 'Đã xảy ra lỗi nghiêm trọng phía máy chủ.' });
    }
}

/**
 * API lấy lịch sử chat gần nhất (giữ nguyên legacy endpoint).
 */
export async function history(req, res) {
    const userId = req.user?.id;

    if (!userId)
        return res
            .status(StatusCodes.UNAUTHORIZED)
            .json({ error: 'Chưa đăng nhập' });

    try {
        const [rows] = await pool.execute(
            `SELECT id, question, bot_reply, is_answered, created_at 
       FROM user_questions 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
            [userId]
        );
        res.json(rows);
    } catch (err) {
        console.error('❌ Lỗi khi lấy lịch sử câu hỏi:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
}

/**
 * Advanced Chat API với Multi-Chunk Reasoning
 */
// function advancedChat is now deprecated as main chat function has been upgraded.
export const advancedChat = chat;

/**
 * Get advanced RAG statistics
 */
export async function getAdvancedRAGStats(req, res) {
    try {
        const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_questions,
        AVG(CAST(metadata->>'total_chunks' AS NUMERIC)) as avg_chunks,
        AVG(CAST(metadata->>'processing_time' AS NUMERIC)) as avg_processing_time,
        COUNT(CASE WHEN CAST(metadata->>'reasoning_chains' AS NUMERIC) > 0 THEN 1 END) as complex_questions
      FROM user_questions 
      WHERE metadata IS NOT NULL
    `);

        res.json({
            success: true,
            stats: stats[0]
        });
    } catch (err) {
        console.error('❌ Lỗi get stats:', err);
        res.status(500).json({ success: false, error: err.message });
    }
}

/**
 * Controller xử lý Chat với cơ chế Streaming (Server-Sent Events)
 * Endpoint: /chat/stream
 */
export async function streamChat(req, res) {
    const { message, model, conversationId } = req.body;
    const userId = req.user?.id;

    if (!message) return res.status(400).json({ error: 'No message provided' });

    // Validate Model
    const modelConfig = (model && model.url && model.name)
        ? model
        : { url: 'https://api.openai.com/v1', name: 'gpt-4o-mini' };

    // Setup headers for SSE
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Helper to send events
    const sendEvent = (type, data) => {
        res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    };

    try {
        // Step 1: Router
        sendEvent('status', { content: '🧭 Đang phân tích ngữ cảnh & câu hỏi...' });

        // Prepare History & Context
        let history = [];
        let processingMessage = message;
        if (userId && conversationId) {
            history = await getChatHistory(userId, conversationId);
            if (history.length > 0) {
                processingMessage = await rewriteQuery(message, history, modelConfig);
            }
        }

        const { intent, reasoning } = await classifyIntent(processingMessage, modelConfig);
        sendEvent('status', { content: `🔍 Intent detected: ${intent}` });

        let reply = '';
        let reasoningDetail = [`Intent: ${intent}`];
        let chunksUsed = [];
        let metadata = {};

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
            const searchContext = await performWebSearch(processingMessage);

            sendEvent('status', { content: '📝 Đang tổng hợp thông tin...' });
            const systemPrompt = `Bạn là trợ lý cập nhật tin tức. Trả lời dựa trên thông tin sau:\n${searchContext}`;

            reply = await callLLM(modelConfig, [
                { role: 'system', content: systemPrompt },
                ...history.slice(-4),
                { role: 'user', content: message }
            ]);
            // Note: callLLM hiện tại chưa support stream token, nên ta gửi cả chunk text
            sendEvent('text', { content: reply });
        }

        // Case 3: Knowledge RAG (Simplified for Stream Demo)
        else if (intent === INTENTS.KNOWLEDGE) {
            sendEvent('status', { content: '🧠 Đang tra cứu dữ liệu nội bộ...' });
            // Reuse existing RAG logic here if needed, or simplified version
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
                reply = "Xin lỗi, tôi không tìm thấy thông tin trong tài liệu.";
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

        // Save to DB and get Conversation ID
        let finalConversationId = conversationId;
        if (userId) {
            finalConversationId = await getOrCreateConversationId(userId, conversationId);

            // Determine title if new conversation
            let conversationTitle = null;
            if (!conversationId) { // Only check if new conversation
                const [existingMessages] = await pool.execute(
                    'SELECT COUNT(*) as count FROM user_questions WHERE user_id = ? AND conversation_id = ?',
                    [userId, finalConversationId]
                );
                if (existingMessages[0].count === 0) {
                    conversationTitle = message.trim().substring(0, 50);
                }
            }

            const metadata = {
                processing_time: 0, // Placeholder
                model: modelConfig.name,
                total_chunks: chunksUsed.length,
                intent: intent,
                source: 'stream'
            };

            await pool.execute(
                'INSERT INTO user_questions (user_id, conversation_id, conversation_title, question, bot_reply, is_answered, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userId, finalConversationId, conversationTitle, message, reply, true, JSON.stringify(metadata)]
            );

            // Track usage
            await trackUsage(userId, 'stream_chat', { tokens: reply.length / 4 });
        }

        // Finalize
        sendEvent('done', {
            reply,
            reasoning_steps: reasoningDetail,
            chunks_used: chunksUsed,
            conversationId: finalConversationId
        });

    } catch (error) {
        console.error('Stream Error:', error);
        sendEvent('error', { message: 'Đã xảy ra lỗi trong quá trình xử lý.' });
    } finally {
        res.end();
    }
}
