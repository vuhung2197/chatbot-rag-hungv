import express from 'express';
import multer from 'multer';
import { verifyToken } from '../middlewares/authMiddleware.js';
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  sendEmailVerification,
  verifyEmail,
} from '../controllers/profileController.js';

const router = express.Router();

// Configure multer for avatar uploads
const upload = multer({
  dest: 'uploads/temp/',
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

// All routes require authentication
router.use(verifyToken);

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Avatar routes
router.post('/avatar', upload.single('avatar'), uploadAvatar);
router.delete('/avatar', deleteAvatar);

// Email verification routes
router.post('/verify-email', sendEmailVerification);
router.get('/verify-email/:token', verifyEmail);

export default router;

