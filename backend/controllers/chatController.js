const pool = require('../db');
const { askChatGPT } = require('../rules');
const levenshtein = require('fast-levenshtein');

// Hàm chấm điểm context dựa trên câu hỏi và tiêu đề
function scoreContext(question, context, title, questionKeywords, importantKeywords) {
  let score = 0;
  const normTitle = normalizeText(title);
  const normContext = normalizeText(context);
  const normQuestion = normalizeText(question);

  // 1. Ưu tiên trùng nguyên cụm keyword
  importantKeywords.forEach(kw => {
    if (normTitle.includes(kw) && normContext.includes(kw)) score += 4;
    else if (normTitle.includes(kw)) score += 3;
    else if (normContext.includes(kw)) score += 2;
  });

  // 2. Ưu tiên match cụm nhiều từ trong title
  if (normTitle.includes(normQuestion) || normQuestion.includes(normTitle)) {
    score += 6;
  }

  // 3. Chấm điểm từng từ khóa câu hỏi
  questionKeywords.forEach(kw => {
    if (normTitle.includes(kw)) score += 2; // match ở title
    if (normContext.includes(kw)) score += 1; // match ở content
  });

  // 4. Nếu nhiều từ khóa xuất hiện gần nhau
  let seqScore = 0;
  let lastIdx = -2;
  questionKeywords.forEach(kw => {
    const idx = normContext.indexOf(kw);
    if (idx >= 0 && idx - lastIdx <= 3) seqScore += 1;
    if (idx >= 0) lastIdx = idx;
  });
  score += seqScore;

  // 5. Độ tương đồng tiêu đề và câu hỏi
  const levDist = levenshtein.get(normTitle, normQuestion);
  if (levDist < 5) score += 3; // rất gần

  // 6. Phạt context quá dài
  const lengthPenalty = Math.max(0, Math.floor(normContext.length / 250) - 1);
  score -= lengthPenalty;

  // 7. Ưu tiên context vừa phải, không quá ngắn/quá dài
  if (normContext.length > 30 && normContext.length < 250) score += 1;

  return score;
}

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

  // Tối ưu: lấy knowledge liên quan (nên chuyển sang vector search nếu muốn ngữ nghĩa)
  const [rows] = await pool.execute(
    "SELECT * FROM knowledge_base WHERE MATCH(title, content) AGAINST(?) LIMIT 10", [message]
  );
  const allKnowledge = rows;

  // Lấy keyword chỉ liên quan đến câu hỏi
  const normalizedQuestion = normalizeText(message);
  const questionKeywords = normalizedQuestion.split(" ").filter(w => w.length > 2);

  const [kwRows] = await pool.execute("SELECT keyword FROM important_keywords WHERE keyword IN (?)", [questionKeywords]);
  const importantKeywords = kwRows.map(r => r.keyword);

  // So khớp context
  const contexts = allKnowledge
  .map(k => ({
    score: scoreContext(
      message,
      k.content,
      k.title,
      questionKeywords,
      importantKeywords
    ),
    value: `Tiêu đề: ${k.title}\nNội dung: ${k.content}`
  }))
  .filter(item => item.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 3)
  .map(item => item.value);


  if (contexts.length === 0) {
    // Có thể lưu lại câu hỏi này để bổ sung kiến thức
    return res.json({ reply: "Xin lỗi, tôi chưa có kiến thức phù hợp để trả lời câu hỏi này." });
  }

  // Nếu context quá dài, tóm tắt lại (bonus)
  // const summary = await summarizeContext(contexts);

  const t0 = Date.now();
  const reply = await askChatGPT(message, contexts); // hoặc truyền summary
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
