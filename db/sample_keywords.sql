-- Thêm các từ khóa quan trọng mẫu cho hệ thống chọn thuật toán
INSERT INTO important_keywords (keyword) VALUES 
-- AI & Machine Learning
('machine learning'),
('deep learning'), 
('neural network'),
('artificial intelligence'),
('algorithm'),
('data science'),
('natural language processing'),
('computer vision'),

-- Programming
('javascript'),
('python'),
('react'),
('nodejs'),
('database'),
('sql'),
('api'),
('backend'),
('frontend'),

-- Tiếng Việt - AI
('học máy'),
('trí tuệ nhân tạo'),
('mạng nơ-ron'),
('thuật toán'),
('khoa học dữ liệu'),
('xử lý ngôn ngữ tự nhiên'),

-- Tiếng Việt - Lập trình  
('lập trình'),
('cơ sở dữ liệu'),
('ứng dụng web'),
('phát triển phần mềm')

ON DUPLICATE KEY UPDATE keyword = VALUES(keyword);

-- Thêm dữ liệu mẫu cho knowledge_base nếu chưa có
INSERT INTO knowledge_base (title, content, category) VALUES 
('Machine Learning cơ bản', 'Machine Learning là một nhánh của trí tuệ nhân tạo (AI) cho phép máy tính học và cải thiện hiệu suất từ dữ liệu mà không cần được lập trình cụ thể cho từng tác vụ.', 'AI'),
('Deep Learning', 'Deep Learning là một phương pháp machine learning sử dụng mạng nơ-ron nhân tạo với nhiều lớp ẩn để học các pattern phức tạp trong dữ liệu.', 'AI'),
('JavaScript cơ bản', 'JavaScript là ngôn ngữ lập trình phổ biến được sử dụng chủ yếu để phát triển web, có thể chạy ở cả client-side và server-side.', 'Programming'),
('React Framework', 'React là một thư viện JavaScript để xây dựng user interface, được phát triển bởi Facebook với tính năng component-based architecture.', 'Programming')

ON DUPLICATE KEY UPDATE title = VALUES(title);