import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const getConfig = () => ({
    headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
    }
});

export const speakingService = {
    getTopics: async (type, level, page = 1) => {
        let url = `${API_URL}/speaking/topics?page=${page}`;
        if (type) url += `&type=${type}`;
        if (level) url += `&level=${level}`;
        const response = await axios.get(url, getConfig());
        return response.data;
    },

    getTopicById: async (id) => {
        const response = await axios.get(`${API_URL}/speaking/topics/${id}`, getConfig());
        return response.data.topic;
    },

    getIpaPhonemes: async () => {
        const response = await axios.get(`${API_URL}/speaking/ipa`, getConfig());
        return response.data.phonemes;
    },

    getTopicAudioUrl: (id) => {
        return `${API_URL}/speaking/topics/${id}/audio`;
    },

    submitAudio: async (topicId, audioBlob) => {
        const formData = new FormData();
        formData.append('topicId', topicId);

        // Cần truyền đuôi file hợp lệ tuỳ theo blob mimeType
        let ext = '.webm';
        if (audioBlob.type.includes('mp4')) ext = '.mp4';
        else if (audioBlob.type.includes('ogg')) ext = '.ogg';
        else if (audioBlob.type.includes('wav')) ext = '.wav';

        formData.append('audio', audioBlob, `recording${ext}`);

        const response = await axios.post(`${API_URL}/speaking/submit`, formData, {
            headers: {
                ...getConfig().headers,
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data.submission;
    }
};
