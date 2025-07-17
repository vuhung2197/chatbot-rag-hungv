import './bootstrap/env.js';
import OpenAI from 'openai';
import axios from 'axios';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Dịch từng từ trong câu tiếng Anh sang tiếng Việt.
 * - Tách câu thành từng từ, loại bỏ dấu câu.
 * - Dịch từng từ riêng biệt bằng hàm translateSingleWord.
 * - Trả về mảng các object dạng { en, vi } cho từng từ đã dịch.
 * - Loại bỏ các từ không dịch được hoặc không có nghĩa tiếng Việt.
 * @param {string} sentence - Câu tiếng Anh cần dịch từng từ
 * @returns {Promise<Array<{en: string, vi: string}>>} - Mảng các từ và nghĩa tiếng Việt
 */
export async function translateWordByWord(sentence) {
  const words = sentence
    .replace(/[.,!?;:()"]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  const translations = await Promise.all(
    words.map(async (word) => {
      let vi = await translateSingleWord(word.toLowerCase());
      vi = vi.replace(/[^a-zA-ZÀ-ỹà-ỹ0-9\s]/g, '').trim();
      return { en: word, vi };
    })
  );

  return translations.filter(item => item.vi && item.vi.length > 0);
}

/**
 * Dịch một từ hoặc một câu tiếng Anh sang tiếng Việt sử dụng OpenAI GPT.
 * - Nếu là một từ, chỉ trả về bản dịch ngắn gọn, không giải thích.
 * - Nếu là một câu, dịch tự nhiên, rõ nghĩa, không thêm chú thích.
 * @param {string} word - Từ hoặc câu tiếng Anh cần dịch
 * @returns {Promise<string>} - Nghĩa tiếng Việt hoặc "(lỗi)" nếu thất bại
 */
export async function translateSingleWord(word) {
  const isWord = /^[\p{L}\p{N}]+$/u.test(word.trim());

  const prompt = isWord
    ? `Bạn hãy dịch từ tiếng Anh '${word}' sang tiếng Việt. Vui lòng chỉ trả về bản dịch tiếng Việt tự nhiên và ngắn gọn, không kèm thêm giải thích.`
    : `Bạn hãy dịch câu tiếng Anh sau sang tiếng Việt một cách tự nhiên, rõ nghĩa và dễ hiểu: '${word}'. Vui lòng chỉ trả về phần dịch tiếng Việt, không thêm chú thích.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
      temperature: 0.3,
    });
    return completion.choices[0].message.content.trim();
  } catch (err) {
    console.error("OpenAI error:", err.response ? err.response.data : err);
    return "(lỗi)";
  }
}

/**
 * Ẩn (mã hóa tạm thời) các thông tin nhạy cảm trong văn bản như số điện thoại, email, địa chỉ.
 * Thay thế các thông tin này bằng các placeholder (ví dụ: [PHONE_1], [EMAIL_2], ...).
 * Lưu lại mapping giữa placeholder và giá trị gốc để có thể khôi phục sau.
 * @param {string} text - Văn bản cần xử lý
 * @param {object} mapping - Đối tượng dùng để lưu mapping giữa placeholder và giá trị gốc
 * @returns {string} - Văn bản đã được thay thế thông tin nhạy cảm bằng placeholder
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
  text = text.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, (match) => {
    const key = `[EMAIL_${counter++}]`;
    mapping[key] = match;
    return key;
  });
  // Địa chỉ (mẫu đơn giản, có thể tuỳ biến thêm)
  text = text.replace(/(\d{1,4}\s?[\w\s,.\/\-]+(đường|phố|tòa nhà)[^\n,.]*)/gi, (match) => {
    const key = `[ADDR_${counter++}]`;
    mapping[key] = match;
    return key;
  });
  return text;
}

/**
 * Khôi phục lại các thông tin nhạy cảm đã bị mã hóa tạm thời trong văn bản.
 * Thay thế các placeholder (ví dụ: [PHONE_1], [EMAIL_2], ...) bằng giá trị gốc từ mapping.
 * @param {string} text - Văn bản chứa các placeholder
 * @param {object} mapping - Đối tượng mapping giữa placeholder và giá trị gốc
 * @returns {string} - Văn bản đã được khôi phục thông tin nhạy cảm
 */
export function unmaskSensitiveInfo(text, mapping) {
  for (const [key, value] of Object.entries(mapping)) {
    text = text.replaceAll(key, value);
  }
  return text;
}

/**
 * Gọi API mô hình ngôn ngữ (OpenAI hoặc local), trả về kết quả phản hồi.
 * @param {string} model - Tên mô hình (gpt-4o, gpt-3.5, mistral, v.v.)
 * @param {Array} messages - Danh sách messages theo định dạng ChatML
 * @param {number} temperature - Độ sáng tạo
 * @param {number} maxTokens - Giới hạn tokens
 * @returns {string} - Nội dung phản hồi
 */
export async function callLLM(model, messages, temperature = 0.2, maxTokens = 512) {
  const baseUrl = model?.url;
  const nameModel = model?.name;
  const temperatureModel = model?.temperature;
  const maxTokensModel = model?.maxTokens;

  const response = await axios.post(
    `${baseUrl}/chat/completions`,
    {
      model: nameModel,
      messages,
      temperature: temperatureModel,
      max_tokens: maxTokensModel
    },
    {
      headers: {
        'Content-Type': 'application/json'
      },
    }
  );

  return response.data.choices[0].message.content.trim();
}

/**
 * Gọi OpenAI ChatGPT, cho phép truyền prompt hệ thống (systemPrompt) và chọn model.
 * Hỗ trợ mã hóa thông tin nhạy cảm trước khi gửi lên AI và giải mã sau khi nhận kết quả.
 * @param {string} question - Câu hỏi từ user
 * @param {string} context - Context kiến thức tham khảo
 * @param {string} systemPrompt - Prompt hệ thống (tùy chế độ: trả lời chuẩn, luyện giao tiếp, v.v.)
 * @param {string} model - Tên model AI muốn sử dụng (mặc định: 'gpt-4o')
 * @returns {Promise<string>} - Nội dung trả lời của AI
 */
export async function askChatGPT(question, context, systemPrompt = "Bạn là trợ lý AI chuyên trả lời dựa trên thông tin được cung cấp.", model) {
  const mapping = {};

  // Mask thông tin nhạy cảm trong câu hỏi
  const maskedQuestion = maskSensitiveInfo(question, mapping);

  let prompt = "";
  if (context && context.trim().length > 0) {
    // Có context → dạng RAG hoặc context-based
    const maskedContext = maskSensitiveInfo(context, mapping);
    prompt = `Thông tin tham khảo:\n${maskedContext}\n\nCâu hỏi: ${maskedQuestion}`;
  } else {
    // Không có context → chế độ "direct"
    prompt = maskedQuestion;
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ];

  let reply = await callLLM(model, messages, 0.2, 512);

  // Unmask nội dung trước khi trả về
  reply = unmaskSensitiveInfo(reply, mapping);

  return reply;
}
