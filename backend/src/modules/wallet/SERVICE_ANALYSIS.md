# PHÂN TÍCH CHI TIẾT - WALLET SERVICE

## Tổng quan
File: `wallet.service.js`

Service này quản lý ví điện tử, giao dịch và tích hợp payment gateways (MoMo, VNPay).

---

## Class: WalletService

### 1. getWalletOverview(userId)

**Mục đích**: Lấy hoặc tạo ví cho người dùng

**Parameters**:
- `userId` (number): ID người dùng

**Returns**: `Promise<Object>` - Thông tin ví

**Return format**:
```javascript
{
  id: 1,
  user_id: 123,
  balance: 100000.00,
  currency: 'VND',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-03-27T10:00:00Z'
}
```

**Logic xử lý**:
1. Query ví của user từ `user_wallets`
2. Nếu không tồn tại:
   - Tạo ví mới với balance = 0
   - Currency = VND (default)
   - Status = active
   - Return ví mới tạo
3. Nếu tồn tại → return ví hiện có

**SQL Queries**:
```sql
-- Check existing wallet
SELECT id, user_id, balance, currency, status, created_at, updated_at
FROM user_wallets
WHERE user_id = ?

-- Create new wallet if not exists
INSERT INTO user_wallets (user_id, balance, currency, status)
VALUES (?, 0.00, 'VND', 'active')
RETURNING id
```

**Use cases**:
- Hiển thị số dư ví trong profile
- Check balance trước khi thanh toán
- Initialize ví cho user mới

---

### 2. getTransactions(userId, options)

**Mục đích**: Lấy lịch sử giao dịch với pagination

**Parameters**:
```javascript
{
  page: 1,           // Trang hiện tại (mặc định: 1)
  limit: 20,         // Số giao dịch mỗi trang (mặc định: 20, max: 100)
  type: null         // Lọc theo loại: 'deposit', 'withdrawal', 'payment'
}
```

**Returns**: `Promise<Object>` - Giao dịch và pagination info

**Return format**:
```javascript
{
  transactions: [
    {
      id: 1,
      wallet_id: 1,
      type: 'deposit',
      amount: 100000,
      balance_before: 0,
      balance_after: 100000,
      description: 'Nạp tiền qua MoMo',
      reference_type: 'momo_payment',
      reference_id: 'TXN123',
      payment_method: 'momo',
      payment_gateway_id: 'MOMO_TXN_456',
      status: 'completed',
      metadata: {...},
      created_at: '2026-03-27T10:00:00Z'
    },
    ...
  ],
  total: 150,
  page: 1,
  limit: 20,
  totalPages: 8
}
```

**Logic xử lý**:
1. Validate và normalize limit (min: 1, max: 100)
2. Tính offset = (page - 1) * limit
3. Build dynamic query với type filter (nếu có)
4. Query transactions với pagination
5. Query total count riêng
6. Tính totalPages = ceil(total / limit)
7. Return combined result

**SQL Queries**:
```sql
-- Get transactions
SELECT
  id, wallet_id, type, amount, balance_before, balance_after,
  description, reference_type, reference_id, payment_method,
  payment_gateway_id, status, metadata, created_at
FROM wallet_transactions
WHERE user_id = ?
  AND type = ?  -- nếu có filter
ORDER BY created_at DESC
LIMIT 20 OFFSET 0

-- Get total count
SELECT COUNT(*) as total
FROM wallet_transactions
WHERE user_id = ?
  AND type = ?  -- nếu có filter
```

**Pagination example**:
```javascript
// Page 1: offset = 0, limit = 20 → records 1-20
// Page 2: offset = 20, limit = 20 → records 21-40
// Page 3: offset = 40, limit = 20 → records 41-60
```

---

### 3. getWalletStats(userId)

**Mục đích**: Lấy thống kê tổng quan về ví

**Parameters**:
- `userId` (number): ID người dùng

**Returns**: `Promise<Object>` - Thống kê chi tiết

**Return format**:
```javascript
{
  balance: 100000,
  currency: 'VND',
  total_transactions: 50,
  total_deposits: 500000,
  total_spent: 400000,
  failed_deposit_amount: 50000,
  pending_deposit_amount: 100000,
  total_failed_deposits: 2,
  total_pending_deposits: 3,
  last_transaction_at: '2026-03-27T10:00:00Z'
}
```

**Logic xử lý**:
1. JOIN user_wallets với wallet_transactions
2. Sử dụng aggregate functions (COUNT, SUM, MAX)
3. CASE WHEN để tính toán theo điều kiện
4. GROUP BY wallet info
5. Nếu không có ví → return default values

