# Backend Refactoring — Context & Changes Log

**Dự án:** English Chatbot Backend (Node.js/Express + PostgreSQL)
**Ngày thực hiện:** 2026-04-02
**Cơ sở:** BACKEND_REMEDIATION_PLAN.md

---

## Phần 1: Fat Controller & Tight Coupling (HOÀN THÀNH ✅)

### Vấn đề
- Controllers trực tiếp `import pool from '#db'` và viết raw SQL
- Logic "credit deposit" (SELECT wallet FOR UPDATE → tính toán → UPDATE balance → INSERT transaction) bị copy-paste 6 lần qua 3 file (vnpay, momo, deposit)
- `getOrCreateWallet()` bị duplicate giữa `deposit.controller.js` và `wallet.service.js`
- Fee rút tiền `0.5` USD hardcode trực tiếp trong controller

### Giải pháp: Service Layer + Repository Pattern

```
Controller (nhận request, gọi service, trả response)
    ↓
Service (business logic, transaction management)
    ↓
Repository (raw SQL queries duy nhất)
```

### Files đã tạo mới

| File | Mục đích |
|------|----------|
| `backend/src/modules/wallet/repositories/wallet.repository.js` | Repository layer — tập trung TẤT CẢ raw SQL queries (~30 methods) cho wallet, transactions, bank accounts, withdrawal requests |

### Files đã refactor

| File | Thay đổi |
|------|----------|
| `backend/src/modules/wallet/services/wallet.service.js` | Chuyển sang dùng `walletRepository` thay vì `pool` trực tiếp. Thêm 4 methods mới: `creditDeposit()`, `failDeposit()`, `processWithdrawal()`, `calculateWithdrawalFee()`. Method `getOrCreateWallet()` là nguồn duy nhất cho logic tạo wallet. |
| `backend/src/modules/wallet/controllers/gateways/vnpay.controller.js` | Xóa `import pool`, xóa `import currencyService`. Toàn bộ credit logic (48→56 dòng SQL) thay bằng `walletService.creditDeposit()`. 264→141 LOC (-47%) |
| `backend/src/modules/wallet/controllers/gateways/momo.controller.js` | Xóa `import pool`, xóa `import currencyService`. Tương tự vnpay. 209→95 LOC (-55%) |
| `backend/src/modules/wallet/controllers/deposit.controller.js` | Xóa `import pool`. Xóa `getOrCreateWallet()` duplicate → dùng `walletService.getOrCreateWallet()`. `processPaymentCallback()` gọi `walletService.creditDeposit()`/`failDeposit()`. `getPaymentMethods()` và `getFailedAndPendingDeposits()` dùng `walletRepository`. 331→225 LOC (-32%) |
| `backend/src/modules/wallet/controllers/withdrawal.controller.js` | Xóa `import pool`, xóa `import currencyService`. `withdraw()` gọi `walletService.processWithdrawal()`. `calculateWithdrawalFee()` gọi `walletService.calculateWithdrawalFee()`. Bank account CRUD gọi `walletRepository`. 254→159 LOC (-37%) |
| `backend/src/modules/wallet/controllers/gateways/payment.controller.js` | Xóa `import pool`. Query `subscription_tiers` chuyển sang dùng `subscriptionService.getTiers()` |
| `backend/src/modules/wallet/wallet.constants.js` | Thêm `WITHDRAWAL_FEE_USD = 0.5` và `PAYMENT_METHOD` enum |

### Quy tắc import sau refactor
- **Controllers**: KHÔNG được `import pool from '#db'` — chỉ import services + repositories
- **Services**: Được import `pool` cho `pool.getConnection()` (transaction management) — nhưng queries đi qua repository
- **Repositories**: Nơi DUY NHẤT chứa raw SQL

### API signature thay đổi trong repository
- `walletRepository.createTransaction(data, connection?)` — data là object đầu tiên, connection optional thứ 2 (defaults to pool)

---

## Phần 2: Input Validation với Zod (HOÀN THÀNH ✅)

### Đã cài đặt
```bash
npm install zod  # đã cài thành công
```

### Files đã tạo mới

