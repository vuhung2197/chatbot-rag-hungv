import express from "express";
import { submitWriting, getUserWritingHistory } from "../controllers/writingController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post('/submit', verifyToken, submitWriting);
router.get('/history', verifyToken, getUserWritingHistory);

export default router;