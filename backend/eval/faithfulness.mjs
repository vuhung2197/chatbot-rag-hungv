/**
 * Đánh giá ĐỘ TRUNG THỰC (faithfulness) của câu trả lời so với CONTEXT đưa vào.
 * Tách câu trả lời thành các mệnh đề (claim) rồi đối chiếu từng cái với context:
 * mỗi claim là SUPPORTED / NOT_FOUND / CONTRADICTED.
 *
 * Chạy:
 *   OPENAI_API_KEY=sk-... node eval/faithfulness.mjs eval/sample.json
 *
 * File JSON đầu vào: { "question": "...", "context": "...", "answer": "..." }
 * Env tùy chọn: JUDGE_MODEL (mặc định gpt-4o-mini)
 */
import { readFileSync } from 'fs';

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const JUDGE_MODEL = process.env.JUDGE_MODEL || 'gpt-4o-mini';
if (!OPENAI_KEY) { console.error('❌ Thiếu OPENAI_API_KEY'); process.exit(1); }

const file = process.argv[2] || 'eval/sample.json';
let input;
try { input = JSON.parse(readFileSync(file, 'utf-8')); }
catch (e) { console.error(`❌ Không đọc được ${file}: ${e.message}`); process.exit(1); }

const { question, context, answer } = input;
if (!context || !answer) { console.error('❌ JSON cần có "context" và "answer"'); process.exit(1); }

const prompt = `Bạn là giám khảo đánh giá ĐỘ TRUNG THỰC của câu trả lời chatbot so với CONTEXT được cung cấp.
Quy tắc: câu trả lời CHỈ được dựa trên CONTEXT. Mọi thông tin không có trong CONTEXT = bịa.

# CÂU HỎI
${question || '(không có)'}

# CONTEXT (nguồn được phép dùng)
${context}

# CÂU TRẢ LỜI (cần đánh giá)
${answer}

Hãy:
1. Tách CÂU TRẢ LỜI thành các mệnh đề (claim) độc lập.
2. Với mỗi claim, gán nhãn:
   - "supported": có bằng chứng trong CONTEXT
   - "not_found": không có trong CONTEXT (model tự bịa/thêm)
   - "contradicted": MÂU THUẪN với CONTEXT
3. Cho điểm faithfulness 1-5 (5 = mọi claim đều supported; 1 = phần lớn bịa/mâu thuẫn).
4. Cho điểm relevance 1-5 (trả lời có đúng câu hỏi không).

CHỈ trả JSON:
{
  "claims": [{"claim": "...", "verdict": "supported|not_found|contradicted", "evidence": "trích context hoặc ''"}],
  "faithfulness": <1-5>,
  "relevance": <1-5>,
  "summary": "<1-2 câu nhận xét>"
}`;

const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({ model: JUDGE_MODEL, temperature: 0, max_tokens: 900,
        messages: [{ role: 'user', content: prompt }] }),
});
const data = await res.json();
const text = data.choices?.[0]?.message?.content || '';
const m = text.match(/\{[\s\S]*\}/);
if (!m) { console.error('❌ Judge không trả JSON:\n', text); process.exit(1); }
const r = JSON.parse(m[0]);

// ── In kết quả ─────────────────────────────────────────
const icon = { supported: '✅', not_found: '⚠️ (bịa)', contradicted: '❌ (mâu thuẫn)' };
console.log('\n=== FAITHFULNESS EVAL ===');
if (question) console.log(`Câu hỏi: ${question}`);
console.log(`\nClaims (${r.claims.length}):`);
for (const c of r.claims) {
    console.log(`  ${icon[c.verdict] || c.verdict}  ${c.claim}`);
    if (c.evidence) console.log(`        ↳ ${c.evidence}`);
}

const supported = r.claims.filter(c => c.verdict === 'supported').length;
const bad = r.claims.filter(c => c.verdict !== 'supported').length;

console.log('\n--- ĐIỂM ---');
console.log(`Faithfulness : ${r.faithfulness}/5   (ngưỡng >= 4)`);
console.log(`Relevance    : ${r.relevance}/5      (ngưỡng >= 4)`);
console.log(`Claims hợp lệ: ${supported}/${r.claims.length}  | bịa/mâu thuẫn: ${bad}`);
console.log(`Nhận xét     : ${r.summary}`);
console.log(r.faithfulness >= 4 ? '\n✅ ĐẠT độ trung thực' : '\n❌ KHÔNG ĐẠT — có dấu hiệu bịa');
