import { reChunkAllKnowledge } from '../services/updateChunksAdvanced.js';
import '../bootstrap/env.js';

/**
 * Script đơn giản để re-chunk toàn bộ knowledge base
 */
async function simpleReChunk() {
  console.log('🚀 Starting simple re-chunking process...\n');

  try {
    // Re-chunk toàn bộ knowledge base
    const result = await reChunkAllKnowledge();
    
    console.log('\n🎉 Re-chunking completed successfully!');
    console.log(`📊 Results:`);
    console.log(`   - Total chunks created: ${result.total}`);
    console.log(`   - Successfully processed: ${result.processed}`);
    console.log(`   - Skipped (already existed): ${result.skipped}`);
    console.log(`   - Errors: ${result.errors}`);
    
    if (result.errors > 0) {
      console.log('\n⚠️  Some chunks had errors. Check the logs above for details.');
    } else {
      console.log('\n✅ All chunks processed successfully!');
    }

  } catch (error) {
    console.error('❌ Re-chunking failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Chạy re-chunking
simpleReChunk()
  .then(() => {
    console.log('\n🏁 Process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
