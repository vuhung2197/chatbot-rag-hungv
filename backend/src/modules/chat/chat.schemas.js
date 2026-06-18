import { z } from 'zod';

// ─── Chat / Stream Chat ───
export const chatSchema = {
    body: z.object({
        message: z.string()
            .min(1, 'Message cannot be empty')
            .max(10000, 'Message too long'),
        model: z.object({
            url: z.string().url('Invalid model URL').optional(),
            name: z.string().optional()
        }).nullish(),
        // Model phụ (di sản — không còn dùng trong flow 1-LLM-call, vẫn cho qua để không vỡ client cũ)
        utilityModel: z.object({
            url: z.string().url().optional(),
            name: z.string().optional()
        }).nullish(),
        webOnly: z.boolean().optional(),   // chế độ Web Only (đi thẳng web search)
        webSearch: z.boolean().optional(), // bật/tắt web fallback (mặc định bật)
        debug: z.boolean().optional(),     // trả thêm _meta.context để đánh giá faithfulness
        stream: z.boolean().optional(),    // (async) stream token qua WebSocket thay vì trả cục
        conversationId: z.string().nullish()
    })
};

// ─── Conversation Params ───
export const conversationIdSchema = {
    params: z.object({
        conversationId: z.string().min(1, 'Conversation ID is required')
    })
};

// ─── Rename Conversation ───
export const renameConversationSchema = {
    params: z.object({
        conversationId: z.string().min(1, 'Conversation ID is required')
    }),
    body: z.object({
        title: z.string()
            .min(1, 'Title cannot be empty')
            .max(200, 'Title too long')
            .trim()
    })
};

// ─── Archive Conversation ───
export const archiveConversationSchema = {
    params: z.object({
        conversationId: z.string().min(1, 'Conversation ID is required')
    }),
    body: z.object({
        archived: z.boolean().optional().default(true)
    })
};

// ─── Pin Conversation ───
export const pinConversationSchema = {
    params: z.object({
        conversationId: z.string().min(1, 'Conversation ID is required')
    }),
    body: z.object({
        pinned: z.boolean().optional().default(true)
    })
};

// ─── Delete History Item ───
export const deleteHistoryItemSchema = {
    params: z.object({
        id: z.coerce.number().int().positive('Invalid history item ID')
    })
};
