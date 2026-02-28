import express from 'express';
import vocabularyController from '../controllers/vocabulary.controller.js';
import { verifyToken } from '#shared/middlewares/auth.middleware.js';

const router = express.Router();

// 1. Get system library
router.get('/system', verifyToken, vocabularyController.getSystemVocabulary);

// 2. Recommend daily words
router.get('/recommend', verifyToken, vocabularyController.getRecommendWords);

// 3. User adding system words to their deck
router.post('/add', verifyToken, vocabularyController.addSystemWord);
router.post('/add-multiple', verifyToken, vocabularyController.addMultipleSystemWords);

// 4. Get User's dictionary (mixed with collected errors)
router.get('/user', verifyToken, vocabularyController.getUserVocabulary);

// 5. Spaced Repetition Logic - Get Due Reviews
router.get('/review', verifyToken, vocabularyController.getReviewWords);

// 6. SRS: Mark correct/incorrect -> Calculate next review
router.put('/user/:id/mastery', verifyToken, vocabularyController.updateWordMastery);

export default router;
