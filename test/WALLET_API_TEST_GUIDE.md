# Phase 1 Wallet API - Manual Testing Guide

## Prerequisites
1. ✅ Database tables created (user_wallets, wallet_transactions, payment_methods)
2. ✅ Backend running on http://localhost:3001
3. ✅ Have a test user account

---

## Step 1: Login and Get Token

```bash
# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"123456\"}"
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

**Save the token** for next steps!

---

## Step 2: Get Wallet Information

```bash
# Replace YOUR_TOKEN with actual token from Step 1
curl -X GET http://localhost:3001/wallet \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "wallet": {
    "id": 1,
    "user_id": 1,
    "balance": "0.00",
    "currency": "USD",
    "status": "active",
    "created_at": "2026-01-19T...",
    "updated_at": "2026-01-19T..."
  }
}
```

---

## Step 3: Get Wallet Statistics

```bash
curl -X GET http://localhost:3001/wallet/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "balance": "0.00",
  "currency": "USD",
  "total_transactions": 0,
  "total_deposits": 0,
  "total_spent": 0,
  "last_transaction_at": null
}
```

---

## Step 4: Create Deposit Transaction

```bash
curl -X POST http://localhost:3001/wallet/deposit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"amount\":100,\"currency\":\"USD\",\"payment_method\":\"stripe\"}"
```

**Expected Response:**
```json
{
  "message": "Deposit initiated",
  "transaction_id": 1,
  "payment_url": "/payment/process?transaction_id=1&method=stripe",
  "amount": 100,
  "currency": "USD",
  "payment_method": "stripe"
}
```

**Save the transaction_id** for next step!

---

## Step 5: Simulate Payment Callback (Complete Deposit)

```bash
# Replace TRANSACTION_ID with actual ID from Step 4
curl -X POST http://localhost:3001/wallet/payment-callback \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"transaction_id\":1,\"status\":\"success\",\"gateway_id\":\"test_123\",\"signature\":\"test\"}"
```

**Expected Response:**
```json
{
  "message": "Payment processed successfully",
  "transaction_id": 1,
  "status": "completed"
}
```

---

## Step 6: Verify Balance Updated

```bash
curl -X GET http://localhost:3001/wallet \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "wallet": {
    "id": 1,
    "balance": "100.00",  // ✅ Should be updated!
    "currency": "USD",
    "status": "active"
  }
}
```

---

## Step 7: Get Transaction History

```bash
curl -X GET "http://localhost:3001/wallet/transactions?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "transactions": [
    {
      "id": 1,
      "type": "deposit",
      "amount": "100.00",
      "balance_before": "0.00",
      "balance_after": "100.00",
      "status": "completed",
      "payment_method": "stripe",
      "created_at": "2026-01-19T..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

## Step 8: Test with Different Payment Methods

### Test with VNPay
```bash
curl -X POST http://localhost:3001/wallet/deposit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"amount\":500000,\"currency\":\"VND\",\"payment_method\":\"vnpay\"}"
```

### Test with MoMo
```bash
curl -X POST http://localhost:3001/wallet/deposit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"amount\":200000,\"currency\":\"VND\",\"payment_method\":\"momo\"}"
```

---

## Step 9: Test Error Cases

### Invalid amount (too low)
```bash
curl -X POST http://localhost:3001/wallet/deposit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"amount\":0.5,\"currency\":\"USD\",\"payment_method\":\"stripe\"}"
```

**Expected:** Error message about minimum amount

### Invalid payment method
```bash
curl -X POST http://localhost:3001/wallet/deposit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"amount\":100,\"currency\":\"USD\",\"payment_method\":\"invalid\"}"
```

**Expected:** Error message about invalid payment method

### Without authentication
```bash
curl -X GET http://localhost:3001/wallet
```

**Expected:** 401 Unauthorized

---

## Database Verification

### Check wallet balance directly
```sql
SELECT * FROM user_wallets;
```

### Check transactions
```sql
SELECT id, type, amount, balance_before, balance_after, status 
FROM wallet_transactions 
ORDER BY created_at DESC;
```

### Check payment methods
```sql
SELECT name, display_name, is_active, min_amount, max_amount 
FROM payment_methods;
```

---

## Success Criteria

- [x] Can login and get token
- [x] Can retrieve wallet information
- [x] Can create deposit transaction
- [x] Can process payment callback
- [x] Balance updates correctly
- [x] Transaction history shows correctly
- [x] Pagination works
- [x] Error handling works
- [x] Database constraints work

---

## Troubleshooting

### Error: "Unauthorized"
- Check if token is valid
- Token may have expired, login again

### Error: "Wallet not found"
- Check if user_wallets table has entry for user
- Run: `INSERT INTO user_wallets (user_id, balance) VALUES (1, 0.00);`

### Error: "Invalid payment method"
- Check payment_methods table
- Ensure method is active: `UPDATE payment_methods SET is_active = TRUE WHERE name = 'stripe';`

### Balance not updating
- Check transaction status in database
- Verify payment callback was called
- Check wallet_transactions table for completed transactions

---

## Next Steps

Once all tests pass:
1. ✅ Phase 1 Complete
2. → Proceed to Phase 2: Payment Gateway Integration
3. → Implement VNPay/MoMo real integration
4. → Build Frontend UI components
