# PHÂN TÍCH CHI TIẾT: SỰ KHÁC BIỆT GIỮA TÀI KHOẢN ADMIN VÀ USER THƯỜNG

**Ngày tạo:** 2026-01-23  
**Người phân tích:** Antigravity AI  
**Mục đích:** Phân tích toàn diện sự khác biệt về quyền hạn, hiển thị và logic xử lý giữa admin và user thường

---

## 📊 TỔNG QUAN

Hệ thống hiện tại có **2 loại tài khoản**:
- **User** (người dùng thường)
- **Admin** (quản trị viên)

### Hiện trạng
⚠️ **QUAN TRỌNG**: Hệ thống đã có cơ sở hạ tầng cho phân quyền admin/user nhưng **CHƯA được triển khai đầy đủ**.

---

## 🗄️ CẤU TRÚC DATABASE

### Bảng `users`
```sql
-- File: db/init.sql (dòng 93-114)
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',  -- ← Trường xác định role
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  account_status ENUM('active','suspended','deleted') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ... 
);
```

**Phân tích:**
- ✅ Có trường `role` với 2 giá trị: `'user'` hoặc `'admin'`
- ✅ Mặc định là `'user'` khi đăng ký
- ✅ Không có constraints đặc biệt (có thể thay đổi role)

---

## 🔐 BACKEND - XÁC THỰC VÀ PHÂN QUYỀN

### 1. Middleware xác thực

#### File: `backend/middlewares/authMiddleware.js`

**Middleware `verifyToken` (dòng 16-71):**
```javascript
export async function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  // 1. Verify JWT
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
  // 2. Check session trong database
  const [sessions] = await pool.execute(
    `SELECT id, user_id, expires_at 
     FROM user_sessions 
     WHERE token_hash = ? AND expires_at > NOW()`,
    [tokenHash]
  );
  
  // 3. Gán user vào req.user
  req.user = decoded;  // ← Chứa { id, role }
  req.sessionId = session.id;
  
  next();
}
```

**Công dụng:**
- ✅ Xác thực tất cả requests
- ✅ Gán `req.user` chứa `id` và `role`
- ✅ Áp dụng cho cả admin và user

---

**Middleware `requireAdmin` (dòng 82-86):**
```javascript
export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin')
    return res.status(403).json({ message: 'Admin only' });
  next();
}
```

**Công dụng:**
- ✅ Kiểm tra role = 'admin'
- ✅ Trả về 403 Forbidden nếu không phải admin
- ⚠️ **CHƯA được sử dụng trong bất kỳ route nào!**

---

### 2. Đăng ký và Đăng nhập

#### File: `backend/controllers/authController.js`

**Đăng ký `register()` (dòng 315-326):**
```javascript
const { name, email, password, role = 'user' } = req.body;

// ✅ Chỉ cho phép 'user' hoặc 'admin'
if (!['user', 'admin'].includes(role)) {
  return res.status(400).json({ message: 'Invalid role' });
}

await pool.execute(
  'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
  [name, email, hash, role]
);
```

**Phân tích:**
- ✅ User có thể **tự chọn role** khi đăng ký
- ⚠️ **LỖ HỔNG BẢO MẬT**: Không có validation, bất kỳ ai cũng có thể tạo tài khoản admin
- ❌ KHUYẾN NGHỊ: Chỉ admin hiện tại mới được tạo admin mới

---

**Đăng nhập `loginUser()` (dòng 258, 672, 692):**
```javascript
// 1. Tạo JWT token với role
const token = jwt.sign(
  { id: user.id, role: user.role },  // ← Role được include
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// 2. Trả về token và role cho frontend
res.json({ token, role: user.role, id: user.id });
```

**Phân tích:**
- ✅ Role được lưu trong JWT token
- ✅ Frontend nhận được role để điều hướng

---

### 3. Google OAuth

**File: `backend/controllers/authController.js` (dòng 286, 294)**

```javascript
// Redirect kèm role trong URL
const redirectTo = 
  `${frontendUrl}?token=${jwtToken}&role=${user.role}&id=${user.id}`;
```

**Phân tích:**
- ✅ OAuth cũng truyền role cho frontend
- ✅ Nhất quán với login thường

---

## 🎨 FRONTEND - HIỂN THỊ VÀ ĐIỀU HƯỚNG

### 1. Lưu trữ Role

#### File: `frontend/src/App.js`

**State management (dòng 24, 75, 88):**
```javascript
// 1. Lưu trong localStorage
localStorage.setItem('role', roleFromUrl);

// 2. Lưu trong state
const [role, setRole] = useState(localStorage.getItem('role'));

// 3. Clear khi logout
localStorage.removeItem('role');
```

