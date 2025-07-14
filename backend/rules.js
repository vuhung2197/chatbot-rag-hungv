import './bootstrap/env.js';
import Fuse from 'fuse.js';
import OpenAI from 'openai';
import axios from 'axios';
import config from './llm.config.js';

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
 * Định dạng kết quả tra cứu Anh-Việt thành HTML chi tiết.
 * - Hiển thị loại từ, nghĩa, ví dụ minh họa cho từng nghĩa của từ.
 * - Nếu không có ví dụ, tự động lấy thêm ví dụ từ cơ sở dữ liệu.
 * @param {string} word - Từ tiếng Anh được tra cứu
 * @param {Array} founds - Danh sách các bản ghi nghĩa của từ (từ database)
 * @returns {Promise<string>} - HTML trình bày kết quả tra cứu
 */
export async function formatEnViResult(word, founds) {
  let html = `<div><b>Các loại từ và nghĩa của "<span style='color:#7137ea'>${word}</span>":</b><ul style="margin-left:1em;">`;
  for (const found of founds) {
    html += `<li style="margin-bottom:0.7em;">
      <b>${found.type || "Loại từ không xác định"}</b><br/>
      <span>• Nghĩa:</span> ${found.word_vi ? `<span>${found.word_vi}</span>` : "<i>Chưa có</i>"}
    `;
    let hasExample = false;
    if (found.example_en || found.example_vi) {
      html += `<br/><span>• Ví dụ:</span>
          <ul style="margin-left:1.3em; margin-bottom:0.3em;">
            <li><i>${found.example_en || ""}</i> ${found.example_vi ? `<span style="color:#666;">(${found.example_vi})</span>` : ""}</li>
          </ul>`;
      hasExample = true;
    }
    if (!hasExample) {
      const examples = await getSentences(found.word_en);
      if (examples.length) {
        html += `<br/><span>• Một số ví dụ khác:</span>
          <ul style="margin-left:1.3em; margin-bottom:0.3em;">` +
          examples.map(ex =>
            `<li><i>${ex.sentence_en}</i> <span style="color:#666;">(${ex.sentence_vi || "?"})</span></li>`
          ).join('') +
          `</ul>`;
      }
    }
    html += `</li>`;
  }
  html += `</ul></div>`;
  return html;
}

/**
 * Tìm kiếm từ gần đúng (fuzzy search) trong danh sách từ vựng.
 * - Sử dụng Fuse.js để tìm từ gần giống nhất với từ cần tra.
 * - Trả về bản ghi từ vựng phù hợp nhất hoặc null nếu không tìm thấy.
 * @param {string} word - Từ cần tìm kiếm gần đúng
 * @param {Array} vocabRows - Danh sách các bản ghi từ vựng
 * @param {string} field - Trường cần so khớp (word_en hoặc word_vi)
 * @returns {object|null} - Bản ghi từ vựng gần đúng hoặc null
 */