| File | Mục đích |
|------|----------|
| `backend/src/shared/middlewares/validate.middleware.js` | Factory middleware `validate(schemas)` — nhận `{ body?, query?, params? }` Zod schemas, tự validate + parse + trả 400 nếu lỗi |
| `backend/src/modules/wallet/wallet.schemas.js` | Zod schemas cho wallet module: `createDepositSchema`, `withdrawSchema`, `calculateFeeSchema`, `addBankAccountSchema`, `deleteBankAccountSchema`, `updateCurrencySchema`, `getTransactionsSchema`, `getFailedPendingSchema`, `queryVnpaySchema` |
| `backend/src/modules/auth/auth.schemas.js` | Zod schemas cho auth module: `registerSchema` (email format, password strength), `loginSchema`, `oauthProviderSchema` |
| `backend/src/modules/chat/chat.schemas.js` | Zod schemas cho chat module: `chatSchema` (message required, max 10000 chars), `conversationIdSchema`, `renameConversationSchema`, `archiveConversationSchema`, `pinConversationSchema`, `deleteHistoryItemSchema` |

### Files đã refactor

| File | Thay đổi |
|------|----------|
| `backend/src/modules/wallet/routes/wallet.routes.js` | Thêm `validate()` middleware cho 9 endpoints: deposit, withdraw, calculate-fee, add bank account, delete bank account, update currency, get transactions, get failed-pending, vnpay query |
| `backend/src/modules/auth/routes/auth.routes.js` | Thêm `validate()` middleware cho register, login, link/unlink OAuth provider |
| `backend/src/modules/chat/routes/chat.routes.js` | Thêm `validate()` middleware cho chat, stream, delete history item |
| `backend/src/modules/chat/routes/conversation.routes.js` | Thêm `validate()` middleware cho get messages, rename, archive, pin, delete conversation |

### Đã áp dụng đầy đủ cho
- ✅ Wallet module (9 endpoints)
- ✅ Auth module (4 endpoints: register, login, link/unlink OAuth)
- ✅ Chat module (4 endpoints: chat, stream, delete history)
- ✅ Conversation module (5 endpoints: get messages, rename, archive, pin, delete)

### Cách dùng validate middleware
```javascript
// Trong route file:
import { validate } from '#shared/middlewares/validate.middleware.js';
import { createDepositSchema } from '../wallet.schemas.js';

router.post('/deposit', verifyToken, validate(createDepositSchema), createDeposit);
// validate() đứng SAU auth middleware, TRƯỚC controller
```

### Validate middleware response format khi lỗi
```json
{
    "message": "Validation failed",
    "errors": [
        { "field": "amount", "message": "Amount must be positive" },
        { "field": "currency", "message": "Invalid enum value" }
    ]
}
```

---

## Phần 3: Bảo mật (HOÀN THÀNH ✅)

### Vấn đề
- **Bug nghiêm trọng**: `bcrypt.compare()` được dùng trong `auth.controller.js` nhưng chưa import → ReferenceError khi login
- Không có helmet → thiếu security headers cơ bản
- CORS cho phép wildcard `*` nếu thiếu env var
- Không có rate limiting → dễ bị brute-force, API abuse, DDoS
- OAuth tokens "encrypt" bằng Base64 (không phải encryption thực sự)

### Giải pháp đã triển khai

#### 3.1. Fix bcrypt import bug ✅
```javascript
// backend/src/modules/auth/controllers/auth.controller.js
import bcrypt from 'bcrypt';  // ← Đã thêm
```

#### 3.2. Helmet - Security Headers ✅
```bash
npm install helmet --legacy-peer-deps
```
```javascript
// backend/index.js
import helmet from 'helmet';
app.use(helmet());
```

#### 3.3. CORS - Fix wildcard ✅
```javascript
// backend/index.js - TRƯỚC
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',  // ← Nguy hiểm!
}));

// SAU
const allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : ['http://localhost:3000'];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
```

#### 3.4. Rate Limiting ✅
```bash
npm install express-rate-limit --legacy-peer-deps
```

**Files đã tạo:**
| File | Mục đích |
|------|----------|
| `backend/src/shared/middlewares/rateLimiter.middleware.js` | 4 rate limiters: `authLimiter` (10/15min), `aiLimiter` (10/min), `webhookLimiter` (30/min), `apiLimiter` (60/min) |