**SQL Query**:
```sql
SELECT
  w.balance,
  w.currency,
  COUNT(DISTINCT wt.id) as total_transactions,
  SUM(CASE WHEN wt.type = 'deposit' AND wt.status = 'completed'
      THEN wt.amount ELSE 0 END) as total_deposits,
  SUM(CASE WHEN wt.type IN ('purchase', 'subscription') AND wt.status = 'completed'
      THEN ABS(wt.amount) ELSE 0 END) as total_spent,
  SUM(CASE WHEN wt.type = 'deposit' AND wt.status = 'failed'
      THEN wt.amount ELSE 0 END) as failed_deposit_amount,
  SUM(CASE WHEN wt.type = 'deposit' AND wt.status = 'pending'
      THEN wt.amount ELSE 0 END) as pending_deposit_amount,
  COUNT(CASE WHEN wt.type = 'deposit' AND wt.status = 'failed'
      THEN 1 END) as total_failed_deposits,
  COUNT(CASE WHEN wt.type = 'deposit' AND wt.status = 'pending'
      THEN 1 END) as total_pending_deposits,
  MAX(wt.created_at) as last_transaction_at
FROM user_wallets w
LEFT JOIN wallet_transactions wt ON w.id = wt.wallet_id
WHERE w.user_id = ?
GROUP BY w.id, w.balance, w.currency
```

**Giải thích CASE WHEN**:
- Tính tổng có điều kiện
- Ví dụ: chỉ tính deposit đã completed
- Tránh phải query nhiều lần

---

### 4. updateCurrency(userId, newCurrency)

**Mục đích**: Đổi loại tiền tệ của ví (VND ↔ USD)

**Parameters**:
- `userId` (number): ID người dùng
- `newCurrency` (string): Loại tiền mới ('VND', 'USD')

**Returns**: `Promise<Object>` - Kết quả update

**Return format**:
```javascript
{
  updated: true,
  wallet: {
    balance: 4.50,        // Số dư mới (đã convert)
    currency: 'USD',      // Tiền tệ mới
    oldBalance: 100000,   // Số dư cũ
    oldCurrency: 'VND'    // Tiền tệ cũ
  }
}
```

**Logic xử lý**:
1. Validate currency (check supported currencies)
2. Get wallet hiện tại
3. Nếu currency giống nhau → return unchanged
4. Convert balance: oldBalance * exchangeRate
5. Update wallet với currency và balance mới
6. Log transaction để audit trail
7. Return kết quả

**Currency Conversion**:
```javascript
// Ví dụ: VND → USD
oldBalance = 100000 VND
exchangeRate = 0.000045 (1 VND = 0.000045 USD)
newBalance = 100000 * 0.000045 = 4.50 USD
```

**SQL Queries**:
```sql
-- Update wallet
UPDATE user_wallets
SET currency = ?, balance = ?, updated_at = NOW()
WHERE id = ?

-- Log transaction
INSERT INTO wallet_transactions (
  wallet_id, user_id, type, amount,
  balance_before, balance_after,
  description, status, metadata
)
VALUES (?, ?, 'deposit', 0, ?, ?, ?, 'completed', ?)
```

**Metadata format**:
```javascript
{
  action: 'currency_change',
  old_currency: 'VND',
  new_currency: 'USD',
  old_balance: 100000,
  new_balance: 4.50,
  exchange_rate: 0.000045,
  changed_at: '2026-03-27T10:00:00Z'
}
```

**Use cases**:
- User muốn đổi sang USD để dễ tính
- Hỗ trợ multi-currency trong tương lai
- Audit trail cho mọi thay đổi

---

## Transaction Types

### TRANSACTION_TYPE Constants
```javascript
const TRANSACTION_TYPE = {
  DEPOSIT: 'deposit',           // Nạp tiền
  WITHDRAWAL: 'withdrawal',     // Rút tiền
  PURCHASE: 'purchase',         // Mua hàng
  SUBSCRIPTION: 'subscription', // Đăng ký gói
  REFUND: 'refund',            // Hoàn tiền
  TRANSFER: 'transfer'         // Chuyển khoản
};
```

### TRANSACTION_STATUS Constants
```javascript
const TRANSACTION_STATUS = {
  PENDING: 'pending',       // Đang xử lý
  COMPLETED: 'completed',   // Hoàn thành
  FAILED: 'failed',         // Thất bại
  CANCELLED: 'cancelled'    // Đã hủy
};
```

### WALLET_STATUS Constants
```javascript
const WALLET_STATUS = {
  ACTIVE: 'active',     // Hoạt động bình thường
  LOCKED: 'locked',     // Bị khóa (vi phạm)
  SUSPENDED: 'suspended' // Tạm ngưng
};
```

---

## Payment Gateway Integration

