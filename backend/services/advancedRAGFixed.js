import pool from '#db';
import { getEmbedding } from './embeddingVector.js';
import { cosineSimilarity } from './embeddingVector.js';
import axios from 'axios';

/**
 * Advanced RAG System với Multi-Chunk Reasoning - FIXED VERSION
 * Giải quyết vấn đề kết hợp nhiều chunks cho câu hỏi phức tạp
 */

/**
 * 1. Multi-Stage Retrieval - UPGRADED TO HYBRID SEARCH (Phase 3)
 * Kết hợp Vector Search và Full-Text Search (keyword) bằng thuật toán RRF
 */
export async function multiStageRetrieval(questionEmbedding, question, maxChunks = 8) {
  try {
    console.log('🔄 Starting Hybrid Search...');

    // Run Vector Search and Text Search in parallel
    const [vectorChunks, textChunks] = await Promise.all([
      performVectorRetrieval(questionEmbedding),
      retrieveChunksByFullText(question, 10)
    ]);

    console.log(`📊 Hybrid Stats: Vector=${vectorChunks.length}, Text=${textChunks.length}`);

    // Fuse results using Reciprocal Rank Fusion (RRF)
    const fusedChunks = reciprocalRankFusion(vectorChunks, textChunks);

    console.log(`✅ After RRF Fusion: ${fusedChunks.length} chunks`);

    return fusedChunks.slice(0, maxChunks);
  } catch (error) {
    console.error('❌ Error in multiStageRetrieval (Hybrid):', error);
    return [];
  }
}

/**
 * Internal Vector Retrieval Strategy (Original logic moved here)
 */
async function performVectorRetrieval(questionEmbedding) {
  const stages = [
    { topK: 5, threshold: 0.65, name: 'high_similarity' }, // Adjusted threshold slightly
    { topK: 8, threshold: 0.45, name: 'medium_similarity' }
  ];

  const allChunks = [];

  for (const stage of stages) {
    try {
      const chunks = await retrieveChunksWithThreshold(
        questionEmbedding,
        stage.topK,
        stage.threshold
      );
      chunks.forEach(chunk => {
        chunk.retrieval_stage = stage.name;
        chunk.retrieval_score = chunk.score;
        chunk.source_type = 'vector';
      });
      allChunks.push(...chunks);
    } catch (error) {
      console.error(`❌ Error in vector stage ${stage.name}:`, error);
    }
  }
  return removeDuplicateChunks(allChunks);
}

/**
 * 2. Semantic Clustering - FIXED
 * Nhóm các chunks theo chủ đề để tìm mối liên kết
 */
