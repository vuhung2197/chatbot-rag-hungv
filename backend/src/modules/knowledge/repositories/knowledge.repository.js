import pool from '#db';

const knowledgeRepository = {
    async insertKeywords(keywords) {
        if (keywords.length === 0) return;
        const placeholders = keywords.map(() => '(?)').join(', ');
        await pool.execute(
            `INSERT INTO important_keywords (keyword) VALUES ${placeholders} ON CONFLICT (keyword) DO NOTHING`,
            keywords
        );
    },

    async insert(title, content, embedding) {
        const [rows] = await pool.execute(
            'INSERT INTO knowledge_base (title, content, embedding) VALUES (?, ?, ?) RETURNING id',
            [title, content, JSON.stringify(embedding)]
        );
        return rows[0];
    },

    async findById(id) {
        const [rows] = await pool.execute('SELECT * FROM knowledge_base WHERE id = ?', [id]);
        return rows[0] || null;
    },

    async findByTitle(title) {
        const [rows] = await pool.execute(
            'SELECT id FROM knowledge_base WHERE title = ? LIMIT 1',
            [title]
        );
        return rows[0] || null;
    },

    async getAll() {
        const [rows] = await pool.execute(`
            SELECT
                kb.*,
                COUNT(kc.id) as chunk_count,
                COALESCE(
                    json_agg(
                        json_build_object('id', kc.id, 'token_count', kc.token_count)
                    ) FILTER (WHERE kc.id IS NOT NULL),
                    '[]'::json
                ) as chunks_info
            FROM knowledge_base kb
            LEFT JOIN knowledge_chunks kc ON kb.id = kc.parent_id
            GROUP BY kb.id
            ORDER BY kb.id DESC
        `);
        return rows.map(row => ({
            ...row,
            chunks_info: typeof row.chunks_info === 'string' ? JSON.parse(row.chunks_info) : row.chunks_info,
        }));
    },

    async update(id, title, content, embedding) {
        await pool.execute(
            'UPDATE knowledge_base SET title = ?, content = ?, embedding = ? WHERE id = ?',
            [title, content, JSON.stringify(embedding), id]
        );
    },

    async deleteById(id) {
        await pool.execute('DELETE FROM knowledge_chunks WHERE parent_id = ?', [id]);
        await pool.execute('DELETE FROM knowledge_base WHERE id = ?', [id]);
    },

    async getChunksByKnowledgeId(id) {
        const [rows] = await pool.execute(
            'SELECT id, content, token_count FROM knowledge_chunks WHERE parent_id = ? ORDER BY id ASC',
            [id]
        );
        return rows;
    },
};

export default knowledgeRepository;
