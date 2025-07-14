import pool from '../db.js';
import { StatusCodes } from 'http-status-codes';

/**
 * Lưu bài viết mới của người dùng vào cơ sở dữ liệu.
 * - Nhận topic, content, feedback, score từ request body.
 * - Kiểm tra user đã đăng nhập và có nội dung bài viết.
 * - Trả về thông báo thành công hoặc lỗi khi lưu.
 * @param {object} req - Đối tượng request Express
 * @param {object} res - Đối tượng response Express
 */
export async function submitWriting(req, res) {
  const userId = req.user?.id;
  const { topic, content, feedback = null, score = null } = req.body;

  if (!userId || !content) {
    return res.status(StatusCodes.BAD_REQUEST).json({ error: "Thiếu user hoặc nội dung bài viết" });
  }

  try {
    await pool.execute(
      `INSERT INTO writing_sessions (user_id, topic, content, feedback, score)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, topic, content, feedback, score]
    );
    res.json({ success: true, message: "Đã lưu bài viết" });
  } catch (err) {
    console.error("❌ Lỗi khi lưu bài viết:", err);
    res.status(500).json({ error: "Lỗi khi lưu bài viết" });
  }
}

/**
 * Lấy lịch sử 50 bài viết gần nhất của người dùng.
 * - Kiểm tra user đã đăng nhập.
 * - Trả về danh sách bài viết gồm id, topic, content, feedback, score, created_at.
 * @param {object} req - Đối tượng request Express
 * @param {object} res - Đối tượng response Express
 */
export async function getUserWritingHistory(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Chưa đăng nhập" });

  try {
    const [rows] = await pool.execute(
      `SELECT id, topic, content, feedback, score, created_at 
       FROM writing_sessions 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Lỗi lấy bài viết:", err);
    res.status(500).json({ error: "Không thể lấy lịch sử viết" });
  }
}