const axios = require("axios");

async function getEmbedding(text) {
  /**
   * Lấy embedding vector cho một đoạn văn bản sử dụng AI (ví dụ: OpenAI API).
   * Nhận vào một chuỗi text, trả về mảng số thực (vector embedding).
   * @param {string} text - Văn bản cần lấy embedding
   * @returns {Promise<number[]>} - Mảng embedding vector
   */
  const apiKey = process.env.OPENAI_API_KEY;
  const response = await axios.post(
    "https://api.openai.com/v1/embeddings",
    { input: text, model: "text-embedding-3-small" },
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );
  return response.data.data[0].embedding;
}

function cosineSimilarity(a, b) {
  /**
   * Tính độ tương đồng cosine giữa hai vector embedding.
   * Trả về giá trị từ -1 đến 1 (1 là giống hệt, 0 là không liên quan).
   * @param {number[]} vecA - Vector thứ nhất
   * @param {number[]} vecB - Vector thứ hai
   * @returns {number} - Giá trị cosine similarity
   */
  if (!a || !b || a.length !== b.length) return 0;
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return (magA && magB) ? dot / (magA * magB) : 0;
}

function getTopEmbeddingMatches(questionEmbedding, knowledgeRows, topN = 1) {
  /**
   * Tìm các đoạn văn bản có embedding gần nhất với embedding đầu vào.
   * So sánh embedding đầu vào với danh sách embedding đã lưu, trả về top N kết quả giống nhất.
   * @param {number[]} embedding - Embedding vector đầu vào
   * @param {Array<{id: number, embedding: number[]}>} candidates - Danh sách các object có embedding
   * @param {number} topN - Số lượng kết quả trả về (top N)
   * @returns {Array<{id: number, score: number}>} - Danh sách id và điểm tương đồng cosine
   */
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
