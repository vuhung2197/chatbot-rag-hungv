import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const getConfig = () => ({
    headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
    }
});

export const vocabularyService = {
    // Lấy từ vựng hệ thống
    getSystemVocabulary: async (level = null) => {
        const url = level ? `${API_URL}/vocabulary/system?level=${level}` : `${API_URL}/vocabulary/system`;
        const res = await axios.get(url, getConfig());
        return res.data;
    },

    // 5-10 từ mỗi ngày
    getRecommendWords: async (count = 10) => {
        const res = await axios.get(`${API_URL}/vocabulary/recommend?count=${count}`, getConfig());
        return res.data;
    },

    // Thêm từ
    addSystemWord: async (wordId) => {
        const res = await axios.post(`${API_URL}/vocabulary/add`, { wordId }, getConfig());
        return res.data;
    },

    addMultipleSystemWords: async (wordIds = []) => {
        const res = await axios.post(`${API_URL}/vocabulary/add-multiple`, { wordIds }, getConfig());
        return res.data;
    },

    // Từ đang học
    getUserVocabulary: async (type = '') => {
        const url = type ? `${API_URL}/vocabulary/user?type=${type}` : `${API_URL}/vocabulary/user`;
        const res = await axios.get(url, getConfig());
        return res.data;
    },

    // Ôn tập
    getReviewWords: async () => {
        const res = await axios.get(`${API_URL}/vocabulary/review`, getConfig());
        return res.data;
    },

    // Cập nhật SRS
    updateWordMastery: async (id, isCorrect) => {
        const res = await axios.put(`${API_URL}/vocabulary/user/${id}/mastery`, { isCorrect }, getConfig());
        return res.data;
    }
};
