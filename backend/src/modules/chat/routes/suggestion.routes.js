import express from 'express';
import { suggestNextWord } from '../controllers/suggestion.controller.js';

const router = express.Router();

router.post('/', suggestNextWord);

export default router;
