import fs from 'fs';
import speakingRepository from '../repositories/speaking.repository.js';
import speakingAiService from './speakingAI.service.js';
import azureSpeechService from './azureSpeech.service.js';
import analyticsService from '../../analytics/services/analytics.service.js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    // ==================== SUBMISSIONS & GRADING ==================== //

    async submitAudio(userId, { topicId, audioFilePath }) {
        let submissionId;
        try {
            const topic = await this.getTopicById(topicId);
            if (!topic) throw new Error('Topic không tồn tại');

            // 1. Lưu Record khởi đầu (để user có thể xem lại lịch sử sau này nếu MVP nâng cấp lưu db audio)
            const submission = await speakingRepository.createSubmission({ userId, topicId, audioUrl: null });
            submissionId = submission.id;

            // 2. Transcribe Audio (Whisper) - Always done to ensure we have a transcript
            let transcript = '';
            try {
                transcript = await speakingAiService.transcribeAudio(audioFilePath);
            } catch (e) {
                console.warn('Whisper transcription failed (will be ignored if Azure works):', e);
            }

            // 3. Grade the transcript based on Topic type
            let evaluation;
            if (topic.type === 'shadowing' || topic.type === 'pronunciation') {
                // Sử dụng Azure Cognitive Services cho phần đánh giá âm vị cực chuẩn
                try {
                    console.log(`🎙️ Chấm điểm bằng Azure cho topic: ${topic.type}`);
                    evaluation = await azureSpeechService.evaluatePronunciation(audioFilePath, topic.prompt_text);
                } catch (e) {
                    console.warn(`Azure failed, fallback to Whisper AI: ${e.message}`);
                    evaluation = topic.type === 'shadowing' ?
                        await speakingAiService.gradeShadowing(topic.level, topic.prompt_text, transcript) :
                        await speakingAiService.gradePronunciation(topic.level, topic.prompt_text, transcript);

                    if (!transcript) transcript = evaluation.transcript || '';
                }
                if (!transcript && evaluation.transcript) {
                    transcript = evaluation.transcript;
                }
            } else if (topic.type === 'reflex') {
                evaluation = await speakingAiService.gradeReflex(topic.level, topic.prompt_text, transcript);
            } else { // 'topic'
                evaluation = await speakingAiService.gradeTopic(topic.level, topic.prompt_text, transcript);
            }

            // 4. Update Submission result
            const newWords = evaluation.advanced_vocabulary || []; // Topic
            const scoreTotal = evaluation.score || 0;
            const updated = await speakingRepository.updateSubmissionAfterAI(submissionId, {
                transcript, scoreTotal, feedback: evaluation, newWords, status: 'completed'
            });

            // Xóa file âm thanh tạm ngay lập tức
            if (fs.existsSync(audioFilePath)) fs.unlinkSync(audioFilePath);

            // 5. Thêm từ mới / lỗi phát âm vào Sổ tay Knowledge Hub
            const pronunciationItems = topic.type === 'shadowing' && evaluation.mistakes ? evaluation.mistakes : [];
            const grammarItems = (topic.type === 'topic' || topic.type === 'reflex') && evaluation.errors ? evaluation.errors.map(e => ({
                word: e.correction,
                definition: e.explanation,
                grammar_error: e.mistake,
                grammar_correction: e.correction,
                level: topic.level
            })) : [];

            // Auto-log mistakes to analytics
            pronunciationItems.forEach(item => {
                analyticsService.logMistake({
                    userId,
                    sourceModule: 'speaking',
                    errorCategory: 'pronunciation',
                    errorDetail: item.expected || 'phoneme_error',
                    contextText: item.heard || '',
                    sessionId: submissionId
                }).catch(e => console.error('Silent fail on log mistake:', e));
            });

            grammarItems.forEach(item => {
                analyticsService.logMistake({
                    userId,
                    sourceModule: 'speaking',
                    errorCategory: 'grammar',
                    errorDetail: 'grammar_error',
                    contextText: item.grammar_error || '',
                    sessionId: submissionId
                }).catch(e => console.error('Silent fail on log mistake:', e));
            });


            if (newWords.length > 0 || pronunciationItems.length > 0 || grammarItems.length > 0) {
                // Grammar items trong Speaking được append vào pronunciationItems param để process chung ở hàm tiếp theo 
                // (hoặc nếu repository update lại addKnowledgeBatch hỗ trợ grammar)

                // Note: Ta gộp pronunciationItems và grammarItems vào mảng chung để hàm addKnowledgeBatch ởspeaking repository xử lý
                // Để đơn giản MVP, speakingRepository.addKnowledgeBatch nhận tham số (userId, words, pronunciationItems, submissionId)
                // Ta map grammarItems thành định dạng pronunciation để vào chung 1 bảng tạm. Hoặc update luôn speakingRepository hỗ trợ mảng thứ 3 cho Grammar.
                // Cho gọn thì ta sửa hàm gọi:
                await speakingRepository.addKnowledgeBatch(userId, newWords, [...pronunciationItems, ...grammarItems.map(g => ({
                    expected: g.grammar_correction,
                    tip: g.definition,
                    heard: g.grammar_error
                }))], submissionId)
                    .catch(e => console.error('Knowledge batch error (speaking):', e));
            }

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
