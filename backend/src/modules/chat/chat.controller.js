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
        // =================================================================
        // BƯỚC 1: ROUTER - Phân loại ý định (Intent Classification)
        // =================================================================
        const { intent, reasoning } = await classifyIntent(message, modelConfig);
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
            const searchContext = await performWebSearch(message);

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

        // 2.1 Tạo Embedding cho câu hỏi
        let questionEmbedding;
        try {
            questionEmbedding = await getEmbedding(message);
        } catch (error) {
            console.error('❌ Embedding Error:', error);
            return res.json({ reply: 'Lỗi hệ thống khi xử lý câu hỏi (Embedding).' });
        }

        // 2.2 Adaptive Retrieval Parameters (Tuỳ chọn: có thể hardcode nếu muốn đơn giản)
        const retrievalParams = await adaptiveRetrieval(message, questionEmbedding);

        // 2.3 Thực hiện tìm kiếm (Vector + Keyword + RRF Fusion)
        const rawChunks = await multiStageRetrieval(
            questionEmbedding,
            message,
            retrievalParams.maxChunks
        );

        // =================================================================
        // BƯỚC 3: RE-RANKING & THRESHOLDING (Cohere)
        // =================================================================
        let finalChunks = [];
        try {
            finalChunks = await rerankContext(rawChunks, questionEmbedding, message);
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
                    multiHopReasoning(finalChunks.slice(0, 5), questionEmbedding, message)
                ]);
                clusters = results[0];
                reasoningChains = results[1];
            } catch (e) { console.warn('Advanced synthesis skipped:', e); }
        }

        // 4.2 Tạo prompt ngữ cảnh
        const fusedContext = fuseContext(finalChunks, reasoningChains, message);

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
