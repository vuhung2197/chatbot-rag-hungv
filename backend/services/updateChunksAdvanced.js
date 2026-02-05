import { academicChunking, caseStudyChunking } from '../utils/advancedChunking.js';
import { createHash } from '../utils/hash.js';
import pool from '../db.js';
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
      console.error(`❌ Error processing chunk:`, error.message);
    }
  }

  console.log(`\n📈 Summary:`);
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

/**
 * Re-chunk toàn bộ knowledge base với thuật toán mới
 */
export async function reChunkAllKnowledge() {
  console.log('🚀 Starting re-chunking of all knowledge with advanced algorithm...');
  
  try {
    // Lấy tất cả knowledge base
    const [rows] = await pool.execute(
      'SELECT id, title, content FROM knowledge_base WHERE content IS NOT NULL AND content != ""'
    );

    console.log(`📚 Found ${rows.length} knowledge records`);

    if (rows.length === 0) {
      console.log('⚠️  No records found to process');
      return;
    }

    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const row of rows) {
      try {
        console.log(`\n📝 Processing: ${row.title}`);
        
        // Xóa chunks cũ
        await pool.execute('DELETE FROM knowledge_chunks WHERE parent_id = ?', [row.id]);
        console.log(`🗑️  Deleted old chunks for knowledge ${row.id}`);

        // Tạo chunks mới
        const result = await updateChunksAdvanced(row.id, row.title, row.content, 'auto');
        
        totalProcessed += result.processed;
        totalSkipped += result.skipped;
        totalErrors += result.errors;

      } catch (error) {
        console.error(`❌ Error processing knowledge ${row.id}:`, error.message);
        totalErrors++;
      }
    }

    console.log(`\n🎉 Re-chunking completed!`);
    console.log(`   - Total processed: ${totalProcessed} chunks`);
    console.log(`   - Total skipped: ${totalSkipped} chunks`);
    console.log(`   - Total errors: ${totalErrors} chunks`);

  } catch (error) {
    console.error('❌ Fatal error in re-chunking:', error);
    throw error;
  }
}

/**
 * So sánh chunks cũ và mới cho một knowledge
 */
export async function compareChunkingMethods(knowledgeId) {
  console.log(`🔍 Comparing chunking methods for knowledge ${knowledgeId}...`);
  
  try {
    // Lấy knowledge content
    const [rows] = await pool.execute(
      'SELECT id, title, content FROM knowledge_base WHERE id = ?',
      [knowledgeId]
    );

    if (rows.length === 0) {
      throw new Error(`Knowledge ${knowledgeId} not found`);
    }

    const { title, content } = rows[0];
    
    // Test thuật toán cũ
    const { splitIntoSemanticChunks } = await import('../utils/chunking.js');
    const oldChunks = splitIntoSemanticChunks(content, 100);
    
    // Test thuật toán mới
    const newChunks = academicChunking(content);
    
    console.log(`\n📊 Results for "${title}":`);
    console.log(`   - Old method: ${oldChunks.length} chunks`);
    console.log(`   - New method: ${newChunks.length} chunks`);
    
    const oldAvgWords = oldChunks.reduce((sum, chunk) => sum + chunk.split(/\s+/).length, 0) / oldChunks.length;
    const newAvgWords = newChunks.reduce((sum, chunk) => sum + chunk.metadata.wordCount, 0) / newChunks.length;
    
    console.log(`   - Old avg words: ${oldAvgWords.toFixed(1)}`);
    console.log(`   - New avg words: ${newAvgWords.toFixed(1)}`);
    
    const oldComplete = oldChunks.filter(chunk => 
      chunk.endsWith('.') || chunk.endsWith('!') || chunk.endsWith('?')
    ).length;
    const newComplete = newChunks.filter(chunk => chunk.metadata.isComplete).length;
    
    console.log(`   - Old complete: ${oldComplete}/${oldChunks.length} (${(oldComplete/oldChunks.length*100).toFixed(1)}%)`);
    console.log(`   - New complete: ${newComplete}/${newChunks.length} (${(newComplete/newChunks.length*100).toFixed(1)}%)`);

    return {
      old: {
        count: oldChunks.length,
        avgWords: oldAvgWords,
        complete: oldComplete,
        completeRate: oldComplete / oldChunks.length
      },
      new: {
        count: newChunks.length,
        avgWords: newAvgWords,
        complete: newComplete,
        completeRate: newComplete / newChunks.length
      }
    };

  } catch (error) {
    console.error('❌ Error comparing chunking methods:', error);
    throw error;
  }
}
