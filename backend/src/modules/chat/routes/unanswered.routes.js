import express from 'express';
import { verifyToken } from '../../../shared/middlewares/auth.middleware.js';
import { getUnansweredQuestions, deleteUnanswered } from '../controllers/unanswered.controller.js';

const router = express.Router();

// Unanswered management usually requires admin rights or at least auth
// Assuming verifyToken is enough based on old code
router.get('/', verifyToken, getUnansweredQuestions);
router.delete('/:id', verifyToken, deleteUnanswered);

export default router;
