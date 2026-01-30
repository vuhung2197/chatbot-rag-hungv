
import express from 'express';
import WheelController from './wheel.controller.js';
import { verifyToken } from '../../../../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/bet', verifyToken, WheelController.placeBet);
router.get('/history', verifyToken, WheelController.getHistory);

export default router;
