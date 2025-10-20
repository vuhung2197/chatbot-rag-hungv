// Simple vector search test
import pool from '../db.js';
import { getEmbedding } from '../services/embeddingVector.js';

async function simpleVectorTest() {
  console.log('🧪 Simple Vector Search Test...\n');

  try {
    // 1. Test database connection
    console.log('1️⃣ Testing database connection...');
    const [dbTest] = await pool.execute('SELECT 1 as test');
    console.log('✅ Database connected:', dbTest[0].test);

    // 2. Check knowledge_chunks
    console.log('\n2️⃣ Checking knowledge_chunks...');
    const [chunks] = await pool.execute('SELECT COUNT(*) as count FROM knowledge_chunks');
    console.log(`✅ Found ${chunks[0].count} chunks`);

    // 3. Check embeddings
    console.log('\n3️⃣ Checking embeddings...');
    const [embeddings] = await pool.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embedding
      FROM knowledge_chunks
    `);
    console.log(`📊 Total: ${embeddings[0].total}, With embeddings: ${embeddings[0].with_embedding}`);

    // 4. Test simple query
    console.log('\n4️⃣ Testing simple query...');
    const [rows] = await pool.execute(`
      SELECT id, title, content, embedding
      FROM knowledge_chunks 
      WHERE embedding IS NOT NULL
      LIMIT 3
    `);
    console.log(`✅ Retrieved ${rows.length} rows`);

    // 5. Test embedding generation
    console.log('\n5️⃣ Testing embedding generation...');
    const testQuestion = 'What is machine learning?';
    const embedding = await getEmbedding(testQuestion);
    console.log(`✅ Generated embedding: ${embedding.length} dimensions`);

    // 6. Test manual similarity calculation
    console.log('\n6️⃣ Testing manual similarity...');
    if (rows.length > 0) {
      const row = rows[0];
      let emb;
      try {
        emb = Array.isArray(row.embedding) 
          ? row.embedding 
          : JSON.parse(row.embedding);
        
        // Simple cosine similarity
        let dot = 0, aa = 0, bb = 0;
        for (let i = 0; i < Math.min(embedding.length, emb.length); i++) {
          const x = Number(embedding[i]);
          const y = Number(emb[i]);
          dot += x * y;
          aa += x * x;
          bb += y * y;
        }
        
        const similarity = dot / (Math.sqrt(aa) * Math.sqrt(bb));
        console.log(`✅ Similarity: ${similarity.toFixed(4)}`);
        console.log(`📄 Sample chunk: "${row.title}"`);
      } catch (error) {
        console.log('❌ Error parsing embedding:', error.message);
      }
    }

    console.log('\n🎉 Simple test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run test
simpleVectorTest().catch(console.error);
