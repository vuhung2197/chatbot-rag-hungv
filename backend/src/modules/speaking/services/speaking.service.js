import fs from 'fs';
import speakingRepository from '../repositories/speaking.repository.js';
import speakingAiService from './speakingAI.service.js';
import azureSpeechService from './azureSpeech.service.js';
import analyticsService from '../../analytics/services/analytics.service.js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Helper: Grade pronunciation/shadowing with Azure fallback ───
async function gradePronunciationType(topic, audioFilePath, transcript) {
    try {
        console.log(`🎙️ Chấm điểm bằng Azure cho topic: ${topic.type}`);
        return await azureSpeechService.evaluatePronunciation(audioFilePath, topic.prompt_text);
    } catch (e) {
        console.warn(`Azure failed, fallback to Whisper AI: ${e.message}`);
        const evaluation = topic.type === 'shadowing'
            ? await speakingAiService.gradeShadowing(topic.level, topic.prompt_text, transcript)
            : await speakingAiService.gradePronunciation(topic.level, topic.prompt_text, transcript);
        if (!transcript && evaluation.transcript) evaluation._fallbackTranscript = evaluation.transcript;
        return evaluation;
    }
}

// ─── Helper: Grade by topic type ───
async function gradeByTopicType(topic, audioFilePath, transcript) {
    if (topic.type === 'shadowing' || topic.type === 'pronunciation') {
        return await gradePronunciationType(topic, audioFilePath, transcript);
    }
    if (topic.type === 'reflex') {
        return await speakingAiService.gradeReflex(topic.level, topic.prompt_text, transcript);
    }
    return await speakingAiService.gradeTopic(topic.level, topic.prompt_text, transcript);
}

// ─── Helper: Extract knowledge items from evaluation ───
function extractKnowledgeItems(topic, evaluation) {
    const pronunciationItems = (topic.type === 'shadowing' && evaluation.mistakes) ? evaluation.mistakes : [];
    const grammarItems = ((topic.type === 'topic' || topic.type === 'reflex') && evaluation.errors)
        ? evaluation.errors.map(e => ({
            word: e.correction, definition: e.explanation,
            grammar_error: e.mistake, grammar_correction: e.correction,
            level: topic.level
        }))
        : [];
    return { pronunciationItems, grammarItems };
}

// ─── Helper: Log mistakes to analytics (fire-and-forget) ───
function logMistakesToAnalytics(userId, submissionId, pronunciationItems, grammarItems) {
    const logSilent = (params) =>
        analyticsService.logMistake(params).catch(e => console.error('Silent fail on log mistake:', e));

    pronunciationItems.forEach(item => logSilent({
        userId, sourceModule: 'speaking', errorCategory: 'pronunciation',
        errorDetail: item.expected || 'phoneme_error', contextText: item.heard || '', sessionId: submissionId
    }));

    grammarItems.forEach(item => logSilent({
        userId, sourceModule: 'speaking', errorCategory: 'grammar',
        errorDetail: item.grammar_correction || item.grammar_error || 'unknown_grammar_error',
        contextText: item.grammar_error || '', sessionId: submissionId
    }));
}

// ─── Helper: Save knowledge batch ───
async function saveKnowledgeBatch(userId, submissionId, newWords, pronunciationItems, grammarItems) {
    if (newWords.length === 0 && pronunciationItems.length === 0 && grammarItems.length === 0) return;

    const combinedItems = [
        ...pronunciationItems,
        ...grammarItems.map(g => ({ expected: g.grammar_correction, tip: g.definition, heard: g.grammar_error }))
    ];
    await speakingRepository.addKnowledgeBatch(userId, newWords, combinedItems, submissionId)
        .catch(e => console.error('Knowledge batch error (speaking):', e));
}

