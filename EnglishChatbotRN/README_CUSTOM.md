# 📱 English Chatbot React Native App

React Native version của English Chatbot với đầy đủ tính năng tương tự web version.

## 🚀 Tính năng

- **Đăng nhập/Đăng ký**: Xác thực người dùng an toàn
- **Chat AI**: Trò chuyện với chatbot AI thông minh
- **Quản lý kiến thức**: Thêm, sửa, xóa và chunk kiến thức (Admin)
- **Dịch thuật**: Dịch văn bản Anh-Việt tự động
- **Email Subscription**: Quản lý danh sách email đăng ký (Admin)
- **Gợi ý câu hỏi**: Hiển thị gợi ý câu hỏi phổ biến

## 📋 Yêu cầu

- Node.js >= 16
- React Native CLI
- Android Studio (cho Android development)
- Xcode (cho iOS development - chỉ trên macOS)
- Java JDK 11 hoặc mới hơn

## ⚙️ Cài đặt

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cài đặt iOS pods (nếu phát triển cho iOS)

```bash
cd ios && pod install && cd ..
```

### 3. Cấu hình Backend URL

Mở file `src/config/api.ts` và cập nhật `API_BASE_URL`:

```typescript
// Cho Android Emulator
export const API_BASE_URL = 'http://10.0.2.2:3001';

// Cho thiết bị thật (thay YOUR_COMPUTER_IP)
// export const API_BASE_URL = 'http://YOUR_COMPUTER_IP:3001';
```

### 4. Đảm bảo backend đang chạy

Từ thư mục gốc của project:

```bash
# Khởi động backend
cd backend
npm start
# hoặc
docker compose up -d
```

## 🏃‍♂️ Chạy ứng dụng

### Android

```bash
# Khởi động Metro bundler
npx react-native start

# Trong terminal khác, chạy app trên Android
npx react-native run-android
```

### iOS (chỉ trên macOS)

```bash
# Khởi động Metro bundler  
npx react-native start

# Trong terminal khác, chạy app trên iOS
npx react-native run-ios
```

## 📱 Cấu hình Android

### Android Emulator

1. Mở Android Studio
2. Tạo AVD (Android Virtual Device) với API level 28+
3. Khởi động emulator
4. Chạy app với `npx react-native run-android`

### Thiết bị Android thật

1. Bật Developer Options và USB Debugging
2. Kết nối thiết bị qua USB
3. Kiểm tra thiết bị: `adb devices`
4. Chạy app với `npx react-native run-android`

## 🔧 Cấu hình Network

### Cho Android Emulator:
- Backend URL: `http://10.0.2.2:3001` (đã cấu hình sẵn)

### Cho thiết bị thật:
1. Tìm IP của máy tính (Windows: `ipconfig`, Mac/Linux: `ifconfig`)
2. Cập nhật `API_BASE_URL` trong `src/config/api.ts`
3. Đảm bảo firewall cho phép kết nối port 3001

## 📂 Cấu trúc thư mục

```
src/
├── config/            # App configuration
├── context/           # React contexts
├── navigation/        # Navigation setup
├── screens/           # Screen components
├── services/          # API services
└── types/            # TypeScript types
```

## 🔐 Bảo mật

- Sử dụng `react-native-encrypted-storage` để lưu token
- HTTPS cho production
- Không commit sensitive data

## 🐛 Troubleshooting

### Metro bundler không khởi động:
```bash
npx react-native start --reset-cache
```

### Build Android lỗi:
```bash
cd android && ./gradlew clean && cd ..
npx react-native run-android
```

### Network request failed:
- Kiểm tra backend có đang chạy không
- Kiểm tra IP address trong config
- Đảm bảo `usesCleartextTraffic="true"` trong AndroidManifest.xml

## 📞 Liên hệ

- **Email**: hung97vu@gmail.com

## 📄 License

MIT License