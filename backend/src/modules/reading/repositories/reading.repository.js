import pool from '#db';

const readingRepository = {
    // ==================== PASSAGES ==================== //

    async getPassages({ level, topic, limit = 20, offset = 0 }) {
        let sql = `
            SELECT id, level, topic, title, summary, word_count, is_generated, created_at 
            FROM reading_passages 
            WHERE is_active = true
        `;
        const params = [];
        let paramIdx = 1;

        if (level) {
            sql += ` AND level = $${paramIdx++}`;
            params.push(level);
        }
        if (topic) {
            sql += ` AND topic = $${paramIdx++}`;
            params.push(topic);
        }

        const countSql = sql.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) as total FROM');
        sql += ` ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
        params.push(limit, offset);

        const [rows] = await pool.query(sql, params);
        const countParams = params.slice(0, -2);
        const [countResultRows] = await pool.query(countSql, countParams);

        return {
            passages: rows,
            total: parseInt(countResultRows[0]?.total || 0)
        };
    },

    async getPassageById(id) {
        const [rows] = await pool.query(
            `SELECT * FROM reading_passages WHERE id = $1 AND is_active = true`,
            [id]
        );
        return rows[0] || null;
    },

    async createPassage({ level, topic, title, content, wordCount, summary, questions, difficultyWords }) {
        const [rows] = await pool.query(
            `INSERT INTO reading_passages (level, topic, title, content, word_count, summary, questions, difficulty_words, is_generated)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
             RETURNING *`,
            [level, topic, title, content, wordCount, summary, JSON.stringify(questions), JSON.stringify(difficultyWords)]
        );
        return rows[0];
    },

    // ==================== SUBMISSIONS ==================== //

    async createSubmission({ userId, passageId }) {
        const [rows] = await pool.query(
            `INSERT INTO reading_submissions (user_id, passage_id, status)
             VALUES ($1, $2, 'reading')
             RETURNING *`,
            [userId, passageId]
        );
        return rows[0];
    },

    async updateSubmissionQuiz(submissionId, { quizAnswers, scoreTotal, feedback, wordsLookedUp, readingTimeSeconds }) {
        const [rows] = await pool.query(
            `UPDATE reading_submissions 
             SET quiz_answers = $1, score_total = $2, feedback = $3, 
                 words_looked_up = $4, reading_time_seconds = $5, status = 'completed'
             WHERE id = $6
             RETURNING *`,
            [JSON.stringify(quizAnswers), scoreTotal, JSON.stringify(feedback), JSON.stringify(wordsLookedUp), readingTimeSeconds, submissionId]
        );
        return rows[0];
    },

    async markSubmissionError(submissionId, errorMsg) {
        await pool.query(
            `UPDATE reading_submissions SET status = 'error', feedback = $1 WHERE id = $2`,
            [JSON.stringify({ error: errorMsg }), submissionId]
        );
    },

    // ==================== VOCABULARY (reuse user_vocabulary) ==================== //

    async addVocabularyBatch(userId, words, submissionId) {
        for (const w of words) {
            await pool.query(
                `INSERT INTO user_vocabulary (user_id, word, definition, translation, example, level, source, submission_id)
                 VALUES ($1, $2, $3, $4, $5, $6, 'reading', $7)
                 ON CONFLICT (user_id, word) DO UPDATE SET 
                    definition = EXCLUDED.definition,
                    translation = EXCLUDED.translation,
                    updated_at = NOW()`,
                [userId, w.word, w.definition, w.translation || '', w.example || '', w.level || 'B1', submissionId]
            );
        }
    }
};

export default readingRepository;
