import { getEmbedding } from '#services/embeddingVector.js';
import { performWebSearch } from '#services/webSearch.service.js';
import {
    multiStageRetrieval,
    semanticClustering,
    multiHopReasoning,
    fuseContext,
    adaptiveRetrieval,
    rerankContext
} from '#services/advancedRAGFixed.js';
import { buildWebSearchPrompt, buildModelKnowledgePrompt, toAdvancedMarkdown, generateReply } from './chat.helpers.js';
import chatRepository from '../repositories/chat.repository.js';

/**
 * Handles KB_CATALOG intent — câu hỏi META: "bạn đã học gì", "có tài liệu/chủ đề nào".
 * Không dùng RAG (retrieval theo nội dung ra điểm thấp), thay vào đó liệt kê danh mục title trong KB.
 * @returns {{ reply, chunks_used, source_type, web_sources, reasoning_steps, _meta }}
 */
export async function handleCatalog({ message, history = [], modelConfig, reasoning, onStatus, onToken }) {
    const t0 = Date.now();
    onStatus?.('📚 Đang tổng hợp danh mục kiến thức...');

    let titles = [];
    try {
        titles = await chatRepository.getKnowledgeTitles();
    } catch (error) {
        console.error('❌ Catalog query error:', error);
    }

    if (!titles.length) {
        return {
            reply: 'Hiện tại kho kiến thức nội bộ chưa có tài liệu nào.',
            chunks_used: [], source_type: 'kb_catalog', web_sources: [],
            reasoning_steps: [`Intent: KB_CATALOG (${reasoning})`, 'Knowledge base trống'],
            _meta: { processing_time: Date.now() - t0, intent: 'KB_CATALOG', total_chunks: 0 }
        };
    }

    const catalogText = titles.map((t, i) => `${i + 1}. ${t.title} (${t.chunk_count} đoạn)`).join('\n');
    const systemPrompt = `Bạn là một trợ lý AI. Người dùng đang hỏi bạn đã được học / nắm những tài liệu, chủ đề kiến thức nào.
Dưới đây là DANH SÁCH ĐẦY ĐỦ các tài liệu hiện có trong kho kiến thức nội bộ.
Hãy trả lời ngắn gọn, thân thiện bằng tiếng Việt, liệt kê đúng các tài liệu này. TUYỆT ĐỐI KHÔNG bịa thêm tài liệu/chủ đề nào ngoài danh sách.
\n---\n${catalogText}\n---`;

    let reply = `Tôi đã được học các tài liệu sau:\n\n${catalogText}`;
    try {
        const replyRaw = await generateReply(modelConfig, [
            { role: 'system', content: systemPrompt },
            ...history.slice(-4),
            { role: 'user', content: message }
        ], 0.3, 800, onToken);
        reply = toAdvancedMarkdown(replyRaw) || reply;
    } catch (error) {
        console.error('❌ Catalog generation error:', error);
    }

    return {
        reply,
        chunks_used: [],
        source_type: 'kb_catalog',
        web_sources: [],
        reasoning_steps: [`Intent: KB_CATALOG (${reasoning})`, `Tìm thấy ${titles.length} tài liệu trong KB`],
        _meta: { processing_time: Date.now() - t0, intent: 'KB_CATALOG', total_chunks: 0 }
    };
}

/**
 * Handles KNOWLEDGE intent — full RAG pipeline with optional web fallback.
 * @param {{ message, processingMessage, history, modelConfig, intent, reasoning, onStatus?, onToken? }} opts
 * @returns {{ reply, chunks_used, source_type, web_sources, reasoning_steps, _meta }}
 */
export async function handleKnowledge({ message, processingMessage, history, modelConfig, intent, reasoning, onStatus, onToken, webSearchEnabled = true, debug = false }) {
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
        return _handleEmptyChunksFallback({ message, processingMessage, history, modelConfig, reasoning, t0, onStatus, onToken, webSearchEnabled, debug });
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
    const systemPrompt = `Bạn là một trợ lý AI chuyên nghiệp. Hãy trả lời dựa trên thông tin được cung cấp.\nNếu ngữ cảnh có thông tin liên quan (kể cả chỉ một phần), hãy tổng hợp và trả lời dựa trên đó.\nChỉ khi ngữ cảnh HOÀN TOÀN không liên quan đến câu hỏi thì mới nói "Tôi không biết".\nTrích dẫn nguồn và trình bày Markdown.\n\n---\n${fusedContext}\n---`;

    let reply = '';
    try {
        const replyRaw = await generateReply(modelConfig, [
            { role: 'system', content: systemPrompt },
            ...history.slice(-6),
            { role: 'user', content: message }
        ], 0.3, 2000, onToken);
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
        _meta: { processing_time: processTime, intent, total_chunks: finalChunks.length, tokens: fusedContext.length, ...(debug && { context: fusedContext }) }
    };
}

async function _handleEmptyChunksFallback({ message, processingMessage, history, modelConfig, reasoning, t0, onStatus, onToken, webSearchEnabled = true, debug = false }) {
    // Tắt web search: trả lời bằng kiến thức sẵn có của model (không RAG, không web).
    if (!webSearchEnabled) {
        onStatus?.('🧠 Không tìm thấy trong tài liệu, đang trả lời bằng kiến thức của model...');
        let reply = 'Tôi chưa có đủ thông tin để trả lời câu hỏi này chính xác.';
        try {
            const replyRaw = await generateReply(modelConfig, [
                { role: 'system', content: buildModelKnowledgePrompt() },
                ...history.slice(-6),
                { role: 'user', content: message }
            ], 0.5, 2000, onToken);
            reply = toAdvancedMarkdown(replyRaw) || reply;
        } catch (error) {
            console.error('❌ Model knowledge fallback error:', error);
        }
        const processTime = Date.now() - t0;
        return {
            reply,
            chunks_used: [],
            source_type: 'model_knowledge',
            web_sources: [],
            reasoning_steps: [
                `Intent: KNOWLEDGE (${reasoning})`,
                'Retrieval returned 0 relevant chunks from KB',
                'Web search disabled -> answered from model knowledge'
            ],
            _meta: { processing_time: processTime, intent: 'KNOWLEDGE_MODEL', source: 'model_knowledge', ...(debug && { context: '(model knowledge — không có context ngoài)' }) }
        };
    }

    onStatus?.('📭 Không tìm thấy trong tài liệu, đang thử tìm trên web...');

    try {
        const { context: searchContext, sources: webSources } = await performWebSearch(processingMessage);
        if (searchContext && !searchContext.includes('chưa được cấu hình') && !searchContext.includes('gặp lỗi')) {
            onStatus?.('📝 Đang tổng hợp từ kết quả web...');
            const systemPrompt = buildWebSearchPrompt(true);
            const replyRaw = await generateReply(modelConfig, [
                { role: 'system', content: systemPrompt },
                ...history.slice(-4),
                { role: 'user', content: `# Câu hỏi: ${message}\n\n${searchContext}` }
            ], 0.4, 1500, onToken);

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
                _meta: { processing_time: processTime, intent: 'KNOWLEDGE_FALLBACK_WEB', source: 'kb_fallback_web', tokens: searchContext.length, ...(debug && { context: searchContext }) }
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
