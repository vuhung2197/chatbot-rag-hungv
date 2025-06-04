const levenshtein = require('fast-levenshtein');

function normalizeText(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");
}

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

function selectRelevantContexts(message, allKnowledge, importantKeywords, topN = 3) {
  const normQ = normalizeText(message);
  const questionKeywords = normQ.split(" ").filter(w => w.length > 2);

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

module.exports = { selectRelevantContexts };