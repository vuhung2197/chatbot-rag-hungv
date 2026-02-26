import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import speakingController from '../controllers/speaking.controller.js';
import { verifyToken } from '#shared/middlewares/auth.middleware.js';

const router = express.Router();

// Đảm bảo thư mục uploads/speaking tồn tại
const uploadDir = 'uploads/speaking';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình Multer để lưu file tạm (lưu thẳng đuôi do Frontend gửi lên tuỳ theo OS)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname) || '';
        cb(null, `${req.user.id}-${uniqueSuffix}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB tối đa
});

// APIs
router.get('/topics', verifyToken, speakingController.getTopics);
router.get('/topics/:id', verifyToken, speakingController.getTopicById);
router.get('/topics/:id/audio', verifyToken, speakingController.streamTopicAudio);

// Nộp bài nói qua form-data với trường 'audio'
router.post('/submit', verifyToken, upload.single('audio'), speakingController.submitAudio);

export default router;
