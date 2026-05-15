import pool from '#db';
import { RAG_CONFIG } from '../config.js';

async function retrieveChunksWithThreshold(embedding, topK, threshold) {
    try {
        const vectorStr = JSON.stringify(embedding);
        const [scored] = await pool.execute(`
            SELECT id, title, content, embedding::text as embedding,
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

export function removeDuplicateChunks(chunks) {
    const seen = new Set();
    return chunks.filter(chunk => {
        const key = `${chunk.id}_${chunk.title}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export async function performVectorRetrieval(questionEmbedding) {
    const allChunks = [];
    for (const stage of RAG_CONFIG.vector.stages) {
        try {
            const chunks = await retrieveChunksWithThreshold(questionEmbedding, stage.topK, stage.threshold);
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
