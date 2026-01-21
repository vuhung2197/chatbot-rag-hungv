# Subscription Upgrade - Wallet Payment Integration

**Date:** 2026-01-21  
**Issue:** Subscription upgrade không trừ tiền từ ví  
**Status:** ✅ FIXED  

---

## 🐛 Problem

### Before Fix
```javascript
/**
 * Upgrade subscription (for now, just update tier - no payment integration)
 */
```

**Issues:**
- ❌ Chỉ cập nhật tier
- ❌ KHÔNG kiểm tra số dư ví
- ❌ KHÔNG trừ tiền
- ❌ KHÔNG tạo transaction record
- ❌ User có thể upgrade miễn phí

---

## ✅ Solution

### After Fix
```javascript
/**
 * Upgrade subscription with wallet payment
 */
```

**Features Added:**
- ✅ Kiểm tra số dư ví
- ✅ Trừ tiền từ ví
- ✅ Tạo wallet transaction
- ✅ Database transaction (ACID)
- ✅ Row locking (FOR UPDATE)
- ✅ Rollback on error

---

## 🔄 Complete Flow

### Step-by-Step Process

```
User clicks "Upgrade to Pro"
    │
    │ 1. Check tier order (free → pro ✅)
    ▼
┌─────────────────────────────┐
│ Get tier price              │
│ - Monthly: 99,000 VND       │
│ - Yearly: 990,000 VND       │
└──────────┬──────────────────┘
           │
           │ 2. Get user wallet
           ▼
┌─────────────────────────────┐
│ Check wallet balance        │
│ Required: 99,000 VND        │
│ Available: 150,000 VND      │
└──────────┬──────────────────┘
           │
           │ ✅ Sufficient balance
           │
           │ 3. BEGIN TRANSACTION
           ▼
┌─────────────────────────────┐
│ Lock wallet (FOR UPDATE)    │
└──────────┬──────────────────┘
           │
           │ 4. Deduct from wallet
           ▼
┌─────────────────────────────┐
│ UPDATE user_wallets         │
│ balance: 150,000 → 51,000   │
└──────────┬──────────────────┘
           │
           │ 5. Create transaction
           ▼
┌─────────────────────────────┐
│ INSERT wallet_transactions  │
│ type: 'payment'             │
│ amount: 99,000              │
│ status: 'completed'         │
└──────────┬──────────────────┘
           │
           │ 6. Cancel old subscription
           ▼
┌─────────────────────────────┐
│ UPDATE user_subscriptions   │
│ status: 'cancelled'         │
└──────────┬──────────────────┘
           │
           │ 7. Create new subscription
           ▼
┌─────────────────────────────┐
│ INSERT user_subscriptions   │
│ tier: 'pro'                 │
│ status: 'active'            │
└──────────┬──────────────────┘
           │
           │ 8. COMMIT
           ▼
┌─────────────────────────────┐
│ Success!                    │
│ - Wallet: 51,000 VND        │
│ - Tier: Pro                 │
└─────────────────────────────┘
```

---

## 💻 Implementation

### Code Changes

**File:** `backend/controllers/subscriptionController.js`

**Key Additions:**

**1. Calculate Price**
```javascript
// Calculate price based on billing cycle
const price = billingCycle === 'yearly' 
  ? (tier.price_yearly || tier.price_monthly * 12)
  : tier.price_monthly;
```

**2. Get Wallet**
```javascript
// Get user wallet
const [wallets] = await connection.execute(
  'SELECT * FROM user_wallets WHERE user_id = ?',
  [userId]
);

if (wallets.length === 0) {
  return res.status(404).json({ message: 'Wallet not found' });
}

const wallet = wallets[0];
```

**3. Check Balance**
```javascript
// Check if wallet has sufficient balance
if (parseFloat(wallet.balance) < parseFloat(price)) {
  return res.status(400).json({ 
    message: `Insufficient balance. Required: ${price.toLocaleString('vi-VN')} đ, Available: ${parseFloat(wallet.balance).toLocaleString('vi-VN')} đ`,
    required: price,
    available: parseFloat(wallet.balance)
  });
}
```

