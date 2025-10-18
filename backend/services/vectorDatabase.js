// Vector Database Service - Tối ưu cho large-scale vector search
import pool from '../db.js';

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
  try {
    // Tạo index cho vector similarity search
    await pool.execute(`
      ALTER TABLE knowledge_chunks 
      ADD INDEX idx_embedding_vector USING ivfflat (embedding) 
      WITH (lists = 100)
    `);
    
    console.log('✅ Vector index created successfully');
  } catch (error) {
    console.error('❌ Error creating vector index:', error);
    throw error;
  }
}

/**
 * Tối ưu hóa vector search với approximate nearest neighbor
 * Thay vì load toàn bộ vectors, sử dụng index để tìm kiếm nhanh
 */
export async function searchSimilarVectors(questionEmbedding, topK = 3, threshold = 0.5) {
  try {
    // Sử dụng vector similarity search với index
    const [rows] = await pool.execute(`
      SELECT 
        id, 
        title, 
        content, 
        embedding,
        (embedding <-> ?) as distance
      FROM knowledge_chunks 
      WHERE (embedding <-> ?) < ?
      ORDER BY distance ASC
      LIMIT ?
    `, [
      JSON.stringify(questionEmbedding),
      JSON.stringify(questionEmbedding), 
      1 - threshold, // Convert similarity to distance
      topK
    ]);

    return rows.map(row => ({
      ...row,
      score: 1 - row.distance, // Convert distance back to similarity
      embedding: JSON.parse(row.embedding)
    }));

  } catch (error) {
    console.error('❌ Error in vector search:', error);
    throw error;
  }
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
      console.error(`❌ Error processing query: ${query.text}`, error);
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

export async function cachedVectorSearch(questionEmbedding, topK = 3) {
  const cacheKey = JSON.stringify(questionEmbedding) + `_${topK}`;
  
  if (vectorCache.has(cacheKey)) {
    console.log('🎯 Cache hit for vector search');
    return vectorCache.get(cacheKey);
  }
  
  const results = await searchSimilarVectors(questionEmbedding, topK);
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
  try {
    // Vector similarity search
    const vectorResults = await searchSimilarVectors(questionEmbedding, topK * 2);
    
    // Keyword search nếu có keywords
    let keywordResults = [];
    if (keywords.length > 0) {
      const keywordQuery = keywords.join(' OR ');
      const [keywordRows] = await pool.execute(`
        SELECT id, title, content, embedding
        FROM knowledge_chunks 
        WHERE MATCH(title, content) AGAINST(? IN NATURAL LANGUAGE MODE)
        LIMIT ?
      `, [keywordQuery, topK]);
      
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
      
  } catch (error) {
    console.error('❌ Error in hybrid search:', error);
    throw error;
  }
}

/**
 * Performance monitoring cho vector search
 */
export async function getVectorSearchStats() {
  try {
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_chunks,
        AVG(JSON_LENGTH(embedding)) as avg_vector_dimension,
        MAX(created_at) as last_updated
      FROM knowledge_chunks
    `);
    
    return stats[0];
  } catch (error) {
    console.error('❌ Error getting vector stats:', error);
    return null;
  }
}
