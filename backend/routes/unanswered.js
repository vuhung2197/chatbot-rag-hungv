import express from 'express';
import { getUnansweredQuestions, deleteUnanswered } from '../controllers/unansweredController.js';

const router = express.Router();

router.get('/', getUnansweredQuestions);
router.delete('/:id', deleteUnanswered);

export default router;