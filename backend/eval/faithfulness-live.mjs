/**
 * Faithfulness TỰ ĐỘNG: gọi /chat (debug:true) -> tự lấy context THẬT model nhận +
 * câu trả lời -> chấm độ trung thực bằng LLM-judge. Không cần copy thủ công.
 *
 * Chạy:
 *   EVAL_TOKEN=<jwt> OPENAI_API_KEY=sk-... node eval/faithfulness-live.mjs "RAG là gì"
 *
 * Env tùy chọn: EVAL_API_URL (mặc định http://localhost:3001), JUDGE_MODEL (gpt-4o-mini)
 */
const question = process.argv.slice(2).join(' ').trim();
const API_URL = process.env.EVAL_API_URL || 'http://localhost:3001';
const TOKEN = process.env.EVAL_TOKEN;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const JUDGE_MODEL = process.env.JUDGE_MODEL || 'gpt-4o-mini';

if (!question) { console.error('Cách dùng: node eval/faithfulness-live.mjs "câu hỏi"'); process.exit(1); }
if (!OPENAI_KEY) { console.error('❌ Thiếu OPENAI_API_KEY'); process.exit(1); }
// EVAL_TOKEN tùy chọn: /chat dùng optionalAuth -> không token = ẩn danh (đủ cho KNOWLEDGE/LIVE_SEARCH).
// Chỉ cần token nếu muốn test USER_PROGRESS (cần user thật).

// ── 1) Gọi /chat với debug:true để lấy context thật ────
const headers = { 'Content-Type': 'application/json' };
if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;
const chatRes = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message: question, debug: true }),
});
if (!chatRes.ok) { console.error(`❌ /chat HTTP ${chatRes.status}`); process.exit(1); }
const chat = await chatRes.json();

const answer = chat.reply || '';
const sourceType = chat.source_type;
// context: ưu tiên _meta.context (debug); KNOWLEDGE có chunks -> ghép content nếu thiếu
let context = chat._meta?.context;
if (!context && chat.chunks_used?.length) {
    context = chat.chunks_used.map(c => `${c.title || ''}: ${c.content || ''}`).join('\n\n');
}
context = context || '(không có context — model trả lời từ kiến thức nội tại)';

console.log(`\n=== FAITHFULNESS (LIVE) ===`);
console.log(`Câu hỏi    : ${question}`);
console.log(`source_type: ${sourceType}`);
console.log(`Context len: ${context.length} ký tự`);

// ── 2) Judge ───────────────────────────────────────────
const prompt = `Đánh giá ĐỘ TRUNG THỰC của câu trả lời so với CONTEXT. Câu trả lời chỉ được dựa trên CONTEXT.

# CÂU HỎI
${question}

# CONTEXT
${context}

# CÂU TRẢ LỜI
${answer}

Tách câu trả lời thành các claim, gán nhãn supported|not_found|contradicted. CHỈ trả JSON:
{"claims":[{"claim":"...","verdict":"...","evidence":"..."}],"faithfulness":<1-5>,"relevance":<1-5>,"summary":"..."}`;

const jRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({ model: JUDGE_MODEL, temperature: 0, max_tokens: 900, messages: [{ role: 'user', content: prompt }] }),
});
const jData = await jRes.json();
const m = (jData.choices?.[0]?.message?.content || '').match(/\{[\s\S]*\}/);
if (!m) { console.error('❌ Judge không trả JSON'); process.exit(1); }
const r = JSON.parse(m[0]);

const icon = { supported: '✅', not_found: '⚠️ (bịa)', contradicted: '❌ (mâu thuẫn)' };
console.log(`\nClaims (${r.claims.length}):`);
for (const c of r.claims) console.log(`  ${icon[c.verdict] || c.verdict}  ${c.claim}`);
console.log(`\nFaithfulness: ${r.faithfulness}/5 | Relevance: ${r.relevance}/5`);
console.log(`Nhận xét: ${r.summary}`);
console.log(`\n--- Câu trả lời ---\n${answer}`);
