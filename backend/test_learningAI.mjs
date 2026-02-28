import 'dotenv/config';
import { learningAiService } from './src/modules/learning/services/learningAI.service.js';

(async () => {
    try {
        const res = await learningAiService.generateLesson('grammar', 'B2');
        console.log('SUCCESS:', res);
    } catch (e) {
        console.error('FAIL:', e);
    }
})();
