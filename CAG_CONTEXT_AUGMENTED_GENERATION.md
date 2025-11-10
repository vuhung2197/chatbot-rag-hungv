# 🔄 Context-Augmented Generation (CAG) - Giải Pháp Áp Dụng Vào Chatbot

## 📋 Tổng Quan Về CAG

### **CAG là gì?**

**Context-Augmented Generation (CAG)** là một kỹ thuật nâng cao trong RAG system, tập trung vào việc **làm giàu và tối ưu hóa context** từ nhiều nguồn khác nhau trước khi generation để cải thiện chất lượng câu trả lời.

**Khác biệt với RAG truyền thống:**

| RAG Truyền Thống | CAG (Context-Augmented) |
|------------------|------------------------|
| Chỉ sử dụng knowledge base | Sử dụng nhiều nguồn context |
| Context đơn giản (chunks) | Context được làm giàu và tối ưu |
| Không có conversation context | Có conversation history context |
| Không có user context | Có user preferences/context |
| Không có external sources | Có thể tích hợp external APIs |
| Context không được ưu tiên | Context được scoring và ưu tiên |

---

## 🎯 Nguyên Lý Hoạt Động CAG

### **Luồng Xử Lý CAG**

```
User Question
    ↓
┌─────────────────────────────────────────┐
│  1. CONTEXT COLLECTION                  │
│  - Knowledge Base Chunks                │
│  - Conversation History                 │
│  - User Preferences                     │
│  - External Sources (optional)          │
│  - Domain-Specific Context              │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  2. CONTEXT ENRICHMENT                  │
│  - Semantic Expansion                   │
│  - Related Information Retrieval        │
│  - Context Linking                      │
│  - Temporal Context (if needed)         │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  3. CONTEXT SCORING & PRIORITIZATION    │
│  - Relevance Scoring                    │
│  - Coherence Scoring                    │
│  - Completeness Scoring                 │
│  - Recency Scoring (for time-sensitive) │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  4. CONTEXT COMPRESSION                 │
│  - Remove Redundancy                    │
│  - Summarize Long Contexts              │
│  - Priority-based Selection             │
│  - Token Limit Management               │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  5. CONTEXT FUSION                      │
│  - Multi-Source Integration             │
│  - Hierarchical Structuring             │
│  - Citation & Source Tracking           │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  6. GENERATION                          │
│  - Enhanced Prompt Construction         │
│  - Context-Aware Response               │
│  - Source Attribution                   │
└──────────────────┬──────────────────────┘
                   ↓
Final Response
```

---

## 🏗️ Kiến Trúc CAG Cho Chatbot

### **Các Nguồn Context**

#### **1. Knowledge Base Context (Hiện có)**
- **Source**: `knowledge_chunks` table
- **Method**: Vector search, multi-stage retrieval
- **Status**: ✅ Đã implement
- **Enhancement**: Cần thêm semantic expansion

#### **2. Conversation History Context (Mới)**
- **Source**: `user_questions` table (conversation history)
- **Method**: Retrieve recent messages from same conversation
- **Purpose**: Hiểu context của cuộc trò chuyện hiện tại
- **Status**: ❌ Chưa implement

#### **3. User Preferences Context (Mới)**
- **Source**: `user_preferences` table
- **Method**: Load user preferences (language, tone, style)
- **Purpose**: Personalize responses
- **Status**: ❌ Chưa implement

#### **4. External Sources Context (Tùy chọn)**
- **Source**: Web search APIs, external APIs
- **Method**: API calls for real-time information
- **Purpose**: Bổ sung thông tin cập nhật
- **Status**: ❌ Chưa implement

#### **5. Domain-Specific Context (Tùy chọn)**
- **Source**: Domain knowledge bases, glossaries
- **Method**: Domain-specific retrieval
- **Purpose**: Cải thiện accuracy cho domain cụ thể
- **Status**: ❌ Chưa implement

---

## 📐 Chi Tiết Từng Component

### **Component 1: Context Collection**

