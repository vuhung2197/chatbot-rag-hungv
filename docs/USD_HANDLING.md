# Tài Liệu: Xử Lý USD Trong Hệ Thống

## 📋 Tổng Quan Kiến Trúc Tiền Tệ

### Nguyên Tắc Chính
1. **Lưu trữ transactions**: Luôn lưu bằng **USD** trong database
2. **Lưu trữ wallet balance**: Lưu theo **currency của ví** (USD hoặc VND)
3. **Hiển thị**: Luôn hiển thị theo **currency của ví người dùng**
4. **Payment gateways**: Mỗi gateway có yêu cầu currency riêng

---

## 1️⃣ DATABASE SCHEMA

### A. Bảng `user_wallets`
```sql
CREATE TABLE user_wallets (
  id INT PRIMARY KEY,
  user_id INT,
  balance DECIMAL(10, 2),      -- Lưu theo currency của ví
  currency VARCHAR(3),          -- 'USD' hoặc 'VND'
  status ENUM(...),
  ...
);
```

**Ví dụ:**
- User A: `balance = 100.00`, `currency = 'USD'` → Ví USD
- User B: `balance = 2500000.00`, `currency = 'VND'` → Ví VND

### B. Bảng `wallet_transactions`
```sql
CREATE TABLE wallet_transactions (
  id INT PRIMARY KEY,
  wallet_id INT,
  user_id INT,
  amount DECIMAL(10, 2),        -- ⚠️ LUÔN LƯU BẰNG USD
  balance_before DECIMAL(10, 2), -- Lưu theo currency ví
  balance_after DECIMAL(10, 2),  -- Lưu theo currency ví
  metadata JSON,                 -- Chứa thông tin currency gốc
  ...
);
```

**⚠️ QUAN TRỌNG**: 
- `amount` column **LUÔN** lưu bằng USD
- Metadata lưu `original_amount` và `currency` để truy vết

**Ví dụ:**
```json
// User nạp 500,000 VND
{
  "amount": 20.00,              // USD (500,000 ÷ 25,000)
  "balance_before": 2000000.00, // VND
  "balance_after": 2500000.00,  // VND
  "metadata": {
    "original_amount": 500000,
    "currency": "VND",
    "credited_amount": 500000,
    "credited_currency": "VND"
  }
}
```

---

## 2️⃣ BACKEND - CURRENCY SERVICE

### File: `backend/services/currencyService.js`

```javascript
// Tỉ giá hiện tại
const EXCHANGE_RATES = {
    USD_TO_VND: 25000,  // 1 USD = 25,000 VND
    VND_TO_USD: 1 / 25000
};

// Hàm chuyển đổi
export function convertCurrency(amount, from, to) {
    if (from === to) return amount;
    
    const rate = getExchangeRate(from, to);
    const converted = amount * rate;
    
    // Làm tròn
    if (to === 'VND') {
        return Math.round(converted);    // VND: số nguyên
    }
    return Math.round(converted * 100) / 100;  // USD: 2 chữ số thập phân
}
```

**Sử dụng:**
```javascript
convertCurrency(100, 'USD', 'VND')  // → 2,500,000
convertCurrency(50000, 'VND', 'USD') // → 2.00
```

---

## 3️⃣ BACKEND - WALLET CONTROLLER

### File: `backend/controllers/walletController.js`

### A. Tạo Deposit Transaction

```javascript
export async function createDeposit(req, res) {
    const { amount, currency, payment_method } = req.body;
    
    // BƯỚC 1: Chuẩn hóa input currency
    const inputCurrency = currency || 'USD';
    
    // BƯỚC 2: Chuyển đổi sang USD để lưu vào DB
    let amountInUsd = amount;
    if (inputCurrency !== 'USD') {
        amountInUsd = currencyService.convertCurrency(
            amount, 
            inputCurrency, 
            'USD'
        );
    }
    
    // BƯỚC 3: Lưu transaction (LUÔN BẰNG USD)
    await pool.execute(`
        INSERT INTO wallet_transactions 
        (wallet_id, user_id, amount, ...)
        VALUES (?, ?, ?, ...)
    `, [walletId, userId, amountInUsd, ...]);
    
    // BƯỚC 4: Với VNPay/MoMo, chuyển về VND
    if (payment_method === 'vnpay' || payment_method === 'momo') {
        let amountForPayment = amount;
        if (inputCurrency !== 'VND') {
            amountForPayment = currencyService.convertCurrency(
                amount, 
                inputCurrency, 
                'VND'
            );
        }
        // Gửi amountForPayment (VND) sang VNPay
    }
}
```

**Ví dụ Flow:**

#### Case 1: User nạp 100 USD qua Stripe
```
Input: amount=100, currency='USD', method='stripe'
→ inputCurrency = 'USD'
→ amountInUsd = 100 (không cần convert)
→ Lưu DB: amount=100.00 (USD)
→ Gửi Stripe: $100
```

