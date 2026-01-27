# Wallet Withdrawal Feature - Implementation Plan

**Date:** 2026-01-21  
**Feature:** Rút tiền từ ví về tài khoản ngân hàng  
**Status:** 📋 Planning Phase  

---

## 🎯 Overview

### Purpose
Cho phép người dùng rút tiền từ ví điện tử trong hệ thống về tài khoản ngân hàng cá nhân.

### Business Requirements
- User có thể rút tiền về tài khoản ngân hàng
- Xác thực thông tin ngân hàng
- Giới hạn số tiền rút tối thiểu/tối đa
- Phí rút tiền (nếu có)
- Thời gian xử lý: 1-3 ngày làm việc
- Lịch sử rút tiền

---

## 📊 Market Research

### Vietnam Banking System

**Popular Banks:**
1. **Vietcombank** - Ngân hàng Ngoại thương Việt Nam
2. **VietinBank** - Ngân hàng Công thương Việt Nam
3. **BIDV** - Ngân hàng Đầu tư và Phát triển Việt Nam
4. **Agribank** - Ngân hàng Nông nghiệp và Phát triển Nông thôn
5. **Techcombank** - Ngân hàng Kỹ thương Việt Nam
6. **MB Bank** - Ngân hàng Quân đội
7. **ACB** - Ngân hàng Á Châu
8. **Sacombank** - Ngân hàng TMCP Sài Gòn Thương Tín
9. **VPBank** - Ngân hàng Việt Nam Thịnh Vượng
10. **TPBank** - Ngân hàng Tiên Phong

---

## 🏗️ System Architecture

### Components

```
┌─────────────────┐
│   Frontend      │
│  - Withdrawal   │
│    Form         │
│  - Bank Info    │
│    Management   │
└────────┬────────┘
         │
         │ HTTPS
         ▼
┌─────────────────┐
│   Backend       │
│  - Validation   │
│  - Processing   │
│  - Approval     │
└────────┬────────┘
         │
         ├──────────┬──────────┐
         │          │          │
         ▼          ▼          ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Database │  │  Admin   │  │  Bank    │
│          │  │  Panel   │  │  API     │
└──────────┘  └──────────┘  └──────────┘
```

---

## 💼 Business Rules

### 1. Withdrawal Limits

**Minimum Withdrawal:**
- 100,000 VND

**Maximum Withdrawal:**
- Per transaction: 50,000,000 VND
- Per day: 100,000,000 VND
- Per month: 500,000,000 VND

**Reasoning:**
- Prevent micro-transactions
- Reduce processing costs
- Anti-money laundering compliance

---

### 2. Fees Structure

**Option A: Flat Fee**
```
Fee: 5,000 VND per withdrawal
```

**Option B: Percentage Fee**
```
Fee: 1% of withdrawal amount
Min fee: 5,000 VND
Max fee: 50,000 VND
```

**Option C: Tiered Fee**
```
< 1,000,000 VND: 5,000 VND
1,000,000 - 10,000,000 VND: 10,000 VND
> 10,000,000 VND: 0.5% (max 50,000 VND)
```

**Recommendation:** Option A (Flat Fee) - Simple and transparent

---

### 3. Processing Time

**Standard Processing:**
- Submission: Instant
- Verification: 1-2 hours (business hours)
- Bank transfer: 1-3 business days
- Total: 1-3 business days

**Express Processing (Future):**
- Fee: +20,000 VND
- Processing: Same day (if before 3 PM)

---

### 4. Verification Requirements

**User Verification:**
- ✅ Email verified
- ✅ Phone verified
- ✅ KYC completed (for large amounts)

**Bank Account Verification:**
- ✅ Account holder name matches user name
- ✅ Valid bank account number
- ✅ Bank code valid

---

## 🗄️ Database Schema

### New Table: bank_accounts

```sql
CREATE TABLE bank_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  bank_code VARCHAR(20) NOT NULL COMMENT 'VCB, VTB, BIDV, etc.',
  bank_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  account_holder_name VARCHAR(100) NOT NULL,
  branch_name VARCHAR(100),
  is_verified BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  status ENUM('active', 'pending', 'rejected', 'deleted') DEFAULT 'pending',
  verification_method VARCHAR(50) COMMENT 'manual, auto, napas',
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  UNIQUE KEY unique_account (user_id, bank_code, account_number)
);
```

### Update: wallet_transactions

```sql
-- Already has 'withdrawal' type in ENUM
ALTER TABLE wallet_transactions 
MODIFY COLUMN type ENUM('deposit', 'withdrawal', 'purchase', 'refund', 'subscription') NOT NULL;

-- Add reference fields
ALTER TABLE wallet_transactions
ADD COLUMN bank_account_id INT NULL AFTER reference_id,
ADD COLUMN withdrawal_fee DECIMAL(10,2) DEFAULT 0.00 AFTER amount,
ADD COLUMN net_amount DECIMAL(10,2) NULL COMMENT 'Amount after fee' AFTER withdrawal_fee,
ADD FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id);
```

