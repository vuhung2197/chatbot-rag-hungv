#!/usr/bin/env node
// Step-by-step debugging for Advanced RAG
import '../bootstrap/env.js';
import pool from '../db.js';
import { getEmbedding } from '../services/embeddingVector.js';
import {
  multiStageRetrieval,
  semanticClustering,
  multiHopReasoning,
  fuseContext,
  adaptiveRetrieval,
  rerankContext
} from '../services/advancedRAGFixed.js';

const TEST_QUESTIONS = [
  "NLP là gì?", // Simple question
  "So sánh NLP và Machine Learning", // Complex question
  "Giải thích mối quan hệ giữa NLP, Machine Learning và Chatbot trong việc xây dựng hệ thống AI" // Very complex question
];

async function testStepByStep() {
  console.log('🔍 Advanced RAG Step-by-Step Analysis');
  console.log('='.repeat(50));
  
  for (let i = 0; i < TEST_QUESTIONS.length; i++) {
    const question = TEST_QUESTIONS[i];
    console.log(`\n📝 Test ${i + 1}: ${question}`);
    console.log('-'.repeat(50));
    
    try {
      await testSingleQuestion(question);
    } catch (error) {
      console.error(`❌ Test ${i + 1} failed:`, error.message);
      console.error('Stack:', error.stack);
    }
  }
  
  await pool.end();
}

