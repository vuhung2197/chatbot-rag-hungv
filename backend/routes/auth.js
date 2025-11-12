import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import {
  register,
  login,
  authGoogle,
  googleCallback,
  linkOAuthProvider,
  unlinkOAuthProvider,
  getLinkedOAuthProviders,
} from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/google', authGoogle);
router.get('/google/callback', googleCallback);

// OAuth provider management (requires authentication)
router.get('/oauth', verifyToken, getLinkedOAuthProviders);
router.post('/oauth/:provider', verifyToken, linkOAuthProvider);
router.delete('/oauth/:provider', verifyToken, unlinkOAuthProvider);

export default router;
