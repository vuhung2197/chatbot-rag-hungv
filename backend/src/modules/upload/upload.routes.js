import express from 'express';
import multer from 'multer';
import { verifyToken } from '../../shared/middlewares/auth.middleware.js';
import { uploadAndTrain } from './upload.controller.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// POST /upload (requires authentication)
router.post('/', verifyToken, upload.single('file'), uploadAndTrain);

export default router;
