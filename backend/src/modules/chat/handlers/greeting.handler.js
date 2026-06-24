import { generateReply } from './chat.helpers.js';

/**
 * Handles GREETING intent — simple LLM call, no RAG needed.
 * @param {{ message, history, modelConfig, onStatus?, onToken? }} opts
 * @returns {{ reply, chunks_used, reasoning_steps }}
 */
export async function handleGreeting({ message, history, modelConfig, reasoning, onStatus, onToken }) {
    onStatus?.('👋 Đang soạn câu trả lời...');
    const systemPrompt = 'Bạn là trợ lý AI thân thiện. Hãy trả lời một cách tự nhiên, lịch sự và ngắn gọn.';
    const messages = [{ role: 'system', content: systemPrompt }, ...history.slice(-4), { role: 'user', content: message }];
    // 800 token: model reasoning cần chỗ "suy nghĩ" trước khi sinh câu trả lời, tránh content rỗng.
    const reply = await generateReply(modelConfig, messages, 0.7, 800, onToken);
    return {
        reply,
        chunks_used: [],
        reasoning_steps: [`Intent: GREETING (${reasoning})`, 'Action: Direct Chat (No RAG)']
    };
}
