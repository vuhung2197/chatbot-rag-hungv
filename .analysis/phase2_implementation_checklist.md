# Phase 2 Implementation Checklist

**Date:** 2026-01-19  
**Status:** 🚀 Ready to Start  
**Estimated Time:** 2-3 weeks

---

## 📋 Pre-Implementation Checklist

### ✅ Prerequisites (Must Complete First)

- [x] Phase 1 completed and tested
- [x] Database schema created
- [x] Wallet API endpoints working
- [ ] **Register for payment gateway sandbox accounts**
  - [ ] VNPay sandbox account
  - [ ] MoMo test account
  - [ ] (Optional) Stripe test account
- [ ] **Install required dependencies**
- [ ] **Configure environment variables**
- [ ] **Setup ngrok for webhook testing** (local development)

---

## 🎯 Implementation Plan

### Week 1: VNPay Integration

#### Day 1-2: Setup & Service Layer
- [ ] Register VNPay sandbox account
- [ ] Get credentials (TMN_CODE, HASH_SECRET)
- [ ] Install dependencies: `moment`, `querystring`
- [ ] Create `services/vnpayService.js`
- [ ] Implement payment URL generation
- [ ] Implement signature verification

#### Day 3-4: Controller Integration
- [ ] Update `walletController.js` for VNPay
- [ ] Create VNPay callback handler
- [ ] Create VNPay IPN handler
- [ ] Add routes for VNPay callbacks
- [ ] Test payment URL generation

#### Day 5: Testing
- [ ] Test with VNPay sandbox
- [ ] Test successful payment flow
- [ ] Test failed payment flow
- [ ] Test signature verification
- [ ] Test webhook handling

---

### Week 2: MoMo Integration

#### Day 1-2: Setup & Service Layer
- [ ] Register MoMo business account
- [ ] Get credentials (PARTNER_CODE, ACCESS_KEY, SECRET_KEY)
- [ ] Create `services/momoService.js`
- [ ] Implement payment creation
- [ ] Implement signature verification

#### Day 3-4: Controller Integration
- [ ] Update `walletController.js` for MoMo
- [ ] Create MoMo callback handler
- [ ] Create MoMo IPN handler
- [ ] Add routes for MoMo callbacks
- [ ] Test payment creation

#### Day 5: Testing
- [ ] Test with MoMo test environment
- [ ] Test QR code payment
- [ ] Test app payment
- [ ] Test IPN handling
- [ ] Test error scenarios

---

### Week 3: Polish & Documentation

#### Day 1-2: Error Handling & Logging
- [ ] Add comprehensive error handling
- [ ] Add payment logging
- [ ] Add retry logic for failed webhooks
- [ ] Add transaction status tracking

#### Day 3-4: Frontend Integration
- [ ] Update frontend to show payment methods
- [ ] Add payment redirect handling
- [ ] Add payment status display
- [ ] Add loading states

#### Day 5: Testing & Documentation
- [ ] End-to-end testing
- [ ] Load testing
- [ ] Update API documentation
- [ ] Create deployment guide

---

## 🔧 Technical Tasks

### 1. Install Dependencies

```bash
cd backend
npm install moment querystring
```

### 2. Create Service Files

```
backend/
├── services/
│   ├── paymentService.js      # Abstract interface
│   ├── vnpayService.js        # VNPay implementation
│   └── momoService.js         # MoMo implementation
```

### 3. Update Environment Variables

```env
# VNPay Configuration
VNPAY_TMN_CODE=
VNPAY_HASH_SECRET=
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:3001/wallet/vnpay/callback

# MoMo Configuration
MOMO_PARTNER_CODE=
MOMO_ACCESS_KEY=
MOMO_SECRET_KEY=
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_REDIRECT_URL=http://localhost:3000/wallet?payment=momo
MOMO_IPN_URL=http://localhost:3001/wallet/momo/ipn
```

### 4. Setup Ngrok (for local webhook testing)

