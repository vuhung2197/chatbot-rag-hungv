# Backend Knowledge Curriculum

Tài liệu này tổng hợp toàn bộ kiến thức kỹ thuật backend trong dự án `chatbot-rag-hungv`, được tổ chức thành 9 modules từ cơ bản đến nâng cao.

---

## Module 1 — Nền tảng Node.js & Express

### ES Modules (ESM)

Dự án dùng ESM hoàn toàn (không dùng CommonJS `require`):

```js
// ✅ ESM
import pool from '#db';
import { callLLM } from '#services/llmService.js';

// ❌ CommonJS (KHÔNG dùng trong project này)
const pool = require('./db');
```

Đuôi `.js` bắt buộc khi import local files trong ESM.

### Path Aliases

Khai báo trong `backend/package.json` mục `imports`:

```json
{
  "imports": {
    "#db": "./src/config/db.js",
    "#services/*": "./services/*.js",
    "#modules/*": "./src/modules/*.js",
    "#utils/*": "./src/utils/*.js"
  }
}
```

Thay vì `../../services/llmService.js`, viết `#services/llmService.js`. Dễ refactor, không bị vỡ khi chuyển file.

### Express Request Lifecycle

```
Request → Global Middleware (cors, json) → Auth Middleware → Route Handler → Controller → Service → DB/External API → Response
```

Mỗi tầng có trách nhiệm riêng biệt (SRP).

### Async/Await Best Practices

```js
// ✅ Parallel (nhanh hơn)
const [userRows, statsRows] = await Promise.all([
    pool.query('SELECT * FROM users WHERE id = $1', [userId]),
    pool.query('SELECT * FROM stats WHERE user_id = $1', [userId])
]);

// ❌ Sequential (chậm hơn khi không có dependency)
const userRows = await pool.query(...);
const statsRows = await pool.query(...);
```

`Promise.all()` chạy song song — dùng khi các queries độc lập nhau.

---

## Module 2 — Database & PostgreSQL

### Connection Pool

```js
// backend/src/config/db.js
import pg from 'pg';
const pool = new pg.Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 10,        // Tối đa 10 connections đồng thời
    idleTimeoutMillis: 30000
});
export default pool;
```

Pool tái sử dụng connections — không tạo new connection mỗi request (rất tốn kém).

### Parameterized Queries (chống SQL Injection)

```js
// ✅ Safe — dùng placeholder $1, $2
const [rows] = await pool.execute(
    'SELECT * FROM users WHERE id = ? AND status = ?',
    [userId, 'active']
);

// ❌ NGUY HIỂM — SQL Injection
const rows = await pool.query(`SELECT * FROM users WHERE id = ${userId}`);
```

PostgreSQL dùng `$1, $2`, MySQL dùng `?` — project dùng MySQL2 nên dùng `?`.

### Full-Text Search (PostgreSQL)

```sql
-- Tạo tsvector (index từ)
ALTER TABLE knowledge_base ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

-- Tìm kiếm
SELECT *, ts_rank(search_vector, query) as rank
FROM knowledge_base,
     to_tsquery('english', 'machine & learning') query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

- `to_tsvector` — index hoá text (lowercase, stemming, stopwords)
- `to_tsquery` — parse query thành cấu trúc tìm kiếm
- `@@` — match operator
- `ts_rank` — tính điểm relevance

### pgvector — Vector Similarity Search

```sql
-- Extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Cột embedding
ALTER TABLE knowledge_base ADD COLUMN embedding vector(1536);

-- Tìm kiếm cosine similarity (khoảng cách nhỏ = giống nhau)
SELECT id, content,
       1 - (embedding <=> $1::vector) AS similarity
FROM knowledge_base
WHERE 1 - (embedding <=> $1::vector) > 0.65
ORDER BY embedding <=> $1::vector
LIMIT 5;
```

- `<=>` — cosine distance (0 = identical, 1 = opposite)
- `1 - distance` = similarity score
- `vector(1536)` — OpenAI `text-embedding-3-small` output dimension

---

## Module 3 — Authentication & JWT

### JWT Structure

```
Header.Payload.Signature
eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjEyM30.abc123
```

- **Header** — Algorithm (`HS256`)
- **Payload** — `{ userId, email, exp }` (public, không encrypt)
- **Signature** — HMAC(Header + Payload, SECRET_KEY) — đảm bảo integrity

### Verify Pattern trong Project

```js
// middleware/auth.middleware.js
import jwt from 'jsonwebtoken';

