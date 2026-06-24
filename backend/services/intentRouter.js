import { callLLM } from './llmService.js';

/**
 * Intent Router Service
 * Phân loại ý định người dùng để định tuyến xử lý phù hợp.
 */

export const INTENTS = {
    GREETING: 'GREETING',   // Chào hỏi, giao tiếp xã hội
    KB_CATALOG: 'KB_CATALOG', // Hỏi danh mục: bot đã học/biết gì, có tài liệu/chủ đề nào
    KNOWLEDGE: 'KNOWLEDGE', // Hỏi kiến thức, cần tra cứu RAG (DB nội bộ)
    LIVE_SEARCH: 'LIVE_SEARCH', // Cần thông tin thời gian thực logic (Thời tiết, Giá cả, Tin tức...)
    USER_PROGRESS: 'USER_PROGRESS', // Hỏi về tiến độ học tập của bản thân
    OFF_TOPIC: 'OFF_TOPIC'  // Chủ đề nhạy cảm, chính trị, tôn giáo (OOD)
};

/**
 * Phân loại ý định bằng LUẬT (regex từ khóa) — KHÔNG gọi LLM.
 * Mục tiêu: bỏ 1 LLM call để tăng tốc; chỉ giữ LLM ở bước sinh câu trả lời cuối.
 * Khi không chắc -> mặc định KNOWLEDGE (an toàn, còn có fallback web phía sau).
 * @param {string} message
 * @returns {{intent: string, reasoning: string}}
 */
export function classifyIntentRule(message) {
    const m = (message || '').toLowerCase().trim();
    if (!m) return { intent: INTENTS.GREETING, reasoning: 'rule: empty' };

    // Lưu ý: KHÔNG dùng \b vì \w chỉ gồm ASCII -> hỏng với chữ tiếng Việt có dấu (á, ị, đ...).
    // Dùng ranh giới Unicode: (?<!\p{L}) ... (?!\p{L}) với cờ 'u' (\p{L} = mọi chữ cái Unicode).

    // 1) GREETING — chào hỏi / cảm ơn / xã giao
    if (/^(hi|hello|hey|chào|xin chào|chao|alo)(?!\p{L})/u.test(m)
        || /(?<!\p{L})(cảm ơn|cám ơn|thank you|thanks|tạm biệt|bye)(?!\p{L})/u.test(m)
        || /(?<!\p{L})(bạn là ai|bạn khỏe không|bạn tên gì|ai tạo ra bạn)(?!\p{L})/u.test(m)) {
        return { intent: INTENTS.GREETING, reasoning: 'rule: greeting/social keywords' };
    }

    // 2) OFF_TOPIC — chủ đề nhạy cảm/cấm (danh sách tối thiểu, lọt sẽ rơi về KNOWLEDGE)
    if (/(?<!\p{L})(chính trị|đảng phái|tôn giáo cực đoan|khủng bố|khiêu dâm|sex|ma túy|chế tạo (bom|vũ khí))(?!\p{L})/u.test(m)) {
        return { intent: INTENTS.OFF_TOPIC, reasoning: 'rule: sensitive keywords' };
    }

    // 3) USER_PROGRESS — hỏi về tiến độ học của chính người dùng
    if (/(?<!\p{L})(tiến độ|của tôi|tôi đã học|tôi đã hoàn thành|từ vựng của tôi|kết quả học|tôi học được|điểm của tôi)(?!\p{L})/u.test(m)) {
        return { intent: INTENTS.USER_PROGRESS, reasoning: 'rule: progress keywords' };
    }

    // 4) LIVE_SEARCH — cần dữ liệu thời gian thực
    if (/(?<!\p{L})(hôm nay|hôm qua|đêm qua|hiện tại|bây giờ|mới nhất|gần đây|tin tức|giá|tỷ giá|thời tiết|dự báo|năm nay|tháng này|tuần này|sắp tới|kết quả (bóng đá|trận))(?!\p{L})/u.test(m)) {
        return { intent: INTENTS.LIVE_SEARCH, reasoning: 'rule: time-sensitive keywords' };
    }

    // 5) KB_CATALOG — hỏi META về kho kiến thức: "bạn đã học gì", "có tài liệu/chủ đề nào".
    //    Phải đứng TRƯỚC KNOWLEDGE vì câu kiểu này không khớp ngữ nghĩa với nội dung chunk
    //    (retrieval ra điểm thấp -> LLM trả "Tôi không biết"). Ta trả danh mục title thay vì RAG.
    const asksAboutAssistant = /(?<!\p{L})(bạn|chatbot|trợ lý|hệ thống|bot|cậu)(?!\p{L})/u.test(m);
    const asksWhatLearned = /(học|được train|được dạy|biết|nắm|hiểu).{0,25}(gì|nào|nhóm kiến thức|chủ đề|lĩnh vực|tài liệu|nội dung)/u.test(m);
    if ((asksAboutAssistant && asksWhatLearned)
        || /(?<!\p{L})(có những|có các|có bao nhiêu|danh mục|danh sách|liệt kê).{0,20}(tài liệu|chủ đề|kiến thức|lĩnh vực)/u.test(m)
        || /(nhóm|loại) kiến thức (nào|gì)/u.test(m)) {
        return { intent: INTENTS.KB_CATALOG, reasoning: 'rule: knowledge catalog/meta question' };
    }

    // 6) Mặc định KNOWLEDGE (RAG + fallback web)
    return { intent: INTENTS.KNOWLEDGE, reasoning: 'rule: default knowledge' };
}

