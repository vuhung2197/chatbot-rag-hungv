import pool from '#db';
import { RAG_CONFIG } from '../config.js';

async function findRelatedChunks(sourceChunk, limit) {
    try {
        if (!sourceChunk.embedding) return [];
        const vectorStr = JSON.stringify(sourceChunk.embedding);
        const minSim = RAG_CONFIG.multiHop.relatedMinSimilarity;
        const [related] = await pool.execute(`
            SELECT id, title, content, embedding::text as embedding,
                   1 - (embedding <=> $1::vector) as score
            FROM knowledge_chunks
            WHERE id != $2 AND 1 - (embedding <=> $1::vector) > $3
            ORDER BY embedding <=> $1::vector ASC
            LIMIT $4
        `, [vectorStr, sourceChunk.id, minSim, limit]);
        return related;
    } catch (error) {
        console.error('❌ Error in findRelatedChunks:', error);
        return [];
    }
}

function calculateReasoningScore(sourceChunk, relatedChunks) {
    const baseScore = sourceChunk.score || 0;
    const avg = relatedChunks.length > 0
        ? relatedChunks.reduce((s, c) => s + (c.score || 0), 0) / relatedChunks.length
        : 0;
    return baseScore * 0.6 + avg * 0.4;
}

export async function multiHopReasoning(initialChunks, questionEmbedding, question) {
    try {
        const { maxSourceChunks, relatedChunksPerSource } = RAG_CONFIG.multiHop;
        const chains = [];
        for (const chunk of initialChunks.slice(0, maxSourceChunks)) {
            try {
                const relatedChunks = await findRelatedChunks(chunk, relatedChunksPerSource);
                chains.push({
                    source_chunk: chunk,
                    related_chunks: relatedChunks,
                    reasoning_score: calculateReasoningScore(chunk, relatedChunks)
                });
            } catch (error) {
                console.error(`❌ Error in reasoning for chunk ${chunk.id}:`, error);
            }
        }
        return chains.sort((a, b) => b.reasoning_score - a.reasoning_score).slice(0, 3);
    } catch (error) {
        console.error('❌ Error in multiHopReasoning:', error);
        return [];
    }
}
