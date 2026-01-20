# 🎯 Roadmap Quản Lý Tài Khoản - AI Platform Style

## 📋 Tổng Quan

Tài liệu này mô tả chi tiết ý tưởng và roadmap để xây dựng hệ thống quản lý tài khoản giống các nền tảng AI hiện đại như **ChatGPT**, **Claude**, **Perplexity**, **Notion AI**, v.v.

**Mục tiêu**: Tạo trải nghiệm người dùng chuyên nghiệp với các tính năng quản lý tài khoản đầy đủ, từ cơ bản đến nâng cao.

---

## 🎨 Tham Khảo Các Platform Hiện Đại

### **ChatGPT (OpenAI)**
- ✅ Profile management (avatar, name, email)
- ✅ Subscription tiers (Free, Plus, Team, Enterprise)
- ✅ Usage statistics (tokens, requests)
- ✅ Chat history management (save, delete, export)
- ✅ API keys management
- ✅ Settings & preferences
- ✅ Data controls (export, delete)

### **Claude (Anthropic)**
- ✅ Conversation management (folders, tags)
- ✅ Usage limits per tier
- ✅ Custom instructions
- ✅ Sharing & collaboration
- ✅ Activity log

### **Perplexity**
- ✅ Pro features (unlimited searches)
- ✅ Usage dashboard
- ✅ Search history
- ✅ Collections (saved searches)

### **Notion AI**
- ✅ Credits system
- ✅ Usage tracking
- ✅ Workspace management
- ✅ Team collaboration

---

## 🏗️ Kiến Trúc Tổng Thể

```
┌─────────────────────────────────────────────────────────────┐
│                    USER ACCOUNT SYSTEM                       │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   PROFILE     │  │  SUBSCRIPTION │  │    USAGE      │
│  MANAGEMENT   │  │    SYSTEM     │  │   TRACKING    │
└───────────────┘  └───────────────┘  └───────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   SETTINGS    │  │    HISTORY    │  │   SECURITY    │
│ & PREFERENCES │  │  MANAGEMENT   │  │   & PRIVACY    │
└───────────────┘  └───────────────┘  └───────────────┘
```

---

## 📦 Phase 1: Foundation (Weeks 1-2)

### **1.1 Profile Management** ⭐⭐⭐

**Mục tiêu**: Cho phép người dùng quản lý thông tin cá nhân cơ bản.

#### **Tính năng:**
- ✅ **Avatar Upload**
  - Upload ảnh đại diện (max 2MB, JPG/PNG)
  - Crop & resize tự động
  - Preview trước khi lưu
  - Default avatar nếu không upload

- ✅ **Personal Information**
  - Display name (có thể khác với email)
  - Email (read-only, có thể verify)
  - Bio/Description (optional, max 500 chars)
  - Timezone (auto-detect hoặc manual)
  - Language preference (vi/en)

- ✅ **Account Status**
  - Account created date
  - Last login date
  - Account status (active/suspended/deleted)
  - Email verification status

#### **Database Schema:**
```sql
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255) NULL AFTER name;
ALTER TABLE users ADD COLUMN display_name VARCHAR(100) NULL AFTER name;
ALTER TABLE users ADD COLUMN bio TEXT NULL AFTER email;
ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT 'Asia/Ho_Chi_Minh';
ALTER TABLE users ADD COLUMN language VARCHAR(10) DEFAULT 'vi';
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(64) NULL;
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN account_status ENUM('active', 'suspended', 'deleted') DEFAULT 'active';
ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
```

#### **API Endpoints:**
```http
GET    /api/user/profile          # Lấy thông tin profile
PUT    /api/user/profile          # Cập nhật profile
POST   /api/user/avatar            # Upload avatar
DELETE /api/user/avatar            # Xóa avatar
POST   /api/user/verify-email      # Gửi email verification
GET    /api/user/verify-email/:token # Verify email
```

