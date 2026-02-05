-- Tạo bảng để lưu thống kê việc chọn thuật toán
CREATE TABLE IF NOT EXISTS algorithm_selections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    question TEXT NOT NULL,
    selected_algorithm ENUM('embedding', 'context', 'direct') NOT NULL,
    confidence DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    relevance_score INT DEFAULT 0,
    matched_keywords JSON,
    question_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_algorithm (selected_algorithm),
    INDEX idx_created_at (created_at),
    INDEX idx_confidence (confidence),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Thêm cột mode vào bảng user_questions nếu chưa có
ALTER TABLE `user_questions`
ADD COLUMN `mode` VARCHAR(20) DEFAULT 'embedding';
