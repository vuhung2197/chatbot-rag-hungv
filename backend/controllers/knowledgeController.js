const pool = require('../db');

// Thêm mới kiến thức
exports.addKnowledge = async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content)
    return res.status(400).json({ message: "Thiếu tiêu đề hoặc nội dung!" });

  const [result] = await pool.execute(
    "INSERT INTO knowledge_base (title, content) VALUES (?, ?)",
    [title, content]
  );
  const insertedId = result.insertId;
  const [rows] = await pool.execute("SELECT * FROM knowledge_base WHERE id=?", [insertedId]);
  res.json({ message: "Đã thêm kiến thức!", data: rows[0] });
};

// Lấy toàn bộ kiến thức
exports.getAllKnowledge = async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT * FROM knowledge_base ORDER BY id DESC"
  );
  res.json(rows);
};

// Sửa kiến thức
exports.updateKnowledge = async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;
  if (!title || !content)
    return res.status(400).json({ message: "Thiếu tiêu đề hoặc nội dung!" });

  await pool.execute(
    "UPDATE knowledge_base SET title=?, content=? WHERE id=?",
    [title, content, id]
  );
  const [rows] = await pool.execute("SELECT * FROM knowledge_base WHERE id=?", [id]);
  res.json({ message: "Đã cập nhật kiến thức!", data: rows[0] });
};

// Xóa kiến thức
exports.deleteKnowledge = async (req, res) => {
  const { id } = req.params;
  await pool.execute(
    "DELETE FROM knowledge_base WHERE id=?",
    [id]
  );
  res.json({ message: "Đã xóa kiến thức!", id });
};

// Lấy kiến thức theo ID
exports.getKnowledgeById = async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.execute("SELECT * FROM knowledge_base WHERE id=?", [id]);
  if (rows.length === 0) return res.status(404).json({ message: "Không tìm thấy!" });
  res.json(rows[0]);
};
