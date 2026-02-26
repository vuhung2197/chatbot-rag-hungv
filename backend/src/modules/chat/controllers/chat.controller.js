import { StatusCodes } from 'http-status-codes';
import '#bootstrap/env.js';
import chatService from '../services/chat.service.js';
import { getOrCreateConversationId } from './conversation.controller.js';

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
    // This function is no longer used in the controller, it should be moved to chatService if needed.
    // Keeping it here for now as it's not explicitly removed by the instruction.
    // However, the original `chat` function's call to `logUnanswered` is removed.
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
    // This function is no longer used in the controller, it should be moved to chatService if needed.
    // Keeping it here for now as it's not explicitly removed by the instruction.
}

/**
 * Gọi LLM với context nâng cao (Advanced)
 */
async function askAdvancedChatGPT(question, context, systemPrompt, model) {
    // This function is no longer used in the controller, it should be moved to chatService if needed.
    // Keeping it here for now as it's not explicitly removed by the instruction.
}


// ==================== NEW HELPER FUNCTIONS (CONTEXT) ====================

/**
 * Lấy lịch sử chat gần nhất để làm context
 */
async function getChatHistory(userId, conversationId, limit = 6) {
    // This function is no longer used in the controller, it should be moved to chatService if needed.
    // Keeping it here for now as it's not explicitly removed by the instruction.
}

/**
 * Viết lại câu hỏi dựa trên lịch sử để search tốt hơn (Query Expansion)
 */
async function rewriteQuery(message, history, modelConfig) {
    // This function is no longer used in the controller, it should be moved to chatService if needed.
    // Keeping it here for now as it's not explicitly removed by the instruction.
}

// ==================== CONTROLLER FUNCTIONS ====================

/**
 * Handle new Chat API
 */
export async function chat(req, res) {
    const { message, model, conversationId } = req.body;
    const userId = req.user?.id;

    if (!message)
        return res.status(StatusCodes.BAD_REQUEST).json({ reply: 'No message!' });

    try {
        const result = await chatService.processChat({ userId, message, model, conversationId });
        res.json(result);
    } catch (err) {
        console.error('❌ Critical Error in Chat Controller:', err);
        res.status(500).json({ reply: 'Đã xảy ra lỗi nghiêm trọng phía máy chủ.' });
    }
}

/**
 * API lấy lịch sử chat
 */
export async function history(req, res) {
    const userId = req.user?.id;

    if (!userId)
        return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Chưa đăng nhập' });

    try {
        const rows = await chatService.getHistory(userId);
        res.json(rows);
    } catch (err) {
        console.error('❌ Lỗi khi lấy lịch sử câu hỏi:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
}

/**
 * Use chat function as advancedChat (deprecated alias)
 */
export const advancedChat = chat;

/**
 * Get advanced RAG statistics
 */
export async function getAdvancedRAGStats(req, res) {
    try {
        const stats = await chatService.getAdvancedRAGStats();
        res.json({ success: true, stats: stats });
    } catch (err) {
        console.error('❌ Lỗi get stats:', err);
        res.status(500).json({ success: false, error: err.message });
    }
}

/**
 * Controller xử lý Chat với cơ chế Streaming (Server-Sent Events)
 * Endpoint: /chat/stream
 * TODO: Move stream logic to service if possible, or keep minimal here.
 */
export async function streamChat(req, res) {
    // For now, let's keep streaming logic here or refactor it to service later if user asks explicitly for streaming refactor.
    // The user asked to extract SQL queries. Streaming logic does have SQL (saveChat, getHistory etc).
    // I should extract the streaming logic to service too. e.g. chatService.streamChat(req, res)
    // But passing res to service is mixing layers.
    // Better: service returns an async generator or event emitter.
    // Given the complexity, I will keep streamChat here but use service methods for DB calls.

    // However, I can't easily refactor streamChat to use service without significant changes.
    // Let's implement streamChat using the service's methods for DB access,
    // effectively removing SQL from here.

    const { message, model, conversationId } = req.body;
    const userId = req.user?.id;

    if (!message) return res.status(400).json({ error: 'No message provided' });

    const modelConfig = (model && model.url && model.name) ? model : { url: 'https://api.openai.com/v1', name: 'gpt-4o-mini' };

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (type, data) => {
        res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    };

    try {
        // Reuse service logic parts if exposed, or duplicate logic but use service DB helpers?
        // Let's delegate to service stream function if we make one.
        // It's better to make streamChat in service accept a callback for events.

        await chatService.streamChat({ userId, message, model: modelConfig, conversationId }, sendEvent);

    } catch (err) {
        console.error('Stream Error:', err);
        sendEvent('error', { message: 'Stream failed' });
    } finally {
        res.end();
    }
}
