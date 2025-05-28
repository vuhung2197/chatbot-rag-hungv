const pool = require('../db');

exports.saveWord = async (req, res) => {
  const { word_en, word_vi } = req.body;
  if (!word_en) return res.status(400).json({ message: "Thiếu từ tiếng Anh!" });
  const [rows] = await pool.execute(
      "SELECT id FROM user_words WHERE word_en = ?", [word_en.trim().toLowerCase()]
  );
  if (rows.length > 0) {
      return res.status(400).json({ message: "Từ này đã có trong sổ tay!" });
  }
  await pool.execute(
      "INSERT INTO user_words (word_en, word_vi) VALUES (?, ?)",
      [word_en.trim().toLowerCase(), word_vi || null]
  );
  res.json({ message: "Đã lưu từ!" });
};

exports.userWords = async (req, res) => {
  const [rows] = await pool.execute(
      'SELECT * FROM user_words ORDER BY created_at DESC'
  );
  res.json(rows);
};

exports.approveWord = async (req, res) => {
  const { id } = req.body;
  const [rows] = await pool.execute('SELECT * FROM user_words WHERE id = ?', [id]);
  if (!rows.length) return res.status(404).json({ message: "Không tìm thấy từ!" });

  const { word_en, word_vi } = rows[0];
  const [exist] = await pool.execute('SELECT id FROM dictionary WHERE word_en = ?', [word_en]);
  if (exist.length > 0) {
      return res.status(400).json({ message: "Từ đã có trong từ điển!" });
  }
  await pool.execute(
      "INSERT INTO dictionary (word_en, word_vi) VALUES (?, ?)",
      [word_en, word_vi || null]
  );
  await pool.execute("DELETE FROM user_words WHERE id = ?", [id]);
  res.json({ message: "Đã duyệt vào từ điển!" });
};

exports.deleteUserWord = async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ message: "Thiếu ID!" });
  await pool.execute('DELETE FROM user_words WHERE id = ?', [id]);
  res.json({ message: "Đã xóa từ!" });
};
