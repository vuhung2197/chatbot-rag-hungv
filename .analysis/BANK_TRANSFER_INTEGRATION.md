# Bank Transfer Integration - Third-Party Services

**Date:** 2026-01-21  
**Purpose:** Tích hợp dịch vụ chuyển khoản tự động  
**Status:** 📋 Research & Planning  

---

## 🎯 Overview

Để rút tiền tự động về tài khoản ngân hàng, cần tích hợp với các dịch vụ bên thứ 3 hỗ trợ chuyển khoản (disbursement/payout).

---

## 🏦 Available Services in Vietnam

### 1. NAPAS (National Payment Corporation of Vietnam)

**Overview:**
- Tổ chức thanh toán quốc gia
- Kết nối tất cả ngân hàng Việt Nam
- Dịch vụ chuyển khoản liên ngân hàng

**Services:**
- **NAPAS 247:** Chuyển khoản 24/7
- **Citad:** Chuyển khoản trong ngày
- **IBPS:** Internet Banking Payment System

**Requirements:**
- Đăng ký doanh nghiệp
- Hợp đồng với NAPAS
- Tài khoản doanh nghiệp tại ngân hàng
- Chứng thư số (Digital Certificate)

**Pricing:**
- Setup fee: ~50,000,000 VND
- Monthly fee: ~5,000,000 VND
- Transaction fee: ~2,000 - 5,000 VND/transaction

**Documentation:**
- Website: https://www.napas.com.vn/
- Contact: support@napas.com.vn

---

### 2. VNPay Disbursement

**Overview:**
- VNPay cung cấp dịch vụ chi hộ (disbursement)
- Tích hợp dễ dàng nếu đã dùng VNPay payment

**Features:**
- Chuyển khoản tự động
- Hỗ trợ tất cả ngân hàng VN
- API đơn giản
- Dashboard quản lý

**Requirements:**
- Tài khoản VNPay merchant
- Tài khoản doanh nghiệp
- KYC doanh nghiệp
- Nạp tiền vào tài khoản VNPay

**Pricing:**
- Setup: Free (nếu đã có VNPay payment)
- Transaction fee: ~3,000 - 5,000 VND
- No monthly fee

**API Endpoint:**
```
https://sandbox.vnpayment.vn/merchant_webapi/api/transaction
```

**Documentation:**
- https://sandbox.vnpayment.vn/apis/docs/huong-dan-tich-hop/

---

### 3. MoMo Business

**Overview:**
- MoMo cung cấp dịch vụ chi hộ cho doanh nghiệp
- Chuyển tiền về ví MoMo hoặc tài khoản ngân hàng

**Features:**
- Chuyển về ví MoMo: Instant
- Chuyển về ngân hàng: 1-2 ngày
- API integration
- Bulk transfer support

**Requirements:**
- Tài khoản MoMo Business
- KYC doanh nghiệp
- Nạp tiền vào tài khoản MoMo

**Pricing:**
- Transaction fee: ~2% (MoMo wallet)
- Transaction fee: ~5,000 VND (bank transfer)

**Documentation:**
- https://developers.momo.vn/v3/docs/disbursement/

---

### 4. Payoo

**Overview:**
- Nền tảng thanh toán và chi hộ
- Hỗ trợ nhiều ngân hàng

**Features:**
- Chuyển khoản tự động
- Bulk payment
- API integration

**Requirements:**
- Đăng ký doanh nghiệp
- Hợp đồng với Payoo
- Tài khoản doanh nghiệp

**Pricing:**
- Setup fee: Negotiable
- Transaction fee: ~3,000 - 5,000 VND

**Documentation:**
- https://www.payoo.vn/

---

### 5. OnePay

**Overview:**
- Cổng thanh toán và dịch vụ chi hộ
- Thuộc OneFin

**Features:**
- Disbursement API
- Multi-bank support
- Real-time processing

**Requirements:**
- Merchant account
- Business verification
- Contract

**Pricing:**
- Contact for pricing

**Documentation:**
- https://onepay.vn/

---

## 🎯 Recommended Solution: VNPay Disbursement

### Why VNPay?

**Pros:**
- ✅ Already integrated VNPay payment
- ✅ Easy to add disbursement
- ✅ Competitive pricing
- ✅ Good documentation
- ✅ Reliable service
- ✅ No monthly fee

**Cons:**
- ❌ Requires business account
- ❌ Need to maintain balance
- ❌ 1-2 day processing time

---

## 🔧 VNPay Disbursement Integration

### Step 1: Register for Disbursement Service

