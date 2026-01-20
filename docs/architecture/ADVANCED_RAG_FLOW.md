# 🔄 Luồng Xử Lý Advanced RAG - Chi Tiết

## 📋 Tổng Quan

**Advanced RAG** là hệ thống RAG nâng cao với khả năng xử lý câu hỏi phức tạp bằng cách:
- **Multi-Stage Retrieval**: Lấy chunks theo nhiều giai đoạn với threshold khác nhau
- **Semantic Clustering**: Nhóm chunks theo chủ đề để tìm mối liên kết
- **Multi-Hop Reasoning**: Tìm thông tin liên quan dựa trên chunks đã có
- **Context Re-ranking**: Sắp xếp lại chunks theo relevance, coherence, và completeness
- **Context Fusion**: Kết hợp thông minh các chunks thành context có cấu trúc

---

## 🏗️ Luồng Xử Lý Tổng Thể

```
┌─────────────────────────────────────────────────────────────┐
│                    USER QUESTION                             │
│                  {message, model, userId}                     │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │  1. EMBEDDING GENERATION             │
        │  - Convert question → vector          │
        │  - API: OpenAI text-embedding-3-small │
        │  - Output: questionEmbedding[1536]    │
        └──────────────────┬───────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │  2. ADAPTIVE RETRIEVAL               │
        │  - Analyze question complexity        │
        │  - Determine retrieval parameters     │
        │  - Output: retrievalParams           │
        │    {maxChunks, threshold,             │
        │     useMultiHop, useSemanticClustering}│
        └──────────────────┬───────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │  3. MULTI-STAGE RETRIEVAL             │
        │  Stage 1: threshold=0.7, topK=5      │
        │  Stage 2: threshold=0.5, topK=8      │
        │  Stage 3: threshold=0.3, topK=12      │
        │  - Output: allChunks[]                │
        └──────────────────┬───────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │  4. SEMANTIC CLUSTERING               │
        │  - Group chunks by topic              │
        │  - Calculate similarity matrix        │
        │  - Output: clusters[][]              │
        └──────────────────┬───────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │  5. MULTI-HOP REASONING (Optional)   │
        │  - Find related chunks               │
        │  - Build reasoning chains            │
        │  - Output: reasoningChains[]         │
        └──────────────────┬───────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │  6. CONTEXT RE-RANKING                │
        │  - Calculate relevance score          │
        │  - Calculate coherence score          │
        │  - Calculate completeness score       │
        │  - Combine: 0.4*relevance +           │
        │             0.3*coherence +            │
        │             0.3*completeness            │
        │  - Output: rerankedChunks[]           │
        └──────────────────┬───────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │  7. CONTEXT FUSION                   │
        │  - Group chunks by topic              │
        │  - Add reasoning chains               │
        │  - Output: fusedContext (string)      │
        └──────────────────┬───────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │  8. CONTEXT TRUNCATION               │
        │  - Limit to 6000 chars               │
        │  - Preserve most relevant chunks     │
        └──────────────────┬───────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │  9. LLM GENERATION                   │
        │  - Build prompt với system + context  │
        │  - Call LLM (OpenAI/Ollama)          │
        │  - Timeout: 180s                     │
        │  - Output: reply (string)            │
        └──────────────────┬───────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │  10. MARKDOWN FORMATTING             │
        │  - Convert to markdown                │
        │  - Format headers, lists, code        │
        └──────────────────┬───────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │  11. RESPONSE                       │
        │  {                                   │
        │    reply,                            │
        │    reasoning_steps,                  │
        │    chunks_used[],                    │
        │    metadata{}                        │
        │  }                                   │
        └──────────────────────────────────────┘
```

---

## 📝 Chi Tiết Từng Bước

### **Bước 1: Embedding Generation**

**File**: `backend/controllers/advancedChatController.js` (line 101-112)  
**Service**: `backend/services/embeddingVector.js`

```javascript
// Input
const message = "So sánh RAG và fine-tuning";

// Process
const questionEmbedding = await getEmbedding(message);
// API Call: POST https://api.openai.com/v1/embeddings
// Model: text-embedding-3-small
// Cost: ~$0.001 per query

// Output
questionEmbedding = [0.012, -0.045, 0.089, ..., 0.023] // 1536 dimensions
```

**Đặc điểm:**
- ⏱️ **Latency**: 200-500ms
- 💰 **Cost**: $0.02 per 1M tokens
- ❌ **Error Handling**: Return error nếu API fail