**Phân tích:**
- ✅ Role được persist trong localStorage
- ✅ Sync giữa localStorage và React state
- ⚠️ **KHÔNG AN TOÀN**: Frontend có thể chỉnh sửa localStorage

---

### 2. Điều hướng View theo Role

#### File: `frontend/src/App.js` (dòng 118)

```javascript
useEffect(() => {
  if (role) 
    setView(role === 'admin' ? 'knowledgeadmin' : 'chat');
}, [role]);
```

**Logic hiển thị:**
- **Admin** → View: `knowledgeadmin` (Knowledge Admin panel)
- **User** → View: `chat` (Chat interface)

---

#### File: `frontend/src/App.js` (dòng 353-354)

```javascript
{view === 'chat' && <Chat darkMode={darkMode} />}
{view === 'knowledgeadmin' && <KnowledgeAdmin darkMode={darkMode} />}
```

**Phân tích:**
- ✅ User và Admin thấy views khác nhau
- ⚠️ **KHÔNG có kiểm tra backend**: User có thể access KnowledgeAdmin nếu thay đổi `view` state

---

### 3. Navigation Menu

#### File: `frontend/src/App.js` (dòng 294-317)

```javascript
<nav>
  <button
    onClick={() => setView('chat')}
    style={{
      background: view === 'chat' ? '#7137ea' : '#f6f9fc',
      ...
    }}
  >
    Chat
  </button>
  
  <button
    onClick={() => setView('knowledgeadmin')}
    style={{
      background: view === 'knowledgeadmin' ? '#7137ea' : '#f6f9fc',
      ...
    }}
  >
    Knowledge Admin
  </button>
</nav>
```

**Phân tích:**
- ❌ **KHÔNG có ẩn/hiện menu dựa trên role**
- ❌ User thường cũng thấy nút "Knowledge Admin"
- ⚠️ User thường CÓ THỂ click vào Knowledge Admin

---

### 4. Form Đăng ký - Chọn Role

#### File: `frontend/src/component/Register.js` (dòng 71-79)

```javascript
<label>Vai trò:</label>
<select
  value={role}
  onChange={e => setRole(e.target.value)}
>
  <option value='user'>User</option>
  <option value='admin'>Admin</option>  {/* ← ⚠️ LỖ HỔNG */}
</select>
```

**Phân tích:**
- ❌ **LỖ HỔNG NGHIÊM TRỌNG**: Bất kỳ ai cũng có thể đăng ký làm admin
- ❌ Không có validation hoặc giới hạn
- 🔴 **CRITICAL ISSUE**

---

## 🔍 CÁC TÍNH NĂNG DÀNH CHO ADMIN

### 1. Knowledge Admin Panel

#### File: `frontend/src/component/KnowledgeAdmin.js`

**Các chức năng:**
1. **Quản lý Knowledge Base** (dòng 33-59)
   - Thêm mới knowledge
   - Sửa knowledge
   - Xóa knowledge
   - Xem chunks

2. **Upload Files** (dòng 113-189)
   - Upload .txt, .md, .csv, .json
   - Auto-train sau upload

3. **Unanswered Questions** (dòng 38-111)
   - Xem câu hỏi chưa trả lời được
   - Dùng để huấn luyện bot
   - Xóa câu hỏi

**Backend APIs được gọi:**
```javascript
// Không có auth check trong frontend
GET    /knowledge              // Lấy danh sách
POST   /knowledge              // Thêm mới
PUT    /knowledge/:id          // Cập nhật
DELETE /knowledge/:id          // Xóa
GET    /knowledge/:id/chunks   // Xem chunks
POST   /upload                 // Upload file
GET    /unanswered             // Câu hỏi chưa trả lời
DELETE /unanswered/:id         // Xóa câu hỏi
```

---

### 2. Backend Routes - Knowledge

#### File: `backend/routes/knowledge.js`

```javascript
import { verifyToken } from '../middlewares/authMiddleware.js';

router.get('/', getKnowledge);          // ❌ KHÔNG có auth
router.post('/', createKnowledge);      // ❌ KHÔNG có auth  
router.put('/:id', updateKnowledge);    // ❌ KHÔNG có auth
router.delete('/:id', deleteKnowledge); // ❌ KHÔNG có auth
router.get('/:id/chunks', getChunks);   // ❌ KHÔNG có auth
```

