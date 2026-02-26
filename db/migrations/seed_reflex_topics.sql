ALTER TABLE speaking_topics DROP CONSTRAINT IF EXISTS speaking_topics_type_check;
ALTER TABLE speaking_topics ADD CONSTRAINT speaking_topics_type_check CHECK (type IN ('shadowing', 'topic', 'reflex'));

INSERT INTO speaking_topics (type, level, prompt_text, is_active)
VALUES 
    ('reflex', 'A1', 'Xin chào, tôi tên là Anna. Rất vui được gặp bạn.', true),
    ('reflex', 'A1', 'Bạn đang làm nghề gì?', true),
    ('reflex', 'A1', 'Tôi thích ăn phở và uống cà phê.', true),
    ('reflex', 'A2', 'Cuối tuần này bạn có rảnh không? Chơi game nhé.', true),
    ('reflex', 'A2', 'Tôi đã không gặp cô ấy từ tuần trước.', true),
    ('reflex', 'B1', 'Bạn đã từng đến Nhật Bản chưa? Đất nước đó rất đẹp.', true),
    ('reflex', 'B1', 'Nếu trời mưa, chúng ta sẽ ở nhà xem phim.', true),
    ('reflex', 'B2', 'Kinh tế đang đối mặt với lạm phát nghiêm trọng.', true),
    ('reflex', 'B2', 'Mặc dù anh ấy làm việc rất chăm chỉ, anh ấy vẫn chưa được thăng chức.', true),
    ('reflex', 'C1', 'Việc ứng dụng trí tuệ nhân tạo sẽ tạo ra một cuộc cách mạng trong y tế.', true);