**Mục đích:** Thu thập context từ nhiều nguồn

**Input:**
- User question
- Conversation ID (nếu có)
- User ID
- Question metadata (complexity, domain)

**Process:**
```javascript
// Pseudo-code
contextSources = {
  knowledgeBase: await retrieveKnowledgeBaseChunks(question, embedding),
  conversationHistory: await retrieveConversationHistory(conversationId, limit=5),
  userPreferences: await retrieveUserPreferences(userId),
  externalSources: await retrieveExternalSources(question), // Optional
  domainContext: await retrieveDomainContext(question, domain) // Optional
}
```

**Implementation:**
```javascript
// backend/services/cagContextCollection.js

export async function collectContexts(question, userId, conversationId, questionEmbedding) {
  const contexts = {
    knowledgeBase: [],
    conversationHistory: [],
    userPreferences: null,
    externalSources: [],
    domainContext: []
  };

  // 1. Knowledge Base Context (existing)
  contexts.knowledgeBase = await retrieveKnowledgeBaseChunks(questionEmbedding);

  // 2. Conversation History Context (new)
  if (conversationId) {
    contexts.conversationHistory = await retrieveConversationHistory(conversationId, 5);
  }

  // 3. User Preferences Context (new)
  if (userId) {
    contexts.userPreferences = await retrieveUserPreferences(userId);
  }

  // 4. External Sources Context (optional, future)
  // if (needsExternalSources(question)) {
  //   contexts.externalSources = await retrieveExternalSources(question);
  // }

  // 5. Domain Context (optional, future)
  // if (hasDomain(question)) {
  //   contexts.domainContext = await retrieveDomainContext(question);
  // }

  return contexts;
}
```

---

### **Component 2: Context Enrichment**

**Mục đích:** Làm giàu context bằng cách tìm thông tin liên quan

**Input:**
- Collected contexts từ Component 1
- Question embedding

**Process:**
```javascript
// Pseudo-code
enrichedContexts = {
  knowledgeBase: await enrichKnowledgeBaseContext(contexts.knowledgeBase, question),
  conversationHistory: await enrichConversationHistory(contexts.conversationHistory, question),
  // ...
}
```

**Enrichment Strategies:**

1. **Semantic Expansion:**
   - Tìm chunks liên quan đến chunks đã có
   - Expand bằng cách tìm synonyms, related concepts

2. **Related Information Retrieval:**
   - Tìm thông tin bổ sung dựa trên entities trong question
   - Tìm definitions, examples, related topics

3. **Context Linking:**
   - Link các chunks có liên quan
   - Tạo context chains

**Implementation:**
```javascript
// backend/services/cagContextEnrichment.js

export async function enrichKnowledgeBaseContext(chunks, questionEmbedding) {
  const enrichedChunks = [...chunks];
  
  // 1. Semantic Expansion: Tìm chunks liên quan
  for (const chunk of chunks.slice(0, 3)) { // Limit to avoid too many calls
    const relatedChunks = await findRelatedChunks(chunk, 2);
    enrichedChunks.push(...relatedChunks);
  }

  // 2. Remove duplicates
  return removeDuplicateChunks(enrichedChunks);
}

export async function enrichConversationHistory(history, question) {
  // Filter và prioritize relevant history messages
  const relevantHistory = history.filter(msg => {
    // Check if message is relevant to current question
    return isRelevantToQuestion(msg, question);
  });

  return relevantHistory.slice(0, 3); // Top 3 relevant messages
}
```

---

### **Component 3: Context Scoring & Prioritization**

**Mục đích:** Đánh giá và ưu tiên context theo relevance

**Input:**
- Enriched contexts từ Component 2
- Question embedding
- Question text

**Scoring Factors:**

1. **Relevance Score (0-1):**
   - Semantic similarity với question
   - Keyword matching
   - Entity matching

2. **Coherence Score (0-1):**
   - Coherence với các contexts khác
   - Logical consistency

