import { callLLM } from '#services/llmService.js';
import { performWebSearch } from '#services/webSearch.service.js';
import { buildWebSearchPrompt, toAdvancedMarkdown } from './chat.helpers.js';

/**
 * Handles LIVE_SEARCH intent — web search via Tavily, then LLM synthesis.
 * @param {{ message, processingMessage, history, modelConfig, reasoning, onStatus? }} opts
 * @returns {{ reply, chunks_used, source_type, web_sources, reasoning_steps }}
 */
export async function handleLiveSearch({ message, processingMessage, history, modelConfig, reasoning, onStatus }) {
    onStatus?.('🌍 Đang tìm kiếm trên internet...');
    const t0 = Date.now();

    const { context: searchContext, sources: webSources } = await performWebSearch(processingMessage);

    onStatus?.('📝 Đang tổng hợp thông tin...');
    const systemPrompt = buildWebSearchPrompt(false);
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
        source_type: 'web_search',
        web_sources: webSources,
        reasoning_steps: [
            `Intent: LIVE_SEARCH (${reasoning})`,
            'Performed Web Search via Tavily AI',
            `Synthesized answer from ${webSources.length} web results`,
            `Processing time: ${processTime}ms`
        ],
        _meta: { processing_time: processTime, intent: 'LIVE_SEARCH', source: 'web_search', tokens: searchContext.length }
    };
}
