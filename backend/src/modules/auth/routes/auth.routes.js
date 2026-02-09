import express from 'express';
import { verifyToken } from '#shared/middlewares/auth.middleware.js';
import {
    register,
    login,
    logout,
    authGoogle,
    googleCallback,
    linkOAuthProvider,
    unlinkOAuthProvider,
    getLinkedOAuthProviders,
} from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', verifyToken, logout);
router.get('/google', authGoogle);
router.get('/google/callback', googleCallback);

// OAuth provider management (requires authentication)
router.get('/oauth', verifyToken, getLinkedOAuthProviders);
router.post('/oauth/:provider', verifyToken, linkOAuthProvider);
router.delete('/oauth/:provider', verifyToken, unlinkOAuthProvider);

export default router;
