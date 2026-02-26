import dotenv from 'dotenv';
dotenv.config();

import writingAiService from '../src/modules/writing/services/writingAI.service.js';

async function testGrading() {
    console.log('Testing AI Grading...');

    const exercise = {
        level: 'A2',
        type: 'email',
        prompt: 'Write an email to a friend about your weekend.'
    };

    const userContent = 'Hi John. I has a good weekend. I gos to the cinema with my freinds. The movie was very interesting. Next week we going to the park. Do you want come?';

    try {
        const feedback = await writingAiService.gradeSubmission(exercise, userContent);
        console.log('\n--- GRADING RESULT ---');
        console.log(JSON.stringify(feedback, null, 2));
        console.log('----------------------\n');
        console.log('✅ Grading engine works!');
    } catch (err) {
        console.error('❌ Test failed:', err);
    }
}

testGrading().then(() => process.exit(0));
