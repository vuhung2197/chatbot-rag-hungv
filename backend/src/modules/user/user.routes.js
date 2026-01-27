import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { verifyToken } from '../../shared/middlewares/auth.middleware.js';
import {
    getProfile,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
    sendEmailVerification,
    verifyEmail,
} from './user.controller.js';

// Get temp dir relative to project root
// process.cwd() is project root (d:\english-chatbot)
// uploads folder is in backend/uploads (d:\english-chatbot\backend\uploads)
const tempDir = path.join(process.cwd(), 'backend', 'uploads', 'temp');

if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

const router = express.Router();

// Configure multer for avatar uploads
const upload = multer({
    dest: tempDir,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận file JPG/PNG'), false);
        }
    },
});

// Profile routes (require authentication)
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);

// Avatar routes (require authentication)
router.post('/avatar', verifyToken, upload.single('avatar'), uploadAvatar);
router.delete('/avatar', verifyToken, deleteAvatar);

// Email verification routes
router.post('/verify-email', verifyToken, sendEmailVerification);
// Verify email with token doesn't require authentication (uses token from URL)
router.get('/verify-email/:token', verifyEmail);

export default router;
