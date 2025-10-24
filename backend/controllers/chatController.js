import pool from '../db.js';
import { getEmbedding } from '../services/embeddingVector.js';
import { retrieveTopChunks } from '../services/rag_retrieve.js';
import { hashQuestion } from '../utils/hash.js';
import { StatusCodes } from 'http-status-codes';
import '../bootstrap/env.js';
import OpenAI from 'openai';
import axios from 'axios';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Chuyển đổi văn bản AI trả lời thành Markdown giống ChatGPT.
 * - Câu đầu tiên in đậm.
 * - Giữ nguyên đoạn văn nếu dài.
 * - Danh sách chỉ áp dụng nếu văn bản rõ ràng là liệt kê.
 */
function toMarkdown(text) {
  if (!text) return '';

  const paragraphs = text.split(/\n{2,}/); // Tách các đoạn
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
      // Tách theo dấu chấm, phẩy nếu là danh sách rời rạc
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
 * Xử lý API chat chính sử dụng thuần RAG.
 * - Nhận message từ người dùng.
 * - Tạo embedding cho câu hỏi.
 * - Tìm kiếm các chunks liên quan nhất.
 * - Gọi OpenAI để sinh câu trả lời dựa trên context đã chọn.
 * - Ghi log các câu hỏi chưa trả lời được.
 * @param {object} req - Đối tượng request Express
 * @param {object} res - Đối tượng response Express
 */
export async function chat(req, res) {
  const { message, model } = req.body;
  const userId = req.user?.id;

  if (!message)
    return res.status(StatusCodes.BAD_REQUEST).json({ reply: 'No message!' });

  try {
    let context = '';
    let isAnswered = true;
    const systemPrompt = 'Bạn là một trợ lý AI chuyên nghiệp, trả lời ngắn gọn, chính xác.';

    // 📚 Sử dụng RAG (Retrieval-Augmented Generation)
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

    // 🧠 Gọi GPT
    const t0 = Date.now();
    const reply = await askChatGPT(message, context, systemPrompt, model);
    const t1 = Date.now();
    console.log('⏱️ Thời gian gọi OpenAI:', t1 - t0, 'ms');

    // ✅ Ghi lịch sử
    if (userId) {
      await pool.execute(
        'INSERT INTO user_questions (user_id, question, bot_reply, is_answered) VALUES (?, ?, ?, ?)',
        [userId, message, reply, isAnswered]
      );
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
        model_used: model || 'gpt-4o',
        context_length: context.length
      }
    });
  } catch (err) {
    console.error('❌ Lỗi xử lý:', err);
    res.json({ reply: 'Bot đang bận, vui lòng thử lại sau!' });
  }
}

/**
 * Ghi log các câu hỏi chưa trả lời được vào bảng unanswered_questions.
 * Nếu câu hỏi đã tồn tại (theo hash), sẽ không ghi trùng.
 * @param {string} question - Câu hỏi chưa trả lời được từ người dùng
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
 * API lấy lịch sử chat gần nhất.
 * Trả về 50 bản ghi mới nhất từ bảng chat_history.
 * @param {object} req - Đối tượng request Express
 * @param {object} res - Đối tượng response Express
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
 * API gợi ý từ tiếng Anh cho autocomplete.
 * Trả về tối đa 10 từ bắt đầu bằng query từ bảng dictionary.
 * @param {object} req - Đối tượng request Express
 * @param {object} res - Đối tượng response Express
 */
export async function suggest(req, res) {
  const query = req.query.query?.trim().toLowerCase();
  if (!query) return res.json([]);
  const [rows] = await pool.execute(
    'SELECT DISTINCT word_en FROM dictionary WHERE word_en LIKE ? ORDER BY word_en LIMIT 10',
    [`${query}%`]
  );
  res.json(rows.map((row) => row.word_en));
}

/**
 * Xóa một câu hỏi khỏi lịch sử chat của người dùng hiện tại theo id.
 * Chỉ xóa nếu câu hỏi thuộc về user đang đăng nhập.
 * @param {object} req - Đối tượng request Express
 * @param {object} res - Đối tượng response Express
 */
export async function deleteHistoryItem(req, res) {
  const { id } = req.params;
  const userId = req.user.id;

  if (!id || !userId) {
    return res
      .status(400)
      .json({ message: 'Thiếu ID hoặc thông tin người dùng.' });
  }

  try {
    const [result] = await pool.execute(
      'DELETE FROM user_questions WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: 'Không tìm thấy câu hỏi hoặc không có quyền xóa.' });
    }

    return res.json({ message: 'Đã xóa thành công.' });
  } catch (error) {
    console.error('❌ Lỗi khi xóa câu hỏi:', error);
    return res.status(500).json({ message: 'Lỗi server.' });
  }
}

// ==================== FUNCTIONS FROM RULES.JS ====================

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

  return translations.filter((item) => item.vi && item.vi.length > 0);
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
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.3,
    });
    return completion.choices[0].message.content.trim();
  } catch (err) {
    console.error('OpenAI error:', err.response ? err.response.data : err);
    return '(lỗi)';
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
  text = text.replace(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    (match) => {
      const key = `[EMAIL_${counter++}]`;
      mapping[key] = match;
      return key;
    }
  );
  // Địa chỉ (mẫu đơn giản, có thể tuỳ biến thêm)
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
export async function callLLM(
  model,
  messages,
  _temperature = 0.2,
  _maxTokens = 512
) {
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
      max_tokens: maxTokensModel,
    },
    {
      headers: {
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
export async function askChatGPT(
  question,
  context,
  systemPrompt = 'Bạn là trợ lý AI chuyên trả lời dựa trên thông tin được cung cấp.',
  model
) {
  const mapping = {};

  // Mask thông tin nhạy cảm trong câu hỏi
  const maskedQuestion = maskSensitiveInfo(question, mapping);

  let prompt = '';
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
