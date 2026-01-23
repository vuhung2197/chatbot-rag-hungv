# QUICK FIX GUIDE: SỬA LỖ HỔNG ADMIN/USER NGAY LẬP TỨC

**Ngày:** 2026-01-23  
**Mức độ:** 🔴 CRITICAL  
**Thời gian fix:** 30-60 phút  

---

## 🎯 MỤC TIÊU

Fix 3 lỗ hổng nghiêm trọng nhất trong **30-60 phút**:
1. ✅ Disable self-registration as admin
2. ✅ Protect admin APIs với requireAdmin middleware
3. ✅ Ẩn Knowledge Admin menu cho user thường

---

## 📋 CHECKLIST FIX NHANH

- [ ] **Step 1:** Force role='user' trong backend register (2 phút)
- [ ] **Step 2:** Ẩn role selector trong frontend register (1 phút)
- [ ] **Step 3:** Apply requireAdmin cho knowledge routes (5 phút)
- [ ] **Step 4:** Apply requireAdmin cho unanswered routes (2 phút)
- [ ] **Step 5:** Apply requireAdmin cho upload route (2 phút)
- [ ] **Step 6:** Ẩn Knowledge Admin menu cho user (3 phút)
- [ ] **Step 7:** Tạo admin đầu tiên bằng SQL (1 phút)
- [ ] **Step 8:** Test API protection (5 phút)
- [ ] **Step 9:** Restart backend server (1 phút)

---

## 🔧 STEP-BY-STEP IMPLEMENTATION

### Step 1: Force role='user' trong Backend Register
**File:** `backend/controllers/authController.js`  
**Dòng:** ~315-326

**TRƯỚC:**
```javascript
export async function register(req, res) {
  const { name, email, password, role = 'user' } = req.body;  // ← Accept từ client
  
  // ✅ Chỉ cho phép 'user' hoặc 'admin'
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  
  await pool.execute(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name, email, hash, role]  // ← Dùng role từ client
  );
}
```

**SAU:**
```javascript
export async function register(req, res) {
  const { name, email, password } = req.body;  // ← KHÔNG accept role
  const role = 'user';  // ← FORCE user role
  
  // XÓA validation role vì luôn là 'user'
  
  await pool.execute(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name, email, hash, role]  // ← Luôn là 'user'
  );
}
```

**Commands:**
```bash
# Mở file
code backend/controllers/authController.js

# Tìm dòng ~315 và sửa
```

---

### Step 2: Ẩn Role Selector trong Frontend Register
**File:** `frontend/src/component/Register.js`  
**Dòng:** ~19, 71-79

**TRƯỚC:**
```javascript
const [role, setRole] = useState('user');

// ...

<label>Vai trò:</label>
<select value={role} onChange={e => setRole(e.target.value)}>
  <option value='user'>User</option>
  <option value='admin'>Admin</option>  {/* ← ⚠️ LỖ HỔNG */}
</select>
```

**SAU:**
```javascript
// XÓA state role, không cần nữa
// const [role, setRole] = useState('user');  // ← XÓA dòng này

// ...

{/* XÓA toàn bộ role selector */}
{/* KHÔNG cần hiển thị gì vì luôn là user */}
```

**Hoặc nếu muốn giữ để tương thích:**
```javascript
const [role] = useState('user');  // Read-only

// XÓA select, chỉ để hidden input
<input type="hidden" name="role" value="user" />
```

---

### Step 3: Apply requireAdmin cho Knowledge Routes
**File:** `backend/routes/knowledge.js`

**TRƯỚC:**
```javascript
import { getKnowledge, createKnowledge, updateKnowledge, deleteKnowledge, getChunks } from '../controllers/knowledgeController.js';

const router = express.Router();

router.get('/', getKnowledge);
router.post('/', createKnowledge);
router.put('/:id', updateKnowledge);
router.delete('/:id', deleteKnowledge);
router.get('/:id/chunks', getChunks);
```

**SAU:**
```javascript
import { getKnowledge, createKnowledge, updateKnowledge, deleteKnowledge, getChunks } from '../controllers/knowledgeController.js';
import { verifyToken, requireAdmin } from '../middlewares/authMiddleware.js';  // ← THÊM

const router = express.Router();

// READ: Public hoặc authenticated users (tuỳ chọn)
router.get('/', getKnowledge);  // Hoặc thêm verifyToken nếu muốn

// WRITE: CHỈ ADMIN
router.post('/', verifyToken, requireAdmin, createKnowledge);      // ← THÊM middlewares
router.put('/:id', verifyToken, requireAdmin, updateKnowledge);    // ← THÊM middlewares
router.delete('/:id', verifyToken, requireAdmin, deleteKnowledge); // ← THÊM middlewares
router.get('/:id/chunks', verifyToken, requireAdmin, getChunks);   // ← THÊM middlewares
```

