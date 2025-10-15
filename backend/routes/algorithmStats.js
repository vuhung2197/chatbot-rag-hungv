import express from "express";
import { 
  getAlgorithmStats, 
  getRecentAlgorithmSelections,
  testAlgorithmSelection 
} from "../controllers/algorithmStatsController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Lấy thống kê thuật toán (có thể không cần login để xem thống kê tổng quan)
router.get("/stats", getAlgorithmStats);

// Lấy lịch sử chọn thuật toán
router.get("/history", verifyToken, getRecentAlgorithmSelections);

// Test thuật toán sẽ được chọn cho câu hỏi
router.post("/test", testAlgorithmSelection);

export default router;