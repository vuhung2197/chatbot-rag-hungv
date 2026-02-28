-- 1. Create system vocabulary dictionary
CREATE TABLE IF NOT EXISTS system_vocabulary (
    id SERIAL PRIMARY KEY,
    word VARCHAR(100) NOT NULL UNIQUE,
    pos VARCHAR(20), -- noun, verb, adj, adv
    phonetic VARCHAR(50),
    definition TEXT,
    translation TEXT,
    example_sentence TEXT,
    level VARCHAR(2) CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
    topic VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to update timestamp
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_system_vocabulary_updated_at') THEN
        CREATE TRIGGER update_system_vocabulary_updated_at
            BEFORE UPDATE ON system_vocabulary
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Fix user_vocabulary: Add missing columns if any
ALTER TABLE user_vocabulary ADD COLUMN IF NOT EXISTS translation TEXT;
ALTER TABLE user_vocabulary ADD COLUMN IF NOT EXISTS phonetic VARCHAR(50);
ALTER TABLE user_vocabulary ADD COLUMN IF NOT EXISTS pos VARCHAR(20);

-- 2. Seed system vocabulary data (A1-C1)
INSERT INTO system_vocabulary (word, pos, phonetic, definition, translation, example_sentence, level, topic)
VALUES
-- A1 - Basic Words (20 words)
('apple', 'noun', '/ˈæpl/', 'A round fruit with red or green skin and a whitish interior.', 'Quả táo', 'I eat an apple every morning.', 'A1', 'Food'),
('beautiful', 'adj', '/ˈbjuːtɪfl/', 'Pleasing the senses or mind aesthetically.', 'Đẹp', 'She wore a beautiful dress to the party.', 'A1', 'Adjectives'),
('cat', 'noun', '/kæt/', 'A small domesticated carnivorous mammal with soft fur.', 'Con mèo', 'My cat likes to sleep on the sofa.', 'A1', 'Animals'),
('dog', 'noun', '/dɒɡ/', 'A domesticated carnivorous mammal that typically has a long snout.', 'Con chó', 'The dog barked at the stranger.', 'A1', 'Animals'),
('eat', 'verb', '/iːt/', 'Put (food) into the mouth and chew and swallow it.', 'Ăn', 'We usually eat dinner at 7 PM.', 'A1', 'Daily Routine'),
('family', 'noun', '/ˈfæməli/', 'A group of one or more parents and their children.', 'Gia đình', 'My family is very important to me.', 'A1', 'People'),
('good', 'adj', '/ɡʊd/', 'To be desired or approved of.', 'Tốt, giỏi', 'He is a good student.', 'A1', 'Adjectives'),
('house', 'noun', '/haʊs/', 'A building for human habitation.', 'Ngôi nhà', 'They live in a beautiful house.', 'A1', 'Places'),
('important', 'adj', '/ɪmˈpɔːtnt/', 'Of great significance or value.', 'Quan trọng', 'It is important to study hard.', 'A1', 'Adjectives'),
('job', 'noun', '/dʒɒb/', 'A paid position of regular employment.', 'Công việc', 'She has a good job at the bank.', 'A1', 'Work'),
('know', 'verb', '/nəʊ/', 'Be aware of through observation, inquiry, or information.', 'Biết', 'I don''t know the answer.', 'A1', 'Verbs'),
('love', 'verb', '/lʌv/', 'Feel a deep romantic or sexual attachment to (someone).', 'Yêu, Thích', 'I love reading books in my free time.', 'A1', 'Emotions'),
('money', 'noun', '/ˈmʌni/', 'A current medium of exchange in the form of coins and banknotes.', 'Tiền', 'I don''t have enough money to buy this.', 'A1', 'Finance'),
('new', 'adj', '/njuː/', 'Produced, introduced, or discovered recently.', 'Mới', 'I bought a new car yesterday.', 'A1', 'Adjectives'),
('often', 'adv', '/ˈɒfn/', 'Frequently; many times.', 'Thường xuyên', 'I often go to the gym after work.', 'A1', 'Adverbs'),
('people', 'noun', '/ˈpiːpl/', 'Human beings in general or considered collectively.', 'Mọi người', 'Many people attended the concert.', 'A1', 'People'),
('question', 'noun', '/ˈkwestʃən/', 'A sentence worded or expressed so as to elicit information.', 'Câu hỏi', 'Can I ask you a question?', 'A1', 'Communication'),
('read', 'verb', '/riːd/', 'Look at and comprehend the meaning of (written or printed matter).', 'Đọc', 'I read a book every week.', 'A1', 'Hobbies'),
('school', 'noun', '/skuːl/', 'An institution for educating children.', 'Trường học', 'Children start school at age five.', 'A1', 'Places'),
('time', 'noun', '/taɪm/', 'The indefinite continued progress of existence and events.', 'Thời gian', 'What time is it?', 'A1', 'Concepts'),

-- A2 - Pre-Intermediate (15 words)
('achieve', 'verb', '/əˈtʃiːv/', 'Object successfully bring about or reach by effort, skill.', 'Đạt được', 'She achieved her goal of becoming a doctor.', 'A2', 'Verbs'),
('believe', 'verb', '/bɪˈliːv/', 'Accept that (something) is true, especially without proof.', 'Tin tưởng', 'I believe that everything will be fine.', 'A2', 'Emotions'),
('culture', 'noun', '/ˈkʌltʃə(r)/', 'The arts and other manifestations of human intellectual achievement.', 'Văn hóa', 'Learning a new language helps you understand its culture.', 'A2', 'Society'),
('decide', 'verb', '/dɪˈsaɪd/', 'Come to a resolution in the mind as a result of consideration.', 'Quyết định', 'I decided to stay home instead of going out.', 'A2', 'Verbs'),
('experience', 'noun', '/ɪkˈspɪəriəns/', 'Practical contact with and observation of facts or events.', 'Kinh nghiệm, trải nghiệm', 'She has a lot of experience in teaching.', 'A2', 'Concepts'),
('forget', 'verb', '/fəˈɡet/', 'Fail to remember.', 'Quên', 'Don''t forget to lock the door.', 'A2', 'Verbs'),
('government', 'noun', '/ˈɡʌvənmənt/', 'The group of people with the authority to govern a country.', 'Chính phủ', 'The government announced new tax policies.', 'A2', 'Society'),
('happen', 'verb', '/ˈhæpən/', 'Take place; occur.', 'Xảy ra', 'What happened here last night?', 'A2', 'Verbs'),
('improve', 'verb', '/ɪmˈpruːv/', 'Make or become better.', 'Cải thiện', 'I want to improve my English speaking skills.', 'A2', 'Verbs'),
('journey', 'noun', '/ˈdʒɜːni/', 'An act of travelling from one place to another.', 'Chuyến đi, hành trình', 'The journey took us three hours by car.', 'A2', 'Travel'),
('knowledge', 'noun', '/ˈnɒlɪdʒ/', 'Facts, information, and skills acquired through experience.', 'Kiến thức', 'Reading books helps you acquire more knowledge.', 'A2', 'Concepts'),
('language', 'noun', '/ˈlæŋɡwɪdʒ/', 'The method of human communication, either spoken or written.', 'Ngôn ngữ', 'How many languages do you speak?', 'A2', 'Communication'),
('measure', 'verb', '/ˈmeʒə(r)/', 'Ascertain the size, amount, or degree of (something).', 'Đo lường', 'We need to measure the room before buying furniture.', 'A2', 'Actions'),
('necessary', 'adj', '/ˈnesəsəri/', 'Needed to be done, achieved, or present; essential.', 'Cần thiết', 'It is necessary to bring your passport.', 'A2', 'Adjectives'),
('opportunity', 'noun', '/ˌɒpəˈtjuːnəti/', 'A time or set of circumstances that makes it possible to do something.', 'Cơ hội', 'This is a great opportunity for my career.', 'A2', 'Concepts'),

-- B1 - Intermediate (15 words)
('abundance', 'noun', '/əˈbʌndəns/', 'A very large quantity of something.', 'Sự phong phú, dồi dào', 'There is an abundance of food at the party.', 'B1', 'Concepts'),
('benevolent', 'adj', '/bəˈnevələnt/', 'Well meaning and kindly.', 'Nhân từ, tốt bụng', 'The benevolent gentleman donated to the orphanage.', 'B1', 'Adjectives'),
('character', 'noun', '/ˈkærəktə(r)/', 'The mental and moral qualities distinctive to an individual.', 'Tính cách, nhân vật', 'He is a man of strong character.', 'B1', 'People'),
('determine', 'verb', '/dɪˈtɜːmɪn/', 'Ascertain or establish exactly by research or calculation.', 'Xác định, quyết tâm', 'We need to determine the cause of the problem.', 'B1', 'Verbs'),
('efficient', 'adj', '/ɪˈfɪʃnt/', 'Achieving maximum productivity with minimum wasted effort.', 'Hiệu quả', 'The new system is much more efficient.', 'B1', 'Adjectives'),
('frequent', 'adj', '/ˈfriːkwənt/', 'Occurring or done many times at short intervals.', 'Thường xuyên', 'He is a frequent visitor to the museum.', 'B1', 'Adjectives'),
('generate', 'verb', '/ˈdʒenəreɪt/', 'Produce or create.', 'Tạo ra', 'The wind farm can generate enough electricity for the town.', 'B1', 'Verbs'),
('hesitate', 'verb', '/ˈhezɪteɪt/', 'Pause in indecision before saying or doing something.', 'Do dự, ngập ngừng', 'Don''t hesitate to contact me if you need help.', 'B1', 'Verbs'),
('identify', 'verb', '/aɪˈdentɪfaɪ/', 'Establish or indicate who or what (someone or something) is.', 'Nhận diện, xác định', 'Can you identify the man in this photo?', 'B1', 'Verbs'),
('justify', 'verb', '/ˈdʒʌstɪfaɪ/', 'Show or prove to be right or reasonable.', 'Biện minh, bào chữa', 'He tried to justify his bad behavior.', 'B1', 'Verbs'),
('maintain', 'verb', '/meɪnˈteɪn/', 'Cause or enable (a condition or situation) to continue.', 'Duy trì', 'It is important to maintain a healthy diet.', 'B1', 'Verbs'),
('negotiate', 'verb', '/nɪˈɡəʊʃieɪt/', 'Obtain or bring about by discussion.', 'Đàm phán', 'We need to negotiate a better price.', 'B1', 'Business'),
('observe', 'verb', '/əbˈzɜːv/', 'Notice or perceive (something) and register it as being significant.', 'Quan sát', 'The children were observing the birds in the tree.', 'B1', 'Actions'),
('persuade', 'verb', '/pəˈsweɪd/', 'Induce (someone) to do something through reasoning or argument.', 'Thuyết phục', 'I finally persuaded her to join us.', 'B1', 'Communication'),
('relevant', 'adj', '/ˈreləvənt/', 'Closely connected or appropriate to the matter in hand.', 'Có liên quan', 'Please provide only relevant information.', 'B1', 'Adjectives'),

-- B2 - Upper-Intermediate (10 words)
('ambiguity', 'noun', '/ˌæmbɪˈɡjuːəti/', 'The quality of being open to more than one interpretation.', 'Sự mơ hồ', 'We must eliminate any ambiguity in the contract.', 'B2', 'Concepts'),
('comprehensible', 'adj', '/ˌkɒmprɪˈhensəbl/', 'Able to be understood; intelligible.', 'Có thể hiểu được', 'His explanation was completely comprehensible.', 'B2', 'Adjectives'),
('deliberate', 'adj', '/dɪˈlɪbərət/', 'Done consciously and intentionally.', 'Cố ý, có chủ đích', 'It was a deliberate attempt to sabotage the project.', 'B2', 'Adjectives'),
('exaggerate', 'verb', '/ɪɡˈzædʒəreɪt/', 'Represent (something) as being larger, better, or worse than it really is.', 'Phóng đại', 'He tends to exaggerate his achievements.', 'B2', 'Verbs'),
('fascinate', 'verb', '/ˈfæsɪneɪt/', 'Draw irresistibly the attention and interest of (someone).', 'Gây quyến rũ, mê hoặc', 'The structure of the universe fascinates me.', 'B2', 'Verbs'),
('implement', 'verb', '/ˈɪmplɪment/', 'Put (a decision, plan, agreement, etc.) into effect.', 'Thiết lập, triển khai', 'The new policy will be implemented next month.', 'B2', 'Business'),
('inevitable', 'adj', '/ɪnˈevɪtəbl/', 'Certain to happen; unavoidable.', 'Không thể tránh khỏi', 'Conflict is inevitable when so many people work together.', 'B2', 'Adjectives'),
('manipulate', 'verb', '/məˈnɪpjuleɪt/', 'Handle or control typically in a skillful manner.', 'Thao túng, điều khiển', 'She knows how to manipulate people to get what she wants.', 'B2', 'Social'),
('profound', 'adj', '/prəˈfaʊnd/', 'Very great or intense.', 'Sâu sắc', 'The book had a profound impact on my thinking.', 'B2', 'Adjectives'),
('resilient', 'adj', '/rɪˈzɪliənt/', 'Able to withstand or recover quickly from difficult conditions.', 'Kiên cường', 'Children are often more resilient than adults.', 'B2', 'Adjectives'),

-- C1 - Advanced (5 words)
('cacophony', 'noun', '/kəˈkɒfəni/', 'A harsh discordant mixture of sounds.', 'Âm thanh chói tai, tạp âm', 'The classroom was a cacophony of shouting children.', 'C1', 'Sounds'),
('ephemeral', 'adj', '/ɪˈfemərəl/', 'Lasting for a very short time.', 'Phù du, chóng tàn', 'Fame is often ephemeral.', 'C1', 'Concepts'),
('loquacious', 'adj', '/ləˈkweɪʃəs/', 'Tending to talk a great deal; talkative.', 'Nói nhiều, ba hoa', 'He is a loquacious and extremely charming host.', 'C1', 'People'),
('obfuscate', 'verb', '/ˈɒbfʌskeɪt/', 'Render obscure, unclear, or unintelligible.', 'Làm lu mờ, làm khó hiểu', 'The new rules only obfuscate the process further.', 'C1', 'Verbs'),
('ubiquitous', 'adj', '/juːˈbɪkwɪtəs/', 'Present, appearing, or found everywhere.', 'Có mặt ở khắp mọi nơi', 'Smartphones have become ubiquitous in modern society.', 'C1', 'Technology')

ON CONFLICT (word) DO UPDATE SET
    definition = EXCLUDED.definition,
    translation = EXCLUDED.translation,
    example_sentence = EXCLUDED.example_sentence,
    phonetic = EXCLUDED.phonetic,
    pos = EXCLUDED.pos,
    level = EXCLUDED.level,
    topic = EXCLUDED.topic,
    updated_at = NOW();
