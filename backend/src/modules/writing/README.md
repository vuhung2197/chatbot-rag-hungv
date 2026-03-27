# Module Writing

## Mục đích
Module Writing cung cấp bài tập luyện viết tiếng Anh với đánh giá tự động bằng AI, bao gồm grammar, vocabulary, coherence và task achievement.

## Chức năng chính

### 1. Writing Exercises
- Quản lý bài tập viết
- Nhiều dạng: essay, email, report, story
- Phân loại theo level và topic

### 2. AI Grading
- Đánh giá grammar và spelling
- Phân tích vocabulary range
- Đánh giá coherence và cohesion
- Task achievement scoring

### 3. Detailed Feedback
- Highlight lỗi cụ thể
- Gợi ý sửa lỗi
- Alternative expressions
- Overall comments

### 4. Writing Prompts
- Tạo đề bài tự động
- Seed data cho exercises
- Customizable prompts

## Cấu trúc

```
writing/
├── controllers/
│   └── writing.controller.js        # Xử lý HTTP requests
├── routes/
│   └── writing.routes.js            # Định nghĩa API endpoints
├── repositories/
│   └── writing.repository.js        # Database operations
├── services/
│   ├── writing.service.js           # Business logic
│   ├── writingAI.service.js         # AI grading
│   └── writing.prompts.js           # Prompt templates
└── seeds/
    └── writing.seed.js              # Sample exercises
```

## API Endpoints

### GET /api/writing/exercises
Lấy danh sách bài tập

**Query Parameters:**
- `level`: Lọc theo level
- `type`: Lọc theo dạng bài

### GET /api/writing/exercises/:id
Lấy chi tiết bài tập

### POST /api/writing/submit
Nộp bài viết

**Request Body:**
```json
{
  "exerciseId": 123,
  "content": "My essay content..."
}
```

**Response:**
```json
{
  "scores": {
    "grammar": 8.5,
    "vocabulary": 7.0,
    "coherence": 8.0,
    "taskAchievement": 7.5,
    "overall": 7.75
  },
  "feedback": {
    "errors": [...],
    "suggestions": [...],
    "comments": "..."
  }
}
```

### GET /api/writing/submissions
Lấy lịch sử bài viết

## Database Schema

### Bảng: writing_exercises
- `id`: Primary key
- `title`: Tiêu đề
- `prompt`: Đề bài
- `type`: Dạng bài (essay, email, etc.)
- `level`: Cấp độ
- `word_limit`: Giới hạn số từ
- `time_limit`: Giới hạn thời gian (phút)
- `rubric`: Tiêu chí chấm điểm (JSON)
- `created_at`: Thời gian tạo

### Bảng: writing_submissions
- `id`: Primary key
- `user_id`: ID người dùng
- `exercise_id`: ID bài tập
- `content`: Nội dung bài viết
- `word_count`: Số từ
- `score_grammar`: Điểm ngữ pháp
- `score_vocabulary`: Điểm từ vựng
- `score_coherence`: Điểm mạch lạc
- `score_task`: Điểm hoàn thành yêu cầu
- `score_total`: Tổng điểm
- `feedback`: Phản hồi chi tiết (JSON)
- `time_spent`: Thời gian viết (giây)
- `created_at`: Thời gian nộp

## AI Grading Criteria

### Grammar (0-10)
- Sentence structure
- Verb tenses
- Subject-verb agreement
- Articles usage

### Vocabulary (0-10)
- Range and variety
- Appropriateness
- Collocations
- Academic/formal words

### Coherence & Cohesion (0-10)
- Logical flow
- Paragraph structure
- Linking words
- Topic sentences

### Task Achievement (0-10)
- Address all parts
- Relevant examples
- Clear position
- Adequate length

## Feedback Format

```json
{
  "errors": [
    {
      "type": "grammar",
      "text": "I am go to school",
      "suggestion": "I go to school",
      "explanation": "Use base form after 'do/does'"
    }
  ],
  "strengths": [
    "Good use of linking words",
    "Clear paragraph structure"
  ],
  "improvements": [
    "Try using more varied vocabulary",
    "Add more specific examples"
  ],
  "overallComment": "Well-structured essay with clear arguments..."
}
```

## Sử dụng

```javascript
import writingService from './services/writing.service.js';

// Lấy bài tập
const exercises = await writingService.getExercises('B2', 'essay');

// Nộp và chấm bài
const result = await writingService.submitAndGrade(userId, {
  exerciseId: 123,
  content: 'My essay...'
});
```

## Cải tiến trong tương lai
- Plagiarism detection
- Style analysis
- Peer review system
- Writing templates
- Progressive writing (draft → final)
