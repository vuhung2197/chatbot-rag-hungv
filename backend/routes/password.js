import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import {
  changePassword,
  requestPasswordReset,
  resetPassword,
  setPasswordForOAuthUser,
} from '../controllers/passwordController.js';

const router = express.Router();

// Change password (requires authentication)
router.post('/change', verifyToken, changePassword);

// Set password for OAuth users (first time setup, requires authentication)
router.post('/set', verifyToken, setPasswordForOAuthUser);

// Request password reset (no auth required)
router.post('/reset', requestPasswordReset);

// Reset password with token (no auth required)
router.post('/reset/:token', resetPassword);

export default router;

