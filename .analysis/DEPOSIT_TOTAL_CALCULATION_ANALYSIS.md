# PHÂN TÍCH LOGIC TÍNH TỔNG NẠP TRONG PROFILE SETTINGS

**Ngày tạo:** 2026-01-23  
**Người phân tích:** Antigravity AI  
**Mục đích:** Kiểm tra và phân tích cách tính toán tổng nạp tiền trong hệ thống

---

## 📊 TỔNG QUAN

Tổng nạp tiền (Total Deposits) được hiển thị trong **WalletDashboard** và được tính toán từ backend thông qua API endpoint `/wallet/stats`.

### Vị trí hiển thị:
- **Frontend:** `frontend/src/component/WalletDashboard.js` (dòng 248-251)
- **Backend:** `backend/controllers/walletController.js` - hàm `getWalletStats()` (dòng 379-455)

---

## 🔄 FLOW TÍNH TOÁN TỔNG NẠP

### 1. Frontend Request
```javascript
// File: frontend/src/component/WalletDashboard.js (dòng 50-74)
const fetchWalletData = async () => {
    const [walletRes, statsRes] = await Promise.all([
        axios.get('http://localhost:3001/wallet', ...),
        axios.get('http://localhost:3001/wallet/stats', ...)  // ← Request stats
    ]);
    
    setWallet(walletRes.data.wallet);
    setStats(statsRes.data);  // ← Lưu stats vào state
};
```

### 2. Backend Calculation
```javascript
// File: backend/controllers/walletController.js (dòng 389-405)
const [stats] = await pool.execute(`
    SELECT 
        w.balance,
        w.currency,
        COUNT(DISTINCT wt.id) as total_transactions,
        SUM(CASE WHEN wt.type = 'deposit' AND wt.status = 'completed' 
            THEN wt.amount ELSE 0 END) as total_deposits,  // ← Tính tổng nạp
        ...
    FROM user_wallets w
    LEFT JOIN wallet_transactions wt ON w.id = wt.wallet_id
    WHERE w.user_id = ?
    GROUP BY w.id, w.balance, w.currency
`, [userId]);
```

**Logic tính toán:**
- Chỉ tính các giao dịch có `type = 'deposit'` và `status = 'completed'`
- Sử dụng `SUM()` để cộng tổng tất cả `amount` của các deposit thành công
- Lưu ý: Các deposit có status `pending` hoặc `failed` **KHÔNG** được tính vào tổng

### 3. Currency Conversion
```javascript
// File: backend/controllers/walletController.js (dòng 425-447)
if (result.currency === 'VND') {
    result.total_deposits = currencyService.convertCurrency(
        parseFloat(result.total_deposits) || 0,
        'USD',  // ← Từ USD
        'VND'   // ← Sang VND
    );
}
```

**Quy tắc chuyển đổi:**
```javascript
// File: backend/services/currencyService.js (dòng 7-10)
const EXCHANGE_RATES = {
    USD_TO_VND: 24000,      // 1 USD = 24,000 VND
    VND_TO_USD: 1 / 24000   // 1 VND = 0.0000417 USD
};
```

**Cách làm tròn:**
- VND: `Math.round(converted)` → làm tròn số nguyên
- USD: `Math.round(converted * 100) / 100` → 2 chữ số thập phân

### 4. Frontend Display
```javascript
// File: frontend/src/component/WalletDashboard.js (dòng 248-251)
<span className="stat-value">
    {formatCurrency(stats.total_deposits || 0, wallet?.currency)}
</span>
```

---

## 💾 CẤU TRÚC DATABASE

### Bảng `wallet_transactions`
```sql
-- File: db/phase3_wallet_schema.sql (dòng 40-64)
CREATE TABLE wallet_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    wallet_id INT NOT NULL,
    user_id INT NOT NULL,
    type ENUM('deposit', 'withdrawal', 'purchase', 'refund', 'subscription'),
    amount DECIMAL(10, 2) NOT NULL,  -- ⚠️ Lưu trữ bằng USD
    status ENUM('pending', 'completed', 'failed', 'cancelled'),
    ...
);
```

**Lưu ý quan trọng:**
- Tất cả `amount` trong database được lưu bằng **USD**
- Khi tạo deposit (dòng 162-177), `amount` được lưu với currency metadata trong JSON
- Khi hiển thị, backend sẽ convert sang currency của ví

---

## 🔍 CÁC TRƯỜNG HỢP KIỂM TRA

### Case 1: User có ví USD
```
Database: 
- Transaction 1: type='deposit', amount=10.00, status='completed'
- Transaction 2: type='deposit', amount=20.00, status='completed'
- Transaction 3: type='deposit', amount=5.00, status='pending'   ← KHÔNG tính

Kết quả:
- total_deposits = 10.00 + 20.00 = 30.00 USD
- Hiển thị: $30.00
```

### Case 2: User có ví VND
```
Database (lưu bằng USD):
- Transaction 1: type='deposit', amount=10.00, status='completed'
- Transaction 2: type='deposit', amount=20.00, status='completed'

Tính toán:
1. SQL SUM: 10.00 + 20.00 = 30.00 USD
2. Convert: 30.00 * 24000 = 720,000 VND
3. Round: Math.round(720000) = 720,000

Kết quả:
- total_deposits = 720,000 VND
- Hiển thị: 720.000₫
```

