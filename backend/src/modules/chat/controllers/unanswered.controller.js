import unansweredService from '../services/unanswered.service.js';

/**
 * Trả về danh sách các câu hỏi chưa được trả lời để admin huấn luyện lại bot
 */
export async function getUnansweredQuestions(req, res) {
    try {
        const rows = await unansweredService.getUnansweredQuestions();
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
        const result = await unansweredService.deleteUnanswered(id);
        res.json(result);
    } catch (err) {
        console.error('Lỗi xóa unanswered_questions:', err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
}