export function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1]; // "Bearer <token>"
    if (!token) return res.status(401).json({ error: 'No token' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { userId, email }
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}
```

### UserId Flow trong Project

```
Client → Authorization: Bearer <JWT>
       → authMiddleware → req.user.userId = 123
       → Controller → req.user.id
       → ChatService.processChat({ userId: 123, ... })
       → DB queries WHERE user_id = 123
```

---

## Module 4 — LLM Integration & Prompt Engineering

### callLLM Pattern

```js
// backend/services/llmService.js
export async function callLLM(model, messages, temperature = 0.7, maxTokens = 1000) {
    const response = await axios.post(`${model.url}/chat/completions`, {
        model: model.name,
        messages,
        temperature,
        max_tokens: maxTokens
    }, {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
    });
    return response.data.choices[0].message.content;
}
```

### Temperature Tuning

| Task | Temperature | Lý do |
|------|-------------|-------|
| Intent Classification | 0.1 | Cần deterministic — luôn ra cùng kết quả |
| Query Rewriting | 0.3 | Cần sáng tạo nhẹ nhưng vẫn chính xác |
| Knowledge Q&A | 0.5 | Cân bằng accuracy và natural |
| Greeting/Chat | 0.7 | Cần tự nhiên, đa dạng |

### Context Injection (RAG Prompt)

```js
const systemPrompt = `Bạn là trợ lý AI. Dựa trên ngữ cảnh sau, trả lời câu hỏi:

${retrievedContext}

Quy tắc:
- Chỉ dùng thông tin từ ngữ cảnh trên
- Nếu không có thông tin, nói thẳng không biết
- Trả lời bằng Tiếng Việt`;
```

### Query Rewriting

```js
// chat.service.js — rewriteQuery()
const systemPrompt = `Viết lại câu hỏi follow-up thành standalone question.
- Thay thế đại từ (nó, cái đó) bằng danh từ cụ thể từ lịch sử
- Chỉ trả về câu hỏi đã viết lại, KHÔNG trả lời`;

// "Nó hoạt động thế nào?" + history về RAG
// → "RAG pipeline hoạt động thế nào?"
```

---

## Module 5 — RAG Pipeline (Retrieval-Augmented Generation)

### Tổng quan Pipeline

```
User Question
    ↓
[1] Embedding (OpenAI text-embedding-3-small)
    ↓
[2] Hybrid Search (Vector + Full-Text)
    ↓
[3] RRF Fusion (Reciprocal Rank Fusion)
    ↓
[4] Re-ranking (Cohere / Heuristic)
    ↓
[5] Adaptive Retrieval (chọn params theo complexity)
    ↓
[6] Multi-Hop Reasoning (tìm related chunks)
    ↓
[7] Semantic Clustering (nhóm theo topic)
    ↓
[8] Context Fusion (format markdown)
    ↓
[9] LLM Generation (câu trả lời cuối)
```

### Step 1 — Embedding

```js
// OpenAI text-embedding-3-small → vector 1536 chiều
const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: question
});
const questionEmbedding = response.data[0].embedding; // float[1536]
```

### Step 2+3 — Hybrid Search + RRF

```js
// Vector search (semantic)
const vectorResults = await multiStageRetrieval(questionEmbedding);

// Full-text search
const textResults = await pool.query(
    `SELECT *, ts_rank(search_vector, to_tsquery($1)) AS rank
     FROM knowledge_base WHERE search_vector @@ to_tsquery($1)
     ORDER BY rank DESC LIMIT 10`,
    [formattedQuery]
);

// RRF Fusion — kết hợp 2 danh sách
function rrfFusion(vectorList, textList, k = 60) {
    const scores = new Map();
    const processList = (list, weight) => {
        list.forEach((chunk, index) => {
            const current = scores.get(chunk.id) || 0;
            scores.set(chunk.id, current + (1 / (k + index + 1)) * weight);
        });
    };
    processList(vectorList, 1.0);
    processList(textList, 1.0);
    return [...scores.entries()]
        .sort(([,a], [,b]) => b - a)
        .map(([id, score]) => ({ id, score }));
}
```

**RRF Formula:** `score = 1 / (k + rank + 1)` — rank cao (gần đầu) → score cao

### Step 4 — Re-ranking (Strategy Pattern)

```js
// backend/services/rag/reranking/reranker.js
export async function rerankContext(chunks, questionEmbedding, question) {
    if (process.env.COHERE_API_KEY) {
        return rerankWithCohere(chunks, question); // Production: Cohere API
    }
    return heuristicReRank(chunks, question);     // Fallback: local heuristic
}

