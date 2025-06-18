/**
 * Controller chính cho các API chat, gợi ý, lịch sử của chatbot.
 * - Hỗ trợ nhiều chế độ context (keyword, embedding/vector).
 * - Tích hợp chế độ luyện giao tiếp (conversation mode).
 * - Giao tiếp với OpenAI để sinh câu trả lời.
 * - Ghi log các câu hỏi chưa trả lời và các lượt luyện giao tiếp.
 * - API lấy lịch sử chat, lịch sử luyện giao tiếp, thống kê lượt giao tiếp.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const pool = require('../db');
const { askChatGPT } = require('../rules'); // Cần nhận thêm systemPrompt
const levenshtein = require('fast-levenshtein');
const axios = require("axios");
const { getEmbedding, getTopEmbeddingMatches } = require("../services/embeddingVector");
const { selectRelevantContexts } = require("../services/scoreContext");
const { retrieveTopChunks } = require("../services/rag_retrieve");
const { answerWithCoT } = require("../services/rag_cot");
const crypto = require("crypto");

/**
 * Tạo hash SHA256 cho câu hỏi (dùng để kiểm tra trùng lặp).
 */
function hashQuestion(text) {
  return crypto.createHash("sha256").update(text.trim().toLowerCase()).digest("hex");
}

/**
 * Chuyển đổi văn bản trả lời thành định dạng Markdown đẹp mắt.
 */
function toMarkdown(text) {
  const sentences = text.split(/(?<=\.)\s+/);
  let opening = sentences[0].trim();
  if (opening.length > 0) opening = `**${opening}**\n\n`;
  const rest = sentences.slice(1).map(s => s.trim()).filter(s => s.length > 0);
  const bulletStarters = ['Cụ thể', 'Ví dụ', 'Ngoài ra', 'Điều này', 'Đặc biệt', 'Thêm vào đó'];
  let markdown = opening;
  rest.forEach(sentence => {
    const isBullet = bulletStarters.some(kw => sentence.startsWith(kw)) || sentence.startsWith('-') || sentence.startsWith('+');
    if (isBullet) {
      const colonIdx = sentence.indexOf(':');
      if (colonIdx > -1) {
        markdown += sentence.slice(0, colonIdx + 1) + '\n';
        let afterColon = sentence.slice(colonIdx + 1).trim();
        let points = afterColon.split(/;\s+|,\s+|\. /).map(p => p.trim()).filter(p => p.length > 0);
        points.forEach(point => {
          markdown += `- ${point}\n`;
        });
      } else {
        markdown += `- ${sentence}\n`;
      }
    } else {
      markdown += `- ${sentence}\n`;
    }
  });
  return markdown.trim();
}

/**
 * Xử lý API chat chính.
 * - mode = "context": Lấy context dựa trên keyword.
 * - mode = "rag" (default): Lấy context bằng embedding/vector (RAG).
 * - Gọi OpenAI để sinh câu trả lời.
 * - Tích hợp chế độ luyện giao tiếp (conversation).
 */