3. **Completeness Score (0-1):**
   - Độ đầy đủ thông tin
   - Coverage của question aspects

4. **Recency Score (0-1):**
   - Độ mới của thông tin (cho time-sensitive questions)
   - Timestamp của context

5. **Source Priority:**
   - Knowledge base: High priority
   - Conversation history: Medium priority
   - External sources: Low priority (optional)

**Implementation:**
```javascript
// backend/services/cagContextScoring.js

export function scoreContexts(contexts, questionEmbedding, question) {
  const scoredContexts = {
    knowledgeBase: contexts.knowledgeBase.map(chunk => ({
      ...chunk,
      relevanceScore: calculateRelevanceScore(chunk, questionEmbedding, question),
      coherenceScore: calculateCoherenceScore(chunk, contexts.knowledgeBase),
      completenessScore: calculateCompletenessScore(chunk, question),
      recencyScore: calculateRecencyScore(chunk),
      sourcePriority: 1.0, // High priority
      finalScore: 0
    })),
    conversationHistory: contexts.conversationHistory.map(msg => ({
      ...msg,
      relevanceScore: calculateRelevanceScore(msg, questionEmbedding, question),
      coherenceScore: 0.5, // Medium
      completenessScore: 0.3, // Low (conversation history is usually incomplete)
      recencyScore: calculateRecencyScore(msg),
      sourcePriority: 0.7, // Medium priority
      finalScore: 0
    })),
    // ... other sources
  };

  // Calculate final score for each context
  scoredContexts.knowledgeBase = scoredContexts.knowledgeBase.map(ctx => ({
    ...ctx,
    finalScore: (
      ctx.relevanceScore * 0.4 +
      ctx.coherenceScore * 0.2 +
      ctx.completenessScore * 0.2 +
      ctx.recencyScore * 0.1 +
      ctx.sourcePriority * 0.1
    )
  }));

  // Sort by final score
  scoredContexts.knowledgeBase.sort((a, b) => b.finalScore - a.finalScore);
  scoredContexts.conversationHistory.sort((a, b) => b.finalScore - a.finalScore);

  return scoredContexts;
}
```

---

### **Component 4: Context Compression**

**Mục đích:** Giảm context size nhưng giữ thông tin quan trọng

**Input:**
- Scored contexts từ Component 3
- Token limit (e.g., 4000 tokens)
- Priority threshold

**Compression Strategies:**

1. **Remove Redundancy:**
   - Remove duplicate information
   - Remove low-scoring contexts

2. **Summarize Long Contexts:**
   - Summarize conversation history nếu quá dài
   - Compress long chunks

3. **Priority-based Selection:**
   - Chọn top-N contexts theo score
   - Đảm bảo coverage của các aspects

4. **Token Limit Management:**
   - Đếm tokens và cắt bớt nếu vượt quá limit
   - Ưu tiên contexts có score cao

**Implementation:**
```javascript
// backend/services/cagContextCompression.js

export function compressContexts(scoredContexts, tokenLimit = 4000, minScore = 0.3) {
  const compressed = {
    knowledgeBase: [],
    conversationHistory: [],
    userPreferences: scoredContexts.userPreferences, // Keep as is
    metadata: {
      totalTokens: 0,
      sourcesUsed: []
    }
  };

  // 1. Filter by minimum score
  const filteredKB = scoredContexts.knowledgeBase.filter(ctx => ctx.finalScore >= minScore);
  const filteredHistory = scoredContexts.conversationHistory.filter(ctx => ctx.finalScore >= minScore);

  // 2. Select top contexts until token limit
  let tokensUsed = 0;
  
  // Add knowledge base contexts (high priority)
  for (const ctx of filteredKB) {
    const tokens = estimateTokens(ctx.content);
    if (tokensUsed + tokens <= tokenLimit * 0.7) { // Reserve 70% for KB
      compressed.knowledgeBase.push(ctx);
      tokensUsed += tokens;
      compressed.metadata.sourcesUsed.push({ type: 'knowledge_base', id: ctx.id });
    }
  }

  // Add conversation history (medium priority)
  for (const msg of filteredHistory) {
    const tokens = estimateTokens(msg.question + msg.bot_reply);
    if (tokensUsed + tokens <= tokenLimit * 0.9) { // Reserve 10% for history
      compressed.conversationHistory.push(msg);
      tokensUsed += tokens;
      compressed.metadata.sourcesUsed.push({ type: 'conversation_history', id: msg.id });
    }
  }

  compressed.metadata.totalTokens = tokensUsed;
  return compressed;
}
```

