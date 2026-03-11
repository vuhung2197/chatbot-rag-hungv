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
            throw new Error(`AI Grading Failed: ${error.message}`);
        }
    },

    /**
     * Sinh bài tập viết mới bằng AI theo level và type
     * @param {string} level - CEFR level (A1-C2)
     * @param {string} type - Loại bài (sentence, email, story, opinion, essay, report)
     * @returns {object} { level, type, title, prompt, hints, min_words, max_words }
     */
    async generateExercise(level, type, existingTitles = []) {
        const wordRanges = {
            'A1': { min: 10, max: 50 },
            'A2': { min: 30, max: 100 },
            'B1': { min: 80, max: 180 },
            'B2': { min: 150, max: 280 },
            'C1': { min: 250, max: 400 },
            'C2': { min: 400, max: 600 }
        };

        const typeDescriptions = {
            'sentence': 'simple sentences or short paragraph about a daily topic',
            'email': 'a short email (formal or informal depending on level)',
            'story': 'a narrative story or personal experience',
            'opinion': 'an opinion essay with supporting arguments',
            'essay': 'a structured academic essay with introduction, body, and conclusion',
            'report': 'a formal report or review with analysis'
        };

        const range = wordRanges[level] || { min: 80, max: 200 };
        const typeDesc = typeDescriptions[type] || 'a general writing exercise';

        // Danh sách bài đã có để AI tránh trùng
        const existingSection = existingTitles.length > 0
            ? `\n\n⚠️ IMPORTANT - The following exercise topics/titles already exist. You MUST create something COMPLETELY DIFFERENT:\n${existingTitles.map((t, i) => `${i + 1}. "${t}"`).join('\n')}\n\nDo NOT repeat these themes. Be creative and pick a fresh, unique topic!`
            : '';

        const systemPrompt = `You are an expert English curriculum designer creating writing exercises for CEFR ${level} learners.

Task: Create ONE new, creative, and engaging writing exercise.
Type: ${type} (${typeDesc})
CEFR Level: ${level}
Word count range: ${range.min}-${range.max} words

Requirements:
1. The topic must be practical, interesting, and culturally relevant.
2. The prompt should be clear and specific enough for the student to understand what to write.
3. Provide 3-4 helpful hints/sentence starters in English.
4. Make the topic DIFFERENT from common textbook topics - be creative!
5. The difficulty of vocabulary and grammar in the prompt should match ${level} level.
${existingSection}

Return ONLY a valid JSON object:
{
  "title": "Short catchy title for the exercise",
  "prompt": "Detailed writing prompt/instructions for the student",
  "hints": ["Hint 1...", "Hint 2...", "Hint 3..."],
  "min_words": ${range.min},
  "max_words": ${range.max}
}

Do NOT wrap in markdown. Return raw JSON only.`;

        try {
            const modelConfig = {
                name: 'gpt-4o-mini',
                url: 'https://api.openai.com/v1',
                temperature: 0.9,
                maxTokens: 800
            };

            console.log(`✨ AI Writing Generator - Sinh bài tập mới (${level}/${type})`);
            const raw = await callLLM(modelConfig, [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Generate a UNIQUE and CREATIVE ${level} ${type} writing exercise now. It must be different from any existing exercises.` }
            ]);

            const parsed = JSON.parse(this._cleanJsonResponse(raw));
            return {
                level,
                type,
                title: parsed.title,
                prompt: parsed.prompt,
                hints: parsed.hints || [],
                min_words: parsed.min_words || range.min,
                max_words: parsed.max_words || range.max
            };
        } catch (error) {
            console.error('❌ Lỗi sinh bài tập Writing:', error);
            throw new Error(`AI không thể tạo bài tập lúc này: ${error.message}`);
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
