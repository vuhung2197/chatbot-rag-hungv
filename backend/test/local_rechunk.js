import mysql from 'mysql2/promise';
import { academicChunking, caseStudyChunking } from '../utils/advancedChunking.js';
import { createHash } from '../utils/hash.js';
import { getEmbedding } from '../services/embeddingVector.js';

// Tạo connection trực tiếp với localhost (Docker MySQL)
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'chatbot',
  port: 3307, // Docker MySQL port
  charset: 'utf8mb4',
});

/**
 * Re-chunk toàn bộ knowledge base với thuật toán mới
 */
async function reChunkAllKnowledgeLocal() {
  console.log('🚀 Starting re-chunking of all knowledge with advanced algorithm...');
  
  try {
    // Test connection
    const [testResult] = await pool.execute('SELECT 1 as test');
    console.log('✅ Database connected:', testResult[0].test);

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

        // Chọn thuật toán chunking
        let chunks;
        if (row.content.toLowerCase().includes('case study') || 
            row.content.toLowerCase().includes('ví dụ') ||
            row.content.toLowerCase().includes('ứng dụng')) {
          chunks = caseStudyChunking(row.content);
          console.log('📚 Using case study chunking');
        } else {
          chunks = academicChunking(row.content);
          console.log('📖 Using academic chunking');
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
              [row.id, row.title, chunk.content, JSON.stringify(embedding), chunk.metadata.wordCount, hash]
            );

            processedChunks++;
            console.log(`✅ Processed chunk ${processedChunks}/${chunks.length} (${chunk.metadata.wordCount} words, ${chunk.metadata.boundary} boundary)`);
            
          } catch (error) {
            errorChunks++;
            console.error(`❌ Error processing chunk:`, error.message);
          }
        }

        totalProcessed += processedChunks;
        totalSkipped += skippedChunks;
        totalErrors += errorChunks;

        console.log(`📈 Summary for ${row.title}:`);
        console.log(`   - Processed: ${processedChunks} chunks`);
        console.log(`   - Skipped: ${skippedChunks} chunks`);
        console.log(`   - Errors: ${errorChunks} chunks`);

      } catch (error) {
        console.error(`❌ Error processing knowledge ${row.id}:`, error.message);
        totalErrors++;
      }
    }

    console.log(`\n🎉 Re-chunking completed!`);
    console.log(`   - Total processed: ${totalProcessed} chunks`);
    console.log(`   - Total skipped: ${totalSkipped} chunks`);
    console.log(`   - Total errors: ${totalErrors} chunks`);

    return {
      total: totalProcessed + totalSkipped + totalErrors,
      processed: totalProcessed,
      skipped: totalSkipped,
      errors: totalErrors
    };

  } catch (error) {
    console.error('❌ Fatal error in re-chunking:', error);
    throw error;
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

// Chạy re-chunking
reChunkAllKnowledgeLocal()
  .then((result) => {
    console.log('\n🎉 Re-chunking completed successfully!');
    console.log(`📊 Final Results:`);
    console.log(`   - Total chunks created: ${result.total}`);
    console.log(`   - Successfully processed: ${result.processed}`);
    console.log(`   - Skipped (already existed): ${result.skipped}`);
    console.log(`   - Errors: ${result.errors}`);
    
    if (result.errors > 0) {
      console.log('\n⚠️  Some chunks had errors. Check the logs above for details.');
    } else {
      console.log('\n✅ All chunks processed successfully!');
    }
    
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
