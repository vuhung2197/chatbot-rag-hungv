# Currency Conversion Error - Balance Precision Issue

**Date:** 2026-01-22  
**Issue:** Out of range value for column 'balance'  
**Root Cause:** DECIMAL(10,2) không đủ precision cho multi-currency  
**Status:** ⚠️ Requires Manual Fix  

---

## 🐛 Problem

### Error Message
```
Out of range value for column 'balance' at row 1
```

### Root Cause

**Database Schema:**
```sql
balance DECIMAL(10, 2)
```

**Problem:**
- `DECIMAL(10, 2)` = max 99,999,999.99
- VND amounts: 1,000,000+ (no decimals)
- USD amounts: 41.67 (2 decimals)
- When converting VND → USD: Works ✅
- When converting USD → VND: **FAILS** ❌ (exceeds max value)

**Example:**
```
100 USD → 2,400,000 VND
But DECIMAL(10,2) max = 99,999,999.99
So 2,400,000.00 is OK ✅

But:
1,000 USD → 24,000,000 VND
Still OK ✅

10,000 USD → 240,000,000 VND
EXCEEDS LIMIT ❌ (max is 99,999,999.99)
```

---

## ✅ Solution

### Option 1: Increase Precision (Recommended)

**Run this SQL migration:**

```sql
-- Increase balance precision
ALTER TABLE user_wallets 
MODIFY COLUMN balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00;

-- Also update transactions table
ALTER TABLE wallet_transactions
MODIFY COLUMN amount DECIMAL(15, 2) NOT NULL,
MODIFY COLUMN balance_before DECIMAL(15, 2),
MODIFY COLUMN balance_after DECIMAL(15, 2);
```

**New Limits:**
- `DECIMAL(15, 2)` = max 9,999,999,999,999.99
- Supports VND: up to 9.9 trillion
- Supports USD: up to 9.9 trillion

---

### Option 2: Disable Currency Conversion

**If you don't need currency conversion:**

1. Remove CurrencySelector from frontend
2. Lock all wallets to VND only
3. Simpler and safer

---

## 🔧 Manual Fix Steps

### Step 1: Access Database

**Option A: Using Docker**
```bash
docker-compose exec db mysql -uroot -p
# Enter password when prompted
```

**Option B: Using MySQL Client**
```bash
mysql -h localhost -P 3306 -uroot -p chatbot
```

### Step 2: Run Migration

```sql
USE chatbot;

-- Backup first (recommended)
CREATE TABLE user_wallets_backup AS SELECT * FROM user_wallets;
CREATE TABLE wallet_transactions_backup AS SELECT * FROM wallet_transactions;

-- Modify columns
ALTER TABLE user_wallets 
MODIFY COLUMN balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00;

ALTER TABLE wallet_transactions
MODIFY COLUMN amount DECIMAL(15, 2) NOT NULL,
MODIFY COLUMN balance_before DECIMAL(15, 2),
MODIFY COLUMN balance_after DECIMAL(15, 2);

-- Verify changes
SHOW COLUMNS FROM user_wallets LIKE 'balance';
SHOW COLUMNS FROM wallet_transactions LIKE 'amount';
```

### Step 3: Verify

```sql
-- Check column types
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'chatbot'
  AND TABLE_NAME IN ('user_wallets', 'wallet_transactions')
  AND COLUMN_NAME IN ('balance', 'amount', 'balance_before', 'balance_after');
```

**Expected Output:**
```
+---------------------+----------------+----------------+
| TABLE_NAME          | COLUMN_NAME    | COLUMN_TYPE    |
+---------------------+----------------+----------------+
| user_wallets        | balance        | decimal(15,2)  |
| wallet_transactions | amount         | decimal(15,2)  |
| wallet_transactions | balance_before | decimal(15,2)  |
| wallet_transactions | balance_after  | decimal(15,2)  |
+---------------------+----------------+----------------+
```

---

## 📊 Comparison

### Before (DECIMAL 10,2)