### Case 3: User chuyển currency từ USD sang VND
```
Tình huống:
- Ví ban đầu: USD, có 2 deposits (10 USD + 20 USD)
- User chuyển sang VND

Flow:
1. Query tính total_deposits = 30.00 USD
2. Backend kiểm tra wallet.currency = 'VND'
3. Convert: 30.00 * 24000 = 720,000 VND
4. Return cho frontend: total_deposits = 720000

⚠️ LƯU Ý: Amount trong DB vẫn giữ nguyên USD, chỉ convert khi trả về API
```

---

## ⚠️ VẤN ĐỀ TIỀM ẨN

### 1. **Inconsistency khi user thay đổi currency nhiều lần**
**Vấn đề:** 
- User deposit 10 USD khi ví là USD
- Chuyển sang VND → total_deposits hiển thị 240,000 VND
- Deposit thêm 10 USD (được lưu trong DB)
- Chuyển lại sang USD → total_deposits = 20 USD ✅ (đúng)
- Nhưng nếu rate thay đổi, có thể gây nhầm lẫn

**Giải pháp hiện tại:** Acceptable vì:
- Rate cố định (24,000)
- DB lưu bằng USD làm base currency
- Chỉ convert khi hiển thị

### 2. **Pending/Failed deposits không được tính**
**Hiện trạng:**
- Chỉ tính `status = 'completed'`
- Pending và failed được track riêng trong `failed_deposit_amount` và `pending_deposit_amount`

**Đánh giá:** ✅ Đúng logic nghiệp vụ

### 3. **Làm tròn có thể mất precision**
**Ví dụ:**
```
0.004167 USD * 24000 = 100.008 VND
Math.round(100.008) = 100 VND
→ Mất 0.008 VND
```

**Đánh giá:** Acceptable vì VND không có đơn vị thập phân

### 4. **Database lưu DECIMAL(10,2) có thể overflow với VND**
**Vấn đề:**
- Max value: 99,999,999.99
- Nếu convert USD → VND có thể vượt quá
- Đã fix ở migration: `fix_balance_precision.sql`

---

## 📋 CHECKLIST KIỂM TRA

### Backend Logic ✅
- [x] Query SQL đúng (chỉ tính completed deposits)
- [x] Currency conversion được áp dụng khi cần
- [x] Làm tròn phù hợp với từng loại tiền
- [x] Handle edge case (no transactions, no wallet)

### Frontend Display ✅
- [x] Format currency đúng định dạng (VND: 720.000₫, USD: $30.00)
- [x] Hiển thị đúng giá trị từ API
- [x] Refresh data sau khi deposit/currency change

### Database ✅
- [x] Amount lưu bằng USD (base currency)
- [x] Status tracking đầy đủ (pending, completed, failed)
- [x] Metadata lưu currency info

---

## 🎯 KẾT LUẬN

### Điểm mạnh:
1. ✅ Logic tính toán rõ ràng, dễ hiểu
2. ✅ Base currency (USD) giúp maintain consistency
3. ✅ Conversion chỉ khi display, không thay đổi DB
4. ✅ Track riêng pending/failed deposits
5. ✅ Có audit log cho wallet changes

### Điểm cần cải thiện:
1. ⚠️ Cân nhắc cache exchange rate để tối ưu performance
2. ⚠️ Thêm test cases cho currency conversion edge cases
3. ⚠️ Document rõ ràng về việc DB lưu USD

### Đánh giá tổng thể:
**LOGIC ĐÚNG** ✅ - Hệ thống tính tổng nạp hoạt động chính xác theo thiết kế.

---

## 📝 SAMPLE QUERIES ĐỂ KIỂM TRA

### 1. Kiểm tra tổng nạp của user
```sql
SELECT 
    u.id,
    u.email,
    w.currency,
    SUM(CASE WHEN wt.type = 'deposit' AND wt.status = 'completed' 
        THEN wt.amount ELSE 0 END) as total_deposits_usd,
    COUNT(CASE WHEN wt.type = 'deposit' AND wt.status = 'completed' 
        THEN 1 END) as completed_deposits,
    COUNT(CASE WHEN wt.type = 'deposit' AND wt.status = 'pending' 
        THEN 1 END) as pending_deposits
FROM users u
JOIN user_wallets w ON u.id = w.user_id
LEFT JOIN wallet_transactions wt ON w.id = wt.wallet_id
WHERE u.id = <USER_ID>
GROUP BY u.id, u.email, w.currency;
```

### 2. Xem chi tiết deposits
```sql
SELECT 
    id,
    type,
    amount,
    status,
    description,
    payment_method,
    created_at,
    metadata
FROM wallet_transactions
WHERE user_id = <USER_ID> 
  AND type = 'deposit'
ORDER BY created_at DESC;
```

### 3. Kiểm tra currency conversion
```sql
-- Giả sử user_id = 1 có ví VND
-- Tổng USD trong DB
SELECT SUM(amount) as total_usd
FROM wallet_transactions
WHERE user_id = 1 
  AND type = 'deposit' 
  AND status = 'completed';

-- Nhân với 24000 để ra VND
-- Kết quả phải khớp với API response
```

---

**End of Analysis**