---

### **Component 5: Context Fusion**

**Mục đích:** Kết hợp contexts từ nhiều nguồn thành một context có cấu trúc

**Input:**
- Compressed contexts từ Component 4
- Question

**Fusion Strategies:**

1. **Hierarchical Structuring:**
   - Knowledge base contexts ở đầu (primary)
   - Conversation history ở giữa (supporting)
   - User preferences ở cuối (personalization)

2. **Multi-Source Integration:**
   - Combine contexts từ nhiều nguồn
   - Link related information

3. **Citation & Source Tracking:**
   - Track source của mỗi context
   - Add citations trong response

**Implementation:**
```javascript
// backend/services/cagContextFusion.js

export function fuseContexts(compressedContexts, question) {
  let fusedContext = '';

  // 1. Knowledge Base Context (Primary)
  if (compressedContexts.knowledgeBase.length > 0) {
    fusedContext += '# Thông tin từ Knowledge Base:\n\n';
    compressedContexts.knowledgeBase.forEach((chunk, index) => {
      fusedContext += `## [KB-${index + 1}] ${chunk.title || 'Chunk ' + (index + 1)}\n`;
      fusedContext += `${chunk.content}\n\n`;
      fusedContext += `*Score: ${chunk.finalScore.toFixed(2)}*\n\n`;
    });
  }

  // 2. Conversation History Context (Supporting)
  if (compressedContexts.conversationHistory.length > 0) {
    fusedContext += '# Ngữ cảnh từ cuộc trò chuyện:\n\n';
    compressedContexts.conversationHistory.forEach((msg, index) => {
      fusedContext += `## [HIST-${index + 1}] Câu hỏi trước: ${msg.question}\n`;
      fusedContext += `Trả lời: ${msg.bot_reply.substring(0, 200)}${msg.bot_reply.length > 200 ? '...' : ''}\n\n`;
    });
  }

  // 3. User Preferences Context (Personalization)
  if (compressedContexts.userPreferences) {
    fusedContext += '# Tùy chọn người dùng:\n\n';
    fusedContext += `- Ngôn ngữ ưa thích: ${compressedContexts.userPreferences.language || 'Tiếng Việt'}\n`;
    fusedContext += `- Phong cách: ${compressedContexts.userPreferences.tone || 'Chuyên nghiệp'}\n\n`;
  }

  // 4. Add metadata
  fusedContext += `\n# Metadata:\n`;
  fusedContext += `- Tổng số tokens: ${compressedContexts.metadata.totalTokens}\n`;
  fusedContext += `- Số nguồn: ${compressedContexts.metadata.sourcesUsed.length}\n`;

  return {
    context: fusedContext,
    metadata: compressedContexts.metadata,
    sources: compressedContexts.metadata.sourcesUsed
  };
}
```

---

### **Component 6: Generation**

**Mục đích:** Generate response với enhanced context

**Input:**
- Fused context từ Component 5
- Question
- User preferences
- Model configuration

**Enhanced Prompt Construction:**
```javascript
// backend/services/cagGeneration.js