**Requirements:**
1. **Existing VNPay Merchant Account**
   - Already have: ✅ (for payment)
   - Need to enable disbursement feature

2. **Business Documents:**
   - Business license (Giấy phép kinh doanh)
   - Tax code (Mã số thuế)
   - Bank account statement
   - Legal representative ID

3. **Contract:**
   - Sign disbursement service contract
   - Agree to terms and fees

**Contact VNPay:**
- Email: merchant.support@vnpay.vn
- Hotline: 1900 55 55 77
- Request: Enable disbursement service

---

### Step 2: Configuration

**Get Credentials:**
```bash
# Same as payment credentials
VNPAY_TMN_CODE=6ZY4FNRE
VNPAY_HASH_SECRET=11MROFBPPE8BFKF5NBL5K2UVFERO77L1
VNPAY_API_URL=https://sandbox.vnpayment.vn/merchant_webapi/api/transaction
```

**Add to .env:**
```bash
# VNPay Disbursement
VNPAY_DISBURSEMENT_URL=https://sandbox.vnpayment.vn/merchant_webapi/api/transaction
VNPAY_DISBURSEMENT_ENABLED=true
```

---

### Step 3: API Implementation

**Disbursement Request:**

```javascript
// vnpayDisbursementService.js

import crypto from 'crypto';
import axios from 'axios';
import moment from 'moment-timezone';

class VNPayDisbursementService {
  constructor() {
    this.vnp_TmnCode = process.env.VNPAY_TMN_CODE;
    this.vnp_HashSecret = process.env.VNPAY_HASH_SECRET;
    this.vnp_ApiUrl = process.env.VNPAY_DISBURSEMENT_URL;
  }

  /**
   * Create disbursement (transfer to bank account)
   */
  async createDisbursement({
    orderId,
    amount,
    bankCode,
    accountNumber,
    accountName,
    description
  }) {
    try {
      // Build parameters
      const createDate = moment().tz('Asia/Ho_Chi_Minh').format('YYYYMMDDHHmmss');
      const requestId = `WITHDRAW_${orderId}_${Date.now()}`;

      let params = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay_and_create',
        vnp_TmnCode: this.vnp_TmnCode,
        vnp_Amount: Math.round(amount * 100), // VND * 100
        vnp_CreateDate: createDate,
        vnp_CurrCode: 'VND',
        vnp_OrderInfo: description,
        vnp_OrderType: 'other',
        vnp_RequestId: requestId,
        vnp_TxnRef: orderId,
        
        // Bank account info
        vnp_BankCode: bankCode,
        vnp_AccountNo: accountNumber,
        vnp_AccountName: accountName,
        vnp_AccountType: '1', // 1: Individual, 2: Corporate
      };

      // Sort parameters
      params = this.sortObject(params);

      // Create signature
      const signData = new URLSearchParams(params).toString();
      const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
      const signature = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
      params['vnp_SecureHash'] = signature;

      // Make API request
      const response = await axios.post(this.vnp_ApiUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log('✅ VNPay disbursement created:', response.data);

      return {
        success: response.data.vnp_ResponseCode === '00',
        transactionNo: response.data.vnp_TransactionNo,
        message: this.getResponseMessage(response.data.vnp_ResponseCode),
        data: response.data
      };

    } catch (error) {
      console.error('❌ Error creating VNPay disbursement:', error);
      throw error;
    }
  }

  /**
   * Query disbursement status
   */
  async queryDisbursement(orderId, transactionDate) {
    try {
      const createDate = moment().tz('Asia/Ho_Chi_Minh').format('YYYYMMDDHHmmss');
      const requestId = `QUERY_${orderId}_${Date.now()}`;

      let params = {
        vnp_Version: '2.1.0',
        vnp_Command: 'querydr',
        vnp_TmnCode: this.vnp_TmnCode,
        vnp_TxnRef: orderId,
        vnp_OrderInfo: `Query disbursement ${orderId}`,
        vnp_TransactionDate: transactionDate,
        vnp_CreateDate: createDate,
        vnp_IpAddr: '127.0.0.1',
        vnp_RequestId: requestId
      };

      // Sort and sign
      params = this.sortObject(params);
      const signData = new URLSearchParams(params).toString();
      const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
      const signature = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
      params['vnp_SecureHash'] = signature;

      // Make API request
      const response = await axios.get(this.vnp_ApiUrl, {
        params,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return {
        success: response.data.vnp_ResponseCode === '00',
        status: this.getTransactionStatus(response.data.vnp_TransactionStatus),
        data: response.data
      };

    } catch (error) {
      console.error('❌ Error querying VNPay disbursement:', error);
      throw error;
    }
  }

  sortObject(obj) {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    keys.forEach(key => {
      sorted[key] = obj[key];
    });
    return sorted;
  }

  getResponseMessage(code) {
    const messages = {
      '00': 'Success',
      '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
      '09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
      '10': 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
      '11': 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán.',
      '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.',
      '13': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP).',
      '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
      '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
      '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.',
      '75': 'Ngân hàng thanh toán đang bảo trì.',
      '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định.',
      '99': 'Các lỗi khác'
    };
    return messages[code] || 'Unknown error';
  }

  getTransactionStatus(status) {
    const statuses = {
      '0': 'pending',
      '1': 'completed',
      '2': 'failed'
    };
    return statuses[status] || 'unknown';
  }
}

export default new VNPayDisbursementService();
```

