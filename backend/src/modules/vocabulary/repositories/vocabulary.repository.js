import pool from '#db';

class VocabularyRepository {
    async getSystemVocabulary(userId, level = null, limit = 50, offset = 0) {
        let query = `
            SELECT sv.*, 
                   CASE WHEN uv.id IS NOT NULL THEN true ELSE false END as is_added
            FROM system_vocabulary sv
            LEFT JOIN user_vocabulary uv ON sv.word = uv.word AND uv.user_id = $1 AND uv.item_type = 'vocabulary'
            WHERE sv.is_active = true
        `;
        const params = [userId];

        if (level) {
            params.push(level);
            query += ` AND sv.level = $${params.length}`;
        }

        query += ` ORDER BY sv.level, sv.id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const [rows] = await pool.query(query, params);
        return rows;
    }

    async getRecommendWords(userId, count = 5) {
        // Find words in system_vocabulary that the user hasn't added yet
        const query = `
            SELECT sv.*
            FROM system_vocabulary sv
            LEFT JOIN user_vocabulary uv ON sv.word = uv.word AND uv.user_id = $1 AND uv.item_type = 'vocabulary'
            WHERE sv.is_active = true AND uv.id IS NULL
            ORDER BY RANDOM()
            LIMIT $2
        `;
        const [rows] = await pool.query(query, [userId, count]);
        return rows;
    }

    async addSystemWordToUser(userId, wordId) {
        // Fetch the system word
        const [systemWords] = await pool.query(`SELECT * FROM system_vocabulary WHERE id = $1`, [wordId]);
        if (systemWords.length === 0) throw new Error('System word not found');
        const sw = systemWords[0];

        // Insert to user_vocabulary
        const query = `
            INSERT INTO user_vocabulary (user_id, word, pos, phonetic, definition, translation, example_sentence, level, source, source_id, item_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'system', $9, 'vocabulary')
            ON CONFLICT (user_id, word, item_type) DO UPDATE SET
                mastery = 0,
                next_review_at = NOW(),
                updated_at = NOW()
            RETURNING *;
        `;
        const params = [
            userId, sw.word, sw.pos, sw.phonetic, sw.definition, sw.translation, sw.example_sentence, sw.level, sw.id
        ];
        const [rows] = await pool.query(query, params);
        return rows[0];
    }

    async getUserVocabulary(userId, itemType = null, masteryLevel = null) {
        let query = `SELECT * FROM user_vocabulary WHERE user_id = $1`;
        const params = [userId];

        if (itemType) {
            params.push(itemType);
            query += ` AND item_type = $${params.length}`;
        }
        if (masteryLevel !== null) {
            params.push(masteryLevel);
            // mastery = 5 means fully memorized
            if (masteryLevel === 'memorized') {
                query += ` AND mastery >= 5`;
            } else if (masteryLevel === 'learning') {
                query += ` AND mastery < 5`;
            }
        }

        query += ` ORDER BY created_at DESC`;

        const [rows] = await pool.query(query, params);
        return rows;
    }

    async getWordsDueForReview(userId) {
        const query = `
            SELECT * FROM user_vocabulary 
            WHERE user_id = $1 
            AND item_type = 'vocabulary' 
            AND mastery < 5
            AND next_review_at <= NOW()
            ORDER BY next_review_at ASC
            LIMIT 20
        `;
        const [rows] = await pool.query(query, [userId]);
        return rows;
    }

    async updateMastery(userId, wordId, isCorrect) {
        // Implement simple SRS
        // If correct, mastery + 1, next review is extended (e.g. mastery days)
        // If wrong, mastery goes to 0 or decreases, review immediately
        const [words] = await pool.query(`SELECT * FROM user_vocabulary WHERE id = $1 AND user_id = $2`, [wordId, userId]);
        if (words.length === 0) throw new Error('Word not found');

        let word = words[0];
        let newMastery = word.mastery;
        let daysToNext = 0;

        if (isCorrect) {
            newMastery = Math.min(5, newMastery + 1);
            daysToNext = Math.pow(2, newMastery) - 1; // 1, 3, 7, 15, 31 days
        } else {
            newMastery = Math.max(0, newMastery - 1);
            daysToNext = 0; // immediate
        }

        const query = `
            UPDATE user_vocabulary
            SET mastery = $1,
                review_count = review_count + 1,
                next_review_at = NOW() + INTERVAL '${daysToNext} days',
                updated_at = NOW()
            WHERE id = $2 AND user_id = $3
            RETURNING *;
        `;
        const [rows] = await pool.query(query, [newMastery, wordId, userId]);
        return rows[0];
    }

    async getVocabularyStats(userId) {
        const query = `
            SELECT 
                COUNT(*) as total_words,
                SUM(CASE WHEN mastery >= 5 THEN 1 ELSE 0 END) as memorized_words,
                SUM(CASE WHEN mastery < 5 THEN 1 ELSE 0 END) as learning_words,
                SUM(CASE WHEN item_type = 'pronunciation' THEN 1 ELSE 0 END) as pronunciation_errors,
                SUM(CASE WHEN item_type = 'grammar' THEN 1 ELSE 0 END) as grammar_errors
            FROM user_vocabulary
            WHERE user_id = $1
        `;
        const [rows] = await pool.query(query, [userId]);
        return rows[0];
    }
}

export default new VocabularyRepository();
