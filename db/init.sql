-- Tạo database chuẩn Unicode
CREATE DATABASE IF NOT EXISTS chatbot CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE chatbot;

-- Bảng từ điển Anh-Việt
DROP TABLE IF EXISTS dictionary;
CREATE TABLE dictionary (
    id INT AUTO_INCREMENT PRIMARY KEY,
    word_en VARCHAR(100) NOT NULL,
    word_vi VARCHAR(255) NOT NULL,
    type VARCHAR(20),         -- ví dụ: noun, verb, adj, adv
    example_en VARCHAR(255),
    example_vi VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Bảng câu ví dụ
DROP TABLE IF EXISTS sentence_examples;
CREATE TABLE sentence_examples (
    id INT AUTO_INCREMENT PRIMARY KEY,
    word_en VARCHAR(255) NOT NULL,
    sentence_en TEXT NOT NULL,
    sentence_vi TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Log các câu/từ chưa hiểu
DROP TABLE IF EXISTS unknown_queries;
CREATE TABLE unknown_queries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Lịch sử chat
DROP TABLE IF EXISTS chat_history;
CREATE TABLE chat_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message TEXT NOT NULL,
    reply TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Góp ý/training
DROP TABLE IF EXISTS feedbacks;
CREATE TABLE feedbacks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message TEXT NOT NULL,
    suggested_reply TEXT NOT NULL,
    explanation TEXT,
    approved BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS user_words;
-- Bảng từ vựng của người dùng (nếu cần)
CREATE TABLE user_words (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT, -- nếu muốn đa user, không thì bỏ
    word_en VARCHAR(100) NOT NULL,
    word_vi VARCHAR(255),
    type VARCHAR(20),
    example_en VARCHAR(255),
    example_vi VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS user_highlighted_text;
CREATE TABLE user_highlighted_text (
    id INT AUTO_INCREMENT PRIMARY KEY,
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE user_highlighted_text ADD COLUMN translated_text TEXT;

ALTER TABLE user_highlighted_text ADD COLUMN approved TINYINT(1) DEFAULT 0;

DROP TABLE IF EXISTS knowledge_base;
CREATE TABLE knowledge_base (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    content TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE knowledge_base
ADD FULLTEXT(title, content);

ALTER TABLE knowledge_base ADD COLUMN embedding JSON NULL;

CREATE TABLE important_keywords (
  id INT AUTO_INCREMENT PRIMARY KEY,
  keyword VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `knowledge_base` (`id`, `title`, `content`) VALUES
(1, 'Docker là gì?\r\n', 'Docker là một nền tảng mã nguồn mở giúp đóng gói, phân phối và chạy các ứng dụng trong môi trường gọi là container. Nhờ Docker, ứng dụng được cô lập với hệ điều hành và các ứng dụng khác, đảm bảo chạy đồng nhất trên nhiều môi trường.'),
(2, 'Sự khác biệt giữa Props và State trong React', 'Props là dữ liệu truyền từ component cha xuống component con và không thể thay đổi trong component con. State là dữ liệu cục bộ của mỗi component và có thể thay đổi bằng hàm setState.'),
(3, 'Ưu điểm của Docker', 'Docker giúp tiết kiệm tài nguyên, triển khai nhanh chóng, dễ dàng mở rộng, cô lập ứng dụng tốt, đồng thời hỗ trợ dễ dàng rollback hoặc nâng cấp phiên bản ứng dụng.'),
(4, 'React là gì?', 'React là một thư viện JavaScript được phát triển bởi Facebook, giúp xây dựng giao diện người dùng (UI) cho các ứng dụng web theo hướng component (thành phần) và tối ưu hiệu suất.'),
(5, 'Node.js là gì?', 'Node.js là môi trường chạy JavaScript phía server, cho phép xây dựng các ứng dụng mạng hiệu suất cao, xử lý bất đồng bộ và chịu tải lớn.'),
(6, 'Express.js dùng để làm gì?', 'Express.js là một framework web nhẹ cho Node.js, giúp xây dựng các API và web server một cách nhanh chóng, rõ ràng và dễ bảo trì.'),
(7, 'API là gì?', 'API (Application Programming Interface) là giao diện trung gian cho phép các ứng dụng hoặc hệ thống khác nhau giao tiếp với nhau thông qua các phương thức đã định nghĩa trước.'),
(8, 'Ưu điểm của kiến trúc microservice', 'Kiến trúc microservice chia nhỏ ứng dụng thành nhiều service độc lập, giúp dễ mở rộng, phát triển song song, bảo trì và triển khai từng phần mà không ảnh hưởng toàn hệ thống.'),
(9, 'SQL là gì?', 'SQL (Structured Query Language) là ngôn ngữ truy vấn cấu trúc được dùng để thao tác, truy vấn và quản lý cơ sở dữ liệu quan hệ như MySQL, PostgreSQL, SQL Server.'),
(10, 'Quy trình hoạt động của REST API', 'REST API là phương pháp thiết kế giao diện lập trình cho phép các hệ thống giao tiếp với nhau thông qua giao thức HTTP.\nQuy trình hoạt động của một REST API gồm các bước sau:\n- Client gửi một HTTP request (có thể là GET, POST, PUT, DELETE) tới endpoint của API.\n- Server nhận request, xử lý và truy vấn hoặc cập nhật dữ liệu trên cơ sở dữ liệu nếu cần.\n- Server trả về response cho client, thường ở định dạng JSON hoặc XML.\nCác nguyên tắc quan trọng của REST API:\n1. Stateless: Mỗi request phải chứa đầy đủ thông tin và độc lập với các request khác.\n2. Resource-based: Mỗi endpoint đại diện cho một tài nguyên (ví dụ: /users, /products).\n3. Sử dụng các phương thức HTTP tiêu chuẩn.\n4. Trả về mã trạng thái HTTP rõ ràng (ví dụ: 200, 404, 500).\nREST API rất phổ biến nhờ sự đơn giản, dễ tích hợp và phù hợp với hầu hết các nền tảng lập trình hiện nay.\n'),
(11, 'Kiến trúc Microservices và lợi ích trong phát triển phần mềm', 'Kiến trúc microservices là cách tổ chức hệ thống phần mềm thành nhiều dịch vụ nhỏ, mỗi dịch vụ đảm nhiệm một chức năng riêng biệt và có thể hoạt động độc lập.\nƯu điểm chính của microservices:\n- Dễ mở rộng hệ thống bằng cách scale độc lập từng dịch vụ khi cần.\n- Đội ngũ phát triển có thể làm việc song song trên các service khác nhau.\n- Khi cập nhật hoặc deploy, chỉ cần thay đổi service liên quan mà không ảnh hưởng toàn bộ hệ thống.\n- Khả năng sử dụng công nghệ khác nhau cho từng service phù hợp với nhu cầu (đa ngôn ngữ, đa framework).\nTuy nhiên, microservices cũng đặt ra một số thách thức:\n- Cần hệ thống quản lý giao tiếp giữa các service (service discovery, API gateway).\n- Quản lý dữ liệu phân tán phức tạp hơn so với monolithic.\n- Yêu cầu về logging, monitoring, bảo mật cũng tăng lên.\nMicroservices đặc biệt phù hợp với các dự án lớn, yêu cầu mở rộng linh hoạt và bảo trì lâu dài.'),
(12, 'Thông tin liên hệ Công ty TNHH ABC', 'Mọi thắc mắc hoặc cần liên hệ công việc với công ty, nhân viên và đối tác có thể sử dụng các kênh sau:\n- Địa chỉ: Tầng 5, tòa nhà XYZ, số 123 Đường Láng, Đống Đa, Hà Nội\n- Điện thoại: 024 1234 5678\n- Email: contact@abc.com.vn\n- Website: www.abc.com.vn\nBộ phận lễ tân và hành chính luôn sẵn sàng hỗ trợ mọi thắc mắc trong giờ hành chính.'),
(13, 'Nội quy cơ bản dành cho nhân viên Công ty ABC', 'Một số nội quy làm việc chính tại Công ty TNHH ABC mà nhân viên cần tuân thủ:\n- Tuân thủ quy định về thời gian làm việc, không tự ý nghỉ không phép.\n- Không sử dụng điện thoại cá nhân cho mục đích riêng trong giờ làm việc (trừ trường hợp khẩn cấp).\n- Giữ gìn tài sản công ty, bảo mật thông tin dự án và khách hàng.\n- Ăn mặc lịch sự, đúng quy định về trang phục công sở.\n- Có ý thức hợp tác, hỗ trợ đồng nghiệp và xây dựng môi trường làm việc tích cực.\nCác trường hợp vi phạm nội quy sẽ được xử lý theo quy định của công ty, tùy mức độ nghiêm trọng.');

