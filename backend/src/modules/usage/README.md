# Module Usage

## Mục đích
Module Usage theo dõi việc sử dụng các tính năng của người dùng, đặc biệt là các API calls tốn phí (OpenAI, Azure Speech).

## Chức năng chính

### 1. Usage Tracking
- Theo dõi số lượng API calls
- Tính toán chi phí
- Lưu trữ usage logs

### 2. Quota Management
- Kiểm tra quota còn lại
- Cảnh báo khi gần hết quota
- Reset quota theo chu kỳ

### 3. Statistics
- Thống kê usage theo ngày/tháng
- Phân tích xu hướng sử dụng
- Cost breakdown

### 4. Billing Integration
- Tính toán chi phí thực tế
- Tích hợp với Wallet module
- Tạo báo cáo chi phí

## Cấu trúc

```
usage/
├── controllers/
│   └── usage.controller.js          # Xử lý HTTP requests
├── routes/
│   └── usage.routes.js              # Định nghĩa API endpoints
└── services/
    └── usage.service.js             # Business logic
```

## API Endpoints

### GET /api/usage/stats
Lấy thống kê usage

**Query Parameters:**
- `startDate`: Ngày bắt đầu
- `endDate`: Ngày kết thúc

**Response:**
```json
{
  "totalCalls": 150,
  "totalCost": 25000,
  "breakdown": {
    "chat": { "calls": 100, "cost": 20000 },
    "speaking": { "calls": 30, "cost": 3000 },
    "writing": { "calls": 20, "cost": 2000 }
  }
}
```

### GET /api/usage/quota
Lấy thông tin quota

**Response:**
```json
{
  "chat": {
    "used": 100,
    "limit": 1000,
    "remaining": 900
  }
}
```

### POST /api/usage/track
Ghi nhận usage (Internal API)

## Database Schema

### Bảng: usage_logs
- `id`: Primary key
- `user_id`: ID người dùng
- `feature`: Tính năng (chat, speaking, writing)
- `action`: Hành động cụ thể
- `tokens_used`: Số tokens sử dụng
- `cost`: Chi phí (VND)
- `metadata`: Dữ liệu bổ sung (JSON)
- `created_at`: Thời gian

### Bảng: user_quotas
- `id`: Primary key
- `user_id`: ID người dùng
- `feature`: Tính năng
- `used`: Đã sử dụng
- `limit`: Giới hạn
- `reset_at`: Thời gian reset
- `updated_at`: Thời gian cập nhật

## Usage Types

```javascript
const USAGE_TYPES = {
  CHAT: 'chat',
  SPEAKING: 'speaking',
  WRITING: 'writing',
  LISTENING: 'listening',
  READING: 'reading'
};
```

## Cost Calculation

```javascript
const COST_PER_TOKEN = {
  'gpt-4': 0.03,
  'gpt-3.5-turbo': 0.002,
  'azure-speech': 0.001
};
```

## Sử dụng

```javascript
import usageService from './services/usage.service.js';

// Track usage
await usageService.trackUsage(userId, 'chat', {
  model: 'gpt-4',
  tokens: 1500,
  cost: 45
});

// Check quota
const quota = await usageService.checkQuota(userId, 'chat');

// Get stats
const stats = await usageService.getStats(userId, startDate, endDate);
```

## Cải tiến trong tương lai
- Real-time usage dashboard
- Cost optimization suggestions
- Budget alerts
- Usage forecasting
- Export reports
