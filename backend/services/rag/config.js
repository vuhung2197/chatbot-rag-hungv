export const RAG_CONFIG = {
    vector: {
        stages: [
            { topK: 5, threshold: 0.65, name: 'high_similarity' },
            { topK: 8, threshold: 0.45, name: 'medium_similarity' }
        ]
    },
    fullText: {
        defaultLimit: 10
    },
    rrf: {
        k: 60,
        vectorWeight: 1.0,
        textWeight: 1.0
    },
    reranking: {
        cohereModel: 'rerank-multilingual-v3.0',
        cohereTimeout: 10000,
        minScore: 0.3,
        heuristicWeights: { relevance: 0.4, coherence: 0.3, completeness: 0.3 }
    },
    clustering: {
        similarityThreshold: 0.6
    },
    multiHop: {
        maxSourceChunks: 3,
        relatedChunksPerSource: 3,
        relatedMinSimilarity: 0.4
    },
    adaptive: {
        simple: { maxChunks: 5, threshold: 0.5, useMultiHop: false, useSemanticClustering: false },
        complex: { maxChunks: 10, threshold: 0.3, useMultiHop: true, useSemanticClustering: false },
        multiTopic: { maxChunks: 15, useSemanticClustering: true },
    }
};
