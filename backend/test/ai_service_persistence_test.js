/**
 * T12 — Kiểm chứng: khi bật ai-service (hybrid), Node VẪN lưu hội thoại với metadata
 * đúng (intent / source / via / processing). Stub tầng DB để KHÔNG ghi thật + KHÔNG
 * cần users/FK; phần sinh câu trả lời gọi ai-service THẬT (localhost:8000).
 *
 * Chạy: AI_SERVICE đang chạy ở :8000, Postgres không bắt buộc (đã stub repo).
 *   node test/ai_service_persistence_test.js
 */
process.env.AI_SERVICE_ENABLED = 'true';
process.env.AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';

import assert from 'node:assert';
import chatService from '../src/modules/chat/services/chat.service.js';
import chatRepository from '../src/modules/chat/repositories/chat.repository.js';
import conversationService from '../src/modules/chat/services/conversation.service.js';
import usageService from '../src/modules/usage/services/usage.service.js';

// ── Stub tầng phụ thuộc (object export -> gán đè method được) ──
let savedMetadata = null;
let usageTracked = null;
chatRepository.countMessages = async () => 1; // tránh tạo title
chatRepository.insertMessage = async (userId, convId, title, q, reply, metadata) => {
    savedMetadata = { userId, convId, reply, metadata };
};
conversationService.getOrCreateConversationId = async (uid, cid) => cid || 'test-conv-1';
usageService.trackUsage = async (uid, type, data) => {
    usageTracked = { type, data };
};

async function run() {
    const res = await chatService.processChat({
        userId: 999,
        conversationId: 'test-conv-1',
        message: 'kiến thức là gì',
        model: { url: 'https://api.openai.com/v1', name: 'gpt-4o-mini' },
    });

    // 1) Câu trả lời đến từ ai-service
    assert.ok(res.reply && res.reply.length > 0, 'reply rỗng');
    assert.strictEqual(res._meta.via, 'ai-service', 'không đi qua ai-service');

    // 2) Persistence được gọi với metadata đúng
    assert.ok(savedMetadata, 'insertMessage không được gọi');
    assert.strictEqual(savedMetadata.userId, 999);
    assert.ok(savedMetadata.metadata.intent, 'thiếu intent trong metadata');
    assert.ok(savedMetadata.metadata.source_type, 'thiếu source_type trong metadata');
    assert.ok(typeof savedMetadata.metadata.processing_ms === 'number', 'thiếu processing_ms');
    assert.strictEqual(savedMetadata.metadata.via, 'ai-service');

    // 3) Usage được track
    assert.ok(usageTracked, 'trackUsage không được gọi');

    // 4) conversationId trả về cho client
    assert.strictEqual(res.conversationId, 'test-conv-1');

    console.log('✅ T12 persistence OK:', JSON.stringify({
        intent: savedMetadata.metadata.intent,
        source_type: savedMetadata.metadata.source_type,
        via: savedMetadata.metadata.via,
        processing_ms: savedMetadata.metadata.processing_ms,
        usageType: usageTracked.type,
    }));
    process.exit(0);
}

run().catch((e) => {
    console.error('❌ T12 persistence FAILED:', e.message);
    process.exit(1);
});
