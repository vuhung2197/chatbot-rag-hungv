import pool from '#db';

export const learningRepository = {
    // 1. Lưu lại lịch sử làm quiz của User
    async saveHistory(userId, category, level, title, score) {
        const result = await pool.query(
            `INSERT INTO learning_history (user_id, category, level, title, score)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, created_at`,
            [userId, category, level, title, score]
        );
        return result.rows[0];
    },

    // 2. Thêm vào thẻ Flashcard Ngữ Pháp / Phát Âm / Mẫu câu cho User
    async saveToKnowledgeHub(userId, flashcardItem, category, level) {
        let itemType = 'grammar';
        if (category === 'pronunciation') itemType = 'pronunciation';
        else if (category === 'pattern') itemType = 'vocabulary';

        const result = await pool.query(
            `INSERT INTO user_vocabulary 
                (user_id, word, definition, level, source, item_type, grammar_error, grammar_correction)
             VALUES ($1, $2, $3, $4, 'learning_hub', $5, $6, $7)
             ON CONFLICT (user_id, word, item_type) DO UPDATE SET 
                definition = COALESCE(EXCLUDED.definition, user_vocabulary.definition),
                grammar_error = COALESCE(EXCLUDED.grammar_error, user_vocabulary.grammar_error),
                grammar_correction = COALESCE(EXCLUDED.grammar_correction, user_vocabulary.grammar_correction),
                updated_at = NOW()
             RETURNING *`,
            [
                userId,
                flashcardItem.word || flashcardItem.grammar_correction || 'Unknown',
                flashcardItem.definition || 'Lý thuyết',
                level,
                itemType,
                flashcardItem.grammar_error || null,
                flashcardItem.grammar_correction || null
            ]
        );
        return result.rows[0];
    },

    // 3. Đếm số lượng bài user đã học
    async getUserStats(userId) {
        const result = await pool.query(
            `SELECT category, COUNT(*) as count, AVG(score) as avg_score
             FROM learning_history
             WHERE user_id = $1
             GROUP BY category`,
            [userId]
        );
        return result.rows;
    }
};

export default learningRepository;