#### **UI Components:**
- `ProfileSettings.js` - Form chỉnh sửa profile
- `AvatarUploader.js` - Component upload avatar
- `EmailVerification.js` - Component verify email

---

### **1.2 Enhanced Authentication** ⭐⭐⭐

**Mục tiêu**: Cải thiện trải nghiệm đăng nhập/đăng ký.

#### **Tính năng:**
- ✅ **Social Login**
  - Google OAuth (đã có, cần improve)
  - GitHub OAuth (mới)
  - Microsoft OAuth (mới)
  - Link multiple accounts

- ✅ **Password Management**
  - Change password
  - Reset password via email
  - Password strength indicator
  - Two-factor authentication (2FA) - Phase 2

- ✅ **Session Management**
  - Active sessions list
  - Revoke sessions
  - Session timeout (30 days)
  - Remember device

#### **Database Schema:**
```sql
CREATE TABLE user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  device_info VARCHAR(255) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_token_hash (token_hash),
  INDEX idx_expires_at (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE user_oauth_providers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  provider ENUM('google', 'github', 'microsoft') NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  provider_email VARCHAR(255) NULL,
  access_token_encrypted BLOB NULL,
  refresh_token_encrypted BLOB NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_provider_user (provider, provider_user_id),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token (token),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### **API Endpoints:**
```http
POST   /api/auth/password/change      # Đổi mật khẩu
POST   /api/auth/password/reset       # Request reset password
POST   /api/auth/password/reset/:token # Reset password với token
GET    /api/auth/sessions             # Lấy danh sách sessions
DELETE /api/auth/sessions/:id         # Revoke session
POST   /api/auth/oauth/:provider      # Link OAuth provider
DELETE /api/auth/oauth/:provider      # Unlink OAuth provider
```

---

## 📦 Phase 2: Subscription & Usage (Weeks 3-4)

### **2.1 Subscription Tiers** ⭐⭐⭐

**Mục tiêu**: Tạo hệ thống subscription với các tier khác nhau.

#### **Tier Structure:**

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | - 50 queries/day<br>- Basic RAG only<br>- 1MB file upload<br>- 7-day chat history |
| **Pro** | $9.99/mo | - Unlimited queries<br>- Advanced RAG<br>- 10MB file upload<br>- Unlimited chat history<br>- Priority support |
| **Team** | $29.99/mo | - Everything in Pro<br>- Team collaboration<br>- Shared knowledge base<br>- Admin dashboard<br>- API access |
| **Enterprise** | Custom | - Everything in Team<br>- Custom deployment<br>- SLA guarantee<br>- Dedicated support<br>- Custom integrations |

#### **Database Schema:**
```sql
CREATE TABLE subscription_tiers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  price_monthly DECIMAL(10, 2) NOT NULL,
  price_yearly DECIMAL(10, 2) NULL,
  features JSON NOT NULL, -- {"queries_per_day": 50, "advanced_rag": false, ...}
  max_file_size_mb INT DEFAULT 1,
  max_chat_history_days INT DEFAULT 7,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE user_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  tier_id INT NOT NULL,
  status ENUM('active', 'cancelled', 'expired', 'trial') DEFAULT 'trial',
  billing_cycle ENUM('monthly', 'yearly') DEFAULT 'monthly',
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  stripe_subscription_id VARCHAR(255) NULL,
  stripe_customer_id VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_period_end (current_period_end),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tier_id) REFERENCES subscription_tiers(id)
);

