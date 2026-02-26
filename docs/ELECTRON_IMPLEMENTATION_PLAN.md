# Kế Hoạch Triển Khai Electron (Desktop App)

Tài liệu này hướng dẫn chi tiết cách chuyển đổi ứng dụng Frontend hiện tại (React) thành một ứng dụng Desktop (Windows .exe) bằng **Electron**, theo mô hình **Hybrid App** (Frontend chạy dưới dạng Desktop App, Backend vẫn chạy trên Server Online).

---

## 1. Kiến Trúc Tổng Quan

*   **Frontend**: React App được đóng gói bên trong Electron (trình duyệt Chromium thu nhỏ).
*   **Backend & Database**: Vẫn chạy trên VPS/Cloud của bạn (như một Web Server bình thường).
*   **Kết nối**: Electron App gọi API tới Server qua Internet (HTTPS).

**Ưu điểm**:
*   Người dùng cài đặt file `.exe` như phần mềm bình thường.
*   Không cần viết lại Backend/Database.
*   Cập nhật nội dung Backend không ảnh hưởng tới người dùng (họ không cần cài lại App).

---

## 2. Các Bước Thực Hiện Chi Tiết

### Bước 1: Cài Đặt Thư Viện Cần Thiết

Tại thư mục `frontend`, chạy các lệnh sau để cài đặt các gói hỗ trợ Electron:

```bash
cd frontend
# Cài đặt Electron và các công cụ hỗ trợ
npm install --save-dev electron electron-builder concurrently wait-on cross-env
npm install --save electron-is-dev
```

*   `electron`: Framework chính.
*   `electron-builder`: Công cụ đóng gói ra file `.exe`.
*   `concurrently`: Chạy song song React và Electron trong lúc Dev.
*   `wait-on`: Đợi React khởi động xong mới mở cửa sổ Electron.
*   `electron-is-dev`: Kiểm tra xem đang chạy ở chế độ Dev hay Production.

### Bước 2: Tạo File Main Process (`public/electron.js`)

Tạo file `public/electron.js` với nội dung sau. Đây là file khởi chạy của ứng dụng Desktop.

```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

function createWindow() {
  // Tạo cửa sổ trình duyệt
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Lưu ý về bảo mật (có thể bật lại sau)
    },
    icon: path.join(__dirname, 'favicon.ico') // Icon ứng dụng
  });

  // Load nội dung
  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000' // Dev mode: Load từ React Server
      : `file://${path.join(__dirname, '../build/index.html')}` // Prod mode: Load từ file build
  );

  // Mở DevTools nếu đang ở chế độ Dev
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

// Khi Electron đã sẵn sàng
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Thoát khi tất cả cửa sổ đóng
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

### Bước 3: Cấu Hình `package.json`

Cần sửa file `frontend/package.json` để thêm các thông tin đóng gói.

1.  **Thêm thuộc tính `main`**: Trỏ tới file electron vừa tạo.
    ```json
    "main": "public/electron.js",
    ```

2.  **Thêm thuộc tính `homepage`**: Để đường dẫn file tĩnh hoạt động đúng trong môi trường file system.
    ```json
    "homepage": "./",
    ```

3.  **Thêm các script chạy**:
    ```json
    "scripts": {
      "start": "react-scripts start",
      "build": "react-scripts build",
      "electron:dev": "concurrently \"cross-env BROWSER=none npm start\" \"wait-on http://localhost:3000 && electron .\"",
      "electron:build": "npm run build && electron-builder -w"
    },
    ```

4.  **Cấu hình build (thêm vào cuối file)**:
    ```json
    "build": {
      "appId": "com.englishchatbot.app",
      "productName": "English Chatbot AI",
      "copyright": "Copyright © 2026 Your Name",
      "files": [
        "build/**/*",
        "node_modules/**/*"
      ],
      "directories": {
        "buildResources": "public"
      },
      "win": {
        "target": "nsis",
        "icon": "public/favicon.ico"
      }
    }
    ```

### Bước 4: Xử Lý Biến Môi Trường (API URL)

Vấn đề quan trọng nhất là Backend URL.
*   Khi chạy Dev: `REACT_APP_API_URL` có thể là `http://localhost:5000`.
*   Khi đóng gói `.exe` cho người dùng: `REACT_APP_API_URL` **BẮT BUỘC** phải là địa chỉ Server thật (ví dụ: `https://api.englishchatbot.com`).

**Giải pháp**:
Tạo file `.env.production` trong thư mục `frontend`:
```env
REACT_APP_API_URL=https://api.your-domain.com
```
Khi chạy lệnh `npm run electron:build`, React sẽ tự động dùng biến môi trường này.

---

## 3. Quy Trình Phát Triển & Đóng Gói

### 1. Chạy Thử Nghiệm (Dev Mode)
Chạy lệnh sau để vừa code React vừa xem kết quả trên cửa sổ Electron:
```bash
npm run electron:dev
```

### 2. Đóng Gói (Production Build)
Khi đã hài lòng, chạy lệnh sau để tạo file cài đặt `.exe`:
```bash
npm run electron:build
```
File kết quả (Setup.exe) sẽ nằm trong thư mục `frontend/dist`.

---

## 4. Các Lưu Ý Quan Trọng

1.  **Icon Ứng Dụng**: Bạn cần chuẩn bị file `favicon.ico` đẹp (kích thước ít nhất 256x256) đặt trong thư mục `public` để icon ứng dụng trông chuyên nghiệp.
2.  **Cors**: Server Backend phải cấu hình CORS cho phép truy cập từ mọi nguồn (hoặc cấu hình Electron để bỏ qua CORS), vì khi chạy file local (`file://`), Origin sẽ là `null`.
3.  **Router**: React Router mặc định dùng `BrowserRouter` (cần History API của Server). Trong Electron, nên chuyển sang dùng `HashRouter` để tránh lỗi đường dẫn trắng trang khi reload.

## 5. Kết Luận
Đây là phương án khả thi nhất để có ngay sản phẩm "trông giống phần mềm chuyên nghiệp" mà không tốn công viết lại Backend. Thời gian triển khai ước tính khoảng **2-4 giờ**.