### New Table: withdrawal_requests

```sql
CREATE TABLE withdrawal_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT NOT NULL,
  user_id INT NOT NULL,
  bank_account_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  fee DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL COMMENT 'amount - fee',
  status ENUM('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled') DEFAULT 'pending',
  
  -- Admin review
  reviewed_by INT NULL COMMENT 'Admin user ID',
  reviewed_at TIMESTAMP NULL,
  review_notes TEXT,
  
  -- Processing
  processed_by INT NULL COMMENT 'Admin user ID',
  processed_at TIMESTAMP NULL,
  processing_notes TEXT,
  bank_transaction_id VARCHAR(100) COMMENT 'Bank reference number',
  
  -- Completion
  completed_at TIMESTAMP NULL,
  
  -- Rejection
  rejection_reason TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (transaction_id) REFERENCES wallet_transactions(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id),
  FOREIGN KEY (processed_by) REFERENCES users(id),
  
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

---

## 🔄 Withdrawal Flow

### User Flow

```
1. User clicks "Rút tiền"
   │
   ▼
2. Select/Add bank account
   │
   ├─► New account?
   │   │
   │   ├─► Enter bank details
   │   ├─► Verify account holder name
   │   └─► Save for future use
   │
   ▼
3. Enter withdrawal amount
   │
   ├─► Check minimum (100,000 VND)
   ├─► Check maximum (50,000,000 VND)
   ├─► Check daily limit
   └─► Check wallet balance
   │
   ▼
4. Show fee calculation
   │
   Amount: 1,000,000 VND
   Fee: 5,000 VND
   You receive: 995,000 VND
   │
   ▼
5. Confirm withdrawal
   │
   ▼
6. Create withdrawal request
   │
   ├─► Deduct from wallet
   ├─► Create transaction (pending)
   ├─► Create withdrawal request
   └─► Send notification
   │
   ▼
7. Wait for processing
   │
   Status: Pending → Approved → Processing → Completed
   │
   ▼
8. Receive money in bank account (1-3 days)
```

---

### Admin Flow

```
1. Admin receives withdrawal request
   │
   ▼
2. Review request
   │
   ├─► Check user verification
   ├─► Check bank account details
   ├─► Check transaction history
   └─► Check for fraud patterns
   │
   ▼
3. Decision
   │
   ├─► Approve
   │   │
   │   ├─► Mark as approved
   │   ├─► Queue for processing
   │   └─► Notify user
   │
   └─► Reject
       │
       ├─► Mark as rejected
       ├─► Refund to wallet
       └─► Notify user with reason
   │
   ▼
4. Process approved requests (batch)
   │
   ├─► Generate bank transfer file
   ├─► Upload to bank system
   └─► Update status to processing
   │
   ▼
5. Confirm completion
   │
   ├─► Receive bank confirmation
   ├─► Update status to completed
   └─► Notify user
```

---

## 💻 API Design

### 1. Bank Account Management

**Add Bank Account**
```
POST /wallet/bank-accounts

Request:
{
  "bank_code": "VCB",
  "account_number": "1234567890",
  "account_holder_name": "NGUYEN VAN A",
  "branch_name": "Chi nhánh Hà Nội"
}

Response:
{
  "success": true,
  "bank_account": {
    "id": 1,
    "bank_code": "VCB",
    "bank_name": "Vietcombank",
    "account_number": "1234567890",
    "account_holder_name": "NGUYEN VAN A",
    "status": "pending",
    "is_verified": false
  }
}
```

**Get Bank Accounts**
```
GET /wallet/bank-accounts

Response:
{
  "success": true,
  "bank_accounts": [
    {
      "id": 1,
      "bank_code": "VCB",
      "bank_name": "Vietcombank",
      "account_number": "****7890",
      "account_holder_name": "NGUYEN VAN A",
      "is_verified": true,
      "is_default": true
    }
  ]
}
```

**Delete Bank Account**
```
DELETE /wallet/bank-accounts/:id

Response:
{
  "success": true,
  "message": "Bank account deleted successfully"
}
```

---

### 2. Withdrawal Operations

**Calculate Withdrawal Fee**
```
POST /wallet/withdrawal/calculate-fee

Request:
{
  "amount": 1000000
}

Response:
{
  "success": true,
  "amount": 1000000,
  "fee": 5000,
  "net_amount": 995000,
  "fee_percentage": 0.5
}
```

**Create Withdrawal Request**
```
POST /wallet/withdrawal

Request:
{
  "bank_account_id": 1,
  "amount": 1000000
}