**Áp dụng trong index.js:**
```javascript
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);
app.use('/chat', aiLimiter);
app.use('/advanced-chat', aiLimiter);
app.use('/writing', aiLimiter);
app.use('/reading', aiLimiter);
app.use('/listening', aiLimiter);
app.use('/speaking', aiLimiter);
app.use('/payment/vnpay/ipn', webhookLimiter);
app.use('/payment/momo/ipn', webhookLimiter);
```

#### 3.5. OAuth Token Encryption ✅
**Files đã tạo:**
| File | Mục đích |
|------|----------|
| `backend/utils/encryption.js` | AES-256-GCM encryption/decryption cho OAuth tokens (thay thế Base64) |

```javascript
import { encrypt, decrypt } from '#utils/encryption.js';
// Sử dụng: encrypt(token) thay vì Buffer.from(token).toString('base64')
```

**Lưu ý:** Cần thêm `ENCRYPTION_KEY` vào `.env` (production)

### Chưa triển khai (theo plan)
- JWT Refresh Token (hiện tại expiry = 30 ngày, nên giảm xuống 1 giờ + thêm refresh token)
- Loại bỏ JWT token khỏi URL query parameters (OAuth callback flow)

### Bug fixes sau khi deploy

#### 3.6. Zod v4 Breaking Changes ✅
**Vấn đề phát hiện:**
1. `error.errors` → `error.issues` trong validate middleware
2. Frontend gửi `amount: "100000"` (string) → backend reject vì schema yêu cầu `number`
3. `required_error` và `invalid_type_error` options bị ignore trong Zod v4

**Đã fix:**
- `validate.middleware.js`: Đổi `error.errors.map()` → `error.issues.map()`
- Tất cả schemas: Dùng `z.coerce.number()` thay vì `z.number()` cho amount fields
- Xóa `required_error`/`invalid_type_error` options (không hoạt động Zod v4), dùng message trực tiếp

**Files đã sửa:**
- `backend/src/shared/middlewares/validate.middleware.js`
- `backend/src/modules/wallet/wallet.schemas.js`
- `backend/src/modules/auth/auth.schemas.js`
- `backend/src/modules/chat/chat.schemas.js`

---

## Các phần chưa thực hiện (theo BACKEND_REMEDIATION_PLAN.md)

| # | Phần | Trạng thái |
|---|------|:---:|
| 1 | Fat Controller & Tight Coupling | ✅ Hoàn thành |
| 2 | Input Validation (Zod) | ✅ Hoàn thành — áp dụng cho wallet, auth, chat, conversation |
| 3 | Bảo mật (Rate Limiting, Helmet, CORS, bcrypt bug, token encryption) | ✅ Hoàn thành — fix bcrypt bug, helmet, CORS, rate limiting, encryption utility |
| 4 | Error Handling (asyncHandler + centralized error handler) | ❌ Chưa |
| 5 | Automated Testing (Jest) | ❌ Chưa |
| 6 | Database Migration (Knex.js) | ❌ Chưa |
| 7 | Dead Code & Hardcoding & Code Hygiene | ❌ Chưa |

---

## Cấu trúc thư mục wallet module sau refactor

```
backend/src/modules/wallet/
├── controllers/
│   ├── deposit.controller.js        # Không có import pool
│   ├── wallet.controller.js         # Dùng walletService (không thay đổi)
│   ├── withdrawal.controller.js     # Không có import pool
│   └── gateways/
│       ├── vnpay.controller.js      # Không có import pool
│       ├── momo.controller.js       # Không có import pool
│       └── payment.controller.js    # Không có import pool
├── repositories/
│   └── wallet.repository.js         # MỚI — tất cả raw SQL ở đây
├── routes/
│   ├── wallet.routes.js             # Đã thêm validate middleware
│   └── payment.routes.js
├── services/
│   └── wallet.service.js            # Mở rộng — creditDeposit, processWithdrawal, etc.
├── wallet.constants.js              # Thêm WITHDRAWAL_FEE_USD, PAYMENT_METHOD
└── wallet.schemas.js                # MỚI — Zod validation schemas
```

