
import express from 'express';
import BauCuaController from './baucua.controller.js';
import { verifyToken } from '../../../../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/bet', verifyToken, BauCuaController.placeBet);
router.get('/history', verifyToken, BauCuaController.getHistory);

export default router;
