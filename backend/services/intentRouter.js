import { callLLM } from './llmService.js';

/**
 * Intent Router Service
 * Phân loại ý định người dùng để định tuyến xử lý phù hợp.
 */

export const INTENTS = {
    GREETING: 'GREETING',   // Chào hỏi, giao tiếp xã hội
    KNOWLEDGE: 'KNOWLEDGE', // Hỏi kiến thức, cần tra cứu RAG (DB nội bộ)
    LIVE_SEARCH: 'LIVE_SEARCH', // Cần thông tin thời gian thực logic (Thời tiết, Giá cả, Tin tức...)
    OFF_TOPIC: 'OFF_TOPIC'  // Chủ đề nhạy cảm, chính trị, tôn giáo (OOD)
};

/**
 * Phân loại câu hỏi của người dùng
 * @param {string} message - Câu hỏi của người dùng
 * @param {object} model - Cấu hình model LLM để dùng cho việc phân loại (thường dùng model nhỏ/nhanh)
 * @returns {Promise<{intent: string, reasoning: string}>}
 */
export async function classifyIntent(message, model) {
    try {
        console.log('🚦 Routing intent for:', message);

        const routerSystemPrompt = `Bạn là một AI Router thông minh. Nhiệm vụ của bạn là phân loại câu hỏi của người dùng vào một trong 3 nhóm sau:

1. GREETING: Các câu chào hỏi ("Xin chào", "Hi"), cảm ơn ("Thanks", "Cảm ơn"), hỏi thăm xã giao ("Bạn khỏe không", "Bạn là ai"). Không cần kiến thức chuyên sâu.
2. LIVE_SEARCH: Các câu hỏi cần dữ liệu THỜI GIAN THỰC hoặc KHÔNG CÓ trong sách vở cũ. Ví dụ: "Giá vàng hôm nay", "Thời tiết Hà Nội", "Kết quả bóng đá đêm qua", "Tin tức mới nhất về iPhone 16", "Tỷ giá USD hiện tại".
3. KNOWLEDGE: Các câu hỏi về kiến thức bền vững, định nghĩa, lịch sử, kỹ thuật, coding, giải thích khái niệm (RAG). Ví dụ: "RAG là gì", "Cách dùng React useEffect", "Lịch sử Việt Nam".
4. OFF_TOPIC: Các câu hỏi về chính trị nhạy cảm, tôn giáo cực đoan, kích động bạo lực, khiêu dâm, hoặc các chủ đề bị cấm.

Ưu tiên LIVE_SEARCH nếu câu hỏi chứa từ khoá thời gian ("hôm nay", "hiện tại", "mới nhất") hoặc các sự kiện nóng.

Chỉ trả về định dạng JSON duy nhất như sau, không thêm bất kỳ rườm rà nào:
{"intent": "KNOWLEDGE", "reasoning": "User is asking about definitions"}
`;

        // Sử dụng model hiện tại nhưng set temperature thấp để phân loại chính xác
        const messages = [
            { role: 'system', content: routerSystemPrompt },
            { role: 'user', content: message }
        ];

        // Dùng temperature 0 để đảm bảo tính nhất quán (deterministic)
        const responseText = await callLLM(model, messages, 0.1, 100);

        // Parse JSON output
        let result;
        try {
            // Sơ chế text để tránh lỗi JSON parse nếu LLM lỡ output thêm text
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : responseText;
            result = JSON.parse(jsonString);
        } catch (e) {
            console.warn('⚠️ Could not parse Router JSON, defaulting to KNOWLEDGE. Response:', responseText);
            return { intent: INTENTS.KNOWLEDGE, reasoning: 'Fallback due to parse error' };
        }

        // Validate intent
        if (!Object.values(INTENTS).includes(result.intent)) {
            console.warn('⚠️ Invalid intent returned:', result.intent);
            return { intent: INTENTS.KNOWLEDGE, reasoning: 'Fallback due to invalid intent' };
        }

        console.log('✅ Identified Intent:', result.intent, '| Reason:', result.reasoning);
        return result;

    } catch (error) {
        console.error('❌ Error in classifyIntent:', error);
        // Fallback an toàn nhất là cứ đi tìm kiến thức (KNOWLEDGE)
        return { intent: INTENTS.KNOWLEDGE, reasoning: 'Error fallback' };
    }
}