---

### Step 4: Apply requireAdmin cho Unanswered Routes
**File:** `backend/routes/unanswered.js`

**TRƯỚC:**
```javascript
import express from 'express';
import { getUnansweredQuestions, deleteUnanswered } from '../controllers/unansweredController.js';

const router = express.Router();

router.get('/', getUnansweredQuestions);
router.delete('/:id', deleteUnanswered);

export default router;
```

**SAU:**
```javascript
import express from 'express';
import { getUnansweredQuestions, deleteUnanswered } from '../controllers/unansweredController.js';
import { verifyToken, requireAdmin } from '../middlewares/authMiddleware.js';  // ← THÊM

const router = express.Router();

router.get('/', verifyToken, requireAdmin, getUnansweredQuestions);       // ← THÊM middlewares
router.delete('/:id', verifyToken, requireAdmin, deleteUnanswered);      // ← THÊM middlewares

export default router;
```

---

### Step 5: Apply requireAdmin cho Upload Route
**File:** `backend/routes/upload.js`

**TRƯỚC:**
```javascript
router.post(
  '/',
  verifyToken,      // ✅ Đã có
  upload.single('file'),
  uploadFile
);
```

**SAU:**
```javascript
router.post(
  '/',
  verifyToken,
  requireAdmin,     // ← THÊM dòng này
  upload.single('file'),
  uploadFile
);
```

---

### Step 6: Ẩn Knowledge Admin Menu cho User
**File:** `frontend/src/App.js`  
**Dòng:** ~306-317

**TRƯỚC:**
```javascript
<nav>
  <button onClick={() => setView('chat')}>
    {t('chat.title')}
  </button>
  
  <button onClick={() => setView('knowledgeadmin')}>
    Knowledge Admin
  </button>
</nav>
```

**SAU:**
```javascript
<nav>
  <button onClick={() => setView('chat')}>
    {t('chat.title')}
  </button>
  
  {/* CHỈ hiển thị cho admin */}
  {role === 'admin' && (
    <button onClick={() => setView('knowledgeadmin')}>
      Knowledge Admin
    </button>
  )}
</nav>
```

**BONUS: Thêm redirect protection:**
```javascript
// Thêm vào useEffect, sau dòng ~119
useEffect(() => {
  // Redirect user nếu cố access admin page
  if (role === 'user' && view === 'knowledgeadmin') {
    setView('chat');
    showToast('⚠️ Bạn không có quyền truy cập trang này');
  }
}, [view, role]);
```

---

### Step 7: Tạo Admin đầu tiên
**File:** SQL Query hoặc MySQL Workbench

```sql
-- Option 1: Promote existing user
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-email@example.com'  -- ← THAY EMAIL CỦA BẠN
LIMIT 1;

-- Option 2: Promote user đầu tiên
UPDATE users 
SET role = 'admin' 
WHERE id = 1
LIMIT 1;

-- Verify
SELECT id, name, email, role FROM users WHERE role = 'admin';
```

**PowerShell command:**
```powershell
# Kết nối MySQL và chạy query
mysql -u root -p chatbot -e "UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com' LIMIT 1;"

# Hoặc nếu dùng Docker
docker exec -it mysql-container mysql -u root -p chatbot -e "UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com' LIMIT 1;"
```

---

### Step 8: Test API Protection

**Test 1: User thường KHÔNG thể thêm knowledge**
```bash
# Login as user
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Save token
TOKEN="<token-from-response>"

# Try to create knowledge (should FAIL with 403)
curl -X POST http://localhost:3001/knowledge \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","content":"Test content"}'

# Expected: 403 Forbidden { "message": "Admin only" }
```

**Test 2: Admin CÓ THỂ thêm knowledge**
```bash
# Login as admin
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Save token
ADMIN_TOKEN="<token-from-response>"

# Try to create knowledge (should SUCCESS)
curl -X POST http://localhost:3001/knowledge \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Admin","content":"Admin can create"}'

# Expected: 200 OK with created knowledge
```

---

### Step 9: Restart Backend Server