export function getFuzzyResult(word, vocabRows, field = 'word_en') {
  const fuse = new Fuse(vocabRows.map(r => r[field]), { threshold: 0.4 });
  const fuzzy = fuse.search(word);
  if (fuzzy.length > 0) {
    const w = fuzzy[0].item;
    return vocabRows.find(r => r[field] === w);
  }
  return null;
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
  const providerKey = model;
  const provider = config.providers[providerKey];

  const response = await axios.post(
    `${provider.baseURL}/chat/completions`,
    {
      model: model,
      messages,
      temperature: provider.temperature || temperature,
      max_tokens: provider.maxTokens || maxTokens,
    },
    {
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
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
export async function askChatGPT(question, context, systemPrompt = "Bạn là trợ lý AI chuyên trả lời dựa trên thông tin được cung cấp.", model = 'gpt-4o') {
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

/**
 * Xử lý truy vấn tiếng Anh của người dùng, nhận diện ý định dịch từ/câu Anh-Việt hoặc Việt-Anh.
 * - Phân tích intent từ message (dịch Anh-Việt, Việt-Anh, hoặc hỏi nghĩa).
 * - Tra cứu từ điển nội bộ, trả về kết quả chi tiết (nghĩa, loại từ, ví dụ).
 * - Nếu không tìm thấy, sử dụng fuzzy search để gợi ý từ gần đúng.
 * - Nếu vẫn không có kết quả, ghi log câu hỏi chưa biết và trả về thông báo cho người dùng.
 * @param {string} message - Câu hỏi hoặc từ tiếng Anh/Việt của người dùng
 * @returns {Promise<string>} - HTML kết quả tra cứu hoặc thông báo lỗi/gợi ý
 */
export async function getEnglishBotReply(message) {
  const msg = message.toLowerCase().trim();
  const vocabRows = await getVocabulary();

  // 1. Nhận diện intent
  let word = null, en2vi = false, vi2en = false, match;

  const patternsEnVi = [
    /dịch từ ([\w\s\-]+) sang tiếng việt/i,
    /dịch sang tiếng việt từ ([\w\s\-]+)/i,
    /nghĩa của ([\w\s\-]+) là gì/i,
    /từ ([\w\s\-]+) nghĩa (?:tiếng việt )?là gì/i,
    /what does ([\w\s\-]+) mean/i,
    /translate ([\w\s\-]+) to vietnamese/i,
    /([\w\s\-]+)/i
  ];
  for (const pattern of patternsEnVi) {
    match = msg.match(pattern);
    if (match) {
      word = match[1].trim().toLowerCase();
      en2vi = true;
      break;
    }
  }
  if (!word) {
    const patternsViEn = [
      /dịch từ ([\w\s\-à-ỹ]+) sang tiếng anh/i,
      /dịch sang tiếng anh từ ([\w\s\-à-ỹ]+)/i,
      /([\w\s\-à-ỹ]+) nghĩa tiếng anh là gì/i,
      /nghĩa tiếng anh của ([\w\s\-à-ỹ]+)/i
    ];
    for (const pattern of patternsViEn) {
      match = msg.match(pattern);
      if (match) {
        word = match[1].trim().toLowerCase();
        vi2en = true;
        break;
      }
    }
  }
  if (!word) {
    await logUnknownQuery(message);
    return `<div>Xin lỗi, tôi chưa hiểu từ/câu này. Bạn có thể góp ý hoặc chờ admin cập nhật thêm!</div>`;
  }

  // 2. Dịch Anh-Việt (tra từ)
  if (en2vi) {
    const founds = vocabRows.filter(row => row.word_en.trim().toLowerCase() === word);
    if (founds.length > 0) {
      return await formatEnViResult(word, founds);
    }
    // Fuzzy
    const frow = getFuzzyResult(word, vocabRows, 'word_en');
    if (frow) {
      const examples = await getSentences(frow.word_en);
      let html = `<div>Bạn có hỏi từ "<b>${frow.word_en}</b>"? Từ này nghĩa là: <b>${frow.word_vi}</b>`;
      if (examples.length) {
        html += `<br/>Ví dụ:<ul style="margin-left:1.3em;">` +
          examples.map(ex => `<li><i>${ex.sentence_en}</i> <span style="color:#666;">(${ex.sentence_vi || "?"})</span></li>`).join('') +
          `</ul>`;
      }
      html += `</div>`;
      return html;
    }
    await logUnknownQuery(message);
    return `<div>Xin lỗi, tôi chưa biết nghĩa của từ "<b>${word}</b>". Bạn có thể góp ý để tôi học thêm!</div>`;
  }

  // 3. Dịch Việt-Anh (tra từ)
  if (vi2en) {
    const found = vocabRows.find(row => row.word_vi.trim().toLowerCase() === word);
    if (found) {
      const examples = await getSentences(found.word_en);
      let html = `<div>Từ "<b>${word}</b>" tiếng Anh là: <b>${found.word_en}</b>`;
      if (examples.length) {
        html += `<br/>Ví dụ:<ul style="margin-left:1.3em;">` +
          examples.map(ex => `<li><i>${ex.sentence_en}</i> <span style="color:#666;">(${ex.sentence_vi || "?"})</span></li>`).join('') +
          `</ul>`;
      }
      html += `</div>`;
      return html;
    }
    // Fuzzy
    const row = getFuzzyResult(word, vocabRows, 'word_vi');
    if (row) {
      const examples = await getSentences(row.word_en);
      let html = `<div>Bạn có hỏi từ "<b>${row.word_vi}</b>"? Tiếng Anh là: <b>${row.word_en}</b>`;
      if (examples.length) {
        html += `<br/>Ví dụ:<ul style="margin-left:1.3em;">` +
          examples.map(ex => `<li><i>${ex.sentence_en}</i> <span style="color:#666;">(${ex.sentence_vi || "?"})</span></li>`).join('') +
          `</ul>`;
      }
      html += `</div>`;
      return html;
    }
    await logUnknownQuery(message);
    return `<div>Xin lỗi, tôi chưa biết nghĩa tiếng Anh của "<b>${word}</b>". Bạn có thể góp ý để tôi học thêm!</div>`;
  }
}

// Các hàm phụ trợ cần export nếu dùng ở nơi khác
// export { getSentences, getVocabulary, logUnknownQuery };
