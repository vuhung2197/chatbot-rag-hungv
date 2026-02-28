import OpenAI from 'openai';
import fs from 'fs';
import { callLLM } from '#services/llmService.js';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export const speakingAiService = {

    // 1. Gửi file lên Whisper để lấy Transcript
    async transcribeAudio(filePath) {
        try {
            console.log('🎙️ Gửi Audio cho Whisper:', filePath);
            const transcription = await openai.audio.transcriptions.create({
                file: fs.createReadStream(filePath),
                model: 'whisper-1',
                language: 'en',
                prompt: 'Umm, let me think, like, you know...' // Giữ lại từ ngập ngừng
            });
            console.log('🎙️ Whisper trả về transcript:', transcription.text);
            return transcription.text;
        } catch (error) {
            console.error('Whisper API failed:', error.message);
            throw new Error(`AI không nghe được bạn nói, vui lòng thử lại: ${  error.message}`);
        }
    },

    // 2. Chấm điểm Shadowing
    async gradeShadowing(level, originalText, transcript) {
        const systemPrompt = `You are a strict native English pronunciation evaluator for a ${level} level learner.
Original expected sentence: "${originalText}"
What the user actually said (per Whisper AI): "${transcript}"

Task:
1. Compare what they said with the original sentence.
2. Give a score from 0 to 100 based on accuracy and how many words were correctly spoken.
3. If they missed words, replaced words, or mispronounced them so badly Whisper heard something else, list them as mistakes.
4. If the transcript is empty or gibberish, return 0 score.

Return JSON ONLY:
{
  "score": 85,
  "mistakes": [
    { "expected": "beautiful", "heard": "bootiful", "tip": "Remember to say the 'iew' sound like /bju:tɪfl/" }
  ],
  "overall_comment": "Good job, but pay attention to your vowel sounds."
}`;

        return await this._callGPT(systemPrompt, `Original: ${originalText} | Heard: ${transcript}`);
    },

    // 3. Chấm điểm Topic Speaking (IELTS/Giao tiếp)
    async gradeTopic(level, question, transcript) {
        const systemPrompt = `You are an IELTS Speaking Examiner evaluating a ${level} learner.
Question they answered: "${question}"
User's verbatim transcript: "${transcript}"

Task:
1. Calculate an overall score out of 100 (fluency, vocabulary, grammar, relevance).
2. Point out grammatical errors or awkward phrasing.
3. Suggest native-like improvements for their sentences.
4. Recommend 2-3 advanced vocabulary words they could have used, with Vietnamese translations.

Return JSON ONLY:
{
  "score": 75,
  "errors": [{ "mistake": "I go yesterday", "correction": "I went yesterday", "explanation": "quá khứ" }],
  "improvements": ["Instead of saying 'very good', you could say 'excellent' or 'outstanding'."],
  "advanced_vocabulary": [{ "word": "captivating", "definition": "very attractive", "translation": "thu hút", "level": "B2" }],
  "overall_comment": "Your fluency is good, but work on your past tenses."
}`;

        return await this._callGPT(systemPrompt, `Topic: ${question} | Answer: ${transcript}`);
    },

    // 4. Chấm điểm Reflex Translation
    async gradeReflex(level, vietnamesePrompt, transcript) {
        const systemPrompt = `You are an AI language coach evaluating a Vietnamese student's English translation reflex.
Original Vietnamese sentence: "${vietnamesePrompt}"
What the user spoke (Whisper transcript): "${transcript}"
Student Level: ${level}

Task:
1. Check if their English transcript accurately translates the Vietnamese prompt and uses correct grammar.
2. Give a score from 0 to 100.
3. Provide the most natural native-like translation as 'expected_translation'.
4. Identify any grammatical errors they made.

Return JSON ONLY:
{
  "score": 85,
  "expected_translation": "Have you ever been to Japan?",
  "errors": [{ "mistake": "Did you ever went", "correction": "Have you ever been", "explanation": "Sử dụng thì Hiện tại hoàn thành để diễn tả trải nghiệm" }],
  "overall_comment": "Good reflex but be careful with verb tenses."
}`;

        return await this._callGPT(systemPrompt, `Vietnamese: ${vietnamesePrompt} | User spoke: ${transcript}`);
    },

    // 5. Chấm điểm Luyện Phát Âm (IPA Pronunciation)
    async gradePronunciation(level, originalText, transcript) {
        const systemPrompt = `You are an expert English Phonetics Coach evaluating a user's pronunciation practice.
Student Level: ${level}
Target word/phrase or minimal pairs to pronounce: "${originalText}"
What the user actually said (per Whisper AI): "${transcript}"

Task:
1. Examine if the transcript matches the expected words, paying special attention to common phonetic mistakes (like /θ/ vs /s/, /i:/ vs /ɪ/).
2. Give a score from 0 to 100 based on phonetic accuracy.
3. Identify specific pronunciation mistakes.
4. Provide actionable tips on how to position the mouth, tongue, or lips to fix the mistake.

Return JSON ONLY:
{
  "score": 85,
  "mistakes": [
    { "expected": "think", "heard": "sink", "tip": "Place the tip of your tongue between your upper and lower teeth to make the /θ/ sound, don't keep it behind your teeth." }
  ],
  "overall_comment": "You're getting closer! Make sure to extend your tongue for the TH sound."
}`;

        return await this._callGPT(systemPrompt, `Original: ${originalText} | Heard: ${transcript}`);
    },

    async _callGPT(systemPrompt, userText) {
        const modelConfig = {
            name: 'gpt-4o-mini',
            url: 'https://api.openai.com/v1',
            temperature: 0.3,
            maxTokens: 1000
        };
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userText }
        ];

        try {
            const raw = await callLLM(modelConfig, messages);
            return JSON.parse(raw.replace(/```json\n?|```/g, '').trim());
        } catch (e) {
            console.error('GPT Grader error:', e);
            throw new Error('Không thể chấm điểm lúc này');
        }
    }
};

export default speakingAiService;
