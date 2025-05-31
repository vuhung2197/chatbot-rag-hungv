const pool = require('../db');
const { askChatGPT } = require('../rules');

exports.chat = async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ reply: "No message!" });
  // Lấy toàn bộ knowledge từ DB
  const [rows] = await pool.execute("SELECT * FROM knowledge_base WHERE MATCH(title, content) AGAINST(?) LIMIT 5", [message]);
  const allKnowledge = rows;

  // Lọc contexts
  const lowerQuestion = message.toLowerCase();
  const contexts = allKnowledge
    .filter(k =>
      k.content.toLowerCase().includes(lowerQuestion) ||
      k.title.toLowerCase().includes(lowerQuestion)
    )
    .map(k => k.content)
    .slice(0, 5); // chỉ lấy 5 đoạn đầu tiên

  // Không có contexts phù hợp
  if (contexts.length === 0) {
    return res.json({ reply: "Xin lỗi, tôi chưa có kiến thức phù hợp để trả lời câu hỏi này." });
  }

  // Có contexts, gọi AI
  const t0 = Date.now();
  const reply = await askChatGPT(message, contexts);
  const t1 = Date.now();
  console.log("Thời gian gọi OpenAI:", (t1 - t0), "ms");
  res.json({ reply });
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
