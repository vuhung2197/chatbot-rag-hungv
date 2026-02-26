import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const getConfig = () => ({
    headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
    }
});

export const listeningService = {
    getExercises: async (level, type, page = 1) => {
        let url = `${API_URL}/listening/exercises?page=${page}`;
        if (level) url += `&level=${level}`;
        if (type) url += `&type=${type}`;
        const response = await axios.get(url, getConfig());
        return response.data;
    },

    getExerciseById: async (id) => {
        const response = await axios.get(`${API_URL}/listening/exercises/${id}`, getConfig());
        return response.data.exercise;
    },

    submitDictation: async (exerciseId, content) => {
        const response = await axios.post(`${API_URL}/listening/submit-dictation`, {
            exerciseId, content
        }, getConfig());
        return response.data.submission;
    },

    getAudioUrl: (id) => {
        return `${API_URL}/listening/audio/${id}`;
    }
};
