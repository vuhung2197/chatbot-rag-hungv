import { RAG_CONFIG } from '../config.js';
import { rerankWithCohere } from './cohere.reranker.js';
import { heuristicReRank } from './heuristic.reranker.js';

/**
 * Picks Cohere if API key is present, falls back to heuristic.
 */
export async function rerankContext(chunks, questionEmbedding, question) {
    try {
        if (process.env.COHERE_API_KEY) {
            console.log('🚀 Using Cohere Re-ranking...');
            const reranked = await rerankWithCohere(chunks, question);
            const valid = reranked.filter(c => c.final_score >= RAG_CONFIG.reranking.minScore);
            if (valid.length === 0) {
                console.warn('⚠️ All chunks filtered out by Cohere threshold');
                return [];
            }
            return valid;
        }
        console.log('⚠️ No COHERE_API_KEY, using heuristic re-ranking...');
        return heuristicReRank(chunks, question);
    } catch (error) {
        console.error('❌ Error in rerankContext:', error);
        return chunks;
    }
}
