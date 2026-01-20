# VNPay Data Debugging - Enhanced Logging

**Date:** 2026-01-20  
**Status:** ✅ Logging Added  
**Purpose:** Debug VNPay payment parameters

---

## 🔍 What Was Added

### Enhanced Logging in vnpayService.js

**Location:** `backend/services/vnpayService.js` lines 85-98

**Added Logs:**
```javascript
console.log('🔍 VNPay Parameters:', {
    orderId,
    amount: amount,                    // Original amount (VND)
    vnp_Amount: vnp_Params.vnp_Amount, // VNPay amount (VND * 100)
    vnp_TmnCode: vnp_Params.vnp_TmnCode,
    vnp_ReturnUrl: vnp_Params.vnp_ReturnUrl,
    vnp_IpAddr: vnp_Params.vnp_IpAddr,
    vnp_CreateDate: vnp_Params.vnp_CreateDate,
    vnp_Locale: vnp_Params.vnp_Locale,
    signDataLength: signData.length,
    hasSecureHash: !!vnp_Params.vnp_SecureHash
});
console.log('🔗 Payment URL:', paymentUrl.substring(0, 150) + '...');
```

---

## 📊 What to Check

### 1. Amount Conversion
```javascript
amount: 100000          // Input (100,000 VND)
vnp_Amount: 10000000    // VNPay format (100,000 * 100)
```

**Correct:** VNPay requires amount in smallest unit (multiply by 100)

### 2. TMN Code
```javascript
vnp_TmnCode: '6ZY4FNRE'  // From .env
```

**Check:** Must match VNPay merchant account

### 3. Return URL
```javascript
vnp_ReturnUrl: 'http://localhost:3001/wallet/vnpay/return'
```

**Check:** 
- ✅ Must be accessible by VNPay
- ✅ Must match configured URL in VNPay dashboard
- ❌ `localhost` won't work in production (use ngrok or public URL)

### 4. IP Address
```javascript
vnp_IpAddr: '127.0.0.1'  // Should be IPv4
```

**Check:**
- ✅ Must be IPv4 format
- ✅ Converted from IPv6 if needed

### 5. Create Date
```javascript
vnp_CreateDate: '20260120161234'  // YYYYMMDDHHmmss
```

**Check:** Must be current timestamp in correct format

### 6. Locale
```javascript
vnp_Locale: 'vn'  // Vietnamese
```

**Options:** `vn` or `en`

### 7. Secure Hash
```javascript
hasSecureHash: true  // Must be present
```

**Check:** Signature must be generated correctly

---

## 🧪 How to Test

### Step 1: Make a Deposit
1. Open frontend: `http://localhost:3000`
2. Go to Profile → Wallet
3. Click "Nạp tiền" (Deposit)
4. Enter amount: 100000 VND
5. Select VNPay
6. Click "Tiếp tục thanh toán"

### Step 2: Check Backend Logs
```bash
docker-compose logs backend --tail=50
```

**Look for:**
```
🔍 VNPay Parameters: {
  orderId: 'DEPOSIT_12_1768900277424',
  amount: 100000,
  vnp_Amount: 10000000,
  vnp_TmnCode: '6ZY4FNRE',
  vnp_ReturnUrl: 'http://localhost:3001/wallet/vnpay/return',
  vnp_IpAddr: '127.0.0.1',
  vnp_CreateDate: '20260120161234',
  vnp_Locale: 'vn',
  signDataLength: 234,
  hasSecureHash: true
}
🔗 Payment URL: https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=10000000&vnp_Command=pay&vnp_CreateDate=...
```

### Step 3: Verify Parameters

**Check List:**
- [ ] `vnp_Amount` = `amount * 100` ✅
- [ ] `vnp_TmnCode` matches .env ✅
- [ ] `vnp_ReturnUrl` is correct ✅
- [ ] `vnp_IpAddr` is IPv4 ✅
- [ ] `vnp_CreateDate` is valid ✅
- [ ] `hasSecureHash` is true ✅
- [ ] Payment URL starts with VNPay sandbox URL ✅

---

## 🚨 Common Issues

