import pool from '../db.js';

/**
 * Ghi nhận góp ý từ người dùng.
 */
export async function feedback(req, res) {
  const { message, suggested_reply, explanation } = req.body;
  if (!message || !suggested_reply) {
    return res.status(400).json({ message: 'Thiếu thông tin góp ý!' });
  }
  await pool.execute(
    'INSERT INTO feedbacks (message, suggested_reply, explanation) VALUES (?, ?, ?)',
    [message, suggested_reply, explanation]
  );
  res.json({ message: 'Đã ghi nhận góp ý! Admin sẽ kiểm duyệt sớm.' });
}

/**
 * Lấy danh sách góp ý.
 */
export async function list(req, res) {
  const [rows] = await pool.execute(
    'SELECT id, message, suggested_reply, explanation, approved, created_at FROM feedbacks ORDER BY id DESC'
  );
  res.json(rows);
}

/**
 * Duyệt góp ý và lưu vào từ điển nếu chưa có.
 */
export async function approve(req, res) {
  const { id } = req.body;
  // Lấy dữ liệu góp ý
  const [feedbackRows] = await pool.execute(
    'SELECT message, suggested_reply FROM feedbacks WHERE id = ?', [id]
  );
  if (feedbackRows.length === 0) {
    return res.status(404).json({ message: 'Không tìm thấy góp ý!' });
  }

  const { message, suggested_reply } = feedbackRows[0];

  const [exist] = await pool.execute(
    'SELECT id FROM dictionary WHERE word_en = ?', [message.trim().toLowerCase()]
  );
  if (exist.length === 0) {
    // Nếu chưa có thì lưu vào dictionary (bạn bổ sung type/example nếu muốn)
    await pool.execute(
      'INSERT INTO dictionary (word_en, word_vi) VALUES (?, ?)',
      [message.trim().toLowerCase(), suggested_reply]
    );
  }

  // Duyệt góp ý (cập nhật trạng thái)
  const [result] = await pool.execute(
    'UPDATE feedbacks SET approved = 1 WHERE id = ?', [id]
  );

  // Nếu FE muốn xóa khỏi giao diện thì trả message phù hợp về cho FE
  if (result.affectedRows > 0) {
    res.json({ message: 'Góp ý đã được duyệt và lưu vào từ điển!' });
  } else {
    res.status(404).json({ message: 'Không tìm thấy góp ý!' });
  }
}

