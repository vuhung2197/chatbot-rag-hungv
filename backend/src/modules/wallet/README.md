# Module Wallet

## Mục đích
Module Wallet quản lý ví điện tử của người dùng, xử lý nạp tiền, rút tiền và tích hợp các cổng thanh toán (MoMo, VNPay).

## Chức năng chính

### 1. Quản lý Ví
- Xem số dư ví
- Lịch sử giao dịch
- Thống kê thu chi

### 2. Nạp tiền (Deposit)
- Tích hợp MoMo
- Tích hợp VNPay
- Xác thực giao dịch
- Webhook callback

### 3. Rút tiền (Withdrawal)
- Yêu cầu rút tiền
- Xác thực OTP
- Xử lý và duyệt

### 4. Payment Gateway
- Tạo payment URL
- Xử lý callback
- Verify signature

## Cấu trúc

```
wallet/
├── controllers/
│   ├── wallet.controller.js         # Quản lý ví
│   ├── deposit.controller.js        # Nạp tiền
│   ├── withdrawal.controller.js     # Rút tiền
│   └── gateways/
│       ├── payment.controller.js    # Gateway chung
│       ├── momo.controller.js       # MoMo integration
│       └── vnpay.controller.js      # VNPay integration
├── routes/
│   ├── wallet.routes.js
│   └── payment.routes.js
├── services/
│   └── wallet.service.js
└── wallet.constants.js              # Constants
```

## API Endpoints

### GET /api/wallet
Lấy thông tin ví

**Response:**
```json
{
  "balance": 100000,
  "currency": "VND",
  "status": "active"
}
```

### GET /api/wallet/transactions
Lấy lịch sử giao dịch

### POST /api/wallet/deposit
Tạo yêu cầu nạp tiền

**Request Body:**
```json
{
  "amount": 100000,
  "gateway": "momo"
}
```

**Response:**
```json
{
  "paymentUrl": "https://...",
  "transactionId": "TXN123"
}
```

### POST /api/wallet/deposit/callback
Webhook callback từ payment gateway

### POST /api/wallet/withdraw
Yêu cầu rút tiền

**Request Body:**
```json
{
  "amount": 50000,
  "bankAccount": "1234567890",
  "bankName": "Vietcombank"
}
```

### GET /api/wallet/withdrawals
Lấy danh sách yêu cầu rút tiền

## Database Schema

### Bảng: wallets
- `id`: Primary key
- `user_id`: ID người dùng (unique)
- `balance`: Số dư
- `currency`: Loại tiền tệ
- `status`: Trạng thái (active, locked)
- `created_at`: Thời gian tạo
- `updated_at`: Thời gian cập nhật

### Bảng: wallet_transactions
- `id`: Primary key
- `wallet_id`: ID ví
- `type`: Loại (deposit, withdrawal, payment)
- `amount`: Số tiền
- `status`: Trạng thái (pending, completed, failed)
- `gateway`: Cổng thanh toán
- `transaction_id`: ID giao dịch từ gateway
- `metadata`: Dữ liệu bổ sung (JSON)
- `created_at`: Thời gian tạo

### Bảng: withdrawal_requests
- `id`: Primary key
- `user_id`: ID người dùng
- `amount`: Số tiền
- `bank_account`: Số tài khoản
- `bank_name`: Tên ngân hàng
- `status`: Trạng thái (pending, approved, rejected)
- `processed_by`: Admin xử lý
- `processed_at`: Thời gian xử lý
- `created_at`: Thời gian tạo

## Payment Gateway Integration

### MoMo
```javascript
const momoPayment = {
  partnerCode: process.env.MOMO_PARTNER_CODE,
  accessKey: process.env.MOMO_ACCESS_KEY,
  secretKey: process.env.MOMO_SECRET_KEY,
  endpoint: 'https://test-payment.momo.vn/v2/gateway/api/create'
};
```

### VNPay
```javascript
const vnpayConfig = {
  tmnCode: process.env.VNPAY_TMN_CODE,
  hashSecret: process.env.VNPAY_HASH_SECRET,
  url: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'
};
```

## Security

### Transaction Verification
- Verify signature từ gateway
- Check transaction status
- Prevent double spending

### Withdrawal Security
- OTP verification
- Daily limit
- Admin approval required

## Constants

```javascript
export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

export const TRANSACTION_TYPE = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  PAYMENT: 'payment'
};
```

## Sử dụng

```javascript
import walletService from './services/wallet.service.js';

// Lấy số dư
const wallet = await walletService.getWallet(userId);

// Tạo deposit
const payment = await walletService.createDeposit(userId, {
  amount: 100000,
  gateway: 'momo'
});

// Xử lý callback
await walletService.handleCallback(transactionId, status);
```

## Cải tiến trong tương lai
- Multi-currency support
- Crypto payment
- Recurring payments
- Refund system
- Transaction dispute
