import pool from '../../../db.js';
import '../../../bootstrap/env.js';
import axios from 'axios';

/**
 * Gợi ý từ tiếp theo cho người dùng dựa trên prompt đã nhập (AI).
 * Nhận prompt (câu hỏi hoặc đoạn văn bản) từ request body,
 * trả về từ/cụm từ tiếp theo mà AI dự đoán phù hợp.
 */
export async function suggestNextWord(req, res) {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') return res.json({ suggest: '' });

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

        const text = openaiRes.data.choices[0].text.trim();
        res.json({ suggest: text });
    } catch (err) {
        console.error(err.response?.data || err);
        res.json({ suggest: '' });
    }
}

/**
 * API gợi ý từ tiếng Anh cho autocomplete (Dictionary).
 * Trả về tối đa 10 từ bắt đầu bằng query từ bảng dictionary.
 * (Moved from chatController.js)
 */
export async function suggest(req, res) {
    const query = req.query.query?.trim().toLowerCase();
    if (!query) return res.json([]);
    const [rows] = await pool.execute(
        'SELECT DISTINCT word_en FROM dictionary WHERE word_en LIKE ? ORDER BY word_en LIMIT 10',
        [`${query}%`]
    );
    res.json(rows.map((row) => row.word_en));
}