| Currency | Max Value | Example |
|----------|-----------|---------|
| VND | 99,999,999.99 | ✅ 50,000,000 VND OK |
| USD | 99,999,999.99 | ✅ 50,000 USD OK |
| **Conversion** | **Limited** | ❌ 10,000 USD → 240M VND FAILS |

### After (DECIMAL 15,2)

| Currency | Max Value | Example |
|----------|-----------|---------|
| VND | 9,999,999,999,999.99 | ✅ 9.9 trillion VND |
| USD | 9,999,999,999,999.99 | ✅ 9.9 trillion USD |
| **Conversion** | **No Limits** | ✅ All conversions work |

---

## 🧪 Testing After Fix

### Test 1: Small Amount Conversion

```bash
# VND to USD
curl -X PUT http://localhost:3001/wallet/currency \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"currency": "USD"}'
```

**Expected:**
- 1,000,000 VND → 41.67 USD ✅

### Test 2: Large Amount Conversion

```bash
# Deposit large amount first
# Then convert USD to VND
curl -X PUT http://localhost:3001/wallet/currency \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"currency": "VND"}'
```

**Expected:**
- 10,000 USD → 240,000,000 VND ✅

---

## 🔍 Debugging

### Check Current Balance Type

```sql
SHOW COLUMNS FROM user_wallets LIKE 'balance';
```

### Check Existing Balances

```sql
SELECT 
    id,
    user_id,
    balance,
    currency,
    LENGTH(CAST(balance AS CHAR)) as balance_length
FROM user_wallets
ORDER BY balance DESC
LIMIT 10;
```

### Check Failed Conversions

```sql
SELECT 
    id,
    user_id,
    type,
    amount,
    balance_after,
    description,
    created_at
FROM wallet_transactions
WHERE status = 'failed'
  AND description LIKE '%Currency changed%'
ORDER BY created_at DESC
LIMIT 10;
```

---

## ⚠️ Important Notes

### Data Safety

1. **Backup First:**
   ```sql
   CREATE TABLE user_wallets_backup AS SELECT * FROM user_wallets;
   ```

2. **Test on Staging:**
   - Run migration on test database first
   - Verify all conversions work
   - Then apply to production

3. **Rollback Plan:**
   ```sql
   -- If something goes wrong
   DROP TABLE user_wallets;
   RENAME TABLE user_wallets_backup TO user_wallets;
   ```

### Performance Impact

- **ALTER TABLE** locks the table
- For large tables (1M+ rows), this may take time
- Consider running during low-traffic hours

---

## 📝 Alternative: Disable Currency Conversion

If you don't need currency conversion, disable it:

### Backend: Comment Out Route

```javascript
// backend/routes/wallet.js
// router.put('/currency', verifyToken, updateWalletCurrency);
```

### Frontend: Remove CurrencySelector

```javascript
// frontend/src/component/WalletDashboard.js
// Remove or comment out:
// <CurrencySelector 
//   currentCurrency={wallet?.currency}
//   onCurrencyChange={handleCurrencyChange}
// />
```

### Set All Wallets to VND

```sql
UPDATE user_wallets SET currency = 'VND';
```

---

## ✅ Recommended Action

**For Production:**
1. ✅ Run the migration to increase precision
2. ✅ Test thoroughly
3. ✅ Keep currency conversion feature

**For Quick Fix:**
1. ❌ Disable currency conversion
2. ✅ Lock to VND only
3. ✅ Simpler but less flexible

---

## 📄 Migration File

**Location:** `db/migrations/fix_balance_precision.sql`

**Content:**
```sql
ALTER TABLE user_wallets 
MODIFY COLUMN balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00;

ALTER TABLE wallet_transactions
MODIFY COLUMN amount DECIMAL(15, 2) NOT NULL,
MODIFY COLUMN balance_before DECIMAL(15, 2),
MODIFY COLUMN balance_after DECIMAL(15, 2);
```

---

**Status:** ⚠️ Manual Fix Required  
**Priority:** High  
**Estimated Time:** 5 minutes  

**🔧 Please run the migration manually to fix this issue!**
