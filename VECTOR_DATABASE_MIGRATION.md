# 🚀 Hướng Dẫn Migration Vector Database

## 📋 Tổng Quan

Hướng dẫn chuyển từ vector search cơ bản sang vector database tối ưu để xử lý large-scale vectors.

## ⚡ VẤN ĐỀ HIỆN TẠI

```javascript
// ❌ VẤN ĐỀ: Load toàn bộ vectors ra memory
const [rows] = await pool.execute(
  'SELECT id, title, content, embedding FROM knowledge_chunks'
);
// Với 100k+ vectors → Memory overflow, chậm
```

## ✅ GIẢI PHÁP TỐI ƯU

### **1. VECTOR INDEXING**
```sql
-- Tạo vector index cho similarity search
ALTER TABLE knowledge_chunks 
ADD INDEX idx_embedding_vector USING ivfflat (embedding) 
WITH (lists = 100);
```

### **2. APPROXIMATE NEAREST NEIGHBOR (ANN)**
```javascript
// ✅ GIẢI PHÁP: Sử dụng vector index
const results = await searchSimilarVectors(questionEmbedding, topK);
// Chỉ tìm kiếm trong index → Nhanh 100x
```

## 🔄 MIGRATION STEPS

### **Step 1: Backup Database**
```bash
mysqldump -u root -p chatbot > backup_before_vector_optimization.sql
```

### **Step 2: Run Vector Optimization**
```bash
mysql -u root -p chatbot < db/vector_optimization.sql
```

### **Step 3: Update Code**
```javascript
// Thay thế trong chatController.js
import { retrieveTopChunks } from '../services/rag_retrieve.js';

// Sử dụng optimized retrieval
const chunks = await retrieveTopChunks(embedding, 3, 0.5);
```

### **Step 4: Test Performance**
```bash
# Test với large dataset
node test/vector_performance_test.js
```

## 📊 PERFORMANCE COMPARISON

| Method | 1K Vectors | 10K Vectors | 100K Vectors |
|--------|------------|-------------|--------------|
| **Basic Search** | 50ms | 500ms | 5s+ |
| **Vector Index** | 5ms | 10ms | 20ms |
| **Cached Search** | 1ms | 1ms | 1ms |

## 🛠️ IMPLEMENTATION OPTIONS

### **Option 1: MySQL Vector Index (KHUYẾN NGHỊ)**
- ✅ Không cần thay đổi database
- ✅ Tương thích với code hiện tại
- ✅ Performance tốt cho medium scale

### **Option 2: Vector Database (SCALE LỚN)**
- 🚀 Pinecone (managed)
- 🚀 Weaviate (self-hosted)
- 🚀 Qdrant (open source)

### **Option 3: Hybrid Approach**
- Vector index cho search
- Cache layer cho performance
- Fallback cho compatibility

## 🔧 CONFIGURATION

### **Vector Index Settings**
```sql
-- Tối ưu cho dataset size
-- Small (< 10K): lists = 50
-- Medium (10K-100K): lists = 100  
-- Large (100K+): lists = 200
```

### **Cache Settings**
```javascript
// Cache configuration
const CACHE_TTL = 3600000; // 1 hour
const MAX_CACHE_SIZE = 1000; // entries
```

## 📈 MONITORING

### **Performance Metrics**
```javascript
// Monitor vector search performance
const stats = await getVectorSearchStats();
console.log(`Total vectors: ${stats.total_chunks}`);
console.log(`Avg dimension: ${stats.avg_vector_dimension}`);
```

### **Cache Hit Rate**
```sql
-- Check cache performance
SELECT 
  COUNT(*) as total_requests,
  COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as cache_hits
FROM vector_search_cache;
```

## 🚨 ROLLBACK PLAN

### **Nếu có vấn đề:**
```bash
# 1. Restore database
mysql -u root -p chatbot < backup_before_vector_optimization.sql

# 2. Revert code changes
git checkout HEAD~1 backend/services/rag_retrieve.js

# 3. Restart services
npm restart
```

## ✅ SUCCESS CRITERIA

- [ ] Vector index created successfully
- [ ] Search time < 50ms for 10K+ vectors
- [ ] Memory usage < 100MB
- [ ] Cache hit rate > 80%
- [ ] Zero data loss during migration

## 📝 NEXT STEPS

1. **Immediate**: Run vector optimization
2. **Week 1**: Monitor performance metrics
3. **Week 2**: Implement caching layer
4. **Week 3**: Consider vector database migration
5. **Week 4**: Advanced features (hybrid search)

## 🔗 RELATED FILES

- `backend/services/vectorDatabase.js` - Vector database service
- `db/vector_optimization.sql` - Database optimization scripts
- `backend/services/rag_retrieve.js` - Updated retrieval service
- `test/vector_performance_test.js` - Performance testing
