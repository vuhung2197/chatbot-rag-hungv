import pool from '../db.js';
import { splitIntoSemanticChunks } from '../utils/chunking.js';
import { getEmbedding } from './embeddingVector.js';
import '../bootstrap/env.js';

/**
 * Chạy toàn bộ quá trình:
 * - Lấy tất cả bản ghi từ knowledge_base
 * - Chia nhỏ content thành các chunk
 * - Lấy embedding cho từng chunk
 * - Lưu vào bảng knowledge_chunks
 */
(async () => {
  try {
    console.log('🚀 Starting embedding process...');

    const [rows] = await pool.execute(
      'SELECT id, title, content FROM knowledge_base'
    );

    console.log(`📚 Found ${rows.length} records in knowledge_base`);

    if (rows.length === 0) {
      console.log('⚠️  No records found to process');
      return;
    }

    let totalChunks = 0;
    let processedRecords = 0;

    for (const row of rows) {
      try {
        // Kiểm tra content có tồn tại và không rỗng
        if (!row.content || row.content.trim() === '') {
          console.log(`⚠️  Skipping record ${row.id}: empty content`);
          continue;
        }

        console.log(`📝 Processing record ${row.id}: ${row.title}`);

        const chunks = splitIntoSemanticChunks(row.content);
        console.log(`   → Generated ${chunks.length} chunks`);

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];

          try {
            const emb = await getEmbedding(chunk);
            await pool.execute(
              'INSERT INTO knowledge_chunks (parent_id, title, content, embedding, token_count) VALUES (?, ?, ?, ?, ?)',
              [row.id, row.title, chunk, JSON.stringify(emb), chunk.split(' ').length]
            );
            totalChunks++;
            console.log(`   ✓ Chunk ${i + 1}/${chunks.length} embedded`);
          } catch (chunkError) {
            console.error(`   ✗ Error embedding chunk ${i + 1}:`, chunkError.message);
            // Tiếp tục với chunk tiếp theo
          }
        }

        processedRecords++;
      } catch (recordError) {
        console.error(`✗ Error processing record ${row.id}:`, recordError.message);
        // Tiếp tục với record tiếp theo
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   - Processed records: ${processedRecords}/${rows.length}`);
    console.log(`   - Total chunks embedded: ${totalChunks}`);
    console.log('✅ Done embedding all chunks.');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    // Đóng connection pool để tránh memory leak
    await pool.end();
    console.log('🔌 Database connection closed');
  }
})();