---

## 📖 Hướng dẫn tổ chức code (Controller/Service/Repository)

### Kiến trúc 3 lớp (Layered Architecture)

```
Request → Controller → Service → Repository → Database
   ↓         ↓           ↓           ↓
Response  Validation  Business   Raw SQL
          Logic       Logic      Queries
```

---

### 🎯 CONTROLLER Layer

**Nhiệm vụ:**
- Nhận HTTP request (req, res)
- Validate input (qua Zod middleware)
- Gọi Service layer
- Trả HTTP response (JSON)
- Xử lý HTTP status codes

**Quy tắc:**
- ❌ KHÔNG import `pool` từ `#db`
- ❌ KHÔNG viết raw SQL
- ❌ KHÔNG có business logic phức tạp
- ✅ CHỈ import services và repositories
- ✅ Xử lý request/response format

**Ví dụ:**
```javascript
// deposit.controller.js
import walletService from '../services/wallet.service.js';
import walletRepository from '../repositories/wallet.repository.js';

export async function createDeposit(req, res) {
    const { amount, currency, paymentMethod } = req.body;
    const userId = req.user.id;
    
    // Gọi service
    const result = await walletService.createDeposit(
        userId, amount, currency, paymentMethod
    );
    
    // Trả response
    return res.status(201).json(result);
}
```

---

### 🧠 SERVICE Layer

**Nhiệm vụ:**
- Business logic
- Transaction management (`pool.getConnection()`)
- Orchestrate nhiều repository calls
- Data transformation
- Tính toán phức tạp

**Quy tắc:**
- ✅ Được import `pool` CHỈ để `pool.getConnection()` (transaction)
- ✅ Gọi repository để query DB
- ✅ Chứa business rules (ví dụ: fee calculation, credit logic)
- ❌ KHÔNG viết raw SQL trực tiếp (phải qua repository)
- ❌ KHÔNG xử lý req/res

**Ví dụ:**
```javascript
// wallet.service.js
import pool from '#db';
import walletRepository from '../repositories/wallet.repository.js';
import currencyService from '#services/currencyService.js';

class WalletService {
    async creditDeposit(userId, transactionId, amount, currency) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            // Lock wallet
            const wallet = await walletRepository.findByUserIdForUpdate(
                connection, userId
            );
            
            // Business logic: convert currency
            const amountUsd = currency !== 'USD' 
                ? currencyService.convertCurrency(amount, currency, 'USD')
                : amount;
            
            // Update balance
            const newBalance = parseFloat(wallet.balance) + amountUsd;
            await walletRepository.updateBalance(
                connection, wallet.id, newBalance
            );
            
            // Create transaction record
            await walletRepository.createTransaction({
                walletId: wallet.id,
                type: 'deposit',
                amount: amountUsd,
                status: 'completed'
            }, connection);
            
            await connection.commit();
            return { success: true, newBalance };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}
```

---

### 💾 REPOSITORY Layer

**Nhiệm vụ:**
- Nơi DUY NHẤT chứa raw SQL
- CRUD operations
- Query builder
- Database abstraction

**Quy tắc:**
- ✅ Import `pool` từ `#db`
- ✅ Viết TẤT CẢ raw SQL queries
- ✅ Methods nhận `connection` optional (cho transactions)
- ❌ KHÔNG có business logic
- ❌ KHÔNG có data transformation phức tạp

**Ví dụ:**
```javascript
// wallet.repository.js
import pool from '#db';

class WalletRepository {
    // Query thường (không transaction)
    async findByUserId(userId) {
        const [wallets] = await pool.execute(
            'SELECT * FROM user_wallets WHERE user_id = ?',
            [userId]
        );
        return wallets[0] || null;
    }
    
    // Query trong transaction (nhận connection)
    async findByUserIdForUpdate(connection, userId) {
        const [wallets] = await connection.execute(
            'SELECT * FROM user_wallets WHERE user_id = ? FOR UPDATE',
            [userId]
        );
        return wallets[0] || null;
    }
    
    // Update với connection optional
    async updateBalance(connectionOrPool, walletId, newBalance) {
        const conn = connectionOrPool || pool;
        await conn.execute(
            `UPDATE user_wallets 
             SET balance = ?, updated_at = NOW() 
             WHERE id = ?`,
            [newBalance, walletId]
        );
    }
    
    // Create transaction
    async createTransaction(data, connectionOrPool) {
        const conn = connectionOrPool || pool;
        const [result] = await conn.execute(
            `INSERT INTO wallet_transactions 
             (wallet_id, type, amount, status) 
             VALUES (?, ?, ?, ?)`,
            [data.walletId, data.type, data.amount, data.status]
        );
        return result;
    }
}

export default new WalletRepository();
```

