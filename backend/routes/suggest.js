import express from 'express';
import { suggestNextWord } from '../controllers/suggestController.js';

const router = express.Router();

router.post('/', suggestNextWord);

export default router;