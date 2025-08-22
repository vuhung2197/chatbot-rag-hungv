/**
 * Chuẩn hóa văn bản: chuyển về chữ thường, loại bỏ dấu câu và khoảng trắng thừa.
 * Giúp so sánh và trích xuất từ khóa chính xác hơn.
 * @param {string} text - Văn bản cần chuẩn hóa
 * @returns {string} - Văn bản đã chuẩn hóa
 */
function normalizeText(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ');
}

/**
 * Tính điểm số mức độ liên quan giữa một context và câu hỏi dựa trên số lượng từ khóa trùng khớp.
 * Ưu tiên các cụm từ quan trọng, phạt nếu độ dài context quá lớn.
 * @param {string} context - Đoạn văn bản kiến thức
 * @param {string} question - Câu hỏi người dùng
 * @returns {number} - Điểm số mức độ liên quan
 */
function scoreContext(question, context, title, questionKeywords, importantKeywords) {
  let score = 0;
  const normTitle = normalizeText(title);
  const normContext = normalizeText(context);
  const normQuestion = normalizeText(question);

  importantKeywords.forEach(kw => {
    if (normTitle.includes(kw) && normContext.includes(kw)) score += 4;
    else if (normTitle.includes(kw)) score += 3;
    else if (normContext.includes(kw)) score += 2;
  });

  if (normTitle.includes(normQuestion) || normQuestion.includes(normTitle)) {
    score += 6;
  }

  questionKeywords.forEach(kw => {
    if (normTitle.includes(kw)) score += 2;
    if (normContext.includes(kw)) score += 1;
  });

  let seqScore = 0;
  let lastIdx = -2;
  questionKeywords.forEach(kw => {
    const idx = normContext.indexOf(kw);
    if (idx >= 0 && idx - lastIdx <= 3) seqScore += 1;
    if (idx >= 0) lastIdx = idx;
  });
  score += seqScore;

  const levDist = levenshtein.get(normTitle, normQuestion);
  if (levDist < 5) score += 3;

  const lengthPenalty = Math.max(0, Math.floor(normContext.length / 250) - 1);
  score -= lengthPenalty;

  if (normContext.length > 30 && normContext.length < 250) score += 1;

  return score;
}

/**
 * Chọn ra các context (đoạn kiến thức) liên quan nhất đến câu hỏi dựa trên điểm số.
 * Sắp xếp các context theo điểm số giảm dần và trả về top N context phù hợp nhất.
 * @param {string} question - Câu hỏi người dùng
 * @param {Array<string>} contexts - Danh sách các đoạn kiến thức
 * @param {number} topN - Số lượng context trả về (top N)
 * @returns {Array<{context: string, score: number}>} - Danh sách context và điểm số
 */
export function selectRelevantContexts(message, allKnowledge, importantKeywords, topN = 3) {
  const normQ = normalizeText(message);
  const questionKeywords = normQ.split(' ').filter(w => w.length > 2);

  const scored = allKnowledge
    .map(k => ({
      score: scoreContext(message, k.content, k.title, questionKeywords, importantKeywords),
      value: `Tiêu đề: ${k.title}\nNội dung: ${k.content}`
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(item => item.value);

  return scored;
}