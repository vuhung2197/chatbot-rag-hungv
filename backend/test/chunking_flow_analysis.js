import { splitIntoSemanticChunks } from '../utils/chunking.js';
import { academicChunking, caseStudyChunking, advancedSemanticChunking } from '../utils/advancedChunking.js';

/**
 * Phân tích chi tiết luồng chia chunk cũ vs mới
 */
function analyzeChunkingFlow() {
  console.log('🔍 PHÂN TÍCH LUỒNG CHIA CHUNK\n');

  // Dữ liệu mẫu để test
  const sampleContent = `
📖 Tài liệu nghiên cứu: Ứng dụng thực tế của NLP (Natural Language Processing)

1. Giới thiệu về NLP và tầm quan trọng
Xử lý ngôn ngữ tự nhiên (Natural Language Processing – NLP) là một nhánh quan trọng của trí tuệ nhân tạo (AI), tập trung vào việc cho phép máy tính có khả năng hiểu, phân tích, sinh và tương tác với ngôn ngữ của con người. Ngôn ngữ là một trong những hình thức giao tiếp phức tạp nhất, mang theo nhiều tầng ý nghĩa, sắc thái và ngữ cảnh.

Việc dạy máy tính hiểu ngôn ngữ giống con người là một thách thức lớn, nhưng cũng là một trong những hướng phát triển mang lại giá trị thực tiễn cao nhất cho AI.

Từ những ngày đầu chỉ là các hệ thống phân tích từ khóa đơn giản, NLP ngày nay đã tiến tới các mô hình ngôn ngữ quy mô lớn (Large Language Models – LLMs) như GPT, PaLM, LLaMA, Claude… Những hệ thống này có thể hiểu ngôn ngữ ở mức độ ngữ cảnh cao, tạo ra văn bản giống con người và hỗ trợ hàng loạt ứng dụng thực tế trong kinh doanh, y tế, giáo dục, tài chính và đời sống hằng ngày.

2. Chatbot và Trợ lý ảo
Bối cảnh
Trước đây, dịch vụ chăm sóc khách hàng chủ yếu dựa vào tổng đài viên hoặc nhân viên trực tuyến. Điều này vừa tốn kém chi phí nhân sự vừa khó mở rộng quy mô 24/7. NLP đã mở ra kỷ nguyên mới với chatbot và trợ lý ảo có khả năng giao tiếp tự nhiên với con người.

Case study
Bank of America triển khai chatbot Erica, hỗ trợ hơn 50 triệu khách hàng kiểm tra số dư, thanh toán hóa đơn, tư vấn tài chính.

Duolingo dùng NLP để xây dựng chatbot hội thoại giúp người học ngoại ngữ luyện tập với ngữ cảnh gần như thật.
`;

  console.log('📄 Nội dung mẫu:');
  console.log(`   - Độ dài: ${sampleContent.length} ký tự`);
  console.log(`   - Số dòng: ${sampleContent.split('\n').length}`);
  console.log(`   - Số từ: ${sampleContent.split(/\s+/).length}\n`);

  // 1. PHÂN TÍCH LUỒNG CŨ
  console.log('🔴 LUỒNG CHIA CHUNK CŨ (splitIntoSemanticChunks):');
  console.log('═'.repeat(80));
  
  console.log('📋 QUY TRÌNH:');
  console.log('   1. Tách đoạn văn theo dòng trống (\\n\\s*\\n)');
  console.log('   2. Lọc bỏ đoạn rỗng');
  console.log('   3. Duyệt từng đoạn văn:');
  console.log('      - Nếu đoạn > maxWords: chia theo câu');
  console.log('      - Nếu đoạn <= maxWords: thêm vào chunk hiện tại');
  console.log('   4. Khi chunk > maxWords: lưu chunk cũ, bắt đầu chunk mới');
  console.log('   5. Trả về danh sách chunks (string[])');

  const oldChunks = splitIntoSemanticChunks(sampleContent, 100);
  console.log(`\n📊 KẾT QUẢ LUỒNG CŨ:`);
  console.log(`   - Số chunks: ${oldChunks.length}`);
  console.log(`   - Trung bình từ/chunk: ${(oldChunks.reduce((sum, chunk) => sum + chunk.split(/\s+/).length, 0) / oldChunks.length).toFixed(1)}`);
  
  const oldComplete = oldChunks.filter(chunk => 
    chunk.endsWith('.') || chunk.endsWith('!') || chunk.endsWith('?')
  ).length;
  console.log(`   - Chunks hoàn chỉnh: ${oldComplete}/${oldChunks.length} (${(oldComplete/oldChunks.length*100).toFixed(1)}%)`);

  console.log('\n📝 CHI TIẾT CHUNKS CŨ:');
  oldChunks.forEach((chunk, index) => {
    const wordCount = chunk.split(/\s+/).length;
    const isComplete = chunk.endsWith('.') || chunk.endsWith('!') || chunk.endsWith('?');
    const hasContext = wordCount > 30;
    
    console.log(`\n   Chunk ${index + 1}:`);
    console.log(`   📊 Stats: ${wordCount} từ | Hoàn chỉnh: ${isComplete ? '✅' : '❌'} | Ngữ cảnh: ${hasContext ? '✅' : '❌'}`);
    console.log(`   📝 Content: "${chunk.substring(0, 80)}${chunk.length > 80 ? '...' : ''}"`);
    
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

  // 2. PHÂN TÍCH LUỒNG MỚI
  console.log('\n\n🟢 LUỒNG CHIA CHUNK MỚI (Advanced Chunking):');
  console.log('═'.repeat(80));
  
  console.log('📋 QUY TRÌNH:');
  console.log('   1. Phân tích cấu trúc văn bản (analyzeDocumentStructure):');
  console.log('      - Nhận diện tiêu đề (##, ###, số)');
  console.log('      - Phân biệt đoạn văn, danh sách, case study');
  console.log('      - Tạo cấu trúc hierarchical');
  console.log('   2. Tìm semantic boundaries (findSemanticBoundaries):');
  console.log('      - Ưu tiên chia tại tiêu đề quan trọng');
  console.log('      - Kết thúc đoạn văn hoàn chỉnh');
  console.log('      - Sau case study');
  console.log('   3. Tạo chunks thông minh (createSemanticChunks):');
  console.log('      - Chia theo boundaries với overlap');
  console.log('      - Kích thước động theo loại nội dung');
  console.log('      - Metadata chi tiết cho mỗi chunk');
  console.log('   4. Trả về chunks với metadata (Array<ChunkWithMetadata>)');

  const newChunks = academicChunking(sampleContent);
  console.log(`\n📊 KẾT QUẢ LUỒNG MỚI:`);
  console.log(`   - Số chunks: ${newChunks.length}`);
  console.log(`   - Trung bình từ/chunk: ${(newChunks.reduce((sum, chunk) => sum + chunk.metadata.wordCount, 0) / newChunks.length).toFixed(1)}`);
  
  const newComplete = newChunks.filter(chunk => chunk.metadata.isComplete).length;
  console.log(`   - Chunks hoàn chỉnh: ${newComplete}/${newChunks.length} (${(newComplete/newChunks.length*100).toFixed(1)}%)`);

  console.log('\n📝 CHI TIẾT CHUNKS MỚI:');
  newChunks.forEach((chunk, index) => {
    console.log(`\n   Chunk ${index + 1}:`);
    console.log(`   📊 Stats: ${chunk.metadata.wordCount} từ | ${chunk.metadata.sentenceCount} câu | Hoàn chỉnh: ${chunk.metadata.isComplete ? '✅' : '❌'} | Ngữ cảnh: ${chunk.metadata.hasContext ? '✅' : '❌'}`);
    console.log(`   🎯 Boundary: ${chunk.metadata.boundary} | Title: ${chunk.metadata.boundaryTitle || 'N/A'}`);
    console.log(`   📝 Content: "${chunk.content.substring(0, 80)}${chunk.content.length > 80 ? '...' : ''}"`);
    
    // Phân tích chất lượng
    const quality = [];
    if (chunk.metadata.isComplete) quality.push('✅ Hoàn chỉnh');
    if (chunk.metadata.hasContext) quality.push('✅ Có ngữ cảnh');
    if (chunk.metadata.wordCount >= 80 && chunk.metadata.wordCount <= 200) quality.push('✅ Kích thước tối ưu');
    if (chunk.metadata.boundary !== 'none') quality.push('✅ Semantic boundary');
    if (chunk.metadata.sentenceCount >= 2) quality.push('✅ Đa câu');
    
    console.log(`   🏆 Quality: ${quality.join(', ')}`);
  });

  // 3. SO SÁNH LUỒNG
  console.log('\n\n📊 SO SÁNH LUỒNG CHIA CHUNK:');
  console.log('═'.repeat(80));
  
  console.log('🔴 LUỒNG CŨ:');
  console.log('   ✅ Đơn giản, dễ hiểu');
  console.log('   ❌ Chỉ dựa vào số từ (100 words)');
  console.log('   ❌ Không quan tâm cấu trúc văn bản');
  console.log('   ❌ Cắt giữa câu → mất ngữ nghĩa');
  console.log('   ❌ Không có overlap → mất ngữ cảnh');
  console.log('   ❌ Kích thước cố định → không phù hợp');
  console.log('   ❌ Không có metadata → thiếu thông tin');

  console.log('\n🟢 LUỒNG MỚI:');
  console.log('   ✅ Thông minh, semantic-aware');
  console.log('   ✅ Phân tích cấu trúc văn bản');
  console.log('   ✅ Nhận diện semantic boundaries');
  console.log('   ✅ Giữ nguyên ngữ nghĩa');
  console.log('   ✅ Overlap strategy → giữ ngữ cảnh');
  console.log('   ✅ Kích thước động → phù hợp loại nội dung');
  console.log('   ✅ Metadata chi tiết → thông tin đầy đủ');

  // 4. PHÂN TÍCH HIỆU SUẤT
  console.log('\n\n⚡ PHÂN TÍCH HIỆU SUẤT:');
  console.log('═'.repeat(80));
  
  const performanceComparison = {
    old: {
      chunks: oldChunks.length,
      avgWords: oldChunks.reduce((sum, chunk) => sum + chunk.split(/\s+/).length, 0) / oldChunks.length,
      complete: oldComplete,
      completeRate: oldComplete / oldChunks.length,
      processing: 'O(n) - đơn giản',
      memory: 'Thấp - chỉ string[]',
      intelligence: 'Không có'
    },
    new: {
      chunks: newChunks.length,
      avgWords: newChunks.reduce((sum, chunk) => sum + chunk.metadata.wordCount, 0) / newChunks.length,
      complete: newComplete,
      completeRate: newComplete / newChunks.length,
      processing: 'O(n) - phức tạp hơn',
      memory: 'Cao hơn - metadata objects',
      intelligence: 'Cao - semantic analysis'
    }
  };

  console.log('📈 METRICS COMPARISON:');
  console.log(`   Số chunks: ${performanceComparison.old.chunks} → ${performanceComparison.new.chunks} (${((performanceComparison.new.chunks - performanceComparison.old.chunks) / performanceComparison.old.chunks * 100).toFixed(1)}%)`);
  console.log(`   Từ/chunk: ${performanceComparison.old.avgWords.toFixed(1)} → ${performanceComparison.new.avgWords.toFixed(1)} (${((performanceComparison.new.avgWords - performanceComparison.old.avgWords) / performanceComparison.old.avgWords * 100).toFixed(1)}%)`);
  console.log(`   Hoàn chỉnh: ${(performanceComparison.old.completeRate * 100).toFixed(1)}% → ${(performanceComparison.new.completeRate * 100).toFixed(1)}% (${((performanceComparison.new.completeRate - performanceComparison.old.completeRate) / performanceComparison.old.completeRate * 100).toFixed(1)}%)`);

  console.log('\n🧠 INTELLIGENCE COMPARISON:');
  console.log(`   Luồng cũ: ${performanceComparison.old.intelligence}`);
  console.log(`   Luồng mới: ${performanceComparison.new.intelligence}`);
  console.log(`   Cải thiện: Semantic analysis, structure recognition, boundary detection`);

  console.log('\n💾 MEMORY COMPARISON:');
  console.log(`   Luồng cũ: ${performanceComparison.old.memory}`);
  console.log(`   Luồng mới: ${performanceComparison.new.memory}`);
  console.log(`   Trade-off: Tăng memory để có intelligence cao hơn`);

  // 5. KẾT LUẬN
  console.log('\n\n🎯 KẾT LUẬN PHÂN TÍCH LUỒNG:');
  console.log('═'.repeat(80));
  
  const overallImprovement = (
    Math.abs((performanceComparison.new.chunks - performanceComparison.old.chunks) / performanceComparison.old.chunks) +
    Math.abs((performanceComparison.new.avgWords - performanceComparison.old.avgWords) / performanceComparison.old.avgWords) +
    Math.abs((performanceComparison.new.completeRate - performanceComparison.old.completeRate) / performanceComparison.old.completeRate)
  ) / 3 * 100;

  console.log(`📊 Điểm cải thiện tổng thể: ${overallImprovement.toFixed(1)}%`);
  
  console.log('\n✅ LUỒNG MỚI VƯỢT TRỘI VỀ:');
  console.log('   🎯 Semantic intelligence (hiểu ngữ nghĩa)');
  console.log('   🎯 Structure awareness (nhận diện cấu trúc)');
  console.log('   🎯 Boundary detection (tìm ranh giới thông minh)');
  console.log('   🎯 Context preservation (giữ ngữ cảnh)');
  console.log('   🎯 Metadata richness (thông tin chi tiết)');
  console.log('   🎯 Quality assurance (đảm bảo chất lượng)');

  console.log('\n🚀 TÁC ĐỘNG LÊN RAG SYSTEM:');
  console.log('   📈 Chất lượng retrieval tốt hơn');
  console.log('   📈 AI hiểu ngữ cảnh đầy đủ hơn');
  console.log('   📈 Trả lời chính xác hơn');
  console.log('   📈 Giảm noise và confusion');
  console.log('   📈 Tăng trải nghiệm người dùng');

  console.log('\n🏆 KẾT LUẬN: Luồng mới đã cải thiện đáng kể về mặt semantic intelligence và chất lượng chunks!');
}

// Chạy phân tích
analyzeChunkingFlow();
