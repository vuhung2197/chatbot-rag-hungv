import express from 'express';
import { verifyToken } from '#shared/middlewares/auth.middleware.js';
import { validate } from '#shared/middlewares/validate.middleware.js';
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
import { registerSchema, loginSchema, oauthProviderSchema } from '../auth.schemas.js';

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/logout', verifyToken, logout);
router.get('/google', authGoogle);
router.get('/google/callback', googleCallback);

// OAuth provider management (requires authentication)
router.get('/oauth', verifyToken, getLinkedOAuthProviders);
router.post('/oauth/:provider', verifyToken, validate(oauthProviderSchema), linkOAuthProvider);
router.delete('/oauth/:provider', verifyToken, validate(oauthProviderSchema), unlinkOAuthProvider);

export default router;
