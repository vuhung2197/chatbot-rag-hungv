import express from 'express';
import listeningController from '../controllers/listening.controller.js';
import { verifyToken } from '#shared/middlewares/auth.middleware.js';

const router = express.Router();

// Lấy danh sách bài tập nghe
router.get('/exercises', verifyToken, listeningController.getExercises);

// Lấy chi tiết bài tập nghe
router.get('/exercises/:id', verifyToken, listeningController.getExercise);

// Lấy (stream) audio cho bài nghe dictation 
router.get('/audio/:id', verifyToken, listeningController.getAudioStream);

// Nộp bài Dictation (Nghe chép chính tả)
router.post('/submit-dictation', verifyToken, listeningController.submitDictation);

export default router;