// Cohere reranking
async function rerankWithCohere(chunks, question) {
    const response = await cohere.rerank({
        model: 'rerank-multilingual-v3.0',
        query: question,
        documents: chunks.map(c => c.content),
        top_n: 5
    });
    return response.results.map(r => chunks[r.index]);
}

// Heuristic: relevance 40% + coherence 30% + completeness 30%
function heuristicReRank(chunks, question) {
    const questionWords = new Set(question.toLowerCase().split(/\s+/));
    return chunks.map(chunk => {
        const contentWords = chunk.content.toLowerCase().split(/\s+/);
        const relevance = contentWords.filter(w => questionWords.has(w)).length / questionWords.size;
        const coherence = chunk.content.includes('. ') ? 1 : 0.5; // Có câu hoàn chỉnh
        const completeness = chunk.content.length > 200 ? 1 : chunk.content.length / 200;
        const score = relevance * 0.4 + coherence * 0.3 + completeness * 0.3;
        return { ...chunk, rerankScore: score };
    }).sort((a, b) => b.rerankScore - a.rerankScore);
}
```

### Step 5 — Adaptive Retrieval

```js
// backend/services/rag/config.js
export const RAG_CONFIG = {
    adaptive: {
        simple:     { maxChunks: 3,  threshold: 0.65, useMultiHop: false },
        complex:    { maxChunks: 6,  threshold: 0.5,  useMultiHop: true  },
        multiTopic: { maxChunks: 10, threshold: 0.4,  useMultiHop: true  }
    }
};

// Phân tích complexity câu hỏi
function analyzeComplexity(question) {
    const wordCount = question.split(/\s+/).length;
    const hasMultipleTopics = question.includes(' và ') || question.includes(' hoặc ');
    if (wordCount > 20 || hasMultipleTopics) return 'multiTopic';
    if (wordCount > 10) return 'complex';
    return 'simple';
}
```

### Step 6 — Multi-Hop Reasoning

```
Chunk A (về RAG) → tìm related chunks → Chunk B (về embedding) + Chunk C (về retrieval)
                                        → Reasoning chain: A → B → C
```

```js
async function multiHopReasoning(seedChunks, embedding) {
    const chains = [];
    for (const seed of seedChunks.slice(0, 3)) {
        const related = await findRelatedChunks(seed.embedding, {
            excludeId: seed.id,
            minSimilarity: 0.4,
            limit: 3
        });
        chains.push({ source: seed, relatedChunks: related });
    }
    return chains;
}
```

### Step 7+8 — Semantic Clustering + Context Fusion

```js
// Nhóm các chunks có nội dung gần nhau
function semanticClustering(chunks, threshold = 0.6) {
    const clusters = [];
    for (const chunk of chunks) {
        let added = false;
        for (const cluster of clusters) {
            const similarity = cosineSimilarity(chunk.embedding, cluster[0].embedding);
            if (similarity >= threshold) {
                cluster.push(chunk);
                added = true;
                break;
            }
        }
        if (!added) clusters.push([chunk]);
    }
    return clusters;
}

// Format context cho LLM
function fuseContext(clusters, reasoningChains) {
    let context = '';
    clusters.forEach((cluster, i) => {
        context += `## Topic ${i + 1}\n`;
        cluster.forEach(chunk => context += `${chunk.content}\n\n`);
    });
    if (reasoningChains.length > 0) {
        context += '\n## Reasoning Chain\n';
        reasoningChains.forEach(chain => {
            context += `- ${chain.source.content.substring(0, 100)}...\n`;
        });
    }
    return context;
}
```

---

## Module 6 — Design Patterns trong Project

### Strategy Pattern — Re-ranker

```js
// Chọn strategy tự động dựa vào môi trường
export async function rerankContext(chunks, questionEmbedding, question) {
    if (process.env.COHERE_API_KEY) return rerankWithCohere(chunks, question);
    return heuristicReRank(chunks, question);
}
// Caller không cần biết implementation nào đang chạy
```

### Handler Pattern — Intent Routing

```
ChatService._routeIntent()
    → GREETING    → greeting.handler.js
    → LIVE_SEARCH → live-search.handler.js
    → KNOWLEDGE   → knowledge.handler.js
    → USER_PROGRESS → progress.handler.js
```

Mỗi handler nhận cùng interface `{ message, processingMessage, history, modelConfig, onStatus? }` và trả về cùng interface `{ reply, chunks_used, reasoning_steps, source_type, web_sources? }`.

### Graceful Degradation

```
Knowledge Base (pgvector) → (nếu thất bại/không đủ chunks)
    → Web Search (Tavily) → (nếu thất bại/no API key)
        → Static fallback message