-- Insert default tiers
INSERT INTO subscription_tiers (name, display_name, price_monthly, features) VALUES
('free', 'Free', 0.00, '{"queries_per_day": 50, "advanced_rag": false, "file_upload_mb": 1, "chat_history_days": 7}'),
('pro', 'Pro', 9.99, '{"queries_per_day": -1, "advanced_rag": true, "file_upload_mb": 10, "chat_history_days": -1}'),
('team', 'Team', 29.99, '{"queries_per_day": -1, "advanced_rag": true, "file_upload_mb": 50, "chat_history_days": -1, "team_collaboration": true, "api_access": true}');
```

#### **API Endpoints:**
```http
GET    /api/subscription/tiers           # Lấy danh sách tiers
GET    /api/subscription/current         # Lấy subscription hiện tại
POST   /api/subscription/upgrade         # Upgrade subscription
POST   /api/subscription/cancel          # Cancel subscription
POST   /api/subscription/renew          # Renew subscription
GET    /api/subscription/invoices        # Lấy lịch sử invoices
```

#### **UI Components:**
- `SubscriptionPlans.js` - Hiển thị các plans
- `SubscriptionStatus.js` - Trạng thái subscription hiện tại
- `BillingHistory.js` - Lịch sử thanh toán
- `UpgradePrompt.js` - Prompt upgrade khi hết limit

---

### **2.2 Usage Tracking** ⭐⭐⭐

**Mục tiêu**: Theo dõi và hiển thị usage của người dùng.

#### **Tính năng:**
- ✅ **Daily Usage Dashboard**
  - Queries used / limit
  - File uploads used / limit
  - Storage used / limit
  - Advanced RAG usage count

- ✅ **Usage Statistics**
  - Daily/weekly/monthly charts
  - Peak usage times
  - Most used features
  - Cost breakdown (nếu có)

- ✅ **Usage Alerts**
  - Warning khi gần hết limit (80%)
  - Alert khi hết limit
  - Suggestions để optimize

#### **Database Schema:**
```sql
CREATE TABLE user_usage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  date DATE NOT NULL,
  queries_count INT DEFAULT 0,
  advanced_rag_count INT DEFAULT 0,
  file_uploads_count INT DEFAULT 0,
  file_uploads_size_mb DECIMAL(10, 2) DEFAULT 0,
  tokens_used INT DEFAULT 0,
  cost_usd DECIMAL(10, 4) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_date (user_id, date),
  INDEX idx_user_id (user_id),
  INDEX idx_date (date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE usage_limits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tier_id INT NOT NULL,
  limit_type VARCHAR(50) NOT NULL, -- 'queries_per_day', 'file_size_mb', ...
  limit_value INT NOT NULL, -- -1 means unlimited
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_tier_limit (tier_id, limit_type),
  FOREIGN KEY (tier_id) REFERENCES subscription_tiers(id)
);
```

#### **API Endpoints:**
```http
GET    /api/usage/today              # Usage hôm nay
GET    /api/usage/stats              # Statistics (daily/weekly/monthly)
GET    /api/usage/limits             # Current limits
GET    /api/usage/history            # Usage history
```

#### **UI Components:**
- `UsageDashboard.js` - Dashboard tổng quan
- `UsageChart.js` - Charts hiển thị usage
- `UsageLimits.js` - Hiển thị limits và progress
- `UsageAlert.js` - Alert khi gần hết limit

---

## 📦 Phase 3: History & Organization (Weeks 5-6)

### **3.1 Enhanced Chat History** ⭐⭐⭐

**Mục tiêu**: Quản lý lịch sử chat tốt hơn với organization features.

#### **Tính năng:**
- ✅ **Conversation Management**
  - Rename conversations
  - Delete conversations
  - Archive conversations
  - Pin important conversations
  - Search conversations

- ✅ **Folders & Tags**
  - Create folders để organize
  - Add tags cho conversations
  - Filter by folder/tag
  - Bulk operations

- ✅ **Export & Share**
  - Export conversation (JSON, Markdown, PDF)
  - Share conversation link (read-only)
  - Copy conversation text

- ✅ **Auto-cleanup**
  - Auto-archive old conversations (theo tier)
  - Auto-delete after X days (theo tier)
  - Manual cleanup options

#### **Database Schema:**
```sql
ALTER TABLE user_questions ADD COLUMN conversation_id VARCHAR(36) NULL AFTER user_id;
ALTER TABLE user_questions ADD COLUMN conversation_title VARCHAR(255) NULL AFTER conversation_id;
ALTER TABLE user_questions ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE user_questions ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE user_questions ADD COLUMN folder_id INT NULL;
ALTER TABLE user_questions ADD COLUMN tags JSON NULL; -- ["work", "research", ...]
ALTER TABLE user_questions ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE user_questions ADD INDEX idx_conversation_id (conversation_id);
ALTER TABLE user_questions ADD INDEX idx_user_archived (user_id, is_archived);
ALTER TABLE user_questions ADD INDEX idx_user_pinned (user_id, is_pinned);