### Issue 1: Wrong Amount
```javascript
// ❌ Wrong
vnp_Amount: 100000  // Missing *100

// ✅ Correct
vnp_Amount: 10000000  // 100000 * 100
```

### Issue 2: Wrong Return URL
```javascript
// ❌ Wrong
vnp_ReturnUrl: 'http://localhost:3001/wallet/vnpay/callback'

// ✅ Correct
vnp_ReturnUrl: 'http://localhost:3001/wallet/vnpay/return'
```

### Issue 3: IPv6 Address
```javascript
// ❌ Wrong
vnp_IpAddr: '::1'

// ✅ Correct
vnp_IpAddr: '127.0.0.1'
```

### Issue 4: Missing Secure Hash
```javascript
// ❌ Wrong
hasSecureHash: false

// ✅ Correct
hasSecureHash: true
```

---

## 📝 Expected Output

### Successful Creation
```
[2026-01-20T09:14:52.134Z] [VNPayService] [INFO] Creating VNPay payment URL { 
  orderId: 'DEPOSIT_11_1768900492134', 
  amount: 100000 
}

🔍 VNPay Parameters: {
  orderId: 'DEPOSIT_11_1768900492134',
  amount: 100000,
  vnp_Amount: 10000000,
  vnp_TmnCode: '6ZY4FNRE',
  vnp_ReturnUrl: 'http://localhost:3001/wallet/vnpay/return',
  vnp_IpAddr: '127.0.0.1',
  vnp_CreateDate: '20260120161452',
  vnp_Locale: 'vn',
  signDataLength: 245,
  hasSecureHash: true
}

🔗 Payment URL: https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=10000000&vnp_Command=pay&vnp_CreateDate=20260120161452&vnp_CurrCode=VND...

[2026-01-20T09:14:52.136Z] [VNPayService] [INFO] VNPay payment URL created successfully { 
  orderId: 'DEPOSIT_11_1768900492134' 
}

✅ VNPay payment URL created for transaction 11
```

---

## 🔧 Troubleshooting

### If Amount is Wrong
**Check:** `vnpayService.js` line 67
```javascript
vnp_Amount: Math.round(amount * 100)
```

### If Return URL is Wrong
**Check:** `.env` file
```bash
VNPAY_RETURN_URL=http://localhost:3001/wallet/vnpay/return
```

### If IP is Wrong
**Check:** `walletController.js` lines 185-194
```javascript
let ipAddr = req.ip || '127.0.0.1';
if (ipAddr === '::1' || ipAddr === '::ffff:127.0.0.1') {
    ipAddr = '127.0.0.1';
}
```

### If Secure Hash Missing
**Check:** `vnpayService.js` lines 76-80
```javascript
const signData = querystring.stringify(vnp_Params, { encode: false });
const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
vnp_Params['vnp_SecureHash'] = signed;
```

---

## 📊 VNPay Parameter Reference

### Required Parameters
| Parameter | Example | Description |
|-----------|---------|-------------|
| vnp_Version | 2.1.0 | VNPay API version |
| vnp_Command | pay | Payment command |
| vnp_TmnCode | 6ZY4FNRE | Merchant code |
| vnp_Amount | 10000000 | Amount (VND * 100) |
| vnp_CreateDate | 20260120161234 | Timestamp |
| vnp_CurrCode | VND | Currency |
| vnp_IpAddr | 127.0.0.1 | Customer IP |
| vnp_Locale | vn | Language |
| vnp_OrderInfo | Nap tien... | Description |
| vnp_OrderType | other | Order type |
| vnp_ReturnUrl | http://... | Callback URL |
| vnp_TxnRef | DEPOSIT_11... | Transaction ref |
| vnp_SecureHash | abc123... | HMAC signature |

---

## 🎯 Next Steps

1. ✅ Logging added
2. ✅ Backend restarted
3. ⏳ Test deposit
4. ⏳ Check logs
5. ⏳ Verify parameters
6. ⏳ Test VNPay redirect

---

**Status:** ✅ Enhanced Logging Active  
**Backend:** Restarted  
**Ready:** For Testing  

**Make a test deposit and check the logs!** 🔍