**PowerShell:**
```powershell
# Nếu đang chạy bằng npm
cd backend
npm run dev

# Hoặc nếu dùng nodemon (auto-restart)
# Nodemon sẽ tự động restart khi file thay đổi

# Nếu dùng PM2
pm2 restart chatbot-backend
```

---

## ✅ VERIFICATION CHECKLIST

### Backend Checks
- [ ] File `authController.js` đã force role='user'
- [ ] File `knowledge.js` routes có `requireAdmin`
- [ ] File `unanswered.js` routes có `requireAdmin`
- [ ] File `upload.js` route có `requireAdmin`
- [ ] Backend server đã restart

### Frontend Checks
- [ ] File `Register.js` đã ẩn role selector
- [ ] File `App.js` đã ẩn Knowledge Admin button cho user
- [ ] File `App.js` có redirect protection

### Database Checks
- [ ] Đã có ít nhất 1 admin
```sql
SELECT COUNT(*) FROM users WHERE role = 'admin';
-- Expected: >= 1
```

### Functional Tests
- [ ] User KHÔNG thể đăng ký làm admin
- [ ] User KHÔNG thể thêm/sửa/xóa knowledge
- [ ] User KHÔNG thấy nút "Knowledge Admin"
- [ ] Admin CÓ THỂ thêm/sửa/xóa knowledge
- [ ] Admin THẤY nút "Knowledge Admin"

---

## 🔍 TROUBLESHOOTING

### Issue 1: Backend vẫn cho phép user tạo knowledge
**Nguyên nhân:** Middleware chưa được apply hoặc server chưa restart

**Fix:**
```bash
# 1. Check routes file
cat backend/routes/knowledge.js | grep requireAdmin

# 2. Restart server
cd backend
npm run dev
```

### Issue 2: Frontend vẫn hiển thị menu cho user
**Nguyên nhân:** Browser cache hoặc chưa rebuild

**Fix:**
```bash
# Clear browser cache (Ctrl + Shift + R)

# Hoặc rebuild frontend
cd frontend
npm run build
npm start
```

### Issue 3: Middleware báo lỗi "requireAdmin is not a function"
**Nguyên nhân:** Import sai hoặc middleware chưa export

**Fix:**
```javascript
// Check authMiddleware.js có export đúng
export function requireAdmin(req, res, next) { ... }

// Import đúng syntax
import { verifyToken, requireAdmin } from '../middlewares/authMiddleware.js';
```

---

## 📊 POST-FIX VALIDATION

Chạy queries sau để verify:

```sql
-- 1. Kiểm tra có admin
SELECT role, COUNT(*) as count FROM users GROUP BY role;
-- Expected: admin: >= 1, user: >= 0

-- 2. Test user đã upload file (nếu có)
SELECT u.email, u.role, SUM(uu.file_uploads_count) as uploads
FROM users u
JOIN user_usage uu ON u.id = uu.user_id
WHERE uu.file_uploads_count > 0
GROUP BY u.email, u.role;
-- Expected: Chỉ thấy role='admin' upload

-- 3. Check latest registrations
SELECT name, email, role, created_at 
FROM users 
ORDER BY created_at DESC 
LIMIT 5;
-- Expected: role luôn là 'user'
```

---

## 🎉 SUCCESS CRITERIA

Khi nào coi như **ĐÃ FIX XONG**:

✅ **Backend:**
1. Register chỉ tạo được user role
2. Knowledge APIs trả 403 cho user thường
3. Upload API trả 403 cho user thường
4. Unanswered APIs trả 403 cho user thường

✅ **Frontend:**
1. Register form không có option admin
2. User không thấy nút Knowledge Admin
3. User bị redirect nếu cố access admin page

✅ **Database:**
1. Có ít nhất 1 admin
2. Không có user mới với role='admin' được tạo từ register

---

## 📝 COMMIT MESSAGE

```
🔒 CRITICAL: Fix admin/user authorization

- Force role='user' in backend registration
- Remove admin option from frontend register form  
- Apply requireAdmin middleware to:
  - Knowledge CRUD routes
  - Unanswered questions routes
  - File upload route
- Hide Knowledge Admin menu for regular users
- Add redirect protection for admin pages

BREAKING CHANGE: Users can no longer self-register as admin
Only existing admins can manage knowledge base

Fixes: #SECURITY-001
```

---

**⏱️ Total Time:** ~30-60 phút  
**Priority:** 🔴 CRITICAL - Fix NGAY LẬP TỨC  
**Risk:** LOW (chỉ thêm protection, không breaking existing functionality)

---

**End of Quick Fix Guide**
