// Script để setup vector database đúng cách
import pool from './db.js';
import { createVectorIndex } from './services/vectorDatabase.js';

async function setupVectorDatabase() {
  console.log('🚀 Setting up Vector Database...\n');

  try {
    // 1. Kiểm tra database connection
    console.log('1️⃣ Testing database connection...');
    const [dbTest] = await pool.execute('SELECT 1 as test');
    console.log('✅ Database connected');

    // 2. Kiểm tra knowledge_chunks table
    console.log('\n2️⃣ Checking knowledge_chunks table...');
    const [chunks] = await pool.execute('SELECT COUNT(*) as count FROM knowledge_chunks');
    console.log(`✅ Found ${chunks[0].count} chunks in database`);

    if (chunks[0].count === 0) {
      console.log('⚠️ No chunks found! Please run embed_chunks.js first.');
      return;
    }

    // 3. Kiểm tra embedding data
    console.log('\n3️⃣ Checking embedding data...');
    const [embeddingTest] = await pool.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embedding,
        AVG(JSON_LENGTH(embedding)) as avg_dimension
      FROM knowledge_chunks
    `);
    
    const stats = embeddingTest[0];
    console.log(`📊 Total chunks: ${stats.total}`);
    console.log(`📊 With embeddings: ${stats.with_embedding}`);
    console.log(`📊 Average dimension: ${stats.avg_dimension || 'N/A'}`);

    if (stats.with_embedding === 0) {
      console.log('❌ No embeddings found! Please run embed_chunks.js first.');
      return;
    }

    // 4. Tạo vector index (nếu có thể)
    console.log('\n4️⃣ Creating vector index...');
    try {
      await createVectorIndex();
      console.log('✅ Vector index created successfully');
    } catch (error) {
      console.log('⚠️ Vector index creation failed (this is normal for basic MySQL)');
      console.log('   Using fallback similarity search instead');
    }

    // 5. Test basic functionality
    console.log('\n5️⃣ Testing basic functionality...');
    const [testChunks] = await pool.execute(`
      SELECT id, title, content, embedding 
      FROM knowledge_chunks 
      WHERE embedding IS NOT NULL 
      LIMIT 1
    `);

    if (testChunks.length > 0) {
      const chunk = testChunks[0];
      let embedding;
      try {
        embedding = Array.isArray(chunk.embedding) 
          ? chunk.embedding 
          : JSON.parse(chunk.embedding);
        console.log(`✅ Sample embedding: ${embedding.length} dimensions`);
        console.log(`✅ Sample chunk: "${chunk.title}"`);
      } catch (error) {
        console.log('❌ Error parsing embedding:', error.message);
      }
    }

    console.log('\n🎉 Vector database setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Run: node backend/test/vector_flow_test.js');
    console.log('2. Test chat functionality');
    console.log('3. Monitor performance');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Chạy setup
setupVectorDatabase().catch(console.error);
