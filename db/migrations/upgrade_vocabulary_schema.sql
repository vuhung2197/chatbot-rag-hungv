-- Tự thêm cột item_type nếu chưa có
ALTER TABLE user_vocabulary 
ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) DEFAULT 'vocabulary' 
CHECK (item_type IN ('vocabulary', 'grammar', 'pronunciation'));

-- Thêm cột grammar_error để lưu lỗi ngữ pháp (kèm đáp án đúng)
ALTER TABLE user_vocabulary
ADD COLUMN IF NOT EXISTS grammar_error TEXT,
ADD COLUMN IF NOT EXISTS grammar_correction TEXT;

-- Bỏ UNIQUE constraint cũ (chỉ word) và thay bằng (user_id, word, item_type) để cho phép 1 từ vừa là vocabulary vừa là pronunciation
ALTER TABLE user_vocabulary DROP CONSTRAINT IF EXISTS user_vocabulary_user_id_word_key;
ALTER TABLE user_vocabulary ADD CONSTRAINT unique_user_item UNIQUE (user_id, word, item_type);
