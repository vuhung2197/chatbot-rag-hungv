import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const getConfig = () => ({
    headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
    }
});

export const readingService = {
    getPassages: async (level, topic, page = 1) => {
        let url = `${API_URL}/reading/passages?page=${page}`;
        if (level) url += `&level=${level}`;
        if (topic) url += `&topic=${topic}`;
        const response = await axios.get(url, getConfig());
        return response.data;
    },

    getPassageById: async (id) => {
        const response = await axios.get(`${API_URL}/reading/passages/${id}`, getConfig());
        return response.data.passage;
    },

    generatePassage: async (level, topic) => {
        const response = await axios.post(`${API_URL}/reading/generate`, { level, topic }, getConfig());
        return response.data.passage;
    },

    lookupWord: async (word, sentence, level) => {
        const response = await axios.post(`${API_URL}/reading/lookup`, { word, sentence, level }, getConfig());
        return response.data.result;
    },

    submitQuiz: async (passageId, answers, wordsLookedUp, readingTimeSeconds) => {
        const response = await axios.post(`${API_URL}/reading/submit-quiz`, {
            passageId, answers, wordsLookedUp, readingTimeSeconds
        }, getConfig());
        return response.data.submission;
    }
};
