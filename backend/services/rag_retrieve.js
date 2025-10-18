import pool from '../db.js';
import { searchSimilarVectors, cachedVectorSearch, hybridVectorSearch } from './vectorDatabase.js';

/**
 * Tối ưu hóa RAG retrieval với vector database
 * Sử dụng approximate nearest neighbor search thay vì load toàn bộ vectors
 */

/**
 * Lấy ra top K knowledge chunk có embedding gần nhất với embedding câu hỏi.
 * Sử dụng vector index để tăng tốc độ tìm kiếm
 * @param {number[]} questionEmbedding - Embedding của câu hỏi
 * @param {number} topK - Số lượng chunk muốn lấy (default: 3)
 * @param {number} threshold - Ngưỡng similarity (default: 0.5)
 * @returns {Promise<Array>} - Danh sách các chunk phù hợp nhất
 */
export async function retrieveTopChunks(questionEmbedding, topK = 3, threshold = 0.5) {
  try {
    // Sử dụng cached vector search để tối ưu performance
    const results = await cachedVectorSearch(questionEmbedding, topK);
    
    // Filter theo threshold
    const filteredResults = results.filter(r => r.score > threshold);
    
    console.log(`🎯 Retrieved ${filteredResults.length} chunks from vector database`);
    return filteredResults;
    
  } catch (error) {
    console.error('❌ Error in optimized vector search:', error);
    
    // Fallback to basic search nếu vector search fail
    console.log('🔄 Falling back to basic search...');
    return await basicVectorSearch(questionEmbedding, topK, threshold);
  }
}

/**
 * Hybrid search: Kết hợp vector search với keyword search
 * @param {number[]} questionEmbedding - Embedding của câu hỏi
 * @param {string[]} keywords - Keywords từ câu hỏi
 * @param {number} topK - Số lượng chunk muốn lấy
 * @returns {Promise<Array>} - Danh sách các chunk phù hợp nhất
 */
export async function retrieveTopChunksHybrid(questionEmbedding, keywords = [], topK = 3) {
  try {
    const results = await hybridVectorSearch(questionEmbedding, keywords, topK);
    console.log(`🎯 Hybrid search retrieved ${results.length} chunks`);
    return results;
    
  } catch (error) {
    console.error('❌ Error in hybrid search:', error);
    return await retrieveTopChunks(questionEmbedding, topK);
  }
}

/**
 * Basic vector search (fallback method)
 * Sử dụng khi vector index chưa được tạo
 */
async function basicVectorSearch(questionEmbedding, topK = 3, threshold = 0.5) {
  try {
    // Sử dụng stored procedure nếu có
    const [rows] = []] = await pool.execute(
      'CALL SearchSimilarVectors(?, ?, ?)',
      [JSON.stringify(questionEmbedding), threshold, topK * 2]
    );
    
    if (rows.length > 0) {
      return rows.slice(0, topK);
    }
    
    // Fallback to manual calculation nếu stored procedure không có
    console.log('⚠️ Using manual vector search (not optimized)');
    const [allRows] = await pool.execute(
      'SELECT id, title, content, embedding FROM knowledge_chunks LIMIT 1000'
    );
    
    const scored = allRows
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
      .filter((r) => r.score > threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored;
    
  } catch (error) {
    console.error('❌ Error in basic vector search:', error);
    return [];
  }
}

/**
 * Tính cosine similarity giữa hai vector số (fallback function)
 */
function cosineSimilarity(a, b, eps = 1e-12) {
  const isArrayLike = (x) => Array.isArray(x) || ArrayBuffer.isView(x);
  if (!isArrayLike(a) || !isArrayLike(b) || a.length !== b.length) return 0;

  let dot = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = Number(a[i]);
    const y = Number(b[i]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return 0;
    dot += x * y;
    aa  += x * x;
    bb  += y * y;
  }

  const denom = Math.sqrt(aa) * Math.sqrt(bb);
  if (denom < eps) return 0;

  const s = dot / denom;
  return Math.max(-1, Math.min(1, s));
}

/**
 * Batch retrieval cho multiple queries
 * Tối ưu khi cần tìm kiếm nhiều câu hỏi cùng lúc
 */
export async function batchRetrieveTopChunks(queries, topK = 3) {
  try {
    const { batchVectorSearch } = await import('./vectorDatabase.js');
    return await batchVectorSearch(queries, topK);
  } catch (error) {
    console.error('❌ Error in batch retrieval:', error);
    return [];
  }
}