### MoMo Flow
```
1. User request deposit
2. Create payment URL with MoMo API
3. User redirects to MoMo
4. User completes payment
5. MoMo callback to webhook
6. Verify signature
7. Update wallet balance
8. Update transaction status
```

### VNPay Flow
```
1. User request deposit
2. Create payment URL with VNPay API
3. User redirects to VNPay
4. User completes payment
5. VNPay callback to webhook
6. Verify hash
7. Update wallet balance
8. Update transaction status
```

---

## Security Considerations

### 1. Transaction Atomicity
```javascript
// Sử dụng database transaction
const connection = await pool.getConnection();
await connection.beginTransaction();

try {
  // Lock wallet row
  await connection.execute(
    'SELECT * FROM user_wallets WHERE id = ? FOR UPDATE',
    [walletId]
  );

  // Update balance
  await connection.execute(
    'UPDATE user_wallets SET balance = ? WHERE id = ?',
    [newBalance, walletId]
  );

  // Create transaction record
  await connection.execute(
    'INSERT INTO wallet_transactions (...) VALUES (...)',
    [...]
  );

  await connection.commit();
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
}
```

### 2. Balance Validation
```javascript
// Luôn check balance trước khi trừ tiền
if (wallet.balance < amount) {
  throw new Error('Insufficient balance');
}
```

### 3. Signature Verification
```javascript
// Verify MoMo signature
const rawSignature = `...`;
const signature = crypto
  .createHmac('sha256', secretKey)
  .update(rawSignature)
  .digest('hex');

if (signature !== receivedSignature) {
  throw new Error('Invalid signature');
}
```

---

## Best Practices

### 1. Always Use Transactions
```javascript
// BAD: Separate queries
await updateBalance(walletId, newBalance);
await createTransaction(data);
// Nếu createTransaction fail → balance đã update

// GOOD: Database transaction
await connection.beginTransaction();
try {
  await updateBalance(connection, walletId, newBalance);
  await createTransaction(connection, data);
  await connection.commit();
} catch (e) {
  await connection.rollback();
}
```

### 2. Log Everything
```javascript
// Mọi thay đổi balance phải có transaction record
await createTransaction({
  type: 'deposit',
  amount: 100000,
  balance_before: oldBalance,
  balance_after: newBalance,
  description: 'Nạp tiền qua MoMo',
  metadata: { /* chi tiết */ }
});
```

### 3. Idempotency
```javascript
// Check duplicate transaction
const existing = await getTransactionByGatewayId(gatewayTxnId);
if (existing) {
  return existing; // Không xử lý lại
}
```

---

## Error Handling

### Common Errors
```javascript
// Insufficient balance
if (balance < amount) {
  const error = new Error('Insufficient balance');
  error.code = 'INSUFFICIENT_BALANCE';
  error.details = {
    required: amount,
    available: balance,
    currency: wallet.currency
  };
  throw error;
}

// Wallet locked
if (wallet.status === 'locked') {
  const error = new Error('Wallet is locked');
  error.code = 'WALLET_LOCKED';
  throw error;
}

// Invalid currency
if (!supportedCurrencies.includes(currency)) {
  const error = new Error('Unsupported currency');
  error.code = 'INVALID_CURRENCY';
  throw error;
}
```

---

## Performance Optimization

### 1. Index Strategy
```sql
-- Wallet queries
CREATE INDEX idx_wallet_user ON user_wallets(user_id);
CREATE INDEX idx_wallet_status ON user_wallets(status);

-- Transaction queries
CREATE INDEX idx_txn_wallet ON wallet_transactions(wallet_id);
CREATE INDEX idx_txn_user_created ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX idx_txn_gateway ON wallet_transactions(payment_gateway_id);
CREATE INDEX idx_txn_status ON wallet_transactions(status);
```

### 2. Caching
```javascript
// Cache wallet balance (short TTL)
const cacheKey = `wallet:${userId}`;
let wallet = await cache.get(cacheKey);
if (!wallet) {
  wallet = await getWalletOverview(userId);
  await cache.set(cacheKey, wallet, 60); // 1 minute
}
```

### 3. Pagination
```javascript
// Luôn sử dụng pagination cho transaction history
const { transactions, total } = await getTransactions(userId, {
  page: 1,
  limit: 20
});
```

---

## Cải tiến trong tương lai

1. **Multi-currency Support**: Hỗ trợ nhiều loại tiền tệ
2. **Crypto Payment**: Tích hợp thanh toán crypto
3. **Recurring Payments**: Thanh toán định kỳ tự động
4. **Refund System**: Hệ thống hoàn tiền
5. **Transaction Dispute**: Xử lý tranh chấp giao dịch
6. **Wallet Limits**: Giới hạn giao dịch theo ngày/tháng
7. **Fraud Detection**: Phát hiện giao dịch bất thường
