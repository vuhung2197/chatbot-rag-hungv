# VNPay Return URL Configuration Guide

**Issue:** "Website này chưa được phê duyệt"  
**Cause:** Return URL not accessible by VNPay or not registered

---

## 🚀 Quick Fix: Use ngrok

### Step 1: Install ngrok
```bash
# Download from: https://ngrok.com/download
# Or use chocolatey:
choco install ngrok
```

### Step 2: Start ngrok
```bash
ngrok http 3001
```

**Output:**
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3001
```

### Step 3: Update .env
```bash
# backend/.env
VNPAY_RETURN_URL=https://abc123.ngrok.io/wallet/vnpay/return
```

### Step 4: Restart Backend
```bash
docker-compose restart backend
```

### Step 5: Test Payment
- Use the ngrok URL for testing
- VNPay can now redirect back successfully

---

## 📝 Alternative: Register URL in VNPay

### Step 1: Login to VNPay Sandbox
https://sandbox.vnpayment.vn/

### Step 2: Configure Return URL
1. Go to **Cấu hình** → **Return URL**
2. Add: `http://localhost:3001/wallet/vnpay/return`
3. Save and wait for approval

### Step 3: Verify
- Check if URL is approved
- May take a few minutes

---

## ⚠️ Important Notes

### For Development (localhost)
- ❌ VNPay cannot access `localhost` directly
- ✅ Must use ngrok or similar tunnel
- ✅ Or register URL in VNPay dashboard

### For Production
- ✅ Use public domain: `https://yourdomain.com/wallet/vnpay/return`
- ✅ Must be HTTPS in production
- ✅ Must match exactly with registered URL

---

## 🔍 Troubleshooting

### Error: "Website chưa được phê duyệt"
**Causes:**
1. Return URL not registered
2. Return URL mismatch
3. Using localhost without tunnel

**Solutions:**
1. Use ngrok for testing
2. Register URL in VNPay dashboard
3. Use public URL in production

---

## 📊 Current Configuration

### .env File
```bash
VNPAY_TMN_CODE=6ZY4FNRE
VNPAY_HASH_SECRET=11MROFBPPE8BFKF5NBL5K2UVFERO77L1
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:3001/wallet/vnpay/return  # ❌ Not accessible
```

### Recommended (with ngrok)
```bash
VNPAY_RETURN_URL=https://abc123.ngrok.io/wallet/vnpay/return  # ✅ Accessible
```

---

**Status:** ⏳ Waiting for ngrok setup  
**Next:** Configure ngrok and update .env
