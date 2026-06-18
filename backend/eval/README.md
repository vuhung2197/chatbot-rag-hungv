# Eval Harness — đánh giá chất lượng output chatbot

Quy trình đánh giá tự động cho chatbot RAG (đa intent + RAG + web search).

## Cấu trúc
- `golden-set.json` — bộ đề vàng: câu hỏi + intent kỳ vọng + nhóm.
- `run-intent.mjs` — chấm **intent classification** (rule-based). Không cần server/token.
- `run-answer.mjs` — chấm **chất lượng câu trả lời** end-to-end + LLM-as-judge.

## 1. Eval Intent (nhanh, chạy ngay)
```bash
cd backend
node eval/run-intent.mjs
```
- Import trực tiếp `classifyIntentRule`, so với `expected_intent`.
- In accuracy tổng + theo nhóm + danh sách câu sai.
- Câu gắn `known_limitation` không tính là lỗi thật.
- Exit code 1 nếu accuracy < 90% (dùng được trong CI).

## 2. Eval Answer (end-to-end, cần server + key)
```bash
cd backend
export EVAL_TOKEN="<JWT của user đã đăng nhập>"
export OPENAI_API_KEY="sk-..."         # cho LLM-judge
# export EVAL_API_URL="http://localhost:3001"   # tùy chọn
# export JUDGE_MODEL="gpt-4o-mini"               # tùy chọn
node eval/run-answer.mjs
```
- Gọi `POST /chat` cho từng câu, đo latency + lấy reply/source_type.
- LLM-judge (OpenAI) chấm relevance / faithful / language (1–5).
- In scorecard: Relevance TB, Faithful TB, Hallucination rate, Reply rỗng, Latency p95.

### Lấy EVAL_TOKEN
Đăng nhập trên app → DevTools → Application → localStorage → copy `token`.

## 3. Eval Faithfulness (câu trả lời có bám context / có bịa không)

Tách câu trả lời thành các claim, đối chiếu từng cái với context: `supported` / `not_found` (bịa) / `contradicted`.

### 3a. Tự động (khuyến nghị) — tự lấy context thật từ hệ thống
```bash
cd backend
OPENAI_API_KEY=sk-... node eval/faithfulness-live.mjs "RAG là gì"
```
- Gọi `/chat` với `debug:true` → backend trả thêm `_meta.context` (context THẬT model nhận).
- Tự judge faithfulness/relevance. **Không cần token** cho câu KNOWLEDGE/LIVE_SEARCH (`/chat` là optionalAuth).

### 3b. Thủ công — tự cung cấp context
```bash
OPENAI_API_KEY=sk-... node eval/faithfulness.mjs eval/sample.json
```
File `{ "question", "context", "answer" }`.

> Flag `debug:true` trong body `/chat` → response thêm `_meta.context` (chỉ bật khi đánh giá).

## Quy trình vận hành đề xuất
- **Trước mỗi thay đổi lớn** (đổi model, sửa prompt, sửa rule intent) → chạy cả 2 → so baseline.
- **Khi gặp lỗi** → thêm câu lỗi vào `golden-set.json` (regression test).
- **Ngưỡng đạt**: intent ≥ 90%, relevance ≥ 4.0, faithful ≥ 4.0, hallucination ≤ 5%.
