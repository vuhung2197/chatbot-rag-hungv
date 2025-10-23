#!/usr/bin/env node
// Debug script for Advanced RAG
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

const TEST_QUESTION = "So sánh NLP và Machine Learning, và giải thích mối quan hệ giữa chúng trong việc xây dựng chatbot";

async function debugAdvancedRAG() {
  console.log('🔍 Debugging Advanced RAG...');
  console.log('📝 Test question:', TEST_QUESTION);
  
  try {
    // 1. Test embedding generation
    console.log('\n1️⃣ Testing embedding generation...');
    const questionEmbedding = await getEmbedding(TEST_QUESTION);
    console.log('✅ Embedding generated, length:', questionEmbedding.length);
    
    // 2. Test adaptive retrieval
    console.log('\n2️⃣ Testing adaptive retrieval...');
    const retrievalParams = await adaptiveRetrieval(TEST_QUESTION, questionEmbedding);
    console.log('✅ Retrieval params:', retrievalParams);
    
    // 3. Test multi-stage retrieval
    console.log('\n3️⃣ Testing multi-stage retrieval...');
    const allChunks = await multiStageRetrieval(
      questionEmbedding, 
      TEST_QUESTION, 
      retrievalParams.maxChunks
    );
    console.log('✅ Retrieved chunks:', allChunks.length);
    allChunks.forEach((chunk, index) => {
      console.log(`  ${index + 1}. ${chunk.title} (Score: ${chunk.score?.toFixed(3)}, Stage: ${chunk.retrieval_stage})`);
    });
    
    if (allChunks.length === 0) {
      console.log('❌ No chunks retrieved - check database and embeddings');
      return;
    }
    
    // 4. Test semantic clustering
    console.log('\n4️⃣ Testing semantic clustering...');
    const clusters = await semanticClustering(allChunks, questionEmbedding);
    console.log('✅ Created clusters:', clusters.length);
    clusters.forEach((cluster, index) => {
      console.log(`  Cluster ${index + 1}: ${cluster.length} chunks`);
    });
    
    // 5. Test multi-hop reasoning
    console.log('\n5️⃣ Testing multi-hop reasoning...');
    let reasoningChains = [];
    if (retrievalParams.useMultiHop) {
      reasoningChains = await multiHopReasoning(
        allChunks.slice(0, 3), 
        questionEmbedding, 
        TEST_QUESTION
      );
      console.log('✅ Created reasoning chains:', reasoningChains.length);
      reasoningChains.forEach((chain, index) => {
        console.log(`  Chain ${index + 1}: Score ${chain.reasoning_score?.toFixed(3)}, Related: ${chain.related_chunks.length}`);
      });
    }
    
    // 6. Test context re-ranking
    console.log('\n6️⃣ Testing context re-ranking...');
    const rerankedChunks = rerankContext(allChunks, questionEmbedding, TEST_QUESTION);
    console.log('✅ Reranked chunks:', rerankedChunks.length);
    rerankedChunks.slice(0, 3).forEach((chunk, index) => {
      console.log(`  ${index + 1}. ${chunk.title} (Final Score: ${chunk.final_score?.toFixed(3)})`);
    });
    
    // 7. Test context fusion
    console.log('\n7️⃣ Testing context fusion...');
    const fusedContext = fuseContext(rerankedChunks, reasoningChains, TEST_QUESTION);
    console.log('✅ Fused context length:', fusedContext.length);
    console.log('📄 Context preview:');
    console.log(fusedContext.substring(0, 500) + '...');
    
    // 8. Test database connection
    console.log('\n8️⃣ Testing database connection...');
    const [dbTest] = await pool.execute('SELECT COUNT(*) as count FROM knowledge_chunks');
    console.log('✅ Database connected, total chunks:', dbTest[0].count);
    
    // 9. Test embedding service
    console.log('\n9️⃣ Testing embedding service...');
    try {
      const testEmbedding = await getEmbedding('test');
      console.log('✅ Embedding service working, length:', testEmbedding.length);
    } catch (error) {
      console.log('❌ Embedding service error:', error.message);
    }
    
    console.log('\n🎉 Advanced RAG debug completed successfully!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run debug
debugAdvancedRAG();
