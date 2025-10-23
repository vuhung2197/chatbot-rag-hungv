import pool from '../db.js';
import { getEmbedding } from './embeddingVector.js';
import { cosineSimilarity } from './embeddingVector.js';

/**
 * Advanced RAG System với Multi-Chunk Reasoning
 * Giải quyết vấn đề kết hợp nhiều chunks cho câu hỏi phức tạp
 */

/**
 * 1. Multi-Stage Retrieval
 * Lấy chunks theo nhiều giai đoạn để đảm bảo coverage tốt
 */
export async function multiStageRetrieval(questionEmbedding, question, maxChunks = 8) {
  const stages = [
    { topK: 5, threshold: 0.7, name: 'high_similarity' },
    { topK: 8, threshold: 0.5, name: 'medium_similarity' },
    { topK: 12, threshold: 0.3, name: 'low_similarity' }
  ];

  let allChunks = [];
  
  for (const stage of stages) {
    const chunks = await retrieveChunksWithThreshold(
      questionEmbedding, 
      stage.topK, 
      stage.threshold
    );
    
    // Thêm metadata về stage
    chunks.forEach(chunk => {
      chunk.retrieval_stage = stage.name;
      chunk.retrieval_score = chunk.score;
    });
    
    allChunks.push(...chunks);
  }

  // Remove duplicates và sort
  const uniqueChunks = removeDuplicateChunks(allChunks);
  return uniqueChunks.slice(0, maxChunks);
}

/**
 * 2. Semantic Clustering
 * Nhóm các chunks theo chủ đề để tìm mối liên kết
 */
