# 📘 Phase 2 Setup Guide - Subscription & Usage Tracking

## Tổng Quan

Phase 2 bao gồm:
- **2.1 Subscription Tiers** - Hệ thống gói đăng ký (Free, Pro, Team)
- **2.2 Usage Tracking** - Theo dõi và hiển thị usage của người dùng

---

## 🗄️ Bước 1: Database Migration

### Chạy Migration Script

1. **Kết nối MySQL:**
   ```bash
   mysql -u your_username -p your_database_name
   ```

2. **Chạy migration script:**
   ```sql
   source db/phase2_subscription_usage_schema.sql;
   ```
   
   Hoặc copy nội dung file và chạy trong MySQL client.

### Kiểm Tra Migration

Sau khi chạy migration, kiểm tra các tables đã được tạo:

```sql
-- Kiểm tra subscription_tiers
SELECT * FROM subscription_tiers;

-- Kiểm tra user_subscriptions (sẽ tự động tạo cho existing users)
SELECT * FROM user_subscriptions LIMIT 5;

-- Kiểm tra user_usage
SELECT * FROM user_usage LIMIT 5;
```

**Kết quả mong đợi:**
- `subscription_tiers`: 3 rows (free, pro, team)
- `user_subscriptions`: Mỗi user sẽ có 1 subscription mặc định (free tier)
- `user_usage`: Table trống (sẽ được populate khi user sử dụng)

---

## 🔧 Bước 2: Backend Setup

### Kiểm Tra Files Đã Tạo

Các files backend đã được tạo:
- ✅ `backend/controllers/subscriptionController.js`
- ✅ `backend/controllers/usageController.js`
- ✅ `backend/routes/subscription.js`
- ✅ `backend/routes/usage.js` (đã cập nhật)
- ✅ `backend/index.js` (đã tích hợp routes)

### API Endpoints

#### Subscription APIs:
- `GET /subscription/tiers` - Lấy danh sách tiers (public)
- `GET /subscription/current` - Lấy subscription hiện tại (protected)
- `POST /subscription/upgrade` - Upgrade subscription (protected)
- `POST /subscription/cancel` - Cancel subscription (protected)
- `POST /subscription/renew` - Renew subscription (protected)

#### Usage APIs:
- `GET /usage/today` - Usage hôm nay (protected)
- `GET /usage/stats?period=week` - Statistics (protected)
- `GET /usage/limits` - Current limits (protected)
- `GET /usage/history` - Usage history (protected)

### Test Backend APIs

```bash
# Test get tiers (public)
curl http://localhost:3001/subscription/tiers

# Test get current subscription (cần token)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/subscription/current

# Test get today usage (cần token)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/usage/today
```

---

## 🎨 Bước 3: Frontend Setup

### Components Đã Tạo

Các components frontend đã được tạo:
- ✅ `frontend/src/component/SubscriptionStatus.js`
- ✅ `frontend/src/component/SubscriptionPlans.js`
- ✅ `frontend/src/component/UsageDashboard.js`
- ✅ `frontend/src/component/UsageLimits.js`
- ✅ `frontend/src/component/ProfileSettings.js` (đã tích hợp)

### Translations

Đã thêm translations cho subscription và usage vào `LanguageContext.js`:
- Tiếng Việt: ✅
- English: ✅

### Kiểm Tra Frontend

1. **Start frontend:**
   ```bash
   cd frontend
   npm start
   ```

2. **Truy cập Profile Settings:**
   - Login vào hệ thống
   - Click vào Profile Settings
   - Kiểm tra các sections:
     - Subscription Status
     - Usage Dashboard
     - Subscription Plans

---

## 📊 Bước 4: Usage Tracking Integration

### ✅ Đã Implement

Usage tracking đã được tích hợp vào các controllers:

#### 1. Track Queries (Chat) ✅

**`backend/controllers/chatController.js`:**
- ✅ Đã import `trackUsage` từ `usageController.js`
- ✅ Track query count và tokens sau mỗi query thành công
- ✅ Code: `await trackUsage(userId, 'query', { tokens: context.length || 0 });`

**`backend/controllers/advancedChatController.js`:**
- ✅ Đã import `trackUsage` từ `usageController.js`
- ✅ Track advanced RAG count và tokens sau mỗi advanced query
- ✅ Code: `await trackUsage(userId, 'advanced_rag', { tokens: fusedContext.length || 0 });`

#### 2. Track File Uploads ✅

**`backend/controllers/uploadController.js`:**
- ✅ Đã import `incrementUsage` từ `usageController.js`
- ✅ Track file upload count và file size sau khi upload thành công
- ✅ Code:
  ```javascript
  const fileSizeMB = file.size / (1024 * 1024);
  await incrementUsage(userId, 'file_upload', 1);
  await incrementUsage(userId, 'file_size', fileSizeMB);
  ```

