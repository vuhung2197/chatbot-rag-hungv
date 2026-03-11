import listeningRepository from '../repositories/listening.repository.js';
import listeningAiService from './listeningAI.service.js';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export const listeningService = {
    // ==================== EXERCISES ====================

    async getExercises({ level, type, page = 1, limit = 10 }) {
        const offset = (page - 1) * limit;
        const { exercises, total } = await listeningRepository.getExercises({ level, type, limit, offset });

        return {
            exercises,
            pagination: {
                page, limit, total,
                totalPages: Math.ceil(total / limit)
            }
        };
    },

    async getExerciseById(id) {
        const exercise = await listeningRepository.getExerciseById(id);
        if (!exercise) throw new Error('Listening exercise not found');
        return exercise;
    },

    // ==================== AI GENERATE ====================

    async generateExercise(level, topic) {
        // 1. Lấy danh sách bài đã có cùng level để tránh trùng
        const { exercises: existingExercises } = await listeningRepository.getExercises({ level, type: 'dictation', limit: 50, offset: 0 });
        const existingTexts = existingExercises
            .filter(e => e.audio_text)
            .map(e => e.audio_text);

        const MAX_RETRIES = 3;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            const data = await listeningAiService.generateDictation(level, topic, existingTexts);

            // 2. Kiểm tra trùng lặp nội dung
            const isDuplicate = existingTexts.some(existing =>
                this._isSimilar(existing, data.audio_text)
            );

            if (!isDuplicate) {
                const exercise = await listeningRepository.createExercise(data);
                return exercise;
            }

            console.warn(`⚠️ Listening generate attempt ${attempt}/${MAX_RETRIES}: duplicate detected, retrying...`);
        }

        // Fallback: lưu anyway
        console.warn('⚠️ Listening: All retries exhausted, saving anyway');
        const data = await listeningAiService.generateDictation(level, topic, existingTexts);
        const exercise = await listeningRepository.createExercise(data);
        return exercise;
    },

    /**
     * So sánh tương đồng giữa 2 đoạn text (word-level overlap)
     * Trả về true nếu trùng >60% từ
     */
    _isSimilar(textA, textB) {
        if (!textA || !textB) return false;
        const normalize = (t) => t.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
        const wordsA = normalize(textA);
        const wordsB = normalize(textB);
        if (wordsA.length === 0 || wordsB.length === 0) return false;

        const setB = new Set(wordsB);
        const matchCount = wordsA.filter(w => setB.has(w)).length;
        const similarity = matchCount / Math.max(wordsA.length, wordsB.length);
        return similarity > 0.6;
    },

    // ==================== SUBMISSIONS ====================

    async submitDictation(userId, { exerciseId, content }) {
        if (!content || content.trim().length === 0) {
            throw new Error('Bạn cần nhập ít nhất vài từ cho bài nghe.');
        }

        const exercise = await listeningRepository.getExerciseById(exerciseId);
        if (!exercise || exercise.type !== 'dictation') {
            throw new Error('Bài tập nghe này không hợp lệ hoặc không phải bài chép chính tả.');
        }

        // 1. Create submission
        const submission = await listeningRepository.createSubmission({
            userId, exerciseId, userAnswers: { text: content }
        });

        // 2. Grade with AI (synchronous MVP flow)
        try {
            const feedbackData = await listeningAiService.gradeDictation(exercise.level, exercise.audio_text, content);

            // 3. Save feedback + new words
            const updatedSubmission = await listeningRepository.updateSubmissionFeedback(submission.id, {
                scoreTotal: feedbackData.scores.total || 0,
                feedback: { errors: feedbackData.errors, suggestions: feedbackData.suggestions, original_audio_text: exercise.audio_text },
                newWords: feedbackData.newWords
            });

            // 4. Auto-collect new words locally to the user's vocab if needed (using batch)
            if (feedbackData.newWords && feedbackData.newWords.length > 0) {
                await listeningRepository.addVocabularyBatch(userId, feedbackData.newWords, submission.id)
                    .catch(e => console.error('Silent fail on add vocab:', e.message)); // soft fail if it crashes
            }

            return { ...updatedSubmission, level: exercise.level };

        } catch (e) {
            console.error('Dictation grading failed:', e);
            await listeningRepository.markSubmissionError(submission.id, e.message);
            throw new Error(`AI system failed to process the dictation text. Details: ${e.message}`);
        }
    },

    // ==================== TTS GENERATOR ====================
    async generateAudioStream(text) {
        // We will return a readable stream directly from OpenAI API
        const mp3 = await openai.audio.speech.create({
            model: 'tts-1',
            voice: 'alloy',
            input: text,
        });
        // We convert the ArrayBuffer to Buffer
        const buffer = Buffer.from(await mp3.arrayBuffer());
        return buffer;
    }
};

export default listeningService;
