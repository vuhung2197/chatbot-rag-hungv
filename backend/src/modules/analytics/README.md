# Module Analytics

## Mục đích
Module Analytics theo dõi và phân tích lỗi của người dùng trong quá trình học tiếng Anh, giúp xác định điểm yếu và cải thiện trải nghiệm học tập.

## Chức năng chính

### 1. Ghi nhận lỗi (Log Mistakes)
- Lưu trữ các lỗi của người dùng từ các module khác nhau
- Phân loại lỗi theo category và detail
- Lưu context của lỗi để phân tích sau

### 2. Phân tích điểm yếu (Top Weaknesses)
- Thống kê các lỗi phổ biến nhất của người dùng
- Lọc theo khoảng thời gian (mặc định 30 ngày)
- Sắp xếp theo tần suất xuất hiện

### 3. Lịch sử lỗi (Recent Mistakes)
- Xem danh sách lỗi gần đây
- Hỗ trợ phân trang với limit tùy chỉnh

## Cấu trúc

```
analytics/
├── controllers/
│   └── analytics.controller.js    # Xử lý HTTP requests
├── routes/
│   └── analytics.routes.js        # Định nghĩa API endpoints
└── services/
    └── analytics.service.js       # Business logic
```

## API Endpoints

### POST /api/analytics/mistakes
Ghi nhận một lỗi mới của người dùng

**Request Body:**
```json
{
  "userId": 1,
  "sourceModule": "speaking",
  "errorCategory": "pronunciation",
  "errorDetail": "phoneme_th",
  "contextText": "I think this is good",
  "sessionId": 123
}
```

### GET /api/analytics/weaknesses/:userId
Lấy danh sách điểm yếu của người dùng

**Query Parameters:**
- `limit`: Số lượng kết quả (mặc định: 5)
- `days`: Khoảng thời gian phân tích (mặc định: 30)

### GET /api/analytics/mistakes/:userId
Lấy lịch sử lỗi gần đây

**Query Parameters:**
- `limit`: Số lượng kết quả (mặc định: 20)

## Database Schema

### Bảng: user_mistake_logs
- `id`: Primary key
- `user_id`: ID người dùng
- `source_module`: Module phát sinh lỗi (speaking, writing, etc.)
- `error_category`: Loại lỗi (pronunciation, grammar, vocabulary)
- `error_detail`: Chi tiết lỗi cụ thể
- `context_text`: Văn bản chứa lỗi
- `session_id`: ID phiên học (nếu có)
- `created_at`: Thời gian ghi nhận

## Tích hợp với các module khác

Module Analytics nhận dữ liệu từ:
- **Speaking**: Lỗi phát âm, ngữ điệu
- **Writing**: Lỗi ngữ pháp, từ vựng
- **Listening**: Lỗi nghe hiểu
- **Reading**: Lỗi đọc hiểu
- **Vocabulary**: Lỗi ghi nhớ từ vựng

## Sử dụng

```javascript
import analyticsService from './services/analytics.service.js';

// Ghi nhận lỗi
await analyticsService.logMistake({
  userId: 1,
  sourceModule: 'speaking',
  errorCategory: 'pronunciation',
  errorDetail: 'phoneme_th'
});

// Lấy điểm yếu
const weaknesses = await analyticsService.getTopWeaknesses(1, 5, 30);

// Lấy lịch sử lỗi
const history = await analyticsService.getRecentMistakes(1, 20);
```

## Cải tiến trong tương lai
- Thêm machine learning để dự đoán lỗi tiềm ẩn
- Tạo báo cáo chi tiết theo tuần/tháng
- Gợi ý bài tập dựa trên điểm yếu
- Visualize dữ liệu phân tích