exports.chat = async (req, res) => {
  const { message, mode = "rag", modeChat = "normal" } = req.body;
  const userId = req.user?.id;

  if (!message) return res.status(400).json({ reply: "No message!" });

  try {
    let context = "";
    let isAnswered = true;

    if (mode === "context") {
      const [rows] = await pool.execute("SELECT * FROM knowledge_base");
      const [kwRows] = await pool.execute("SELECT keyword FROM important_keywords");
      const importantKeywords = kwRows.map(r => r.keyword);

      const contexts = selectRelevantContexts(message, rows, importantKeywords);
      if (contexts.length === 0) {
        isAnswered = false;
        await logUnanswered(message);
        if (userId) {
          await pool.execute(
            "INSERT INTO user_questions (user_id, question, is_answered) VALUES (?, ?, ?)",
            [userId, message, false]
          );
        }
        return res.json({ reply: "Xin lỗi, tôi chưa có kiến thức phù hợp để trả lời câu hỏi này." });
      }

      context = contexts.map(c => `Tiêu đề: ${c.title}\nNội dung: ${c.content}`).join("\n---\n");

    } else {
      let embedding;
      try {
        embedding = await getEmbedding(message);
      } catch {
        isAnswered = false;
        if (userId) {
          await pool.execute(
            "INSERT INTO user_questions (user_id, question, is_answered) VALUES (?, ?, ?)",
            [userId, message, false]
          );
        }
        return res.json({ reply: "Không thể tính embedding câu hỏi!" });
      }

      const chunks = await retrieveTopChunks(embedding);
      if (!chunks.length) {
        isAnswered = false;
        await logUnanswered(message);
        if (userId) {
          await pool.execute(
            "INSERT INTO user_questions (user_id, question, is_answered) VALUES (?, ?, ?)",
            [userId, message, false]
          );
        }
        return res.json({ reply: "Tôi chưa có kiến thức phù hợp để trả lời câu hỏi này." });
      }

      context = chunks.map(c => `Tiêu đề: ${c.title}\nNội dung: ${c.content}`).join("\n---\n");
    }

    let systemPrompt = "Bạn là một trợ lý AI chuyên nghiệp, trả lời ngắn gọn, chính xác.";
    if (modeChat === "conversation") {
      systemPrompt = "Bạn là bạn đồng hành luyện giao tiếp tiếng Anh. Hãy trả lời tự nhiên, thân thiện, hỏi lại hoặc chia sẻ cảm xúc để tiếp tục cuộc hội thoại.";
    }

    const t0 = Date.now();
    const reply = await askChatGPT(message, context, systemPrompt);
    const t1 = Date.now();
    console.log("⏱️ Thời gian gọi OpenAI:", (t1 - t0), "ms");

    // Lưu vào bảng conversation_sessions nếu đang luyện giao tiếp
    if (modeChat === "conversation") {
      await pool.execute(
        "INSERT INTO conversation_sessions (message, reply, mode_chat, created_at) VALUES (?, ?, ?, NOW())",
        [message, reply, modeChat]
      );
    }

    // ✅ Ghi lại lịch sử vào user_questions
    if (userId) {
      await pool.execute(
        "INSERT INTO user_questions (user_id, question, bot_reply, is_answered) VALUES (?, ?, ?, ?)",
        [userId, message, reply, isAnswered]
      );
    }

    res.json({ reply: toMarkdown(reply) });

  } catch (err) {
    console.error("❌ Lỗi xử lý:", err);
    res.json({ reply: "Bot đang bận, vui lòng thử lại sau!" });
  }
};

/**
 * Ghi log các câu hỏi chưa trả lời được vào bảng unanswered_questions.
 */
async function logUnanswered(question) {
  try {
    const hash = hashQuestion(question);
    const [rows] = await pool.execute(
      "SELECT 1 FROM unanswered_questions WHERE hash = ? LIMIT 1",
      [hash]
    );
    if (rows.length === 0) {
      await pool.execute(
        "INSERT INTO unanswered_questions (question, hash, created_at) VALUES (?, ?, NOW())",
        [question, hash]
      );
    }
  } catch (e) {
    console.warn("⚠️ Không thể ghi log unanswered:", e.message);
  }
}

/**
 * API lấy lịch sử chat gần nhất (50 bản ghi).
 */
exports.history = async (req, res) => {
  const [rows] = await pool.execute(
      "SELECT message, reply, created_at FROM chat_history ORDER BY id DESC LIMIT 50"
  );
  res.json(rows);
};

/**
 * API lấy lịch sử luyện giao tiếp (50 bản ghi).
 */
exports.conversationHistory = async (req, res) => {
  const [rows] = await pool.execute(
      "SELECT message, reply, created_at FROM conversation_sessions ORDER BY id DESC LIMIT 50"
  );
  res.json(rows);
};

/**
 * API thống kê tổng số lượt luyện giao tiếp.
 */
exports.conversationCount = async (req, res) => {
  const [[{ count }]] = await pool.execute(
    "SELECT COUNT(*) AS count FROM conversation_sessions"
  );
  res.json({ count });
};

/**
 * API gợi ý từ tiếng Anh cho autocomplete.
 */
exports.suggest = async (req, res) => {
  const query = req.query.query?.trim().toLowerCase();
  if (!query) return res.json([]);
  const [rows] = await pool.execute(
      "SELECT DISTINCT word_en FROM dictionary WHERE word_en LIKE ? ORDER BY word_en LIMIT 10",
      [`${query}%`]
  );
  res.json(rows.map(row => row.word_en));
};
