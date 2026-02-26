import express from 'express';
import { verifyToken } from '#shared/middlewares/auth.middleware.js';
import {
    getExercises,
    getExerciseById,
    submitWriting,
    getSubmissions,
    getSubmissionDetail,
    getStreak,
    useStreakFreeze,
    getVocabulary,
    addVocabulary,
    getVocabularyForReview,
    reviewVocabulary,
    deleteVocabulary,
    getStats
} from '../controllers/writing.controller.js';

const router = express.Router();

// ==================== EXERCISES (Public - no auth required) ====================
router.get('/exercises', getExercises);
router.get('/exercises/:id', getExerciseById);

// ==================== SUBMISSIONS (Auth required) ====================
router.post('/submit', verifyToken, submitWriting);
router.get('/submissions', verifyToken, getSubmissions);
router.get('/submissions/:id', verifyToken, getSubmissionDetail);

// ==================== STREAK (Auth required) ====================
router.get('/streak', verifyToken, getStreak);
router.post('/streak/freeze', verifyToken, useStreakFreeze);

// ==================== VOCABULARY (Auth required) ====================
router.get('/vocabulary', verifyToken, getVocabulary);
router.post('/vocabulary', verifyToken, addVocabulary);
router.get('/vocabulary/review', verifyToken, getVocabularyForReview);
router.put('/vocabulary/:id/review', verifyToken, reviewVocabulary);
router.delete('/vocabulary/:id', verifyToken, deleteVocabulary);

// ==================== STATS (Auth required) ====================
router.get('/stats', verifyToken, getStats);

export default router;
