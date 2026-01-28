import express from 'express';
import * as taixiuController from './taixiu.controller.js';
import { verifyToken as authenticate } from '../../../../middlewares/authMiddleware.js'; // Assuming auth middleware exists

const router = express.Router();

router.post('/bet', authenticate, taixiuController.placeBet);
router.get('/history', authenticate, taixiuController.getHistory);

export default router;
