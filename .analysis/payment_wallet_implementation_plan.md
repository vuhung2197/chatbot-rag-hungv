# Phương Án Triển Khai: Hệ Thống Nạp Tiền & Ví Điện Tử

## 📋 Tổng Quan

### Mục tiêu
- Cho phép user nạp tiền vào ví (wallet)
- Sử dụng số dư ví để đăng ký gói subscription
- Thanh toán các tính năng trả phí (pay-per-use)
- Quản lý lịch sử giao dịch

### Luồng hoạt động chính
```
User → Nạp tiền → Ví điện tử → Sử dụng:
                                  ├─ Mua gói subscription
                                  ├─ Trả phí tính năng
                                  └─ Gia hạn tự động
```

---

## 🗄️ Database Schema

### 1. Bảng `user_wallets` - Ví điện tử
```sql
CREATE TABLE user_wallets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'USD',
  status ENUM('active', 'frozen', 'closed') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
);
```

### 2. Bảng `wallet_transactions` - Lịch sử giao dịch
```sql
CREATE TABLE wallet_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  wallet_id INT NOT NULL,
  user_id INT NOT NULL,
  type ENUM('deposit', 'withdrawal', 'purchase', 'refund', 'subscription') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  balance_before DECIMAL(10, 2) NOT NULL,
  balance_after DECIMAL(10, 2) NOT NULL,
  description TEXT,
  reference_type VARCHAR(50), -- 'subscription', 'feature', 'topup'
  reference_id INT,
  payment_method VARCHAR(50), -- 'stripe', 'paypal', 'momo', 'vnpay'
  payment_gateway_id VARCHAR(255), -- ID từ payment gateway
  status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (wallet_id) REFERENCES user_wallets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_wallet_id (wallet_id),
  INDEX idx_user_id (user_id),
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

### 3. Bảng `payment_methods` - Phương thức thanh toán
```sql
CREATE TABLE payment_methods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  provider VARCHAR(50) NOT NULL, -- 'stripe', 'paypal', 'momo', 'vnpay'
  is_active BOOLEAN DEFAULT TRUE,
  config JSON, -- API keys, webhooks, etc.
  supported_currencies JSON, -- ['USD', 'VND']
  min_amount DECIMAL(10, 2) DEFAULT 1.00,
  max_amount DECIMAL(10, 2) DEFAULT 10000.00,
  fee_percentage DECIMAL(5, 2) DEFAULT 0.00,
  fee_fixed DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 4. Cập nhật bảng `user_subscriptions`
```sql
ALTER TABLE user_subscriptions 
ADD COLUMN payment_source ENUM('wallet', 'card', 'external') DEFAULT 'wallet',
ADD COLUMN auto_renew BOOLEAN DEFAULT FALSE,
ADD COLUMN last_payment_transaction_id INT,
ADD FOREIGN KEY (last_payment_transaction_id) REFERENCES wallet_transactions(id);
```

---

## 🔧 Backend API Endpoints

### Wallet Management
```
GET    /api/wallet                    - Lấy thông tin ví
GET    /api/wallet/transactions       - Lịch sử giao dịch
POST   /api/wallet/deposit            - Nạp tiền
POST   /api/wallet/withdraw           - Rút tiền (nếu cần)
```

### Payment Methods
```
GET    /api/payment-methods           - Danh sách phương thức thanh toán
POST   /api/payment/create-intent     - Tạo payment intent
POST   /api/payment/confirm           - Xác nhận thanh toán
POST   /api/payment/webhook           - Webhook từ payment gateway
```

### Subscription với Wallet
```
POST   /api/subscription/purchase     - Mua gói bằng ví
POST   /api/subscription/auto-renew   - Bật/tắt gia hạn tự động
```

---

## 💳 Payment Gateway Integration

### Khuyến nghị cho thị trường Việt Nam

#### 1. **VNPay** (Ưu tiên cao)
- ✅ Phổ biến tại VN
- ✅ Hỗ trợ ATM, QR, ví điện tử
- ✅ Phí thấp (~1-2%)
- 📚 Docs: https://sandbox.vnpayment.vn/apis/

#### 2. **MoMo** (Ưu tiên cao)
- ✅ Ví điện tử phổ biến nhất VN
- ✅ QR code payment
- ✅ Tích hợp dễ
- 📚 Docs: https://developers.momo.vn/

#### 3. **Stripe** (Quốc tế)
- ✅ Hỗ trợ thẻ quốc tế
- ✅ API tốt nhất
- ⚠️ Phí cao (~2.9% + $0.30)
- 📚 Docs: https://stripe.com/docs

