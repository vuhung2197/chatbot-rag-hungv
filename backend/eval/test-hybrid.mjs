/**
 * Test mô hình lai: async (Kafka) + stream token qua WebSocket.
 * Chạy (trong container backend có sẵn 'ws'):
 *   docker exec chatbot-backend node eval/test-hybrid.mjs "RAG là gì"
 *
 * Luồng: POST /chat/async {stream:true} -> nhận requestId -> mở WS -> subscribe
 *        -> in từng event (status/token/text/done) realtime.
 */
import WebSocket from 'ws';

const question = process.argv.slice(2).join(' ').trim() || 'RAG là gì';
const API = process.env.EVAL_API_URL || 'http://localhost:3001';
const WS = API.replace(/^http/, 'ws') + '/ws';

// ① Mở WebSocket TRƯỚC (để sẵn sàng subscribe ngay khi có requestId — tránh race)
const ws = new WebSocket(WS);
let tokens = '';
await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
});
console.log('① WS đã mở');

// ② POST /chat/async {stream:true} → nhận requestId → subscribe NGAY
const res = await fetch(`${API}/chat/async`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: question, stream: true }),
});
const { requestId } = await res.json();
ws.send(JSON.stringify({ type: 'subscribe', requestId }));
console.log(`② requestId = ${requestId} — đã subscribe, chờ token...\n`);

ws.on('message', (raw) => {
    const ev = JSON.parse(raw.toString());
    if (ev.type === 'status') console.log(`  [status] ${ev.content}`);
    else if (ev.type === 'token') { tokens += ev.content; process.stdout.write(ev.content); }
    else if (ev.type === 'text') console.log(`\n\n③ [text] (bản đầy đủ ${ev.content?.length} ký tự)`);
    else if (ev.type === 'done') {
        console.log(`\n④ [done] source=${ev.source_type} | tokens nhận: ${tokens.length} ký tự`);
        ws.close();
        process.exit(0);
    } else if (ev.type === 'error') {
        console.log(`\n❌ [error] ${ev.message}`); ws.close(); process.exit(1);
    }
});

ws.on('error', (e) => { console.error('WS error:', e.message); process.exit(1); });
setTimeout(() => { console.error('\n⏱️ timeout 60s'); process.exit(1); }, 60000);