export async function semanticClustering(chunks, questionEmbedding) {
  try {
    if (chunks.length <= 3) return [chunks]; // Return as single cluster

    // Use existing embeddings from chunks instead of re-fetching
    const chunkEmbeddings = chunks.map(c => {
      if (Array.isArray(c.embedding)) return c.embedding;
      try {
        return typeof c.embedding === 'string' ? JSON.parse(c.embedding) : [];
      } catch {
        return [];
      }
    });

    // Tính similarity matrix - FIXED: Handle missing embeddings
    const similarityMatrix = [];
    for (let i = 0; i < chunks.length; i++) {
      similarityMatrix[i] = [];
      for (let j = 0; j < chunks.length; j++) {
        if (i === j) {
          similarityMatrix[i][j] = 1;
        } else {
          try {
            const similarity = cosineSimilarity(
              chunkEmbeddings[i],
              chunkEmbeddings[j]
            );
            similarityMatrix[i][j] = isNaN(similarity) ? 0 : similarity;
          } catch (error) {
            console.error(`❌ Error calculating similarity ${i}-${j}:`, error);
            similarityMatrix[i][j] = 0;
          }
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
  } catch (error) {
    console.error('❌ Error in semanticClustering:', error);
    return [chunks]; // Return all chunks as single cluster
  }
}

/**
 * 3. Multi-Hop Reasoning - FIXED
 * Tìm kiếm thông tin liên quan dựa trên chunks đã có
 */
export async function multiHopReasoning(initialChunks, questionEmbedding, question) {
  try {
    const reasoningChains = [];

    for (const chunk of initialChunks.slice(0, 3)) { // Limit to 3 to avoid timeout
      try {
        // Tìm chunks liên quan đến chunk hiện tại
        const relatedChunks = await findRelatedChunks(chunk, 3);

        // Tạo reasoning chain
        const chain = {
          source_chunk: chunk,
          related_chunks: relatedChunks,
          reasoning_score: calculateReasoningScore(chunk, relatedChunks, questionEmbedding)
        };

        reasoningChains.push(chain);
      } catch (error) {
        console.error(`❌ Error in reasoning for chunk ${chunk.id}:`, error);
        // Continue with other chunks
      }
    }

    // Sort theo reasoning score
    reasoningChains.sort((a, b) => b.reasoning_score - a.reasoning_score);

    return reasoningChains.slice(0, 3); // Top 3 reasoning chains
  } catch (error) {
    console.error('❌ Error in multiHopReasoning:', error);
    return [];
  }
}

/**
 * 4. Context Fusion - FIXED
 * Kết hợp thông minh các chunks thành context có cấu trúc
 */
export function fuseContext(chunks, reasoningChains, question) {
  try {
    // Tạo context có cấu trúc
    let context = '# Thông tin chính:\n\n';

    // Nhóm chunks theo chủ đề
    const topicGroups = groupChunksByTopic(chunks);

    for (const [topic, topicChunks] of Object.entries(topicGroups)) {
      context += `## ${topic}:\n`;

      topicChunks.forEach((chunk, index) => {
        context += `### ${chunk.title || `Chunk ${index + 1}`}\n`;
        context += `${chunk.content}\n\n`;
      });
    }

    // Thêm reasoning chains
    if (reasoningChains && reasoningChains.length > 0) {
      context += '# Mối liên kết thông tin:\n\n';

      reasoningChains.forEach((chain, index) => {
        context += `## Liên kết ${index + 1}:\n`;
        context += `**Nguồn chính:** ${chain.source_chunk.title || 'Unknown'}\n`;
        context += `**Nội dung:** ${chain.source_chunk.content}\n\n`;

        if (chain.related_chunks && chain.related_chunks.length > 0) {
          context += '**Thông tin liên quan:**\n';
          chain.related_chunks.forEach(related => {
            context += `- ${related.title || 'Unknown'}: ${related.content.substring(0, 200)}...\n`;
          });
          context += '\n';
        }
      });
    }

    return context;
  } catch (error) {
    console.error('❌ Error in fuseContext:', error);
    // Fallback to simple context
    return chunks.map(c => `**${c.title}**: ${c.content}`).join('\n\n');
  }
}

/**
 * 5. Adaptive Retrieval - FIXED
 * Điều chỉnh retrieval dựa trên độ phức tạp của câu hỏi
 */
export async function adaptiveRetrieval(question, questionEmbedding) {
  try {
    // Phân tích độ phức tạp của câu hỏi
    const complexity = analyzeQuestionComplexity(question);

    const retrievalParams = {
      maxChunks: 5,
      threshold: 0.5,
      useMultiHop: false,
      useSemanticClustering: false
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
  } catch (error) {
    console.error('❌ Error in adaptiveRetrieval:', error);
    // Return default params
    return {
      maxChunks: 5,
      threshold: 0.5,
      useMultiHop: false,
      useSemanticClustering: false
    };
  }
}

/**
 * 6. Context Re-ranking - FIXED (Implemented Phase 1: Cohere & Threshold)
 * Sắp xếp lại context dựa trên relevance thực sự
 */
export async function rerankContext(chunks, questionEmbedding, question) {
  try {
    // Check if Cohere API Key is available
    if (process.env.COHERE_API_KEY) {
      console.log('🚀 Using Cohere Re-ranking...');
      const reranked = await rerankWithCohere(chunks, question);

      // Filter by Threshold < 0.3 (OOK Handling)
      const validChunks = reranked.filter(c => c.final_score >= 0.3);

      if (validChunks.length === 0) {
        console.warn('⚠️ All chunks filtered out by Cohere threshold (Score < 0.3)');
        return [];
      }
      return validChunks;
    }

    // Fallback to Heuristic
    console.log('⚠️ No COHERE_API_KEY found, using heuristic re-ranking...');
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
        final_score: isNaN(finalScore) ? 0 : finalScore,
        relevance_score: isNaN(relevanceScore) ? 0 : relevanceScore,
        coherence_score: isNaN(coherenceScore) ? 0 : coherenceScore,
        completeness_score: isNaN(completenessScore) ? 0 : completenessScore
      };
    }).sort((a, b) => b.final_score - a.final_score);
  } catch (error) {
    console.error('❌ Error in rerankContext:', error);
    return chunks; // Return original chunks if error
  }
}

/**
 * Call Cohere Rerank API
 */
export async function rerankWithCohere(chunks, query) {
  try {
    const documents = chunks.map(c => `${c.title || ''}: ${c.content || ''}`);

    // Use multilingual model for best performance with Vietnamese
    const model = 'rerank-multilingual-v3.0';

    const response = await axios.post(
      'https://api.cohere.ai/v1/rerank',
      {
        model,
        query,
        documents,
        top_n: chunks.length
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
          'Content-Type': 'application/json',
          'X-Client-Name': 'English-Chatbot-Backend'
        },
        timeout: 10000
      }
    );

    const results = response.data.results;

    // Map scores back to chunks
    const rerankedChunks = results.map(result => {
      const originalChunk = chunks[result.index];
      return {
        ...originalChunk,
        final_score: result.relevance_score,
        relevance_score: result.relevance_score, // Sync for compatibility
        source: 'cohere-rerank'
      };
    });

    // Sort by new score
    return rerankedChunks.sort((a, b) => b.final_score - a.final_score);

  } catch (error) {
    console.error('❌ Cohere API Error:', error.response?.data || error.message);
    throw error; // Throw to trigger fallback
  }
}