```

```js
// knowledge.handler.js
if (chunks.length === 0 || maxSimilarity < 0.4) {
    // KB không đủ → thử web search
    const webResult = await performWebSearch(processingMessage);
    if (webResult.context && !webResult.context.includes('chưa được cấu hình')) {
        return buildWebSearchResponse(webResult);
    }
    // Web cũng fail → static message
    return { reply: 'Xin lỗi, tôi không tìm thấy thông tin...', ... };
}
```

### Singleton Pattern

```js
// chat.service.js
class ChatService {
    async processChat(...) { ... }
    async streamChat(...) { ... }
}

export default new ChatService(); // Singleton — toàn app dùng 1 instance
```

---

## Module 7 — Streaming & Server-Sent Events (SSE)

### SSE Protocol

Client giữ connection HTTP mở, server push events liên tục:

```
GET /api/chat/stream HTTP/1.1

--- Server Response ---
Content-Type: text/event-stream
Cache-Control: no-cache

data: {"type":"status","content":"🔍 Đang tìm kiếm..."}

data: {"type":"status","content":"📚 Tìm thấy 5 chunks"}

data: {"type":"text","content":"RAG là viết tắt của..."}

data: {"type":"done","reply":"...","chunks_used":[...],"conversationId":"abc"}
```

### sendEvent Pattern

```js
// chat.controller.js
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');

const sendEvent = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
};

await chatService.streamChat({ userId, message, model, conversationId }, sendEvent);
res.end();
```

### onStatus Callback (Streaming-aware Handlers)

```js
// Handler nhận onStatus — chỉ gọi khi streaming
export async function handleKnowledge({ message, modelConfig, onStatus }) {
    onStatus?.('🔍 Đang tìm kiếm trong knowledge base...');  // Optional chaining
    const chunks = await retrieveChunks(message);

    onStatus?.(`📚 Tìm thấy ${chunks.length} chunks liên quan`);
    const reply = await generateAnswer(chunks, message, modelConfig);

    return { reply, chunks_used: chunks, ... };
}

// processChat (non-streaming) — không truyền onStatus → handler im lặng
result = await handleKnowledge({ message, modelConfig });

// streamChat — truyền onStatus → handler gửi status events
result = await handleKnowledge({ message, modelConfig, onStatus });
```

---

## Module 8 — External API Integration

### Axios Pattern (chuẩn của project)

```js
import axios from 'axios';

// POST request với timeout
const response = await axios.post(apiUrl, requestBody, {
    headers: { Authorization: `Bearer ${apiKey}` },
    timeout: 10000  // 10 giây — tránh hang vô tận
});

// Luôn xử lý lỗi
try {
    const data = response.data;
    return formatResult(data);
} catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    return fallbackResult; // KHÔNG throw — graceful degradation
}
```

### Type-Safe Returns (tránh runtime crash)

```js
// ❌ Bug — trả về string, caller destructure object → crash
export async function performWebSearch(query) {
    if (!apiKey) return 'Chưa cấu hình API Key'; // TypeError tại caller
}

// ✅ Luôn trả về cùng shape
export async function performWebSearch(query) {
    if (!apiKey) return { context: 'Chưa cấu hình API Key', sources: [] };
    try {
        // ...
        return { context: formattedText, sources: urlList };
    } catch {
        return { context: 'Lỗi tìm kiếm', sources: [] };
    }
}
```

### Caching Layer (tránh spam API)

```js
const CACHE_TTL_MS = 300000; // 5 phút cho real-time data
const searchCache = new Map();

