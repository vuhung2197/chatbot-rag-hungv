import express from 'express';
import { getEnvKeys, updateEnvKeys, getPublicEnvKeys, updatePublicEnvKeys } from '../controllers/settings.controller.js';
import { verifyToken } from '#middlewares/authMiddleware.js';

const router = express.Router();

// Public routes for pre-login check
router.get('/public-env', getPublicEnvKeys);
router.post('/public-env', updatePublicEnvKeys);

// Protected routes for post-login
router.use(verifyToken);
router.get('/env', getEnvKeys);
router.post('/env', updateEnvKeys);

export default router;