#### Case 2: User nạp 500,000 VND qua VNPay
```
Input: amount=500000, currency='VND', method='vnpay'
→ inputCurrency = 'VND'
→ amountInUsd = 500000 ÷ 25000 = 20.00 USD
→ Lưu DB: amount=20.00 (USD)
→ Gửi VNPay: 500,000 VND
```

#### Case 3: User ví USD nạp 100 USD qua VNPay (!!!)
```
Input: amount=100, currency='USD', method='vnpay'
→ inputCurrency = 'USD'
→ amountInUsd = 100 (USD)
→ Lưu DB: amount=100.00 (USD)
→ Chuyển đổi cho VNPay: 100 × 25000 = 2,500,000 VND
→ Gửi VNPay: 2,500,000 VND ✅
```

### B. Validation Amount Limits

```javascript
// QUAN TRỌNG: Validate THEO CURRENCY CỦA GATEWAY
let amountForValidation = amount;

if (payment_method === 'vnpay' || payment_method === 'momo') {
    // VNPay/MoMo chỉ nhận VND
    if (inputCurrency !== 'VND') {
        amountForValidation = currencyService.convertCurrency(
            amount, 
            inputCurrency, 
            'VND'
        );
    }
}

// Kiểm tra với số tiền đã chuyển đổi
if (amountForValidation < method.min_amount || 
    amountForValidation > method.max_amount) {
    return res.status(400).json({ 
        message: 'Amount out of range',
        convertedAmount: amountForValidation
    });
}
```

**Tại sao cần convert trước khi validate?**
```
Ví dụ sai:
- User nhập: 10,000 USD
- VNPay limit: 10,000 - 50,000,000 VND
- Check: 10,000 > 10,000 → PASS ✅ (SAI!)
- Convert: 10,000 × 25,000 = 250,000,000 VND
- Gửi VNPay: FAILED (vượt 50M) ❌

Cách đúng:
- User nhập: 10,000 USD
- Convert trước: 10,000 × 25,000 = 250,000,000 VND
- Check: 250,000,000 > 50,000,000 → REJECT ✅
```

---

## 4️⃣ BACKEND - VNPAY CONTROLLER

### File: `backend/controllers/vnpayController.js`

### Xử Lý Callback Sau Thanh Toán

```javascript
export async function vnpayReturn(req, res) {
    // Lấy transaction từ DB
    const transaction = transactions[0];
    
    // ⚠️ transaction.amount LÀ USD (từ DB)
    // Cần chuyển sang currency của ví
    
    const wallet = wallets[0];
    
    let creditedAmount = parseFloat(transaction.amount); // USD
    
    if (wallet.currency !== 'USD') {
        // Ví VND → chuyển USD sang VND
        creditedAmount = currencyService.convertCurrency(
            creditedAmount,  // 20 USD
            'USD',
            wallet.currency  // VND
        );
        // Kết quả: 500,000 VND
    }
    
    // Cộng vào ví
    const newBalance = parseFloat(wallet.balance) + creditedAmount;
    
    // Redirect với đúng currency
    res.redirect(
        `${frontendUrl}/profile?payment=success` +
        `&amount=${creditedAmount}&currency=${wallet.currency}`
    );
}
```

**Flow đầy đủ:**
```
1. User nạp 500,000 VND
2. Lưu DB: amount=20.00 USD
3. Gửi VNPay: 500,000 VND
4. User thanh toán thành công
5. Callback về:
   - Đọc transaction.amount = 20.00 (USD)
   - Wallet currency = 'VND'
   - Convert: 20 × 25,000 = 500,000 VND
   - Cộng vào ví: balance += 500,000
   - Redirect: ?amount=500000&currency=VND
```

---

## 5️⃣ BACKEND - WALLET STATISTICS

### File: `backend/controllers/walletController.js`

### Hàm `getWalletStats`

```javascript
export async function getWalletStats(req, res) {
    // Query database (amounts đều là USD)
    const [stats] = await pool.execute(`
        SELECT 
            w.currency,
            SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) 
                as total_deposits
        FROM user_wallets w
        LEFT JOIN wallet_transactions wt ON w.id = wt.wallet_id
        WHERE w.user_id = ?
    `);
    
    const result = stats[0];
    
    // ⚠️ result.total_deposits LÀ USD (từ DB)
    // Nếu ví VND → phải convert
    
    if (result.currency === 'VND') {
        result.total_deposits = currencyService.convertCurrency(
            parseFloat(result.total_deposits), 
            'USD', 
            'VND'
        );
    }
    
    res.json(result);
}
```

**Ví dụ:**
```sql
-- DB có 3 transactions:
amount = 10.00 (USD)
amount = 20.00 (USD)
amount = 30.00 (USD)
---
SUM = 60.00 USD

-- Nếu wallet.currency = 'VND':
60 × 25,000 = 1,500,000 VND ✅

-- Return to frontend:
{
  "total_deposits": 1500000,
  "currency": "VND"
}
```

