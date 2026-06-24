// Vector Database Service - Tối ưu cho large-scale vector search
import pool from '#db';

/**
 * Vector Database Service với các tối ưu hóa:
 * 1. Approximate Nearest Neighbor (ANN) search
 * 2. Vector indexing
 * 3. Batch processing
 * 4. Caching strategies
 */

/**
 * Tạo vector index để tăng tốc độ tìm kiếm
 * Sử dụng HNSW (Hierarchical Navigable Small World) algorithm
 */
export async function createVectorIndex() {
  // Tạo index cho vector similarity search
  await pool.execute(`
    ALTER TABLE knowledge_chunks 
    ADD INDEX idx_embedding_vector USING ivfflat (embedding) 
    WITH (lists = 100)
  `);

  // console.log('✅ Vector index created successfully');
}

/**
 * Tối ưu hóa vector search với approximate nearest neighbor
 * Thay vì load toàn bộ vectors, sử dụng index để tìm kiếm nhanh
 */
export async function searchSimilarVectors(questionEmbedding, topK = 3, threshold = 0.5) {
  try {
    // Native pgvector search using cosine distance operator (<=>)
    // Distance = 1 - Similarity => Similarity = 1 - Distance
    // Order by distance ascending (closest first)
    // Cast input parameter to vector type
    const vectorStr = JSON.stringify(questionEmbedding);

    const [rows] = await pool.execute(`
      SELECT 
        id, 
        title, 
        content, 
        1 - (embedding <=> $1::vector) as score
      FROM knowledge_chunks 
      WHERE 1 - (embedding <=> $1::vector) > $2
      ORDER BY embedding <=> $1::vector ASC
      LIMIT $3
    `, [vectorStr, threshold, topK]);

    return rows;
  } catch (error) {
    console.error('❌ Error in native vector search:', error);
    return [];
  }
}

/**
 * Tính cosine similarity giữa hai vector
 */
function cosineSimilarity(a, b, eps = 1e-12) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;

  let dot = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = Number(a[i]);
    const y = Number(b[i]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return 0;
    dot += x * y;
    aa += x * x;
    bb += y * y;
  }

  const denom = Math.sqrt(aa) * Math.sqrt(bb);
  if (denom < eps) return 0;

  const s = dot / denom;
  return Math.max(-1, Math.min(1, s));
}

/**
 * Batch processing cho multiple queries
 * Tối ưu khi cần tìm kiếm nhiều vectors cùng lúc
 */
export async function batchVectorSearch(queries, topK = 3) {
  const results = [];

  for (const query of queries) {
    try {
      const result = await searchSimilarVectors(query.embedding, topK);
      results.push({
        query: query.text,
        results: result
      });
    } catch (error) {
      // console.error(`❌ Error processing query: ${query.text}`, error);
      results.push({
        query: query.text,
        results: [],
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Caching layer cho vector search
 * Cache kết quả tìm kiếm để tránh tính toán lại
 */
const vectorCache = new Map();

export async function cachedVectorSearch(questionEmbedding, topK = 3, threshold = 0.5) {
  const cacheKey = `${JSON.stringify(questionEmbedding)}_${topK}_${threshold}`;

  if (vectorCache.has(cacheKey)) {
    // console.log('🎯 Cache hit for vector search');
    return vectorCache.get(cacheKey);
  }

  const results = await searchSimilarVectors(questionEmbedding, topK, threshold);
  vectorCache.set(cacheKey, results);

  // Clean cache sau 1 giờ
  setTimeout(() => {
    vectorCache.delete(cacheKey);
  }, 3600000);

  return results;
}

/**
 * Hybrid search: Kết hợp vector search với keyword search
 * Tăng độ chính xác bằng cách kết hợp nhiều phương pháp
 */
export async function hybridVectorSearch(questionEmbedding, keywords = [], topK = 3) {
  // Vector similarity search
  const vectorResults = await searchSimilarVectors(questionEmbedding, topK * 2);

  // Keyword search nếu có keywords
  let keywordResults = [];
  if (keywords.length > 0) {
    const keywordQuery = keywords.join(' OR ');
    // Use basic keyword search for PostgreSQL (ILIKE) as placeholder for FTS
    const [keywordRows] = await pool.execute(`
      SELECT id, title, content, embedding::text as embedding
      FROM knowledge_chunks 
      WHERE title ILIKE $1 OR content ILIKE $1
      LIMIT $2
    `, [`%${keywords[0]}%`, topK]);

    keywordResults = keywordRows.map(row => ({
      ...row,
      embedding: JSON.parse(row.embedding),
      score: 0.8 // Fixed score for keyword matches
    }));
  }

  // Combine và re-rank results
  const combinedResults = [...vectorResults, ...keywordResults];
  const uniqueResults = combinedResults.filter((item, index, self) =>
    index === self.findIndex(t => t.id === item.id)
  );

  return uniqueResults
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
