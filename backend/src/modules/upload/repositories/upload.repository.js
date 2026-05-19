import pool from '#db';

const uploadRepository = {
    async findKnowledgeByTitle(title) {
        const [rows] = await pool.execute(
            'SELECT id FROM knowledge_base WHERE title = ? LIMIT 1',
            [title]
        );
        return rows[0] || null;
    },

    async insertKnowledge(title, content) {
        const [rows] = await pool.execute(
            'INSERT INTO knowledge_base (title, content) VALUES (?, ?) RETURNING id',
            [title, content]
        );
        return rows[0];
    },
};

export default uploadRepository;