CREATE TABLE conversation_folders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) NULL, -- Hex color
  icon VARCHAR(50) NULL,
  parent_id INT NULL, -- For nested folders
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_parent_id (parent_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES conversation_folders(id) ON DELETE SET NULL
);

CREATE TABLE shared_conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id VARCHAR(36) NOT NULL,
  user_id INT NOT NULL,
  share_token VARCHAR(64) NOT NULL UNIQUE,
  is_public BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NULL,
  view_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_share_token (share_token),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### **API Endpoints:**
```http
GET    /api/conversations              # Lấy danh sách conversations
GET    /api/conversations/:id         # Lấy conversation detail
PUT    /api/conversations/:id         # Update conversation (title, folder, tags)
DELETE /api/conversations/:id         # Delete conversation
POST   /api/conversations/:id/archive # Archive conversation
POST   /api/conversations/:id/pin     # Pin conversation
POST   /api/conversations/:id/share   # Share conversation
GET    /api/conversations/:id/export  # Export conversation
GET    /api/folders                   # Lấy folders
POST   /api/folders                   # Tạo folder
PUT    /api/folders/:id               # Update folder
DELETE /api/folders/:id               # Delete folder
GET    /api/shared/:token              # Xem shared conversation
```

#### **UI Components:**
- `ConversationList.js` - Danh sách conversations với filters
- `ConversationSidebar.js` - Sidebar với folders và tags
- `ConversationSettings.js` - Settings cho conversation
- `FolderManager.js` - Quản lý folders
- `ShareDialog.js` - Dialog share conversation

---

### **3.2 Saved Items & Collections** ⭐⭐

**Mục tiêu**: Cho phép người dùng lưu và organize các items quan trọng.

#### **Tính năng:**
- ✅ **Saved Responses**
  - Save bot responses
  - Organize vào collections
  - Add notes/comments
  - Quick access

- ✅ **Saved Chunks**
  - Save knowledge chunks
  - Create collections
  - Add tags
  - Share collections

