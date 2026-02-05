import pool from '../../../db.js';
import { getEmbedding } from '../../../services/embeddingVector.js';
import { retrieveTopChunks } from '../../../services/rag_retrieve.js';
import { hashQuestion } from '../../../utils/hash.js';
import { StatusCodes } from 'http-status-codes';
import '../../../bootstrap/env.js';
import axios from 'axios';
// Temporary import from old usageController location
import { trackUsage } from '../usage/usage.controller.js';
import { getOrCreateConversationId } from './conversation.controller.js';
import {
    multiStageRetrieval,
    semanticClustering,
    multiHopReasoning,
    fuseContext,
    adaptiveRetrieval,
    rerankContext
} from '../../../services/advancedRAGFixed.js';

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

/**
 * Gọi API mô hình ngôn ngữ
 */
export async function callLLM(model, messages, _temperature = 0.2, _maxTokens = 512) {
    if (!model || !model.url || !model.name) {
        throw new Error('Invalid model configuration: missing url or name');
    }

    const baseUrl = model.url;
    const nameModel = model.name;
    const temperatureModel = model.temperature !== undefined ? model.temperature : _temperature;
    const maxTokensModel = model.maxTokens !== undefined ? model.maxTokens : _maxTokens;

    const normalizedUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const fullUrl = `${normalizedUrl}/chat/completions`;

    console.log('🔗 Calling LLM:', {
        url: fullUrl,
        model: nameModel,
        temperature: temperatureModel,
        max_tokens: maxTokensModel,
        messages_count: messages.length
    });

    try {
        const response = await axios.post(
            fullUrl,
            {
                model: nameModel,
                messages,
                temperature: temperatureModel,
                max_tokens: maxTokensModel,
            },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 180000,
            }
        );

        const content = response.data.choices[0].message.content.trim();
        console.log('✅ LLM response received successfully');
        return content;
    } catch (error) {
        console.error('❌ LLM call error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
        });
        throw new Error(`LLM API Error: ${error.message} - ${error.response?.data ? JSON.stringify(error.response.data) : ''}`);
    }
}

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
export async function chat(req, res) {
    const { message, model, conversationId } = req.body;
    const userId = req.user?.id;

    if (!message)
        return res.status(StatusCodes.BAD_REQUEST).json({ reply: 'No message!' });

    try {
        let context = '';
        let isAnswered = true;
        const systemPrompt = 'Bạn là một trợ lý AI chuyên nghiệp, trả lời ngắn gọn, chính xác.';

        let embedding;
        try {
            embedding = await getEmbedding(message);
        } catch (error) {
            console.error('❌ Lỗi tạo embedding:', error);
            isAnswered = false;
            if (userId) {
                await pool.execute(
                    'INSERT INTO user_questions (user_id, question, is_answered) VALUES (?, ?, ?)',
                    [userId, message, false]
                );
            }
            return res.json({ reply: 'Không thể tính embedding câu hỏi!' });
        }

        const chunks = await retrieveTopChunks(embedding);
        if (!chunks.length) {
            isAnswered = false;
            await logUnanswered(message);
            if (userId) {
                await pool.execute(
                    'INSERT INTO user_questions (user_id, question, is_answered) VALUES (?, ?, ?)',
                    [userId, message, false]
                );
            }
            return res.json({
                reply: 'Tôi chưa có kiến thức phù hợp để trả lời câu hỏi này.',
            });
        }

        context = chunks
            .map((c) => `Tiêu đề: ${c.title}\nNội dung: ${c.content}`)
            .join('\n---\n');

        const t0 = Date.now();
        const reply = await askChatGPT(message, context, systemPrompt, model);
        const t1 = Date.now();
        console.log('⏱️ Thời gian gọi OpenAI:', t1 - t0, 'ms');

        if (userId) {
            const finalConversationId = await getOrCreateConversationId(userId, conversationId);
            const [existingMessages] = await pool.execute(
                'SELECT COUNT(*) as count FROM user_questions WHERE user_id = ? AND conversation_id = ?',
                [userId, finalConversationId]
            );

            let conversationTitle = null;
            if (existingMessages[0].count === 0) {
                conversationTitle = message.trim().substring(0, 50);
                if (message.length > 50) conversationTitle += '...';
            }

            const metadata = {
                total_chunks: chunks.length,
                processing_time: t1 - t0,
                model_used: model?.name || 'gpt-4o',
                context_length: context.length,
                chunks_used: chunks.map(c => ({
                    id: c.id,
                    title: c.title,
                    content: c.content.substring(0, 200) + (c.content.length > 200 ? '...' : ''),
                    score: c.score,
                    source: c.source || 'unknown'
                }))
            };

            await pool.execute(
                'INSERT INTO user_questions (user_id, conversation_id, conversation_title, question, bot_reply, is_answered, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userId, finalConversationId, conversationTitle, message, reply, isAnswered, JSON.stringify(metadata)]
            );

            await trackUsage(userId, 'query', { tokens: context.length || 0 });

            res.json({
                reply: toMarkdown(reply),
                conversationId: finalConversationId,
                chunks_used: chunks.map(c => ({
                    id: c.id,
                    title: c.title,
                    content: c.content.substring(0, 200) + (c.content.length > 200 ? '...' : ''),
                    score: c.score,
                    source: c.source || 'unknown'
                })),
                metadata: {
                    total_chunks: chunks.length,
                    processing_time: t1 - t0,
                    model_used: model?.name || 'gpt-4o',
                    context_length: context.length
                }
            });
            return;
        }

        res.json({
            reply: toMarkdown(reply),
            chunks_used: chunks.map(c => ({
                id: c.id,
                title: c.title,
                content: c.content.substring(0, 200) + (c.content.length > 200 ? '...' : ''),
                score: c.score,
                source: c.source || 'unknown'
            })),
            metadata: {
                total_chunks: chunks.length,
                processing_time: t1 - t0,
                model_used: model?.name || 'gpt-4o',
                context_length: context.length
            }
        });
    } catch (err) {
        console.error('❌ Lỗi xử lý:', err);
        res.json({ reply: 'Bot đang bận, vui lòng thử lại sau!' });
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
export async function advancedChat(req, res) {
    const { message, model, conversationId } = req.body;
    const userId = req.user?.id;

    if (!message) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            reply: 'No message!',
            reasoning_steps: [],
            chunks_used: []
        });
    }

    if (!model || !model.url || !model.name) {
        console.error('❌ Invalid model configuration:', model);
        return res.status(StatusCodes.BAD_REQUEST).json({
            reply: 'Invalid model configuration!',
            reasoning_steps: [],
            chunks_used: []
        });
    }

    try {
        console.log('🧠 Advanced RAG processing:', message);
        console.log('📋 Model config:', model);

        let questionEmbedding;
        try {
            questionEmbedding = await getEmbedding(message);
        } catch (error) {
            console.error('❌ Lỗi tạo embedding:', error);
            return res.json({
                reply: 'Không thể xử lý câu hỏi này!',
                reasoning_steps: [],
                chunks_used: []
            });
        }

        const retrievalParams = await adaptiveRetrieval(message, questionEmbedding);
        console.log('📊 Retrieval params:', retrievalParams);

        const allChunks = await multiStageRetrieval(
            questionEmbedding,
            message,
            retrievalParams.maxChunks
        );

        if (allChunks.length === 0) {
            await logUnanswered(message);
            return res.json({
                reply: 'Tôi chưa có kiến thức phù hợp để trả lời câu hỏi này.',
                reasoning_steps: ['Không tìm thấy chunks phù hợp'],
                chunks_used: []
            });
        }

        console.log(`📚 Retrieved ${allChunks.length} chunks`);

        let clusters = [];
        try {
            clusters = await semanticClustering(allChunks, questionEmbedding);
        } catch (error) {
            console.error('❌ Error in semantic clustering:', error);
            clusters = [allChunks];
        }

        let reasoningChains = [];
        if (retrievalParams.useMultiHop) {
            try {
                reasoningChains = await multiHopReasoning(
                    allChunks.slice(0, 5),
                    questionEmbedding,
                    message
                );
            } catch (error) {
                console.error('❌ Error in multi-hop reasoning:', error);
                reasoningChains = [];
            }
        }

        let rerankedChunks = allChunks;
        try {
            rerankedChunks = rerankContext(allChunks, questionEmbedding, message);
        } catch (error) {
            console.error('❌ Error in context re-ranking:', error);
        }

        let fusedContext = '';
        try {
            fusedContext = fuseContext(rerankedChunks, reasoningChains, message);
        } catch (error) {
            console.error('❌ Error in context fusion:', error);
            fusedContext = rerankedChunks.map(c => `**${c.title}**: ${c.content}`).join('\n\n');
        }

        const systemPrompt = `Bạn là một trợ lý AI chuyên nghiệp với khả năng phân tích và kết hợp thông tin từ nhiều nguồn.
Hướng dẫn trả lời:
1. Phân tích câu hỏi để xác định các khía cạnh cần trả lời
2. Kết hợp thông tin từ nhiều nguồn một cách logic
3. Tạo câu trả lời có cấu trúc rõ ràng với các phần:
   - Tóm tắt chính
   - Chi tiết từng khía cạnh
   - Kết luận và liên kết
4. Sử dụng markdown để format câu trả lời
5. Nếu thông tin không đủ, hãy nói rõ và đề xuất hướng tìm hiểu thêm`;

        const t0 = Date.now();
        let reply = '';
        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('LLM call timeout')), 180000)
            );

            const llmPromise = askAdvancedChatGPT(message, fusedContext, systemPrompt, model);
            reply = await Promise.race([llmPromise, timeoutPromise]);
        } catch (error) {
            console.error('❌ Error in LLM call for Advanced RAG:', error);

            if (error.message && error.message.includes('LLM API Error')) {
                reply = `Lỗi kết nối với model: ${error.message}`;
            } else if (error.message && error.message.includes('timeout')) {
                reply = 'Model mất quá nhiều thời gian để phản hồi. Vui lòng thử lại với câu hỏi ngắn gọn hơn.';
            } else {
                reply = 'Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi phức tạp này. Vui lòng thử lại với câu hỏi đơn giản hơn.';
            }
        }

        const t1 = Date.now();
        console.log('⏱️ Advanced RAG processing time:', t1 - t0, 'ms');

        const reasoningSteps = [
            `Retrieved ${allChunks.length} chunks using multi-stage retrieval`,
            `Created ${clusters.length} semantic clusters`,
            `Generated ${reasoningChains.length} reasoning chains`,
            `Fused context with ${fusedContext.length} characters`,
            `Generated response using advanced RAG with model ${model.name}`
        ];

        if (userId) {
            const finalConversationId = await getOrCreateConversationId(userId, conversationId);
            const [existingMessages] = await pool.execute(
                'SELECT COUNT(*) as count FROM user_questions WHERE user_id = ? AND conversation_id = ?',
                [userId, finalConversationId]
            );

            let conversationTitle = null;
            if (existingMessages[0].count === 0) {
                conversationTitle = message.trim().substring(0, 50);
                if (message.length > 50) conversationTitle += '...';
            }

            const metadata = {
                total_chunks: allChunks.length,
                clusters: clusters.length,
                reasoning_chains: reasoningChains.length,
                processing_time: t1 - t0,
                model_used: model.name,
                context_length: fusedContext.length,
                reasoning_steps: reasoningSteps,
                chunks_used: rerankedChunks.map(c => ({
                    id: c.id,
                    title: c.title,
                    content: c.content.substring(0, 200) + (c.content.length > 200 ? '...' : ''),
                    score: c.final_score || c.score,
                    stage: c.retrieval_stage,
                    source: c.source || 'unknown',
                    chunk_index: c.chunk_index || 0
                }))
            };

            await pool.execute(
                'INSERT INTO user_questions (user_id, conversation_id, conversation_title, question, bot_reply, is_answered, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userId, finalConversationId, conversationTitle, message, reply, true, JSON.stringify(metadata)]
            );

            await trackUsage(userId, 'advanced_rag', { tokens: fusedContext.length || 0 });

            res.json({
                reply: toAdvancedMarkdown(reply),
                conversationId: finalConversationId,
                reasoning_steps: reasoningSteps,
                chunks_used: rerankedChunks.map(c => ({
                    id: c.id,
                    title: c.title,
                    content: c.content.substring(0, 200) + (c.content.length > 200 ? '...' : ''),
                    score: c.final_score || c.score,
                    stage: c.retrieval_stage,
                    source: c.source || 'unknown',
                    chunk_index: c.chunk_index || 0
                })),
                metadata
            });
            return;
        }

        res.json({
            reply: toAdvancedMarkdown(reply),
            reasoning_steps: reasoningSteps,
            chunks_used: rerankedChunks.map(c => ({
                id: c.id,
                title: c.title,
                content: c.content.substring(0, 200) + (c.content.length > 200 ? '...' : ''),
                score: c.final_score || c.score,
                stage: c.retrieval_stage,
                source: c.source || 'unknown',
                chunk_index: c.chunk_index || 0
            })),
            metadata: {
                total_chunks: allChunks.length,
                clusters: clusters.length,
                reasoning_chains: reasoningChains.length,
                processing_time: t1 - t0,
                model_used: model.name,
                context_length: fusedContext.length
            }
        });

    } catch (err) {
        console.error('❌ Advanced RAG error:', err);
        res.json({
            reply: 'Bot đang gặp sự cố với câu hỏi phức tạp này. Vui lòng thử lại!',
            reasoning_steps: ['Error in advanced processing'],
            chunks_used: []
        });
    }
}

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
