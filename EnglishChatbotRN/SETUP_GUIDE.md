# 🛠️ Hướng dẫn cài đặt môi trường React Native

## 📋 Yêu cầu hệ thống

### Windows
- Node.js 16 trở lên
- Java Development Kit (JDK) 11
- Android Studio
- Git

## ⚙️ Các bước cài đặt

### 1. Cài đặt Node.js
```bash
# Kiểm tra version Node.js
node --version
npm --version
```

### 2. Cài đặt JDK 11
- Tải JDK từ: https://adoptopenjdk.net/
- Hoặc sử dụng Chocolatey: `choco install openjdk11`

### 3. Cài đặt Android Studio
1. Tải Android Studio: https://developer.android.com/studio
2. Trong Android Studio:
   - Install Android SDK Platform 33
   - Android SDK Build-Tools 33.0.0
   - Intel x86 Atom_64 System Images (for emulator)

### 4. Cài đặt biến môi trường

#### Windows (PowerShell):
```powershell
# Thêm vào Profile PowerShell hoặc System Environment Variables
$env:ANDROID_HOME = "C:\Users\YourUsername\AppData\Local\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\emulator"
$env:PATH += ";$env:ANDROID_HOME\tools"
$env:PATH += ";$env:ANDROID_HOME\tools\bin"
$env:PATH += ";$env:ANDROID_HOME\platform-tools"
```

### 5. Tạo Android Virtual Device (AVD)
1. Mở Android Studio
2. Tools → AVD Manager
3. Create Virtual Device
4. Chọn Pixel 4 (hoặc device khác)
5. Chọn system image API level 30+
6. Finish

### 6. Kiểm tra cài đặt
```bash
cd "D:\english-chatbot\EnglishChatbotRN"
npx react-native doctor
```

## 🏃‍♂️ Chạy ứng dụng

### Bước 1: Khởi động backend
```bash
cd "D:\english-chatbot"
docker compose up -d
# hoặc
cd backend && npm start
```

### Bước 2: Khởi động Android Emulator
- Mở Android Studio
- AVD Manager → Start emulator

### Bước 3: Chạy React Native app
```bash
cd "D:\english-chatbot\EnglishChatbotRN"

# Terminal 1: Metro bundler
npx react-native start

# Terminal 2: Build và chạy app
npx react-native run-android
```

## 🔧 Troubleshooting thường gặp

### 1. ADB not found
```bash
# Thêm platform-tools vào PATH
echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.bashrc
```

### 2. Build tools version issues
- Mở `android/build.gradle`
- Cập nhật `buildToolsVersion` về version mới nhất

### 3. Metro bundler issues
```bash
npx react-native start --reset-cache
```

### 4. Network connection issues
- Đảm bảo `usesCleartextTraffic="true"` trong AndroidManifest.xml
- Kiểm tra backend đang chạy trên port 3001

### 5. Emulator performance issues
- Enable Hardware Acceleration
- Tăng RAM cho AVD (4GB+)
- Enable GPU acceleration

## 📱 Test trên thiết bị thật

### Android
1. Bật Developer Options
2. Enable USB Debugging
3. Connect device
4. `adb devices` để kiểm tra
5. `npx react-native run-android`

### Tìm IP của máy tính
```bash
# Windows
ipconfig

# Cập nhật API_BASE_URL trong src/config/api.ts
# Thay 10.0.2.2 bằng IP thật của máy tính
```

## ✅ Checklist trước khi chạy

- [ ] Node.js >= 16 installed
- [ ] JDK 11 installed
- [ ] Android Studio installed
- [ ] ANDROID_HOME environment variable set
- [ ] AVD created and running
- [ ] Backend server running on port 3001
- [ ] Dependencies installed (`npm install`)

## 📞 Hỗ trợ

Nếu gặp vấn đề, kiểm tra:
1. `npx react-native doctor` output
2. Android Studio SDK Manager settings  
3. Environment variables
4. Backend server status