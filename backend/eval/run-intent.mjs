/**
 * Eval intent classification (rule-based) — KHÔNG cần server/token.
 * Chạy:  node eval/run-intent.mjs        (từ thư mục backend/)
 *
 * Import trực tiếp classifyIntentRule và so với expected_intent trong golden-set.
 */
import { readFileSync } from 'fs';
import { classifyIntentRule } from '../services/intentRouter.js';

const set = JSON.parse(readFileSync(new URL('./golden-set.json', import.meta.url), 'utf-8'));

let pass = 0;
const fails = [];
const byCat = {}; // { category: { pass, total } }

for (const c of set) {
    const { intent } = classifyIntentRule(c.question);
    const ok = intent === c.expected_intent;

    byCat[c.category] ??= { pass: 0, total: 0 };
    byCat[c.category].total++;
    if (ok) { pass++; byCat[c.category].pass++; }
    else fails.push({ id: c.id, q: c.question, expected: c.expected_intent, got: intent, note: c.known_limitation });
}

const total = set.length;
const acc = ((pass / total) * 100).toFixed(1);

console.log('\n=== INTENT EVAL (rule-based) ===');
console.log(`Tổng: ${total} | Đúng: ${pass} | Sai: ${fails.length} | Accuracy: ${acc}%\n`);

console.log('Theo nhóm:');
for (const [cat, s] of Object.entries(byCat)) {
    const a = ((s.pass / s.total) * 100).toFixed(0);
    console.log(`  ${cat.padEnd(12)} ${s.pass}/${s.total}  (${a}%)`);
}

if (fails.length) {
    console.log('\nCâu SAI:');
    for (const f of fails) {
        const flag = f.note ? '  ⚠️ [known]' : '  ❌';
        console.log(`${flag} #${f.id} "${f.q}"`);
        console.log(`        expected=${f.expected}  got=${f.got}${f.note ? `  (${f.note})` : ''}`);
    }
}

// known_limitation không tính là "lỗi thật"
const realFails = fails.filter(f => !f.note);
const realAcc = (((total - realFails.length) / total) * 100).toFixed(1);
console.log(`\nAccuracy (bỏ qua known_limitation): ${realAcc}%`);

const THRESHOLD = 90;
console.log(realAcc >= THRESHOLD ? `✅ ĐẠT (>= ${THRESHOLD}%)` : `❌ KHÔNG ĐẠT (< ${THRESHOLD}%)`);
process.exit(realAcc >= THRESHOLD ? 0 : 1);
