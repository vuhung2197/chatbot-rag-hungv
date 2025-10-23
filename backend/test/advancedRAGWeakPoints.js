#!/usr/bin/env node
// Advanced RAG Weak Points Analysis
import '../bootstrap/env.js';
import pool from '../db.js';
import { getEmbedding } from '../services/embeddingVector.js';

async function analyzeWeakPoints() {
  console.log('🔍 Advanced RAG Weak Points Analysis');
  console.log('='.repeat(50));
  
  // 1. Database Analysis
  await analyzeDatabase();
  
  // 2. Embedding Service Analysis
  await analyzeEmbeddingService();
  
  // 3. Memory Analysis
  await analyzeMemory();
  
  // 4. Performance Analysis
  await analyzePerformance();
  
  // 5. Error Scenarios
  await analyzeErrorScenarios();
  
  await pool.end();
}

async function analyzeDatabase() {
  console.log('\n1️⃣ Database Analysis');
  console.log('-'.repeat(30));
  
  try {
    // Check total chunks
    const [totalChunks] = await pool.execute('SELECT COUNT(*) as count FROM knowledge_chunks');
    console.log(`📊 Total chunks: ${totalChunks[0].count}`);
    
    // Check chunks with embeddings
    const [chunksWithEmbeddings] = await pool.execute('SELECT COUNT(*) as count FROM knowledge_chunks WHERE embedding IS NOT NULL');
    console.log(`📊 Chunks with embeddings: ${chunksWithEmbeddings[0].count}`);
    
    // Check embedding format
    const [embeddingSample] = await pool.execute('SELECT id, title, LENGTH(embedding) as emb_len FROM knowledge_chunks WHERE embedding IS NOT NULL LIMIT 5');
    console.log('📊 Embedding samples:');
    embeddingSample.forEach(row => {
      console.log(`  ${row.id}: ${row.title} (${row.emb_len} chars)`);
    });
    
    // Check for corrupted embeddings
    const [corruptedEmbeddings] = await pool.execute(`
      SELECT COUNT(*) as count 
      FROM knowledge_chunks 
      WHERE embedding IS NOT NULL 
      AND (embedding = '' OR embedding = 'null' OR embedding = '[]')
    `);
    console.log(`⚠️ Corrupted embeddings: ${corruptedEmbeddings[0].count}`);
    
    // Check database performance
    const startTime = Date.now();
    await pool.execute('SELECT * FROM knowledge_chunks LIMIT 10');
    const endTime = Date.now();
    console.log(`⏱️ Database query time: ${endTime - startTime}ms`);
    
  } catch (error) {
    console.error('❌ Database analysis failed:', error.message);
  }
}

