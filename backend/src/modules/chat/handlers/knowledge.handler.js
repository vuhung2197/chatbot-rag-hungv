import { getEmbedding } from '#services/embeddingVector.js';
import { callLLM } from '#services/llmService.js';
import { performWebSearch } from '#services/webSearch.service.js';
import {
    multiStageRetrieval,
    semanticClustering,
    multiHopReasoning,
    fuseContext,
    adaptiveRetrieval,
    rerankContext
} from '#services/advancedRAGFixed.js';
import { buildWebSearchPrompt, toAdvancedMarkdown } from './chat.helpers.js';

/**
 * Handles KNOWLEDGE intent — full RAG pipeline with optional web fallback.
 * @param {{ message, processingMessage, history, modelConfig, intent, reasoning, onStatus? }} opts
 * @returns {{ reply, chunks_used, source_type, web_sources, reasoning_steps, _meta }}
 */
export async function handleKnowledge({ message, processingMessage, history, modelConfig, intent, reasoning, onStatus }) {
    onStatus?.('🧠 Đang tra cứu dữ liệu nội bộ...');
    const t0 = Date.now();

    const questionEmbedding = await getEmbedding(processingMessage);
    const retrievalParams = await adaptiveRetrieval(processingMessage, questionEmbedding);
    const rawChunks = await multiStageRetrieval(questionEmbedding, processingMessage, retrievalParams.maxChunks);

    let finalChunks = rawChunks;
    try {
        finalChunks = await rerankContext(rawChunks, questionEmbedding, processingMessage);
    } catch (error) {
        console.error('❌ Re-ranking Error:', error);
    }

    if (finalChunks.length === 0) {
        return _handleEmptyChunksFallback({ message, processingMessage, history, modelConfig, reasoning, t0, onStatus });
    }

    onStatus?.('💡 Đang suy luận...');
    let reasoningChains = [];
    if (retrievalParams.useMultiHop) {
        try {
            const results = await Promise.all([
                semanticClustering(finalChunks, questionEmbedding),
                multiHopReasoning(finalChunks.slice(0, 5), questionEmbedding, processingMessage)
            ]);
            reasoningChains = results[1];
        } catch (e) {
            console.warn('Advanced synthesis skipped:', e);
        }
    }

    const fusedContext = fuseContext(finalChunks, reasoningChains, processingMessage);
    const systemPrompt = `Bạn là một trợ lý AI chuyên nghiệp. Hãy trả lời dựa trên thông tin được cung cấp.\nNếu không có trong ngữ cảnh, hãy nói "Tôi không biết".\nTrích dẫn nguồn và trình bày Markdown.\n\n---\n${fusedContext}\n---`;

    let reply = '';
    try {
        const replyRaw = await callLLM(modelConfig, [
            { role: 'system', content: systemPrompt },
            ...history.slice(-6),
            { role: 'user', content: message }
        ], 0.3, 1000);
        reply = toAdvancedMarkdown(replyRaw);
    } catch (error) {
        console.error('❌ LLM Generation Error:', error);
        reply = 'Xin lỗi, đã xảy ra lỗi khi tạo câu trả lời.';
    }

    const processTime = Date.now() - t0;
    const chunksForClient = finalChunks.map(c => ({
        id: c.id, title: c.title, content: c.content,
        score: c.final_score || c.score, source: c.source_type || 'unknown'
    }));

    return {
        reply,
        chunks_used: chunksForClient,
        source_type: 'knowledge',
        web_sources: [],
        reasoning_steps: [
            `Intent: ${intent}`,
            `Retrieved ${rawChunks.length} chunks (Hybrid Search)`,
            `Selected ${finalChunks.length} chunks after Re-ranking`,
            `Processing time: ${processTime}ms`
        ],
        _meta: { processing_time: processTime, intent, total_chunks: finalChunks.length, tokens: fusedContext.length }
    };
}

async function _handleEmptyChunksFallback({ message, processingMessage, history, modelConfig, reasoning, t0, onStatus }) {
    onStatus?.('📭 Không tìm thấy trong tài liệu, đang thử tìm trên web...');

    try {
        const { context: searchContext, sources: webSources } = await performWebSearch(processingMessage);
        if (searchContext && !searchContext.includes('chưa được cấu hình') && !searchContext.includes('gặp lỗi')) {
            onStatus?.('📝 Đang tổng hợp từ kết quả web...');
            const systemPrompt = buildWebSearchPrompt(true);
            const replyRaw = await callLLM(modelConfig, [
                { role: 'system', content: systemPrompt },
                ...history.slice(-4),
                { role: 'user', content: `# Câu hỏi: ${message}\n\n${searchContext}` }
            ], 0.4, 800);

            const reply = toAdvancedMarkdown(replyRaw);
            const processTime = Date.now() - t0;

            return {
                reply,
                chunks_used: [],
                source_type: 'kb_fallback_web',
                web_sources: webSources,
                reasoning_steps: [
                    `Intent: KNOWLEDGE (${reasoning})`,
                    'Retrieval returned 0 relevant chunks from KB',
                    'Fallback: Performed Web Search via Tavily AI',
                    `Synthesized from ${webSources.length} web results`,
                    `Processing time: ${processTime}ms`
                ],
                _meta: { processing_time: processTime, intent: 'KNOWLEDGE_FALLBACK_WEB', source: 'kb_fallback_web', tokens: searchContext.length }
            };
        }
    } catch (fallbackError) {
        console.warn('⚠️ Web Search fallback failed:', fallbackError.message);
    }

    return {
        reply: 'Tôi chưa có đủ thông tin để trả lời câu hỏi này chính xác.',
        chunks_used: [],
        source_type: 'no_result',
        web_sources: [],
        reasoning_steps: ['Retrieval returned 0 relevant chunks', 'Web Search fallback also failed'],
        _meta: {}
    };
}