#### 4. **PayPal** (Quốc tế)
- ✅ Phổ biến toàn cầu
- ⚠️ Phí cao
- 📚 Docs: https://developer.paypal.com/

---

## 🔄 Luồng Nạp Tiền (Deposit Flow)

### Bước 1: User chọn nạp tiền
```javascript
// Frontend
const depositAmount = 100000; // VND
const paymentMethod = 'vnpay';

const response = await axios.post('/api/wallet/deposit', {
  amount: depositAmount,
  currency: 'VND',
  payment_method: paymentMethod
});

// Response: { payment_url, transaction_id }
window.location.href = response.data.payment_url;
```

### Bước 2: Backend tạo payment intent
```javascript
// Backend: controllers/walletController.js
async function createDeposit(req, res) {
  const { amount, currency, payment_method } = req.body;
  const userId = req.user.id;
  
  // 1. Validate amount
  if (amount < 10000) {
    return res.status(400).json({ message: 'Minimum 10,000 VND' });
  }
  
  // 2. Create pending transaction
  const transaction = await createTransaction({
    user_id: userId,
    type: 'deposit',
    amount,
    status: 'pending',
    payment_method
  });
  
  // 3. Create payment URL
  const paymentUrl = await createPaymentUrl(payment_method, {
    amount,
    transaction_id: transaction.id,
    return_url: `${FRONTEND_URL}/wallet/callback`
  });
  
  res.json({ payment_url: paymentUrl, transaction_id: transaction.id });
}
```

### Bước 3: Payment Gateway callback
```javascript
// Backend: controllers/paymentController.js
async function handleCallback(req, res) {
  const { transaction_id, status, gateway_id } = req.query;
  
  // 1. Verify signature from gateway
  if (!verifySignature(req.query)) {
    return res.status(400).json({ message: 'Invalid signature' });
  }
  
  // 2. Update transaction
  const transaction = await updateTransaction(transaction_id, {
    status: status === 'success' ? 'completed' : 'failed',
    payment_gateway_id: gateway_id
  });
  
  // 3. Update wallet balance if success
  if (status === 'success') {
    await updateWalletBalance(transaction.user_id, transaction.amount);
  }
  
  // 4. Redirect to frontend
  res.redirect(`${FRONTEND_URL}/wallet?status=${status}`);
}
```

---

## 🛒 Luồng Mua Gói Subscription

### Bước 1: User chọn gói
```javascript
// Frontend
const tier = 'pro';
const billingCycle = 'monthly';

const response = await axios.post('/api/subscription/purchase', {
  tier_name: tier,
  billing_cycle: billingCycle,
  payment_source: 'wallet' // hoặc 'card'
});
```

### Bước 2: Backend xử lý
```javascript
// Backend: controllers/subscriptionController.js
async function purchaseSubscription(req, res) {
  const { tier_name, billing_cycle, payment_source } = req.body;
  const userId = req.user.id;
  
  // 1. Get tier info
  const tier = await getTier(tier_name);
  const price = billing_cycle === 'yearly' ? tier.price_yearly : tier.price_monthly;
  
  // 2. Check wallet balance
  const wallet = await getWallet(userId);
  if (wallet.balance < price) {
    return res.status(400).json({ 
      message: 'Insufficient balance',
      required: price,
      current: wallet.balance
    });
  }
  
  // 3. Deduct from wallet
  const transaction = await createTransaction({
    user_id: userId,
    wallet_id: wallet.id,
    type: 'subscription',
    amount: -price,
    balance_before: wallet.balance,
    balance_after: wallet.balance - price,
    reference_type: 'subscription',
    status: 'completed'
  });
  
  await updateWalletBalance(userId, -price);
  
  // 4. Create/update subscription
  await createOrUpdateSubscription({
    user_id: userId,
    tier_id: tier.id,
    billing_cycle,
    payment_source: 'wallet',
    last_payment_transaction_id: transaction.id
  });
  
  res.json({ message: 'Subscription activated', transaction_id: transaction.id });
}
```

---

## 🎨 Frontend Components

### 1. Wallet Dashboard
```
┌─────────────────────────────────────┐
│  💰 Số dư ví: 250,000 VND          │
│  [Nạp tiền] [Lịch sử]              │
└─────────────────────────────────────┘
```

### 2. Deposit Modal
```
┌─────────────────────────────────────┐
│  Nạp tiền vào ví                    │
│  ─────────────────────────────────  │
│  Số tiền: [________] VND            │
│  Gợi ý: [50K] [100K] [500K] [1M]   │
│                                     │
│  Phương thức:                       │
│  ○ VNPay (ATM/QR)                   │
│  ○ MoMo                             │
│  ○ Thẻ quốc tế (Stripe)             │
│                                     │
│  [Hủy]  [Tiếp tục]                  │
└─────────────────────────────────────┘
```