export function constructEnhancedPrompt(question, fusedContext, userPreferences) {
  const systemPrompt = `Bạn là một trợ lý AI chuyên nghiệp với khả năng phân tích và kết hợp thông tin từ nhiều nguồn.

Hướng dẫn trả lời:
1. Sử dụng thông tin từ Knowledge Base làm nguồn chính
2. Tham khảo ngữ cảnh từ cuộc trò chuyện để hiểu rõ hơn
3. Tùy chỉnh phong cách theo preferences của người dùng
4. Trích dẫn nguồn khi cần thiết (ví dụ: [KB-1], [HIST-1])
5. Trả lời chính xác, ngắn gọn và có cấu trúc
6. Nếu thông tin không đủ, hãy nói rõ và đề xuất hướng tìm hiểu thêm

${userPreferences ? `Preferences: ${JSON.stringify(userPreferences)}` : ''}`;

  const userPrompt = `Thông tin ngữ cảnh (từ nhiều nguồn):
${fusedContext.context}

Câu hỏi: ${question}

Hãy trả lời câu hỏi dựa trên thông tin ngữ cảnh đã cung cấp.`;

  return {
    systemPrompt,
    userPrompt
  };
}
```

---

## 🔄 Tích Hợp Vào Kiến Trúc Hiện Tại

### **Option 1: CAG-Enhanced Advanced RAG (Recommended)**

**Thay đổi:**
- Thêm CAG layers trước Advanced RAG execution
- Giữ nguyên Advanced RAG execution (multi-stage retrieval, clustering, etc.)
- Thêm context enrichment và fusion

**Flow:**
```
Question
  ↓
[CAG Context Collection] → Knowledge Base + Conversation History + User Preferences
  ↓
[CAG Context Enrichment] → Semantic Expansion + Related Information
  ↓
[Advanced RAG Execution] → Multi-stage Retrieval + Clustering + Reasoning
  ↓
[CAG Context Scoring] → Relevance + Coherence + Completeness Scoring
  ↓
[CAG Context Compression] → Remove Redundancy + Token Management
  ↓
[CAG Context Fusion] → Multi-Source Integration
  ↓
[CAG Generation] → Enhanced Prompt + Response
  ↓
Final Response
```

**File Structure:**
```
backend/
  services/
    cagContextCollection.js      # Collect contexts from multiple sources
    cagContextEnrichment.js      # Enrich contexts
    cagContextScoring.js         # Score and prioritize contexts
    cagContextCompression.js     # Compress contexts
    cagContextFusion.js          # Fuse contexts
    cagGeneration.js             # Enhanced generation
    advancedRAGFixed.js          # Existing Advanced RAG (modified)
```

---

### **Option 2: CAG Mode (New)**

**Thay đổi:**
- Hoàn toàn mới, không dùng Advanced RAG
- Tập trung vào context augmentation

**Flow:**
```
Question
  ↓
[CAG Context Collection]
  ↓
[CAG Context Enrichment]
  ↓
[CAG Context Scoring]
  ↓
[CAG Context Compression]
  ↓
[CAG Context Fusion]
  ↓
[Simple Retrieval] (if needed)
  ↓
[CAG Generation]
  ↓
