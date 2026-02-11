# Tài liệu Module Subscription (Đăng ký gói)

## 1. Tổng quan
**Module Subscription** xử lý việc kiếm tiền và kiểm soát quyền truy cập tính năng của ứng dụng. Nó quản lý các gói đăng ký (Free, Pro, Team, Enterprise), xử lý việc nâng cấp thông qua hệ thống ví nội bộ và theo dõi chu kỳ thanh toán.

## 2. Các thành phần chính

### 2.1 Backend (`backend/src/modules/subscription`)
- **`SubscriptionService`**: Xử lý nâng cấp, hạ cấp và xác thực gọi dịch vụ.
- **Cơ sở dữ liệu**: `subscription_tiers` (các gói), `user_subscriptions` (đăng ký của user).

### 2.2 Frontend (`frontend/src/features/subscription`)
- **`SubscriptionPlans.js`**: Hiển thị các gói giá và tính năng khả dụng.
- **`BillingHistory.js`**: Hiển thị các hóa đơn trước đây và lịch sử thanh toán.
- **`SubscriptionStatus.js`**: Hiển thị chi tiết gói hiện tại và ngày gia hạn.

## 3. Phân tích kỹ thuật

### 3.1 Quản lý Gói (Tier Management)
Các gói được lưu trong CSDB với các tính năng có thể cấu hình:
- `price_monthly` / `price_yearly`: Giá cước.
- `features`: Đối tượng JSON định nghĩa các công tắc bật/tắt tính năng (ví dụ: `advanced_rag: true`).
- `max_file_size_mb`: Giới hạn dung lượng file upload.

### 3.2 Luồng Nâng cấp (`upgradeSubscription`)
Đây là một hoạt động giao dịch quan trọng:
1.  **Xác thực**: Kiểm tra xem gói mục tiêu có tồn tại không và người dùng có đủ số dư trong `user_wallet` không.
2.  **Chuyển đổi tiền tệ**: Chuyển đổi giá gói (USD) sang tiền tệ của ví người dùng nếu cần thiết.
3.  **Giao dịch (Transaction)**:
    - Khóa dòng ví (`FOR UPDATE`).
    - Trừ tiền.
    - Ghi lại `wallet_transaction`.
    - Cập nhật/Chèn bản ghi `user_subscription`.
    - Commit giao dịch.

## 4. Hướng dẫn sử dụng

### Lấy gói hiện tại
```javascript
const plan = await subscriptionService.getCurrentSubscription(userId);
if (plan.isFree) {
    // Hiển thị lời nhắc nâng cấp
}
```

### Nâng cấp gói
```javascript
try {
    await subscriptionService.upgradeSubscription(userId, 'pro', 'monthly');
} catch (error) {
    // Xử lý lỗi "Số dư không đủ"
}
```
