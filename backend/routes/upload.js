import express from 'express';
import multer from 'multer';
import { uploadAndTrain } from '../controllers/uploadController.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// POST /upload
router.post('/', upload.single('file'), uploadAndTrain);

export default router;
