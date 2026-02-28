import '../bootstrap/env.js';
import pool from '../db.js';
import { getEmbedding } from '../services/embeddingVector.js';
import { multiStageRetrieval, rerankContext } from '../services/advancedRAGFixed.js';
import { classifyIntent } from '../services/intentRouter.js';

const COMPLEX_QUERY = 'So sánh ứng dụng của NLP và Computer Vision trong y tế và chẩn đoán bệnh';
const MOCK_MODEL = { url: 'https://api.openai.com/v1', name: 'gpt-4o-mini' };

async function runFullSystemTest() {
    console.log('🚀 STARING FULL SYSTEM TEST (Router + Hybrid Search + Re-rank)');
    console.log('❓ Query:', COMPLEX_QUERY);
    console.log('='.repeat(60));

    try {
        // 1. Test Router
        console.log('\n📡 STEP 1: Intent Routing');
        const routerResult = await classifyIntent(COMPLEX_QUERY, MOCK_MODEL);
        console.log('👉 Intent:', routerResult.intent);
        console.log('👉 Reasoning:', routerResult.reasoning);

        if (routerResult.intent !== 'KNOWLEDGE') {
            console.log('🛑 Stopped: Intent is not KNOWLEDGE');
            return;
        }

        // 2. Test Hybrid Retrieval
        console.log('\n🔍 STEP 2: Hybrid Retrieval (Vector + Full-Text + RRF)');
        const embedding = await getEmbedding(COMPLEX_QUERY);
        const retrievedChunks = await multiStageRetrieval(embedding, COMPLEX_QUERY, 15);

        console.log(`✅ Retrieved ${retrievedChunks.length} chunks after RRF fusion.`);

        // Analyze sources
        const sources = retrievedChunks.reduce((acc, chunk) => {
            const type = chunk.source_type || 'unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});
        console.log('📊 Source Distribution:', sources);

        // Preview top 3
        console.log('\n📋 Top 3 Retrieval Results:');
        retrievedChunks.slice(0, 3).forEach((c, i) => {
            console.log(`  ${i + 1}. [${c.source_type}] ${c.title} (Score: ${c.score.toFixed(4)})`);
        });

        // 3. Test Re-ranking
        console.log('\n⚖️ STEP 3: Re-ranking & Thresholding');
        const rerankedChunks = await rerankContext(retrievedChunks, embedding, COMPLEX_QUERY);

        if (rerankedChunks.length === 0) {
            console.warn('⚠️ All chunks filtered out by threshold (< 0.3)');
        } else {
            console.log(`✅ ${rerankedChunks.length} chunks passed re-ranking.`);
            console.log('\n🏆 Top 3 Re-ranked Results:');
            rerankedChunks.slice(0, 3).forEach((c, i) => {
                console.log(`  ${i + 1}. ${c.title} (Final Score: ${c.final_score.toFixed(4)})`);
            });
        }

    } catch (error) {
        console.error('❌ TEST FAILED:', error);
    } finally {
        await pool.end();
    }
}

runFullSystemTest();
