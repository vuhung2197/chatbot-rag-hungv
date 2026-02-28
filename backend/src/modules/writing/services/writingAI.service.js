import { callLLM } from '#services/llmService.js';
import { buildGradingPrompt } from './writing.prompts.js';

// =============================================================================
// AI Grading Engine cho Writing Practice
// =============================================================================

const writingAiService = {
    /**
     * Chấm điểm bài viết của học viên
     * @param {object} exercise - Thông tin đề bài { level, type, prompt }
     * @param {string} userContent - Nội dung học viên viết
     * @returns {object} { scores, errors, suggestions, modelAnswer, newWords }
     */
    async gradeSubmission(exercise, userContent) {
        try {
            const messages = buildGradingPrompt(exercise, userContent);

            const modelConfig = {
                name: 'gpt-4o-mini', // Dùng mini cho tiết kiệm, nâng cao lên 4o nếu cần
                url: 'https://api.openai.com/v1',
                temperature: 0.2,
                maxTokens: 2000
            };

            console.log(`🧠 AI Grading Tool - Bắt đầu chấm bài (Level: ${exercise.level})`);
            const responseText = await callLLM(modelConfig, messages);

            console.log('\n--- RAW AI RESPONSE ---');
            console.log(responseText);
            console.log('-----------------------\n');

            // Parse JSON response safely
            const cleanJson = this._cleanJsonResponse(responseText);
            const parsed = JSON.parse(cleanJson);

            console.log('✅ AI Grading Tool - Chấm bài thành công');
            return {
                scores: parsed.scores || { total: 0, grammar: 0, vocabulary: 0, coherence: 0, task: 0 },
                errors: parsed.errors || [],
                suggestions: parsed.suggestions || [],
                modelAnswer: parsed.modelAnswer || '',
                newWords: parsed.newWords || [],
                grammarItems: parsed.grammarItems || []
            };

        } catch (error) {
            console.error('❌ Lỗi chấm bài AI:', error);
            throw new Error(`AI Grading Failed: ${  error.message}`);
        }
    },

    /**
     * Dọn dẹp JSON output thừa từ LLM (nếu có markdown ```json)
     */
    _cleanJsonResponse(text) {
        let raw = text.trim();
        if (raw.startsWith('```json')) {
            raw = raw.substring(7);
            if (raw.endsWith('```')) {
                raw = raw.substring(0, raw.length - 3);
            }
        } else if (raw.startsWith('```')) {
            raw = raw.substring(3);
            if (raw.endsWith('```')) {
                raw = raw.substring(0, raw.length - 3);
            }
        }
        return raw.trim();
    }
};

export default writingAiService;
