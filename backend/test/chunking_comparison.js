import { splitIntoSemanticChunks } from '../utils/chunking.js';
import { advancedSemanticChunking, academicChunking, caseStudyChunking } from '../utils/advancedChunking.js';

// Nội dung mẫu từ NLP document
const sampleContent = `
📖 Tài liệu nghiên cứu: Ứng dụng thực tế của NLP (Natural Language Processing)

1. Giới thiệu về NLP và tầm quan trọng
Xử lý ngôn ngữ tự nhiên (Natural Language Processing – NLP) là một nhánh quan trọng của trí tuệ nhân tạo (AI), tập trung vào việc cho phép máy tính có khả năng hiểu, phân tích, sinh và tương tác với ngôn ngữ của con người. Ngôn ngữ là một trong những hình thức giao tiếp phức tạp nhất, mang theo nhiều tầng ý nghĩa, sắc thái và ngữ cảnh.

Việc dạy máy tính hiểu ngôn ngữ giống con người là một thách thức lớn, nhưng cũng là một trong những hướng phát triển mang lại giá trị thực tiễn cao nhất cho AI.

Từ những ngày đầu chỉ là các hệ thống phân tích từ khóa đơn giản, NLP ngày nay đã tiến tới các mô hình ngôn ngữ quy mô lớn (Large Language Models – LLMs) như GPT, PaLM, LLaMA, Claude… Những hệ thống này có thể hiểu ngôn ngữ ở mức độ ngữ cảnh cao, tạo ra văn bản giống con người và hỗ trợ hàng loạt ứng dụng thực tế trong kinh doanh, y tế, giáo dục, tài chính và đời sống hằng ngày.

Theo thống kê của MarketsandMarkets, thị trường NLP toàn cầu dự kiến đạt hơn 40 tỷ USD vào năm 2025, với tốc độ tăng trưởng kép hàng năm (CAGR) khoảng 20%. Điều này cho thấy tầm quan trọng ngày càng tăng của NLP trong mọi lĩnh vực.

2. Chatbot và Trợ lý ảo
Bối cảnh
Trước đây, dịch vụ chăm sóc khách hàng chủ yếu dựa vào tổng đài viên hoặc nhân viên trực tuyến. Điều này vừa tốn kém chi phí nhân sự vừa khó mở rộng quy mô 24/7. NLP đã mở ra kỷ nguyên mới với chatbot và trợ lý ảo có khả năng giao tiếp tự nhiên với con người.

Ứng dụng thực tế
Trợ lý ảo cá nhân: Siri (Apple), Alexa (Amazon), Google Assistant có khả năng nhận lệnh bằng giọng nói để đặt lịch, phát nhạc, điều khiển thiết bị IoT.

Chatbot doanh nghiệp: Hệ thống hỗ trợ khách hàng của ngân hàng, hãng hàng không, thương mại điện tử. Ví dụ: Viettel, VNPT, Shopee sử dụng chatbot để trả lời tự động các câu hỏi cơ bản.

Dịch vụ y tế từ xa: Chatbot hỗ trợ chẩn đoán ban đầu, hướng dẫn bệnh nhân trước khi gặp bác sĩ.

Case study
Bank of America triển khai chatbot Erica, hỗ trợ hơn 50 triệu khách hàng kiểm tra số dư, thanh toán hóa đơn, tư vấn tài chính.

Duolingo dùng NLP để xây dựng chatbot hội thoại giúp người học ngoại ngữ luyện tập với ngữ cảnh gần như thật.

Lợi ích và thách thức
Lợi ích: Tiết kiệm chi phí, tăng tốc độ phản hồi, hỗ trợ quy mô lớn.
Thách thức: Cần hiểu ngữ cảnh phức tạp, xử lý mỉa mai, ẩn dụ và cảm xúc con người.
`;

console.log('🔍 So sánh thuật toán chia chunk\n');

