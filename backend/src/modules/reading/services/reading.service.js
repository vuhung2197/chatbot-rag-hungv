import readingRepository from '../repositories/reading.repository.js';
import readingAiService from './readingAI.service.js';

export const readingService = {

    // ==================== PASSAGES ==================== //

    async getPassages({ level, topic, page = 1, limit = 10 }) {
        const offset = (page - 1) * limit;
        const { passages, total } = await readingRepository.getPassages({ level, topic, limit, offset });
        return {
            passages,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        };
    },

    async getPassageById(id) {
        const passage = await readingRepository.getPassageById(id);
        if (!passage) throw new Error('Reading passage not found');
        return passage;
    },

    // Sinh bài đọc mới bằng AI
    async generatePassage(level, topic) {
        const data = await readingAiService.generatePassage(level, topic);

        // Lưu vào DB để cache
        const passage = await readingRepository.createPassage({
            level,
            topic,
            title: data.title,
            content: data.content,
            wordCount: data.wordCount || data.content.split(/\s+/).length,
            summary: data.summary,
            questions: data.questions || [],
            difficultyWords: data.difficultyWords || []
        });

        return passage;
    },

    // ==================== WORD LOOKUP ==================== //

    async lookupWord(word, sentence, level) {
        return await readingAiService.lookupWord(word, sentence, level);
    },

    // ==================== QUIZ SUBMISSION ==================== //

    async submitQuiz(userId, { passageId, answers, wordsLookedUp = [], readingTimeSeconds = 0 }) {
        const passage = await readingRepository.getPassageById(passageId);
        if (!passage) throw new Error('Passage not found');

        const questions = passage.questions || [];
        if (questions.length === 0) throw new Error('No quiz questions available for this passage');

        // Chấm điểm: so sánh đáp án user vs đáp án chuẩn
        let correct = 0;
        const feedback = [];

        for (const q of questions) {
            const userAnswer = answers.find(a => a.id === q.id);
            const isCorrect = userAnswer && userAnswer.answer === q.correctAnswer;
            if (isCorrect) correct++;

            feedback.push({
                questionId: q.id,
                question: q.question || q.statement,
                userAnswer: userAnswer?.answer || 'Không trả lời',
                correctAnswer: q.correctAnswer,
                isCorrect: !!isCorrect,
                explanation: q.explanation
            });
        }

        const scoreTotal = Math.round((correct / questions.length) * 100);

        // Tạo submission
        const submission = await readingRepository.createSubmission({ userId, passageId });

        // Update với kết quả quiz
        const updatedSubmission = await readingRepository.updateSubmissionQuiz(submission.id, {
            quizAnswers: answers,
            scoreTotal,
            feedback: { results: feedback, correct, total: questions.length },
            wordsLookedUp,
            readingTimeSeconds
        });

        // Lưu từ đã tra vào SRS
        if (wordsLookedUp.length > 0) {
            await readingRepository.addVocabularyBatch(userId, wordsLookedUp, submission.id)
                .catch(e => console.error('Silent vocab save fail:', e.message));
        }

        return { ...updatedSubmission, level: passage.level };
    }
};

export default readingService;