Response:
{
  "success": true,
  "withdrawal": {
    "id": 123,
    "amount": 1000000,
    "fee": 5000,
    "net_amount": 995000,
    "status": "pending",
    "estimated_completion": "2026-01-24",
    "created_at": "2026-01-21T10:00:00Z"
  }
}
```

**Get Withdrawal History**
```
GET /wallet/withdrawal/history?page=1&limit=20

Response:
{
  "success": true,
  "withdrawals": [
    {
      "id": 123,
      "amount": 1000000,
      "fee": 5000,
      "net_amount": 995000,
      "status": "completed",
      "bank_account": {
        "bank_name": "Vietcombank",
        "account_number": "****7890"
      },
      "created_at": "2026-01-21T10:00:00Z",
      "completed_at": "2026-01-23T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

**Cancel Withdrawal**
```
POST /wallet/withdrawal/:id/cancel

Response:
{
  "success": true,
  "message": "Withdrawal cancelled. Amount refunded to wallet.",
  "refund_amount": 1000000
}
```

---

### 3. Admin APIs

**Get Pending Withdrawals**
```
GET /admin/withdrawals?status=pending&page=1&limit=50

Response:
{
  "success": true,
  "withdrawals": [
    {
      "id": 123,
      "user": {
        "id": 1,
        "name": "Nguyen Van A",
        "email": "user@example.com"
      },
      "amount": 1000000,
      "fee": 5000,
      "net_amount": 995000,
      "bank_account": {
        "bank_name": "Vietcombank",
        "account_number": "1234567890",
        "account_holder_name": "NGUYEN VAN A"
      },
      "status": "pending",
      "created_at": "2026-01-21T10:00:00Z"
    }
  ]
}
```

**Approve Withdrawal**
```
POST /admin/withdrawals/:id/approve

Request:
{
  "notes": "Verified and approved"
}

Response:
{
  "success": true,
  "message": "Withdrawal approved"
}
```

**Reject Withdrawal**
```
POST /admin/withdrawals/:id/reject

Request:
{
  "reason": "Invalid bank account information"
}

Response:
{
  "success": true,
  "message": "Withdrawal rejected and amount refunded"
}
```

**Mark as Completed**
```
POST /admin/withdrawals/:id/complete

Request:
{
  "bank_transaction_id": "FT2026012112345",
  "notes": "Transfer completed successfully"
}

Response:
{
  "success": true,
  "message": "Withdrawal marked as completed"
}
```

---

## 🔐 Security Measures

### 1. User Verification

**Email Verification:**
```javascript
if (!user.email_verified) {
  return res.status(403).json({
    message: 'Please verify your email before withdrawing'
  });
}
```

**Phone Verification:**
```javascript
if (!user.phone_verified) {
  return res.status(403).json({
    message: 'Please verify your phone number before withdrawing'
  });
}
```

**KYC for Large Amounts:**
```javascript
if (amount > 10000000 && !user.kyc_verified) {
  return res.status(403).json({
    message: 'KYC verification required for withdrawals over 10,000,000 VND'
  });
}
```

---

### 2. Fraud Detection

**Daily Limit Check:**
```javascript
const todayWithdrawals = await getTodayWithdrawals(userId);
if (todayWithdrawals + amount > DAILY_LIMIT) {
  return res.status(400).json({
    message: 'Daily withdrawal limit exceeded'
  });
}
```

**Suspicious Pattern Detection:**
```javascript
// Multiple withdrawals in short time
// New account with large withdrawal
// Mismatched account holder name
// Unusual withdrawal pattern
```

**IP Tracking:**
```javascript
// Log IP address for each withdrawal
// Alert on IP changes
// Block suspicious IPs
```

---

### 3. Bank Account Verification

**Name Matching:**
```javascript
const userFullName = normalizeVietnameseName(user.full_name);
const accountHolderName = normalizeVietnameseName(bankAccount.account_holder_name);

if (userFullName !== accountHolderName) {
  return res.status(400).json({
    message: 'Account holder name must match your registered name'
  });
}
```

**NAPAS Verification (Future):**
```javascript
// Integrate with NAPAS API to verify bank account
const isValid = await napasService.verifyBankAccount({
  bank_code: bankAccount.bank_code,
  account_number: bankAccount.account_number
});
```

---

## 📱 Frontend Design

### Withdrawal Form

```jsx
<WithdrawalForm>
  <BankAccountSelector
    accounts={bankAccounts}
    onSelect={handleBankSelect}
    onAddNew={handleAddBank}
  />
  
  <AmountInput
    value={amount}
    onChange={handleAmountChange}
    min={100000}
    max={50000000}
    balance={walletBalance}
  />
  
  <FeeCalculation
    amount={amount}
    fee={fee}
    netAmount={netAmount}
  />
  
  <ConfirmButton
    onClick={handleWithdraw}
    disabled={!isValid}
  >
    Rút tiền
  </ConfirmButton>
</WithdrawalForm>
```

### Bank Account Management

```jsx
<BankAccountList>
  {bankAccounts.map(account => (
    <BankAccountCard
      key={account.id}
      account={account}
      onSetDefault={handleSetDefault}
      onDelete={handleDelete}
    />
  ))}
  
  <AddBankAccountButton onClick={handleAddBank} />
</BankAccountList>
```

---

## 📊 Implementation Phases

### Phase 1: Basic Withdrawal (Week 1-2)

**Backend:**
- [ ] Create database tables
- [ ] Implement bank account CRUD
- [ ] Implement withdrawal creation
- [ ] Implement fee calculation
- [ ] Add validation rules

**Frontend:**
- [ ] Bank account management UI
- [ ] Withdrawal form
- [ ] Withdrawal history

**Testing:**
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

---

### Phase 2: Admin Panel (Week 3)

**Backend:**
- [ ] Admin withdrawal management APIs
- [ ] Approval/rejection logic
- [ ] Status updates
- [ ] Notifications

**Frontend:**
- [ ] Admin withdrawal dashboard
- [ ] Approval/rejection interface
- [ ] Batch processing UI

---

### Phase 3: Advanced Features (Week 4)

**Features:**
- [ ] Email notifications
- [ ] SMS notifications
- [ ] Withdrawal limits per tier
- [ ] Express processing
- [ ] Bank account verification (NAPAS)

---

### Phase 4: Optimization (Week 5)

**Improvements:**
- [ ] Performance optimization
- [ ] Caching
- [ ] Analytics
- [ ] Reporting
- [ ] Fraud detection

---

## 💰 Cost Analysis

### Development Costs

| Item | Effort | Cost (VND) |
|------|--------|------------|
| Backend Development | 40 hours | 20,000,000 |
| Frontend Development | 30 hours | 15,000,000 |
| Admin Panel | 20 hours | 10,000,000 |
| Testing & QA | 20 hours | 10,000,000 |
| **Total** | **110 hours** | **55,000,000** |

### Operational Costs

| Item | Monthly Cost (VND) |
|------|-------------------|
| Bank transfer fees | Variable |
| SMS notifications | 500,000 |
| Email service | 200,000 |
| Support staff | 15,000,000 |
| **Total** | **~15,700,000** |

---

## 🎯 Success Metrics

### KPIs

1. **Withdrawal Success Rate**
   - Target: > 95%
   - Measure: Completed / Total requests

2. **Average Processing Time**
   - Target: < 2 days
   - Measure: Completed_at - Created_at

3. **User Satisfaction**
   - Target: > 4.5/5
   - Measure: Post-withdrawal survey

4. **Fraud Rate**
   - Target: < 0.1%
   - Measure: Rejected for fraud / Total

---

## ⚠️ Risks & Mitigation

### Risk 1: Fraud

**Risk:** Users may attempt fraudulent withdrawals

**Mitigation:**
- Email/phone verification required
- KYC for large amounts
- Admin approval for first withdrawal
- Pattern detection algorithms

---

### Risk 2: Bank Transfer Failures

**Risk:** Bank transfers may fail

**Mitigation:**
- Retry mechanism
- Manual processing option
- Clear error messages
- Refund to wallet on failure

---

### Risk 3: Compliance

**Risk:** Regulatory compliance issues

**Mitigation:**
- Consult legal team
- Implement KYC/AML
- Transaction limits
- Audit trail

---

## 📚 References

### Vietnam Banking Regulations

- State Bank of Vietnam (SBV) regulations
- Anti-Money Laundering (AML) laws
- Know Your Customer (KYC) requirements
- Electronic payment regulations

### Technical Standards

- NAPAS (National Payment Corporation of Vietnam)
- ISO 20022 (Financial messaging)
- PCI DSS (Payment Card Industry Data Security Standard)

---

## ✅ Conclusion

### Recommendation

**Implement in phases:**

1. **Phase 1 (Priority):** Basic withdrawal with manual admin approval
2. **Phase 2:** Admin panel for efficient processing
3. **Phase 3:** Advanced features (notifications, verification)
4. **Phase 4:** Optimization and automation

### Timeline

- **Phase 1:** 2 weeks
- **Phase 2:** 1 week
- **Phase 3:** 1 week
- **Phase 4:** 1 week
- **Total:** 5 weeks

### Budget

- Development: 55,000,000 VND
- Monthly operational: 15,700,000 VND

---

**Status:** 📋 Ready for approval  
**Next Steps:** Get stakeholder approval and start Phase 1  
**Priority:** Medium (after VNPay/MoMo integration stabilizes)

**🎉 Withdrawal feature plan complete!**