// Test thuật toán cũ
console.log('📊 THUẬT TOÁN CŨ (splitIntoSemanticChunks):');
const oldChunks = splitIntoSemanticChunks(sampleContent, 100);
console.log(`Số chunks: ${oldChunks.length}`);
oldChunks.forEach((chunk, index) => {
  const wordCount = chunk.split(/\s+/).length;
  const isComplete = chunk.endsWith('.') || chunk.endsWith('!') || chunk.endsWith('?');
  console.log(`\nChunk ${index + 1} (${wordCount} từ, hoàn chỉnh: ${isComplete}):`);
  console.log(`"${chunk.substring(0, 150)}${chunk.length > 150 ? '...' : ''}"`);
});

console.log('\n' + '='.repeat(80) + '\n');

// Test thuật toán mới - Academic
console.log('📊 THUẬT TOÁN MỚI (Academic Chunking):');
const newChunks = academicChunking(sampleContent);
console.log(`Số chunks: ${newChunks.length}`);
newChunks.forEach((chunk, index) => {
  console.log(`\nChunk ${index + 1} (${chunk.metadata.wordCount} từ, ${chunk.metadata.sentenceCount} câu):`);
  console.log(`Boundary: ${chunk.metadata.boundary}, Complete: ${chunk.metadata.isComplete}`);
  console.log(`"${chunk.content.substring(0, 150)}${chunk.content.length > 150 ? '...' : ''}"`);
});

console.log('\n' + '='.repeat(80) + '\n');

// Test thuật toán mới - Case Study
console.log('📊 THUẬT TOÁN MỚI (Case Study Chunking):');
const caseStudyChunks = caseStudyChunking(sampleContent);
console.log(`Số chunks: ${caseStudyChunks.length}`);
caseStudyChunks.forEach((chunk, index) => {
  console.log(`\nChunk ${index + 1} (${chunk.metadata.wordCount} từ, ${chunk.metadata.sentenceCount} câu):`);
  console.log(`Boundary: ${chunk.metadata.boundary}, Complete: ${chunk.metadata.isComplete}`);
  console.log(`"${chunk.content.substring(0, 150)}${chunk.content.length > 150 ? '...' : ''}"`);
});

console.log('\n' + '='.repeat(80) + '\n');

// Thống kê so sánh
console.log('📈 THỐNG KÊ SO SÁNH:');
console.log(`Thuật toán cũ: ${oldChunks.length} chunks`);
console.log(`Academic chunking: ${newChunks.length} chunks`);
console.log(`Case study chunking: ${caseStudyChunks.length} chunks`);

const oldAvgWords = oldChunks.reduce((sum, chunk) => sum + chunk.split(/\s+/).length, 0) / oldChunks.length;
const newAvgWords = newChunks.reduce((sum, chunk) => sum + chunk.metadata.wordCount, 0) / newChunks.length;
const caseAvgWords = caseStudyChunks.reduce((sum, chunk) => sum + chunk.metadata.wordCount, 0) / caseStudyChunks.length;

console.log(`\nTrung bình từ/chunk:`);
console.log(`- Thuật toán cũ: ${oldAvgWords.toFixed(1)} từ`);
console.log(`- Academic: ${newAvgWords.toFixed(1)} từ`);
console.log(`- Case study: ${caseAvgWords.toFixed(1)} từ`);

const oldComplete = oldChunks.filter(chunk => 
  chunk.endsWith('.') || chunk.endsWith('!') || chunk.endsWith('?')
).length;
const newComplete = newChunks.filter(chunk => chunk.metadata.isComplete).length;
const caseComplete = caseStudyChunks.filter(chunk => chunk.metadata.isComplete).length;

console.log(`\nChunks hoàn chỉnh:`);
console.log(`- Thuật toán cũ: ${oldComplete}/${oldChunks.length} (${(oldComplete/oldChunks.length*100).toFixed(1)}%)`);
console.log(`- Academic: ${newComplete}/${newChunks.length} (${(newComplete/newChunks.length*100).toFixed(1)}%)`);
console.log(`- Case study: ${caseComplete}/${caseStudyChunks.length} (${(caseComplete/caseStudyChunks.length*100).toFixed(1)}%)`);

console.log('\n✅ Hoàn thành so sánh!');
