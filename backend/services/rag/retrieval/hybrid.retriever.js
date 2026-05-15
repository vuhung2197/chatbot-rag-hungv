import { RAG_CONFIG } from '../config.js';
import { performVectorRetrieval } from './vector.retriever.js';
import { retrieveChunksByFullText } from './fulltext.retriever.js';

function reciprocalRankFusion(vectorResults, textResults) {
    const { k, vectorWeight, textWeight } = RAG_CONFIG.rrf;
    const fusedScores = new Map();
    const chunkMap = new Map();

    const processList = (list, weight) => {
        list.forEach((chunk, index) => {
            const id = chunk.id;
            if (!chunkMap.has(id)) chunkMap.set(id, chunk);
            const current = fusedScores.get(id) || 0;
            fusedScores.set(id, current + (1 / (k + index + 1)) * weight);
        });
    };

    processList(vectorResults, vectorWeight);
    processList(textResults, textWeight);

    const fusedResults = [];
    for (const [id, score] of fusedScores.entries()) {
        fusedResults.push({ ...chunkMap.get(id), score, debug_info: `RRF Score: ${score.toFixed(4)}` });
    }
    return fusedResults.sort((a, b) => b.score - a.score);
}

export async function multiStageRetrieval(questionEmbedding, question, maxChunks = 8) {
    try {
        console.log('🔄 Starting Hybrid Search...');
        const [vectorChunks, textChunks] = await Promise.all([
            performVectorRetrieval(questionEmbedding),
            retrieveChunksByFullText(question)
        ]);
        console.log(`📊 Hybrid Stats: Vector=${vectorChunks.length}, Text=${textChunks.length}`);

        const fusedChunks = reciprocalRankFusion(vectorChunks, textChunks);
        console.log(`✅ After RRF Fusion: ${fusedChunks.length} chunks`);
        return fusedChunks.slice(0, maxChunks);
    } catch (error) {
        console.error('❌ Error in multiStageRetrieval:', error);
        return [];
    }
}
