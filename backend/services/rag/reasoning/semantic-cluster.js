import { cosineSimilarity } from '../../embeddingVector.js';
import { RAG_CONFIG } from '../config.js';

function extractChunkEmbeddings(chunks) {
    return chunks.map(c => {
        if (Array.isArray(c.embedding)) return c.embedding;
        try { return typeof c.embedding === 'string' ? JSON.parse(c.embedding) : []; }
        catch { return []; }
    });
}

function buildSimilarityMatrix(chunks, embeddings) {
    return chunks.map((_, i) =>
        chunks.map((__, j) => {
            if (i === j) return 1;
            try {
                const sim = cosineSimilarity(embeddings[i], embeddings[j]);
                return isNaN(sim) ? 0 : sim;
            } catch { return 0; }
        })
    );
}

function groupClustersBySimilarity(chunks, matrix, threshold) {
    const clusters = [];
    const visited = new Set();
    for (let i = 0; i < chunks.length; i++) {
        if (visited.has(i)) continue;
        const cluster = [chunks[i]];
        visited.add(i);
        for (let j = i + 1; j < chunks.length; j++) {
            if (!visited.has(j) && matrix[i][j] > threshold) {
                cluster.push(chunks[j]);
                visited.add(j);
            }
        }
        clusters.push(cluster);
    }
    return clusters;
}

export async function semanticClustering(chunks, questionEmbedding) {
    try {
        if (chunks.length <= 3) return [chunks];
        const embeddings = extractChunkEmbeddings(chunks);
        const matrix = buildSimilarityMatrix(chunks, embeddings);
        return groupClustersBySimilarity(chunks, matrix, RAG_CONFIG.clustering.similarityThreshold);
    } catch (error) {
        console.error('❌ Error in semanticClustering:', error);
        return [chunks];
    }
}
