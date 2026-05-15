import pool from '#db';
import { callLLM } from '#services/llmService.js';

/**
 * Fetch all learning progress data for a user from DB.
 * Shared between non-streaming and streaming paths.
 */
async function buildProgressContext(userId) {
    const [[progressRows], [vocabByLevel], [vocabByTopic], [recentVocab],
        [listeningStats], [readingStats], [speakingStats], [writingStats],
        [learningHistory], [learningStreaks]
    ] = await Promise.all([
        pool.execute(
            `SELECT COUNT(DISTINCT uv.id) as vocabulary_count,
                    COUNT(DISTINCT CASE WHEN uv.mastery >= 3 THEN uv.id END) as mastered_words,
                    COUNT(DISTINCT ls.id) as listening_completed,
                    COUNT(DISTINCT rs.id) as reading_completed,
                    COUNT(DISTINCT ss.id) as speaking_completed,
                    COUNT(DISTINCT ws.id) as writing_completed
             FROM users u
             LEFT JOIN user_vocabulary uv ON u.id = uv.user_id
             LEFT JOIN listening_submissions ls ON u.id = ls.user_id
             LEFT JOIN reading_submissions rs ON u.id = rs.user_id
             LEFT JOIN speaking_submissions ss ON u.id = ss.user_id
             LEFT JOIN writing_submissions ws ON u.id = ws.user_id
             WHERE u.id = ?`, [userId]
        ),
        pool.execute(`SELECT level, COUNT(*) as count FROM user_vocabulary WHERE user_id = ? GROUP BY level ORDER BY level`, [userId]),
        pool.execute(`SELECT topic, COUNT(*) as count FROM user_vocabulary WHERE user_id = ? AND topic IS NOT NULL GROUP BY topic ORDER BY count DESC LIMIT 5`, [userId]),
        pool.execute(`SELECT word, level, mastery FROM user_vocabulary WHERE user_id = ? ORDER BY updated_at DESC LIMIT 5`, [userId]),
        pool.execute(`SELECT AVG(score_total) as avg_score, COUNT(*) as total FROM listening_submissions WHERE user_id = ?`, [userId]),
        pool.execute(`SELECT AVG(score_total) as avg_score, COUNT(*) as total FROM reading_submissions WHERE user_id = ?`, [userId]),
        pool.execute(`SELECT AVG(score_total) as avg_score, COUNT(*) as total FROM speaking_submissions WHERE user_id = ?`, [userId]),
        pool.execute(`SELECT AVG(score_total) as avg_score, COUNT(*) as total FROM writing_submissions WHERE user_id = ?`, [userId]),
        pool.execute(`SELECT category, level, title, score, created_at FROM learning_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`, [userId]),
        pool.execute(`SELECT current_streak, longest_streak, last_activity_date, total_exercises, total_words_learned, avg_score, badges FROM learning_streaks WHERE user_id = ?`, [userId]),
    ]);

    const progress = progressRows[0];
    const streak = learningStreaks[0];
    const badgeList = streak?.badges
        ? (Array.isArray(streak.badges) ? streak.badges : JSON.parse(streak.badges)).join(', ')
        : 'Chưa có';

    return `Thông tin tiến độ học tập:

TỪ VỰNG:
- Tổng số: ${progress.vocabulary_count || 0} từ
- Đã thành thạo: ${progress.mastered_words || 0} từ
- Theo level: ${vocabByLevel.map(v => `${v.level}: ${v.count}`).join(', ') || 'Chưa có'}
- Theo chủ đề: ${vocabByTopic.map(v => `${v.topic}: ${v.count}`).join(', ') || 'Chưa có'}
- Từ gần đây: ${recentVocab.map(v => `${v.word} (${v.level}, mastery: ${v.mastery})`).join(', ') || 'Chưa có'}

LISTENING:
- Bài hoàn thành: ${listeningStats[0].total || 0}
- Điểm trung bình: ${listeningStats[0].avg_score ? Math.round(listeningStats[0].avg_score) : 'N/A'}

READING:
- Bài hoàn thành: ${readingStats[0].total || 0}
- Điểm trung bình: ${readingStats[0].avg_score ? Math.round(readingStats[0].avg_score) : 'N/A'}

SPEAKING:
- Bài hoàn thành: ${speakingStats[0].total || 0}
- Điểm trung bình: ${speakingStats[0].avg_score ? Math.round(speakingStats[0].avg_score) : 'N/A'}

WRITING:
- Bài hoàn thành: ${writingStats[0].total || 0}
- Điểm trung bình: ${writingStats[0].avg_score ? Math.round(writingStats[0].avg_score) : 'N/A'}

LEARNING HUB:
- Lịch sử học tập: ${learningHistory.map(h => `${h.category}/${h.level}/${h.title} (${h.score} điểm)`).join(', ') || 'Chưa có'}

LEARNING STREAKS:
${streak ? `- Chuỗi ngày học hiện tại: ${streak.current_streak} ngày
- Chuỗi ngày học dài nhất: ${streak.longest_streak} ngày
- Tổng bài tập: ${streak.total_exercises}
- Tổng từ đã học: ${streak.total_words_learned}
- Điểm trung bình: ${streak.avg_score}
- Huy hiệu: ${badgeList}` : '- Chưa có dữ liệu'}`;
}

/**
 * Handles USER_PROGRESS intent — queries DB, synthesizes with LLM.
 * @param {{ userId, message, history, modelConfig, onStatus? }} opts
 * @returns {{ reply, chunks_used, source_type, reasoning_steps, _meta }}
 */
export async function handleProgress({ userId, message, history, modelConfig, onStatus }) {
    onStatus?.('📊 Đang lấy thông tin tiến độ học tập...');
    const t0 = Date.now();

    try {
        console.log('📊 Fetching user progress for userId:', userId);
        const context = await buildProgressContext(userId);

        onStatus?.('💡 Đang tổng hợp thông tin...');
        const systemPrompt = `Bạn là trợ lý học tiếng Anh. Hãy trả lời câu hỏi về tiến độ học tập dựa trên dữ liệu sau:\n\n${context}`;
        const reply = await callLLM(modelConfig, [
            { role: 'system', content: systemPrompt },
            ...history.slice(-4),
            { role: 'user', content: message }
        ], 0.3, 500);

        const processTime = Date.now() - t0;
        return {
            reply,
            chunks_used: [],
            source_type: 'db_direct',
            web_sources: [],
            reasoning_steps: [
                'Intent: USER_PROGRESS',
                'Data source: Direct Database Query',
                `Processing time: ${processTime}ms`
            ],
            _meta: { processing_time: processTime, source: 'db_direct', tokens: context.length }
        };
    } catch (error) {
        console.error('❌ Progress Query Error:', error);
        return {
            reply: `Xin lỗi, không thể lấy thông tin tiến độ học tập. Lỗi: ${error.message}`,
            chunks_used: [],
            source_type: 'db_direct',
            web_sources: [],
            reasoning_steps: [`DB Error: ${error.message}`],
            _meta: {}
        };
    }
}
