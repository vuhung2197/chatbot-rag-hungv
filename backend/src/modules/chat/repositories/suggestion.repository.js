import pool from '#db';

const suggestionRepository = {
    async findDictionaryWords(query) {
        const [rows] = await pool.execute(
            'SELECT DISTINCT word_en FROM dictionary WHERE word_en LIKE ? ORDER BY word_en LIMIT 10',
            [`${query}%`]
        );
        return rows.map(row => row.word_en);
    },
};

export default suggestionRepository;
