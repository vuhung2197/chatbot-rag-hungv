import axios from 'axios';
import { RAG_CONFIG } from '../config.js';

export async function rerankWithCohere(chunks, query) {
    const documents = chunks.map(c => `${c.title || ''}: ${c.content || ''}`);
    const response = await axios.post(
        'https://api.cohere.ai/v1/rerank',
        { model: RAG_CONFIG.reranking.cohereModel, query, documents, top_n: chunks.length },
        {
            headers: {
                'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
                'Content-Type': 'application/json',
                'X-Client-Name': 'English-Chatbot-Backend'
            },
            timeout: RAG_CONFIG.reranking.cohereTimeout
        }
    );

    return response.data.results
        .map(result => ({
            ...chunks[result.index],
            final_score: result.relevance_score,
            relevance_score: result.relevance_score,
            source: 'cohere-rerank'
        }))
        .sort((a, b) => b.final_score - a.final_score);
}