### 3. Transaction History
```
┌─────────────────────────────────────┐
│  Lịch sử giao dịch                  │
│  ─────────────────────────────────  │
│  ↓ Nạp tiền      +100,000  19/01    │
│  ↑ Mua gói Pro   -99,900   18/01    │
│  ↓ Nạp tiền      +200,000  15/01    │
└─────────────────────────────────────┘
```

---

## 🔐 Security Considerations

### 1. Transaction Atomicity
```javascript
// Sử dụng database transaction
await db.transaction(async (trx) => {
  // 1. Lock wallet
  const wallet = await trx('user_wallets')
    .where('user_id', userId)
    .forUpdate()
    .first();
  
  // 2. Check balance
  if (wallet.balance < amount) {
    throw new Error('Insufficient balance');
  }
  
  // 3. Create transaction record
  await trx('wallet_transactions').insert({...});
  
  // 4. Update wallet balance
  await trx('user_wallets')
    .where('id', wallet.id)
    .update({ balance: wallet.balance - amount });
});
```

### 2. Payment Verification
- ✅ Verify signature từ payment gateway
- ✅ Check transaction status trước khi cộng tiền
- ✅ Prevent double-spending
- ✅ Log tất cả transactions

### 3. Rate Limiting
```javascript
// Giới hạn số lần nạp tiền
app.use('/api/wallet/deposit', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // 5 requests per 15 minutes
}));
```

---

## 📊 Reporting & Analytics

### Admin Dashboard cần có:
1. **Tổng quan tài chính**
   - Tổng tiền nạp hôm nay/tuần/tháng
   - Tổng tiền chi tiêu
   - Revenue từ subscriptions

2. **Transaction monitoring**
   - Pending transactions
   - Failed transactions
   - Refund requests

3. **User wallet status**
   - Top users by balance
   - Users with low balance
   - Suspicious activities

---

## 🚀 Implementation Phases

### Phase 1: Core Wallet (1-2 tuần)
- [ ] Database schema
- [ ] Wallet CRUD APIs
- [ ] Transaction logging
- [ ] Basic frontend UI

### Phase 2: Payment Integration (2-3 tuần)
- [ ] VNPay integration
- [ ] MoMo integration
- [ ] Webhook handlers
- [ ] Payment verification

### Phase 3: Subscription Integration (1 tuần)
- [ ] Purchase with wallet
- [ ] Auto-renewal
- [ ] Refund logic

### Phase 4: Advanced Features (1-2 tuần)
- [ ] Stripe for international
- [ ] Withdrawal (nếu cần)
- [ ] Promotion codes
- [ ] Gift cards

---

## 💡 Best Practices

### 1. Luôn sử dụng DECIMAL cho tiền
```sql
-- ✅ GOOD
balance DECIMAL(10, 2)

-- ❌ BAD
balance FLOAT
```

### 2. Record balance before/after
```javascript
// Luôn lưu balance trước và sau transaction
{
  balance_before: 100.00,
  amount: -9.99,
  balance_after: 90.01
}
```

### 3. Idempotency
```javascript
// Sử dụng unique transaction ID để tránh duplicate
const transactionId = `${userId}_${Date.now()}_${randomString()}`;
```

### 4. Audit Trail
```javascript
// Log mọi thay đổi
await auditLog.create({
  user_id: userId,
  action: 'wallet_deposit',
  amount: 100000,
  ip_address: req.ip,
  user_agent: req.headers['user-agent']
});
```

---

## 📝 Testing Checklist

- [ ] Nạp tiền thành công
- [ ] Nạp tiền thất bại
- [ ] Mua subscription với đủ tiền
- [ ] Mua subscription với không đủ tiền
- [ ] Concurrent transactions (race condition)
- [ ] Payment gateway timeout
- [ ] Webhook retry logic
- [ ] Refund flow
- [ ] Auto-renewal
- [ ] Balance calculation accuracy

---

## 🎯 Next Steps

1. **Review phương án này** với team
2. **Chọn payment gateway** phù hợp (khuyến nghị: VNPay + MoMo)
3. **Đăng ký tài khoản sandbox** để test
4. **Implement Phase 1** (Core Wallet)
5. **Test thoroughly** trước khi lên production

---

**Tài liệu tham khảo:**
- VNPay: https://sandbox.vnpayment.vn/apis/
- MoMo: https://developers.momo.vn/
- Stripe: https://stripe.com/docs/payments
