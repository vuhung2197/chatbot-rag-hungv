# PHÂN TÍCH CHI TIẾT - ANALYTICS SERVICE

## Tổng quan
File: `analytics.service.js`

Service này quản lý việc ghi nhận và phân tích lỗi của người dùng trong quá trình học tập.

---

## Class: AnalyticsService

### 1. logMistake(data)

**Mục đích**: Ghi nhận một lỗi của người dùng vào database

**Parameters**:
```javascript
{
  userId: number,           // ID người dùng (bắt buộc)
  sourceModule: string,     // Module phát sinh lỗi: 'speaking', 'writing', 'listening', etc. (bắt buộc)
  errorCategory: string,    // Loại lỗi: 'pronunciation', 'grammar', 'vocabulary' (bắt buộc)
  errorDetail: string,      // Chi tiết lỗi cụ thể: 'phoneme_th', 'present_perfect' (bắt buộc)
  contextText: string,      // Văn bản chứa lỗi (tùy chọn)
  sessionId: number         // ID phiên học liên quan (tùy chọn)
}
```

**Returns**: `Promise<Object>` - Bản ghi lỗi vừa được insert

**Logic xử lý**:
1. Validate các trường bắt buộc (userId, sourceModule, errorCategory, errorDetail)
2. Nếu thiếu trường bắt buộc → throw Error
3. Insert vào bảng `user_mistake_logs` với các giá trị
4. Return bản ghi vừa tạo (sử dụng RETURNING *)

**SQL Query**:
```sql
INSERT INTO user_mistake_logs (
  user_id, source_module, error_category, error_detail, context_text, session_id
) VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;
```

**Ví dụ sử dụng**:
```javascript
await analyticsService.logMistake({
  userId: 123,
  sourceModule: 'speaking',
  errorCategory: 'pronunciation',
  errorDetail: 'phoneme_th',
  contextText: 'I think this is good',
  sessionId: 456
});
```

**Use cases**:
- Gọi từ Speaking module khi phát hiện lỗi phát âm
- Gọi từ Writing module khi phát hiện lỗi ngữ pháp
- Gọi từ các module khác khi cần track lỗi

---

### 2. getTopWeaknesses(userId, limit = 5, days = 30)

**Mục đích**: Lấy danh sách điểm yếu phổ biến nhất của người dùng trong khoảng thời gian

**Parameters**:
- `userId` (number): ID người dùng
- `limit` (number): Số lượng điểm yếu trả về (mặc định: 5)
- `days` (number): Khoảng thời gian phân tích tính từ hiện tại (mặc định: 30 ngày)

**Returns**: `Promise<Array>` - Danh sách điểm yếu với thống kê

**Return format**:
```javascript
[
  {
    error_category: 'pronunciation',
    error_detail: 'phoneme_th',
    error_count: 15,
    last_occurred: '2026-03-27T10:00:00Z'
  },
  ...
]
```

**Logic xử lý**:
1. Parse `days` thành integer an toàn (parseInt với fallback 30)
2. Query database với GROUP BY error_category, error_detail
3. Lọc theo userId và khoảng thời gian (NOW() - INTERVAL 'X days')
4. Đếm số lần xuất hiện của mỗi loại lỗi
5. Lấy thời gian lỗi cuối cùng (MAX(created_at))
6. Sắp xếp theo số lần xuất hiện giảm dần
7. Giới hạn kết quả theo `limit`

**SQL Query**:
```sql
SELECT
  error_category,
  error_detail,
  COUNT(*) as error_count,
  MAX(created_at) as last_occurred
FROM user_mistake_logs
WHERE user_id = $1
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY error_category, error_detail
ORDER BY error_count DESC
LIMIT $2;
```

**Lưu ý về Security**:
- Sử dụng string interpolation cho `days` vì đây là số được kiểm soát
- Đã có parseInt() để đảm bảo an toàn
- Không thể SQL injection vì days được parse thành integer

**Ví dụ sử dụng**:
```javascript
// Lấy top 5 điểm yếu trong 30 ngày
const weaknesses = await analyticsService.getTopWeaknesses(123);

// Lấy top 10 điểm yếu trong 7 ngày
const recentWeaknesses = await analyticsService.getTopWeaknesses(123, 10, 7);
```

