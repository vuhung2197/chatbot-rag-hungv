# Tài liệu Module Usage (Sử dụng)

## 1. Tổng quan
**Module Usage** theo dõi hoạt động của người dùng (truy vấn, tải lên, token) để thực thi các giới hạn của gói đăng ký và cung cấp số liệu thống kê.

## 2. Các thành phần chính

### 2.1 Backend (`backend/src/modules/usage`)
- **`UsageService`**: Theo dõi số lượng và kiểm tra giới hạn.
- **Cơ sở dữ liệu**: `user_usage` (thống kê hàng ngày).

### 2.2 Frontend (`frontend/src/features/user`)
- **`UsageDashboard.js`**: Giao diện chính cho thống kê sử dụng.
- **`UsageChart.js`**: Biểu đồ trực quan hóa mức sử dụng theo thời gian.
- **`UsageCounter.js`**: Hiển thị đơn giản về số tín dụng/giới hạn còn lại.

## 3. Phân tích kỹ thuật

### 3.1 Thực thi giới hạn (`getSubscriptionLimits`)
Lấy gói đăng ký hiện tại của người dùng và trả về đối tượng giới hạn hợp nhất:
```json
{
    "queries_per_day": 50,
    "file_size_mb": 10,
    "advanced_rag": true,
    "chat_history_days": 30
}
```

### 3.2 Theo dõi sử dụng (`trackUsage`, `incrementUsage`)
- **Độ chi tiết**: Hàng ngày.
- **Logic Upsert**: Kiểm tra xem đã có dòng cho `(user_id, today)` chưa. Nếu có, tăng biến đếm; nếu không, chèn mới.
- **Loại chỉ số**:
    - `query`: Chat tiêu chuẩn.
    - `advanced_rag`: Truy vấn phức tạp sử dụng RAG.
    - `tokens`: Mức tiêu thụ token LLM.

### 3.3 Đếm Web Search (`getWebSearchCount`)
Chức năng đặc biệt để đếm số lượng truy vấn sử dụng tìm kiếm Web trong ngày (dành cho Rate Limiting).
- **Mục đích**: Giới hạn số lần tìm kiếm Google/Tavily của người dùng Free (ví dụ: 5 lần/ngày) vì chi phí API cao.
- **Cách hoạt động**:
    - Truy vấn bảng `user_questions`.
    - Lọc theo `user_id` và ngày hiện tại (`today`).
    - **Kiểm tra Metadata**: Quét cột `metadata` để tìm chuỗi `"source":"web_search"` (Tìm kiếm trực tiếp) hoặc `"source":"kb_fallback_web"` (RAG không tìm thấy -> Fallback sang Web).
    - **Fail Open**: Nếu truy vấn đếm bị lỗi, hàm trả về `0` để không chặn người dùng oan.

## 4. Hướng dẫn sử dụng

### Kiểm tra giới hạn
```javascript
const limits = await usageService.getSubscriptionLimits(userId);
const usage = await usageService.getUserUsage(userId, today);

if (usage.queries_count >= limits.queries_per_day) {
    throw new Error("Đã đạt giới hạn hàng ngày");
}
```

### Kiểm tra giới hạn Web Search
```javascript
const webSearchCount = await usageService.getWebSearchCount(userId);
if (tier === 'free' && webSearchCount >= 5) {
    throw new Error("Hết lượt tìm kiếm web hôm nay. Vui lòng nâng cấp.");
}
```