**Error Cases:**
- API timeout → Return error message
- Invalid API key → Return error message
- Network error → Return error message

---

### **Bước 2: Adaptive Retrieval**

**File**: `backend/services/advancedRAGFixed.js` (line 215-254)  
**Function**: `adaptiveRetrieval(question, questionEmbedding)`

```javascript
// Input
const question = "So sánh RAG và fine-tuning";
const questionEmbedding = [0.012, -0.045, ...];

// Process
const complexity = analyzeQuestionComplexity(question);
// Checks for:
// - "so sánh", "khác biệt", "mối quan hệ" → isComplex = true
// - Multiple "và", "với", "kết hợp" → hasMultipleTopics = true
// - "tại sao", "như thế nào", "giải thích" → requiresReasoning = true

// Output
const retrievalParams = {
  maxChunks: 10,           // Increased if complex
  threshold: 0.3,          // Lower if complex
  useMultiHop: true,       // If complex or requires reasoning
  useSemanticClustering: true // If has multiple topics
};
```

**Logic:**
- **Simple question**: maxChunks=5, threshold=0.5, useMultiHop=false
- **Complex question**: maxChunks=10, threshold=0.3, useMultiHop=true
- **Multiple topics**: maxChunks=15, useSemanticClustering=true
- **Requires reasoning**: useMultiHop=true, useSemanticClustering=true

---

### **Bước 3: Multi-Stage Retrieval**

**File**: `backend/services/advancedRAGFixed.js` (line 14-52)  
**Function**: `multiStageRetrieval(questionEmbedding, question, maxChunks)`

```javascript
// Input
const questionEmbedding = [0.012, -0.045, ...];
const question = "So sánh RAG và fine-tuning";
const maxChunks = 10;

// Process
const stages = [
  { topK: 5, threshold: 0.7, name: 'high_similarity' },
  { topK: 8, threshold: 0.5, name: 'medium_similarity' },
  { topK: 12, threshold: 0.3, name: 'low_similarity' }
];

// For each stage:
// 1. Query database: SELECT ... LIMIT topK*2
// 2. Calculate cosine similarity for each chunk
// 3. Filter by threshold
// 4. Sort by score
// 5. Take topK

// Output
const allChunks = [
  {
    id: 123,
    title: "RAG Overview",
    content: "Retrieval-Augmented Generation...",
    score: 0.85,
    retrieval_stage: "high_similarity",
    embedding: [0.015, -0.042, ...]
  },
  // ... more chunks
].slice(0, maxChunks); // Max 10 chunks
```

**Đặc điểm:**
- ⏱️ **Latency**: 50-200ms per stage = 150-600ms total
- 📊 **Coverage**: Progressive retrieval ensures good coverage
- 🔄 **Deduplication**: Remove duplicates by (id, title)

**Error Handling:**
- If stage fails → Continue with next stage
- If all stages fail → Return empty array

---

### **Bước 4: Semantic Clustering**

**File**: `backend/services/advancedRAGFixed.js` (line 58-124)  
**Function**: `semanticClustering(chunks, questionEmbedding)`

```javascript
// Input
const chunks = [
  { id: 1, title: "RAG", content: "...", embedding: [...] },
  { id: 2, title: "Fine-tuning", content: "...", embedding: [...] },
  { id: 3, title: "RAG Applications", content: "...", embedding: [...] }
];

// Process
// 1. Get embeddings for each chunk (if not available)
for (let i = 0; i < chunks.length; i++) {
  const embedding = await getEmbedding(chunks[i].content); // ⚠️ Expensive!
  chunkEmbeddings.push(embedding);
}

// 2. Calculate similarity matrix
const similarityMatrix = [];
for (let i = 0; i < chunks.length; i++) {
  for (let j = 0; j < chunks.length; j++) {
    similarityMatrix[i][j] = cosineSimilarity(
      chunkEmbeddings[i], 
      chunkEmbeddings[j]
    );
  }
}

// 3. Cluster chunks with similarity > 0.6
const clusters = [];
// Group chunks that are similar to each other

// Output
const clusters = [
  [chunk1, chunk3], // RAG-related chunks
  [chunk2]          // Fine-tuning chunk
];
```

**Đặc điểm:**
- ⏱️ **Latency**: 1-3s (depends on number of chunks)
- 💰 **Cost**: N chunks × $0.001 = High cost!
- ⚠️ **Issue**: Gọi embedding API cho mỗi chunk (có thể reuse existing embeddings)