**`backend/routes/upload.js`:**
- ✅ Đã thêm `verifyToken` middleware để lấy userId từ request

### ✅ Usage Tracking Functions

**`trackUsage(userId, type, options)`** - Dùng cho chat queries:
- Tự động track query/advanced_rag count (tăng 1)
- Tự động track tokens nếu có trong options
- Ví dụ: `await trackUsage(userId, 'query', { tokens: 100 });`

**`incrementUsage(userId, type, value)`** - Dùng cho file uploads:
- Track từng loại usage riêng biệt
- Ví dụ: `await incrementUsage(userId, 'file_upload', 1);`

---

## ✅ Bước 5: Testing

### Test Subscription

1. **Kiểm tra subscription hiện tại:**
   - Vào Profile Settings
   - Xem Subscription Status section
   - Nên hiển thị "Free" tier

2. **Test upgrade (nếu muốn):**
   - Click "Upgrade" trên một plan
   - Xác nhận
   - Kiểm tra subscription đã được update

### Test Usage Tracking

1. **Kiểm tra usage dashboard:**
   - Vào Profile Settings
   - Xem Usage Dashboard section
   - Nên hiển thị usage hôm nay (0 nếu chưa có activity)

2. **Test track queries:**
   - Gửi một query trong chat (regular hoặc advanced)
   - Refresh Profile Settings
   - Kiểm tra `queries_count` hoặc `advanced_rag_count` đã tăng
   - Kiểm tra `tokens_used` đã tăng (nếu có)

3. **Test track file uploads:**
   - Upload một file (DOCX hoặc TXT) trong Knowledge Admin
   - Refresh Profile Settings
   - Kiểm tra `file_uploads_count` đã tăng
   - Kiểm tra `file_uploads_size_mb` đã tăng theo kích thước file

4. **Kiểm tra database:**
   ```sql
   -- Xem usage hôm nay
   SELECT * FROM user_usage 
   WHERE user_id = YOUR_USER_ID 
   AND date = CURDATE();
   ```

---

## 🐛 Troubleshooting

### Database Issues

**Lỗi: Table already exists**
```sql
-- Xóa và tạo lại (cẩn thận, sẽ mất data)
DROP TABLE IF EXISTS user_usage;
DROP TABLE IF EXISTS usage_limits;
DROP TABLE IF EXISTS user_subscriptions;
DROP TABLE IF EXISTS subscription_tiers;
-- Sau đó chạy lại migration script
```

**Lỗi: Foreign key constraint**
- Đảm bảo `users` table đã tồn tại
- Kiểm tra user_id trong user_subscriptions phải tồn tại trong users table

### Backend Issues

**Lỗi: Cannot find module**
```bash
cd backend
npm install
```

**Lỗi: Route not found**
- Kiểm tra `backend/index.js` đã import subscription routes
- Restart backend server

### Frontend Issues

**Lỗi: Component not found**
```bash
cd frontend
npm install
```

**Lỗi: Translation missing**
- Kiểm tra `LanguageContext.js` đã có translations
- Clear browser cache

---

## 📝 Next Steps

### Phase 2.1 - Subscription (Đã hoàn thành)
- ✅ Database schema
- ✅ Backend controllers & routes
- ✅ Frontend components
- ✅ Integration vào ProfileSettings

### Phase 2.2 - Usage Tracking ✅ **ĐÃ HOÀN THÀNH**
- ✅ Database schema
- ✅ Backend controllers & routes
- ✅ Frontend components
- ✅ **Đã tích hợp tracking vào chat/upload controllers**
  - ✅ Chat queries tracking (`chatController.js`)
  - ✅ Advanced RAG tracking (`advancedChatController.js`)
  - ✅ File uploads tracking (`uploadController.js`)

### Future Enhancements
- Payment integration (Stripe, PayPal)
- Email notifications khi gần hết limit
- Usage analytics & charts
- Auto-upgrade prompts

---

## 📚 Tài Liệu Tham Khảo

- `ACCOUNT_MANAGEMENT_ROADMAP.md` - Roadmap chi tiết
- `PHASE_1_IMPLEMENTATION_STATUS.md` - Status Phase 1
- `db/phase2_subscription_usage_schema.sql` - Database schema

---

## ✅ Checklist

- [ ] Đã chạy database migration
- [ ] Đã kiểm tra backend APIs hoạt động
- [ ] Đã kiểm tra frontend components hiển thị đúng
- [x] ✅ Đã tích hợp usage tracking vào chat/upload controllers
- [ ] Đã test subscription upgrade/downgrade
- [ ] Đã test usage tracking (queries và file uploads)

---

**Chúc bạn setup thành công! 🎉**