export const speakingService = {

    // ==================== TOPICS ==================== //

    async getTopics({ type, level, page = 1, limit = 10 }) {
        const offset = (page - 1) * limit;
        const { topics, total } = await speakingRepository.getTopics({ type, level, limit, offset });
        return {
            topics,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        };
    },

    async getTopicById(id) {
        const topic = await speakingRepository.getTopicById(id);
        if (!topic) throw new Error('Topic not found');
        return topic;
    },

    // Quản lý việc tạo Audio TTS tự động cho Topic (Dùng cho mẫu đọc Shadowing và đọc câu hỏi)
    async ensureTopicAudio(id) {
        const topic = await this.getTopicById(id);
        if (topic.audio_url) return topic.audio_url; // Đã có

        // Chưa có -> Generate bằng AI TTS alloy
        console.log(`🎙️ Sinh TTS audio cho topic ID: ${id}`);
        const mp3 = await openai.audio.speech.create({
            model: 'tts-1', voice: 'alloy', input: topic.prompt_text
        });
        const buffer = Buffer.from(await mp3.arrayBuffer());

        // Thay vì lưu cloud, MVP này ta return stream buffer thẳng cho /audio/:id (giống Listening)
        // để tiết kiệm tiền/công setup S3, do đó audio_url chỉ là cờ đánh dấu nếu file tĩnh.
        // Tạm thời nếu audio_url == null -> frontend gọi API /api/speaking/topics/:id/audio
        return buffer;
    },

    // ==================== PRONUNCIATION (IPA) ==================== //

    async getIpaPhonemes() {
        return await speakingRepository.getIpaPhonemes();
    },

    // ==================== AI GENERATE ==================== //

    async generateTopic(type, level) {
        // 1. Lấy danh sách bài đã có cùng type/level để tránh trùng
        const { topics: existingTopics } = await speakingRepository.getTopics({ type, level, limit: 50, offset: 0 });
        const existingPrompts = existingTopics.map(t => t.prompt_text);

        const MAX_RETRIES = 3;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            const data = await speakingAiService.generateTopic(type, level, existingPrompts);

            // 2. Kiểm tra trùng lặp - so sánh nội dung
            const isDuplicate = existingPrompts.some(existing =>
                this._isSimilar(existing, data.prompt_text)
            );

            if (!isDuplicate) {
                const topic = await speakingRepository.createTopic(data);
                return topic;
            }

            console.warn(`⚠️ Speaking generate attempt ${attempt}/${MAX_RETRIES}: duplicate detected, retrying...`);
        }

        // Nếu retry hết vẫn trùng, vẫn lưu (tốt hơn là lỗi)
        console.warn('⚠️ Speaking: All retries exhausted, saving anyway');
        const data = await speakingAiService.generateTopic(type, level, existingPrompts);
        const topic = await speakingRepository.createTopic(data);
        return topic;
    },

    /**
     * So sánh tương đồng giữa 2 đoạn text (word-level overlap)
     * Trả về true nếu trùng >60% từ
     */
    _isSimilar(textA, textB) {
        const normalize = (t) => t.toLowerCase().replace(/[^a-zàáảãạăắằẳẵặâấầẩẫậđéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
        const wordsA = normalize(textA);
        const wordsB = normalize(textB);
        if (wordsA.length === 0 || wordsB.length === 0) return false;

        const setB = new Set(wordsB);
        const matchCount = wordsA.filter(w => setB.has(w)).length;
        const similarity = matchCount / Math.max(wordsA.length, wordsB.length);
        return similarity > 0.6;
    },

    // ==================== SUBMISSIONS & GRADING ==================== //

    async submitAudio(userId, { topicId, audioFilePath }) {
        let submissionId;
        try {
            const topic = await this.getTopicById(topicId);
            if (!topic) throw new Error('Topic không tồn tại');

            const submission = await speakingRepository.createSubmission({ userId, topicId, audioUrl: null });
            submissionId = submission.id;

            // Transcribe
            let transcript = '';
            try {
                transcript = await speakingAiService.transcribeAudio(audioFilePath);
            } catch (e) {
                console.warn('Whisper transcription failed:', e);
            }

            // Grade
            const evaluation = await gradeByTopicType(topic, audioFilePath, transcript);
            if (!transcript && evaluation.transcript) transcript = evaluation.transcript;
            if (evaluation._fallbackTranscript && !transcript) transcript = evaluation._fallbackTranscript;

            // Update submission
            const updated = await speakingRepository.updateSubmissionAfterAI(submissionId, {
                transcript, scoreTotal: evaluation.score || 0, feedback: evaluation,
                newWords: evaluation.advanced_vocabulary || [], status: 'completed'
            });

            if (fs.existsSync(audioFilePath)) fs.unlinkSync(audioFilePath);

            // Extract & log knowledge
            const newWords = evaluation.advanced_vocabulary || [];
            const { pronunciationItems, grammarItems } = extractKnowledgeItems(topic, evaluation);
            logMistakesToAnalytics(userId, submissionId, pronunciationItems, grammarItems);
            await saveKnowledgeBatch(userId, submissionId, newWords, pronunciationItems, grammarItems);

            return { ...updated, topic_type: topic.type };

        } catch (error) {
            console.error('Speaking submit failed:', error);
            if (submissionId) {
                await speakingRepository.updateSubmissionAfterAI(submissionId, {
                    transcript: '', scoreTotal: 0, feedback: { error: error.message }, newWords: [], status: 'error'
                }).catch(() => { });
            }
            if (fs.existsSync(audioFilePath)) fs.unlinkSync(audioFilePath);
            throw error;
        }
    }
};

export default speakingService;
