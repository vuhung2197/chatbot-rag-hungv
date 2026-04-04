# Module Reading

## Mục đích
Module Reading cung cấp bài tập luyện đọc hiểu tiếng Anh với nhiều cấp độ và tự động chấm điểm bằng AI.

## Chức năng chính

### 1. Quản lý Bài đọc
- Tạo và quản lý reading passages
- Phân loại theo level và topic
- Nhiều dạng câu hỏi: comprehension, vocabulary, inference

### 2. Submission & Grading
- Nộp bài và tự động chấm điểm
- AI feedback chi tiết
- Phân tích reading speed

### 3. AI Features
- Tạo câu hỏi từ đoạn văn
- Đánh giá comprehension
- Gợi ý từ vựng khó

## Cấu trúc

```
reading/
├── controllers/
│   └── reading.controller.js        # Xử lý HTTP requests
├── routes/
│   └── reading.routes.js            # Định nghĩa API endpoints
├── repositories/
│   └── reading.repository.js        # Database operations
└── services/
    ├── reading.service.js           # Business logic
    └── readingAI.service.js         # AI features
```

## API Endpoints

### GET /api/reading/passages
Lấy danh sách bài đọc

### GET /api/reading/passages/:id
Lấy chi tiết bài đọc

### POST /api/reading/submit
Nộp bài làm

### GET /api/reading/submissions
Lấy lịch sử làm bài

## Database Schema

### Bảng: reading_passages
- `id`: Primary key
- `title`: Tiêu đề
- `content`: Nội dung
- `level`: Cấp độ
- `topic`: Chủ đề
- `questions`: Câu hỏi (JSON)
- `word_count`: Số từ
- `created_at`: Thời gian tạo

### Bảng: reading_submissions
- `id`: Primary key
- `user_id`: ID người dùng
- `passage_id`: ID bài đọc
- `answers`: Câu trả lời (JSON)
- `score_total`: Tổng điểm
- `reading_time`: Thời gian đọc (giây)
- `created_at`: Thời gian nộp

## Cải tiến trong tương lai
- Reading speed tracker
- Vocabulary highlighting
- Text-to-speech
- Adaptive passages
