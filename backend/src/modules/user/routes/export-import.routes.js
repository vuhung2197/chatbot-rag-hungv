import express from 'express';
import { verifyToken } from '#shared/middlewares/auth.middleware.js';
import { exportData, importData, uploadMiddleware } from '../controllers/export-import.controller.js';

const router = express.Router();

router.get('/export', verifyToken, exportData);
router.post('/import', verifyToken, uploadMiddleware, importData);

export default router;
