import express from 'express';
// import { verifyToken } from "../middlewares/authMiddleware.js";
import {
  getEmail,
  unsubscribeSelected,
  checkTokenStatus,
} from '../controllers/emailController.js';

const router = express.Router();

router.get('/gmail', getEmail);
router.post('/gmail/unsubscribe', unsubscribeSelected);
router.get('/token/status', checkTokenStatus);

export default router;
