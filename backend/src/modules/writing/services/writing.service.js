import writingRepository from '../repositories/writing.repository.js';
import writingAiService from './writingAI.service.js';
import analyticsService from '../../analytics/services/analytics.service.js';

// =============================================================================
// Writing Service - Business Logic Layer
// =============================================================================

// Streak badge milestones
const STREAK_BADGES = [
    { days: 7, badge: 'week_warrior', label: '🥉 Week Warrior' },
    { days: 30, badge: 'monthly_master', label: '🥈 Monthly Master' },
    { days: 100, badge: 'century_writer', label: '🥇 Century Writer' },
    { days: 365, badge: 'writing_legend', label: '💎 Writing Legend' },
];

// Daily submission limits
const DAILY_LIMITS = { free: 3, pro: 999, team: 999 };

const writingService = {

    // ==================== EXERCISES ====================

    async getExercises({ level, type, page = 1, limit = 20 }) {
        const offset = (page - 1) * limit;
        const [exercises, total] = await Promise.all([
            writingRepository.getExercises({ level, type, limit, offset }),
            writingRepository.countExercises({ level, type })
        ]);

        return {
            exercises,
            pagination: {
                page, limit, total,
                totalPages: Math.ceil(total / limit)
            }
        };
    },

    async getExerciseById(id) {
        const exercise = await writingRepository.getExerciseById(id);
        if (!exercise) throw new Error('Exercise not found');
        return exercise;
    },

    // ==================== SUBMISSIONS ====================

    async submitWriting(userId, { exerciseId, content, userPlan = 'free' }) {
        // 1. Check daily limit (DISABLED FOR FULL ACCESS)
        // const todayCount = await writingRepository.countTodaySubmissions(userId);
        // const limit = DAILY_LIMITS[userPlan] || DAILY_LIMITS.free;
        // if (todayCount >= limit) {
        //     throw new Error(`Daily limit reached (${limit} submissions/day). Upgrade to Pro for unlimited.`);
        // }

        // 2. Validate exercise exists (if provided)
        let exercise = null;
        if (exerciseId) {
            exercise = await writingRepository.getExerciseById(exerciseId);
            if (!exercise) throw new Error('Exercise not found');
        }

        // 3. Count words
        const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;
        if (wordCount < 5) throw new Error('Please write at least 5 words');

        // 4. Create submission
        const submission = await writingRepository.createSubmission({
            userId, exerciseId: exerciseId || null, content, wordCount
        });

        // 5. Grade with AI (synchronous MVP flow)
        // If no exercise was given (free writing), create a mock exercise object for the AI
        const exerciseObj = exercise ? exercise : {
            level: 'B1', // Default 
            type: 'free_writing',
            prompt: 'Write about a topic of your choice.'
        };

        try {
            const feedbackData = await writingAiService.gradeSubmission(exerciseObj, content);

            // Save feedback + new words
            const updatedSubmission = await this.saveFeedback(submission.id, feedbackData);

            // Auto-collect new words locally to the user's vocab if needed (using batch)
            if ((feedbackData.newWords && feedbackData.newWords.length > 0) || (feedbackData.grammarItems && feedbackData.grammarItems.length > 0)) {
                await writingRepository.addKnowledgeBatch(userId, feedbackData.newWords, feedbackData.grammarItems, submission.id)
                    .catch(e => console.error('Silent fail on add vocab:', e)); // soft fail if it crashes
            }

            // Auto-log mistakes to analytics
            if (feedbackData.errors && feedbackData.errors.length > 0) {
                feedbackData.errors.forEach(err => {
                    analyticsService.logMistake({
                        userId,
                        sourceModule: 'writing',
                        errorCategory: 'grammar',
                        // We map mistake roughly. Depending on AI output it might be full sentences, so we slice it just in case.
                        errorDetail: err.type || 'grammar_error',
                        contextText: err.mistake || '',
                        sessionId: submission.id
                    }).catch(e => console.error('Silent fail on log mistake:', e));
                });
            }

            // 6. Update streak CHỈ KHI điểm tốt (>= 60)
            let streakInfo = { streakIncremented: false, newStreak: 0, milestoneReached: null };
            if (feedbackData.scores && feedbackData.scores.total >= 60) {
                streakInfo = await this.updateStreakAfterWriting(userId, wordCount);
            }

            return { ...updatedSubmission, level: exerciseObj.level, streakInfo };
        } catch (e) {
            console.error('Grading failed:', e);
            await writingRepository.markSubmissionError(submission.id, e.message);
            throw new Error(`AI system failed to process the text. Please try avoiding nonsensical inputs. Details: ${  e.message}`);
        }
    },

    /**
     * Lưu AI feedback vào submission (sẽ được gọi từ Phase 2)
     */
    async saveFeedback(submissionId, feedbackData) {
        const { scores, errors, suggestions, modelAnswer, newWords } = feedbackData;

        const updated = await writingRepository.updateSubmissionFeedback(submissionId, {
            scoreTotal: scores.total,
            scoreGrammar: scores.grammar,
            scoreVocabulary: scores.vocabulary,
            scoreCoherence: scores.coherence,
            scoreTask: scores.task,
            feedback: { errors, suggestions, model_answer: modelAnswer },
            newWords: newWords || []
        });

        return updated;
    },

    async getSubmissions(userId, { page = 1, limit = 20 }) {
        const offset = (page - 1) * limit;
        return writingRepository.getSubmissions(userId, { limit, offset });
    },

    async getSubmissionDetail(userId, submissionId) {
        const submission = await writingRepository.getSubmissionById(submissionId, userId);
        if (!submission) throw new Error('Submission not found');
        return submission;
    },

    // ==================== STREAK LOGIC ====================

    async getStreak(userId) {
        const streak = await writingRepository.getOrCreateStreak(userId);

        // Check if streak is broken (missed yesterday without freeze)
        if (streak.last_activity_date) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // last_activity_date is typically returned as Date object from PG or string YYYY-MM-DD
            const lastDate = new Date(streak.last_activity_date);
            lastDate.setHours(0, 0, 0, 0);

            const diffTime = today.getTime() - lastDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 1) {
                // Streak broken
                streak.current_streak = 0;
                await writingRepository.updateStreak(userId, {
                    currentStreak: 0,
                    longestStreak: streak.longest_streak,
                    lastWritingDate: streak.last_activity_date,
                    totalWritings: streak.total_exercises,
                    totalWordsWritten: streak.total_words_learned,
                    avgScore: streak.avg_score,
                    badges: streak.badges || []
                });
            }
        }

        return streak;
    },

    async updateStreakAfterWriting(userId, wordCount) {
        const streak = await writingRepository.getOrCreateStreak(userId);
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const oldStreak = streak.current_streak;

        // Kiểm tra ngày (so sánh string chính xác)
        const lastDateStr = streak.last_activity_date
            ? new Date(streak.last_activity_date).toISOString().split('T')[0]
            : null;

        // If already active today, just update totals (không tăng streak)
        if (lastDateStr === today) {
            await writingRepository.updateStreak(userId, {
                currentStreak: streak.current_streak,
                longestStreak: streak.longest_streak,
                lastWritingDate: today,
                totalWritings: streak.total_exercises + 1,
                totalWordsWritten: (streak.total_words_learned || 0) + wordCount,
                avgScore: streak.avg_score,
                badges: streak.badges || []
            });
            return { streakIncremented: false, newStreak: streak.current_streak, milestoneReached: null };
        }

        // Calculate new streak
        let newStreak = 1;
        if (lastDateStr) {
            const lastDate = new Date(lastDateStr);
            lastDate.setHours(0, 0, 0, 0);
            const todayDate = new Date(today);
            todayDate.setHours(0, 0, 0, 0);

            const diffTime = todayDate.getTime() - lastDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                newStreak = streak.current_streak + 1;
            } else if (diffDays === 0) {
                newStreak = streak.current_streak;
            }
            // diffDays > 1 means streak broken, newStreak stays 1
        }

        const newLongest = Math.max(newStreak, streak.longest_streak);

        // Check for new badges
        const currentBadges = streak.badges || [];
        const newBadges = [...currentBadges];
        for (const { days, badge } of STREAK_BADGES) {
            if (newStreak >= days && !newBadges.includes(badge)) {
                newBadges.push(badge);
            }
        }

        await writingRepository.updateStreak(userId, {
            currentStreak: newStreak,
            longestStreak: newLongest,
            lastWritingDate: today,
            totalWritings: streak.total_exercises + 1,
            totalWordsWritten: (streak.total_words_learned || 0) + wordCount,
            avgScore: streak.avg_score,
            badges: newBadges
        });

        // Xác định mốc (milestone) -- 7 ngày, 30 ngày
        const MILESTONES = [7, 30, 100, 365];
        let milestoneReached = null;
        for (const m of MILESTONES) {
            if (newStreak === m && oldStreak < m) {
                milestoneReached = m;
                break;
            }
        }

        return {
            streakIncremented: newStreak > oldStreak,
            newStreak,
            milestoneReached
        };
    },

    async useStreakFreeze(userId) {
        const result = await writingRepository.useStreakFreeze(userId);
        if (!result) throw new Error('No streak freezes remaining');
        return result;
    },

    // ==================== VOCABULARY ====================

    async addVocabulary(userId, { word, definition, exampleSentence, level }) {
        if (!word || word.trim().length === 0) throw new Error('Word is required');
        return writingRepository.addVocabulary({
            userId, word, definition, exampleSentence, source: 'manual', sourceId: null, level
        });
    },

    async getVocabulary(userId, { page = 1, limit = 50, sort, order }) {
        const offset = (page - 1) * limit;
        const [vocab, stats] = await Promise.all([
            writingRepository.getVocabulary(userId, { limit, offset, sort, order }),
            writingRepository.countVocabulary(userId)
        ]);
        return { vocabulary: vocab, stats };
    },

    async getVocabularyForReview(userId) {
        return writingRepository.getVocabularyForReview(userId);
    },

    /**
     * SRS Review - SM-2 Algorithm (simplified)
     * quality: 0-5 (0=forgot, 5=perfect)
     */
    async reviewVocabulary(userId, vocabId, quality) {
        if (quality < 0 || quality > 5) throw new Error('Quality must be 0-5');

        // SM-2 intervals (in days)
        const intervals = [0, 1, 3, 7, 14, 30]; // mastery 0-5
        let newMastery;

        if (quality >= 3) {
            // Correct - increase mastery (max 5)
            const [currentVocab] = await writingRepository.getVocabulary(userId, { limit: 1, offset: 0, sort: 'created_at', order: 'DESC' });

            // Default increment
            const currentMastery = currentVocab && typeof currentVocab.mastery !== 'undefined' ? currentVocab.mastery : 0;
            const increment = quality >= 4 ? 2 : 1;
            newMastery = Math.min(5, currentMastery + increment);
        } else {
            // Wrong - reset to 0
            newMastery = 0;
        }

        const intervalDays = intervals[newMastery] || 1;
        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + intervalDays);

        return writingRepository.updateVocabularyReview(vocabId, userId, {
            mastery: newMastery,
            nextReviewAt: nextReview.toISOString()
        });
    },

    async deleteVocabulary(userId, vocabId) {
        const deleted = await writingRepository.deleteVocabulary(vocabId, userId);
        if (!deleted) throw new Error('Vocabulary not found');
        return true;
    },

    // ==================== STATS ====================

    async getStats(userId) {
        const [stats, streak, vocabStats, byLevel] = await Promise.all([
            writingRepository.getStats(userId),
            this.getStreak(userId),
            writingRepository.countVocabulary(userId),
            writingRepository.getStatsByLevel(userId)
        ]);

        return {
            writing: stats,
            streak: {
                current: streak.current_streak,
                longest: streak.longest_streak,
                badges: streak.badges || [],
                totalExercises: streak.total_exercises,
                totalWords: streak.total_words_learned,
                lastActivityDate: streak.last_activity_date
            },
            vocabulary: vocabStats,
            byLevel
        };
    }
};

export default writingService;
