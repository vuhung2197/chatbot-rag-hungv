import speakingService from '../services/speaking.service.js';
import fs from 'fs';

export const speakingController = {

    // GET /speaking/topics
    async getTopics(req, res) {
        try {
            const { type, level, page = 1, limit = 10 } = req.query;
            const data = await speakingService.getTopics({
                type, level,
                page: parseInt(page),
                limit: parseInt(limit)
            });
            res.status(200).json({ success: true, ...data });
        } catch (error) {
            console.error('Lỗi lấy danh sách topic speaking:', error);
            res.status(500).json({ success: false, error: 'Không thể tải chủ đề' });
        }
    },

    // GET /speaking/topics/:id
    async getTopicById(req, res) {
        try {
            const topic = await speakingService.getTopicById(req.params.id);
            res.status(200).json({ success: true, topic });
        } catch (error) {
            console.error('Lỗi lấy chi tiết topic:', error);
            res.status(404).json({ success: false, error: error.message });
        }
    },

    // GET /speaking/topics/:id/audio
    async streamTopicAudio(req, res) {
        try {
            const buffer = await speakingService.ensureTopicAudio(req.params.id);
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Length', buffer.length);
            res.send(buffer);
        } catch (error) {
            console.error('Lỗi tạo audio mẫu:', error);
            res.status(500).json({ success: false, error: 'Không thể tải audio mẫu' });
        }
    },

    // POST /speaking/submit
    async submitAudio(req, res) {
        try {
            const file = req.file; // From multer
            if (!file) {
                return res.status(400).json({ success: false, error: 'Vui lòng ghi âm file audio!' });
            }

            const { topicId } = req.body;
            if (!topicId) {
                if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                return res.status(400).json({ success: false, error: 'Thiếu topic Id' });
            }

            const submission = await speakingService.submitAudio(req.user.id, {
                topicId,
                audioFilePath: file.path
            });

            res.status(200).json({ success: true, submission });
        } catch (error) {
            console.error('Lỗi nộp bài nói:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

export default speakingController;
