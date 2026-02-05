import express from 'express';
import { suggestNextWord } from './suggestion.controller.js';

const router = express.Router();

router.post('/', suggestNextWord);

export default router;