async function analyzeEmbeddingService() {
  console.log('\n2️⃣ Embedding Service Analysis');
  console.log('-'.repeat(30));
  
  try {
    // Test simple embedding
    const startTime = Date.now();
    const embedding = await getEmbedding('test');
    const endTime = Date.now();
    console.log(`✅ Embedding service working, time: ${endTime - startTime}ms, length: ${embedding.length}`);
    
    // Test with different text lengths
    const testTexts = [
      'short',
      'This is a medium length text for testing embedding service performance',
      'This is a very long text that contains many words and should test the embedding service with a substantial amount of content to process and analyze for performance metrics and response time evaluation'
    ];
    
    for (const text of testTexts) {
      try {
        const testStart = Date.now();
        const testEmbedding = await getEmbedding(text);
        const testEnd = Date.now();
        console.log(`📝 Text length: ${text.length}, Embedding time: ${testEnd - testStart}ms, Length: ${testEmbedding.length}`);
      } catch (error) {
        console.error(`❌ Embedding failed for text length ${text.length}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Embedding service analysis failed:', error.message);
  }
}

async function analyzeMemory() {
  console.log('\n3️⃣ Memory Analysis');
  console.log('-'.repeat(30));
  
  const memUsage = process.memoryUsage();
  console.log('💾 Current memory usage:');
  console.log(`  RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
  console.log(`  Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
  console.log(`  Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
  console.log(`  External: ${Math.round(memUsage.external / 1024 / 1024)}MB`);
  
  // Test memory with large data
  try {
    console.log('\n🧪 Testing memory with large data...');
    const largeData = [];
    for (let i = 0; i < 1000; i++) {
      largeData.push({
        id: i,
        content: 'This is a test content for memory analysis. '.repeat(100),
        embedding: new Array(1536).fill(Math.random())
      });
    }
    
    const memAfterLargeData = process.memoryUsage();
    console.log(`💾 Memory after large data: ${Math.round(memAfterLargeData.heapUsed / 1024 / 1024)}MB`);
    
    // Clear large data
    largeData.length = 0;
    global.gc && global.gc(); // Force garbage collection if available
    
    const memAfterGC = process.memoryUsage();
    console.log(`💾 Memory after GC: ${Math.round(memAfterGC.heapUsed / 1024 / 1024)}MB`);
    
  } catch (error) {
    console.error('❌ Memory analysis failed:', error.message);
  }
}

async function analyzePerformance() {
  console.log('\n4️⃣ Performance Analysis');
  console.log('-'.repeat(30));
  
  try {
    // Test database query performance
    console.log('📊 Database query performance:');
    const queryTests = [
      { name: 'Simple SELECT', query: 'SELECT * FROM knowledge_chunks LIMIT 10' },
      { name: 'COUNT query', query: 'SELECT COUNT(*) FROM knowledge_chunks' },
      { name: 'WHERE clause', query: 'SELECT * FROM knowledge_chunks WHERE id > 0 LIMIT 10' },
      { name: 'ORDER BY', query: 'SELECT * FROM knowledge_chunks ORDER BY id DESC LIMIT 10' }
    ];
    
    for (const test of queryTests) {
      const startTime = Date.now();
      await pool.execute(test.query);
      const endTime = Date.now();
      console.log(`  ${test.name}: ${endTime - startTime}ms`);
    }
    
    // Test embedding performance
    console.log('\n📊 Embedding performance:');
    const embeddingTests = [
      { name: 'Short text', text: 'test' },
      { name: 'Medium text', text: 'This is a medium length text for testing' },
      { name: 'Long text', text: 'This is a very long text that contains many words and should test the embedding service with a substantial amount of content to process and analyze for performance metrics and response time evaluation'.repeat(2) }
    ];
    
    for (const test of embeddingTests) {
      try {
        const startTime = Date.now();
        await getEmbedding(test.text);
        const endTime = Date.now();
        console.log(`  ${test.name} (${test.text.length} chars): ${endTime - startTime}ms`);
      } catch (error) {
        console.error(`  ❌ ${test.name} failed:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Performance analysis failed:', error.message);
  }
}

async function analyzeErrorScenarios() {
  console.log('\n5️⃣ Error Scenarios Analysis');
  console.log('-'.repeat(30));
  
  // Test invalid inputs
  const invalidInputs = [
    { name: 'Empty string', input: '' },
    { name: 'Null input', input: null },
    { name: 'Undefined input', input: undefined },
    { name: 'Very long text', input: 'a'.repeat(10000) },
    { name: 'Special characters', input: '!@#$%^&*()_+-=[]{}|;:,.<>?' },
    { name: 'Unicode text', input: '🚀🌟💫⭐✨🔥💥⚡️' }
  ];
  
  for (const test of invalidInputs) {
    try {
      console.log(`🧪 Testing ${test.name}...`);
      const startTime = Date.now();
      const embedding = await getEmbedding(test.input);
      const endTime = Date.now();
      console.log(`  ✅ Success: ${endTime - startTime}ms, length: ${embedding.length}`);
    } catch (error) {
      console.log(`  ❌ Failed: ${error.message}`);
    }
  }
  
  // Test database error scenarios
  console.log('\n🧪 Testing database error scenarios...');
  try {
    // Test invalid query
    await pool.execute('SELECT * FROM non_existent_table');
  } catch (error) {
    console.log(`  ❌ Invalid query handled: ${error.message}`);
  }
  
  try {
    // Test connection timeout (simulate)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 1000)
    );
    await Promise.race([pool.execute('SELECT 1'), timeoutPromise]);
  } catch (error) {
    console.log(`  ❌ Timeout handled: ${error.message}`);
  }
}

// Run analysis
analyzeWeakPoints().catch(console.error);
