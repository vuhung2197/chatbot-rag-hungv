/**
 * Đánh giá NHANH 1 câu hỏi.
 *
 * Chỉ intent (không cần server):
 *   node eval/check.mjs "giá vàng hôm nay"
 *
 * Đầy đủ (gọi /chat thật, cần backend chạy + token):
 *   EVAL_TOKEN="<jwt>" node eval/check.mjs --full "RAG là gì"
 *
 * Env tùy chọn: EVAL_API_URL (mặc định http://localhost:3001)
 */
import { classifyIntentRule } from '../services/intentRouter.js';

const args = process.argv.slice(2);
const full = args.includes('--full');
const question = args.filter(a => a !== '--full').join(' ').trim();

if (!question) {
    console.error('Cách dùng: node eval/check.mjs "câu hỏi"   (thêm --full để gọi /chat thật)');
    process.exit(1);
}

// ── 1) Intent rule-based (luôn chạy) ───────────────────
const { intent, reasoning } = classifyIntentRule(question);
console.log('\n=== KIỂM TRA 1 CÂU ===');
console.log(`Câu hỏi : ${question}`);
console.log(`Intent  : ${intent}`);
console.log(`Lý do   : ${reasoning}`);

// ── 2) Gọi /chat thật (nếu --full) ─────────────────────
if (full) {
    const TOKEN = process.env.EVAL_TOKEN; // tùy chọn (/chat optionalAuth)
    const API_URL = process.env.EVAL_API_URL || 'http://localhost:3001';

    console.log('\n--- Gọi /chat thật ---');
    const t0 = Date.now();
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;
        const res = await fetch(`${API_URL}/chat`, {
            method: 'POST', headers,
            body: JSON.stringify({ message: question }),
        });
        const latency = Date.now() - t0;
        if (!res.ok) { console.error(`HTTP ${res.status}`); process.exit(1); }
        const data = await res.json();
        console.log(`source_type : ${data.source_type}`);
        console.log(`latency     : ${latency}ms`);
        console.log(`web_sources : ${(data.web_sources || []).length}`);
        console.log(`\nReply:\n${data.reply}`);
        if (data.reasoning_steps?.length) console.log(`\nSteps: ${data.reasoning_steps.join(' | ')}`);
    } catch (e) {
        console.error('Lỗi gọi /chat:', e.message);
        process.exit(1);
    }
}
