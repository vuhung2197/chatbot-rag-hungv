// Test script để kiểm tra luồng xử lý vector search
import pool from '../db.js';
import { getEmbedding } from '../services/embeddingVector.js';
import { retrieveTopChunks } from '../services/rag_retrieve.js';
import { cachedVectorSearch, searchSimilarVectors } from '../services/vectorDatabase.js';

async function testVectorFlow() {
  console.log('🧪 Testing Vector Search Flow...\n');

  try {
    // 1. Kiểm tra database connection
    console.log('1️⃣ Testing database connection...');
    const [dbTest] = await pool.execute('SELECT 1 as test');
    console.log('✅ Database connected:', dbTest[0].test);

    // 2. Kiểm tra knowledge_chunks table
    console.log('\n2️⃣ Checking knowledge_chunks table...');
    const [chunks] = await pool.execute('SELECT COUNT(*) as count FROM knowledge_chunks');
    console.log(`✅ Found ${chunks[0].count} chunks in database`);

    if (chunks[0].count === 0) {
      console.log('⚠️ No chunks found! Please add some knowledge first.');
      return;
    }

    // 3. Test embedding generation
    console.log('\n3️⃣ Testing embedding generation...');
    const testQuestion = 'What is machine learning?';
    const embedding = await getEmbedding(testQuestion);
    console.log(`✅ Generated embedding with ${embedding.length} dimensions`);

    // 4. Test basic vector search
    console.log('\n4️⃣ Testing basic vector search...');
    const searchResults = await searchSimilarVectors(embedding, 3, 0.3);
    console.log(`✅ Found ${searchResults.length} similar chunks`);
    
    if (searchResults.length > 0) {
      console.log('📄 Top result:', {
        title: searchResults[0].title,
        score: searchResults[0].score,
        content: searchResults[0].content.substring(0, 100) + '...'
      });
    }

    // 5. Test cached vector search
    console.log('\n5️⃣ Testing cached vector search...');
    const cachedResults = await cachedVectorSearch(embedding, 3);
    console.log(`✅ Cached search returned ${cachedResults.length} results`);

    // 6. Test full RAG flow
    console.log('\n6️⃣ Testing full RAG flow...');
    const ragResults = await retrieveTopChunks(embedding, 3, 0.3);
    console.log(`✅ RAG retrieval returned ${ragResults.length} chunks`);

    // 7. Performance test
    console.log('\n7️⃣ Performance test...');
    const startTime = Date.now();
    for (let i = 0; i < 5; i++) {
      await retrieveTopChunks(embedding, 3, 0.3);
    }
    const endTime = Date.now();
    const avgTime = (endTime - startTime) / 5;
    console.log(`✅ Average response time: ${avgTime.toFixed(2)}ms`);

    console.log('\n🎉 All tests passed! Vector flow is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Chạy test
testVectorFlow().catch(console.error);
