const pool = require('../db');
const { translateSingleWord } = require('../rules');

exports.saveHighlight = async (req, res) => {
  const { text } = req.body;
  if (!text || text.trim().length === 0)
    return res.status(400).json({ message: "Thiếu đoạn văn bản!" });

  let translatedText = "";
  try {
    translatedText = await translateSingleWord(text);
    if (typeof translatedText === "object" && translatedText.reply) {
      translatedText = translatedText.reply;
    }
  } catch (e) {
    translatedText = "";
  }

  await pool.execute(
    "INSERT INTO user_highlighted_text (text, translated_text) VALUES (?, ?)",
    [text, translatedText]
  );
  res.json({ message: "Đã lưu và dịch đoạn văn bằng AI!", translatedText });
};

exports.getHighlights = async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT id, text, translated_text, created_at FROM user_highlighted_text ORDER BY id DESC"
  );
  res.json(rows);
};
