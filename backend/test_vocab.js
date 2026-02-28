import pool from '#db';
import vocabularyRepository from './src/modules/vocabulary/repositories/vocabulary.repository.js';
import '#bootstrap/env.js';

async function runTest() {
    try {
        console.log("Testing getSystemVocabulary...");
        const res = await vocabularyRepository.getSystemVocabulary(1, 'A1');
        console.log("Result length:", res?.length);
        console.log("First item:", res?.[0]);
    } catch (e) {
        console.error("Test failed:", e);
    }
    process.exit(0);
}

runTest();
