import learningService from '../services/learning.service.js';

export const learningController = {
    // [GET] /api/learning/lesson?category=grammar&level=B1
    async generateLesson(req, res) {
        try {
            const { category, level } = req.query;
            if (!category || !level) {
                return res.status(400).json({ error: 'Missing category or level' });
            }

            const lessonPlan = await learningService.getMiniLesson(category, level);
            return res.json({ lesson: lessonPlan });
        } catch (error) {
            console.error('Lỗi [GET] /learning/lesson:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // [POST] /api/learning/submit
    async submitQuiz(req, res) {
        try {
            const userId = req.user.id;
            const { category, level, title, score, flashcard_item } = req.body;

            const history = await learningService.submitQuiz(userId, { category, level, title, score, flashcard_item });

            return res.json({
                message: 'Saved to Knowledge Hub',
                history
            });
        } catch (error) {
            console.error('Lỗi [POST] /learning/submit:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // [GET] /api/learning/stats
    async getStats(req, res) {
        try {
            const userId = req.user.id;
            const stats = await learningService.getUserStats(userId);
            return res.json({ stats });
        } catch (error) {
            console.error('Lỗi [GET] /learning/stats:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

export default learningController;
