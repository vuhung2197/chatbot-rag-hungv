import pool from '#db';

class UnansweredService {
    async getUnansweredQuestions() {
        const [rows] = await pool.execute(
            'SELECT id, question FROM unanswered_questions ORDER BY created_at DESC'
        );
        return rows;
    }

    async deleteUnanswered(id) {
        await pool.execute('DELETE FROM unanswered_questions WHERE id = ?', [id]);
        return { message: 'Đã xóa câu hỏi khỏi danh sách chưa trả lời.' };
    }
}

export default new UnansweredService();
