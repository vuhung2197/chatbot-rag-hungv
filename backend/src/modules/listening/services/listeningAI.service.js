import { callLLM } from '#services/llmService.js';

export const listeningAiService = {
    /**
     * Chữa lỗi chép chính tả (Dictation Grading)
     */
    async gradeDictation(level, audioText, userText) {
        try {
            const systemPrompt = `You are a strict English dictation grader. The user was supposed to listen to an audio and type exactly what they heard.
The CEFR level of the text is ${level}.
Original Audio Text: "${audioText}"
User Typed Text: "${userText}"

Task:
1. Compare "User Typed Text" with "Original Audio Text" word by word in sequence. Ignore case and punctuation differences.
2. STRICT SCORE CALCULATION: Score must be exactly mathematically: (Number of correctly matched words / Total number of words in the Original Audio Text) * 100.
3. If the user writes very few words, the score MUST be very low (e.g. if you have 50 words in Original and user writes 5 correct words, score is 10). Missing words are WRONG words.
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

            console.log('🧠 AI Listening Grading - Bắt đầu chấm');
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
            throw new Error(`AI Grading Failed: ${error.message}`);
        }
    },

    /**
     * Sinh bài nghe dictation mới bằng AI theo level và topic
     */
    async generateDictation(level, topic, existingTexts = []) {
        const wordRanges = {
            'A1': '10-20', 'A2': '15-30', 'B1': '25-45',
            'B2': '40-60', 'C1': '50-80', 'C2': '60-100'
        };

        const topicNames = {
            'daily_life': 'daily life and routine',
            'travel': 'travel and tourism',
            'technology': 'technology and innovation',
            'science': 'science and nature',
            'health': 'health and wellness',
            'business': 'business and work',
            'education': 'education and learning',
            'culture': 'culture and traditions'
        };

        const topicDesc = topicNames[topic] || topic || 'an interesting general topic';

        // Danh sách bài đã có để AI tránh trùng
        const existingSection = existingTexts.length > 0
            ? `\n\n⚠️ IMPORTANT - DO NOT create similar content to these existing dictation exercises:\n${existingTexts.map((t, i) => `${i + 1}. "${t.substring(0, 80)}..."`).join('\n')}\n\nYour new exercise MUST cover a different aspect/angle of the topic.`
            : '';

        const systemPrompt = `You are an English content creator making dictation exercises for CEFR ${level} learners.

Task: Create ONE dictation exercise about "${topicDesc}".

Requirements:
1. Write a natural-sounding English passage of ${wordRanges[level] || '30-50'} words.
2. Use vocabulary and grammar appropriate for CEFR ${level}.
3. The text should be coherent, meaningful, and educational.
4. Create a short, catchy Vietnamese title for this exercise.
5. Provide 1 helpful hint in English about what to listen for.
${existingSection}

Return ONLY valid JSON:
{
  "title": "Tên bài nghe (tiếng Việt, ngắn gọn)",
  "audio_text": "The English passage for dictation...",
  "hints": ["One helpful listening tip"]
}

Do NOT wrap in markdown. Return raw JSON only.`;

        try {
            const modelConfig = {
                name: 'gpt-4o-mini',
                url: 'https://api.openai.com/v1',
                temperature: 0.9,
                maxTokens: 500
            };

            console.log(`✨ AI Listening Generator - Sinh bài nghe mới (${level}/${topic})`);
            const raw = await callLLM(modelConfig, [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Generate a UNIQUE ${level} dictation exercise about ${topicDesc} now. It must be different from any existing exercises.` }
            ]);

            let cleaned = raw.trim();
            if (cleaned.startsWith('```json')) cleaned = cleaned.substring(7);
            if (cleaned.startsWith('```')) cleaned = cleaned.substring(3);
            if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3);

            const parsed = JSON.parse(cleaned.trim());
            return {
                level,
                type: 'dictation',
                title: parsed.title,
                audio_text: parsed.audio_text,
                hints: parsed.hints || []
            };
        } catch (error) {
            console.error('❌ Lỗi sinh bài nghe:', error);
            throw new Error(`AI không thể tạo bài nghe lúc này: ${error.message}`);
        }
    }
};

export default listeningAiService;
