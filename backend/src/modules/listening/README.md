# Module Listening

## Mục đích
Module Listening cung cấp bài tập luyện nghe tiếng Anh với nhiều cấp độ, tự động chấm điểm và phản hồi chi tiết bằng AI.

## Chức năng chính

### 1. Quản lý Bài tập
- Tạo và quản lý listening exercises
- Phân loại theo level (A1-C2)
- Nhiều dạng bài: fill-in-blank, multiple choice, true/false

### 2. Audio Processing
- Upload và lưu trữ file audio
- Tạo transcript tự động
- Tích hợp text-to-speech

### 3. Submission & Grading
- Nộp bài và tự động chấm điểm
- AI feedback chi tiết
- Lưu lịch sử làm bài

### 4. AI Features
- Tạo câu hỏi từ audio
- Đánh giá và feedback
- Gợi ý cải thiện

## Cấu trúc

```
listening/
├── controllers/
│   └── listening.controller.js      # Xử lý HTTP requests
├── routes/
│   └── listening.routes.js          # Định nghĩa API endpoints
├── repositories/
│   └── listening.repository.js      # Database operations
└── services/
    ├── listening.service.js         # Business logic
    └── listeningAI.service.js       # AI features
```

## API Endpoints

### GET /api/listening/exercises
Lấy danh sách bài tập

**Query Parameters:**
- `level`: Lọc theo level
- `page`, `limit`: Phân trang

### GET /api/listening/exercises/:id
Lấy chi tiết bài tập

### POST /api/listening/exercises
Tạo bài tập mới (Admin)

### POST /api/listening/submit
Nộp bài làm

**Request Body:**
```json
{
  "exerciseId": 123,
  "answers": [
    { "questionId": 1, "answer": "correct answer" }
  ]
}
```

### GET /api/listening/submissions
Lấy lịch sử làm bài

## Database Schema

### Bảng: listening_exercises
- `id`: Primary key
- `title`: Tiêu đề
- `level`: Cấp độ (A1-C2)
- `audio_url`: Link file audio
- `transcript`: Nội dung audio
- `questions`: Câu hỏi (JSON)
- `duration`: Thời lượng (giây)
- `created_at`: Thời gian tạo

### Bảng: listening_submissions
- `id`: Primary key
- `user_id`: ID người dùng
- `exercise_id`: ID bài tập
- `answers`: Câu trả lời (JSON)
- `score_total`: Tổng điểm
- `feedback`: Phản hồi AI (JSON)
- `time_spent`: Thời gian làm bài
- `created_at`: Thời gian nộp

## Sử dụng

```javascript
import listeningService from './services/listening.service.js';

// Lấy bài tập
const exercises = await listeningService.getExercises('B1');

// Nộp bài
const result = await listeningService.submitExercise(userId, {
  exerciseId: 123,
  answers: [...]
});
```

## Cải tiến trong tương lai
- Speech recognition cho dictation
- Adaptive difficulty
- Podcast integration
- Real-time transcription