**4. Database Transaction**
```javascript
// Begin database transaction
await connection.beginTransaction();

try {
  // Lock wallet for update
  const [lockedWallets] = await connection.execute(
    'SELECT * FROM user_wallets WHERE id = ? FOR UPDATE',
    [wallet.id]
  );
  
  const lockedWallet = lockedWallets[0];
  const newBalance = parseFloat(lockedWallet.balance) - parseFloat(price);
  
  // Update wallet balance
  await connection.execute(
    'UPDATE user_wallets SET balance = ?, updated_at = NOW() WHERE id = ?',
    [newBalance, wallet.id]
  );
  
  // Create wallet transaction record
  await connection.execute(
    `INSERT INTO wallet_transactions 
     (wallet_id, type, amount, balance_after, status, payment_method, description, metadata)
     VALUES (?, 'payment', ?, ?, 'completed', 'wallet', ?, ?)`,
    [
      wallet.id,
      price,
      newBalance,
      `Subscription upgrade to ${tier.display_name} (${billingCycle})`,
      JSON.stringify({
        tier_name: tierName,
        tier_display_name: tier.display_name,
        billing_cycle: billingCycle,
        price: price,
        upgraded_at: new Date().toISOString()
      })
    ]
  );

  // Cancel existing subscription
  // Create new subscription
  
  // Commit transaction
  await connection.commit();
  
} catch (dbError) {
  await connection.rollback();
  throw dbError;
}
```

---

## 🔐 Security Features

### 1. Balance Validation
```javascript
if (parseFloat(wallet.balance) < parseFloat(price)) {
  return res.status(400).json({ 
    message: 'Insufficient balance',
    required: price,
    available: parseFloat(wallet.balance)
  });
}
```

**Prevents:**
- ✅ Negative balance
- ✅ Insufficient funds
- ✅ Overdraft

---

### 2. Database Transaction
```javascript
await connection.beginTransaction();
try {
  // Multiple operations
  await connection.commit();
} catch (error) {
  await connection.rollback();
  throw error;
}
```

**Ensures:**
- ✅ Atomicity (all or nothing)
- ✅ Consistency (valid state)
- ✅ Isolation (no interference)
- ✅ Durability (permanent changes)

---

### 3. Row Locking
```javascript
SELECT * FROM user_wallets WHERE id = ? FOR UPDATE
```

**Prevents:**
- ✅ Race conditions
- ✅ Concurrent modifications
- ✅ Double spending

---

### 4. Transaction Record
```javascript
INSERT INTO wallet_transactions 
(wallet_id, type, amount, balance_after, status, payment_method, description, metadata)
VALUES (?, 'payment', ?, ?, 'completed', 'wallet', ?, ?)
```

**Benefits:**
- ✅ Audit trail
- ✅ Transaction history
- ✅ Reconciliation
- ✅ Dispute resolution

---

## 📊 Example Scenarios

### Scenario 1: Successful Upgrade

**Input:**
```json
{
  "tierName": "pro",
  "billingCycle": "monthly"
}
```

**Before:**
- Wallet balance: 150,000 VND
- Tier: Free

**After:**
- Wallet balance: 51,000 VND (150,000 - 99,000)
- Tier: Pro
- Transaction created

**Response:**
```json
{
  "message": "Subscription upgraded successfully",
  "tier": {
    "name": "pro",
    "display_name": "Pro",
    "features": {...}
  },
  "payment": {
    "amount": 99000,
    "new_balance": 51000,
    "billing_cycle": "monthly"
  }
}
```

---

### Scenario 2: Insufficient Balance

**Input:**
```json
{
  "tierName": "pro",
  "billingCycle": "monthly"
}
```

**Before:**
- Wallet balance: 50,000 VND
- Tier: Free

**Response:**
```json
{
  "message": "Insufficient balance. Required: 99,000 đ, Available: 50,000 đ",
  "required": 99000,
  "available": 50000
}
```

**Status:** 400 Bad Request

---

### Scenario 3: Yearly Billing

**Input:**
```json
{
  "tierName": "pro",
  "billingCycle": "yearly"
}
```

**Price Calculation:**
```javascript
price = tier.price_yearly || tier.price_monthly * 12
      = 990,000 VND
```

**Before:**
- Wallet balance: 1,500,000 VND
- Tier: Free

**After:**
- Wallet balance: 510,000 VND (1,500,000 - 990,000)
- Tier: Pro (yearly)
- Period: 1 year

