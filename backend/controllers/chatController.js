require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const pool = require('../db');
const { askChatGPT } = require('../rules');
const levenshtein = require('fast-levenshtein');
const axios = require("axios");
const { getEmbedding, getTopEmbeddingMatches } = require("../services/embeddingVector");
const { selectRelevantContexts } = require("../services/scoreContext");


exports.chat = async (req, res) => {
  const { message, mode = "embedding" } = req.body;
  if (!message) return res.status(400).json({ reply: "No message!" });

  try {
    const [rows] = await pool.execute("SELECT * FROM knowledge_base");
    const [kwRows] = await pool.execute("SELECT keyword FROM important_keywords");
    const importantKeywords = kwRows.map(r => r.keyword);

    let contexts = [];

    if (mode === "context") {
      contexts = selectRelevantContexts(message, rows, importantKeywords);
    } else {
      const questionEmbedding = await getEmbedding(message);
      contexts = getTopEmbeddingMatches(questionEmbedding, rows);
    }

    if (contexts.length === 0) {
      return res.json({ reply: "Xin lỗi, tôi chưa có kiến thức phù hợp để trả lời câu hỏi này." });
    }

    const t0 = Date.now();
    const reply = await askChatGPT(message, contexts);
    const t1 = Date.now();
    console.log("Thời gian gọi OpenAI:", (t1 - t0), "ms");
    
    res.json({ reply });

  } catch (err) {
    console.error("Lỗi xử lý:", err);
    res.json({ reply: "Bot đang bận, vui lòng thử lại sau!" });
  }
};

exports.history = async (req, res) => {
  const [rows] = await pool.execute(
      "SELECT message, reply, created_at FROM chat_history ORDER BY id DESC LIMIT 50"
  );
  res.json(rows);
};

exports.suggest = async (req, res) => {
  const query = req.query.query?.trim().toLowerCase();
  if (!query) return res.json([]);
  const [rows] = await pool.execute(
      "SELECT DISTINCT word_en FROM dictionary WHERE word_en LIKE ? ORDER BY word_en LIMIT 10",
      [`${query}%`]
  );
  res.json(rows.map(row => row.word_en));
};
