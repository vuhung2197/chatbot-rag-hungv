# PHÂN TÍCH CHI TIẾT - KNOWLEDGE SERVICE

## Tổng quan
File: `knowledge.service.js`

Service quản lý knowledge base với vector embeddings cho semantic search.

---

## Helper Functions

### extractKeywords(text)
Trích xuất keywords từ text (Vietnamese-aware).

**Logic**:
1. Normalize Unicode (remove dấu)
2. Lowercase
3. Remove special characters
4. Split thành words
5. Filter stopwords
6. Return unique keywords

---

## Class: KnowledgeService

### 1. updateImportantKeywords(title, content)

**Mục đích**: Cập nhật bảng important_keywords

**Logic**:
1. Extract keywords từ title và content
2. Combine và deduplicate
3. Bulk insert với ON CONFLICT DO NOTHING

**SQL Query**:
```sql
INSERT INTO important_keywords (keyword)
VALUES (?), (?), (?)
ON CONFLICT (keyword) DO NOTHING
```

---

### 2. addKnowledge(title, content)

**Mục đích**: Thêm knowledge mới với embedding

**Logic chi tiết**:

#### Step 1: Generate embedding
```javascript
const embedding = await getEmbedding(`${title}\n${content}`);
```

#### Step 2: Insert to database
```javascript
const [rows] = await pool.execute(
  'INSERT INTO knowledge_base (title, content, embedding) VALUES (?, ?, ?) RETURNING id',
  [title, content, JSON.stringify(embedding)]
);
```

#### Step 3: Update keywords
```javascript
await this.updateImportantKeywords(title, content);
```

#### Step 4: Generate chunks
```javascript
await updateChunksForKnowledge(insertedId, title, content);
```

**Returns**:
```javascript
{
  id: 123,
  message: 'Đã thêm kiến thức và cập nhật embedding!'
}
```

---

### 3. getAllKnowledge()

**Mục đích**: Lấy tất cả knowledge với chunk info

**SQL Query**:
```sql
SELECT
  kb.*,
  COUNT(kc.id) as chunk_count,
  COALESCE(
    json_agg(
      json_build_object('id', kc.id, 'token_count', kc.token_count)
    ) FILTER (WHERE kc.id IS NOT NULL),
    '[]'::json
  ) as chunks_info
FROM knowledge_base kb
LEFT JOIN knowledge_chunks kc ON kb.id = kc.parent_id
GROUP BY kb.id
ORDER BY kb.id DESC
```

**Return format**:
```javascript
[
  {
    id: 1,
    title: 'React Hooks',
    content: '...',
    embedding: [...],
    chunk_count: 5,
    chunks_info: [
      { id: 1, token_count: 500 },
      { id: 2, token_count: 450 }
    ],
    created_at: '...'
  }
]
```

---

### 4. updateKnowledge(id, title, content)

**Mục đích**: Cập nhật knowledge existing

**Logic**:
1. Generate new embedding
2. Update knowledge_base
3. Update keywords
4. Regenerate chunks

**SQL Query**:
```sql
UPDATE knowledge_base
SET title=?, content=?, embedding=?
WHERE id=?
```

---

### 5. deleteKnowledge(id)

**Mục đích**: Xóa knowledge và chunks

**SQL Query**:
```sql
DELETE FROM knowledge_base WHERE id=?
```

**Note**: Chunks tự động xóa bởi CASCADE

---

## Vector Search

### Semantic Search Query
```sql
SELECT *,
  1 - (embedding <=> $1) as similarity
FROM knowledge_base
WHERE 1 - (embedding <=> $1) > 0.7
ORDER BY similarity DESC
LIMIT 10
```

**Giải thích**:
- `<=>`: Cosine distance operator (pgvector)
- `1 - distance`: Convert sang similarity score
- Filter threshold: 0.7 (70% similar)

---

## Chunking Strategy

