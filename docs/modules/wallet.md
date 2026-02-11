# Tài liệu Module Wallet (Ví)

## 1. Tổng quan
**Module Wallet** cung cấp hệ thống tài chính toàn diện cho người dùng, cho phép họ nạp tiền, mua gói đăng ký và theo dõi lịch sử giao dịch. Module này hỗ trợ đa tiền tệ.

## 2. Các thành phần chính

### 2.1 Backend (`backend/src/modules/wallet`)
- **`WalletService`**: Quản lý số dư, quy đổi tiền tệ và ghi nhật ký giao dịch.
- **Cơ sở dữ liệu**: `user_wallets`, `wallet_transactions`.

### 2.2 Frontend (`frontend/src/features/wallet`)
- **`WalletDashboard.js`**: Giao diện chính hiển thị số dư và các hành động nhanh.
- **`DepositModal.js`**: Giao diện nạp tiền (giả lập cổng thanh toán hoặc thật).
- **`TransactionHistory.js`**: Danh sách giao dịch quá khứ kèm bộ lọc.
- **`CurrencySelector.js`**: Widget để chuyển đổi tiền tệ hiển thị/ví.

## 3. Phân tích kỹ thuật

### 3.1 Tính toàn vẹn dữ liệu
- **Kiểu ghi sổ kép (Double-Entry Style)**: Các giao dịch ghi lại cả `balance_before` (số dư trước) và `balance_after` (số dư sau) để đảm bảo khả năng kiểm toán.
- **Cập nhật giao dịch (Transactional Updates)**: Các cập nhật quan trọng sử dụng giao dịch cơ sở dữ liệu/khóa (`FOR UPDATE`) để ngăn chặn điều kiện đua (race conditions).

### 3.2 Xử lý Tiền tệ
- **Mặc định**: USD.
- **Quy đổi**: Hỗ trợ chuyển đổi tiền tệ. Hệ thống tính toán lại số dư dựa trên tỷ giá hối đoái được cung cấp bởi `CurrencyService`.
- **Kiểm toán**: Thay đổi tiền tệ được ghi lại như một loại giao dịch đặc biệt.

### 3.3 Các loại giao dịch
- `DEPOSIT`: Nạp tiền.
- `PURCHASE` / `SUBSCRIPTION`: Chi tiêu tiền.
- `REFUND`: Hoàn tiền.

## 4. Hướng dẫn sử dụng

### Lấy thông tin Ví
```javascript
// Tự động tạo ví nếu chưa có
const wallet = await walletService.getWalletOverview(userId);
```

### Lịch sử giao dịch
```javascript
const history = await walletService.getTransactions(userId, { 
    page: 1, 
    limit: 10, 
    type: 'deposit' 
});
```