**Phân tích:**
- ❌ **KHÔNG có `verifyToken` middleware**
- ❌ **KHÔNG có `requireAdmin` middleware**
- 🔴 **Bất kỳ ai cũng có thể CRUD knowledge base**

---

### 3. Backend Routes - Unanswered

#### File: `backend/routes/unanswered.js`

```javascript
router.get('/', getUnansweredQuestions);  // ❌ KHÔNG có auth
router.delete('/:id', deleteUnanswered);  // ❌ KHÔNG có auth
```

**Phân tích:**
- ❌ **KHÔNG có bảo vệ**
- 🔴 **Public API, ai cũng truy cập được**

---

### 4. Backend Routes - Upload

#### File: `backend/routes/upload.js`

```javascript
router.post(
  '/',
  verifyToken,      // ✅ Có auth
  upload.single('file'),
  uploadFile
);
```

**Phân tích:**
- ✅ **CÓ `verifyToken`**
- ❌ **KHÔNG có `requireAdmin`**
- ⚠️ User thường cũng có thể upload file

---

## 📋 BẢNG SO SÁNH CHI TIẾT

### ⚠️ Chú thích:
- **Lý thuyết** = Theo thiết kế, tính năng này nên dành cho ai
- **THỰC TẾ** = Hiện tại ai có thể sử dụng được (đã verify bằng database)

| Tính năng | Lý thuyết<br/>User thường | Lý thuyết<br/>Admin | **THỰC TẾ<br/>User thường** | **THỰC TẾ<br/>Admin** | Bảo vệ Backend | Ghi chú |
|-----------|---------------------------|---------------------|------------------------------|------------------------|----------------|---------|
| **Đăng nhập** | ✅ Nên có | ✅ Nên có | ✅ **CÓ** | ✅ **CÓ** | ✅ verifyToken | OK |
| **Chat** | ✅ Nên có | ✅ Nên có | ✅ **CÓ** | ✅ **CÓ** | ✅ verifyToken | OK |
| **Profile Settings** | ✅ Nên có | ✅ Nên có | ✅ **CÓ** | ✅ **CÓ** | ✅ verifyToken | OK |
| **Wallet Dashboard** | ✅ Nên có | ✅ Nên có | ✅ **CÓ** | ✅ **CÓ** | ✅ verifyToken | OK |
| **View Knowledge Admin** | ❌ KHÔNG nên | ✅ Nên có | 🔴 **CÓ** | ✅ **CÓ** | ❌ KHÔNG | 🔴 Frontend không ẩn menu |
| **Add Knowledge** | ❌ KHÔNG nên | ✅ Nên có | 🔴 **CÓ** | ✅ **CÓ** | ❌ KHÔNG | 🔴 User CÓ THỂ thêm knowledge |
| **Edit Knowledge** | ❌ KHÔNG nên | ✅ Nên có | 🔴 **CÓ** | ✅ **CÓ** | ❌ KHÔNG | 🔴 User CÓ THỂ sửa knowledge |
| **Delete Knowledge** | ❌ KHÔNG nên | ✅ Nên có | 🔴 **CÓ** | ✅ **CÓ** | ❌ KHÔNG | 🔴 User CÓ THỂ xóa knowledge |
| **Upload Files** | ❌ KHÔNG nên | ✅ Nên có | 🔴 **CÓ** | ✅ **CÓ** | ⚠️ verifyToken only | 🔴 User CÓ THỂ upload file |
| **View Unanswered** | ❌ KHÔNG nên | ✅ Nên có | 🔴 **CÓ** | ✅ **CÓ** | ❌ KHÔNG | 🔴 User CÓ THỂ xem |
| **Delete Unanswered** | ❌ KHÔNG nên | ✅ Nên có | 🔴 **CÓ** | ✅ **CÓ** | ❌ KHÔNG | 🔴 User CÓ THỂ xóa |

### 🔴 KẾT LUẬN NGHIÊM TRỌNG:

**Hiện tại User thường CÓ THỂ làm MỌI THỨ như Admin vì:**
1. ❌ Backend routes **KHÔNG** có `requireAdmin` middleware
2. ❌ Frontend menu **KHÔNG** ẩn nút Knowledge Admin
3. ❌ Hệ thống **KHÔNG** có bất kỳ kiểm tra quyền nào

**➡️ Thực tế: KHÔNG CÓ SỰ KHÁC BIỆT về quyền hạn giữa User và Admin!**

---

## 🚨 LỖ HỔNG BẢO MẬT NGHIÊM TRỌNG

### 1. ❌ Self-Registration as Admin

