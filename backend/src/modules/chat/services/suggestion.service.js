import pool from '../../../../db.js';
import axios from 'axios';

class SuggestionService {
    async suggestNextWord(prompt) {
        if (!prompt || typeof prompt !== 'string') return '';

        try {
            const openaiRes = await axios.post(
                'https://api.openai.com/v1/completions',
                {
                    model: 'gpt-3.5-turbo-instruct',
                    prompt,
                    max_tokens: 3,
                    temperature: 0.7,
                    logprobs: 5,
                    stop: null,
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    },
                }
            );

            return openaiRes.data.choices[0].text.trim();
        } catch (err) {
            console.error('Error suggesting next word:', err.response?.data || err);
            return '';
        }
    }

    async suggestDictionary(query) {
        const trimmedQuery = query?.trim().toLowerCase();
        if (!trimmedQuery) return [];

        const [rows] = await pool.execute(
            'SELECT DISTINCT word_en FROM dictionary WHERE word_en LIKE ? ORDER BY word_en LIMIT 10',
            [`${trimmedQuery}%`]
        );

        return rows.map((row) => row.word_en);
    }
}

export default new SuggestionService();
