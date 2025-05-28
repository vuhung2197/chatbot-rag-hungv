const pool = require('../db');
const { getEnglishBotReply } = require('../rules');

exports.chat = async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ reply: "No message!" });
  const reply = await getEnglishBotReply(message);
  await pool.execute(
      "INSERT INTO chat_history (message, reply) VALUES (?, ?)", [message, reply]
  );
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
