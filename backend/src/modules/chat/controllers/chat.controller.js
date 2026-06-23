import { StatusCodes } from 'http-status-codes';
import '#bootstrap/env.js';
import chatService from '../services/chat.service.js';
import { aiServiceEnabled, aiTools } from '#services/aiServiceClient.js';

// ==================== CONTROLLER FUNCTIONS ====================

/**
 * Handle new Chat API
 */
export async function chat(req, res) {
    const { message, model, conversationId, webSearch, webOnly, debug, forceAgent, mcpServer, mcpServers} = req.body;
    const userId = req.user?.id;
    // JWT thô (bỏ tiền tố Bearer) để forward cho ai-service gọi ngược Node API (USER_PROGRESS).
    const authToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || undefined;

    if (!message)
        return res.status(StatusCodes.BAD_REQUEST).json({ reply: 'No message!' });

    try {
        console.log('🎯 Controller: Calling processChat with userId:', userId);
        const result = await chatService.processChat({ userId, message, model, conversationId, webSearch, webOnly, debug, authToken, forceAgent, mcpServer, mcpServers});
        console.log('✅ Controller: processChat returned, sending response');
        res.json(result);
    } catch (err) {
        console.error('❌ Critical Error in Chat Controller:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({ reply: 'Đã xảy ra lỗi nghiêm trọng phía máy chủ.' });
    }
}

/**
 * API lấy lịch sử chat
 */
export async function history(req, res) {
    const userId = req.user?.id;

    if (!userId)
        return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Chưa đăng nhập' });

    try {
        const rows = await chatService.getHistory(userId);
        res.json(rows);
    } catch (err) {
        console.error('❌ Lỗi khi lấy lịch sử câu hỏi:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
}

/**
 * Use chat function as advancedChat (deprecated alias)
 */
export const advancedChat = chat;

/**
 * Get advanced RAG statistics
 */
export async function getAdvancedRAGStats(req, res) {
    try {
        const stats = await chatService.getAdvancedRAGStats();
        res.json({ success: true, stats });
    } catch (err) {
        console.error('❌ Lỗi get stats:', err);
        res.status(500).json({ success: false, error: err.message });
    }
}

/**
 * Controller xử lý Chat với cơ chế Streaming (Server-Sent Events)
 * Endpoint: /chat/stream
 * TODO: Move stream logic to service if possible, or keep minimal here.
 */
export async function streamChat(req, res) {
    // For now, let's keep streaming logic here or refactor it to service later if user asks explicitly for streaming refactor.
    // The user asked to extract SQL queries. Streaming logic does have SQL (saveChat, getHistory etc).
    // I should extract the streaming logic to service too. e.g. chatService.streamChat(req, res)
    // But passing res to service is mixing layers.
    // Better: service returns an async generator or event emitter.
    // Given the complexity, I will keep streamChat here but use service methods for DB calls.

    // However, I can't easily refactor streamChat to use service without significant changes.
    // Let's implement streamChat using the service's methods for DB access,
    // effectively removing SQL from here.

    const { message, model, conversationId, webSearch, webOnly, forceAgent, mcpServer, mcpServers} = req.body;
    const userId = req.user?.id;
    const authToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || undefined;

    if (!message) return res.status(400).json({ error: 'No message provided' });

    const modelConfig = (model && model.url && model.name) ? model : { url: 'https://api.openai.com/v1', name: 'gpt-4o-mini' };
    // webSearch: bật/tắt tra web (mặc định bật).

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (type, data) => {
        res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    };

    try {
        // Reuse service logic parts if exposed, or duplicate logic but use service DB helpers?
        // Let's delegate to service stream function if we make one.
        // It's better to make streamChat in service accept a callback for events.

        await chatService.streamChat({ userId, message, model: modelConfig, conversationId, webSearch, webOnly, authToken, forceAgent, mcpServer, mcpServers}, sendEvent);

    } catch (err) {
        console.error('Stream Error:', err);
        sendEvent('error', { message: 'Stream failed' });
    } finally {
        res.end();
    }
}

/** Liệt kê MCP tool khả dụng cho UI dropdown (chỉ khi ai-service bật; lỗi -> rỗng). */
export async function mcpTools(req, res) {
    try {
        if (!aiServiceEnabled()) return res.json({ servers: [], tools: [] });
        const data = await aiTools();
        res.json(data);
    } catch (err) {
        console.error('mcpTools error:', err.message);
        res.json({ servers: [], tools: [] }); // degrade: UI chỉ còn 'Tự động'
    }
}