// Helper functions - FIXED
async function retrieveChunksWithThreshold(embedding, topK, threshold) {
  try {
    const vectorStr = JSON.stringify(embedding);
    const [scored] = await pool.execute(`
      SELECT 
        id, 
        title, 
        content, 
        embedding::text as embedding,
        1 - (embedding <=> $1::vector) as score
      FROM knowledge_chunks 
      WHERE 1 - (embedding <=> $1::vector) > $2
      ORDER BY embedding <=> $1::vector ASC
      LIMIT $3
    `, [vectorStr, threshold, topK]);

    return scored.map(row => ({
      ...row,
      embedding: typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding
    }));
  } catch (error) {
    console.error('❌ Error in retrieveChunksWithThreshold:', error);
    return [];
  }
}

function removeDuplicateChunks(chunks) {
  try {
    const seen = new Set();
    return chunks.filter(chunk => {
      const key = `${chunk.id}_${chunk.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch (error) {
    console.error('❌ Error in removeDuplicateChunks:', error);
    return chunks;
  }
}

async function findRelatedChunks(sourceChunk, limit) {
  try {
    const sourceEmbeddingStr = JSON.stringify(sourceChunk.embedding);

    // Check if sourceEmbedding is valid
    if (!sourceChunk.embedding) return [];

    const [related] = await pool.execute(`
      SELECT 
        id, 
        title, 
        content, 
        embedding::text as embedding,
        1 - (embedding <=> $1::vector) as score
      FROM knowledge_chunks 
      WHERE id != $2 AND 1 - (embedding <=> $1::vector) > 0.4
      ORDER BY embedding <=> $1::vector ASC
      LIMIT $3
    `, [sourceEmbeddingStr, sourceChunk.id, limit]);

    return related;
  } catch (error) {
    console.error('❌ Error in findRelatedChunks:', error);
    return [];
  }
}

function calculateReasoningScore(sourceChunk, relatedChunks, questionEmbedding) {
  try {
    const baseScore = sourceChunk.score || 0;
    const relatedScore = relatedChunks.reduce((sum, chunk) => sum + (chunk.score || 0), 0);
    const avgRelatedScore = relatedChunks.length > 0 ? relatedScore / relatedChunks.length : 0;

    return baseScore * 0.6 + avgRelatedScore * 0.4;
  } catch (error) {
    console.error('❌ Error in calculateReasoningScore:', error);
    return 0;
  }
}

function groupChunksByTopic(chunks) {
  try {
    const topics = {};

    chunks.forEach(chunk => {
      const topic = extractTopic(chunk.title, chunk.content);
      if (!topics[topic]) {
        topics[topic] = [];
      }
      topics[topic].push(chunk);
    });

    return topics;
  } catch (error) {
    console.error('❌ Error in groupChunksByTopic:', error);
    return { 'Khác': chunks };
  }
}

function extractTopic(title, content) {
  try {
    const text = `${title || ''} ${content || ''}`.toLowerCase();

    if (text.includes('nlp') || text.includes('xử lý ngôn ngữ')) return 'NLP';
    if (text.includes('ai') || text.includes('trí tuệ nhân tạo')) return 'AI';
    if (text.includes('machine learning') || text.includes('học máy')) return 'Machine Learning';
    if (text.includes('chatbot') || text.includes('trợ lý')) return 'Chatbot';
    if (text.includes('vector') || text.includes('embedding')) return 'Vector Search';

    return 'Khác';
  } catch (error) {
    console.error('❌ Error in extractTopic:', error);
    return 'Khác';
  }
}

function analyzeQuestionComplexity(question) {
  try {
    const questionLower = (question || '').toLowerCase();

    return {
      isComplex: questionLower.includes('so sánh') ||
        questionLower.includes('khác biệt') ||
        questionLower.includes('mối quan hệ'),
      hasMultipleTopics: (questionLower.match(/và|với|kết hợp/g) || []).length > 1,
      requiresReasoning: questionLower.includes('tại sao') ||
        questionLower.includes('như thế nào') ||
        questionLower.includes('giải thích')
    };
  } catch (error) {
    console.error('❌ Error in analyzeQuestionComplexity:', error);
    return {
      isComplex: false,
      hasMultipleTopics: false,
      requiresReasoning: false
    };
  }
}

function calculateCoherenceScore(chunk, allChunks) {
  try {
    const otherChunks = allChunks.filter(c => c.id !== chunk.id);
    if (otherChunks.length === 0) return 0;

    let totalSimilarity = 0;
    let count = 0;

    otherChunks.forEach(otherChunk => {
      if (otherChunk.embedding && chunk.embedding) {
        const similarity = cosineSimilarity(chunk.embedding, otherChunk.embedding);
        if (!isNaN(similarity)) {
          totalSimilarity += similarity;
          count++;
        }
      }
    });

    return count > 0 ? totalSimilarity / count : 0;
  } catch (error) {
    console.error('❌ Error in calculateCoherenceScore:', error);
    return 0;
  }
}

function calculateCompletenessScore(chunk, question) {
  try {
    const questionWords = (question || '').toLowerCase().split(/\s+/);
    const chunkText = `${chunk.title || ''} ${chunk.content || ''}`.toLowerCase();

    const matchedWords = questionWords.filter(word =>
      chunkText.includes(word) && word.length > 2
    );

    return questionWords.length > 0 ? matchedWords.length / questionWords.length : 0;
  } catch (error) {
    console.error('❌ Error in calculateCompletenessScore:', error);
    return 0;
  }
}

/**
 * Perform Full-Text Search (BM25-like behavior via Postgres)
 */
async function retrieveChunksByFullText(query, limit = 10) {
  try {
    // Clean query for FTS (remove special chars)
    const cleanQuery = query.replace(/[^\w\s]/g, ' ').trim().split(/\s+/).join(' | ');
    if (!cleanQuery) return [];

    const [rows] = await pool.execute(`
      SELECT 
        id, 
        title, 
        content, 
        embedding::text as embedding,
        ts_rank(to_tsvector('english', title || ' ' || content), to_tsquery('english', $1)) as text_score
      FROM knowledge_chunks 
      WHERE to_tsvector('english', title || ' ' || content) @@ to_tsquery('english', $1)
      ORDER BY text_score DESC
      LIMIT $2
    `, [cleanQuery, limit]);

    return rows.map(r => ({
      ...r,
      embedding: typeof r.embedding === 'string' ? JSON.parse(r.embedding) : r.embedding,
      score: 0, // Placeholder, will be recalculated in RRF
      retrieval_stage: 'full_text_search',
      source_type: 'text'
    }));

  } catch (error) {
    console.warn('⚠️ Full-Text Search failed (likely syntax error or no match):', error.message);
    return [];
  }
}

/**
 * Reciprocal Rank Fusion (RRF)
 * Combines two ranked lists into one
 * Score = 1 / (k + rank)
 */
function reciprocalRankFusion(vectorResults, textResults, k = 60) {
  const fusedScores = new Map();
  const chunkMap = new Map();

  // Helper to process a list
  const processList = (list, weight = 1.0) => {
    list.forEach((chunk, index) => {
      const id = chunk.id;
      if (!chunkMap.has(id)) chunkMap.set(id, chunk);

      const currentScore = fusedScores.get(id) || 0;
      // RRF Formula: 1 / (k + rank)
      const rrfScore = (1 / (k + index + 1)) * weight;

      fusedScores.set(id, currentScore + rrfScore);
    });
  };

  // Apply RRF
  processList(vectorResults, 1.0); // Vector weight
  processList(textResults, 1.0);   // Text weight

  // Convert back to array
  const fusedResults = [];
  for (const [id, score] of fusedScores.entries()) {
    const chunk = chunkMap.get(id);
    fusedResults.push({
      ...chunk,
      score, // Update score to RRF score
      debug_info: `RRF Score: ${score.toFixed(4)}`
    });
  }

  // Sort by new RRF score
  return fusedResults.sort((a, b) => b.score - a.score);
}

export default {
  multiStageRetrieval,
  semanticClustering,
  multiHopReasoning,
  fuseContext,
  adaptiveRetrieval,
  rerankContext,
  rerankWithCohere
};