export async function semanticClustering(chunks, questionEmbedding) {
  if (chunks.length <= 3) return chunks;

  // Tạo embeddings cho tất cả chunks
  const chunkEmbeddings = await Promise.all(
    chunks.map(chunk => getEmbedding(chunk.content))
  );

  // Tính similarity matrix
  const similarityMatrix = [];
  for (let i = 0; i < chunks.length; i++) {
    similarityMatrix[i] = [];
    for (let j = 0; j < chunks.length; j++) {
      if (i === j) {
        similarityMatrix[i][j] = 1;
      } else {
        similarityMatrix[i][j] = cosineSimilarity(
          chunkEmbeddings[i], 
          chunkEmbeddings[j]
        );
      }
    }
  }

  // Clustering đơn giản: nhóm chunks có similarity > 0.6
  const clusters = [];
  const visited = new Set();

  for (let i = 0; i < chunks.length; i++) {
    if (visited.has(i)) continue;

    const cluster = [chunks[i]];
    visited.add(i);

    for (let j = i + 1; j < chunks.length; j++) {
      if (visited.has(j)) continue;
      
      if (similarityMatrix[i][j] > 0.6) {
        cluster.push(chunks[j]);
        visited.add(j);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

/**
 * 3. Multi-Hop Reasoning
 * Tìm kiếm thông tin liên quan dựa trên chunks đã có
 */
export async function multiHopReasoning(initialChunks, questionEmbedding, question) {
  const reasoningChains = [];
  
  for (const chunk of initialChunks) {
    // Tìm chunks liên quan đến chunk hiện tại
    const relatedChunks = await findRelatedChunks(chunk, 3);
    
    // Tạo reasoning chain
    const chain = {
      source_chunk: chunk,
      related_chunks: relatedChunks,
      reasoning_score: calculateReasoningScore(chunk, relatedChunks, questionEmbedding)
    };
    
    reasoningChains.push(chain);
  }

  // Sort theo reasoning score
  reasoningChunks.sort((a, b) => b.reasoning_score - a.reasoning_score);
  
  return reasoningChains.slice(0, 3); // Top 3 reasoning chains
}

/**
 * 4. Context Fusion
 * Kết hợp thông minh các chunks thành context có cấu trúc
 */
export function fuseContext(chunks, reasoningChains, question) {
  // Tạo context có cấu trúc
  let context = `# Thông tin chính:\n\n`;
  
  // Nhóm chunks theo chủ đề
  const topicGroups = groupChunksByTopic(chunks);
  
  for (const [topic, topicChunks] of Object.entries(topicGroups)) {
    context += `## ${topic}:\n`;
    
    topicChunks.forEach((chunk, index) => {
      context += `### ${chunk.title}\n`;
      context += `${chunk.content}\n\n`;
    });
  }

  // Thêm reasoning chains
  if (reasoningChains.length > 0) {
    context += `# Mối liên kết thông tin:\n\n`;
    
    reasoningChains.forEach((chain, index) => {
      context += `## Liên kết ${index + 1}:\n`;
      context += `**Nguồn chính:** ${chain.source_chunk.title}\n`;
      context += `**Nội dung:** ${chain.source_chunk.content}\n\n`;
      
      if (chain.related_chunks.length > 0) {
        context += `**Thông tin liên quan:**\n`;
        chain.related_chunks.forEach(related => {
          context += `- ${related.title}: ${related.content.substring(0, 200)}...\n`;
        });
        context += `\n`;
      }
    });
  }

  return context;
}

/**
 * 5. Adaptive Retrieval
 * Điều chỉnh retrieval dựa trên độ phức tạp của câu hỏi
 */
export async function adaptiveRetrieval(question, questionEmbedding) {
  // Phân tích độ phức tạp của câu hỏi
  const complexity = analyzeQuestionComplexity(question);
  
  let retrievalParams = {
    maxChunks: 5,
    threshold: 0.5,
    useMultiHop: false
  };

  if (complexity.isComplex) {
    retrievalParams.maxChunks = 10;
    retrievalParams.threshold = 0.3;
    retrievalParams.useMultiHop = true;
  }

  if (complexity.hasMultipleTopics) {
    retrievalParams.maxChunks = 15;
    retrievalParams.useSemanticClustering = true;
  }

  if (complexity.requiresReasoning) {
    retrievalParams.useMultiHop = true;
    retrievalParams.useSemanticClustering = true;
  }

  return retrievalParams;
}

/**
 * 6. Context Re-ranking
 * Sắp xếp lại context dựa trên relevance và coherence
 */
export function rerankContext(chunks, questionEmbedding, question) {
  return chunks.map(chunk => {
    // Tính relevance score
    const relevanceScore = chunk.score || 0;
    
    // Tính coherence score (dựa trên mối liên kết với các chunks khác)
    const coherenceScore = calculateCoherenceScore(chunk, chunks);
    
    // Tính completeness score (độ đầy đủ thông tin)
    const completenessScore = calculateCompletenessScore(chunk, question);
    
    // Combined score
    const finalScore = (
      relevanceScore * 0.4 + 
      coherenceScore * 0.3 + 
      completenessScore * 0.3
    );

    return {
      ...chunk,
      final_score: finalScore,
      relevance_score: relevanceScore,
      coherence_score: coherenceScore,
      completeness_score: completenessScore
    };
  }).sort((a, b) => b.final_score - a.final_score);
}

// Helper functions
async function retrieveChunksWithThreshold(embedding, topK, threshold) {
  const [rows] = await pool.execute(`
    SELECT id, title, content, embedding
    FROM knowledge_chunks 
    WHERE embedding IS NOT NULL
    LIMIT ${topK * 2}
  `);

  const scored = rows
    .map(row => {
      let emb;
      try {
        emb = Array.isArray(row.embedding) 
          ? row.embedding 
          : JSON.parse(row.embedding);
      } catch {
        return null;
      }

      const similarity = cosineSimilarity(embedding, emb);
      return {
        ...row,
        score: similarity,
        embedding: emb
      };
    })
    .filter(item => item && item.score > threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
}

function removeDuplicateChunks(chunks) {
  const seen = new Set();
  return chunks.filter(chunk => {
    const key = `${chunk.id}_${chunk.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function findRelatedChunks(sourceChunk, limit) {
  const [rows] = await pool.execute(`
    SELECT id, title, content, embedding
    FROM knowledge_chunks 
    WHERE id != ? AND embedding IS NOT NULL
    LIMIT ${limit * 2}
  `, [sourceChunk.id]);

  const sourceEmbedding = sourceChunk.embedding;
  
  const related = rows
    .map(row => {
      let emb;
      try {
        emb = Array.isArray(row.embedding) 
          ? row.embedding 
          : JSON.parse(row.embedding);
      } catch {
        return null;
      }

      const similarity = cosineSimilarity(sourceEmbedding, emb);
      return {
        ...row,
        score: similarity,
        embedding: emb
      };
    })
    .filter(item => item && item.score > 0.4)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return related;
}

function calculateReasoningScore(sourceChunk, relatedChunks, questionEmbedding) {
  const baseScore = sourceChunk.score || 0;
  const relatedScore = relatedChunks.reduce((sum, chunk) => sum + (chunk.score || 0), 0);
  const avgRelatedScore = relatedChunks.length > 0 ? relatedScore / relatedChunks.length : 0;
  
  return baseScore * 0.6 + avgRelatedScore * 0.4;
}

function groupChunksByTopic(chunks) {
  const topics = {};
  
  chunks.forEach(chunk => {
    const topic = extractTopic(chunk.title, chunk.content);
    if (!topics[topic]) {
      topics[topic] = [];
    }
    topics[topic].push(chunk);
  });
  
  return topics;
}

function extractTopic(title, content) {
  // Simple topic extraction based on keywords
  const text = `${title} ${content}`.toLowerCase();
  
  if (text.includes('nlp') || text.includes('xử lý ngôn ngữ')) return 'NLP';
  if (text.includes('ai') || text.includes('trí tuệ nhân tạo')) return 'AI';
  if (text.includes('machine learning') || text.includes('học máy')) return 'Machine Learning';
  if (text.includes('chatbot') || text.includes('trợ lý')) return 'Chatbot';
  if (text.includes('vector') || text.includes('embedding')) return 'Vector Search';
  
  return 'Khác';
}

function analyzeQuestionComplexity(question) {
  const questionLower = question.toLowerCase();
  
  return {
    isComplex: questionLower.includes('so sánh') || 
               questionLower.includes('khác biệt') ||
               questionLower.includes('mối quan hệ'),
    hasMultipleTopics: (questionLower.match(/và|với|kết hợp/g) || []).length > 1,
    requiresReasoning: questionLower.includes('tại sao') ||
                      questionLower.includes('như thế nào') ||
                      questionLower.includes('giải thích')
  };
}

function calculateCoherenceScore(chunk, allChunks) {
  // Tính độ liên kết với các chunks khác
  const otherChunks = allChunks.filter(c => c.id !== chunk.id);
  if (otherChunks.length === 0) return 0;
  
  let totalSimilarity = 0;
  let count = 0;
  
  otherChunks.forEach(otherChunk => {
    if (otherChunk.embedding && chunk.embedding) {
      const similarity = cosineSimilarity(chunk.embedding, otherChunk.embedding);
      totalSimilarity += similarity;
      count++;
    }
  });
  
  return count > 0 ? totalSimilarity / count : 0;
}

function calculateCompletenessScore(chunk, question) {
  // Tính độ đầy đủ thông tin của chunk
  const questionWords = question.toLowerCase().split(/\s+/);
  const chunkText = `${chunk.title} ${chunk.content}`.toLowerCase();
  
  const matchedWords = questionWords.filter(word => 
    chunkText.includes(word) && word.length > 2
  );
  
  return matchedWords.length / questionWords.length;
}

export default {
  multiStageRetrieval,
  semanticClustering,
  multiHopReasoning,
  fuseContext,
  adaptiveRetrieval,
  rerankContext
};