**Error Handling:**
- If embedding fails → Use existing embedding if available
- If clustering fails → Return single cluster with all chunks

---

### **Bước 5: Multi-Hop Reasoning (Optional)**

**File**: `backend/services/advancedRAGFixed.js` (line 130-161)  
**Function**: `multiHopReasoning(initialChunks, questionEmbedding, question)`

```javascript
// Input
const initialChunks = [chunk1, chunk2, chunk3]; // Top 3 chunks
const questionEmbedding = [0.012, -0.045, ...];
const question = "So sánh RAG và fine-tuning";

// Process (only if retrievalParams.useMultiHop === true)
// For each initial chunk:
for (const chunk of initialChunks.slice(0, 3)) {
  // 1. Find related chunks
  const relatedChunks = await findRelatedChunks(chunk, 3);
  // Query: SELECT ... WHERE id != chunk.id
  // Calculate similarity with chunk.embedding
  // Filter similarity > 0.4
  
  // 2. Calculate reasoning score
  const reasoningScore = calculateReasoningScore(
    chunk, 
    relatedChunks, 
    questionEmbedding
  );
  // Formula: baseScore * 0.6 + avgRelatedScore * 0.4
  
  // 3. Build reasoning chain
  const chain = {
    source_chunk: chunk,
    related_chunks: relatedChunks,
    reasoning_score: reasoningScore
  };
  
  reasoningChains.push(chain);
}

// Sort by reasoning score
reasoningChains.sort((a, b) => b.reasoning_score - a.reasoning_score);

// Output
const reasoningChains = [
  {
    source_chunk: chunk1,
    related_chunks: [chunk4, chunk5],
    reasoning_score: 0.78
  },
  // ... top 3 chains
];
```

**Đặc điểm:**
- ⏱️ **Latency**: 200-500ms per chunk = 600-1500ms total
- 🔗 **Purpose**: Find connections between chunks
- 📊 **Limitation**: Limited to top 3 chunks to avoid timeout

**Error Handling:**
- If reasoning fails for one chunk → Continue with others
- If all fail → Return empty array (continue without reasoning)

---

### **Bước 6: Context Re-ranking**

**File**: `backend/services/advancedRAGFixed.js` (line 260-291)  
**Function**: `rerankContext(chunks, questionEmbedding, question)`

```javascript
// Input
const chunks = [chunk1, chunk2, ..., chunk10];
const questionEmbedding = [0.012, -0.045, ...];
const question = "So sánh RAG và fine-tuning";

// Process
const rerankedChunks = chunks.map(chunk => {
  // 1. Relevance Score (from vector search)
  const relevanceScore = chunk.score || 0; // 0.85
  
  // 2. Coherence Score (similarity with other chunks)
  const coherenceScore = calculateCoherenceScore(chunk, chunks);
  // Average similarity với các chunks khác
  // Formula: avg(cosineSimilarity(chunk.embedding, other.embedding))
  
  // 3. Completeness Score (keyword matching)
  const completenessScore = calculateCompletenessScore(chunk, question);
  // Count matching words / total words
  // Formula: matchedWords.length / questionWords.length
  
  // 4. Combined Score
  const finalScore = (
    relevanceScore * 0.4 +    // 40% weight
    coherenceScore * 0.3 +     // 30% weight
    completenessScore * 0.3    // 30% weight
  );
  
  return {
    ...chunk,
    final_score: finalScore,
    relevance_score: relevanceScore,
    coherence_score: coherenceScore,
    completeness_score: completenessScore
  };
}).sort((a, b) => b.final_score - a.final_score);

// Output
const rerankedChunks = [
  { id: 1, title: "RAG", final_score: 0.82, ... },
  { id: 2, title: "Fine-tuning", final_score: 0.78, ... },
  // ... sorted by final_score
];
```

**Đặc điểm:**
- ⏱️ **Latency**: 10-50ms (fast, in-memory calculation)
- 📊 **Weight Distribution**: 40% relevance, 30% coherence, 30% completeness
- 🎯 **Purpose**: Ensure most relevant chunks come first

**Limitations:**
- Completeness score chỉ dùng keyword matching (không semantic)
- Có thể improve bằng BM25 hoặc TF-IDF

---

### **Bước 7: Context Fusion**

**File**: `backend/services/advancedRAGFixed.js` (line 167-209)  
**Function**: `fuseContext(chunks, reasoningChains, question)`

