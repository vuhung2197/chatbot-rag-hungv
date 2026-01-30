
import express from 'express';
import SlotsController from './slots.controller.js';
import { verifyToken } from '../../../../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/spin', verifyToken, SlotsController.spin);
router.get('/jackpot', SlotsController.getJackpot); // Public endpoint for polling

export default router;
