# Lõi Thuật Toán Chatbot — Giải Thích Chi Tiết

## Luồng xử lý tổng quan

```
User message
    │
    ▼
[1] Query Rewriting (nếu có lịch sử chat)
    │
    ▼
[2] Intent Classification
    ├── GREETING ──────────────► Direct LLM call
    ├── OFF_TOPIC ─────────────► Block + Refusal
    ├── USER_PROGRESS ─────────► DB Query → LLM
    ├── LIVE_SEARCH ───────────► Web Search → LLM
    └── KNOWLEDGE ─────────────► Advanced RAG Pipeline
                                        │
                    ┌───────────────────┤
                    ▼                   ▼
             Retrieve Chunks      (fallback) Web Search
                    │
             Re-rank Chunks
                    │
              Fuse Context
                    │
                   LLM
```

---

## Bước 1 — Query Rewriting

**File:** `backend/src/modules/chat/services/chat.service.js` (dòng 142)

Khi user hỏi follow-up ("nó là gì?", "còn cái kia thì sao?"), chatbot **không hỏi thẳng về câu đó** mà viết lại thành câu độc lập trước.

```
"nó hoạt động thế nào?" 
  → (nhờ lịch sử: đang nói về RAG)
  → "RAG hoạt động thế nào?"
```

Mục đích: câu hỏi rõ ràng → embedding chính xác hơn → retrieve đúng hơn.

---

## Bước 2 — Intent Classification

**File:** `backend/services/intentRouter.js` (dòng 22)

Dùng **chính LLM** với `temperature=0.1` (gần deterministic) để phân loại ý định:

| Intent | Hành động |
|---|---|
| `GREETING` | Chat trực tiếp, không cần tra cứu |
| `KNOWLEDGE` | Chạy Advanced RAG |
| `LIVE_SEARCH` | Tìm web (Tavily AI) |
| `USER_PROGRESS` | Query trực tiếp DB |
| `OFF_TOPIC` | Từ chối |

---

## Bước 3 — Advanced RAG Pipeline

**File:** `backend/services/advancedRAGFixed.js`

Đây là **lõi phức tạp nhất**, gồm 4 giai đoạn:

### 3a. Hybrid Retrieval (dòng 15)

Chạy **song song** 2 loại tìm kiếm:

```
câu hỏi ──► getEmbedding() ──► Vector Search (pgvector HNSW)
                                    └── tìm theo NGHĨA
         ──► Text tokenize  ──► Full-Text Search (PostgreSQL ts_rank)
                                    └── tìm theo TỪ KHÓA CHÍNH XÁC
```

**Tại sao cần cả 2?**
- Vector: "cách học tiếng Anh hiệu quả" → tìm được "phương pháp nâng cao kỹ năng ngôn ngữ" (cùng nghĩa, khác từ)
- Full-text: "IELTS band 7" → tìm chính xác chữ "IELTS band 7" mà vector đôi khi miss

### 3b. Reciprocal Rank Fusion — RRF (dòng 583)

Gộp 2 danh sách kết quả bằng công thức:

```
score(chunk) = Σ [ 1 / (k + rank_i) ]

Ví dụ: chunk A
  - Vector search: rank 2 → 1/(60+2) = 0.0161
  - Text search:   rank 1 → 1/(60+1) = 0.0164
  - RRF score = 0.0325  ← tổng cả 2
```

Chunk xuất hiện ở **cả 2 danh sách** sẽ có điểm cao hơn → ưu tiên kết quả đáng tin cậy.

### 3c. Re-ranking (dòng 289)

Sau khi có ~8-15 chunks, sắp xếp lại để chọn chunks **thực sự liên quan**:

- **Nếu có Cohere API key**: gọi `rerank-multilingual-v3.0` → model chuyên biệt cho reranking, hỗ trợ tiếng Việt
- **Fallback — Heuristic scoring** (dòng 268):

```javascript
finalScore = relevanceScore * 0.4    // điểm vector gốc
           + coherenceScore  * 0.3    // độ kết hợp với các chunk khác
           + completenessScore * 0.3  // tỷ lệ từ khóa trong câu hỏi xuất hiện
```

Chunks có `score < 0.3` bị loại → tránh đưa thông tin không liên quan vào context.

### 3d. Multi-Hop Reasoning (dòng 142) — chỉ khi câu hỏi phức tạp

Với câu hỏi như "so sánh X và Y" hoặc "tại sao A dẫn đến B", chatbot **không dừng ở chunks ban đầu** mà tiếp tục tìm thêm:

```
chunk_A (retrieved)
    └──► findRelatedChunks(chunk_A) → chunk_C, chunk_D
chunk_B (retrieved)
    └──► findRelatedChunks(chunk_B) → chunk_E

reasoning chain = {source: chunk_A, related: [C, D], score: 0.72}
```

`adaptiveRetrieval` (dòng 227) quyết định bật/tắt multi-hop dựa vào từ khóa: "so sánh", "tại sao", "mối quan hệ", "giải thích".

---

## Bước 4 — Context Fusion

**File:** `backend/services/advancedRAGFixed.js` (dòng 179)

Ghép các chunks thành **context có cấu trúc** trước khi đưa vào LLM:

```markdown
# Thông tin chính:
## AI:
### Chunk về Deep Learning
...nội dung...

## Vector Search:
### Chunk về HNSW
...nội dung...

# Mối liên kết thông tin:
## Liên kết 1:
**Nguồn chính:** Deep Learning
**Thông tin liên quan:** - HNSW: ...200 ký tự đầu...
```

---

## Bước 5 — LLM Generation

**File:** `backend/src/modules/chat/services/chat.service.js` (dòng 285)

```
System prompt = "Trả lời dựa trên thông tin được cung cấp..." + fusedContext
Messages = [system, ...6 tin nhắn lịch sử gần nhất, user_message]
Temperature = 0.3  (ít sáng tạo, bám sát context)
```

---

## Fallback: Khi KB trả về 0 chunks

**File:** `backend/src/modules/chat/services/chat.service.js` (dòng 317)

```
KB = 0 chunks
    │
    ▼
logUnanswered() → ghi vào DB để admin biết
    │
    ▼
Web Search (Tavily AI) → tổng hợp câu trả lời từ internet
    │
    ▼ (nếu web cũng fail)
"Tôi chưa có đủ thông tin..."
```

---

## Embedding — "Linh hồn" của toàn bộ hệ thống

**File:** `backend/services/embeddingVector.js` (dòng 10)

```
"RAG là gì?" → OpenAI text-embedding-3-small → [0.023, -0.14, 0.88, ...]
                                                  1536 chiều số thực
```

Câu hỏi và tài liệu đều được chuyển thành vector. Độ tương đồng đo bằng **cosine similarity**:

```
cos(θ) = (A·B) / (|A| × |B|)

= 1.0 → giống hệt nhau
= 0.0 → không liên quan
< 0   → trái nghĩa
```

Ngưỡng `0.65` (high) và `0.45` (medium) kiểm soát độ chặt của việc lọc.

---

## Tóm tắt kiến trúc

```
Input → Rewrite → Intent → 
  ├─ RAG: Embed → HybridSearch → RRF → Rerank → FuseContext → LLM
  ├─ Web: Search → Summarize → LLM  
  ├─ DB:  Query → Format → LLM
  └─ Direct: LLM (greeting)
```

Điểm mạnh nhất là **RAG pipeline nhiều tầng**: hybrid search + RRF + rerank đảm bảo chất lượng context trước khi đưa vào LLM, thay vì chỉ dùng vector search đơn giản.
