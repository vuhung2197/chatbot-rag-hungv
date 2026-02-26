import express from 'express';
import readingController from '../controllers/reading.controller.js';
import { verifyToken } from '#shared/middlewares/auth.middleware.js';

const router = express.Router();

// Lấy danh sách bài đọc (có cache trong DB)
router.get('/passages', verifyToken, readingController.getPassages);

// Lấy chi tiết 1 bài đọc
router.get('/passages/:id', verifyToken, readingController.getPassage);

// AI sinh bài đọc mới
router.post('/generate', verifyToken, readingController.generatePassage);

// Tra nghĩa từ trong ngữ cảnh
router.post('/lookup', verifyToken, readingController.lookupWord);

// Nộp bài quiz
router.post('/submit-quiz', verifyToken, readingController.submitQuiz);

export default router;
