# Hướng Dẫn Sử Dụng Hệ Thống Chọn Thuật Toán Tự Động

## Tổng Quan

Hệ thống chatbot hiện đã được nâng cấp với tính năng tự động chọn thuật toán xử lý câu hỏi phù hợp nhất. Thay vì phải chỉ định thủ công mode, hệ thống sẽ phân tích câu hỏi và tự động chọn thuật toán tối ưu.

## Các Thuật Toán Có Sẵn

### 1. RAG + Chunk (embedding)
- **Khi sử dụng**: Câu hỏi liên quan đến kiến thức đã học nhưng không có nhiều từ khóa trực tiếp
- **Hoạt động**: Sử dụng embedding vector để tìm kiếm chunks liên quan nhất
- **Ưu điểm**: Có thể tìm được nội dung tương tự ngữ nghĩa dù không trùng từ khóa

### 2. Score Context (context)
- **Khi sử dụng**: Câu hỏi có nhiều từ khóa quan trọng trùng với kiến thức đã học
- **Hoạt động**: Tính điểm dựa trên từ khóa, tiêu đề, và độ liên quan
- **Ưu điểm**: Nhanh và chính xác khi có từ khóa rõ ràng

### 3. Direct Mode (direct)
- **Khi sử dụng**: Câu hỏi trò chuyện hoặc không liên quan đến kiến thức đã học
- **Hoạt động**: Sử dụng AI trực tiếp với lịch sử hội thoại
- **Ưu điểm**: Linh hoạt cho câu hỏi chung, trò chuyện

## Cách Sử Dụng

### API Chat Với Chế Độ Tự Động (Khuyến Nghị)

```javascript
// Không cần chỉ định mode - hệ thống tự chọn
const response = await fetch('/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Học máy là gì?"
  })
});

const data = await response.json();
console.log(data.reply); // Câu trả lời
console.log(data.algorithmUsed); // "context" | "embedding" | "direct"
console.log(data.autoSelected); // true
console.log(data.confidence); // 0.85
console.log(data.reason); // "Tìm thấy 3 từ khóa quan trọng, dùng score context"
```

### API Chat Với Chế Độ Thủ Công

```javascript
// Chỉ định mode cụ thể
const response = await fetch('/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Học máy là gì?",
    mode: "embedding" // Bắt buộc dùng RAG
  })
});
```

## API Thống Kê và Giám Sát

### 1. Xem Thống Kê Thuật Toán
```javascript
GET /algorithm/stats
```

Trả về:
```json
{
  "overall": [
    {
      "selected_algorithm": "context",
      "usage_count": 45,
      "avg_confidence": 0.82,
      "avg_relevance_score": 7.2
    }
  ],
  "byQuestionType": [...],
  "byTime": [...]
}
```

### 2. Xem Lịch Sử Chọn Thuật Toán
```javascript
GET /algorithm/history?limit=20
// Cần đăng nhập
```

### 3. Test Thuật Toán Sẽ Được Chọn
```javascript
POST /algorithm/test
{
  "question": "Machine learning algorithms là gì?"
}
```

Trả về:
```json
{
  "selectedAlgorithm": "context",
  "confidence": 0.85,
  "reason": "Tìm thấy 2 từ khóa quan trọng, dùng score context",
  "analysis": {
    "relevance": {
      "relevanceScore": 8,
      "matchedKeywords": ["machine learning", "algorithms"],
      "isKnowledgeRelated": true
    },
    "category": {
      "type": "definition",
      "complexity": "medium"
    }
  }
}
```

## Logic Ra Quyết Định

### Quy Trình Tự Động
1. **Phân tích câu hỏi**: Xác định loại, độ phức tạp, từ khóa
2. **Tính điểm liên quan**: So sánh với kiến thức đã có
3. **Chọn thuật toán**:
   - Nếu là câu trò chuyện → `direct`
   - Nếu có nhiều từ khóa trùng (>2) → `context`
   - Nếu liên quan nhưng ít từ khóa → `embedding`
   - Nếu không liên quan → `direct`

### Các Yếu Tố Đánh Giá
- **Từ khóa quan trọng**: So sánh với danh sách từ khóa đã định nghĩa
- **Tiêu đề chủ đề**: Tương đồng với các tiêu đề kiến thức
- **Loại câu hỏi**: Định nghĩa, giải thích, so sánh, trò chuyện...
- **Độ phức tạp**: Dựa trên độ dài và cấu trúc câu

## Tối Ưu Hóa

### Cải Thiện Độ Chính Xác
1. **Cập nhật từ khóa quan trọng**: Thêm từ khóa mới vào bảng `important_keywords`
2. **Điều chỉnh threshold**: Sửa điểm số trong `algorithmSelector.js`
3. **Phân tích log**: Xem thống kê để tìm pattern

### Monitoring
- Theo dõi thống kê qua `/algorithm/stats`
- Kiểm tra confidence score trung bình
- Phân tích câu hỏi được chọn sai thuật toán

## Lưu Ý Kỹ Thuật

- Tất cả quyết định được log trong bảng `algorithm_selections`
- Hệ thống fallback về `direct` mode nếu có lỗi
- API tương thích ngược - có thể vẫn chỉ định mode thủ công
- Response luôn có thông tin về thuật toán được sử dụng