**Vấn đề:**
```javascript
// frontend/src/component/Register.js
<select value={role}>
  <option value='admin'>Admin</option>  // ← Ai cũng chọn được
</select>

// backend/controllers/authController.js
const { role = 'user' } = req.body;  // ← Không validate
INSERT INTO users (..., role) VALUES (..., ?)  // ← Role từ client
```

**Hậu quả:**
- 🔴 Bất kỳ ai cũng có thể tạo tài khoản admin
- 🔴 Hoàn toàn bypass security

**Giải pháp:**
```javascript
// CHỈ cho phép user thường đăng ký
const role = 'user';  // Force user role

// Hoặc require admin để tạo admin mới
if (req.body.role === 'admin' && req.user?.role !== 'admin') {
  return res.status(403).json({ message: 'Only admins can create admins' });
}
```

---

### 2. ❌ No Backend Protection for Admin APIs

**Vấn đề:**
```javascript
// Routes không có requireAdmin
router.post('/knowledge', createKnowledge);  // ← No auth
router.delete('/knowledge/:id', deleteKnowledge);  // ← No auth
```

**Hậu quả:**
- 🔴 User thường có thể xóa toàn bộ knowledge base
- 🔴 Public có thể truy cập mà không cần đăng nhập

**Giải pháp:**
```javascript
import { verifyToken, requireAdmin } from '../middlewares/authMiddleware.js';

router.post('/knowledge', verifyToken, requireAdmin, createKnowledge);
router.put('/knowledge/:id', verifyToken, requireAdmin, updateKnowledge);
router.delete('/knowledge/:id', verifyToken, requireAdmin, deleteKnowledge);
```

---

### 3. ❌ Frontend-Only Access Control

**Vấn đề:**
```javascript
// App.js - Chỉ frontend check
if (role) setView(role === 'admin' ? 'knowledgeadmin' : 'chat');
```

**Hậu quả:**
- 🔴 User có thể bypass bằng cách:
  - Sửa localStorage: `localStorage.setItem('role', 'admin')`
  - Sửa React DevTools state
  - Gọi trực tiếp API endpoints

**Giải pháp:**
- ✅ LUÔN validate ở backend
- ✅ Frontend chỉ để UX, không để security

---

### 4. ❌ Navigation Menu không ẩn theo Role

**Vấn đề:**
```javascript
// App.js - Cả User và Admin đều thấy nút "Knowledge Admin"
<button onClick={() => setView('knowledgeadmin')}>
  Knowledge Admin
</button>
```

**Giải pháp:**
```javascript
<nav>
  <button onClick={() => setView('chat')}>Chat</button>
  
  {role === 'admin' && (
    <button onClick={() => setView('knowledgeadmin')}>
      Knowledge Admin
    </button>
  )}
</nav>
```

---

## ✅ CÁC ĐIỂM ĐÚNG HIỆN TẠI

### 1. ✅ Database Schema

- Có trường `role` với ENUM('user', 'admin')
- Cấu trúc đầy đủ cho phân quyền

### 2. ✅ JWT Token chứa Role

- Token có `{ id, role }`
- Có thể verify role ở backend

### 3. ✅ Middleware `requireAdmin` đã được tạo

- Logic đúng
- Chỉ cần apply vào routes

### 4. ✅ Frontend có điều hướng theo Role

- Admin → Knowledge Admin
- User → Chat

### 5. ✅ Một số routes đã có `verifyToken`

- Upload file
- Wallet operations
- Profile management

---

## 🔧 KHUYẾN NGHỊ SỬA CHỮA

### Priority 1: CRITICAL - Fix Security Holes

#### 1.1. Xóa option "Admin" trong Register Form

```javascript
// frontend/src/component/Register.js
// XÓA select role, luôn force 'user'
const [role] = useState('user');  // Read-only

// Hoặc ẩn hoàn toàn
<input type="hidden" value="user" />
```

#### 1.2. Force role='user' trong Backend Register

```javascript
// backend/controllers/authController.js
export async function register(req, res) {
  const { name, email, password } = req.body;
  const role = 'user';  // ← Force user, không accept từ client
  
  await pool.execute(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name, email, hash, role]
  );
}
```

#### 1.3. Bảo vệ Admin APIs

```javascript
// backend/routes/knowledge.js
import { verifyToken, requireAdmin } from '../middlewares/authMiddleware.js';

// READ: Mọi người đều xem được
router.get('/', getKnowledge);

// WRITE: Chỉ admin
router.post('/', verifyToken, requireAdmin, createKnowledge);
router.put('/:id', verifyToken, requireAdmin, updateKnowledge);
router.delete('/:id', verifyToken, requireAdmin, deleteKnowledge);
```