export async function performWebSearch(query) {
    const cacheKey = normalizeQuery(query); // lowercase, trim
    const cached = searchCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        return cached.result; // Cache HIT — không tốn API call
    }

    const result = await callTavilyAPI(query);
    searchCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
}
```

---

## Module 9 — Kiến Trúc Dự Án Lớn

### Cấu trúc thư mục

```
backend/
├── src/
│   ├── modules/           # Feature modules (chat, auth, usage, ...)
│   │   └── chat/
│   │       ├── controllers/   # HTTP layer (parse req, call service)
│   │       ├── services/      # Business logic (chat.service.js)
│   │       ├── handlers/      # Intent handlers (1 file per intent)
│   │       └── routes/        # Express routes
│   ├── config/            # DB, env
│   └── utils/             # Shared utilities
├── services/              # Cross-cutting services
│   ├── llmService.js      # LLM wrapper
│   ├── intentRouter.js    # Intent classification
│   ├── webSearch.service.js
│   └── rag/               # RAG sub-modules
│       ├── config.js      # Centralized RAG config
│       ├── retrieval/     # hybrid.retriever.js, ...
│       ├── reranking/     # reranker.js
│       ├── reasoning/     # multi-hop.js
│       └── index.js       # Public API
└── package.json
```

### Centralized Config (tránh magic numbers)

```js
// backend/services/rag/config.js
export const RAG_CONFIG = {
    vector: {
        stages: [
            { topK: 5, threshold: 0.65, name: 'high_similarity' },
            { topK: 8, threshold: 0.45, name: 'medium_similarity' }
        ]
    },
    rrf: { k: 60, vectorWeight: 1.0, textWeight: 1.0 },
    reranking: {
        cohereModel: 'rerank-multilingual-v3.0',
        minScore: 0.3,
        heuristicWeights: { relevance: 0.4, coherence: 0.3, completeness: 0.3 }
    },
    clustering: { similarityThreshold: 0.6 },
    adaptive: {
        simple:     { maxChunks: 3,  threshold: 0.65, useMultiHop: false },
        complex:    { maxChunks: 6,  threshold: 0.5,  useMultiHop: true  },
        multiTopic: { maxChunks: 10, threshold: 0.4,  useMultiHop: true  }
    }
};
```

Thay đổi threshold hay weights → chỉ sửa 1 file, áp dụng toàn app.

### Single Responsibility Principle (SRP)

| File | Trách nhiệm DUY NHẤT |
|------|---------------------|
| `chat.service.js` | Orchestrate flow — không chứa business logic |
| `greeting.handler.js` | Xử lý câu chào hỏi |
| `knowledge.handler.js` | RAG pipeline |
| `live-search.handler.js` | Web search flow |
| `intentRouter.js` | Phân loại intent |
| `llmService.js` | Gọi LLM API |
| `webSearch.service.js` | Gọi Tavily API |

### Backward-Compatible Refactoring

Khi di chuyển code sang module mới, tạo re-export để không phá vỡ code cũ:

```js
// backend/services/advancedRAGFixed.js (file cũ — giữ để không vỡ imports)
export {
    multiStageRetrieval,
    semanticClustering,
    rerankContext,
    // ...
} from './rag/index.js'; // → chuyển sang module mới
```

---

## Intent Router — Luồng Xử Lý Hoàn Chỉnh

```
User: "Giá vàng hôm nay bao nhiêu?"
    ↓
[Fast-path] Keyword check: "hôm nay" → LIVE_SEARCH (không cần gọi LLM)
    ↓
[live-search.handler.js]
    → performWebSearch("Giá vàng hôm nay bao nhiêu?")
    → Tavily API → results
    → callLLM(model, systemPrompt + searchContext + message)
    → { reply, source_type: 'web_search', web_sources: [...] }
    ↓
[chat.service.js]
    → if (userId) saveChatAndTrack(...)
    → return result
```

```
User: "RAG là gì?"
    ↓
[Fast-path] Không match keyword → gọi LLM router
    ↓
[LLM] → "KNOWLEDGE"
    ↓
[knowledge.handler.js]
    → embed("RAG là gì?") → vector
    → multiStageRetrieval(vector) → chunks
    → if chunks.length === 0 → performWebSearch() (fallback)
    → rerankContext(chunks) → top chunks
    → callLLM(model, context + question)
    → { reply, chunks_used, source_type: 'knowledge_base' }
```

---

## Checklist Tự Kiểm Tra

Sau khi học xong, bạn có thể:

- [ ] Giải thích sự khác biệt giữa vector search và full-text search
- [ ] Viết một Hybrid Search kết hợp RRF từ đầu
- [ ] Implement Strategy Pattern cho một service mới
- [ ] Giải thích tại sao dùng `Promise.all()` thay vì sequential `await`
- [ ] Debug một bug `TypeError: Cannot destructure undefined` trong service layer
- [ ] Thiết kế một handler mới theo interface của project
- [ ] Giải thích SSE flow từ server đến client
- [ ] Hiểu tại sao Cohere reranking tốt hơn heuristic
- [ ] Biết khi nào dùng `temperature: 0.1` vs `0.7`
- [ ] Đọc được query pgvector và biết `<=>` là gì

---

*Tạo từ phân tích codebase `chatbot-rag-hungv` — 2025*