Final Response
```

**Ưu điểm:**
- Đơn giản hơn
- Tập trung vào context augmentation
- Token usage thấp hơn

**Nhược điểm:**
- Mất một số tính năng của Advanced RAG (clustering, multi-hop)

---

### **Option 3: Hybrid Mode (Best of Both Worlds)**

**Thay đổi:**
- CAG cho simple questions
- CAG + Advanced RAG cho complex questions

**Decision Logic:**
```javascript
if (questionComplexity === "simple") {
  // Use CAG only
  return cagFlow(question);
} else if (questionComplexity === "complex") {
  // Use CAG + Advanced RAG
  return cagEnhancedAdvancedRAG(question);
} else {
  // Use current Advanced RAG
  return advancedRAG(question);
}
```

---

## 💡 Lợi Ích Cụ Thể Cho Chatbot

### **1. Cải Thiện Chất Lượng Câu Trả Lời**

**Trước (Advanced RAG):**
- Chỉ sử dụng knowledge base
- Không có conversation context
- Không có user personalization

**Sau (CAG-Enhanced):**
- Sử dụng nhiều nguồn context
- Có conversation context → hiểu rõ hơn ngữ cảnh
- Có user personalization → responses phù hợp hơn

---

### **2. Giảm Hallucination**

**Trước:**
- LLM có thể hallucinate khi thiếu context
- Không có cách kiểm tra consistency

**Sau:**
- Nhiều nguồn context → giảm hallucination
- Context scoring → ưu tiên thông tin đáng tin cậy
- Source tracking → có thể verify thông tin

---

### **3. Tăng Personalization**

**Trước:**
- Responses generic, không personal

**Sau:**
- Sử dụng user preferences
- Sử dụng conversation history
- Responses phù hợp với user hơn

---

### **4. Better Context Understanding**

**Trước:**
- Mỗi question được xử lý độc lập
- Không hiểu context của cuộc trò chuyện

**Sau:**
- Sử dụng conversation history
- Hiểu được references trong conversation
- Responses coherent hơn

---

## 📊 Metrics & Evaluation

### **Metrics để Đo Lường**

1. **Quality Metrics:**
   - Answer relevance (0-1)
   - Answer completeness (0-1)
   - Answer coherence (0-1)
   - Hallucination rate (0-1)
   - User satisfaction (survey)

2. **Performance Metrics:**
   - Latency (ms)
   - Token usage per query
   - Context collection time
   - Context compression ratio

3. **Context Metrics:**
   - Number of context sources used
   - Context relevance score
   - Context coverage (question aspects)

### **A/B Testing**

**Test Groups:**
- **Group A**: Current Advanced RAG
- **Group B**: CAG-Enhanced Advanced RAG
- **Group C**: Pure CAG Mode

**Test Questions:**
- 50 simple questions
- 50 medium questions
- 50 complex questions
- 50 follow-up questions (trong conversation)

**Evaluation:**
- Compare quality, cost, latency
- User feedback
- Context usage analysis

---

## 🚧 Implementation Roadmap

### **Phase 1: Context Collection (2 weeks)**

**Week 1:**
- Implement `cagContextCollection.js`
- Add conversation history retrieval
- Add user preferences retrieval
- Unit tests

**Week 2:**
- Integration với existing Advanced RAG
- End-to-end testing
- Performance optimization

---

### **Phase 2: Context Enrichment & Scoring (2 weeks)**

**Week 1:**
- Implement `cagContextEnrichment.js`
- Implement `cagContextScoring.js`
- Semantic expansion logic
- Scoring algorithms

**Week 2:**
- Integration testing
- Fine-tune scoring weights
- Performance optimization

---

### **Phase 3: Context Compression & Fusion (2 weeks)**

**Week 1:**
- Implement `cagContextCompression.js`
- Implement `cagContextFusion.js`
- Token management
- Multi-source integration

**Week 2:**
- Integration testing
- Fine-tune compression strategies
- Performance optimization

---

### **Phase 4: Generation & Integration (2 weeks)**

**Week 1:**
- Implement `cagGeneration.js`
- Enhanced prompt construction
- Integration với `advancedChatController.js`
- Update API endpoints

**Week 2:**
- A/B testing setup
- Collect metrics
- User feedback collection
- Fine-tune based on results

---

### **Phase 5: Optimization & Production (1-2 weeks)**

**Week 1:**
- Optimize performance
- Reduce latency
- Improve token usage
- Documentation

**Week 2:**
- Production deployment
- Monitoring setup
- Continuous improvement

---

## ⚠️ Challenges & Mitigation

### **Challenge 1: Increased Latency**

**Problem:**
- CAG có thêm nhiều steps (collection, enrichment, scoring, compression, fusion)
- Có thể tăng latency từ 3-5s lên 6-10s

**Mitigation:**
- Parallel execution khi có thể (collect contexts in parallel)
- Cache conversation history và user preferences
- Optimize context enrichment (limit số chunks được enrich)
- Use async/await efficiently

---

### **Challenge 2: Token Usage**

**Problem:**
- Nhiều nguồn context → nhiều tokens hơn
- Có thể tăng cost

**Mitigation:**
- Context compression để giảm tokens
- Priority-based selection (chỉ chọn contexts có score cao)
- Token limit management
- Summarize long contexts

---

### **Challenge 3: Context Quality**

**Problem:**
- Conversation history có thể không relevant
- User preferences có thể không accurate

**Mitigation:**
- Context scoring để filter low-quality contexts
- Minimum score threshold
- Regular update user preferences
- Validate conversation history relevance

---

### **Challenge 4: Complexity**

**Problem:**
- Code phức tạp hơn
- Khó maintain

**Mitigation:**
- Modular design
- Clear separation of concerns
- Comprehensive documentation
- Unit tests cho mỗi component

---

## 🎯 Recommendation

### **Recommended Approach: Option 1 (CAG-Enhanced Advanced RAG)**

**Lý do:**
1. ✅ Tận dụng được Advanced RAG hiện có
2. ✅ Cải thiện chất lượng mà không mất tính năng
3. ✅ Có thể rollback dễ dàng nếu cần
4. ✅ Incremental improvement

**Implementation Priority:**
1. **Phase 1**: Context Collection (conversation history + user preferences)
2. **Phase 2**: Context Scoring & Prioritization
3. **Phase 3**: Context Compression & Fusion
4. **Phase 4**: Generation & Integration
5. **Phase 5**: Optimization

**Next Steps:**
1. Implement conversation history retrieval
2. Implement user preferences retrieval
3. Add context scoring
4. Add context fusion
5. Integrate với Advanced RAG
6. A/B testing
7. Production deployment

---

## 📚 Database Schema Changes

### **1. Conversation History Retrieval**

**Existing Table: `user_questions`**
```sql
-- Already has: user_id, conversation_id, question, bot_reply, created_at
-- No changes needed
```

### **2. User Preferences**

**Existing Table: `user_preferences`**
```sql
-- Already has: user_id, preferences (JSON)
-- No changes needed, but may need to add more fields:
ALTER TABLE user_preferences 
  ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'vi',
  ADD COLUMN IF NOT EXISTS tone VARCHAR(20) DEFAULT 'professional',
  ADD COLUMN IF NOT EXISTS response_length VARCHAR(20) DEFAULT 'medium';
