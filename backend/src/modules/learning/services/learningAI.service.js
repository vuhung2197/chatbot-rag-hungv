import { callLLM } from '#services/llmService.js';

export const learningAiService = {
    async generateLesson(category, level) {
        const categoryNames = {
            'grammar': 'Ngữ pháp',
            'pattern': 'Mẫu câu giao tiếp',
            'pronunciation': 'Phát âm'
        };

        const systemPrompt = `You are a lively, expert English teacher creating a 3-minute bite-sized micro-lesson for a Vietnamese learner.
Category: ${categoryNames[category]}
Student Level: ${level} (CEFR)

Task:
1. Choose a highly practical, specific topic suitable for this level and category. Don't be too broad.
   - If grammar: focus on one tense, preposition rule, or sentence structure.
   - If pattern: focus on one useful speaking idiom or sentence starter (e.g., "I was wondering if...", "No matter how...").
   - If pronunciation: focus on a challenging sound pair (e.g., /ɪ/ vs /i:/, or word stress rules).
2. Write a short theory section in Vietnamese (clear, engaging, easy to understand).
3. Provide 3 clear examples with English and Vietnamese translation.
4. Create a 3-question multiple-choice quiz to test understanding.
5. Create a flashcard item that summarizes this lesson so it can be saved to their Knowledge Hub.

Return ONLY a perfectly valid JSON object matching this structure:
{
  "title": "Tên bài học (ngắn gọn, hấp dẫn)",
  "theory": "Đoạn lý thuyết giải thích ngắn gọn, dễ hiểu (bằng tiếng Việt)",
  "examples": [
    {"en": "English sentence", "vi": "Câu tiếng Việt", "explain": "Giải thích thêm tại sao dùng thế này"}
  ],
  "quiz": [
    {
      "question": "Câu hỏi trắc nghiệm (tiếng Anh hoặc tiếng Việt tuỳ category)",
      "options": ["Đáp án 1", "Đáp án 2", "Đáp án 3"],
      "correct_index": 0, /* index of the correct option in the options array */
      "explanation": "Giải thích ngắn gọn tại sao đáp án này đúng"
    }
  ],
  "flashcard_item": {
    "word": "Tên chủ đề (để làm mặt trước flashcard)",
    "definition": "Tóm tắt cốt lõi nhất của bài học (để làm mặt sau thẻ nhớ)",
    "grammar_error": "Một ví dụ sai phổ biến (chỉ điền nếu là grammar/pattern, nếu pronunciation thì để trống)",
    "grammar_correction": "Cách sửa lại đúng (nếu có lỗi sai ở trên)"
  }
}

Important: Return JUST the JSON, no markdown formatting (\`\`\`json).`;

        const modelConfig = {
            name: 'gpt-4o-mini',
            url: 'https://api.openai.com/v1',
            temperature: 0.7,
            maxTokens: 1500
        };

        try {
            const rawResponse = await callLLM(modelConfig, [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: 'Generate lesson now.' }
            ]);

            const cleanJson = rawResponse.replace(/```json\n?|```/g, '').trim();
            return JSON.parse(cleanJson);
        } catch (error) {
            console.error('Learning AI Service Error:', error);
            throw new Error('Could not generate lesson at this time. Please try again.');
        }
    }
};

export default learningAiService;
