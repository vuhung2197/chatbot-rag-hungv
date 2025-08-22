import express from 'express';
import { feedback, list, approve } from '../controllers/feedbackController.js';

const router = express.Router();

router.post('/', feedback);
router.get('/', list);
router.post('/approve', approve);

export default router;