```javascript
// Input
const chunks = [chunk1, chunk2, ...]; // Re-ranked chunks
const reasoningChains = [chain1, chain2, ...]; // Optional
const question = "So sánh RAG và fine-tuning";

// Process
let context = `# Thông tin chính:\n\n`;

// 1. Group chunks by topic
const topicGroups = groupChunksByTopic(chunks);
// Topics: "NLP", "AI", "Machine Learning", "Chatbot", "Vector Search", "Khác"
// Extract topic from title + content

// 2. Add chunks by topic
for (const [topic, topicChunks] of Object.entries(topicGroups)) {
  context += `## ${topic}:\n`;
  
  topicChunks.forEach((chunk, index) => {
    context += `### ${chunk.title || `Chunk ${index + 1}`}\n`;
    context += `${chunk.content}\n\n`;
  });
}

// 3. Add reasoning chains (if available)
if (reasoningChains && reasoningChains.length > 0) {
  context += `# Mối liên kết thông tin:\n\n`;
  
  reasoningChains.forEach((chain, index) => {
    context += `## Liên kết ${index + 1}:\n`;
    context += `**Nguồn chính:** ${chain.source_chunk.title}\n`;
    context += `**Nội dung:** ${chain.source_chunk.content}\n\n`;
    
    if (chain.related_chunks && chain.related_chunks.length > 0) {
      context += `**Thông tin liên quan:**\n`;
      chain.related_chunks.forEach(related => {
        context += `- ${related.title}: ${related.content.substring(0, 200)}...\n`;
      });
      context += `\n`;
    }
  });
}

// Output
const fusedContext = `
# Thông tin chính:

## AI:
### RAG Overview
Retrieval-Augmented Generation...

### Fine-tuning Overview
Fine-tuning is...

# Mối liên kết thông tin:

## Liên kết 1:
**Nguồn chính:** RAG Overview
**Nội dung:** ...
**Thông tin liên quan:**
- RAG Applications: ...
`;
```

**Đặc điểm:**
- 📝 **Format**: Structured markdown với headers
- 🎯 **Organization**: Grouped by topic for clarity
- 🔗 **Reasoning**: Include connections between chunks

**Error Handling:**
- If fusion fails → Fallback to simple context: `**${title}**: ${content}`

---

### **Bước 8: Context Truncation**

**File**: `backend/controllers/advancedChatController.js` (line 283-291)  
**Function**: `askAdvancedChatGPT()`

```javascript
// Input
const fusedContext = "..."; // Potentially very long (>10000 chars)

// Process
const maxContextLength = 6000; // Hard-coded limit
const truncatedContext = fusedContext.length > maxContextLength 
  ? `${fusedContext.substring(0, maxContextLength)}...` 
  : fusedContext;

// ⚠️ Issue: Truncation từ đầu → Có thể mất thông tin quan trọng
// Better: Keep most relevant chunks first (đã được re-ranked)

// Output
const truncatedContext = "..."; // Max 6000 chars
```

**Đặc điểm:**
- 📏 **Limit**: 6000 characters (hard-coded)
- ⚠️ **Issue**: Simple truncation, không intelligent
- 💡 **Improvement**: Smart truncation based on chunk scores

---

### **Bước 9: LLM Generation**

**File**: `backend/controllers/advancedChatController.js` (line 283-319)  
**Function**: `askAdvancedChatGPT(question, context, systemPrompt, model)`

```javascript
// Input
const question = "So sánh RAG và fine-tuning";
const context = "..."; // Truncated context (6000 chars)
const systemPrompt = `Bạn là một trợ lý AI chuyên nghiệp...`;
const model = {
  name: "gpt-4o",
  url: "https://api.openai.com/v1",
  temperature: 0.3,
  maxTokens: 800
};

// Process
const prompt = `# Câu hỏi: ${question}

# Thông tin tham khảo:
${truncatedContext}

# Hướng dẫn:
Hãy phân tích câu hỏi và sử dụng thông tin tham khảo để tạo câu trả lời toàn diện.
Kết hợp thông tin từ nhiều nguồn một cách logic và có cấu trúc.`;

const messages = [
  { 
    role: 'system', 
    content: systemPrompt.substring(0, 4000) // Max 4000 chars
  },
  { 
    role: 'user', 
    content: prompt.substring(0, 8000) // Max 8000 chars
  }
];

// Call LLM with timeout
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('LLM call timeout')), 180000)
);

const llmPromise = callLLM(model, messages, 0.3, 800);
const reply = await Promise.race([llmPromise, timeoutPromise]);

