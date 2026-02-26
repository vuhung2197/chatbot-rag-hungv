import express from 'express';
import { verifyToken } from '#middlewares/authMiddleware.js';
import learningController from '../controllers/learning.controller.js';

const router = express.Router();

// Middleware auth chung
router.use(verifyToken);

// [GET] /api/learning/curriculum
router.get('/curriculum', learningController.getCurriculum);

// [GET] /api/learning/lesson
router.get('/lesson', learningController.generateLesson);

// [POST] /api/learning/submit
router.post('/submit', learningController.submitQuiz);

// [GET] /api/learning/stats
router.get('/stats', learningController.getStats);

export default router;
