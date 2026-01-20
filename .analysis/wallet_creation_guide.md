# Wallet Creation - Where and When

## 📍 Wallet được tạo ở đâu?

### 1. **Tự động khi User Đăng Ký** ✅

#### A. Đăng ký bằng Email/Password
**File:** `backend/controllers/authController.js`  
**Function:** `register()`  
**Line:** ~310-325

```javascript
export async function register(req, res) {
  // ... create user
  const [result] = await pool.execute(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name, email, hash, role]
  );
  
  const userId = result.insertId;
  
  // 🆕 Create wallet for new user
  await pool.execute(
    'INSERT INTO user_wallets (user_id, balance, currency, status) VALUES (?, 0.00, ?, ?)',
    [userId, 'USD', 'active']
  );
}
```

#### B. Đăng ký bằng Google OAuth
**File:** `backend/controllers/authController.js`  
**Function:** `googleCallback()`  
**Line:** ~190-205

```javascript
// After creating new OAuth user
if (user.id) {
  await pool.execute(
    'INSERT INTO user_wallets (user_id, balance, currency, status) VALUES (?, 0.00, ?, ?)',
    [user.id, 'USD', 'active']
  );
}
```

---

### 2. **Tự động khi User Đầu Tiên Truy Cập Wallet** ✅

**File:** `backend/controllers/walletController.js`  
**Function:** `getWallet()`  
**Line:** ~15-30

```javascript
export async function getWallet(req, res) {
  const [wallets] = await pool.execute(
    'SELECT * FROM user_wallets WHERE user_id = ?',
    [userId]
  );

  if (wallets.length === 0) {
    // Create wallet if not exists
    const [result] = await pool.execute(
      'INSERT INTO user_wallets (user_id, balance, currency, status) VALUES (?, 0.00, ?, ?)',
      [userId, 'USD', 'active']
    );
    // Return newly created wallet
  }
}
```

---

### 3. **Bulk Creation cho Users Hiện Có** ✅

**File:** `db/wallet_simple.sql`  
**Line:** ~21-23

```sql
-- Create wallets for existing users
INSERT IGNORE INTO user_wallets (user_id, balance, currency, status)
SELECT id, 0.00, 'USD', 'active'
FROM users;
```

**Khi chạy:** Khi setup database lần đầu

---

## 🔄 Luồng Tạo Wallet

### Scenario 1: User mới đăng ký
```
User Register → Create User → Create Wallet → Return Success
```

### Scenario 2: User cũ (đã có từ trước khi có wallet system)
```
User Login → Call GET /wallet → Wallet not found → Auto-create → Return Wallet
```

### Scenario 3: Bulk migration
```
Run SQL Script → Check existing users → Create wallets for all → Done
```

---

## ✅ Wallet Properties

Khi wallet được tạo, nó có các thuộc tính mặc định:

| Property | Default Value | Description |
|----------|---------------|-------------|
| `user_id` | User's ID | Foreign key to users table |
| `balance` | 0.00 | Starting balance |
| `currency` | USD | Default currency |
| `status` | active | Wallet status |
| `created_at` | NOW() | Timestamp |
| `updated_at` | NOW() | Timestamp |

---

## 🧪 Kiểm Tra Wallet Đã Tạo Chưa

### Qua API
```bash
curl -X GET http://localhost:3001/wallet \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Qua Database
```sql
-- Check specific user
SELECT * FROM user_wallets WHERE user_id = 1;

-- Check all wallets
SELECT 
  uw.id,
  uw.user_id,
  u.email,
  uw.balance,
  uw.currency,
  uw.status
FROM user_wallets uw
JOIN users u ON uw.user_id = u.id;

-- Count wallets vs users
SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM user_wallets) as total_wallets;
```

---

## 🔧 Tạo Wallet Thủ Công (Nếu Cần)

### Cho 1 user cụ thể
```sql
INSERT INTO user_wallets (user_id, balance, currency, status)
VALUES (1, 0.00, 'USD', 'active');
```

### Cho tất cả users chưa có wallet
```sql
INSERT IGNORE INTO user_wallets (user_id, balance, currency, status)
SELECT id, 0.00, 'USD', 'active'
FROM users
WHERE id NOT IN (SELECT user_id FROM user_wallets);
```

---

## 🐛 Troubleshooting

### Lỗi: "Wallet not found"
**Nguyên nhân:** User cũ chưa có wallet  
**Giải pháp:** Call GET /wallet sẽ tự động tạo

### Lỗi: "Duplicate entry for key 'user_id'"
**Nguyên nhân:** Wallet đã tồn tại  
**Giải pháp:** Dùng `INSERT IGNORE` hoặc check trước khi insert

### Lỗi: "Cannot add foreign key constraint"
**Nguyên nhân:** User không tồn tại  
**Giải pháp:** Tạo user trước, sau đó tạo wallet

---

## 📊 Statistics

### Check wallet creation status
```sql
-- Users without wallet
SELECT u.id, u.email, u.created_at
FROM users u
LEFT JOIN user_wallets uw ON u.id = uw.user_id
WHERE uw.id IS NULL;

-- Wallet creation timeline
SELECT 
  DATE(created_at) as date,
  COUNT(*) as wallets_created
FROM user_wallets
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 🎯 Best Practices

1. ✅ **Always create wallet on user registration** - Đã implement
2. ✅ **Fallback to auto-create on first access** - Đã implement
3. ✅ **Use transactions for user + wallet creation** - TODO
4. ✅ **Log wallet creation** - Đã có console.log
5. ⚠️ **Handle creation errors gracefully** - Đã có try-catch

---

## 📝 Summary

**Wallet được tạo tự động ở 3 điểm:**

1. ✅ Khi user đăng ký (email/password) - `authController.register()`
2. ✅ Khi user đăng ký (Google OAuth) - `authController.googleCallback()`
3. ✅ Khi user truy cập wallet lần đầu - `walletController.getWallet()`

**Không cần tạo thủ công!** Hệ thống tự động xử lý.