// Output
const reply = `
RAG (Retrieval-Augmented Generation) và Fine-tuning là hai phương pháp...
`;
```

**Đặc điểm:**
- ⏱️ **Latency**: 1-3s (depends on LLM)
- 💰 **Cost**: ~$0.003 per query (depends on tokens)
- ⏱️ **Timeout**: 180s (3 minutes)
- 🔒 **Error Handling**: Comprehensive error messages

**Error Handling:**
- API error → "Lỗi kết nối với model: ..."
- Timeout → "Model mất quá nhiều thời gian..."
- Other errors → "Xin lỗi, tôi gặp sự cố..."

---

### **Bước 10: Markdown Formatting**

**File**: `backend/controllers/advancedChatController.js` (line 24-65)  
**Function**: `toAdvancedMarkdown(text)`

```javascript
// Input
const reply = `
RAG và Fine-tuning là hai phương pháp khác nhau.

- RAG: Sử dụng external knowledge
- Fine-tuning: Train model với custom data

\`\`\`python
def rag_example():
    return "Hello"
\`\`\`
`;

// Process
// 1. Split into paragraphs
// 2. Detect headers (# ## ###)
// 3. Detect lists (- * •)
// 4. Detect code blocks (```)
// 5. Format accordingly

// Output
const markdown = `
RAG và Fine-tuning là hai phương pháp khác nhau.

- RAG: Sử dụng external knowledge
- Fine-tuning: Train model với custom data

\`\`\`python
def rag_example():
    return "Hello"
\`\`\`
`;
```

**Đặc điểm:**
- 📝 **Format**: Clean markdown output
- 🎨 **Styling**: Headers, lists, code blocks
- ✅ **Preservation**: Keeps original structure

---

### **Bước 11: Response**

**File**: `backend/controllers/advancedChatController.js` (line 248-268)

```javascript
// Output
res.json({ 
  reply: toAdvancedMarkdown(reply),              // Formatted response
  reasoning_steps: [                              // Debug info
    `Retrieved ${allChunks.length} chunks using multi-stage retrieval`,
    `Created ${clusters.length} semantic clusters`,
    `Generated ${reasoningChains.length} reasoning chains`,
    `Fused context with ${fusedContext.length} characters`,
    `Generated response using advanced RAG with model ${model.name}`
  ],
  chunks_used: rerankedChunks.map(c => ({        // Chunks used for response
    id: c.id,
    title: c.title,
    content: c.content.substring(0, 200) + '...',
    score: c.final_score || c.score,
    stage: c.retrieval_stage,
    source: c.source || 'unknown',
    chunk_index: c.chunk_index || 0
  })),
  metadata: {                                    // Processing metadata
    total_chunks: allChunks.length,
    clusters: clusters.length,
    reasoning_chains: reasoningChains.length,
    processing_time: t1 - t0,                    // Total processing time
    model_used: model.name,
    context_length: fusedContext.length
  }
});
```

**Response Structure:**
```json
{
  "reply": "Markdown formatted response...",
  "reasoning_steps": [
    "Retrieved 10 chunks...",
    "Created 3 semantic clusters...",
    "..."
  ],
  "chunks_used": [
    {
      "id": 123,
      "title": "RAG Overview",
      "content": "Retrieval-Augmented Generation...",
      "score": 0.85,
      "stage": "high_similarity",
      "source": "unknown",
      "chunk_index": 0
    }
  ],
  "metadata": {
    "total_chunks": 10,
    "clusters": 3,
    "reasoning_chains": 2,
    "processing_time": 3456,
    "model_used": "gpt-4o",
    "context_length": 5842
  }
}
```

---

## ⏱️ Performance Timeline

### **Typical Flow (Simple Question)**
```
Step 1: Embedding          200ms
Step 2: Adaptive Retrieval 10ms
Step 3: Multi-Stage       150ms
Step 4: Clustering        200ms (skip if <3 chunks)
Step 5: Reasoning         0ms (skip)
Step 6: Re-ranking        20ms
Step 7: Fusion             10ms
Step 8: Truncation         5ms
Step 9: LLM               1500ms
Step 10: Markdown          5ms
───────────────────────────────
Total:                    ~2100ms (2.1s)
```

### **Complex Flow (Complex Question)**
```
Step 1: Embedding          300ms
Step 2: Adaptive Retrieval 15ms
Step 3: Multi-Stage        300ms (more chunks)
Step 4: Clustering        2000ms (N embedding calls)
Step 5: Reasoning         1000ms (3 chains)
Step 6: Re-ranking        50ms (more chunks)
Step 7: Fusion             20ms
Step 8: Truncation         10ms
Step 9: LLM               2500ms (longer context)
Step 10: Markdown          10ms
───────────────────────────────
Total:                    ~6205ms (6.2s)
```

---

## 🔍 Error Handling Flow

```
User Question
    ↓
