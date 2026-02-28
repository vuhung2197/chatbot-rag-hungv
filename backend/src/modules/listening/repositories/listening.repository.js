import pool from '#db';

const listeningRepository = {
    // ==================== EXERCISES ==================== //

    /**
     * Lấy danh sách bài tập nghe theo filter
     */
    async getExercises({ level, type, limit = 20, offset = 0 }) {
        let sql = `
            SELECT id, level, type, title, hints, questions, is_active, created_at 
            FROM listening_exercises 
            WHERE is_active = true
        `;
        const params = [];
        let paramCount = 1;

        if (level) {
            sql += ` AND level = $${paramCount++}`;
            params.push(level);
        }
        if (type) {
            sql += ` AND type = $${paramCount++}`;
            params.push(type);
        }

        sql += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
        params.push(limit, offset);

        const [rows] = await pool.execute(sql, params);

        // Count total
        let countSql = 'SELECT COUNT(*) as total FROM listening_exercises WHERE is_active = true';
        const countParams = [];
        if (level) { countSql += ' AND level = $1'; countParams.push(level); }
        if (type) { countSql += ` AND type = $${countParams.length + 1}`; countParams.push(type); }

        const [countRows] = await pool.execute(countSql, countParams);

        return {
            exercises: rows,
            total: parseInt(countRows[0].total)
        };
    },

    /**
     * Lấy chi tiết bài tập theo ID
     */
    async getExerciseById(id) {
        const [rows] = await pool.execute(
            'SELECT * FROM listening_exercises WHERE id = $1 AND is_active = true',
            [id]
        );
        return rows[0] || null;
    },

    /**
     * Cập nhật audio_url sau khi tạo TTS
     */
    async updateExerciseAudio(id, audioUrl) {
        await pool.execute(
            'UPDATE listening_exercises SET audio_url = $1 WHERE id = $2',
            [audioUrl, id]
        );
    },

    // ==================== SUBMISSIONS ==================== //

    /**
     * Tạo bài làm mới
     */
    async createSubmission({ userId, exerciseId, userAnswers }) {
        const [rows] = await pool.execute(
            `INSERT INTO listening_submissions (user_id, exercise_id, user_answers, status)
             VALUES ($1, $2, $3, 'grading')
             RETURNING id, user_id, exercise_id, status, created_at`,
            [userId, exerciseId, JSON.stringify(userAnswers)]
        );
        return rows[0];
    },

    /**
     * Cập nhật kết quả chấm bài AI
     */
    async updateSubmissionFeedback(id, { scoreTotal, feedback, newWords }) {
        const [rows] = await pool.execute(
            `UPDATE listening_submissions 
             SET score_total = $1, feedback = $2, new_words = $3, status = 'graded'
             WHERE id = $4
             RETURNING *`,
            [scoreTotal, JSON.stringify(feedback), JSON.stringify(newWords), id]
        );
        return rows[0];
    },

    /**
     * Đánh dấu bài nộp bị lỗi
     */
    async markSubmissionError(id, errorMsg) {
        await pool.execute(
            'UPDATE listening_submissions SET status = \'error\', feedback = $1 WHERE id = $2',
            [JSON.stringify({ error: errorMsg }), id]
        );
    },

    // ==================== VOCABULARY (Share with Writing) ==================== //
    /**
     * Lưu hàng loạt từ vựng vào kho sổ từ vựng SRS
     */
    async addVocabularyBatch(userId, wordsArray, sourceId) {
        if (!wordsArray || wordsArray.length === 0) return;
        const client = await pool.getConnection();
        try {
            await client.query('BEGIN');
            for (const wordObj of wordsArray) {
                const { word, definition, translation, example, level } = wordObj;
                await client.execute(
                    `INSERT INTO user_vocabulary (user_id, word, definition, translation, example_sentence, source, source_id, level)
                     VALUES ($1, $2, $3, $4, $5, 'listening', $6, $7)
                     ON CONFLICT (user_id, word, item_type) DO UPDATE SET
                       definition = COALESCE(EXCLUDED.definition, user_vocabulary.definition),
                       translation = COALESCE(EXCLUDED.translation, user_vocabulary.translation),
                       example_sentence = COALESCE(EXCLUDED.example_sentence, user_vocabulary.example_sentence),
                       updated_at = NOW()`,
                    [userId, word.toLowerCase().trim(), definition, translation, example, sourceId, level]
                );
            }
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

export default listeningRepository;
