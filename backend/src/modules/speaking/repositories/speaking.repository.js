import pool from '#db';

const speakingRepository = {
    // ==================== TOPICS ==================== //

    async getTopics({ type, level, limit = 20, offset = 0 }) {
        let sql = `
            SELECT id, type, level, prompt_text, audio_url, is_active, created_at 
            FROM speaking_topics 
            WHERE is_active = true
        `;
        const params = [];
        let paramIdx = 1;

        if (type) {
            sql += ` AND type = $${paramIdx++}`;
            params.push(type);
        }
        if (level) {
            sql += ` AND level = $${paramIdx++}`;
            params.push(level);
        }

        const countSql = sql.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) as total FROM');
        sql += ` ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
        params.push(limit, offset);

        const [rows] = await pool.query(sql, params);
        const countParams = params.slice(0, -2);
        const [countResultRows] = await pool.query(countSql, countParams);

        return {
            topics: rows,
            total: parseInt(countResultRows[0]?.total || 0)
        };
    },

    async getTopicById(id) {
        const [rows] = await pool.query(
            'SELECT * FROM speaking_topics WHERE id = $1 AND is_active = true',
            [id]
        );
        return rows[0] || null;
    },

    // ==================== SUBMISSIONS ==================== //

    async createSubmission({ userId, topicId, audioUrl }) {
        const [rows] = await pool.query(
            `INSERT INTO speaking_submissions (user_id, topic_id, audio_url, status)
             VALUES ($1, $2, $3, 'grading')
             RETURNING id, user_id, topic_id, status, created_at`,
            [userId, topicId, audioUrl]
        );
        return rows[0];
    },

    async updateSubmissionAfterAI(submissionId, { transcript, scoreTotal, feedback, newWords, status }) {
        const [rows] = await pool.query(
            `UPDATE speaking_submissions 
             SET transcript = $1, score_total = $2, feedback = $3, new_words = $4, status = $5
             WHERE id = $6
             RETURNING *`,
            [transcript, scoreTotal, JSON.stringify(feedback), JSON.stringify(newWords), status, submissionId]
        );
        return rows[0];
    },

    // ==================== LOCAL CACHED AUDIO URL ==================== //

    async updateTopicAudioUrl(id, audioUrl) {
        await pool.query(
            'UPDATE speaking_topics SET audio_url = $1 WHERE id = $2',
            [audioUrl, id]
        );
    },

    // ==================== KNOWLEDGE ITEMS (VOCAB/PRONUNCIATION) ==================== //

    async addKnowledgeBatch(userId, words = [], pronunciationItems = [], submissionId) {
        if (!words.length && !pronunciationItems.length) return;

        for (const w of words) {
            await pool.query(
                `INSERT INTO user_vocabulary (user_id, word, definition, translation, example_sentence, level, source, source_id, item_type)
                 VALUES ($1, $2, $3, $4, $5, $6, 'speaking', $7, 'vocabulary')
                 ON CONFLICT (user_id, word, item_type) DO UPDATE SET 
                    definition = COALESCE(EXCLUDED.definition, user_vocabulary.definition),
                    translation = COALESCE(EXCLUDED.translation, user_vocabulary.translation),
                    updated_at = NOW()`,
                [userId, w.word.toLowerCase().trim(), w.definition, w.translation || '', w.example || '', w.level || 'B1', submissionId]
            );
        }

        for (const p of pronunciationItems) {
            // Dùng lỗi/từ nghe lầm làm từ chính để ôn tập sửa lỗi
            await pool.query(
                `INSERT INTO user_vocabulary (user_id, word, definition, translation, example_sentence, level, source, source_id, item_type)
                 VALUES ($1, $2, $3, $4, $5, $6, 'speaking', $7, 'pronunciation')
                 ON CONFLICT (user_id, word, item_type) DO UPDATE SET 
                    definition = COALESCE(EXCLUDED.definition, user_vocabulary.definition),
                    translation = COALESCE(EXCLUDED.translation, user_vocabulary.translation),
                    updated_at = NOW()`,
                [userId, p.expected.toLowerCase().trim(), p.tip, `Bạn đã đọc là: ${p.heard}`, `Correct pronunciation: ${p.expected}`, 'A1', submissionId]
            );
        }
    },

    // ==================== PRONUNCIATION (IPA) ==================== //

    async getIpaPhonemes() {
        const [rows] = await pool.query(
            `SELECT id, symbol, category, is_voiced, example_words, description, audio_url, video_url 
             FROM ipa_phonemes 
             ORDER BY category, id`
        );
        return rows;
    }
};

export default speakingRepository;
