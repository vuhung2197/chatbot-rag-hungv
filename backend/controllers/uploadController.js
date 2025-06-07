const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const { updateChunksForKnowledge } = require("../services/updateChunks");
const pool = require("../db");

exports.uploadAndTrain = async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "Không có file được tải lên." });

  const ext = path.extname(file.originalname).toLowerCase();
  let content = "";

  try {
    if (ext === ".pdf") {
      const dataBuffer = fs.readFileSync(file.path);
      const pdf = await pdfParse(dataBuffer);
      content = pdf.text;
    } else if (ext === ".docx") {
      const result = await mammoth.extractRawText({ path: file.path });
      content = result.value;
    } else if (ext === ".txt") {
      content = fs.readFileSync(file.path, "utf-8");
    } else {
      return res.status(400).json({ error: "Định dạng file không hỗ trợ." });
    }

    const rawName = path.basename(file.originalname, ext);

    const title = rawName;
    const [result] = await pool.execute(
      "INSERT INTO knowledge_base (title, content) VALUES (?, ?)",
      [title, content]
    );

    await updateChunksForKnowledge(result.insertId, title, content);
    res.json({ message: "✅ File đã được huấn luyện thành công!" });
  } catch (err) {
    console.error("❌ Lỗi khi xử lý file:", err);
    res.status(500).json({ error: "Lỗi trong quá trình xử lý file." });
  } finally {
    fs.unlink(file.path, () => {});
  }
};