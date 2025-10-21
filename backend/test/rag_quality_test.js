import mysql from 'mysql2/promise';
import { retrieveTopChunks } from '../services/rag_retrieve.js';
import { getEmbedding } from '../services/embeddingVector.js';

// Kết nối database
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'chatbot',
  port: 3307,
  charset: 'utf8mb4',
});

/**
 * Test chất lượng RAG với chunks cũ vs mới
 */
async function testRAGQuality() {
  console.log('🧪 RAG QUALITY TEST: So sánh chất lượng retrieval\n');

  try {
    // Test questions để đánh giá RAG
    const testQuestions = [
      "NLP là gì và tại sao quan trọng?",
      "Chatbot có những ứng dụng gì trong thực tế?",
      "Case study về Bank of America và chatbot Erica",
      "Thách thức của NLP trong việc hiểu ngôn ngữ con người",
      "Xu hướng phát triển của NLP trong tương lai"
    ];

    console.log('📝 Test Questions:');
    testQuestions.forEach((q, i) => {
      console.log(`   ${i + 1}. ${q}`);
    });
    console.log('');

    // Lấy chunks hiện tại từ database
    console.log('1️⃣ Lấy chunks hiện tại từ database...');
    const [chunks] = await pool.execute(`
      SELECT id, title, content, token_count, 
             CHAR_LENGTH(content) as char_length,
             CASE 
               WHEN content LIKE '%.' THEN 'Complete'
               WHEN content LIKE '%!' THEN 'Complete' 
               WHEN content LIKE '%?' THEN 'Complete'
               ELSE 'Incomplete'
             END as completeness
      FROM knowledge_chunks 
      ORDER BY id
    `);

    console.log(`📊 Tổng số chunks: ${chunks.length}`);
    console.log(`📊 Trung bình từ/chunk: ${(chunks.reduce((sum, chunk) => sum + chunk.token_count, 0) / chunks.length).toFixed(1)}`);
    
    const completeChunks = chunks.filter(chunk => chunk.completeness === 'Complete').length;
    console.log(`📊 Chunks hoàn chỉnh: ${completeChunks}/${chunks.length} (${(completeChunks/chunks.length*100).toFixed(1)}%)\n`);

    // Test retrieval cho từng câu hỏi
    console.log('2️⃣ TEST RETRIEVAL CHO TỪNG CÂU HỎI:');
    console.log('=' .repeat(80));

    for (let i = 0; i < testQuestions.length; i++) {
      const question = testQuestions[i];
      console.log(`\n🔍 Question ${i + 1}: "${question}"`);
      
      try {
        // Tạo embedding cho câu hỏi
        const questionEmbedding = await getEmbedding(question);
        
        // Retrieve top chunks
        const retrievedChunks = await retrieveTopChunks(questionEmbedding, 3, 0.5);
        
        console.log(`📊 Retrieved ${retrievedChunks.length} chunks:`);
        
        retrievedChunks.forEach((chunk, index) => {
          const relevance = chunk.similarity ? chunk.similarity.toFixed(3) : 'N/A';
          const wordCount = chunk.content ? chunk.content.split(/\s+/).length : 0;
          const isComplete = chunk.content && (chunk.content.endsWith('.') || chunk.content.endsWith('!') || chunk.content.endsWith('?'));
          
          console.log(`   ${index + 1}. Relevance: ${relevance}, Words: ${wordCount}, Complete: ${isComplete ? '✅' : '❌'}`);
          console.log(`      "${chunk.content ? chunk.content.substring(0, 100) + '...' : 'No content'}"`);
        });

        // Đánh giá chất lượng retrieval
        const avgRelevance = retrievedChunks.reduce((sum, chunk) => sum + (chunk.similarity || 0), 0) / retrievedChunks.length;
        const completeRetrieved = retrievedChunks.filter(chunk => 
          chunk.content && (chunk.content.endsWith('.') || chunk.content.endsWith('!') || chunk.content.endsWith('?'))
        ).length;
        
        console.log(`📈 Quality Metrics:`);
        console.log(`   - Average relevance: ${avgRelevance.toFixed(3)}`);
        console.log(`   - Complete chunks: ${completeRetrieved}/${retrievedChunks.length}`);
        console.log(`   - Quality score: ${((avgRelevance * 0.7) + (completeRetrieved/retrievedChunks.length * 0.3)).toFixed(3)}/1.0`);

      } catch (error) {
        console.log(`❌ Error retrieving for question ${i + 1}: ${error.message}`);
      }
    }

    // 3. Phân tích tổng thể
    console.log('\n3️⃣ PHÂN TÍCH TỔNG THỂ:');
    console.log('=' .repeat(80));
    
    // Thống kê chunks
    const stats = {
      totalChunks: chunks.length,
      avgWords: chunks.reduce((sum, chunk) => sum + chunk.token_count, 0) / chunks.length,
      completeChunks: completeChunks,
      completenessRate: completeChunks / chunks.length,
      avgCharLength: chunks.reduce((sum, chunk) => sum + chunk.char_length, 0) / chunks.length
    };

    console.log('📊 Chunk Statistics:');
    console.log(`   - Total chunks: ${stats.totalChunks}`);
    console.log(`   - Average words: ${stats.avgWords.toFixed(1)}`);
    console.log(`   - Average characters: ${stats.avgCharLength.toFixed(1)}`);
    console.log(`   - Completeness rate: ${(stats.completenessRate * 100).toFixed(1)}%`);

    // Đánh giá chất lượng
    let qualityScore = 0;
    let qualityFactors = [];

    // Factor 1: Completeness (30%)
    if (stats.completenessRate >= 0.9) {
      qualityScore += 0.3;
      qualityFactors.push('✅ High completeness (90%+)');
    } else if (stats.completenessRate >= 0.7) {
      qualityScore += 0.2;
      qualityFactors.push('⚠️ Medium completeness (70-90%)');
    } else {
      qualityScore += 0.1;
      qualityFactors.push('❌ Low completeness (<70%)');
    }

    // Factor 2: Optimal chunk size (25%)
    if (stats.avgWords >= 80 && stats.avgWords <= 200) {
      qualityScore += 0.25;
      qualityFactors.push('✅ Optimal chunk size (80-200 words)');
    } else if (stats.avgWords >= 50 && stats.avgWords <= 300) {
      qualityScore += 0.15;
      qualityFactors.push('⚠️ Acceptable chunk size (50-300 words)');
    } else {
      qualityScore += 0.05;
      qualityFactors.push('❌ Poor chunk size (<50 or >300 words)');
    }

    // Factor 3: Chunk count (25%)
    if (stats.totalChunks >= 2 && stats.totalChunks <= 5) {
      qualityScore += 0.25;
      qualityFactors.push('✅ Optimal chunk count (2-5)');
    } else if (stats.totalChunks >= 1 && stats.totalChunks <= 10) {
      qualityScore += 0.15;
      qualityFactors.push('⚠️ Acceptable chunk count (1-10)');
    } else {
      qualityScore += 0.05;
      qualityFactors.push('❌ Poor chunk count (<1 or >10)');
    }

    // Factor 4: Content richness (20%)
    if (stats.avgCharLength >= 500) {
      qualityScore += 0.2;
      qualityFactors.push('✅ Rich content (500+ chars)');
    } else if (stats.avgCharLength >= 200) {
      qualityScore += 0.1;
      qualityFactors.push('⚠️ Moderate content (200-500 chars)');
    } else {
      qualityScore += 0.05;
      qualityFactors.push('❌ Poor content (<200 chars)');
    }

    console.log('\n📈 Quality Assessment:');
    qualityFactors.forEach(factor => console.log(`   ${factor}`));
    console.log(`\n🎯 Overall Quality Score: ${(qualityScore * 100).toFixed(1)}/100`);

    if (qualityScore >= 0.8) {
      console.log('🏆 EXCELLENT: RAG system is highly optimized!');
    } else if (qualityScore >= 0.6) {
      console.log('✅ GOOD: RAG system is well optimized');
    } else if (qualityScore >= 0.4) {
      console.log('⚠️ FAIR: RAG system needs improvement');
    } else {
      console.log('❌ POOR: RAG system needs major optimization');
    }

    console.log('\n🚀 RECOMMENDATIONS:');
    if (stats.completenessRate < 0.9) {
      console.log('   - Improve chunk completeness (avoid cutting mid-sentence)');
    }
    if (stats.avgWords < 80 || stats.avgWords > 200) {
      console.log('   - Optimize chunk size for better context');
    }
    if (stats.totalChunks < 2 || stats.totalChunks > 5) {
      console.log('   - Adjust chunk count for optimal retrieval');
    }
    if (stats.avgCharLength < 500) {
      console.log('   - Increase content richness per chunk');
    }

  } catch (error) {
    console.error('❌ Error in RAG quality test:', error);
  } finally {
    await pool.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Chạy test
testRAGQuality()
  .then(() => {
    console.log('\n✅ RAG Quality Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 RAG Quality Test failed:', error);
    process.exit(1);
  });