async function testSingleQuestion(question) {
  const startTime = Date.now();
  
  // Step 1: Database Connection Test
  console.log('\n1️⃣ Testing database connection...');
  try {
    const [dbTest] = await pool.execute('SELECT COUNT(*) as count FROM knowledge_chunks');
    console.log(`✅ Database connected, total chunks: ${dbTest[0].count}`);
    
    const [embeddingTest] = await pool.execute('SELECT COUNT(*) as count FROM knowledge_chunks WHERE embedding IS NOT NULL');
    console.log(`✅ Chunks with embeddings: ${embeddingTest[0].count}`);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return;
  }
  
  // Step 2: Embedding Service Test
  console.log('\n2️⃣ Testing embedding service...');
  let questionEmbedding;
  try {
    const embeddingStart = Date.now();
    questionEmbedding = await getEmbedding(question);
    const embeddingEnd = Date.now();
    console.log(`✅ Embedding generated, length: ${questionEmbedding.length}, time: ${embeddingEnd - embeddingStart}ms`);
  } catch (error) {
    console.error('❌ Embedding service failed:', error.message);
    return;
  }
  
  // Step 3: Adaptive Retrieval Test
  console.log('\n3️⃣ Testing adaptive retrieval...');
  let retrievalParams;
  try {
    const adaptiveStart = Date.now();
    retrievalParams = await adaptiveRetrieval(question, questionEmbedding);
    const adaptiveEnd = Date.now();
    console.log(`✅ Retrieval params:`, retrievalParams);
    console.log(`⏱️ Adaptive retrieval time: ${adaptiveEnd - adaptiveStart}ms`);
  } catch (error) {
    console.error('❌ Adaptive retrieval failed:', error.message);
    return;
  }
  
  // Step 4: Multi-Stage Retrieval Test
  console.log('\n4️⃣ Testing multi-stage retrieval...');
  let allChunks;
  try {
    const retrievalStart = Date.now();
    allChunks = await multiStageRetrieval(questionEmbedding, question, retrievalParams.maxChunks);
    const retrievalEnd = Date.now();
    console.log(`✅ Retrieved ${allChunks.length} chunks in ${retrievalEnd - retrievalStart}ms`);
    
    if (allChunks.length === 0) {
      console.log('⚠️ No chunks retrieved - check database and embeddings');
      return;
    }
    
    // Show chunk details
    allChunks.forEach((chunk, index) => {
      console.log(`  ${index + 1}. ${chunk.title} (Score: ${chunk.score?.toFixed(3)}, Stage: ${chunk.retrieval_stage})`);
    });
  } catch (error) {
    console.error('❌ Multi-stage retrieval failed:', error.message);
    return;
  }
  
  // Step 5: Semantic Clustering Test
  console.log('\n5️⃣ Testing semantic clustering...');
  let clusters;
  try {
    const clusteringStart = Date.now();
    clusters = await semanticClustering(allChunks, questionEmbedding);
    const clusteringEnd = Date.now();
    console.log(`✅ Created ${clusters.length} clusters in ${clusteringEnd - clusteringStart}ms`);
    
    clusters.forEach((cluster, index) => {
      console.log(`  Cluster ${index + 1}: ${cluster.length} chunks`);
    });
  } catch (error) {
    console.error('❌ Semantic clustering failed:', error.message);
    clusters = [allChunks]; // Fallback
  }
  
  // Step 6: Multi-Hop Reasoning Test
  console.log('\n6️⃣ Testing multi-hop reasoning...');
  let reasoningChains = [];
  if (retrievalParams.useMultiHop) {
    try {
      const reasoningStart = Date.now();
      reasoningChains = await multiHopReasoning(allChunks.slice(0, 3), questionEmbedding, question);
      const reasoningEnd = Date.now();
      console.log(`✅ Created ${reasoningChains.length} reasoning chains in ${reasoningEnd - reasoningStart}ms`);
      
      reasoningChains.forEach((chain, index) => {
        console.log(`  Chain ${index + 1}: Score ${chain.reasoning_score?.toFixed(3)}, Related: ${chain.related_chunks.length}`);
      });
    } catch (error) {
      console.error('❌ Multi-hop reasoning failed:', error.message);
      reasoningChains = [];
    }
  } else {
    console.log('⏭️ Multi-hop reasoning skipped (not needed)');
  }
  
  // Step 7: Context Re-ranking Test
  console.log('\n7️⃣ Testing context re-ranking...');
  let rerankedChunks;
  try {
    const rerankStart = Date.now();
    rerankedChunks = rerankContext(allChunks, questionEmbedding, question);
    const rerankEnd = Date.now();
    console.log(`✅ Re-ranked ${rerankedChunks.length} chunks in ${rerankEnd - rerankStart}ms`);
    
    rerankedChunks.slice(0, 3).forEach((chunk, index) => {
      console.log(`  ${index + 1}. ${chunk.title} (Final Score: ${chunk.final_score?.toFixed(3)})`);
    });
  } catch (error) {
    console.error('❌ Context re-ranking failed:', error.message);
    rerankedChunks = allChunks;
  }
  
  // Step 8: Context Fusion Test
  console.log('\n8️⃣ Testing context fusion...');
  let fusedContext;
  try {
    const fusionStart = Date.now();
    fusedContext = fuseContext(rerankedChunks, reasoningChains, question);
    const fusionEnd = Date.now();
    console.log(`✅ Fused context (${fusedContext.length} chars) in ${fusionEnd - fusionStart}ms`);
    
    // Show context preview
    console.log('📄 Context preview:');
    console.log(fusedContext.substring(0, 300) + '...');
  } catch (error) {
    console.error('❌ Context fusion failed:', error.message);
    fusedContext = rerankedChunks.map(c => `**${c.title}**: ${c.content}`).join('\n\n');
  }
  
  // Step 9: Performance Summary
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  console.log('\n📊 Performance Summary:');
  console.log(`⏱️ Total processing time: ${totalTime}ms`);
  console.log(`📚 Chunks retrieved: ${allChunks.length}`);
  console.log(`🔗 Clusters created: ${clusters.length}`);
  console.log(`🧠 Reasoning chains: ${reasoningChains.length}`);
  console.log(`📄 Context length: ${fusedContext.length} characters`);
  
  // Step 10: Memory Usage
  const memUsage = process.memoryUsage();
  console.log('\n💾 Memory Usage:');
  console.log(`  RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
  console.log(`  Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
  console.log(`  Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
  
  // Step 11: Error Detection
  console.log('\n🔍 Error Detection:');
  if (allChunks.length === 0) {
    console.log('❌ No chunks retrieved - check database');
  }
  if (fusedContext.length > 8000) {
    console.log('⚠️ Context too long - may cause LLM issues');
  }
  if (totalTime > 10000) {
    console.log('⚠️ Processing too slow - check performance');
  }
  if (memUsage.heapUsed > 500 * 1024 * 1024) {
    console.log('⚠️ High memory usage - check for memory leaks');
  }
  
  console.log('\n✅ Test completed successfully!');
}

// Run tests
testStepByStep().catch(console.error);
