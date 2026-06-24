import { academicChunking, caseStudyChunking } from '#utils/advancedChunking.js';
import { createHash } from '#utils/hash.js';
import pool from '#db';
import { getEmbedding } from './embeddingVector.js';

/**
 * Cập nhật chunks với thuật toán thông minh
 * @param {number|string} id - ID của bản ghi kiến thức cha
 * @param {string} title - Tiêu đề kiến thức
 * @param {string} content - Nội dung kiến thức
 * @param {string} chunkingType - Loại chunking: 'academic' | 'case_study' | 'auto'
 */
export async function updateChunksAdvanced(id, title, content, chunkingType = 'auto') {
  console.log(`🔄 Updating chunks for knowledge ${id} with ${chunkingType} chunking...`);

  // Chọn thuật toán chunking
  let chunks;
  switch (chunkingType) {
    case 'academic':
      chunks = academicChunking(content);
      break;
    case 'case_study':
      chunks = caseStudyChunking(content);
      break;
    case 'auto':
    default:
      // Tự động chọn dựa trên nội dung
      if (content.toLowerCase().includes('case study') ||
        content.toLowerCase().includes('ví dụ') ||
        content.toLowerCase().includes('ứng dụng')) {
        chunks = caseStudyChunking(content);
        console.log('📚 Detected case study content, using case study chunking');
      } else {
        chunks = academicChunking(content);
        console.log('📖 Using academic chunking');
      }
      break;
  }

  console.log(`📊 Generated ${chunks.length} semantic chunks`);

  let processedChunks = 0;
  let skippedChunks = 0;
  let errorChunks = 0;

  for (const chunk of chunks) {
    try {
      const hash = createHash(chunk.content);

      // Kiểm tra nếu đã tồn tại chunk này
      const [exists] = await pool.execute(
        'SELECT id FROM knowledge_chunks WHERE hash = ? LIMIT 1',
        [hash]
      );

      if (exists.length > 0) {
        skippedChunks++;
        console.log(`⏭️  Skipped existing chunk (${chunk.metadata.wordCount} words)`);
        continue;
      }

      // Tạo embedding
      const embedding = await getEmbedding(chunk.content);

      // Lưu chunk với metadata
      await pool.execute(
        `INSERT INTO knowledge_chunks 
          (parent_id, title, content, embedding, token_count, hash) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, title, chunk.content, JSON.stringify(embedding), chunk.metadata.wordCount, hash]
      );

      processedChunks++;
      console.log(`✅ Processed chunk ${processedChunks}/${chunks.length} (${chunk.metadata.wordCount} words, ${chunk.metadata.boundary} boundary)`);

    } catch (error) {
      errorChunks++;
      console.error('❌ Error processing chunk:', error.message);
    }
  }

  console.log('\n📈 Summary:');
  console.log(`   - Processed: ${processedChunks} chunks`);
  console.log(`   - Skipped: ${skippedChunks} chunks`);
  console.log(`   - Errors: ${errorChunks} chunks`);
  console.log(`   - Total: ${chunks.length} chunks`);

  return {
    total: chunks.length,
    processed: processedChunks,
    skipped: skippedChunks,
    errors: errorChunks
  };
}