```

### **3. Context Metadata (Optional)**

**New Table: `context_usage_log`**
```sql
CREATE TABLE IF NOT EXISTS context_usage_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  conversation_id VARCHAR(36),
  question_id INT,
  context_source VARCHAR(50) NOT NULL, -- 'knowledge_base', 'conversation_history', etc.
  context_id INT,
  relevance_score DECIMAL(3,2),
  final_score DECIMAL(3,2),
  tokens_used INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_conversation_id (conversation_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES user_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

---

## ✅ Summary

**Context-Augmented Generation (CAG)** là một kỹ thuật nâng cao để cải thiện chất lượng chatbot RAG:

- ✅ **Multi-source context**: Sử dụng nhiều nguồn context (knowledge base, conversation history, user preferences)
- ✅ **Context enrichment**: Làm giàu context bằng semantic expansion và related information
- ✅ **Context scoring**: Đánh giá và ưu tiên context theo relevance, coherence, completeness
- ✅ **Context compression**: Giảm context size nhưng giữ thông tin quan trọng
- ✅ **Context fusion**: Kết hợp contexts từ nhiều nguồn thành một context có cấu trúc
- ✅ **Enhanced generation**: Generate response với enhanced context

**Recommended Implementation:**
- **Option 1**: CAG-Enhanced Advanced RAG
- **Timeline**: 9-11 weeks
- **Expected Improvement**: 
  - 20-30% quality improvement
  - 15-25% reduction in hallucination
  - 10-20% improvement in personalization
  - 5-10% increase in cost (due to more context)

**Next Steps:**
1. Implement conversation history retrieval
2. Implement user preferences retrieval
3. Add context scoring and prioritization
4. Add context compression and fusion
5. Integrate với Advanced RAG
6. A/B testing
7. Production deployment

