import pool from '../db.js';

/**
 * Trả về danh sách các câu hỏi chưa được trả lời để admin huấn luyện lại bot
 */
export async function getUnansweredQuestions(req, res) {
  try {
    const [rows] = await pool.execute(
      'SELECT id, question FROM unanswered_questions ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Lỗi lấy danh sách unanswered_questions:', err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/**
 * Xoá 1 câu hỏi đã huấn luyện xong
 */
export async function deleteUnanswered(req, res) {
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM unanswered_questions WHERE id = ?', [id]);
    res.json({ message: 'Đã xóa câu hỏi khỏi danh sách chưa trả lời.' });
  } catch (err) {
    console.error('Lỗi xóa unanswered_questions:', err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}