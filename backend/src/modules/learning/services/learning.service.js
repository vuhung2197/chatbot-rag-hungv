import learningAiService from './learningAI.service.js';
import learningRepository from '../repositories/learning.repository.js';

export const learningService = {
    // 1. Lấy bài giảng từ AI
    async getMiniLesson(category, level) {
        // Có thể lưu cache vào Redis hoặc cất DB để tái sử dụng, nhưng vì tên gọi 'Bite-sized AI Lessons', ta sẽ sinh ngẫu nhiên mỗi lần cho phong phú.
        // Trừ khi User chọn "lịch sử", ở đây MVP ta sinh real-time.
        const lessonPlan = await learningAiService.generateLesson(category, level);
        return lessonPlan;
    },

    // 2. Chấm điểm Quiz & Lưu Flashcard
    async submitQuiz(userId, { category, level, title, score, flashcard_item }) {
        // Lưu lịch sử học
        const historyRecord = await learningRepository.saveHistory(userId, category, level, title, score);

        // Lưu ngữ pháp / phát âm vào Knowledge Hub để Ôn tập Spaced Repetition
        if (flashcard_item) {
            await learningRepository.saveToKnowledgeHub(userId, flashcard_item, category, level);
        }

        return historyRecord;
    },

    // 3. (Tuỳ chọn) Lịch sử
    async getUserStats(userId) {
        return await learningRepository.getUserStats(userId);
    }
};

export default learningService;