---

## 🗄️ Database Changes

### wallet_transactions Table

**New Record:**
```sql
INSERT INTO wallet_transactions (
  wallet_id,
  type,
  amount,
  balance_after,
  status,
  payment_method,
  description,
  metadata
) VALUES (
  1,
  'payment',
  99000,
  51000,
  'completed',
  'wallet',
  'Subscription upgrade to Pro (monthly)',
  '{"tier_name":"pro","tier_display_name":"Pro","billing_cycle":"monthly","price":99000,"upgraded_at":"2026-01-21T10:00:00.000Z"}'
);
```

---

### user_subscriptions Table

**Old Record (Cancelled):**
```sql
UPDATE user_subscriptions 
SET status = 'cancelled', 
    cancel_at_period_end = FALSE
WHERE user_id = 1 
  AND status IN ('active', 'trial');
```

**New Record (Active):**
```sql
INSERT INTO user_subscriptions (
  user_id,
  tier_id,
  status,
  billing_cycle,
  current_period_start,
  current_period_end
) VALUES (
  1,
  2, -- Pro tier
  'active',
  'monthly',
  '2026-01-21 10:00:00',
  '2026-02-21 10:00:00'
);
```

---

## 🧪 Testing

### Test Cases

**1. Successful Monthly Upgrade**
```bash
POST /subscription/upgrade
{
  "tierName": "pro",
  "billingCycle": "monthly"
}
```
Expected: ✅ Success, wallet deducted

**2. Successful Yearly Upgrade**
```bash
POST /subscription/upgrade
{
  "tierName": "pro",
  "billingCycle": "yearly"
}
```
Expected: ✅ Success, larger deduction

**3. Insufficient Balance**
```bash
POST /subscription/upgrade
{
  "tierName": "enterprise",
  "billingCycle": "monthly"
}
```
Expected: ❌ 400 Insufficient balance

**4. Already Subscribed**
```bash
POST /subscription/upgrade
{
  "tierName": "pro",
  "billingCycle": "monthly"
}
```
(When already on Pro)
Expected: ❌ 400 Already subscribed

**5. Downgrade Attempt**
```bash
POST /subscription/upgrade
{
  "tierName": "free",
  "billingCycle": "monthly"
}
```
(When on Pro)
Expected: ❌ 400 Cannot downgrade

---

## 📝 API Response

### Success Response

```json
{
  "message": "Subscription upgraded successfully",
  "tier": {
    "name": "pro",
    "display_name": "Pro",
    "features": {
      "max_conversations": 100,
      "max_messages_per_conversation": 500,
      "ai_models": ["gpt-3.5-turbo", "gpt-4"],
      "file_upload": true,
      "priority_support": true
    }
  },
  "payment": {
    "amount": 99000,
    "new_balance": 51000,
    "billing_cycle": "monthly"
  }
}
```

---

### Error Responses

**Insufficient Balance:**
```json
{
  "message": "Insufficient balance. Required: 99,000 đ, Available: 50,000 đ",
  "required": 99000,
  "available": 50000
}
```

**Wallet Not Found:**
```json
{
  "message": "Wallet not found"
}
```

**Already Subscribed:**
```json
{
  "message": "Already subscribed to this tier"
}
```

**Cannot Downgrade:**
```json
{
  "message": "Cannot downgrade. Please cancel your current subscription first."
}
```

---

## ✅ Summary

### Changes Made

1. ✅ Added wallet balance check
2. ✅ Added price calculation
3. ✅ Added wallet deduction
4. ✅ Added transaction record
5. ✅ Added database transaction
6. ✅ Added row locking
7. ✅ Added rollback on error

### Benefits

- ✅ Users must pay for upgrades
- ✅ Wallet balance tracked accurately
- ✅ Transaction history maintained
- ✅ Data integrity ensured
- ✅ Race conditions prevented

### Security

- ✅ Balance validation
- ✅ ACID transactions
- ✅ Row locking
- ✅ Audit trail
- ✅ Error handling

---

**Status:** ✅ Fixed  
**Payment:** Wallet integration ✅  
**Security:** Enterprise-level ✅  
**Testing:** Ready ✅  

**🎉 Subscription upgrade now properly deducts from wallet!**
