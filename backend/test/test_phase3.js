import pool from '#db';
import writingService from '../src/modules/writing/services/writing.service.js';

async function testPhase3() {
    console.log('Testing Phase 3 - Streak & Vocabulary...\n');

    // Mượn user có sẵn hoặc dùng temp userId
    const [users] = await pool.execute('SELECT id FROM users LIMIT 1');
    const userId = users && users.length > 0 ? users[0].id : 1;

    // Đảm bảo không lỗi FK constraint nếu DB base trống không (tạo fake user nếu cần)
    if (!users || users.length === 0) {
        await pool.execute('INSERT INTO users (id, name, email, password_hash) VALUES (1, \'Test User\', \'test@example.com\', \'dummy\') ON CONFLICT DO NOTHING');
    }

    try {
        console.log(`[1] Lấy Streak hiện tại cho User ID: ${userId}...`);
        let streak = await writingService.getStreak(userId);
        console.log(' - Streak Info:', streak);

        console.log('\n[2] Viết bài mới (cần tăng lượt viết & lưu bài vào DB)...');
        await writingService.submitWriting(userId, {
            exerciseId: null, // Test dạng free-writing
            content: 'This is a test writing submission to test the streak counting logic. I hope it counts more than 5 words so that it doesn\'t fail.',
            userPlan: 'pro' // Bypass giới hạn 3 bài test
        });

        console.log('\n[3] Lấy lại Streak sau khi nộp (Expected totalWritings tăng 1)...');
        streak = await writingService.getStreak(userId);
        console.log(' - Cập nhật Streak Info:', streak);

        console.log('\n[4] Thử tính năng Vocabulary SRS Review...');
        // Insert thủ công 1 từ để test
        const vocabRow = await writingService.addVocabulary(userId, {
            word: 'persistence',
            definition: 'Firm or obstinate continuance in a course of action',
            exampleSentence: 'His persistence paid off.',
            level: 'B2'
        });

        console.log(' - Đã thêm từ vựng:', vocabRow.word);

        // Giả lập SRS feedback = đánh giá 4 (Rất nhớ)
        const reviewedVocab = await writingService.reviewVocabulary(userId, vocabRow.id, 4);
        console.log(' - Review Vocab (Quality = 4). Level Mastery giờ là:', reviewedVocab.mastery);
        console.log(' - Lịch học ôn tiếp theo:', reviewedVocab.next_review_at);

        console.log('\n[5] Lấy Writing Stats Tổng Hợp...');
        const stats = await writingService.getStats(userId);
        console.log(JSON.stringify(stats, null, 2));

        console.log('\n✅ Phase 3 Logic Works!');

    } catch (err) {
        console.error('❌ Test failed:', err);
    }

    await pool.end();
}

testPhase3().then(() => process.exit(0));
