import { performWebSearch } from '#services/webSearch.service.js';
import { buildWebSearchPrompt, buildModelKnowledgePrompt, toAdvancedMarkdown, generateReply } from './chat.helpers.js';

/**
 * Handles LIVE_SEARCH intent — web search via Tavily, then LLM synthesis.
 * @param {{ message, processingMessage, history, modelConfig, reasoning, onStatus?, onToken?, webSearchEnabled? }} opts
 * @returns {{ reply, chunks_used, source_type, web_sources, reasoning_steps }}
 */
export async function handleLiveSearch({ message, processingMessage, history, modelConfig, reasoning, onStatus, onToken, webSearchEnabled = true, debug = false }) {
    const t0 = Date.now();

    // Tắt web search: LIVE_SEARCH cần dữ liệu thời gian thực, nhưng không được phép tra web
    // -> trả lời bằng kiến thức model kèm cảnh báo có thể không cập nhật.
    if (!webSearchEnabled) {
        onStatus?.('🧠 Web search đang tắt, trả lời bằng kiến thức của model...');
        let reply = 'Tôi chưa có đủ thông tin để trả lời câu hỏi này chính xác.';
        try {
            const replyRaw = await generateReply(modelConfig, [
                { role: 'system', content: buildModelKnowledgePrompt() },
                ...history.slice(-6),
                { role: 'user', content: message }
            ], 0.5, 2000, onToken);
            reply = toAdvancedMarkdown(replyRaw) || reply;
        } catch (error) {
            console.error('❌ Model knowledge fallback error (live-search):', error);
        }
        const processTime = Date.now() - t0;
        return {
            reply,
            chunks_used: [],
            source_type: 'model_knowledge',
            web_sources: [],
            reasoning_steps: [
                `Intent: LIVE_SEARCH (${reasoning})`,
                'Web search disabled -> answered from model knowledge (có thể không cập nhật)'
            ],
            _meta: { processing_time: processTime, intent: 'LIVE_SEARCH_MODEL', source: 'model_knowledge', ...(debug && { context: '(model knowledge — không có context ngoài)' }) }
        };
    }

    onStatus?.('🌍 Đang tìm kiếm trên internet...');

    const { context: searchContext, sources: webSources } = await performWebSearch(processingMessage);

    onStatus?.('📝 Đang tổng hợp thông tin...');
    const systemPrompt = buildWebSearchPrompt(false);
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
        source_type: 'web_search',
        web_sources: webSources,
        reasoning_steps: [
            `Intent: LIVE_SEARCH (${reasoning})`,
            'Performed Web Search via Tavily AI',
            `Synthesized answer from ${webSources.length} web results`,
            `Processing time: ${processTime}ms`
        ],
        _meta: { processing_time: processTime, intent: 'LIVE_SEARCH', source: 'web_search', tokens: searchContext.length, ...(debug && { context: searchContext }) }
    };
}
