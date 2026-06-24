/**
 * T15 — buildSearchQuery: nhận diện đại từ tiếng Việt CÓ DẤU (bug \b -> ranh giới Unicode).
 * Chạy: node test/build_search_query_test.js
 */
import assert from 'node:assert';
import chatService from '../src/modules/chat/services/chat.service.js';

const history = [{ role: 'user', content: 'Thì hiện tại hoàn thành là gì' }];

// 1) Đại từ có dấu ("đó"/"việc đó") -> phải ghép ngữ cảnh câu trước
const r1 = chatService.buildSearchQuery('việc đó dùng khi nào', history);
assert.ok(r1.startsWith('Thì hiện tại hoàn thành là gì'), `Không ghép ngữ cảnh: "${r1}"`);

// 2) Đại từ "nó"
const r2 = chatService.buildSearchQuery('nó khác gì quá khứ đơn', history);
assert.ok(r2.startsWith('Thì hiện tại hoàn thành là gì'), `"nó" không bắt: "${r2}"`);

// 3) "vậy" cuối câu
const r3 = chatService.buildSearchQuery('cho ví dụ với cấu trúc vậy', history);
assert.ok(r3.startsWith('Thì hiện tại hoàn thành là gì'), `"vậy" không bắt: "${r3}"`);

// 4) Câu đầy đủ, KHÔNG đại từ, đủ dài -> giữ nguyên
const long = 'Phân biệt thì hiện tại hoàn thành và quá khứ đơn trong tiếng Anh';
const r4 = chatService.buildSearchQuery(long, history);
assert.strictEqual(r4, long, `Không nên ghép: "${r4}"`);

console.log('✅ T15 buildSearchQuery: đại từ có dấu (đó/nó/vậy) bắt đúng, câu đủ giữ nguyên');
process.exit(0);
