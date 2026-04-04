# PHÂN TÍCH CHI TIẾT - SUBSCRIPTION SERVICE

## Tổng quan
File: `subscription.service.js`

Service này quản lý gói đăng ký (subscription plans) của người dùng với payment qua wallet.

---

## Helper Functions

### 1. parseFeatures(rawFeatures)
Parse JSON features an toàn từ database.

### 2. calculatePeriodDates(billingCycle, activeSub, tier)
Tính toán thời gian bắt đầu và kết thúc của subscription period.

**Logic**:
- Nếu đang stack cùng tier → start từ end của period hiện tại
- Nếu monthly → +1 tháng
- Nếu yearly → +1 năm

### 3. calculatePurchaseAmount(price, walletCurrency)
Convert giá từ USD sang currency của wallet.

### 4. validateBalance(walletBalance, purchaseAmount, walletCurrency)
Validate số dư đủ để thanh toán, throw error nếu không đủ.

### 5. processWalletPayment(connection, params)
Xử lý trừ tiền từ wallet và tạo transaction record.

**Logic**:
1. Lock wallet row (FOR UPDATE)
2. Tính new balance
3. Update wallet balance
4. Create transaction record
5. Return new balance

---

## Class: SubscriptionService

### 1. getTiers()

**Mục đích**: Lấy danh sách tất cả subscription tiers

**Returns**: `Promise<Array>` - Danh sách tiers

**SQL Query**:
```sql
SELECT * FROM subscription_tiers
ORDER BY price_monthly ASC
```

---

### 2. getCurrentSubscription(userId)

**Mục đích**: Lấy subscription hiện tại của user

**Returns**: `Promise<Object>` - Subscription info

**Return format**:
```javascript
{
  subscription: {
    id: 1,
    user_id: 123,
    tier_id: 2,
    status: 'active',
    billing_cycle: 'monthly',
    current_period_start: '2026-03-01',
    current_period_end: '2026-04-01',
    auto_renew: true
  },
  tier: {
    name: 'pro',
    display_name: 'Pro Plan',
    price_monthly: 9.99,
    price_yearly: 99.99,
    features: {...},
    max_file_size_mb: 10,
    max_chat_history_days: 90
  },
  isFree: false
}
```

**Logic**:
1. Query active/trial subscription
2. JOIN với subscription_tiers
3. Parse features JSON
4. Nếu không có subscription → return free tier
5. Return subscription + tier info

---

### 3. getInvoices(userId)

**Mục đích**: Lấy lịch sử invoices/subscriptions

**Returns**: `Promise<Array>` - Danh sách invoices

**Return format**:
```javascript
[
  {
    id: 1,
    invoice_number: 'INV-000001',
    tier_name: 'pro',
    tier_display_name: 'Pro Plan',
    amount: 9.99,
    billing_cycle: 'monthly',
    status: 'active',
    period_start: '2026-03-01',
    period_end: '2026-04-01',
    created_at: '2026-03-01T00:00:00Z',
    paid_at: '2026-03-01T00:00:00Z'
  }
]
```

**Logic**:
- Query subscriptions với tier info
- Format thành invoice format
- Generate invoice_number từ ID
- Calculate amount dựa trên billing_cycle

---

### 4. setAutoRenew(userId, autoRenew)

**Mục đích**: Bật/tắt auto-renewal

**Parameters**:
- `userId` (number)
- `autoRenew` (boolean)

**SQL Query**:
```sql
UPDATE user_subscriptions
SET auto_renew = ?
WHERE user_id = ? AND status IN ('active', 'trial')
```

---

### 5. cancelSubscription(userId)

**Mục đích**: Hủy subscription (cancel at period end)

**SQL Query**:
```sql
UPDATE user_subscriptions
SET cancel_at_period_end = TRUE
WHERE user_id = ? AND status = 'active'
```

**Note**: Subscription vẫn active đến hết period

---

### 6. renewSubscription(userId)

**Mục đích**: Undo cancellation

**SQL Query**:
```sql
UPDATE user_subscriptions
SET cancel_at_period_end = FALSE
WHERE user_id = ? AND status = 'active'
```

---

### 7. upgradeSubscription(userId, tierName, billingCycle)

**Mục đích**: Upgrade subscription với wallet payment

**Parameters**:
```javascript
{
  userId: number,
  tierName: 'pro' | 'team' | 'enterprise',
  billingCycle: 'monthly' | 'yearly'
}
```

**Returns**: `Promise<Object>` - Upgrade result

**Logic chi tiết**:

#### Step 1: Validate tier
```javascript
const [tiers] = await connection.execute(
  'SELECT * FROM subscription_tiers WHERE name = ?',
  [tierName]
);
if (tiers.length === 0) throw new Error('Tier not found');
```

#### Step 2: Calculate price
```javascript
const price = billingCycle === 'yearly'
  ? (tier.price_yearly || tier.price_monthly * 12)
  : tier.price_monthly;
```

#### Step 3: Get current subscription
```javascript
const [currentSubs] = await connection.execute(
  `SELECT st.name as tier_name, us.current_period_end, us.tier_id
   FROM user_subscriptions us
   JOIN subscription_tiers st ON us.tier_id = st.id
   WHERE us.user_id = ? AND us.status IN ('active', 'trial')
   ORDER BY us.current_period_end DESC
   LIMIT 1`,
  [userId]
);
```

