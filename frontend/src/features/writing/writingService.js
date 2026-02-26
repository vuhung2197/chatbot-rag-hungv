import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Setup common config
const getConfig = () => ({
    headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
    }
});

export const writingService = {
    // ==================== EXERCISES ====================
    getExercises: async (level, type, page = 1) => {
        let url = `${API_URL}/writing/exercises?page=${page}`;
        if (level) url += `&level=${level}`;
        if (type) url += `&type=${type}`;
        const response = await axios.get(url, getConfig());
        return response.data;
    },

    getExerciseById: async (id) => {
        const response = await axios.get(`${API_URL}/writing/exercises/${id}`, getConfig());
        return response.data.exercise;
    },

    // ==================== SUBMISSIONS ====================
    submitWriting: async (exerciseId, content) => {
        const response = await axios.post(`${API_URL}/writing/submit`, {
            exerciseId, content
        }, getConfig());
        return response.data.submission;
    },

    getSubmissions: async (page = 1) => {
        const response = await axios.get(`${API_URL}/writing/submissions?page=${page}`, getConfig());
        return response.data.submissions;
    },

    getSubmissionDetail: async (id) => {
        const response = await axios.get(`${API_URL}/writing/submissions/${id}`, getConfig());
        return response.data.submission;
    },

    // ==================== STREAK ====================
    getStreak: async () => {
        const response = await axios.get(`${API_URL}/writing/streak`, getConfig());
        return response.data.streak;
    },

    useStreakFreeze: async () => {
        const response = await axios.post(`${API_URL}/writing/streak/freeze`, {}, getConfig());
        return response.data;
    },

    // ==================== VOCABULARY ====================
    getVocabulary: async (page = 1) => {
        const response = await axios.get(`${API_URL}/writing/vocabulary?page=${page}`, getConfig());
        return response.data;
    },

    addVocabulary: async (wordData) => {
        const response = await axios.post(`${API_URL}/writing/vocabulary`, wordData, getConfig());
        return response.data;
    },

    getReviewWords: async () => {
        const response = await axios.get(`${API_URL}/writing/vocabulary/review`, getConfig());
        return response.data.words;
    },

    submitReviewWord: async (id, quality) => {
        const response = await axios.put(`${API_URL}/writing/vocabulary/${id}/review`, { quality }, getConfig());
        return response.data;
    },

    deleteVocabulary: async (id) => {
        const response = await axios.delete(`${API_URL}/writing/vocabulary/${id}`, getConfig());
        return response.data;
    },

    // ==================== STATS ====================
    getStats: async () => {
        const response = await axios.get(`${API_URL}/writing/stats`, getConfig());
        return response.data.stats;
    }
};
