# Phase 2 Implementation Plan: Payment Gateway Integration

**Date:** 2026-01-19  
**Status:** 🚀 Ready to Start  
**Phase:** 2/4

---

## 📋 Overview

Phase 2 tập trung vào tích hợp **payment gateways thực tế** để user có thể nạp tiền vào ví.

### Goals
- ✅ Tích hợp VNPay (Vietnam)
- ✅ Tích hợp MoMo (Vietnam)
- ⚠️ Tích hợp Stripe (International) - Optional
- ✅ Xử lý webhooks an toàn
- ✅ Verify payment signatures
- ✅ Error handling & retry logic

---

## 🎯 Priority Order

1. **VNPay** (Highest Priority) - Phổ biến nhất VN
2. **MoMo** (High Priority) - Ví điện tử #1 VN
3. **Stripe** (Medium Priority) - Cho thị trường quốc tế

---

## 📦 Deliverables

### 1. Payment Service Layer
- `services/paymentService.js` - Abstract payment interface
- `services/vnpayService.js` - VNPay integration
- `services/momoService.js` - MoMo integration
- `services/stripeService.js` - Stripe integration (optional)

### 2. Payment Controller Updates
- Update `walletController.js` với real payment URLs
- Implement webhook handlers
- Add signature verification

### 3. Environment Configuration
- Add payment gateway credentials to `.env`
- Configure webhook URLs
- Set up sandbox/production modes

### 4. Database Updates
- Store payment gateway responses
- Log all payment attempts
- Track webhook deliveries

---

## 🔧 Implementation Steps

### Step 1: VNPay Integration (Week 1)

#### 1.1 Setup VNPay Account
```
1. Đăng ký tài khoản sandbox: https://sandbox.vnpayment.vn/
2. Lấy credentials:
   - TMN_CODE (Terminal Code)
   - HASH_SECRET (Secret Key)
3. Configure return URL & IPN URL
```

#### 1.2 Install Dependencies
```bash
npm install crypto-js moment querystring
```

#### 1.3 Create VNPay Service
**File:** `backend/services/vnpayService.js`

```javascript
import crypto from 'crypto';
import querystring from 'querystring';
import moment from 'moment';

class VNPayService {
  constructor() {
    this.vnp_TmnCode = process.env.VNPAY_TMN_CODE;
    this.vnp_HashSecret = process.env.VNPAY_HASH_SECRET;
    this.vnp_Url = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    this.vnp_ReturnUrl = process.env.VNPAY_RETURN_URL;
  }

  createPaymentUrl(orderId, amount, orderInfo, ipAddr) {
    const date = new Date();
    const createDate = moment(date).format('YYYYMMDDHHmmss');
    
    let vnp_Params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.vnp_TmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: amount * 100, // VNPay uses smallest unit
      vnp_ReturnUrl: this.vnp_ReturnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate
    };

    // Sort params
    vnp_Params = this.sortObject(vnp_Params);

    // Create signature
    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    vnp_Params['vnp_SecureHash'] = signed;

    // Build URL
    const paymentUrl = this.vnp_Url + '?' + querystring.stringify(vnp_Params, { encode: false });
    return paymentUrl;
  }

  verifyReturnUrl(vnp_Params) {
    const secureHash = vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    const sortedParams = this.sortObject(vnp_Params);
    const signData = querystring.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    return secureHash === signed;
  }

  sortObject(obj) {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    keys.forEach(key => {
      sorted[key] = obj[key];
    });
    return sorted;
  }
}

export default new VNPayService();
```

#### 1.4 Update Wallet Controller
```javascript
// In walletController.js
import vnpayService from '../services/vnpayService.js';

export async function createDeposit(req, res) {
  // ... existing code ...
  
  if (payment_method === 'vnpay') {
    const orderId = `DEPOSIT_${transactionId}_${Date.now()}`;
    const orderInfo = `Nap tien vao vi - Transaction ${transactionId}`;
    const ipAddr = req.ip || '127.0.0.1';
    
    const paymentUrl = vnpayService.createPaymentUrl(
      orderId,
      amount,
      orderInfo,
      ipAddr
    );
    
    return res.json({
      message: 'Deposit initiated',
      transaction_id: transactionId,
      payment_url: paymentUrl,
      amount,
      currency: 'VND',
      payment_method
    });
  }
}
```

