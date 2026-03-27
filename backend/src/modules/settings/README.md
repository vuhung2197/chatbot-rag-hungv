# Module Settings

## Mục đích
Module Settings quản lý các cài đặt hệ thống và cài đặt cá nhân của người dùng.

## Chức năng chính

### 1. User Settings
- Preferences cá nhân
- Notification settings
- Privacy settings
- Display preferences

### 2. System Settings
- Application configuration
- Feature flags
- Maintenance mode
- API keys management

### 3. Localization
- Language preferences
- Timezone settings
- Date/time format

## Cấu trúc

```
settings/
├── controllers/
│   └── settings.controller.js       # Xử lý HTTP requests
└── routes/
    └── settings.routes.js           # Định nghĩa API endpoints
```

## API Endpoints

### GET /api/settings
Lấy tất cả settings của user

### PUT /api/settings
Cập nhật settings

**Request Body:**
```json
{
  "language": "vi",
  "timezone": "Asia/Ho_Chi_Minh",
  "notifications": {
    "email": true,
    "push": false
  }
}
```

### GET /api/settings/system
Lấy system settings (Admin only)

## Database Schema

### Bảng: user_settings
- `id`: Primary key
- `user_id`: ID người dùng (unique)
- `language`: Ngôn ngữ
- `timezone`: Múi giờ
- `theme`: Giao diện (light, dark)
- `notifications`: Cài đặt thông báo (JSON)
- `privacy`: Cài đặt riêng tư (JSON)
- `created_at`: Thời gian tạo
- `updated_at`: Thời gian cập nhật

## Default Settings

```javascript
const DEFAULT_SETTINGS = {
  language: 'vi',
  timezone: 'Asia/Ho_Chi_Minh',
  theme: 'light',
  notifications: {
    email: true,
    push: true,
    sms: false
  },
  privacy: {
    showProfile: true,
    showProgress: false
  }
};
```

## Sử dụng

```javascript
import settingsService from './services/settings.service.js';

// Get settings
const settings = await settingsService.getSettings(userId);

// Update settings
await settingsService.updateSettings(userId, {
  language: 'en',
  theme: 'dark'
});
```

## Cải tiến trong tương lai
- Advanced privacy controls
- Custom themes
- Keyboard shortcuts
- Accessibility settings
