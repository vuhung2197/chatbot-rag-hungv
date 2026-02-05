import pool from '../db.js';
import { getEmbedding } from './embeddingVector.js';
import { cosineSimilarity } from './embeddingVector.js';

/**
 * Advanced RAG System với Multi-Chunk Reasoning - FIXED VERSION
 * Giải quyết vấn đề kết hợp nhiều chunks cho câu hỏi phức tạp
 */

/**
 * 1. Multi-Stage Retrieval - FIXED
 * Lấy chunks theo nhiều giai đoạn để đảm bảo coverage tốt
 */
export async function multiStageRetrieval(questionEmbedding, question, maxChunks = 8) {
  try {
    const stages = [
      { topK: 5, threshold: 0.7, name: 'high_similarity' },
      { topK: 8, threshold: 0.5, name: 'medium_similarity' },
      { topK: 12, threshold: 0.3, name: 'low_similarity' }
    ];

    let allChunks = [];

    for (const stage of stages) {
      try {
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

        console.log(`🔹 Stage ${stage.name}: Found ${chunks.length} chunks`);
        allChunks.push(...chunks);
      } catch (error) {
        console.error(`❌ Error in stage ${stage.name}:`, error);
        // Continue with other stages
      }
    }

    // Remove duplicates và sort
    const uniqueChunks = removeDuplicateChunks(allChunks);
    return uniqueChunks.slice(0, maxChunks);
  } catch (error) {
    console.error('❌ Error in multiStageRetrieval:', error);
    return [];
  }
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
    let context = `# Thông tin chính:\n\n`;

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
      context += `# Mối liên kết thông tin:\n\n`;

      reasoningChains.forEach((chain, index) => {
        context += `## Liên kết ${index + 1}:\n`;
        context += `**Nguồn chính:** ${chain.source_chunk.title || 'Unknown'}\n`;
        context += `**Nội dung:** ${chain.source_chunk.content}\n\n`;

        if (chain.related_chunks && chain.related_chunks.length > 0) {
          context += `**Thông tin liên quan:**\n`;
          chain.related_chunks.forEach(related => {
            context += `- ${related.title || 'Unknown'}: ${related.content.substring(0, 200)}...\n`;
          });
          context += `\n`;
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

    let retrievalParams = {
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
 * 6. Context Re-ranking - FIXED
 * Sắp xếp lại context dựa trên relevance và coherence
 */
export function rerankContext(chunks, questionEmbedding, question) {
  try {
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

    return scored;
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

export default {
  multiStageRetrieval,
  semanticClustering,
  multiHopReasoning,
  fuseContext,
  adaptiveRetrieval,
  rerankContext
};
