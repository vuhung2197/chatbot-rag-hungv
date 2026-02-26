import { callLLM } from '#services/llmService.js';

export const listeningAiService = {
    /**
     * Chữa lỗi chép chính tả (Dictation Grading)
     */
    async gradeDictation(level, audioText, userText) {
        try {
            const systemPrompt = `You are an English dictation grader. The user was supposed to listen to an audio and type exactly what they heard.
The CEFR level of the text is ${level}.
Original Audio Text: "${audioText}"
User Typed Text: "${userText}"

Task:
1. Compare "User Typed Text" with "Original Audio Text" word by word. Ignore case and punctuation differences.
2. Calculate a score from 0 to 100 based on accuracy (correct words / total words).
3. If the user text is completely empty or gibberish, return 0 score and empty errors.
4. Extract 1-2 new/good English words from the original text that the user should learn, provide Vietnamese translation.
5. Provide helpful suggestions on what linking words or sound the user might have missed (e.g., "You missed the 's' in 'apples', check your plural nouns.").

Return standard JSON format ONLY:
{
  "scores": {
    "total": <0-100 number>
  },
  "errors": [
     {
        "original": "<wrong phrase the user typed>",
        "correction": "<correct phrase from audio>",
        "explanation": "<short explanation why it sounds like that or grammar rule>"
     }
  ],
  "suggestions": [
     "<helpful tip 1>",
     "<helpful tip 2>"
  ],
  "newWords": [
     {
        "word": "<word>",
        "definition": "<english def>",
        "translation": "<vietnamese translation>",
        "example": "<audio context example>",
        "level": "${level}"
     }
  ]
}

DO NOT output markdown \`\`\`json wrappers. Just raw JSON.`;

            const messages = [{ role: 'system', content: systemPrompt }];
            const modelConfig = {
                name: 'gpt-4o-mini',
                url: 'https://api.openai.com/v1',
                temperature: 0.2,
                maxTokens: 1000
            };

            console.log(`🧠 AI Listening Grading - Bắt đầu chấm`);
            const responseText = await callLLM(modelConfig, messages);

            console.log('\n--- RAW AI RESPONSE (DICTATION) ---');
            console.log(responseText);
            console.log('-----------------------\n');

            let raw = responseText.trim();
            if (raw.startsWith('\`\`\`json')) {
                raw = raw.substring(7);
                if (raw.endsWith('\`\`\`')) raw = raw.substring(0, raw.length - 3);
            } else if (raw.startsWith('\`\`\`')) {
                raw = raw.substring(3);
                if (raw.endsWith('\`\`\`')) raw = raw.substring(0, raw.length - 3);
            }

            const parsed = JSON.parse(raw.trim());
            return {
                scores: parsed.scores || { total: 0 },
                errors: parsed.errors || [],
                suggestions: parsed.suggestions || [],
                newWords: parsed.newWords || []
            };

        } catch (error) {
            console.error('❌ Lỗi chấm bài AI Dictation:', error);
            throw new Error('AI Grading Failed: ' + error.message);
        }
    }
};

export default listeningAiService;
