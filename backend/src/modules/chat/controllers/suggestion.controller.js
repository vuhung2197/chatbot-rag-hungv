import suggestionService from '../services/suggestion.service.js';

/**
 * Gợi ý từ tiếp theo cho người dùng dựa trên prompt đã nhập (AI).
 */
export async function suggestNextWord(req, res) {
    const { prompt } = req.body;
    const suggest = await suggestionService.suggestNextWord(prompt);
    res.json({ suggest });
}

/**
 * API gợi ý từ tiếng Anh cho autocomplete (Dictionary).
 */
export async function suggest(req, res) {
    const query = req.query.query;
    const rows = await suggestionService.suggestDictionary(query);
    res.json(rows);
}

