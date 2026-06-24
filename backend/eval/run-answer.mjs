/**
 * Eval chất lượng câu trả lời (end-to-end + LLM-as-judge).
 * Chạy:  node eval/run-answer.mjs        (từ thư mục backend/)
 *
 * Cần:
 *   - Backend đang chạy (mặc định http://localhost:3001)
 *   - EVAL_TOKEN  = JWT của 1 user đã đăng nhập (để gọi /chat)
 *   - OPENAI_API_KEY = key cho LLM-judge (chấm faithfulness/relevance)
 * Env tùy chọn:
 *   - EVAL_API_URL (mặc định http://localhost:3001)
 *   - JUDGE_MODEL  (mặc định gpt-4o-mini)
 *
 * Bỏ qua các câu OFF_TOPIC/edge (không phù hợp chấm faithfulness).
 */
import { readFileSync } from 'fs';

const API_URL = process.env.EVAL_API_URL || 'http://localhost:3001';
const TOKEN = process.env.EVAL_TOKEN;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const JUDGE_MODEL = process.env.JUDGE_MODEL || 'gpt-4o-mini';

if (!OPENAI_KEY) { console.error('❌ Thiếu OPENAI_API_KEY (cho LLM-judge).'); process.exit(1); }
// EVAL_TOKEN tùy chọn (/chat optionalAuth). Không token -> ẩn danh; USER_PROGRESS sẽ báo cần đăng nhập.

const set = JSON.parse(readFileSync(new URL('./golden-set.json', import.meta.url), 'utf-8'))
    .filter(c => ['greeting', 'knowledge', 'live', 'progress'].includes(c.category));

// ── Gọi /chat (non-stream) ─────────────────────────────
async function askChatbot(question) {
    const t0 = Date.now();
    const headers = { 'Content-Type': 'application/json' };
    if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;
    const res = await fetch(`${API_URL}/chat`, {
        method: 'POST', headers,
        body: JSON.stringify({ message: question }),
    });
    const latency = Date.now() - t0;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { reply: data.reply || '', sourceType: data.source_type, sources: data.web_sources || [], latency };
}

// ── LLM-as-judge (OpenAI) ──────────────────────────────
async function judge(question, reply, sources) {
    const prompt = `Bạn là giám khảo đánh giá câu trả lời chatbot. Chấm theo thang 1-5.
Câu hỏi: "${question}"
Câu trả lời: "${reply}"
Số nguồn web kèm theo: ${sources.length}

Chấm và CHỈ trả JSON:
{"relevance": <1-5, có trả lời đúng câu hỏi không>,
 "faithful": <1-5, có vẻ bịa đặt/sai sự thật không (5=đáng tin, 1=bịa)>,
 "language": <1-5, tiếng Việt trôi chảy & rõ ràng>,
 "note": "<1 câu nhận xét>"}`;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
        body: JSON.stringify({ model: JUDGE_MODEL, temperature: 0, max_tokens: 200,
            messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    const m = text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : { relevance: 0, faithful: 0, language: 0, note: 'parse fail' };
}

// ── Chạy ───────────────────────────────────────────────
const rows = [];
for (const c of set) {
    try {
        const r = await askChatbot(c.question);
        const empty = !r.reply.trim();
        const score = empty ? { relevance: 0, faithful: 0, language: 0, note: 'EMPTY reply' }
                            : await judge(c.question, r.reply, r.sources);
        rows.push({ id: c.id, q: c.question, ...r, ...score, empty });
        console.log(`#${c.id} ${c.question.slice(0, 30).padEnd(30)} | ${r.latency}ms | src=${r.sourceType} | rel=${score.relevance} faith=${score.faithful}`);
    } catch (e) {
        rows.push({ id: c.id, q: c.question, error: e.message });
        console.log(`#${c.id} ❌ ${e.message}`);
    }
}

// ── Scorecard ──────────────────────────────────────────
const ok = rows.filter(r => !r.error);
const avg = k => (ok.reduce((s, r) => s + (r[k] || 0), 0) / ok.length).toFixed(2);
const latencies = ok.map(r => r.latency).filter(Boolean).sort((a, b) => a - b);
const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
const halluc = ok.filter(r => r.faithful && r.faithful <= 2).length;
const empties = ok.filter(r => r.empty).length;

console.log('\n=== SCORECARD ===');
console.log(`Câu chạy được: ${ok.length}/${rows.length}`);
console.log(`Relevance TB:  ${avg('relevance')}/5   (ngưỡng >= 4.0)`);
console.log(`Faithful TB:   ${avg('faithful')}/5   (ngưỡng >= 4.0)`);
console.log(`Language TB:   ${avg('language')}/5`);
console.log(`Hallucination: ${halluc}/${ok.length} (faithful<=2)  (ngưỡng <= 5%)`);
console.log(`Reply rỗng:    ${empties}/${ok.length}`);
console.log(`Latency p95:   ${p95}ms`);