### Why Chunking?
- Token limit của embedding model (8191 tokens)
- Better retrieval granularity
- Reduce noise in search results

### Chunk Size
```javascript
const MAX_CHUNK_TOKENS = 500;  // Optimal for retrieval
const OVERLAP_TOKENS = 50;     // Overlap between chunks
```

### Chunking Algorithm
```javascript
function splitIntoChunks(text, maxTokens, overlap) {
  const tokens = encode(text);
  const chunks = [];

  for (let i = 0; i < tokens.length; i += maxTokens - overlap) {
    const chunk = tokens.slice(i, i + maxTokens);
    chunks.push(decode(chunk));
  }

  return chunks;
}
```

---

## Database Schema

### knowledge_base
```sql
CREATE TABLE knowledge_base (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),  -- OpenAI embedding dimension
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_knowledge_embedding ON knowledge_base
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### knowledge_chunks
```sql
CREATE TABLE knowledge_chunks (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER REFERENCES knowledge_base(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_embedding vector(1536),
  token_count INTEGER,
  chunk_index INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chunks_embedding ON knowledge_chunks
USING ivfflat (chunk_embedding vector_cosine_ops);
```

### important_keywords
```sql
CREATE TABLE important_keywords (
  id SERIAL PRIMARY KEY,
  keyword VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Integration với Chat Module

### RAG Pipeline
```javascript
// 1. Get user question
const question = "What is React Hooks?";

// 2. Generate question embedding
const questionEmbedding = await getEmbedding(question);

// 3. Semantic search
const contexts = await semanticSearch(questionEmbedding, limit=5);

// 4. Build prompt
const prompt = `
Context:
${contexts.map(c => c.content).join('\n\n')}

Question: ${question}
`;

// 5. Call LLM
const answer = await callLLM(prompt);
```

---

## Best Practices

### 1. Always Generate Embeddings
```javascript
// GOOD: Generate embedding when add/update
const embedding = await getEmbedding(text);
await saveKnowledge(title, content, embedding);

// BAD: Save without embedding
await saveKnowledge(title, content, null);
```

### 2. Update Chunks After Changes
```javascript
// GOOD: Regenerate chunks
await updateKnowledge(id, title, content);
await updateChunksForKnowledge(id, title, content);

// BAD: Update without regenerating chunks
await updateKnowledge(id, title, content);
```

### 3. Use Transactions for Consistency
```javascript
// GOOD: Atomic operation
await connection.beginTransaction();
await updateKnowledge(...);
await updateChunks(...);
await connection.commit();

// BAD: Separate operations
await updateKnowledge(...);
await updateChunks(...);
```

---

## Performance Optimization

### 1. Index Strategy
```sql
-- Vector index for fast similarity search
CREATE INDEX idx_knowledge_embedding ON knowledge_base
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Full-text search index
CREATE INDEX idx_knowledge_fulltext ON knowledge_base
USING gin(to_tsvector('english', title || ' ' || content));
```

### 2. Hybrid Search
```javascript
// Combine vector + keyword search
const vectorResults = await vectorSearch(embedding);
const keywordResults = await fulltextSearch(keywords);
const combined = mergeAndRerank(vectorResults, keywordResults);
```

### 3. Caching
```javascript
// Cache embeddings
const cacheKey = `embedding:${text}`;
let embedding = await cache.get(cacheKey);
if (!embedding) {
  embedding = await getEmbedding(text);
  await cache.set(cacheKey, embedding, 86400);
}
```

---

## Cải tiến trong tương lai

1. **Multi-language Support**: Detect và handle nhiều ngôn ngữ
2. **Auto-tagging**: AI tự động tag documents
3. **Version Control**: Track changes to knowledge
4. **Collaborative Editing**: Multiple users edit
5. **Knowledge Graph**: Build relationships between docs
6. **Smart Chunking**: Context-aware chunking
7. **Reranking**: Cross-encoder reranking
8. **Feedback Loop**: Learn from user interactions
