const pool = require('../db');
const { askChatGPT } = require('../rules');

function normalizeText(str) {
  // Bỏ dấu tiếng Việt, chuyển thường, loại bỏ ký tự đặc biệt
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");
}

exports.chat = async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ reply: "No message!" });
  // Lấy tối đa 5 knowledge phù hợp nhất
  const [rows] = await pool.execute(
    "SELECT * FROM knowledge_base WHERE MATCH(title, content) AGAINST(?) LIMIT 5", [message]
  );
  const allKnowledge = rows;

  const normalizedQuestion = normalizeText(message);

  // Tách các từ khoá trong câu hỏi
  const questionKeywords = normalizedQuestion.split(" ").filter(w => w.length > 2); // bỏ các từ quá ngắn

  // Ưu tiên tìm context nào chứa các từ khóa đặc biệt trong lĩnh vực công ty
  const importantKeywords = ["địa chỉ", "liên hệ", "công ty", "số điện thoại", "email", "website", "trụ sở"];

  const contexts = allKnowledge
    .map(k => {
      const normTitle = normalizeText(k.title);
      const normContent = normalizeText(k.content);
      // Đếm số keyword trùng giữa câu hỏi và từng context
      let matchCount = 0;
      questionKeywords.forEach(kw => {
        if (normTitle.includes(kw) || normContent.includes(kw)) matchCount += 1;
      });
      // Ưu tiên các đoạn có các từ khóa quan trọng
      importantKeywords.forEach(kw => {
        if (normTitle.includes(kw) || normContent.includes(kw)) matchCount += 2;
      });
      return {
        score: matchCount,
        value: `Tiêu đề: ${k.title}\nNội dung: ${k.content}`,
      };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => item.value);

  if (contexts.length === 0) {
    return res.json({ reply: "Xin lỗi, tôi chưa có kiến thức phù hợp để trả lời câu hỏi này." });
  }


  // Gọi AI với cả tiêu đề và nội dung
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
