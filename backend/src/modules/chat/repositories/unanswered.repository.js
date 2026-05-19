import pool from '#db';

const unansweredRepository = {
    async getAll() {
        const [rows] = await pool.execute(
            'SELECT id, question FROM unanswered_questions ORDER BY created_at DESC'
        );
        return rows;
    },

    async deleteById(id) {
        await pool.execute('DELETE FROM unanswered_questions WHERE id = ?', [id]);
    },
};

export default unansweredRepository;
