import pool from '#db';

// =============================================================================
// Writing Repository - Database Access Layer
// =============================================================================

const writingRepository = {

    // ==================== EXERCISES ====================

    /**
     * Lấy danh sách exercises theo level và type
     */
    async getExercises({ level, type, limit = 20, offset = 0 }) {
        let sql = `SELECT id, level, type, title, prompt, hints, min_words, max_words, created_at
               FROM writing_exercises WHERE is_active = true`;
        const params = [];
        let paramIndex = 1;

        if (level) {
            sql += ` AND level = $${paramIndex++}`;
            params.push(level);
        }
        if (type) {
            sql += ` AND type = $${paramIndex++}`;
            params.push(type);
        }

        sql += ` ORDER BY level, type, id LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        const result = await pool.execute(sql, params);
        return result[0];
    },

    /**
     * Lấy chi tiết exercise theo ID
     */
    async getExerciseById(id) {
        const [rows] = await pool.execute(
            `SELECT id, level, type, title, prompt, hints, min_words, max_words, sample_answer, created_at
       FROM writing_exercises WHERE id = $1 AND is_active = true`,
            [id]
        );
        return rows[0] || null;
    },

    /**
     * Đếm tổng exercises (for pagination)
     */
    async countExercises({ level, type }) {
        let sql = `SELECT COUNT(*)::int as total FROM writing_exercises WHERE is_active = true`;
        const params = [];
        let paramIndex = 1;

        if (level) {
            sql += ` AND level = $${paramIndex++}`;
            params.push(level);
        }
        if (type) {
            sql += ` AND type = $${paramIndex++}`;
            params.push(type);
        }

        const [rows] = await pool.execute(sql, params);
        return rows[0]?.total || 0;
    },

    // ==================== SUBMISSIONS ====================

    /**
     * Tạo submission mới
     */
    async createSubmission({ userId, exerciseId, content, wordCount }) {
        const [rows] = await pool.execute(
            `INSERT INTO writing_submissions (user_id, exercise_id, content, word_count, status)
       VALUES ($1, $2, $3, $4, 'submitted')
       RETURNING id, user_id, exercise_id, content, word_count, status, created_at`,
            [userId, exerciseId, content, wordCount]
        );
        return rows[0];
    },

    /**
     * Cập nhật submission với AI feedback
     */
    async updateSubmissionFeedback(id, { scoreTotal, scoreGrammar, scoreVocabulary, scoreCoherence, scoreTask, feedback, newWords }) {
        const [rows] = await pool.execute(
            `UPDATE writing_submissions 
       SET score_total = $1, score_grammar = $2, score_vocabulary = $3,
           score_coherence = $4, score_task = $5, feedback = $6, new_words = $7, status = 'graded'
       WHERE id = $8
       RETURNING *`,
            [scoreTotal, scoreGrammar, scoreVocabulary, scoreCoherence, scoreTask,
                JSON.stringify(feedback), JSON.stringify(newWords), id]
        );
        return rows[0];
    },

    /**
     * Đánh dấu submission error
     */
    async markSubmissionError(id, errorMsg) {
        await pool.execute(
            `UPDATE writing_submissions SET status = 'error', feedback = $1 WHERE id = $2`,
            [JSON.stringify({ error: errorMsg }), id]
        );
    },

    /**
     * Lấy danh sách submissions của user
     */
    async getSubmissions(userId, { limit = 20, offset = 0 }) {
        const [rows] = await pool.execute(
            `SELECT ws.id, ws.exercise_id, we.title as exercise_title, we.level, we.type,
              ws.word_count, ws.score_total, ws.score_grammar, ws.score_vocabulary,
              ws.score_coherence, ws.score_task, ws.status, ws.created_at
       FROM writing_submissions ws
       LEFT JOIN writing_exercises we ON ws.exercise_id = we.id
       WHERE ws.user_id = $1
       ORDER BY ws.created_at DESC
       LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );
        return rows;
    },

    /**
     * Lấy chi tiết submission
     */
    async getSubmissionById(id, userId) {
        const [rows] = await pool.execute(
            `SELECT ws.*, we.title as exercise_title, we.prompt as exercise_prompt,
              we.level, we.type, we.sample_answer
       FROM writing_submissions ws
       LEFT JOIN writing_exercises we ON ws.exercise_id = we.id
       WHERE ws.id = $1 AND ws.user_id = $2`,
            [id, userId]
        );
        return rows[0] || null;
    },

    /**
     * Đếm submissions hôm nay (for rate limiting)
     */
    async countTodaySubmissions(userId) {
        const [rows] = await pool.execute(
            `SELECT COUNT(*)::int as total FROM writing_submissions
       WHERE user_id = $1 AND created_at::date = CURRENT_DATE`,
            [userId]
        );
        return rows[0]?.total || 0;
    },

    // ==================== STREAKS ====================

    /**
     * Lấy hoặc tạo streak record cho user
     */
    async getOrCreateStreak(userId) {
        // Upsert: insert if not exists, return existing if exists
        const [rows] = await pool.execute(
            `INSERT INTO writing_streaks (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
            [userId]
        );
        return rows[0];
    },

    /**
     * Cập nhật streak sau khi viết bài
     */
    async updateStreak(userId, { currentStreak, longestStreak, lastWritingDate, totalWritings, totalWordsWritten, avgScore, badges }) {
        const [rows] = await pool.execute(
            `UPDATE writing_streaks 
       SET current_streak = $1, longest_streak = $2, last_writing_date = $3,
           total_writings = $4, total_words_written = $5, avg_score = $6, badges = $7
       WHERE user_id = $8
       RETURNING *`,
            [currentStreak, longestStreak, lastWritingDate, totalWritings, totalWordsWritten,
                avgScore, JSON.stringify(badges), userId]
        );
        return rows[0];
    },

    /**
     * Dùng streak freeze
     */
    async useStreakFreeze(userId) {
        const [rows] = await pool.execute(
            `UPDATE writing_streaks 
       SET streak_freezes_remaining = streak_freezes_remaining - 1,
           streak_freezes_used = streak_freezes_used + 1,
           last_writing_date = CURRENT_DATE
       WHERE user_id = $1 AND streak_freezes_remaining > 0
       RETURNING *`,
            [userId]
        );
        return rows[0] || null;
    },

    // ==================== VOCABULARY ====================

    /**
     * Thêm từ vựng (upsert)
     */
    async addVocabulary({ userId, word, definition, translation, exampleSentence, source, sourceId, level }) {
        const [rows] = await pool.execute(
            `INSERT INTO user_vocabulary (user_id, word, definition, translation, example_sentence, source, source_id, level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, word) DO UPDATE SET
         definition = COALESCE(EXCLUDED.definition, user_vocabulary.definition),
         translation = COALESCE(EXCLUDED.translation, user_vocabulary.translation),
         example_sentence = COALESCE(EXCLUDED.example_sentence, user_vocabulary.example_sentence),
         updated_at = NOW()
       RETURNING *`,
            [userId, word.toLowerCase().trim(), definition, translation, exampleSentence, source || 'manual', sourceId, level]
        );
        return rows[0];
    },

    /**
     * Thêm từ vựng (upsert) có hỗ trợ item_type grammar
     */
    async addKnowledgeItem({ userId, word, definition, translation, exampleSentence, source, sourceId, level, item_type = 'vocabulary', grammar_error, grammar_correction }) {
        const [rows] = await pool.execute(
            `INSERT INTO user_vocabulary (user_id, word, definition, translation, example_sentence, source, source_id, level, item_type, grammar_error, grammar_correction)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (user_id, word, item_type) DO UPDATE SET
         definition = COALESCE(EXCLUDED.definition, user_vocabulary.definition),
         translation = COALESCE(EXCLUDED.translation, user_vocabulary.translation),
         example_sentence = COALESCE(EXCLUDED.example_sentence, user_vocabulary.example_sentence),
         grammar_error = COALESCE(EXCLUDED.grammar_error, user_vocabulary.grammar_error),
         grammar_correction = COALESCE(EXCLUDED.grammar_correction, user_vocabulary.grammar_correction),
         updated_at = NOW()
       RETURNING *`,
            [userId, word.toLowerCase().trim(), definition, translation, exampleSentence, source || 'manual', sourceId, level, item_type, grammar_error, grammar_correction]
        );
        return rows[0];
    },

    /**
     * Thêm nhiều từ vựng và ngữ pháp cùng lúc (từ AI feedback)
     */
    async addKnowledgeBatch(userId, words = [], grammarItems = [], sourceId) {
        const results = [];
        for (const w of words) {
            const result = await this.addKnowledgeItem({
                userId,
                word: w.word,
                definition: w.definition,
                translation: w.translation,
                exampleSentence: w.example,
                source: 'writing_feedback',
                sourceId,
                level: w.level,
                item_type: 'vocabulary'
            });
            results.push(result);
        }
        for (const g of grammarItems) {
            const result = await this.addKnowledgeItem({
                userId,
                word: g.word || g.grammar_correction, // Dùng chunk đúng làm key nếu không có word
                definition: g.definition,
                source: 'writing_feedback',
                sourceId,
                level: g.level,
                item_type: 'grammar',
                grammar_error: g.grammar_error,
                grammar_correction: g.grammar_correction
            });
            results.push(result);
        }
        return results;
    },

    /**
     * Lấy danh sách từ vựng của user
     */
    async getVocabulary(userId, { limit = 50, offset = 0, sort = 'created_at', order = 'DESC' }) {
        const allowedSorts = ['created_at', 'word', 'mastery', 'next_review_at'];
        const sortCol = allowedSorts.includes(sort) ? sort : 'created_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const [rows] = await pool.execute(
            `SELECT id, word, definition, translation, example_sentence, source, level, mastery,
              next_review_at, review_count, created_at, item_type, grammar_error, grammar_correction
       FROM user_vocabulary
       WHERE user_id = $1
       ORDER BY ${sortCol} ${sortOrder}
       LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );
        return rows;
    },

    /**
     * Lấy từ cần ôn tập hôm nay
     */
    async getVocabularyForReview(userId, limit = 20) {
        const [rows] = await pool.execute(
            `SELECT id, word, definition, translation, example_sentence, level, mastery, review_count, item_type, grammar_error, grammar_correction
       FROM user_vocabulary
       WHERE user_id = $1 AND next_review_at <= NOW() AND mastery < 5
       ORDER BY next_review_at ASC
       LIMIT $2`,
            [userId, limit]
        );
        return rows;
    },

    /**
     * Cập nhật kết quả ôn tập từ vựng (SRS)
     */
    async updateVocabularyReview(id, userId, { mastery, nextReviewAt }) {
        const [rows] = await pool.execute(
            `UPDATE user_vocabulary 
       SET mastery = $1, next_review_at = $2, review_count = review_count + 1
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
            [mastery, nextReviewAt, id, userId]
        );
        return rows[0] || null;
    },

    /**
     * Xóa từ vựng
     */
    async deleteVocabulary(id, userId) {
        const [result] = await pool.execute(
            `DELETE FROM user_vocabulary WHERE id = $1 AND user_id = $2`,
            [id, userId]
        );
        return result.affectedRows > 0;
    },

    /**
     * Đếm từ vựng của user
     */
    async countVocabulary(userId) {
        const [rows] = await pool.execute(
            `SELECT COUNT(*)::int as total,
              COUNT(CASE WHEN mastery >= 4 THEN 1 END)::int as mastered,
              COUNT(CASE WHEN next_review_at <= NOW() AND mastery < 5 THEN 1 END)::int as to_review
       FROM user_vocabulary WHERE user_id = $1`,
            [userId]
        );
        return rows[0] || { total: 0, mastered: 0, to_review: 0 };
    },

    // ==================== STATS ====================

    /**
     * Thống kê tiến bộ của user
     */
    async getStats(userId) {
        const [rows] = await pool.execute(
            `SELECT 
        COUNT(*)::int as total_submissions,
        COALESCE(AVG(score_total), 0)::decimal(5,2) as avg_score,
        COALESCE(AVG(score_grammar), 0)::decimal(5,2) as avg_grammar,
        COALESCE(AVG(score_vocabulary), 0)::decimal(5,2) as avg_vocabulary,
        COALESCE(AVG(score_coherence), 0)::decimal(5,2) as avg_coherence,
        COALESCE(AVG(score_task), 0)::decimal(5,2) as avg_task,
        COALESCE(SUM(word_count), 0)::int as total_words,
        COALESCE(MAX(score_total), 0)::decimal(5,2) as best_score
       FROM writing_submissions
       WHERE user_id = $1 AND status = 'graded'`,
            [userId]
        );
        return rows[0];
    },

    /**
     * Thống kê theo level
     */
    async getStatsByLevel(userId) {
        const [rows] = await pool.execute(
            `SELECT we.level,
              COUNT(*)::int as submissions,
              COALESCE(AVG(ws.score_total), 0)::decimal(5,2) as avg_score
       FROM writing_submissions ws
       JOIN writing_exercises we ON ws.exercise_id = we.id
       WHERE ws.user_id = $1 AND ws.status = 'graded'
       GROUP BY we.level
       ORDER BY we.level`,
            [userId]
        );
        return rows;
    }
};

export default writingRepository;
