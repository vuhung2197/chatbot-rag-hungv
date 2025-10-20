// Test logic của vector search flow
import { retrieveTopChunks } from '../services/rag_retrieve.js';

async function testLogic() {
  console.log('🧪 Testing Vector Search Logic...\n');

  try {
    // Tạo mock embedding
    const mockEmbedding = new Array(1536).fill(0.1);
    
    console.log('1️⃣ Testing retrieveTopChunks with mock data...');
    console.log(`📊 Mock embedding length: ${mockEmbedding.length}`);
    
    // Test với các threshold khác nhau
    const thresholds = [0.1, 0.3, 0.5, 0.7];
    
    for (const threshold of thresholds) {
      console.log(`\n🔍 Testing with threshold: ${threshold}`);
      try {
        const results = await retrieveTopChunks(mockEmbedding, 3, threshold);
        console.log(`✅ Retrieved ${results.length} chunks with threshold ${threshold}`);
        
        if (results.length > 0) {
          console.log(`📄 Top result: ${results[0].title} (score: ${results[0].score.toFixed(4)})`);
        }
      } catch (error) {
        console.log(`❌ Error with threshold ${threshold}: ${error.message}`);
      }
    }

    console.log('\n🎉 Logic test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run test
testLogic().catch(console.error);