---

### 🔒 Security & Middleware Stack

```
Request
  ↓
helmet() - Security headers
  ↓
cors() - Origin validation
  ↓
Rate Limiter:
  - /auth/login → authLimiter (10/15min)
  - /chat → aiLimiter (10/min)
  - /payment/*/ipn → webhookLimiter (30/min)
  ↓
express.json() - Parse body
  ↓
validate(schema) - Zod validation
  ↓
verifyToken - JWT auth
  ↓
Controller
```

---

### 📁 Cấu trúc module chuẩn

```
backend/src/modules/<module-name>/
├── controllers/
│   ├── <feature>.controller.js    # HTTP handlers
│   └── gateways/                  # External integrations
├── services/
│   └── <module>.service.js        # Business logic + transactions
├── repositories/
│   └── <module>.repository.js     # Raw SQL queries
├── routes/
│   └── <module>.routes.js         # Express routes + validation
├── <module>.schemas.js            # Zod validation schemas
└── <module>.constants.js          # Constants/enums
```

---

### ✅ Checklist khi tạo feature mới

**1. Repository (nếu cần query DB mới):**
- [ ] Tạo methods với raw SQL
- [ ] Hỗ trợ `connection` optional cho transactions
- [ ] Export singleton instance

**2. Service:**
- [ ] Import repository
- [ ] Viết business logic
- [ ] Dùng `pool.getConnection()` cho transactions
- [ ] Không viết raw SQL

**3. Controller:**
- [ ] Import service (không import pool)
- [ ] Xử lý req/res
- [ ] Trả đúng HTTP status codes

**4. Validation:**
- [ ] Tạo Zod schema trong `<module>.schemas.js`
- [ ] Áp dụng `validate()` middleware trong routes

**5. Routes:**
- [ ] Thêm rate limiter nếu cần (auth/AI endpoints)
- [ ] Thứ tự middleware: rate limiter → auth → validate → controller

---

### 🚫 Anti-patterns cần tránh

❌ **Controller viết SQL:**
```javascript
// WRONG
export async function getWallet(req, res) {
    const [wallets] = await pool.execute('SELECT * FROM ...');
}
```

✅ **Đúng:**
```javascript
// CORRECT
export async function getWallet(req, res) {
    const wallet = await walletService.getWallet(req.user.id);
    res.json(wallet);
}
```

---

❌ **Service viết raw SQL:**
```javascript
// WRONG
async creditDeposit(userId) {
    await pool.execute('UPDATE user_wallets SET ...');
}
```

✅ **Đúng:**
```javascript
// CORRECT
async creditDeposit(userId) {
    await walletRepository.updateBalance(connection, walletId, newBalance);
}
```

---

❌ **Repository có business logic:**
```javascript
// WRONG
async updateBalance(walletId, amount) {
    const fee = amount * 0.05; // Business logic!
    await pool.execute('UPDATE ... SET balance = balance + ?', [amount - fee]);
}
```

✅ **Đúng:**
```javascript
// CORRECT - Repository chỉ update
async updateBalance(connectionOrPool, walletId, newBalance) {
    const conn = connectionOrPool || pool;
    await conn.execute(
        'UPDATE user_wallets SET balance = ? WHERE id = ?',
        [newBalance, walletId]
    );
}

// Business logic ở Service
async creditDeposit(userId, amount) {
    const fee = this.calculateFee(amount); // Business logic
    const finalAmount = amount - fee;
    await walletRepository.updateBalance(conn, walletId, finalAmount);
}
```
