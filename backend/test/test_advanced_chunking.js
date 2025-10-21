import { compareChunkingMethods, reChunkAllKnowledge } from '../services/updateChunksAdvanced.js';
import '../bootstrap/env.js';

/**
 * Test script để so sánh và cập nhật chunking
 */
async function testAdvancedChunking() {
  console.log('🧪 Testing Advanced Chunking System\n');

  try {
    // 1. Test so sánh cho knowledge đầu tiên
    console.log('1️⃣ Testing chunking comparison...');
    const comparison = await compareChunkingMethods(1);
    
    console.log('\n📈 Comparison Results:');
    console.log(`   Old method: ${comparison.old.count} chunks, ${comparison.old.avgWords.toFixed(1)} avg words, ${(comparison.old.completeRate * 100).toFixed(1)}% complete`);
    console.log(`   New method: ${comparison.new.count} chunks, ${comparison.new.avgWords.toFixed(1)} avg words, ${(comparison.new.completeRate * 100).toFixed(1)}% complete`);
    
    const improvement = {
      wordCount: ((comparison.new.avgWords - comparison.old.avgWords) / comparison.old.avgWords * 100).toFixed(1),
      completeness: ((comparison.new.completeRate - comparison.old.completeRate) / comparison.old.completeRate * 100).toFixed(1)
    };
    
    console.log(`\n📊 Improvements:`);
    console.log(`   Word count change: ${improvement.wordCount}%`);
    console.log(`   Completeness change: ${improvement.completeness}%`);

    // 2. Hỏi user có muốn re-chunk toàn bộ không
    console.log('\n2️⃣ Ready to re-chunk all knowledge with advanced algorithm...');
    console.log('⚠️  This will delete all existing chunks and create new ones!');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    
    // Đếm ngược 5 giây
    for (let i = 5; i > 0; i--) {
      process.stdout.write(`\r   Starting in ${i} seconds...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('\n');

    // 3. Re-chunk toàn bộ
    console.log('3️⃣ Re-chunking all knowledge...');
    const result = await reChunkAllKnowledge();
    
    console.log('\n🎉 Advanced chunking test completed!');
    console.log(`   - Total chunks created: ${result.total}`);
    console.log(`   - Successfully processed: ${result.processed}`);
    console.log(`   - Skipped (already existed): ${result.skipped}`);
    console.log(`   - Errors: ${result.errors}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Chạy test
testAdvancedChunking()
  .then(() => {
    console.log('\n✅ All tests completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
