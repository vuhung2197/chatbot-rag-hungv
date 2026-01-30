
import express from 'express';
import GamesController from './games.controller.js';
import { verifyToken, requireAdmin } from '../../shared/middlewares/auth.middleware.js';

const router = express.Router();

router.get('/settings', verifyToken, GamesController.getSettings);
router.post('/settings/:gameKey', verifyToken, requireAdmin, GamesController.updateSetting);

export default router;