---

### Step 4: Controller Implementation

```javascript
// withdrawalController.js

import pool from '../db.js';
import vnpayDisbursementService from '../services/vnpayDisbursementService.js';

/**
 * Process withdrawal to bank account
 */
export async function processWithdrawal(req, res) {
  const connection = await pool.getConnection();
  
  try {
    const { withdrawalRequestId } = req.body;
    const adminId = req.user.id;

    // Get withdrawal request
    const [requests] = await connection.execute(
      `SELECT wr.*, ba.bank_code, ba.account_number, ba.account_holder_name,
              wt.amount, wt.id as transaction_id
       FROM withdrawal_requests wr
       JOIN bank_accounts ba ON wr.bank_account_id = ba.id
       JOIN wallet_transactions wt ON wr.transaction_id = wt.id
       WHERE wr.id = ? AND wr.status = 'approved'`,
      [withdrawalRequestId]
    );

    if (requests.length === 0) {
      return res.status(404).json({
        message: 'Withdrawal request not found or not approved'
      });
    }

    const request = requests[0];

    // Create VNPay disbursement
    const result = await vnpayDisbursementService.createDisbursement({
      orderId: `WITHDRAW_${request.id}_${Date.now()}`,
      amount: request.net_amount,
      bankCode: request.bank_code,
      accountNumber: request.account_number,
      accountName: request.account_holder_name,
      description: `Withdrawal ${request.id}`
    });

    if (!result.success) {
      // Update status to failed
      await connection.execute(
        `UPDATE withdrawal_requests 
         SET status = 'failed', processing_notes = ?
         WHERE id = ?`,
        [result.message, request.id]
      );

      return res.status(400).json({
        message: 'Disbursement failed',
        error: result.message
      });
    }

    // Update status to processing
    await connection.execute(
      `UPDATE withdrawal_requests 
       SET status = 'processing',
           processed_by = ?,
           processed_at = NOW(),
           bank_transaction_id = ?
       WHERE id = ?`,
      [adminId, result.transactionNo, request.id]
    );

    res.json({
      success: true,
      message: 'Withdrawal processing started',
      transactionNo: result.transactionNo
    });

  } catch (error) {
    console.error('❌ Error processing withdrawal:', error);
    res.status(500).json({
      message: 'Error processing withdrawal',
      error: error.message
    });
  } finally {
    connection.release();
  }
}
```

---

## 📋 Bank Code Reference

### Vietnam Bank Codes

```javascript
const BANK_CODES = {
  'VCB': 'Vietcombank',
  'VTB': 'VietinBank',
  'BIDV': 'BIDV',
  'AGR': 'Agribank',
  'TCB': 'Techcombank',
  'MB': 'MB Bank',
  'ACB': 'ACB',
  'STB': 'Sacombank',
  'VPB': 'VPBank',
  'TPB': 'TPBank',
  'CTG': 'VietinBank',
  'EIB': 'Eximbank',
  'HDB': 'HDBank',
  'MSB': 'MSB',
  'NAB': 'Nam A Bank',
  'OCB': 'OCB',
  'SHB': 'SHB',
  'VAB': 'VietABank',
  'VIB': 'VIB',
  'LPB': 'LienVietPostBank',
  'PGB': 'PGBank',
  'GPB': 'GPBank',
  'ABB': 'ABBANK',
  'BAB': 'BacABank',
  'BVB': 'BaoVietBank',
  'CBB': 'CBBank',
  'DAB': 'DongABank',
  'KLB': 'KienLongBank',
  'NCB': 'NCB',
  'OJB': 'OceanBank',
  'PVB': 'PVcomBank',
  'SCB': 'SCB',
  'SEA': 'SeABank',
  'SGB': 'Saigonbank',
  'VCCB': 'VietCapitalBank',
  'WRB': 'WooriBank'
};
```