#### 1.5 Create Webhook Handler
```javascript
export async function vnpayCallback(req, res) {
  const vnp_Params = req.query;
  
  // Verify signature
  if (!vnpayService.verifyReturnUrl(vnp_Params)) {
    return res.status(400).json({ message: 'Invalid signature' });
  }
  
  const transactionId = extractTransactionId(vnp_Params.vnp_TxnRef);
  const responseCode = vnp_Params.vnp_ResponseCode;
  
  // Update transaction
  if (responseCode === '00') {
    await processPaymentCallback({
      transaction_id: transactionId,
      status: 'success',
      gateway_id: vnp_Params.vnp_TransactionNo
    });
  } else {
    await processPaymentCallback({
      transaction_id: transactionId,
      status: 'failed',
      gateway_id: vnp_Params.vnp_TransactionNo
    });
  }
  
  // Redirect to frontend
  const frontendUrl = process.env.FRONTEND_URL;
  res.redirect(`${frontendUrl}/wallet?status=${responseCode === '00' ? 'success' : 'failed'}`);
}
```

---

### Step 2: MoMo Integration (Week 2)

#### 2.1 Setup MoMo Account
```
1. Đăng ký: https://business.momo.vn/
2. Lấy credentials:
   - PARTNER_CODE
   - ACCESS_KEY
   - SECRET_KEY
3. Configure IPN URL
```

#### 2.2 Create MoMo Service
**File:** `backend/services/momoService.js`

```javascript
import crypto from 'crypto';
import axios from 'axios';

class MoMoService {
  constructor() {
    this.partnerCode = process.env.MOMO_PARTNER_CODE;
    this.accessKey = process.env.MOMO_ACCESS_KEY;
    this.secretKey = process.env.MOMO_SECRET_KEY;
    this.endpoint = process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create';
    this.redirectUrl = process.env.MOMO_REDIRECT_URL;
    this.ipnUrl = process.env.MOMO_IPN_URL;
  }

  async createPayment(orderId, amount, orderInfo) {
    const requestId = orderId;
    const extraData = '';
    const orderGroupId = '';
    const autoCapture = true;
    const lang = 'vi';

    // Create raw signature
    const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${this.ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${this.partnerCode}&redirectUrl=${this.redirectUrl}&requestId=${requestId}&requestType=captureWallet`;

    // Generate signature
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = {
      partnerCode: this.partnerCode,
      partnerName: 'English Chatbot',
      storeId: 'EnglishChatbot',
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl: this.redirectUrl,
      ipnUrl: this.ipnUrl,
      lang,
      requestType: 'captureWallet',
      autoCapture,
      extraData,
      orderGroupId,
      signature
    };

    try {
      const response = await axios.post(this.endpoint, requestBody);
      return response.data;
    } catch (error) {
      console.error('MoMo API Error:', error);
      throw error;
    }
  }

  verifySignature(data) {
    const {
      partnerCode,
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature
    } = data;

    const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(rawSignature)
      .digest('hex');

    return signature === expectedSignature;
  }
}

export default new MoMoService();
```

---

### Step 3: Environment Configuration

#### 3.1 Update `.env`
```env
# VNPay Configuration
VNPAY_TMN_CODE=your_terminal_code
VNPAY_HASH_SECRET=your_hash_secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:3001/wallet/vnpay/callback

# MoMo Configuration
MOMO_PARTNER_CODE=your_partner_code
MOMO_ACCESS_KEY=your_access_key
MOMO_SECRET_KEY=your_secret_key
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_REDIRECT_URL=http://localhost:3000/wallet?payment=momo
MOMO_IPN_URL=http://localhost:3001/wallet/momo/ipn

# Stripe Configuration (Optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

### Step 4: Routes Update

#### 4.1 Add Payment Gateway Routes
**File:** `backend/routes/wallet.js`

```javascript
// VNPay routes
router.get('/vnpay/callback', vnpayCallback);
router.post('/vnpay/ipn', vnpayIPN);

// MoMo routes
router.get('/momo/callback', momoCallback);
router.post('/momo/ipn', momoIPN);

// Stripe routes (optional)
router.post('/stripe/webhook', stripeWebhook);
```

---

## 🧪 Testing Plan

### Test VNPay
1. Create deposit with VNPay
2. Complete payment in sandbox
3. Verify webhook received
4. Check balance updated

### Test MoMo
1. Create deposit with MoMo
2. Complete payment in app
3. Verify IPN received
4. Check balance updated

### Test Error Cases
1. Invalid signature
2. Timeout
3. Insufficient funds
4. Duplicate transactions

---

## 📊 Success Criteria

- [ ] VNPay integration working
- [ ] MoMo integration working
- [ ] Webhooks processed correctly
- [ ] Signatures verified
- [ ] Balance updates correctly
- [ ] Error handling works
- [ ] Logs comprehensive
- [ ] Frontend redirects work

---

## 🚀 Timeline

- **Week 1:** VNPay integration
- **Week 2:** MoMo integration
- **Week 3:** Testing & bug fixes
- **Week 4:** Stripe (optional) & documentation

---

## 📚 Resources

- VNPay Docs: https://sandbox.vnpayment.vn/apis/
- MoMo Docs: https://developers.momo.vn/
- Stripe Docs: https://stripe.com/docs/payments

---

**Ready to start?** Begin with VNPay integration!
