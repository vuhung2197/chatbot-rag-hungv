import { callLLM } from '#services/llmService.js';

/**
 * Handles GREETING intent — simple LLM call, no RAG needed.
 * @param {{ message, history, modelConfig, onStatus? }} opts
 * @returns {{ reply, chunks_used, reasoning_steps }}
 */
export async function handleGreeting({ message, history, modelConfig, reasoning, onStatus }) {
    onStatus?.('👋 Đang soạn câu trả lời...');
    const systemPrompt = 'Bạn là trợ lý AI thân thiện. Hãy trả lời một cách tự nhiên, lịch sự và ngắn gọn.';
    const messages = [{ role: 'system', content: systemPrompt }, ...history.slice(-4), { role: 'user', content: message }];
    const reply = await callLLM(modelConfig, messages, 0.7, 200);
    return {
        reply,
        chunks_used: [],
        reasoning_steps: [`Intent: GREETING (${reasoning})`, 'Action: Direct Chat (No RAG)']
    };
}