Try Block (Main)
    ├─→ Step 1: Embedding
    │   ├─→ Success: Continue
    │   └─→ Error: Return error message
    │
    ├─→ Step 2: Adaptive Retrieval
    │   ├─→ Success: Continue
    │   └─→ Error: Use default params
    │
    ├─→ Step 3: Multi-Stage Retrieval
    │   ├─→ Success: Continue
    │   ├─→ Empty chunks: Return "No knowledge"
    │   └─→ Error: Return empty chunks
    │
    ├─→ Step 4: Semantic Clustering
    │   ├─→ Success: Continue
    │   └─→ Error: Fallback to single cluster
    │
    ├─→ Step 5: Multi-Hop Reasoning
    │   ├─→ Success: Continue
    │   └─→ Error: Continue without reasoning
    │
    ├─→ Step 6: Context Re-ranking
    │   ├─→ Success: Continue
    │   └─→ Error: Use original chunks
    │
    ├─→ Step 7: Context Fusion
    │   ├─→ Success: Continue
    │   └─→ Error: Fallback to simple context
    │
    ├─→ Step 9: LLM Generation
    │   ├─→ Success: Continue
    │   ├─→ API Error: Return error message
    │   ├─→ Timeout: Return timeout message
    │   └─→ Other Error: Return generic error
    │
    └─→ Response
        │
        └─→ Catch Block (Overall)
            └─→ Return generic error message
```

---

## 📊 Data Structures

### **Chunk Structure**
```typescript
interface Chunk {
  id: number;
  title: string;
  content: string;
  embedding: number[];              // 1536 dimensions
  score?: number;                    // Similarity score
  final_score?: number;              // Combined re-ranking score
  relevance_score?: number;          // From vector search
  coherence_score?: number;          // From coherence calculation
  completeness_score?: number;       // From keyword matching
  retrieval_stage?: string;          // "high_similarity" | "medium" | "low"
  source?: string;                   // Source document
  chunk_index?: number;              // Index in document
}
```

### **Retrieval Parameters**
```typescript
interface RetrievalParams {
  maxChunks: number;                 // 5 | 10 | 15
  threshold: number;                 // 0.3 | 0.5
  useMultiHop: boolean;              // true | false
  useSemanticClustering: boolean;    // true | false
}
```

### **Reasoning Chain**
```typescript
interface ReasoningChain {
  source_chunk: Chunk;
  related_chunks: Chunk[];
  reasoning_score: number;           // 0-1
}
```

### **Complexity Analysis**
```typescript
interface Complexity {
  isComplex: boolean;                // Has "so sánh", "khác biệt"
  hasMultipleTopics: boolean;        // Multiple "và", "với"
  requiresReasoning: boolean;         // Has "tại sao", "như thế nào"
}
```

---

## 💡 Optimization Opportunities

### **1. Embedding Cache** ⭐⭐⭐
- **Current**: Gọi API mỗi query
- **Improvement**: Cache embeddings với Redis
- **Impact**: 70-90% cost reduction

### **2. Reuse Chunk Embeddings** ⭐⭐⭐
- **Current**: Gọi API cho mỗi chunk trong clustering
- **Improvement**: Reuse existing chunk embeddings
- **Impact**: 100% cost savings cho clustering

### **3. Smart Context Truncation** ⭐⭐
- **Current**: Simple substring truncation
- **Improvement**: Keep most relevant chunks first
- **Impact**: Better quality, no info loss

### **4. BM25 Completeness Score** ⭐⭐
- **Current**: Simple keyword matching
- **Improvement**: Use BM25 scoring
- **Impact**: 10-20% better retrieval accuracy

### **5. Parallel Processing** ⭐
- **Current**: Sequential processing
- **Improvement**: Parallel stage retrieval
- **Impact**: 30-50% faster

---

## 🔗 Related Files

- **Controller**: `backend/controllers/advancedChatController.js`
- **Service**: `backend/services/advancedRAGFixed.js`
- **Embedding**: `backend/services/embeddingVector.js`
- **Vector Search**: `backend/services/vectorDatabase.js`
- **LLM Call**: `backend/controllers/chatController.js` (callLLM)

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Maintainer**: Development Team

