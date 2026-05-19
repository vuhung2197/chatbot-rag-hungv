import pool from '#db';

const exportImportRepository = {
    async getUserExportData(userId) {
        const [[userRows], [vocabRows], [listeningRows], [readingRows], [speakingRows], [writingRows], [learningHistoryRows], [learningStreaksRows]] =
            await Promise.all([
                pool.query('SELECT name, email, timezone, language FROM users WHERE id = $1', [userId]),
                pool.query(
                    `SELECT word, definition, translation, level, topic, mastery, review_count,
                     next_review_at, created_at FROM user_vocabulary WHERE user_id = $1`,
                    [userId]
                ),
                pool.query(
                    `SELECT ls.exercise_id, le.title as exercise_title, le.level, ls.score_total, ls.created_at as completed_at
                     FROM listening_submissions ls
                     LEFT JOIN listening_exercises le ON ls.exercise_id = le.id
                     WHERE ls.user_id = $1`,
                    [userId]
                ),
                pool.query(
                    'SELECT passage_id, score_total, created_at as completed_at FROM reading_submissions WHERE user_id = $1',
                    [userId]
                ),
                pool.query(
                    'SELECT topic_id, score_total, created_at as completed_at FROM speaking_submissions WHERE user_id = $1',
                    [userId]
                ),
                pool.query(
                    `SELECT ws.exercise_id, we.title as exercise_title, we.level, ws.score_total, ws.created_at as completed_at
                     FROM writing_submissions ws
                     LEFT JOIN writing_exercises we ON ws.exercise_id = we.id
                     WHERE ws.user_id = $1`,
                    [userId]
                ),
                pool.query(
                    'SELECT category, level, title, score, created_at FROM learning_history WHERE user_id = $1',
                    [userId]
                ),
                pool.query(
                    `SELECT current_streak, longest_streak, last_activity_date, total_exercises,
                     total_words_learned, avg_score, badges FROM learning_streaks WHERE user_id = $1`,
                    [userId]
                ),
            ]);

        return {
            user: userRows[0],
            vocabulary: vocabRows,
            listening: listeningRows,
            reading: readingRows,
            speaking: speakingRows,
            writing: writingRows,
            learningHistory: learningHistoryRows,
            learningStreaks: learningStreaksRows[0] || null,
        };
    },

    async importUserData(userId, data) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            await connection.query(`DELETE FROM user_vocabulary WHERE user_id = $1`, [userId]);
            await connection.query(`DELETE FROM learning_history WHERE user_id = $1`, [userId]);
            await connection.query(`DELETE FROM learning_streaks WHERE user_id = $1`, [userId]);
            await connection.query(`DELETE FROM listening_submissions WHERE user_id = $1`, [userId]);
            await connection.query(`DELETE FROM reading_submissions WHERE user_id = $1`, [userId]);
            await connection.query(`DELETE FROM speaking_submissions WHERE user_id = $1`, [userId]);
            await connection.query(`DELETE FROM writing_submissions WHERE user_id = $1`, [userId]);

            if (data.vocabulary?.length > 0) {
                for (const vocab of data.vocabulary) {
                    await connection.query(
                        `INSERT INTO user_vocabulary (user_id, word, definition, translation, level, topic, mastery, review_count, next_review_at, created_at, item_type)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'vocabulary')
                         ON CONFLICT (user_id, word, item_type) DO UPDATE SET
                         mastery = EXCLUDED.mastery, review_count = EXCLUDED.review_count, next_review_at = EXCLUDED.next_review_at`,
                        [userId, vocab.word, vocab.definition, vocab.translation, vocab.level, vocab.topic, vocab.mastery, vocab.review_count, vocab.next_review_at, vocab.created_at]
                    );
                }
            }

            if (data.learning_history?.length > 0) {
                for (const history of data.learning_history) {
                    await connection.query(
                        `INSERT INTO learning_history (user_id, category, level, title, score, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
                        [userId, history.category, history.level, history.title, history.score, history.created_at]
                    );
                }
            }

            if (data.learning_streaks) {
                const s = data.learning_streaks;
                await connection.query(
                    `INSERT INTO learning_streaks (user_id, current_streak, longest_streak, last_activity_date, total_exercises, total_words_learned, avg_score, badges)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                     ON CONFLICT (user_id) DO UPDATE SET
                     current_streak = EXCLUDED.current_streak, longest_streak = EXCLUDED.longest_streak,
                     last_activity_date = EXCLUDED.last_activity_date, total_exercises = EXCLUDED.total_exercises,
                     total_words_learned = EXCLUDED.total_words_learned, avg_score = EXCLUDED.avg_score, badges = EXCLUDED.badges`,
                    [userId, s.current_streak, s.longest_streak, s.last_activity_date, s.total_exercises, s.total_words_learned, s.avg_score, JSON.stringify(s.badges)]
                );
            }

            for (const sub of data.listening?.submissions ?? []) {
                if (sub.exercise_id) {
                    await connection.query(
                        `INSERT INTO listening_submissions (user_id, exercise_id, score_total, user_answers, created_at) VALUES ($1, $2, $3, $4, $5)`,
                        [userId, sub.exercise_id, sub.score_total, JSON.stringify([]), sub.completed_at]
                    );
                }
            }

            for (const sub of data.reading?.submissions ?? []) {
                if (sub.passage_id) {
                    await connection.query(
                        `INSERT INTO reading_submissions (user_id, passage_id, score_total, created_at) VALUES ($1, $2, $3, $4)`,
                        [userId, sub.passage_id, sub.score_total, sub.completed_at]
                    );
                }
            }

            for (const sub of data.speaking?.submissions ?? []) {
                if (sub.topic_id) {
                    await connection.query(
                        `INSERT INTO speaking_submissions (user_id, topic_id, score_total, created_at) VALUES ($1, $2, $3, $4)`,
                        [userId, sub.topic_id, sub.score_total, sub.completed_at]
                    );
                }
            }

            for (const sub of data.writing?.submissions ?? []) {
                if (sub.exercise_id) {
                    await connection.query(
                        `INSERT INTO writing_submissions (user_id, exercise_id, score_total, content, word_count, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
                        [userId, sub.exercise_id, sub.score_total, '', 0, sub.completed_at]
                    );
                }
            }

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },
};

export default exportImportRepository;
