import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const getConfig = () => ({
    headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
    }
});

export const learningService = {
    getLesson: async (category, level) => {
        const response = await axios.get(`${API_URL}/learning/lesson?category=${category}&level=${level}`, getConfig());
        return response.data;
    },

    submitLessonQuiz: async (payload) => {
        const response = await axios.post(`${API_URL}/learning/submit`, payload, getConfig());
        return response.data;
    },

    getStats: async () => {
        const response = await axios.get(`${API_URL}/learning/stats`, getConfig());
        return response.data;
    }
};