#### Step 4: Validate tier order (prevent downgrade)
```javascript
const TIER_ORDER = { free: 0, pro: 1, team: 2, enterprise: 3 };

if (TIER_ORDER[tierName] < TIER_ORDER[currentTierName]) {
  throw new Error('Cannot downgrade. Please cancel current subscription first.');
}
```

#### Step 5: Get wallet and validate balance
```javascript
const [wallets] = await connection.execute(
  'SELECT * FROM user_wallets WHERE user_id = ?',
  [userId]
);
const wallet = wallets[0];

const purchaseAmount = calculatePurchaseAmount(price, wallet.currency);
validateBalance(wallet.balance, purchaseAmount, wallet.currency);
```

#### Step 6: Begin transaction
```javascript
await connection.beginTransaction();
```

#### Step 7: Process wallet payment
```javascript
const { newBalance } = await processWalletPayment(connection, {
  wallet, userId, price, purchaseAmount, tier, tierName, billingCycle
});
```

#### Step 8: Cancel existing subscription
```javascript
await connection.execute(
  `UPDATE user_subscriptions
   SET status = 'cancelled', cancel_at_period_end = FALSE
   WHERE user_id = ? AND status IN ('active', 'trial')`,
  [userId]
);
```

#### Step 9: Create new subscription
```javascript
const { periodStart, periodEnd } = calculatePeriodDates(billingCycle, activeSub, tier);

await connection.execute(
  `INSERT INTO user_subscriptions
   (user_id, tier_id, status, billing_cycle, current_period_start, current_period_end, auto_renew)
   VALUES (?, ?, 'active', ?, ?, ?, TRUE)`,
  [userId, tier.id, billingCycle, periodStart, periodEnd]
);
```

#### Step 10: Commit transaction
```javascript
await connection.commit();
```

#### Step 11: Return result
```javascript
return {
  message: 'Subscription upgraded successfully',
  tier: { name, display_name, features },
  payment: {
    amount: purchaseAmount,
    currency: wallet.currency,
    new_balance: newBalance,
    billing_cycle: billingCycle
  }
};
```

**Error Handling**:
- Rollback transaction nếu có lỗi
- Handle duplicate entry error (409)
- Release connection trong finally block

---

## Transaction Safety

### Database Transaction Flow
```
1. Get connection from pool
2. BEGIN TRANSACTION
3. Lock wallet (FOR UPDATE)
4. Update wallet balance
5. Create transaction record
6. Cancel old subscription
7. Create new subscription
8. COMMIT
9. Release connection
```

### Error Scenarios
```javascript
try {
  await connection.beginTransaction();
  // ... operations
  await connection.commit();
} catch (error) {
  await connection.rollback();
  if (error.code === '23505') { // Duplicate
    throw new Error('Subscription already exists');
  }
  throw error;
} finally {
  connection.release();
}
```

---

## Tier System

### Tier Hierarchy
```
free (0) < pro (1) < team (2) < enterprise (3)
```

### Upgrade Rules
- ✅ free → pro (allowed)
- ✅ pro → team (allowed)
- ✅ pro → enterprise (allowed)
- ❌ pro → free (blocked - must cancel first)
- ❌ team → pro (blocked - must cancel first)

---

## Billing Cycles

### Monthly
- Price: `tier.price_monthly`
- Period: +1 month

### Yearly
- Price: `tier.price_yearly` hoặc `tier.price_monthly * 12`
- Period: +1 year
- Thường có discount (ví dụ: 10 months price for 12 months)

---

## Database Schema

### subscription_tiers
```sql
CREATE TABLE subscription_tiers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2),
  features JSON,
  max_file_size_mb INTEGER,
  max_chat_history_days INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### user_subscriptions
```sql
CREATE TABLE user_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  tier_id INTEGER REFERENCES subscription_tiers(id),
  status VARCHAR(20) NOT NULL,
  billing_cycle VARCHAR(20) NOT NULL,
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  auto_renew BOOLEAN DEFAULT TRUE,
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Best Practices

### 1. Always Use Transactions
```javascript
// GOOD
const connection = await pool.getConnection();
try {
  await connection.beginTransaction();
  // ... operations
  await connection.commit();
} finally {
  connection.release();
}

// BAD
await updateWallet(...);
await createSubscription(...);
```

### 2. Lock Wallet Row
```javascript
// GOOD: Lock before update
const [wallets] = await connection.execute(
  'SELECT * FROM user_wallets WHERE id = ? FOR UPDATE',
  [walletId]
);

// BAD: No lock (race condition)
const [wallets] = await connection.execute(
  'SELECT * FROM user_wallets WHERE id = ?',
  [walletId]
);
```

### 3. Validate Before Transaction
```javascript
// GOOD: Validate first
validateBalance(wallet.balance, amount, currency);
await connection.beginTransaction();

// BAD: Validate inside transaction
await connection.beginTransaction();
validateBalance(wallet.balance, amount, currency);
```

---

## Cải tiến trong tương lai

1. **Proration**: Tính toán refund khi upgrade mid-cycle
2. **Trial Period**: Free trial cho new users
3. **Promo Codes**: Discount codes
4. **Team Management**: Invite members, manage seats
5. **Usage-based Billing**: Pay per usage
6. **Stripe Integration**: Alternative payment method
7. **Subscription Pause**: Tạm dừng subscription