```javascript
// backend/routes/unanswered.js
router.get('/', verifyToken, requireAdmin, getUnansweredQuestions);
router.delete('/:id', verifyToken, requireAdmin, deleteUnanswered);
```

```javascript
// backend/routes/upload.js
router.post('/', verifyToken, requireAdmin, upload.single('file'), uploadFile);
```

---

### Priority 2: HIGH - Improve UX

#### 2.1. Ẩn Knowledge Admin menu cho User

```javascript
// frontend/src/App.js
<nav>
  <button onClick={() => setView('chat')}>
    {t('chat.title')}
  </button>
  
  {role === 'admin' && (
    <button onClick={() => setView('knowledgeadmin')}>
      Knowledge Admin
    </button>
  )}
</nav>
```

#### 2.2. Redirect User nếu cố access Admin page

```javascript
// frontend/src/App.js
useEffect(() => {
  if (role === 'user' && view === 'knowledgeadmin') {
    setView('chat');
    showToast('Bạn không có quyền truy cập trang này');
  }
}, [view, role]);
```

---

### Priority 3: MEDIUM - Admin Management

#### 3.1. Tạo API cho Admin tạo Admin khác

```javascript
// backend/routes/admin.js (NEW FILE)
import { verifyToken, requireAdmin } from '../middlewares/authMiddleware.js';

router.post('/users', verifyToken, requireAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;
  
  // Validate
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  
  // Chỉ admin mới tạo được admin
  if (role === 'admin' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can create admins' });
  }
  
  // Create user...
});
```

#### 3.2. Tạo Admin Panel page

```javascript
// frontend/src/component/AdminPanel.js (NEW FILE)
function AdminPanel() {
  return (
    <div>
      <h2>Admin Panel</h2>
      
      {/* User Management */}
      <UserList />
      
      {/* Create New Admin */}
      <CreateAdminForm />
      
      {/* System Stats */}
      <SystemStats />
    </div>
  );
}
```

---

## 📊 TỔNG KẾT

### Hiện trạng

| Khía cạnh | Đánh giá | Ghi chú |
|-----------|----------|---------|
| **Database** | ✅ Tốt | Có cấu trúc đầy đủ |
| **Middleware** | ⚠️ Chưa dùng | `requireAdmin` chưa apply |
| **Backend APIs** | 🔴 Nguy hiểm | Không bảo vệ admin endpoints |
| **Frontend** | ⚠️ Cần cải thiện | Không ẩn menu theo role |
| **Registration** | 🔴 Lỗ hổng | Ai cũng tạo admin được |

### Độ ưu tiên Fix

1. **🔴 CRITICAL** - Fix registration (không cho tự tạo admin)
2. **🔴 CRITICAL** - Bảo vệ admin APIs với `requireAdmin`
3. **🟡 HIGH** - Ẩn Knowledge Admin menu cho user
4. **🟢 MEDIUM** - Tạo admin management system

---

## 📝 IMPLEMENTATION PLAN

### Phase 1: Security Fixes (1-2 ngày)
- [ ] Remove admin option từ Register form
- [ ] Force role='user' trong backend register
- [ ] Apply `requireAdmin` cho knowledge routes
- [ ] Apply `requireAdmin` cho unanswered routes
- [ ] Apply `requireAdmin` cho upload route

### Phase 2: UX Improvements (1 ngày)
- [ ] Ẩn Knowledge Admin button cho user
- [ ] Redirect user nếu access admin page
- [ ] Thêm toasts/messages khi denied access

### Phase 3: Admin Management (2-3 ngày)
- [ ] Tạo API admin/users để quản lý users
- [ ] Tạo AdminPanel component
- [ ] Implement create admin functionality
- [ ] Implement user list với role management

### Phase 4: Testing (1 ngày)
- [ ] Test user không access được admin APIs
- [ ] Test admin CRUD hoạt động bình thường
- [ ] Test không tạo được admin khi register
- [ ] Test admin tạo admin mới OK

---

**🎯 KHUYẾN NGHỊ NGAY LẬP TỨC:**

1. **Disable đăng ký admin** trong production
2. **Tạo admin đầu tiên** bằng SQL:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
   ```
3. **Apply requireAdmin middleware** cho tất cả admin endpoints
4. **Review toàn bộ routes** để đảm bảo không có endpoint nào thiếu auth

---

**End of Analysis - Status: 🔴 CRITICAL FIXES NEEDED**
