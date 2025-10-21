import { splitIntoSemanticChunks } from '../utils/chunking.js';
import { academicChunking, caseStudyChunking } from '../utils/advancedChunking.js';
import mysql from 'mysql2/promise';

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
 * So sánh trực quan chunks cũ vs mới
 */
async function visualComparison() {
  console.log('👁️ VISUAL COMPARISON: So sánh trực quan chunks cũ vs mới\n');

  try {
    // Lấy dữ liệu thực tế
    const [rows] = await pool.execute(
      'SELECT id, title, content FROM knowledge_base WHERE content IS NOT NULL AND content != "" LIMIT 1'
    );

    if (rows.length === 0) {
      console.log('❌ Không tìm thấy dữ liệu');
      return;
    }

    const { title, content } = rows[0];
    console.log(`📚 Knowledge: ${title}\n`);

    // Thuật toán cũ
    console.log('🔴 THUẬT TOÁN CŨ (splitIntoSemanticChunks):');
    console.log('═'.repeat(80));
    const oldChunks = splitIntoSemanticChunks(content, 100);
    
    oldChunks.forEach((chunk, index) => {
      const wordCount = chunk.split(/\s+/).length;
      const isComplete = chunk.endsWith('.') || chunk.endsWith('!') || chunk.endsWith('?');
      const hasContext = wordCount > 30;
      
      console.log(`\n📦 CHUNK ${index + 1}:`);
      console.log(`   📊 Stats: ${wordCount} từ | Hoàn chỉnh: ${isComplete ? '✅' : '❌'} | Ngữ cảnh: ${hasContext ? '✅' : '❌'}`);
      console.log(`   📝 Content: "${chunk}"`);
      
      // Phân tích vấn đề
      const issues = [];
      if (!isComplete) issues.push('❌ Cắt giữa câu');
      if (!hasContext) issues.push('❌ Thiếu ngữ cảnh');
      if (wordCount < 50) issues.push('❌ Quá ngắn');
      if (wordCount > 150) issues.push('❌ Quá dài');
      
      if (issues.length > 0) {
        console.log(`   ⚠️ Issues: ${issues.join(', ')}`);
      } else {
        console.log(`   ✅ No issues detected`);
      }
    });

    // Thuật toán mới
    console.log('\n\n🟢 THUẬT TOÁN MỚI (Advanced Chunking):');
    console.log('═'.repeat(80));
    
    const newChunks = content.toLowerCase().includes('case study') || 
                      content.toLowerCase().includes('ví dụ') ||
                      content.toLowerCase().includes('ứng dụng') 
                      ? caseStudyChunking(content) 
                      : academicChunking(content);

    newChunks.forEach((chunk, index) => {
      const wordCount = chunk.metadata.wordCount;
      const sentenceCount = chunk.metadata.sentenceCount;
      const isComplete = chunk.metadata.isComplete;
      const hasContext = chunk.metadata.hasContext;
      const boundary = chunk.metadata.boundary;
      
      console.log(`\n📦 CHUNK ${index + 1}:`);
      console.log(`   📊 Stats: ${wordCount} từ | ${sentenceCount} câu | Hoàn chỉnh: ${isComplete ? '✅' : '❌'} | Ngữ cảnh: ${hasContext ? '✅' : '❌'}`);
      console.log(`   🎯 Boundary: ${boundary} | Title: ${chunk.metadata.boundaryTitle || 'N/A'}`);
      console.log(`   📝 Content: "${chunk.content}"`);
      
      // Phân tích chất lượng
      const quality = [];
      if (isComplete) quality.push('✅ Hoàn chỉnh');
      if (hasContext) quality.push('✅ Có ngữ cảnh');
      if (wordCount >= 80 && wordCount <= 200) quality.push('✅ Kích thước tối ưu');
      if (boundary !== 'none') quality.push('✅ Semantic boundary');
      if (sentenceCount >= 2) quality.push('✅ Đa câu');
      
      console.log(`   🏆 Quality: ${quality.join(', ')}`);
    });

    // So sánh tổng thể
    console.log('\n\n📊 SO SÁNH TỔNG THỂ:');
    console.log('═'.repeat(80));
    
    const oldStats = {
      count: oldChunks.length,
      avgWords: oldChunks.reduce((sum, chunk) => sum + chunk.split(/\s+/).length, 0) / oldChunks.length,
      complete: oldChunks.filter(chunk => chunk.endsWith('.') || chunk.endsWith('!') || chunk.endsWith('?')).length,
      contextual: oldChunks.filter(chunk => chunk.split(/\s+/).length > 30).length
    };

    const newStats = {
      count: newChunks.length,
      avgWords: newChunks.reduce((sum, chunk) => sum + chunk.metadata.wordCount, 0) / newChunks.length,
      complete: newChunks.filter(chunk => chunk.metadata.isComplete).length,
      contextual: newChunks.filter(chunk => chunk.metadata.hasContext).length
    };

    console.log('📈 METRICS COMPARISON:');
    console.log(`   Số chunks: ${oldStats.count} → ${newStats.count} (${((newStats.count - oldStats.count) / oldStats.count * 100).toFixed(1)}%)`);
    console.log(`   Từ/chunk: ${oldStats.avgWords.toFixed(1)} → ${newStats.avgWords.toFixed(1)} (${((newStats.avgWords - oldStats.avgWords) / oldStats.avgWords * 100).toFixed(1)}%)`);
    const completenessImprovement = ((newStats.complete/newStats.count) - (oldStats.complete/oldStats.count)) / (oldStats.complete/oldStats.count) * 100;
    console.log(`   Hoàn chỉnh: ${oldStats.complete}/${oldStats.count} → ${newStats.complete}/${newStats.count} (${completenessImprovement.toFixed(1)}%)`);
    const contextualImprovement = ((newStats.contextual/newStats.count) - (oldStats.contextual/oldStats.count)) / (oldStats.contextual/oldStats.count) * 100;
    console.log(`   Có ngữ cảnh: ${oldStats.contextual}/${oldStats.count} → ${newStats.contextual}/${newStats.count} (${contextualImprovement.toFixed(1)}%)`);

    // Đánh giá cải thiện
    console.log('\n🎯 ĐÁNH GIÁ CẢI THIỆN:');
    const improvements = [];
    
    if (newStats.count < oldStats.count) {
      improvements.push(`✅ Giảm ${oldStats.count - newStats.count} chunks (ít noise hơn)`);
    }
    
    if (newStats.avgWords > oldStats.avgWords) {
      improvements.push(`✅ Tăng ${(newStats.avgWords - oldStats.avgWords).toFixed(1)} từ/chunk (ngữ cảnh đầy đủ hơn)`);
    }
    
    if (newStats.complete/newStats.count > oldStats.complete/oldStats.count) {
      improvements.push(`✅ Tăng tỷ lệ hoàn chỉnh (không cắt giữa câu)`);
    }
    
    if (newStats.contextual/newStats.count > oldStats.contextual/oldStats.count) {
      improvements.push(`✅ Tăng tỷ lệ có ngữ cảnh (dễ hiểu hơn)`);
    }

    improvements.forEach(improvement => console.log(`   ${improvement}`));

    // Kết luận
    console.log('\n🏆 KẾT LUẬN:');
    const overallImprovement = (
      Math.abs((newStats.count - oldStats.count) / oldStats.count) +
      Math.abs((newStats.avgWords - oldStats.avgWords) / oldStats.avgWords) +
      Math.abs(((newStats.complete/newStats.count) - (oldStats.complete/oldStats.count)) / (oldStats.complete/oldStats.count)) +
      Math.abs(((newStats.contextual/newStats.count) - (oldStats.contextual/oldStats.count)) / (oldStats.contextual/oldStats.count))
    ) / 4 * 100;

    console.log(`   📊 Điểm cải thiện tổng thể: ${overallImprovement.toFixed(1)}%`);
    
    if (overallImprovement > 50) {
      console.log(`   🚀 CẢI THIỆN VƯỢT TRỘI: Chatbot sẽ có chất lượng trả lời tốt hơn đáng kể!`);
    } else if (overallImprovement > 20) {
      console.log(`   ✅ CẢI THIỆN TỐT: Chatbot sẽ có chất lượng trả lời tốt hơn!`);
    } else {
      console.log(`   ⚠️ CẢI THIỆN NHẸ: Cần tối ưu thêm!`);
    }

  } catch (error) {
    console.error('❌ Error in visual comparison:', error);
  } finally {
    await pool.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Chạy so sánh
visualComparison()
  .then(() => {
    console.log('\n✅ Visual comparison completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Visual comparison failed:', error);
    process.exit(1);
  });