#### **Database Schema:**
```sql
CREATE TABLE saved_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  item_type ENUM('response', 'chunk', 'question') NOT NULL,
  item_id INT NOT NULL,
  collection_id INT NULL,
  notes TEXT NULL,
  tags JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_collection_id (collection_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE collections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  color VARCHAR(7) NULL,
  icon VARCHAR(50) NULL,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 📦 Phase 4: Settings & Preferences (Weeks 7-8)

### **4.1 Application Settings** ⭐⭐⭐

**Mục tiêu**: Cho phép người dùng tùy chỉnh trải nghiệm.

#### **Tính năng:**
- ✅ **Display Settings**
  - Theme (light/dark/auto)
  - Font size
  - Compact/Comfortable layout
  - Show/hide elements

- ✅ **Chat Settings**
  - Default model
  - Default temperature
  - Default max tokens
  - Auto-scroll behavior
  - Show chunks in response
  - Show metadata

- ✅ **Notification Settings**
  - Email notifications
  - In-app notifications
  - Usage alerts
  - Weekly digest

- ✅ **Language & Region**
  - Interface language
  - Response language
  - Date/time format
  - Number format

#### **Database Schema:**
```sql
CREATE TABLE user_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  preferences JSON NOT NULL, -- {"theme": "dark", "default_model": "gpt-4o", ...}
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Default preferences structure:
-- {
--   "theme": "auto",
--   "font_size": "medium",
--   "layout": "comfortable",
--   "default_model": "gpt-4o",
--   "default_temperature": 0.7,
--   "default_max_tokens": 1000,
--   "auto_scroll": true,
--   "show_chunks": true,
--   "show_metadata": false,
--   "language": "vi",
--   "notifications": {
--     "email": true,
--     "in_app": true,
--     "usage_alerts": true
--   }
-- }
```

#### **API Endpoints:**
```http
GET    /api/user/preferences         # Lấy preferences
PUT    /api/user/preferences        # Update preferences
POST   /api/user/preferences/reset  # Reset về default
```

#### **UI Components:**
- `SettingsPage.js` - Trang settings chính
- `DisplaySettings.js` - Display settings
- `ChatSettings.js` - Chat settings
- `NotificationSettings.js` - Notification settings

---

### **4.2 Custom Instructions** ⭐⭐

**Mục tiêu**: Cho phép người dùng set custom instructions cho bot.

#### **Tính năng:**
- ✅ **System Instructions**
  - Custom system prompt
  - Role definition
  - Response style
  - Tone preferences

- ✅ **Context Instructions**
  - Default context to include
  - Exclude certain topics
  - Preferred sources

#### **Database Schema:**
```sql
ALTER TABLE user_preferences ADD COLUMN custom_instructions TEXT NULL;
ALTER TABLE user_preferences ADD COLUMN context_instructions TEXT NULL;
```

---

## 📦 Phase 5: Security & Privacy (Weeks 9-10)

### **5.1 Enhanced Security** ⭐⭐⭐

**Mục tiêu**: Tăng cường bảo mật tài khoản.

#### **Tính năng:**
- ✅ **Two-Factor Authentication (2FA)**
  - TOTP (Time-based One-Time Password)
  - SMS backup codes
  - Recovery codes
  - Trusted devices

- ✅ **Security Log**
  - Login history
  - Password changes
  - Settings changes
  - Suspicious activities

- ✅ **API Keys Management**
  - Generate API keys
  - Revoke API keys
  - Usage tracking per key
  - Rate limiting per key

#### **Database Schema:**
```sql
CREATE TABLE user_2fa (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  secret_encrypted BLOB NOT NULL,
  backup_codes_encrypted BLOB NULL,
  is_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE security_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- 'login', 'password_change', '2fa_enabled', ...
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  details JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_event_type (event_type),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE api_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  last_used_at TIMESTAMP NULL,
  usage_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_key_hash (key_hash),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### **API Endpoints:**
```http
POST   /api/security/2fa/enable      # Enable 2FA
POST   /api/security/2fa/verify      # Verify 2FA code
POST   /api/security/2fa/disable     # Disable 2FA
GET    /api/security/2fa/backup-codes # Get backup codes
GET    /api/security/logs            # Get security logs
POST   /api/security/api-keys        # Generate API key
GET    /api/security/api-keys        # List API keys
DELETE /api/security/api-keys/:id    # Revoke API key
```

---

### **5.2 Privacy & Data Control** ⭐⭐

**Mục tiêu**: Cho phép người dùng kiểm soát dữ liệu của mình.

#### **Tính năng:**
- ✅ **Data Export**
  - Export all data (JSON)
  - Export conversations (Markdown/PDF)
  - Export usage statistics
  - Scheduled exports

- ✅ **Data Deletion**
  - Delete account
  - Delete conversations
  - Delete usage data
  - GDPR compliance

- ✅ **Privacy Settings**
  - Data retention policy
  - Analytics opt-out
  - Marketing emails opt-out

#### **Database Schema:**
```sql
CREATE TABLE data_export_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  export_type VARCHAR(50) NOT NULL, -- 'all', 'conversations', 'usage'
  format VARCHAR(20) NOT NULL, -- 'json', 'markdown', 'pdf'
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  file_url VARCHAR(255) NULL,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE users ADD COLUMN privacy_settings JSON NULL;
-- {
--   "data_retention_days": 365,
--   "analytics_enabled": true,
--   "marketing_emails": false
-- }
```

#### **API Endpoints:**
```http
POST   /api/privacy/export           # Request data export
GET    /api/privacy/export/:id      # Get export status
GET    /api/privacy/export/:id/download # Download export
POST   /api/privacy/delete-account   # Delete account
PUT    /api/privacy/settings         # Update privacy settings
```

---

## 📦 Phase 6: Team & Collaboration (Weeks 11-12)

### **6.1 Team Management** ⭐⭐

**Mục tiêu**: Hỗ trợ team collaboration (cho Team/Enterprise tiers).

#### **Tính năng:**
- ✅ **Workspaces**
  - Create workspaces
  - Invite members
  - Role management (owner/admin/member)
  - Shared knowledge base

- ✅ **Team Chat**
  - Shared conversations
  - Team folders
  - Comments & annotations

#### **Database Schema:**
```sql
CREATE TABLE workspaces (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  owner_id INT NOT NULL,
  plan_tier_id INT NOT NULL,
  settings JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_owner_id (owner_id),
  INDEX idx_slug (slug),
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (plan_tier_id) REFERENCES subscription_tiers(id)
);

CREATE TABLE workspace_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workspace_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('owner', 'admin', 'member') DEFAULT 'member',
  invited_by INT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_workspace_user (workspace_id, user_id),
  INDEX idx_workspace_id (workspace_id),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id)
);
```

---

## 🎯 Implementation Priority

### **Must Have (MVP)**
1. ✅ Profile Management (Phase 1.1)
2. ✅ Enhanced Authentication (Phase 1.2)
3. ✅ Subscription Tiers (Phase 2.1)
4. ✅ Usage Tracking (Phase 2.2)
5. ✅ Enhanced Chat History (Phase 3.1)

### **Should Have**
6. ✅ Application Settings (Phase 4.1)
7. ✅ Enhanced Security (Phase 5.1)
8. ✅ Privacy & Data Control (Phase 5.2)

### **Nice to Have**
9. ✅ Saved Items & Collections (Phase 3.2)
10. ✅ Custom Instructions (Phase 4.2)
11. ✅ Team Management (Phase 6.1)

---

## 📊 Success Metrics

### **User Engagement**
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- Average session duration
- Conversations per user

### **Monetization**
- Free → Paid conversion rate
- Monthly Recurring Revenue (MRR)
- Churn rate
- Average Revenue Per User (ARPU)

### **User Satisfaction**
- NPS Score
- Feature adoption rate
- Support ticket volume
- User retention rate

---

## 🚀 Quick Wins (Có thể làm ngay)

### **1. Profile Avatar** (1-2 days)
- Upload avatar component
- Backend API để lưu avatar
- Display avatar trong UI

### **2. Usage Counter** (2-3 days)
- Track queries per day
- Display counter trong UI
- Alert khi gần hết limit

### **3. Conversation Rename** (1 day)
- Add rename functionality
- Update database schema
- UI để rename

### **4. Dark Mode** (2-3 days)
- Theme toggle
- Save preference
- Apply theme globally

---

## 📝 Notes

- **Payment Integration**: Cần tích hợp Stripe hoặc PayPal cho subscription
- **Email Service**: Cần email service (SendGrid, AWS SES) cho verification, notifications
- **File Storage**: Cần S3 hoặc similar cho avatar, exports
- **Rate Limiting**: Cần implement rate limiting cho API
- **Analytics**: Cần analytics service để track usage

---

**Document Version**: 1.0  
**Created**: 2024  
**Status**: Planning Phase

