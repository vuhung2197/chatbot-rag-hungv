import axios from 'axios';
import suggestionRepository from '../repositories/suggestion.repository.js';

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
        return suggestionRepository.findDictionaryWords(trimmedQuery);
    }
}

export default new SuggestionService();