---

## 6️⃣ FRONTEND - CURRENCY DISPLAY

### File: `frontend/src/component/WalletDashboard.js`

```javascript
const formatCurrency = (amount, currency = 'VND') => {
    if (currency === 'VND') {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
};

// Hiển thị số dư
<h2>{formatCurrency(wallet?.balance, wallet?.currency)}</h2>
```

**Output:**
- VND: `1.500.000 ₫`
- USD: `$100.00`

---

## 7️⃣ ĐIỂM DỄ NHẦM LẪN

### ⚠️ Lỗi Thường Gặp

#### 1. Quên Convert Khi Đọc Từ DB
```javascript
// ❌ SAI
const amount = transaction.amount; // USD từ DB
wallet.balance += amount;  // Cộng USD vào ví VND!

// ✅ ĐÚNG
let creditedAmount = transaction.amount; // USD
if (wallet.currency !== 'USD') {
    creditedAmount = convertCurrency(creditedAmount, 'USD', wallet.currency);
}
wallet.balance += creditedAmount;
```

#### 2. Validate Sai Currency
```javascript
// ❌ SAI - Validate trước khi convert
if (amount < min || amount > max) { return error; }
if (currency !== 'VND') { amount = convert(amount); }
sendToVNPay(amount); // Có thể vượt limit!

// ✅ ĐÚNG - Convert trước, validate sau
if (currency !== 'VND') { amount = convert(amount); }
if (amount < min || amount > max) { return error; }
sendToVNPay(amount);
```

#### 3. Hiển thị Sai Currency
```javascript
// ❌ SAI
const amount = urlParams.get('amount');
setSuccess(`Nạp thành công ${amount} đ`); // Hardcode VND

// ✅ ĐÚNG
const amount = urlParams.get('amount');
const currency = urlParams.get('currency');
const symbol = currency === 'VND' ? 'đ' : '$';
setSuccess(`Nạp thành công ${amount} ${symbol}`);
```

---

## 8️⃣ CHECKLIST KHI LÀM VIỆC VỚI USD

### ✅ Khi Tạo Transaction
- [ ] Convert input amount sang USD trước khi lưu DB
- [ ] Lưu original amount/currency trong metadata
- [ ] Convert sang currency của gateway khi cần

### ✅ Khi Đọc Transaction
- [ ] Luôn nhớ amount trong DB là USD
- [ ] Convert sang wallet currency trước khi cộng vào balance
- [ ] Lưu credited_amount và credited_currency trong metadata

### ✅ Khi Hiển Thị
- [ ] Luôn convert về wallet currency
- [ ] Hiển thị đúng symbol (₫ hoặc $)
- [ ] Format số theo locale (vi-VN hoặc en-US)

### ✅ Khi Validate
- [ ] Convert sang gateway currency trước
- [ ] Validate với số tiền đã convert
- [ ] Trả về thông tin đầy đủ (input + converted)

---

## 9️⃣ MIGRATION VÀ MAINTENANCE

### Cập Nhật Tỉ Giá
```javascript
// backend/services/currencyService.js
import { updateExchangeRate } from './currencyService.js';

// Cập nhật tỉ giá mới
updateExchangeRate(24000); // 1 USD = 24,000 VND

// ⚠️ LƯU Ý: 
// - Không ảnh hưởng transactions cũ (đã lưu USD)
// - Chỉ ảnh hưởng chuyển đổi mới
```

### Chuyển Đổi Ví USD ↔ VND
```javascript
// backend/controllers/walletController.js
export async function updateWalletCurrency(req, res) {
    const { currency } = req.body; // 'USD' hoặc 'VND'
    
    // Lấy ví hiện tại
    const wallet = wallets[0];
    const oldBalance = parseFloat(wallet.balance);
    
    // Convert balance
    const newBalance = currencyService.convertCurrency(
        oldBalance,
        wallet.currency,  // VND
        currency          // USD
    );
    
    // Cập nhật
    await pool.execute(`
        UPDATE user_wallets 
        SET currency = ?, balance = ?, updated_at = NOW()
        WHERE id = ?
    `, [currency, newBalance, wallet.id]);
}
```

---

## 🎯 TÓM TẮT

| Vị Trí | Currency | Lưu Ý |
|--------|----------|--------|
| **DB - transactions.amount** | USD | Luôn USD, không đổi |
| **DB - wallets.balance** | USD/VND | Theo currency của ví |
| **Payment Gateway Input** | Tùy gateway | VNPay/MoMo: VND, Stripe: USD/VND |
| **Frontend Display** | USD/VND | Theo wallet currency |
| **Statistics/Reports** | USD → VND | Convert khi query nếu cần |

### Quy Tắc Vàng
1. **Lưu transactions bằng USD** → Thống kê nhất quán
2. **Hiển thị theo wallet currency** → UX tốt
3. **Convert theo gateway requirements** → Tránh lỗi
4. **Validate sau khi convert** → Đúng giới hạn
