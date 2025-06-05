const axios = require("axios");

async function getEmbedding(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  const response = await axios.post(
    "https://api.openai.com/v1/embeddings",
    { input: text, model: "text-embedding-3-small" },
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );
  return response.data.data[0].embedding;
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return (magA && magB) ? dot / (magA * magB) : 0;
}

function getTopEmbeddingMatches(questionEmbedding, knowledgeRows, topN = 1) {
  const scored = knowledgeRows
    .map(row => {
      const emb = Array.isArray(row.embedding) ? row.embedding : null;
      return {
        ...row,
        score: emb && emb.length === questionEmbedding.length
          ? cosineSimilarity(questionEmbedding, emb)
          : 0
      };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  return scored.map(item => `Tiêu đề: ${item.title}\nNội dung: ${item.content}`);
}

module.exports = { getEmbedding, getTopEmbeddingMatches };
