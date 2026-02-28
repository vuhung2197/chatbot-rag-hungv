-- =============================================
-- Migration: Add Pronunciation Practice
-- Description:
-- 1. Updates speaking_topics.type to allow 'pronunciation'
-- 2. Creates ipa_phonemes table to store 44 IPA sounds
-- 3. Seeds minimal/initial phoneme data
-- =============================================

-- 1. Update Constraint on speaking_topics
-- PostgreSQL doesn't allow direct alteration of CHECK constraints, we drop it and re-add.
ALTER TABLE speaking_topics DROP CONSTRAINT speaking_topics_type_check;
ALTER TABLE speaking_topics ADD CONSTRAINT speaking_topics_type_check CHECK (type IN ('shadowing', 'topic', 'reflex', 'pronunciation'));

-- 2. Create IPA Phonemes reference table
CREATE TABLE IF NOT EXISTS ipa_phonemes (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('vowel', 'consonant', 'diphthong')),
    is_voiced BOOLEAN NOT NULL,
    example_words VARCHAR(255),
    description TEXT,
    audio_url VARCHAR(255),
    video_url VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to update timestamp
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_ipa_phonemes_updated_at') THEN
        CREATE TRIGGER update_ipa_phonemes_updated_at
            BEFORE UPDATE ON ipa_phonemes
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 3. Seed some basic phonemes to get started
INSERT INTO ipa_phonemes (symbol, category, is_voiced, example_words, description)
VALUES 
-- Vowels
('i:', 'vowel', true, 'sheep, eagle, field', 'Âm i dài. Miệng căng sang 2 bên như đang mỉm cười, đầu lưỡi nâng cao.'),
('ɪ', 'vowel', true, 'ship, big, listen', 'Âm i ngắn. Môi mở tự nhiên, lưỡi hạ thấp. Giọng phát ra dứt khoát (nửa i nửa ê).'),
('ʊ', 'vowel', true, 'book, put, could', 'Âm u ngắn. Môi hơi tròn, đẩy nhẹ ra phía trước. Phát âm dứt khoát, âm phát ra trong khoang miệng.'),
('u:', 'vowel', true, 'shoot, boot, blue', 'Âm u dài. Môi chu tròn về phía trước, căng. Giữ âm kéo dài ra.'),
('e', 'vowel', true, 'bed, head, left', 'Âm e ngắn. Miệng mở hẹp vừa phải, lưỡi hạ thấp, âm dứt khoát giống chữ "e".'),
('ə', 'vowel', true, 'teacher, about, sister', 'Âm ơ ngắn (Schwa). Môi và lưỡi hoàn toàn thả lỏng. Âm cực kỳ phổ biến trong nói lướt, âm tiết không trọng âm. Nghe như chữ ơ nghẹn.'),
('ɜ:', 'vowel', true, 'bird, learn, word', 'Âm ơ dài. Khẩu hình tự nhiên, cong đầu lưỡi lên (gần ngạc cứng). Giữ âm kéo dài ra.'),
('ɔ:', 'vowel', true, 'door, walk, saw', 'Âm o dài. Môi hơi tròn, mở rộng, cong đầu lưỡi nhẹ. Giữ âm kéo dài.'),
('æ', 'vowel', true, 'cat, apple, black', 'Âm a bẹt. Mở rất rộng miệng căng sang 2 bên, cằm hạ thấp nhất có thể. Âm pha giữa miệng chữ "a" nhưng đọc chữ "e".'),
('ʌ', 'vowel', true, 'up, cup, money', 'Âm ă ngắn. Miệng hơi mở, lưỡi hạ cực thấp. Đọc dứt khoát, lai giữa chữ "ă" và chữ "ơ" tiếng Việt.'),
('ɑ:', 'vowel', true, 'far, part, father', 'Âm a dài. Miệng mở rất to, cằm hạ thấp, lưỡi nằm bẹt xuống. Kéo dài âm.'),
('ɒ', 'vowel', true, 'on, got, watch', 'Âm o ngắn. Môi tròn, mở rộng, lưỡi hạ thấp. Phát âm một cách dứt khoát.'),

-- Consonants
('p', 'consonant', false, 'pen, copy, happen', 'Âm vô thanh. Hai môi ngậm chặt để chặn hơi, sau đó bật bung mạnh hơi ra khỏi miệng. Cổ họng KHÔNG rung.'),
('b', 'consonant', true, 'back, baby, job', 'Âm hữu thanh. Khẩu hình giống âm /p/, chặn hơi ở môi nhưng bật ra nhẹ. Cổ họng RUNG.'),
('t', 'consonant', false, 'tea, tight, button', 'Âm vô thanh. Răng khép hờ, chạm đầu lưỡi vào sau chân răng cửa trên. Bật mạnh luồng hơi ra, cổ họng KHÔNG rung.'),
('d', 'consonant', true, 'day, ladder, odd', 'Âm hữu thanh. Khẩu hình giống /t/, chạm lưỡi chân răng hàm trên rồi bật ra. Cổ họng RUNG (giống chữ đ tiếng Việt).'),
('k', 'consonant', false, 'key, clock, school', 'Âm vô thanh. Nâng cuống lưỡi lên chạm ngạc mềm (trong cùng hàm) để chặn khí. Bật khí ra (nghe như chữ kh), cổ vị trí KHÔNG rung.'),
('g', 'consonant', true, 'get, giggle, ghost', 'Âm hữu thanh. Khẩu hình giống /k/, nâng cuống lưỡi, nhưng thay vì bật hơi, cổ họng RUNG mạnh để phát ra tiếng.'),
('θ', 'consonant', false, 'think, both, math', 'Âm TH vô thanh. Thè hẳn một đoạn đầu lưỡi ra giữa 2 hàm răng, đẩy luồng hơi đều liên tục qua khe răng. Cổ họng KHÔNG rung.'),
('ð', 'consonant', true, 'this, mother, breathe', 'Âm TH hữu thanh. Khẩu hình giống /θ/ (đặt hẳn đầu lưỡi giữa răng) nhưng tạo tiếng d z d z. Cổ họng RUNG mạnh.'),
('ʃ', 'consonant', false, 'shirt, rush, shop', 'Âm s nặng (vô thanh). Chu môi, môi uốn cong về phía trước. Hai hàm răng khép. Đẩy hơi xì mạnh ra liên tục (như chép miệng đuổi vịt).'),
('ʒ', 'consonant', true, 'vision, measure, casual', 'Âm zh (hữu thanh). Khẩu hình y hệt âm /ʃ/ (chu tròn môi tống hơi). Nhưng thay vì âm xì thì cổ họng RUNG mạnh.')

ON CONFLICT (symbol) DO UPDATE SET 
    description = EXCLUDED.description,
    example_words = EXCLUDED.example_words;