---

## 🔐 Security Considerations

### 1. Credential Security

```bash
# .env
VNPAY_TMN_CODE=your_merchant_code
VNPAY_HASH_SECRET=your_secret_key
VNPAY_DISBURSEMENT_URL=https://sandbox.vnpayment.vn/merchant_webapi/api/transaction

# Production
VNPAY_DISBURSEMENT_URL=https://business.vnpay.vn/merchant_webapi/api/transaction
```

### 2. IP Whitelist

**VNPay requires IP whitelist:**
- Register your server IP with VNPay
- Only whitelisted IPs can make API calls

### 3. Signature Verification

**Always verify response signature:**
```javascript
function verifyResponseSignature(responseData) {
  const secureHash = responseData.vnp_SecureHash;
  delete responseData.vnp_SecureHash;
  
  const sortedParams = sortObject(responseData);
  const signData = new URLSearchParams(sortedParams).toString();
  const hmac = crypto.createHmac('sha512', VNPAY_HASH_SECRET);
  const signature = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  
  return secureHash === signature;
}
```

---

## 💰 Pricing Comparison

| Service | Setup Fee | Monthly Fee | Transaction Fee | Processing Time |
|---------|-----------|-------------|-----------------|-----------------|
| **VNPay** | Free* | Free | 3,000-5,000 VND | 1-2 days |
| **MoMo** | Free | Free | 5,000 VND | 1-2 days |
| **NAPAS** | 50M VND | 5M VND | 2,000-5,000 VND | Same day |
| **Payoo** | Negotiable | Negotiable | 3,000-5,000 VND | 1-2 days |

*Free if already have VNPay payment account

---

## 📝 Registration Process

### VNPay Disbursement Registration

**Step 1: Contact VNPay**
```
Email: merchant.support@vnpay.vn
Subject: Request to enable disbursement service
Body:
- Merchant code: 6ZY4FNRE
- Business name: [Your company]
- Request: Enable disbursement/payout service
```

**Step 2: Submit Documents**
- Business license
- Tax registration certificate
- Bank account statement
- Legal representative ID
- Disbursement service agreement

**Step 3: Account Setup**
- VNPay reviews documents (3-5 days)
- Sign contract
- Receive disbursement credentials
- Test in sandbox

**Step 4: Go Live**
- Test transactions in sandbox
- Request production access
- Update credentials
- Start processing

---

## 🧪 Testing

### Sandbox Testing

**Test Bank Accounts:**
```javascript
// VNPay provides test bank accounts
const TEST_ACCOUNTS = {
  bank_code: 'VCB',
  account_number: '9704198526191432198',
  account_name: 'NGUYEN VAN A',
  // This will always succeed in sandbox
};
```

**Test Scenarios:**
1. Successful disbursement
2. Insufficient balance
3. Invalid bank account
4. Network timeout
5. Duplicate transaction

---

## ✅ Implementation Checklist

### Prerequisites
- [ ] VNPay merchant account (✅ Already have)
- [ ] Business license
- [ ] Tax registration
- [ ] Bank account statement

### Registration
- [ ] Contact VNPay support
- [ ] Submit documents
- [ ] Sign contract
- [ ] Receive credentials

### Development
- [ ] Create disbursement service
- [ ] Implement API calls
- [ ] Add signature generation
- [ ] Add error handling
- [ ] Create controller
- [ ] Add routes

### Testing
- [ ] Test in sandbox
- [ ] Test all scenarios
- [ ] Verify signatures
- [ ] Check error handling

### Production
- [ ] Update to production URL
- [ ] Update credentials
- [ ] IP whitelist
- [ ] Go live

---

## 🎯 Recommendation

**Use VNPay Disbursement because:**

1. ✅ **Already integrated** - Same credentials as payment
2. ✅ **No setup fee** - Free if you have payment account
3. ✅ **Good pricing** - 3,000-5,000 VND per transaction
4. ✅ **Reliable** - Trusted service
5. ✅ **Good support** - Vietnamese support team
6. ✅ **Easy integration** - Similar to payment API

**Next Steps:**
1. Contact VNPay to enable disbursement
2. Submit required documents
3. Implement API integration
4. Test in sandbox
5. Go live

---

**Status:** 📋 Ready to start  
**Priority:** High (after withdrawal feature backend)  
**Timeline:** 1-2 weeks (including VNPay approval)

**🎉 Integration plan complete!**