/**
 * Phân loại câu hỏi của người dùng (BẰNG LLM — bản cũ, giữ lại để tùy chọn/fallback).
 * @param {string} message - Câu hỏi của người dùng
 * @param {object} model - Cấu hình model LLM để dùng cho việc phân loại (thường dùng model nhỏ/nhanh)
 * @returns {Promise<{intent: string, reasoning: string}>}
 */
export async function classifyIntent(message, model) {
    try {
        console.log('🚦 Routing intent for:', message);

        const routerSystemPrompt = `Bạn là một AI Router thông minh. Nhiệm vụ của bạn là phân loại câu hỏi của người dùng vào một trong các nhóm sau:

1. GREETING: Các câu chào hỏi ("Xin chào", "Hi"), cảm ơn ("Thanks", "Cảm ơn"), hỏi thăm xã giao ("Bạn khỏe không", "Bạn là ai"). Không cần kiến thức chuyên sâu.
2. USER_PROGRESS: Các câu hỏi về tiến độ học tập CỦA NGƯỜI DÙNG. Ví dụ: "Tiến độ của tôi", "Tôi đã học bao nhiêu từ", "Từ vựng của tôi", "Tôi đã hoàn thành bao nhiêu bài", "Xem kết quả học tập của tôi".
3. LIVE_SEARCH: Các câu hỏi cần dữ liệu THỜI GIAN THỰC hoặc KHÔNG CÓ trong sách vở cũ. Ví dụ: "Giá vàng hôm nay", "Thời tiết Hà Nội", "Kết quả bóng đá đêm qua", "Tin tức mới nhất về iPhone 16", "Tỷ giá USD hiện tại".
4. KNOWLEDGE: Các câu hỏi về kiến thức bền vững, định nghĩa, lịch sử, kỹ thuật, coding, giải thích khái niệm (RAG). Ví dụ: "RAG là gì", "Cách dùng React useEffect", "Lịch sử Việt Nam".
5. OFF_TOPIC: Các câu hỏi về chính trị nhạy cảm, tôn giáo cực đoan, kích động bạo lực, khiêu dâm, hoặc các chủ đề bị cấm.

Ưu tiên USER_PROGRESS nếu câu hỏi chứa "tôi", "của tôi", "tiến độ", "học được", "hoàn thành".
Ưu tiên LIVE_SEARCH nếu câu hỏi chứa từ khoá thời gian ("hôm nay", "hiện tại", "mới nhất") hoặc các sự kiện nóng.

Chỉ trả về định dạng JSON duy nhất như sau, không thêm bất kỳ rườm rà nào:
{"intent": "KNOWLEDGE", "reasoning": "User is asking about definitions"}
`;

        // Sử dụng model hiện tại nhưng set temperature thấp để phân loại chính xác
        const messages = [
            { role: 'system', content: routerSystemPrompt },
            { role: 'user', content: message }
        ];

        // Dùng temperature thấp để nhất quán (deterministic).
        // 800 token: model reasoning (vd gemma-4) cần đủ chỗ "suy nghĩ" rồi mới sinh JSON;
        // nếu quá thấp, content trả về rỗng -> luôn rơi vào fallback KNOWLEDGE.
        const responseText = await callLLM(model, messages, 0.1, 800);

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
