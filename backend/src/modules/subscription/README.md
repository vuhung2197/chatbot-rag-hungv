# Module Subscription

## Mục đích
Module Subscription quản lý gói đăng ký (subscription plans) của người dùng, bao gồm Free, Premium, và Enterprise.

## Chức năng chính

### 1. Quản lý Plans
- Định nghĩa các gói đăng ký
- Giá và tính năng của từng gói
- Thời hạn sử dụng

### 2. User Subscription
- Đăng ký gói mới
- Gia hạn gói hiện tại
- Hủy đăng ký
- Upgrade/Downgrade

### 3. Feature Access Control
- Kiểm tra quyền truy cập tính năng
- Giới hạn usage theo gói
- Quota management

### 4. Billing
- Tính toán chi phí
- Tạo hóa đơn
- Lịch sử thanh toán

## Cấu trúc

```
subscription/
├── controllers/
│   └── subscription.controller.js   # Xử lý HTTP requests
├── routes/
│   └── subscription.routes.js       # Định nghĩa API endpoints
└── services/
    └── subscription.service.js      # Business logic
```

## API Endpoints

### GET /api/subscriptions/plans
Lấy danh sách gói đăng ký

**Response:**
```json
[
  {
    "id": "free",
    "name": "Free",
    "price": 0,
    "features": {
      "chatLimit": 10,
      "vocabularyLimit": 100
    }
  },
  {
    "id": "premium",
    "name": "Premium",
    "price": 99000,
    "features": {
      "chatLimit": -1,
      "vocabularyLimit": -1
    }
  }
]
```

### GET /api/subscriptions/my
Lấy thông tin subscription hiện tại

### POST /api/subscriptions/subscribe
Đăng ký gói mới

**Request Body:**
```json
{
  "planId": "premium",
  "duration": "monthly"
}
```

### POST /api/subscriptions/cancel
Hủy đăng ký

### POST /api/subscriptions/upgrade
Nâng cấp gói

## Database Schema

### Bảng: subscription_plans
- `id`: Primary key
- `name`: Tên gói
- `price`: Giá (VND)
- `duration`: Thời hạn (monthly, yearly)
- `features`: Tính năng (JSON)
- `active`: Trạng thái kích hoạt
- `created_at`: Thời gian tạo

### Bảng: user_subscriptions
- `id`: Primary key
- `user_id`: ID người dùng
- `plan_id`: ID gói đăng ký
- `status`: Trạng thái (active, expired, cancelled)
- `started_at`: Ngày bắt đầu
- `expires_at`: Ngày hết hạn
- `auto_renew`: Tự động gia hạn
- `created_at`: Thời gian tạo
- `updated_at`: Thời gian cập nhật

## Feature Limits

```javascript
const PLAN_FEATURES = {
  free: {
    chatLimit: 10,
    vocabularyLimit: 100,
    speakingLimit: 5,
    writingLimit: 5
  },
  premium: {
    chatLimit: -1,  // Unlimited
    vocabularyLimit: -1,
    speakingLimit: -1,
    writingLimit: -1
  }
};
```

## Middleware

```javascript
import { checkSubscription } from './middleware/subscription.js';

router.post('/premium-feature',
  authMiddleware,
  checkSubscription(['premium', 'enterprise']),
  controller.method
);
```

## Sử dụng

```javascript
import subscriptionService from './services/subscription.service.js';

// Kiểm tra subscription
const sub = await subscriptionService.getUserSubscription(userId);

// Kiểm tra feature access
const hasAccess = await subscriptionService.checkFeatureAccess(
  userId,
  'unlimited_chat'
);

// Subscribe
await subscriptionService.subscribe(userId, 'premium', 'monthly');
```

## Cải tiến trong tương lai
- Trial period
- Promo codes
- Referral program
- Team subscriptions
- Usage analytics
