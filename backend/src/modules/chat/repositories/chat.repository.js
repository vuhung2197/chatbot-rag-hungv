import pool from '#db';

const chatRepository = {
    async findUnansweredByHash(hash) {
        const [rows] = await pool.execute(
            'SELECT 1 FROM unanswered_questions WHERE hash = ? LIMIT 1',
            [hash]
        );
        return rows[0] || null;
    },

    async insertUnanswered(question, hash) {
        await pool.execute(
            'INSERT INTO unanswered_questions (question, hash, created_at) VALUES (?, ?, NOW())',
            [question, hash]
        );
    },

    async getChatHistory(userId, conversationId, limit) {
        const [rows] = await pool.execute(
            `SELECT question, bot_reply FROM user_questions
             WHERE user_id = ? AND conversation_id = ?
             ORDER BY created_at DESC LIMIT ?`,
            [userId, conversationId, limit]
        );
        return rows;
    },

    async countMessages(userId, conversationId) {
        const [rows] = await pool.execute(
            'SELECT COUNT(*) as count FROM user_questions WHERE user_id = ? AND conversation_id = ?',
            [userId, conversationId]
        );
        return parseInt(rows[0].count);
    },

    async insertMessage(userId, conversationId, conversationTitle, question, reply, metadata) {
        await pool.execute(
            'INSERT INTO user_questions (user_id, conversation_id, conversation_title, question, bot_reply, is_answered, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, conversationId, conversationTitle, question, reply, true, JSON.stringify(metadata)]
        );
    },
};

export default chatRepository;
