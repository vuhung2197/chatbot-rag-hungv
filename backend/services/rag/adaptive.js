import { RAG_CONFIG } from './config.js';

function analyzeQuestionComplexity(question) {
    const q = (question || '').toLowerCase();
    return {
        isComplex: q.includes('so sánh') || q.includes('khác biệt') || q.includes('mối quan hệ'),
        hasMultipleTopics: (q.match(/và|với|kết hợp/g) || []).length > 1,
        requiresReasoning: q.includes('tại sao') || q.includes('như thế nào') || q.includes('giải thích')
    };
}

export async function adaptiveRetrieval(question, questionEmbedding) {
    try {
        const complexity = analyzeQuestionComplexity(question);
        const params = { ...RAG_CONFIG.adaptive.simple };

        if (complexity.isComplex) {
            Object.assign(params, RAG_CONFIG.adaptive.complex);
        }
        if (complexity.hasMultipleTopics) {
            params.maxChunks = RAG_CONFIG.adaptive.multiTopic.maxChunks;
            params.useSemanticClustering = true;
        }
        if (complexity.requiresReasoning) {
            params.useMultiHop = true;
            params.useSemanticClustering = true;
        }

        return params;
    } catch (error) {
        console.error('❌ Error in adaptiveRetrieval:', error);
        return { ...RAG_CONFIG.adaptive.simple };
    }
}