```bash
# Install ngrok
choco install ngrok

# Start ngrok
ngrok http 3001

# Update webhook URLs with ngrok URL
# Example: https://abc123.ngrok.io/wallet/vnpay/callback
```

---

## 📚 Resources Needed

### VNPay
- [ ] Sandbox account: https://sandbox.vnpayment.vn/
- [ ] API Documentation: https://sandbox.vnpayment.vn/apis/
- [ ] Test cards: https://sandbox.vnpayment.vn/apis/docs/huong-dan-test/

### MoMo
- [ ] Business account: https://business.momo.vn/
- [ ] Developer docs: https://developers.momo.vn/
- [ ] Test environment: https://test-payment.momo.vn/

### Stripe (Optional)
- [ ] Test account: https://dashboard.stripe.com/test/
- [ ] API docs: https://stripe.com/docs/payments
- [ ] Test cards: https://stripe.com/docs/testing

---

## 🧪 Testing Strategy

### Unit Tests
- [ ] Test VNPay signature generation
- [ ] Test VNPay signature verification
- [ ] Test MoMo signature generation
- [ ] Test MoMo signature verification
- [ ] Test payment URL generation

### Integration Tests
- [ ] Test VNPay payment flow
- [ ] Test MoMo payment flow
- [ ] Test webhook handling
- [ ] Test concurrent payments
- [ ] Test duplicate transaction prevention

### Manual Tests
- [ ] Complete payment with VNPay
- [ ] Complete payment with MoMo
- [ ] Cancel payment
- [ ] Timeout scenario
- [ ] Invalid signature handling

---

## 🚨 Risk Mitigation

### Potential Issues & Solutions

| Risk | Impact | Mitigation |
|------|--------|------------|
| Webhook not received | High | Implement retry logic, add manual verification |
| Invalid signature | High | Log all signature attempts, add debugging |
| Duplicate payments | Critical | Use idempotency keys, check transaction status |
| Timeout | Medium | Set appropriate timeouts, add status polling |
| Currency mismatch | Medium | Validate currency before payment |

---

## 📊 Success Criteria

- [ ] VNPay payments work end-to-end
- [ ] MoMo payments work end-to-end
- [ ] Webhooks processed correctly 100% of time
- [ ] No duplicate transactions
- [ ] All signatures verified correctly
- [ ] Balance updates accurately
- [ ] Error messages are clear
- [ ] Logs are comprehensive
- [ ] Documentation is complete

---

## 🎯 Next Immediate Steps

### Step 1: Register Accounts (Today)
```
1. Go to https://sandbox.vnpayment.vn/
2. Register for sandbox account
3. Get TMN_CODE and HASH_SECRET
4. Save credentials securely
```

### Step 2: Install Dependencies (Today)
```bash
cd backend
npm install moment querystring
```

### Step 3: Create Base Service (Today)
```bash
# Create services directory
mkdir backend/services

# Create payment service interface
touch backend/services/paymentService.js
```

### Step 4: Implement VNPay Service (Tomorrow)
```
Follow the implementation guide in:
.analysis/phase2_payment_gateway_plan.md
```

---

## 📝 Notes

### Important Considerations

1. **Security**
   - Never commit credentials to git
   - Always verify signatures
   - Use HTTPS for webhooks
   - Log all payment attempts

2. **Testing**
   - Use sandbox/test environments only
   - Never use real money in development
   - Test all error scenarios
   - Test with different amounts

3. **Monitoring**
   - Log all payment attempts
   - Monitor webhook delivery
   - Track failed transactions
   - Set up alerts for failures

4. **Compliance**
   - Follow PCI DSS guidelines
   - Store minimal payment data
   - Encrypt sensitive data
   - Comply with local regulations

---

## ✅ Ready to Start?

**Current Status:** All prerequisites met ✅

**Next Action:** Register for VNPay sandbox account

**Estimated Completion:** 3 weeks from start

**Dependencies:** None - can start immediately

---

**Let's begin!** 🚀
