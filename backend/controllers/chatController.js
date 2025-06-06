/**
 * Controller chính cho các API chat, gợi ý, lịch sử của chatbot.
 * 
 * - Tích hợp nhiều chế độ truy xuất context (theo keyword hoặc theo embedding/vector).
 * - Giao tiếp với OpenAI để sinh câu trả lời.
 * - Ghi log các câu hỏi chưa trả lời được.
 * - Hỗ trợ truy xuất lịch sử chat và gợi ý từ điển.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const pool = require('../db');
const { askChatGPT } = require('../rules');
const levenshtein = require('fast-levenshtein');
const axios = require("axios");
const { getEmbedding, getTopEmbeddingMatches } = require("../services/embeddingVector");
const { selectRelevantContexts } = require("../services/scoreContext");
const { retrieveTopChunks } = require("../services/rag_retrieve");
const crypto = require("crypto");

function hashQuestion(text) {
  return crypto.createHash("sha256").update(text.trim().toLowerCase()).digest("hex");
}

/**
 * Xử lý API chat chính.
 * - mode = "context": Lấy context dựa trên keyword và scoring.
 * - mode = "rag" (default): Lấy context dựa trên embedding/vector (RAG).
 * - Gọi OpenAI để sinh câu trả lời dựa trên context đã chọn.
 */
exports.chat = async (req, res) => {
  const { message, mode = "rag" } = req.body;
  if (!message) return res.status(400).json({ reply: "No message!" });

  try {
    let context = "";

    if (mode === "context") {
      // Lấy toàn bộ knowledge và keyword, chọn context phù hợp bằng scoring
      const [rows] = await pool.execute("SELECT * FROM knowledge_base");
      const [kwRows] = await pool.execute("SELECT keyword FROM important_keywords");
      const importantKeywords = kwRows.map(r => r.keyword);

      const contexts = selectRelevantContexts(message, rows, importantKeywords);
      if (contexts.length === 0) {
        await logUnanswered(message);
        return res.json({ reply: "Xin lỗi, tôi chưa có kiến thức phù hợp để trả lời câu hỏi này." });
      }

      context = contexts.map(c => `Tiêu đề: ${c.title}\nNội dung: ${c.content}`).join("\n---\n");

    } else {
      // Lấy context bằng vector search (embedding)
      let embedding;
      try {
        embedding = await getEmbedding(message);
      } catch {
        return res.json({ reply: "Không thể tính embedding câu hỏi!" });
      }

      const chunks = await retrieveTopChunks(embedding);
      if (!chunks.length) {
        await logUnanswered(message);
        return res.json({ reply: "Tôi chưa có kiến thức phù hợp để trả lời câu hỏi này." });
      }

      context = chunks.map(c => `Tiêu đề: ${c.title}\nNội dung: ${c.content}`).join("\n---\n");
    }

    // Gọi OpenAI để sinh câu trả lời dựa trên context đã chọn
    const t0 = Date.now();
    const reply = await askChatGPT(message, context);
    const t1 = Date.now();
    console.log("⏱️ Thời gian gọi OpenAI:", (t1 - t0), "ms");

    res.json({ reply });

  } catch (err) {
    console.error("❌ Lỗi xử lý:", err);
    res.json({ reply: "Bot đang bận, vui lòng thử lại sau!" });
  }
};


/**
 * Ghi log các câu hỏi chưa trả lời được vào bảng unanswered_questions.
 * Nếu câu hỏi đã tồn tại (theo hash), sẽ không ghi trùng.
 *
 * @param {string} question - Câu hỏi chưa trả lời được từ người dùng
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
 * API lấy lịch sử chat gần nhất.
 * Trả về 50 bản ghi mới nhất từ bảng chat_history.
 */
exports.history = async (req, res) => {
  const [rows] = await pool.execute(
      "SELECT message, reply, created_at FROM chat_history ORDER BY id DESC LIMIT 50"
  );
  res.json(rows);
};

/**
 * API gợi ý từ tiếng Anh cho autocomplete.
 * Trả về tối đa 10 từ bắt đầu bằng query từ bảng dictionary.
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
