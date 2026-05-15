import { cosineSimilarity } from '../../embeddingVector.js';
import { RAG_CONFIG } from '../config.js';

function calculateCoherenceScore(chunk, allChunks) {
    try {
        const others = allChunks.filter(c => c.id !== chunk.id);
        if (others.length === 0) return 0;
        let total = 0, count = 0;
        for (const other of others) {
            if (other.embedding && chunk.embedding) {
                const sim = cosineSimilarity(chunk.embedding, other.embedding);
                if (!isNaN(sim)) { total += sim; count++; }
            }
        }
        return count > 0 ? total / count : 0;
    } catch {
        return 0;
    }
}

function calculateCompletenessScore(chunk, question) {
    try {
        const words = (question || '').toLowerCase().split(/\s+/);
        const text = `${chunk.title || ''} ${chunk.content || ''}`.toLowerCase();
        const matched = words.filter(w => text.includes(w) && w.length > 2);
        return words.length > 0 ? matched.length / words.length : 0;
    } catch {
        return 0;
    }
}

export function heuristicReRank(chunks, question) {
    const { relevance, coherence, completeness } = RAG_CONFIG.reranking.heuristicWeights;
    return chunks.map(chunk => {
        const relevanceScore = chunk.score || 0;
        const coherenceScore = calculateCoherenceScore(chunk, chunks);
        const completenessScore = calculateCompletenessScore(chunk, question);
        const finalScore = relevanceScore * relevance + coherenceScore * coherence + completenessScore * completeness;
        return {
            ...chunk,
            final_score: isNaN(finalScore) ? 0 : finalScore,
            relevance_score: isNaN(relevanceScore) ? 0 : relevanceScore,
            coherence_score: isNaN(coherenceScore) ? 0 : coherenceScore,
            completeness_score: isNaN(completenessScore) ? 0 : completenessScore
        };
    }).sort((a, b) => b.final_score - a.final_score);
}
