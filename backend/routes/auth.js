import express from 'express';
import {
  register,
  login,
  authGoogle,
  googleCallback,
} from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/google', authGoogle);
router.get('/google/callback', googleCallback);

export default router;
