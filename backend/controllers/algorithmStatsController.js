import pool from "../db.js";
import { StatusCodes } from "http-status-codes";

/**
 * Lấy thống kê về việc sử dụng các thuật toán
 * @param {object} req - Đối tượng request Express
 * @param {object} res - Đối tượng response Express
 */
export async function getAlgorithmStats(req, res) {
  const userId = req.user?.id;

  try {
    // Thống kê tổng quan
    const [overallStats] = await pool.execute(`
      SELECT 
        selected_algorithm,
        COUNT(*) as usage_count,
        AVG(confidence) as avg_confidence,
        AVG(relevance_score) as avg_relevance_score
      FROM algorithm_selections 
      ${userId ? 'WHERE user_id = ?' : ''}
      GROUP BY selected_algorithm
      ORDER BY usage_count DESC
    `, userId ? [userId] : []);

    // Thống kê theo loại câu hỏi
    const [questionTypeStats] = await pool.execute(`
      SELECT 
        question_type,
        selected_algorithm,
        COUNT(*) as count,
        AVG(confidence) as avg_confidence
      FROM algorithm_selections 
      ${userId ? 'WHERE user_id = ?' : ''}
      GROUP BY question_type, selected_algorithm
      ORDER BY question_type, count DESC
    `, userId ? [userId] : []);

    // Thống kê hiệu suất theo thời gian (7 ngày gần nhất)
    const [timeStats] = await pool.execute(`
      SELECT 
        DATE(created_at) as date,
        selected_algorithm,
        COUNT(*) as count,
        AVG(confidence) as avg_confidence
      FROM algorithm_selections 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ${userId ? 'AND user_id = ?' : ''}
      GROUP BY DATE(created_at), selected_algorithm
      ORDER BY date DESC, count DESC
    `, userId ? [userId] : []);

    res.json({
      overall: overallStats,
      byQuestionType: questionTypeStats,
      byTime: timeStats,
      isUserSpecific: !!userId
    });

  } catch (error) {
    console.error("❌ Lỗi lấy thống kê thuật toán:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      error: "Không thể lấy thống kê thuật toán" 
    });
  }
}

/**
 * Lấy lịch sử quyết định chọn thuật toán gần nhất
 * @param {object} req - Đối tượng request Express
 * @param {object} res - Đối tượng response Express
 */
export async function getRecentAlgorithmSelections(req, res) {
  const userId = req.user?.id;
  const limit = parseInt(req.query.limit) || 50;

  if (!userId) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ 
      error: "Cần đăng nhập để xem lịch sử" 
    });
  }

  try {
    const [selections] = await pool.execute(`
      SELECT 
        id,
        question,
        selected_algorithm,
        confidence,
        relevance_score,
        matched_keywords,
        question_type,
        created_at
      FROM algorithm_selections 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `, [userId, limit]);

    res.json(selections);

  } catch (error) {
    console.error("❌ Lỗi lấy lịch sử thuật toán:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      error: "Không thể lấy lịch sử chọn thuật toán" 
    });
  }
}

/**
 * API test để kiểm tra thuật toán sẽ được chọn cho câu hỏi
 * @param {object} req - Đối tượng request Express
 * @param {object} res - Đối tượng response Express
 */
export async function testAlgorithmSelection(req, res) {
  const { question } = req.body;
  const userId = req.user?.id;

  if (!question) {
    return res.status(StatusCodes.BAD_REQUEST).json({ 
      error: "Cần cung cấp câu hỏi để test" 
    });
  }

  try {
    const { selectAlgorithm } = await import("../services/algorithmSelector.js");
    const selection = await selectAlgorithm(question, userId);

    res.json({
      question: question.substring(0, 100),
      selectedAlgorithm: selection.algorithm,
      confidence: selection.confidence,
      reason: selection.reason,
      analysis: selection.analysis
    });

  } catch (error) {
    console.error("❌ Lỗi test algorithm selection:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      error: "Không thể test thuật toán" 
    });
  }
}