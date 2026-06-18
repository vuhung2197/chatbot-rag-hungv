import conversationService from '../services/conversation.service.js';
import usageService from '#modules/usage/services/usage.service.js';
import { callLLM, callLLMStream } from '#services/llmService.js';

/**
 * Sinh câu trả lời: stream từng token nếu có onToken, ngược lại gọi thường.
 * Dùng cho các bước SINH CÂU TRẢ LỜI CUỐI (không dùng cho intent/rewrite).
 */
export async function generateReply(modelConfig, messages, temperature, maxTokens, onToken) {
    if (typeof onToken === 'function') {
        return await callLLMStream(modelConfig, messages, temperature, maxTokens, onToken);
    }
    return await callLLM(modelConfig, messages, temperature, maxTokens);
}

export async function saveChatAndTrack(chatService, { userId, conversationId, message, reply, metadata, usageType, usageData }) {
    const finalConversationId = await conversationService.getOrCreateConversationId(userId, conversationId);
    await chatService.saveChat(userId, finalConversationId, message, reply, metadata);
    await usageService.trackUsage(userId, usageType, usageData);
    return finalConversationId;
}

export function buildWebSearchPrompt(isFallback = false) {
    const base = isFallback
        ? 'Bạn là một trợ lý AI thông minh. Câu hỏi của người dùng không tìm thấy trong cơ sở dữ liệu nội bộ, nên bạn sẽ trả lời dựa trên kết quả tìm kiếm web.'
        : 'Bạn là một trợ lý cập nhật tin tức thông minh. Nhiệm vụ của bạn là trả lời câu hỏi dựa trên kết quả tìm kiếm web mới nhất.';
    return `${base}\nThời gian hiện tại: ${new Date().toLocaleString('vi-VN')}\n\nYêu cầu:\n1. Trả lời chính xác, ngắn gọn.\n2. DẪN NGUỒN (Link URL) dạng [Title](URL).\n3. Không tìm thấy thì nói không biết.\n4. Trình bày Markdown.${isFallback ? '\n5. Lưu ý: Kết quả từ internet, KHÔNG phải từ tài liệu nội bộ.' : ''}`;
}

// Prompt khi tắt web search và không có dữ liệu nội bộ: để model tự trả lời bằng kiến thức sẵn có.
export function buildModelKnowledgePrompt() {
    return 'Bạn là một trợ lý AI hiểu biết rộng. Hãy trả lời câu hỏi của người dùng bằng kiến thức sẵn có của bạn, chính xác và ngắn gọn, trình bày Markdown.\nNếu không chắc chắn hoặc câu hỏi cần thông tin thời gian thực mới nhất, hãy nói rõ rằng bạn không có dữ liệu cập nhật thay vì bịa đặt.';
}

export function toAdvancedMarkdown(text) {
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
