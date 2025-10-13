import pool from '../db.js';

/**
 * Tính cosine similarity giữa hai vector số.
 * @param {number[]} a - Vector 1
 * @param {number[]} b - Vector 2
 * @returns {number} - Giá trị cosine similarity (từ 0 đến 1)
 */
const cosineSimilarity = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const normB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return normA && normB ? dot / (normA * normB) : 0;
};

/**
 * Lấy ra top K knowledge chunk có embedding gần nhất với embedding câu hỏi.
 * @param {number[]} questionEmbedding - Embedding của câu hỏi
 * @param {number} topK - Số lượng chunk muốn lấy (default: 3)
 * @returns {Promise<Array>} - Danh sách các chunk phù hợp nhất
 */
export async function retrieveTopChunks(questionEmbedding, topK = 3) {
  const [rows] = await pool.execute(
    'SELECT id, title, content, embedding FROM knowledge_chunks'
  );
  const scored = rows
    .map((row) => {
      let emb;
      try {
        emb = Array.isArray(row.embedding)
          ? row.embedding
          : JSON.parse(row.embedding);
      } catch (err) {
        console.error('❌ Lỗi parse embedding:', err, 'row id:', row.id);
        emb = null;
      }

      return {
        ...row,
        score: emb ? cosineSimilarity(questionEmbedding, emb) : 0,
      };
    })
    .filter((r) => r.score > 0.5); // bạn có thể điều chỉnh ngưỡng

  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}
