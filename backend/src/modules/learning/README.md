# Module Learning

## Mục đích
Module Learning cung cấp lộ trình học tập có cấu trúc (curriculum) với các bài học, bài tập và theo dõi tiến độ.

## Chức năng chính

### 1. Curriculum Management
- Quản lý lộ trình học theo level (A1-C2)
- Tổ chức theo units và lessons
- Định nghĩa prerequisites

### 2. Lesson Delivery
- Cung cấp nội dung bài học
- Bài tập tương tác
- AI-generated content

### 3. Progress Tracking
- Theo dõi tiến độ từng lesson
- Tính điểm và completion rate
- Unlock lessons tiếp theo

### 4. AI Learning Assistant
- Giải thích khái niệm
- Tạo bài tập bổ sung
- Personalized feedback

## Cấu trúc

```
learning/
├── controllers/
│   └── learning.controller.js       # Xử lý HTTP requests
├── routes/
│   └── learning.routes.js           # Định nghĩa API endpoints
├── repositories/
│   └── learning.repository.js       # Database operations
├── services/
│   ├── learning.service.js          # Business logic
│   └── learningAI.service.js        # AI features
└── data/
    └── curriculum.data.js           # Curriculum definition
```

## API Endpoints

### GET /api/learning/curriculum
Lấy toàn bộ curriculum

**Query Parameters:**
- `level`: Lọc theo level (A1-C2)

### GET /api/learning/units/:unitId
Lấy chi tiết một unit

### GET /api/learning/lessons/:lessonId
Lấy chi tiết một lesson

### POST /api/learning/lessons/:lessonId/start
Bắt đầu một lesson

### POST /api/learning/lessons/:lessonId/complete
Hoàn thành lesson

**Request Body:**
```json
{
  "score": 85,
  "timeSpent": 1200,
  "answers": [...]
}
```

### GET /api/learning/progress
Lấy tiến độ học tập của user

### POST /api/learning/ai/explain
Giải thích khái niệm bằng AI

**Request Body:**
```json
{
  "concept": "present perfect tense",
  "context": "lesson content..."
}
```

### POST /api/learning/ai/generate-exercise
Tạo bài tập bổ sung

## Database Schema

### Bảng: learning_units
- `id`: Primary key
- `level`: Cấp độ (A1-C2)
- `order`: Thứ tự
- `title`: Tiêu đề
- `description`: Mô tả
- `created_at`: Thời gian tạo

### Bảng: learning_lessons
- `id`: Primary key
- `unit_id`: ID unit
- `order`: Thứ tự trong unit
- `title`: Tiêu đề
- `content`: Nội dung (JSON)
- `exercises`: Bài tập (JSON)
- `prerequisites`: Lesson cần hoàn thành trước
- `estimated_time`: Thời gian ước tính (phút)
- `created_at`: Thời gian tạo

### Bảng: user_lesson_progress
- `id`: Primary key
- `user_id`: ID người dùng
- `lesson_id`: ID lesson
- `status`: Trạng thái (not_started, in_progress, completed)
- `score`: Điểm số
- `time_spent`: Thời gian học (giây)
- `attempts`: Số lần thử
- `completed_at`: Thời gian hoàn thành
- `created_at`: Thời gian bắt đầu
- `updated_at`: Thời gian cập nhật

## Curriculum Structure

```javascript
{
  "A1": {
    "units": [
      {
        "id": 1,
        "title": "Basic Greetings",
        "lessons": [
          {
            "id": 1,
            "title": "Hello and Goodbye",
            "content": {...},
            "exercises": [...]
          }
        ]
      }
    ]
  }
}
```

## Lesson Content Format

```json
{
  "sections": [
    {
      "type": "explanation",
      "content": "Present simple is used for..."
    },
    {
      "type": "example",
      "sentences": [
        "I work every day.",
        "She likes coffee."
      ]
    },
    {
      "type": "exercise",
      "questions": [...]
    }
  ]
}
```

## AI Features

### Concept Explanation
- Giải thích ngữ pháp
- Đưa ra ví dụ
- So sánh với tiếng Việt

### Exercise Generation
- Tạo câu hỏi mới
- Điều chỉnh độ khó
- Đa dạng dạng bài

### Personalized Feedback
- Phân tích lỗi
- Gợi ý cải thiện
- Động viên học viên

## Tích hợp

### Vocabulary Module
- Từ vựng trong bài học
- Gợi ý từ liên quan

### Analytics Module
- Theo dõi lỗi phổ biến
- Phân tích điểm yếu

### Usage Module
- Tracking thời gian học
- Tính toán chi phí AI

## Sử dụng

```javascript
import learningService from './services/learning.service.js';

// Lấy curriculum
const curriculum = await learningService.getCurriculum('A1');

// Bắt đầu lesson
await learningService.startLesson(userId, lessonId);

// Hoàn thành lesson
await learningService.completeLesson(userId, lessonId, {
  score: 85,
  timeSpent: 1200
});

// Lấy tiến độ
const progress = await learningService.getUserProgress(userId);
```

## Cải tiến trong tương lai
- Adaptive learning path
- Gamification elements
- Peer learning features
- Video lessons
- Live tutoring integration
