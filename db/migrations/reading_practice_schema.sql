-- =============================================
-- READING PRACTICE MODULE - DATABASE SCHEMA
-- =============================================

-- 1. Bảng kho bài đọc (AI sinh hoặc nhập tay)
CREATE TABLE IF NOT EXISTS reading_passages (
    id SERIAL PRIMARY KEY,
    level VARCHAR(2) NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
    topic VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    word_count INT DEFAULT 0,
    summary TEXT,
    questions JSONB DEFAULT '[]',
    difficulty_words JSONB DEFAULT '[]',
    is_generated BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reading_level ON reading_passages(level);
CREATE INDEX IF NOT EXISTS idx_reading_topic ON reading_passages(topic);
CREATE INDEX IF NOT EXISTS idx_reading_active ON reading_passages(is_active);

-- 2. Bảng lưu lịch sử đọc + quiz của user
CREATE TABLE IF NOT EXISTS reading_submissions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    passage_id INT REFERENCES reading_passages(id) ON DELETE SET NULL,
    quiz_answers JSONB DEFAULT '[]',
    score_total DECIMAL(5,2),
    feedback JSONB DEFAULT '{}',
    words_looked_up JSONB DEFAULT '[]',
    reading_time_seconds INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'reading' CHECK (status IN ('reading','quiz','completed','error')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rs_user ON reading_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_rs_passage ON reading_submissions(passage_id);

-- 3. Trigger cập nhật updated_at
CREATE OR REPLACE FUNCTION update_reading_passages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trigger_reading_passages_updated ON reading_passages;
CREATE TRIGGER trigger_reading_passages_updated
    BEFORE UPDATE ON reading_passages
    FOR EACH ROW EXECUTE FUNCTION update_reading_passages_updated_at();

-- =============================================
-- SEED: Bài đọc mẫu để test (2 bài mỗi level)
-- =============================================

INSERT INTO reading_passages (level, topic, title, content, word_count, summary, questions, difficulty_words) VALUES

-- A1
('A1', 'daily_life', 'My Morning Routine',
'Every morning, I wake up at 7 o''clock. I brush my teeth and wash my face. Then I eat breakfast. I usually have bread and milk. After breakfast, I put on my school uniform. I take my bag and walk to school. My school is near my house. It takes about 10 minutes. I like mornings because the air is fresh and cool.',
60, 'A simple description of a student''s morning routine.',
'[{"id":1,"type":"multiple_choice","question":"What time does the person wake up?","options":["A. 6 o''clock","B. 7 o''clock","C. 8 o''clock","D. 9 o''clock"],"correctAnswer":"B","explanation":"The text says: I wake up at 7 o''clock."},{"id":2,"type":"true_false_ng","statement":"The person goes to school by bus.","correctAnswer":"False","explanation":"The text says: I walk to school."},{"id":3,"type":"multiple_choice","question":"What does the person eat for breakfast?","options":["A. Rice and soup","B. Eggs and juice","C. Bread and milk","D. Cereal and fruit"],"correctAnswer":"C","explanation":"The text says: I usually have bread and milk."}]',
'[{"word":"routine","definition":"a regular way of doing things","translation":"thói quen hàng ngày"},{"word":"uniform","definition":"special clothes for school or work","translation":"đồng phục"},{"word":"fresh","definition":"clean and new","translation":"trong lành"}]'),

-- A2
('A2', 'travel', 'A Weekend Trip to the Beach',
'Last weekend, my family went to the beach. We left home early in the morning and drove for two hours. The weather was sunny and warm. When we arrived, my sister and I ran to the water. We swam and played in the waves for a long time. My father made a sandcastle with us. My mother sat under an umbrella and read a book. For lunch, we ate seafood at a small restaurant near the beach. The food was delicious and cheap. In the afternoon, we collected beautiful shells. We took many photos together. We went home tired but very happy. It was a wonderful day!',
110, 'A family''s fun day trip to the beach.',
'[{"id":1,"type":"multiple_choice","question":"How long was the drive to the beach?","options":["A. One hour","B. Two hours","C. Three hours","D. Thirty minutes"],"correctAnswer":"B","explanation":"The text says they drove for two hours."},{"id":2,"type":"true_false_ng","statement":"The mother swam in the sea.","correctAnswer":"False","explanation":"The text says the mother sat under an umbrella and read a book."},{"id":3,"type":"true_false_ng","statement":"They had dinner at a restaurant.","correctAnswer":"Not Given","explanation":"The text only mentions lunch, not dinner."},{"id":4,"type":"multiple_choice","question":"How did the family feel at the end of the day?","options":["A. Sad and bored","B. Angry and tired","C. Tired but happy","D. Excited but cold"],"correctAnswer":"C","explanation":"The text says: We went home tired but very happy."}]',
'[{"word":"waves","definition":"moving lines of water in the sea","translation":"sóng biển"},{"word":"sandcastle","definition":"a castle shape made from sand","translation":"lâu đài cát"},{"word":"shells","definition":"hard covers from sea animals","translation":"vỏ sò"},{"word":"delicious","definition":"very good tasting","translation":"ngon"}]'),

-- B1
('B1', 'technology', 'How Social Media Changed Communication',
'Social media has completely changed the way people communicate with each other. Before platforms like Facebook, Instagram, and Twitter existed, people relied on phone calls, text messages, and face-to-face conversations. Today, millions of people share their thoughts, photos, and experiences online every single day. One of the biggest advantages of social media is that it allows people to stay connected regardless of distance. A person living in Vietnam can easily chat with a friend in the United States in real time. Businesses also use social media to reach customers and promote their products. However, social media is not without its problems. Many experts worry about the effects of excessive screen time on mental health, particularly among young people. Cyberbullying and the spread of misinformation are also significant concerns. Despite these challenges, social media continues to grow and evolve, shaping the way we interact with the world around us.',
150, 'An analysis of how social media has transformed modern communication.',
'[{"id":1,"type":"multiple_choice","question":"What is the main topic of the passage?","options":["A. The history of the internet","B. How social media changed communication","C. Why people should stop using social media","D. The best social media platforms"],"correctAnswer":"B","explanation":"The passage discusses how social media has transformed the way people communicate."},{"id":2,"type":"true_false_ng","statement":"Social media only has positive effects on society.","correctAnswer":"False","explanation":"The passage mentions problems like cyberbullying and misinformation."},{"id":3,"type":"multiple_choice","question":"What concern do experts have about social media?","options":["A. It is too expensive","B. It is hard to use","C. Excessive screen time affects mental health","D. It makes people travel more"],"correctAnswer":"C","explanation":"The text states that experts worry about excessive screen time on mental health."},{"id":4,"type":"true_false_ng","statement":"Businesses use social media for advertising.","correctAnswer":"True","explanation":"The passage says businesses use social media to reach customers and promote products."},{"id":5,"type":"true_false_ng","statement":"Social media usage is decreasing worldwide.","correctAnswer":"False","explanation":"The passage says social media continues to grow and evolve."}]',
'[{"word":"regardless","definition":"without being affected by something","translation":"bất kể"},{"word":"excessive","definition":"more than is necessary or normal","translation":"quá mức"},{"word":"cyberbullying","definition":"bullying that takes place online","translation":"bắt nạt trực tuyến"},{"word":"misinformation","definition":"false or inaccurate information","translation":"thông tin sai lệch"},{"word":"evolve","definition":"to develop gradually","translation":"tiến hóa, phát triển"}]'),

-- B2
('B2', 'environment', 'The Hidden Cost of Fast Fashion',
'The fashion industry is one of the largest polluters in the world, yet most consumers remain unaware of the environmental damage caused by their clothing choices. Fast fashion — the rapid production of cheap, trendy clothing — has made it possible for people to buy new outfits every week at remarkably low prices. However, this convenience comes at a devastating cost to the environment. The production of a single cotton T-shirt requires approximately 2,700 liters of water, enough for one person to drink for two and a half years. Furthermore, the textile industry produces about 10% of global carbon emissions, more than international flights and maritime shipping combined. Synthetic fabrics like polyester release microplastics into waterways when washed, contaminating oceans and eventually entering the food chain. Perhaps most alarmingly, around 85% of all textiles end up in landfills each year, where they can take up to 200 years to decompose. Sustainable alternatives do exist. Consumers can choose to buy second-hand clothing, support ethical brands, or simply purchase fewer items of higher quality. The key lies in shifting our mindset from viewing clothing as disposable to treating it as a long-term investment.',
200, 'An exploration of the environmental impact of the fast fashion industry.',
'[{"id":1,"type":"multiple_choice","question":"What is the main argument of the passage?","options":["A. Fast fashion is affordable and beneficial","B. The fashion industry causes significant environmental harm","C. People should only wear expensive clothes","D. Cotton farming is the biggest environmental problem"],"correctAnswer":"B","explanation":"The passage focuses on the environmental damage caused by the fashion industry."},{"id":2,"type":"true_false_ng","statement":"A cotton T-shirt requires about 2,700 liters of water to produce.","correctAnswer":"True","explanation":"This is directly stated in the passage."},{"id":3,"type":"multiple_choice","question":"What happens to synthetic fabrics when washed?","options":["A. They become softer","B. They release microplastics","C. They shrink significantly","D. They lose their color"],"correctAnswer":"B","explanation":"The passage states that synthetic fabrics release microplastics into waterways."},{"id":4,"type":"true_false_ng","statement":"The textile industry produces less carbon emissions than international flights.","correctAnswer":"False","explanation":"The passage says the textile industry produces MORE than international flights and maritime shipping combined."},{"id":5,"type":"multiple_choice","question":"What solution does the author suggest?","options":["A. Stop buying clothes entirely","B. Only buy designer brands","C. Buy second-hand or higher quality items","D. Wear the same outfit every day"],"correctAnswer":"C","explanation":"The author suggests buying second-hand clothing, supporting ethical brands, or purchasing fewer items of higher quality."}]',
'[{"word":"devastating","definition":"causing great damage or harm","translation":"tàn phá"},{"word":"contaminating","definition":"making something impure or polluted","translation":"gây ô nhiễm"},{"word":"decompose","definition":"to break down naturally over time","translation":"phân hủy"},{"word":"sustainable","definition":"able to continue without causing damage","translation":"bền vững"},{"word":"disposable","definition":"intended to be thrown away after use","translation":"dùng một lần"}]')

ON CONFLICT DO NOTHING;