**Use cases**:
- Hiển thị dashboard điểm yếu cho người dùng
- Gợi ý bài tập dựa trên điểm yếu
- Tạo báo cáo tiến độ học tập

---

### 3. getRecentMistakes(userId, limit = 20)

**Mục đích**: Lấy lịch sử lỗi gần đây của người dùng

**Parameters**:
- `userId` (number): ID người dùng
- `limit` (number): Số lượng lỗi trả về (mặc định: 20)

**Returns**: `Promise<Array>` - Danh sách lỗi gần đây

**Return format**:
```javascript
[
  {
    id: 1,
    user_id: 123,
    source_module: 'speaking',
    error_category: 'pronunciation',
    error_detail: 'phoneme_th',
    context_text: 'I think this is good',
    session_id: 456,
    created_at: '2026-03-27T10:00:00Z'
  },
  ...
]
```

**Logic xử lý**:
1. Query tất cả lỗi của user
2. Sắp xếp theo thời gian tạo giảm dần (mới nhất trước)
3. Giới hạn kết quả theo `limit`

**SQL Query**:
```sql
SELECT *
FROM user_mistake_logs
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2;
```

**Ví dụ sử dụng**:
```javascript
// Lấy 20 lỗi gần nhất
const mistakes = await analyticsService.getRecentMistakes(123);

// Lấy 50 lỗi gần nhất
const moreMistakes = await analyticsService.getRecentMistakes(123, 50);
```

**Use cases**:
- Hiển thị lịch sử lỗi trong profile
- Review lại các lỗi đã mắc phải
- Phân tích xu hướng cải thiện

---

## Tích hợp với các Module khác

### Speaking Module
```javascript
// Sau khi đánh giá phát âm
if (pronunciationErrors.length > 0) {
  for (const error of pronunciationErrors) {
    await analyticsService.logMistake({
      userId,
      sourceModule: 'speaking',
      errorCategory: 'pronunciation',
      errorDetail: error.phoneme,
      contextText: error.word,
      sessionId: submissionId
    });
  }
}
```

### Writing Module
```javascript
// Sau khi chấm bài viết
if (grammarErrors.length > 0) {
  for (const error of grammarErrors) {
    await analyticsService.logMistake({
      userId,
      sourceModule: 'writing',
      errorCategory: 'grammar',
      errorDetail: error.type,
      contextText: error.sentence,
      sessionId: submissionId
    });
  }
}
```

---

## Best Practices

### 1. Error Logging
- Luôn log lỗi ngay sau khi phát hiện
- Cung cấp đầy đủ context để dễ phân tích
- Sử dụng try-catch để tránh ảnh hưởng flow chính

```javascript
try {
  await analyticsService.logMistake(errorData);
} catch (e) {
  console.error('Failed to log mistake:', e);
  // Không throw để không ảnh hưởng flow chính
}
```

### 2. Querying Analytics
- Sử dụng limit hợp lý để tránh query quá nhiều dữ liệu
- Cache kết quả nếu cần hiển thị nhiều lần
- Sử dụng pagination cho danh sách dài

### 3. Performance
- Index trên (user_id, created_at) để tăng tốc query
- Index trên (user_id, error_category, error_detail) cho getTopWeaknesses
- Cleanup dữ liệu cũ định kỳ (>1 năm)

---

## Cải tiến trong tương lai

1. **Aggregation Service**: Tính toán trước các thống kê phổ biến
2. **Real-time Analytics**: WebSocket để cập nhật real-time
3. **ML Integration**: Dự đoán lỗi tiềm ẩn dựa trên pattern
4. **Comparative Analytics**: So sánh với người dùng khác cùng level
5. **Export Reports**: Xuất báo cáo PDF/Excel về tiến độ

---

## Database Schema

```sql
CREATE TABLE user_mistake_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  source_module VARCHAR(50) NOT NULL,
  error_category VARCHAR(50) NOT NULL,
  error_detail VARCHAR(100) NOT NULL,
  context_text TEXT,
  session_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_user_created (user_id, created_at),
  INDEX idx_user_category (user_id, error_category, error_detail)
);
```
