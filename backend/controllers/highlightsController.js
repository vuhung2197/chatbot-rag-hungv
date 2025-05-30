const pool = require('../db');
const { translateWordByWord } = require('../rules');

exports.saveHighlight = async (req, res) => {
  const { text } = req.body;
  if (!text || text.trim().length === 0)
    return res.status(400).json({ message: "Thiếu đoạn văn bản!" });

  let translatedPairs = [];
  let translatedText = "";

  try {
    translatedPairs = await translateWordByWord(text);
    cleanedText = translatedPairs.map(item => item.en).join(' ');
    translatedText = translatedPairs.map(item => item.vi).join(' ');
  } catch (e) {
    return res.status(500).json({ message: "Lỗi dịch AI!" });
  }

  await pool.execute(
    "INSERT INTO user_highlighted_text (text, translated_text) VALUES (?, ?)",
    [cleanedText, translatedText]
  );
  res.json({ message: "Đã lưu và dịch từng từ!", translatedText, translatedPairs });
};

exports.getHighlights = async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT id, text, translated_text, created_at FROM user_highlighted_text WHERE approved = 0 ORDER BY id DESC"
  );
  res.json(rows);
};

exports.highlightsRoutes = async (req, res) => {
  const { id } = req.body;
  // Lấy bản ghi highlight
  const [rows] = await pool.execute('SELECT * FROM user_highlighted_text WHERE id = ?', [id]);
  if (!rows.length) return res.status(404).json({ message: "Không tìm thấy đoạn văn!" });
  const { text, translated_text } = rows[0];

  // Nếu text hoặc translated_text trống, không cho duyệt
  if (!text || !translated_text) {
    return res.status(400).json({ message: "Không đủ dữ liệu để duyệt!" });
  }

  // Kiểm tra trùng trong dictionary
  const [exist] = await pool.execute('SELECT id FROM dictionary WHERE word_en = ?', [text.trim().toLowerCase()]);
  if (exist.length > 0) {

    // Xoá highlight nếu đã có trong dictionary
    await pool.execute(
      "DELETE FROM user_highlighted_text WHERE id = ?",
      [id]
    );

    return res.status(400).json({ message: "Từ này đã có trong từ điển!" });
  }

  // Thêm vào dictionary
  await pool.execute(
    "INSERT INTO dictionary (word_en, word_vi) VALUES (?, ?)",
    [text.trim().toLowerCase(), translated_text.trim()]
  );

  // Cập nhật trạng thái đã duyệt (tuỳ chọn)
  await pool.execute(
    "UPDATE user_highlighted_text SET approved = 1 WHERE id = ?",
    [id]
  );

  res.json({ message: "Đã duyệt vào từ điển!" });
};
