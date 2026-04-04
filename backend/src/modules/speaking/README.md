# Module Speaking

## Mục đích
Module Speaking cung cấp bài tập luyện nói tiếng Anh với đánh giá phát âm, ngữ điệu và độ trưng bày bằng Azure Speech Service và AI.

## Chức năng chính

### 1. Pronunciation Assessment
- Đánh giá phát âm từng âm tiết
- Phân tích accuracy, fluency, completeness
- Tích hợp Azure Speech Service

### 2. Speaking Topics
- Quản lý chủ đề nói
- Phân loại theo level
- Gợi ý câu trả lời mẫu

### 3. Recording & Submission
- Ghi âm trực tiếp
- Upload file audio
- Tự động transcribe

### 4. AI Feedback
- Đánh giá nội dung
- Gợi ý cải thiện
- So sánh với native speaker

## Cấu trúc

```
speaking/
├── controllers/
│   └── speaking.controller.js       # Xử lý HTTP requests
├── routes/
│   └── speaking.routes.js           # Định nghĩa API endpoints
├── repositories/
│   └── speaking.repository.js       # Database operations
└── services/
    ├── speaking.service.js          # Business logic
    ├── speakingAI.service.js        # AI features
    └── azureSpeech.service.js       # Azure integration
```

## API Endpoints

### GET /api/speaking/topics
Lấy danh sách chủ đề

### GET /api/speaking/topics/:id
Lấy chi tiết chủ đề

### POST /api/speaking/assess
Đánh giá phát âm

**Request Body:**
```json
{
  "audioUrl": "https://...",
  "referenceText": "Hello, how are you?"
}
```

### POST /api/speaking/submit
Nộp bài nói

### GET /api/speaking/submissions
Lấy lịch sử

## Database Schema

### Bảng: speaking_topics
- `id`: Primary key
- `title`: Tiêu đề
- `prompt`: Câu hỏi/yêu cầu
- `level`: Cấp độ
- `sample_answer`: Câu trả lời mẫu
- `created_at`: Thời gian tạo

### Bảng: speaking_submissions
- `id`: Primary key
- `user_id`: ID người dùng
- `topic_id`: ID chủ đề
- `audio_url`: Link file audio
- `transcript`: Nội dung transcribe
- `pronunciation_score`: Điểm phát âm
- `fluency_score`: Điểm trôi chảy
- `score_total`: Tổng điểm
- `feedback`: Phản hồi AI (JSON)
- `created_at`: Thời gian nộp

## Azure Speech Integration

### Pronunciation Assessment
```javascript
const result = await azureSpeechService.assessPronunciation(
  audioBuffer,
  referenceText,
  language
);
```

## Cải tiến trong tương lai
- Real-time feedback
- Conversation practice
- Accent training
- Voice cloning for practice
