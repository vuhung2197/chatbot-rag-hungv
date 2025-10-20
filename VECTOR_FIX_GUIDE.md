# 🔧 Hướng Dẫn Sửa Lỗi Vector Search

## 🚨 VẤN ĐỀ PHÁT HIỆN

### **1. Lỗi trong `cachedVectorSearch`**
- ❌ String concatenation không đúng cách
- ❌ Console statements vi phạm linting

### **2. Lỗi trong `searchSimilarVectors`**
- ❌ SQL syntax không tương thích với MySQL
- ❌ Vector distance operator `<-` không được hỗ trợ

### **3. Luồng xử lý chat**
- ❌ Fallback mechanism không hoạt động đúng
- ❌ Error handling không đầy đủ

## ✅ GIẢI PHÁP ĐÃ THỰC HIỆN

### **1. Sửa `cachedVectorSearch`**
```javascript
// ❌ TRƯỚC
const cacheKey = JSON.stringify(questionEmbedding) + `_${topK}`;

// ✅ SAU
const cacheKey = `${JSON.stringify(questionEmbedding)}_${topK}`;
```

### **2. Sửa `searchSimilarVectors`**
```javascript
// ❌ TRƯỚC - SQL không tương thích
const [rows] = await pool.execute(`
  SELECT id, title, content, embedding,
    (embedding <-> ?) as distance
  FROM knowledge_chunks 
  WHERE (embedding <-> ?) < ?
  ORDER BY distance ASC
  LIMIT ?
`);

// ✅ SAU - Fallback similarity search
const [rows] = await pool.execute(`
  SELECT id, title, content, embedding
  FROM knowledge_chunks 
  WHERE embedding IS NOT NULL
  LIMIT ?
`, [topK * 3]);
```

### **3. Thêm Cosine Similarity Function**
```javascript
function cosineSimilarity(a, b, eps = 1e-12) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;

  let dot = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = Number(a[i]);
    const y = Number(b[i]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return 0;
    dot += x * y;
    aa += x * x;
    bb += y * y;
  }

  const denom = Math.sqrt(aa) * Math.sqrt(bb);
  if (denom < eps) return 0;

  const s = dot / denom;
  return Math.max(-1, Math.min(1, s));
}
```

## 🧪 KIỂM TRA LUỒNG XỬ LÝ

### **1. Setup Database**
```bash
# Chạy script setup
node backend/setup_vector_database.js
```

### **2. Test Vector Flow**
```bash
# Chạy test vector flow
node backend/test/vector_flow_test.js
```

### **3. Test Chat Functionality**
```bash
# Start backend
cd backend
npm start

# Start frontend
cd frontend
npm start
```

## 📋 CÁC BƯỚC SỬA LỖI

### **Step 1: Kiểm tra Database**
```sql
-- Kiểm tra knowledge_chunks table
SELECT COUNT(*) FROM knowledge_chunks;
SELECT COUNT(*) FROM knowledge_chunks WHERE embedding IS NOT NULL;

-- Kiểm tra sample embedding
SELECT id, title, JSON_LENGTH(embedding) as dims 
FROM knowledge_chunks 
WHERE embedding IS NOT NULL 
LIMIT 1;
```

### **Step 2: Chạy Embed Chunks (Nếu Cần)**
```bash
# Nếu chưa có embeddings
node backend/services/embed_chunks.js
```

### **Step 3: Test Vector Search**
```bash
# Test basic functionality
node backend/test/vector_flow_test.js
```

### **Step 4: Test Chat API**
```bash
# Test chat endpoint
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message": "What is machine learning?"}'
```

## 🔍 DEBUGGING

### **1. Kiểm tra Logs**
```bash
# Backend logs
cd backend
npm start

# Xem logs chi tiết
DEBUG=* npm start
```

### **2. Kiểm tra Database**
```sql
-- Kiểm tra embeddings
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embedding,
  AVG(JSON_LENGTH(embedding)) as avg_dimension
FROM knowledge_chunks;
```

### **3. Test Individual Functions**
```javascript
// Test embedding generation
import { getEmbedding } from './services/embeddingVector.js';
const embedding = await getEmbedding('test question');
console.log('Embedding length:', embedding.length);

// Test vector search
import { searchSimilarVectors } from './services/vectorDatabase.js';
const results = await searchSimilarVectors(embedding, 3, 0.3);
console.log('Search results:', results.length);
```

## 🚀 PERFORMANCE OPTIMIZATION

### **1. Database Indexing**
```sql
-- Tạo index cho performance
CREATE INDEX idx_chunks_embedding ON knowledge_chunks(embedding(100));
CREATE INDEX idx_chunks_parent_id ON knowledge_chunks(parent_id);
```

### **2. Caching Strategy**
```javascript
// Cache configuration
const CACHE_TTL = 3600000; // 1 hour
const MAX_CACHE_SIZE = 1000; // entries
```

### **3. Batch Processing**
```javascript
// Batch multiple queries
const results = await batchRetrieveTopChunks(queries, 3);
```

## 📊 MONITORING

### **1. Performance Metrics**
```javascript
// Monitor response time
const startTime = Date.now();
const results = await retrieveTopChunks(embedding);
const endTime = Date.now();
console.log(`Response time: ${endTime - startTime}ms`);
```

### **2. Error Tracking**
```javascript
// Track errors
try {
  const results = await retrieveTopChunks(embedding);
} catch (error) {
  console.error('Vector search error:', error.message);
  // Fallback to basic search
}
```

## ✅ SUCCESS CRITERIA

- [ ] Database connection working
- [ ] Embeddings exist in knowledge_chunks
- [ ] Vector search returns results
- [ ] Chat API responds correctly
- [ ] Performance < 100ms for search
- [ ] No console errors in logs

## 🆘 TROUBLESHOOTING

### **Lỗi "No chunks found"**
```bash
# Chạy embed chunks
node backend/services/embed_chunks.js
```

### **Lỗi "Embedding generation failed"**
```bash
# Kiểm tra OpenAI API key
echo $OPENAI_API_KEY
```

### **Lỗi "Database connection failed"**
```bash
# Kiểm tra database
mysql -u root -p -e "SELECT 1"
```

### **Lỗi "Vector search timeout"**
```javascript
// Giảm topK và threshold
const results = await retrieveTopChunks(embedding, 2, 0.2);
```

## 📞 SUPPORT

Nếu vẫn gặp lỗi, hãy:
1. Chạy `node backend/test/vector_flow_test.js`
2. Gửi kết quả test
3. Kiểm tra logs chi tiết
4. Verify database setup
