import pool from '../db.js';

/**
 * Tính cosine similarity giữa hai vector số.
 * @param {number[]} a - Vector 1
 * @param {number[]} b - Vector 2
 * @returns {number} - Giá trị cosine similarity (từ 0 đến 1)
 */
const cosineSimilarity = (a, b, eps = 1e-12) => {
  // chấp nhận Array HOẶC TypedArray
  const isArrayLike = (x) => Array.isArray(x) || ArrayBuffer.isView(x);
  if (!isArrayLike(a) || !isArrayLike(b) || a.length !== b.length) return 0;

  let dot = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = Number(a[i]);
    const y = Number(b[i]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return 0; // dữ liệu hỏng
    dot += x * y;
    aa  += x * x;
    bb  += y * y;
  }

  const denom = Math.sqrt(aa) * Math.sqrt(bb);
  if (denom < eps) return 0;

  // clamp để tránh lệch vi sai (vd. 1.0000000002)
  const s = dot / denom;
  return Math.max(-1, Math.min(1, s));
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
