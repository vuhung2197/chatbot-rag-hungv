# Module Vocabulary

## Mục đích
Module Vocabulary quản lý từ vựng của người dùng, hỗ trợ học và ôn tập từ vựng với hệ thống spaced repetition.

## Chức năng chính

### 1. Quản lý Từ vựng
- Thêm từ vựng từ hệ thống vào danh sách cá nhân
- Tạo từ vựng tùy chỉnh
- Xóa từ vựng
- Phân loại theo level và topic

### 2. Spaced Repetition System (SRS)
- Tính toán thời gian ôn tập tiếp theo
- Cập nhật mastery level dựa trên kết quả
- Lấy danh sách từ cần ôn tập

### 3. Gợi ý Từ vựng
- Gợi ý từ mới dựa trên level
- Gợi ý từ liên quan đến topic đang học
- Từ vựng phổ biến theo CEFR

### 4. Thống kê
- Tổng số từ đã học
- Số từ theo mastery level
- Tiến độ học tập

## Cấu trúc

```
vocabulary/
├── controllers/
│   └── vocabulary.controller.js    # Xử lý HTTP requests
├── routes/
│   └── vocabulary.routes.js        # Định nghĩa API endpoints
├── repositories/
│   └── vocabulary.repository.js    # Database operations
└── services/
    └── vocabulary.service.js       # Business logic
```

## API Endpoints

### GET /api/vocabulary/system
Lấy danh sách từ vựng hệ thống

**Query Parameters:**
- `level`: Lọc theo level (A1, A2, B1, B2, C1, C2)
- `topic`: Lọc theo chủ đề

### POST /api/vocabulary/add
Thêm từ vựng hệ thống vào danh sách cá nhân

**Request Body:**
```json
{
  "wordId": 123
}
```

### POST /api/vocabulary/add-multiple
Thêm nhiều từ cùng lúc

**Request Body:**
```json
{
  "wordIds": [123, 456, 789]
}
```

### GET /api/vocabulary/my
Lấy danh sách từ vựng cá nhân

**Query Parameters:**
- `itemType`: vocabulary hoặc phrase
- `topic`: Lọc theo chủ đề

**Response:**
```json
{
  "words": [...],
  "stats": {
    "total": 150,
    "mastered": 50,
    "learning": 80,
    "new": 20
  }
}
```

### GET /api/vocabulary/review
Lấy danh sách từ cần ôn tập

### GET /api/vocabulary/topics
Lấy danh sách topics

### POST /api/vocabulary/mastery
Cập nhật mastery sau khi ôn tập

**Request Body:**
```json
{
  "wordId": 123,
  "isCorrect": true
}
```

### GET /api/vocabulary/recommend
Gợi ý từ mới

**Query Parameters:**
- `count`: Số lượng từ gợi ý (mặc định: 5)

## Database Schema

### Bảng: system_vocabulary
- `id`: Primary key
- `word`: Từ vựng
- `definition`: Định nghĩa (tiếng Anh)
- `translation`: Dịch nghĩa (tiếng Việt)
- `pronunciation`: Phiên âm IPA
- `level`: Cấp độ (A1-C2)
- `topic`: Chủ đề
- `example_sentence`: Câu ví dụ
- `audio_url`: Link file audio
- `created_at`: Thời gian tạo

### Bảng: user_vocabulary
- `id`: Primary key
- `user_id`: ID người dùng
- `word_id`: ID từ vựng (nếu từ hệ thống)
- `word`: Từ vựng (nếu tự tạo)
- `definition`: Định nghĩa
- `translation`: Dịch nghĩa
- `level`: Cấp độ
- `topic`: Chủ đề
- `mastery`: Độ thành thạo (0-5)
- `review_count`: Số lần ôn tập
- `next_review_at`: Thời gian ôn tập tiếp theo
- `created_at`: Thời gian thêm
- `updated_at`: Thời gian cập nhật

## Spaced Repetition Algorithm

### Mastery Levels
- **0**: Chưa học (New)
- **1**: Mới gặp (Just learned)
- **2**: Đang học (Learning)
- **3**: Quen thuộc (Familiar)
- **4**: Thành thạo (Proficient)
- **5**: Thuộc lòng (Mastered)

### Review Intervals
```javascript
const intervals = {
  0: 0,           // Ngay lập tức
  1: 1,           // 1 ngày
  2: 3,           // 3 ngày
  3: 7,           // 1 tuần
  4: 14,          // 2 tuần
  5: 30           // 1 tháng
};
```

### Update Logic
- **Correct answer**: mastery + 1, interval tăng
- **Wrong answer**: mastery - 1, interval reset về 1 ngày

## Tích hợp

### Learning Module
- Cung cấp từ vựng cho bài học
- Theo dõi tiến độ học từ

### Analytics Module
- Ghi nhận lỗi từ vựng
- Phân tích điểm yếu

### Chat Module
- Giải thích từ vựng
- Tạo câu ví dụ

## Sử dụng

```javascript
import vocabularyService from './services/vocabulary.service.js';

// Lấy từ vựng hệ thống
const systemWords = await vocabularyService.getSystemVocabulary(userId, 'B1');

// Thêm từ vào danh sách cá nhân
await vocabularyService.addSystemWordToUser(userId, wordId);

// Lấy từ cần ôn tập
const reviewWords = await vocabularyService.getWordsDueForReview(userId);

// Cập nhật mastery
await vocabularyService.updateMastery(userId, wordId, true);
```

## Cải tiến trong tương lai
- Flashcard game
- Pronunciation practice
- Context-based learning
- AI-generated examples
- Collaborative word lists
- Import từ Anki/Quizlet
