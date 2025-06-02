const pool = require('../db');

// Hàm extract keywords
function extractKeywords(text) {
  text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const words = text.replace(/[^a-zA-Z\s]/g, '').split(/\s+/);
  // Bạn có thể mở rộng hoặc rút gọn stop words này tùy ứng dụng
  const stopWords = new Set([
    "la", "cua", "va", "tren", "cho", "mot", "nhung", "cac", "duoc", "toi", "ban", "day", "de", "bao", "ve", "vi", "se", "o", "tinh", "tai", "noi", "khi", "nhan", "vien", "cong", "ty", "lien", "he", "so", "dien", "thoai", "email", "website"
  ]);
  return Array.from(new Set(words.filter(w => w.length >= 3 && !stopWords.has(w))));
}

async function updateImportantKeywords(title, content) {
  const titleKeywords = extractKeywords(title);
  const contentKeywords = extractKeywords(content);
  const allKeywords = Array.from(new Set([...titleKeywords, ...contentKeywords])).filter(Boolean);

  if (allKeywords.length === 0) return;

  // Multi-insert chỉ 1 query!
  const values = allKeywords.map(() => '(?)').join(', ');
  const params = allKeywords;

  await pool.execute(
    `INSERT IGNORE INTO important_keywords (keyword) VALUES ${values}`,
    params
  );
}

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

  // Cập nhật important keywords
  await updateImportantKeywords(title, content);

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

  // Cập nhật important keywords
  await updateImportantKeywords(title, content);

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
