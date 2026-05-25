# Debug Guide — VS Code (Backend + Frontend)

## Yêu cầu

- VS Code extension: **JavaScript Debugger** (built-in)
- VS Code extension: **Debugger for Chrome** (hoặc dùng built-in Chrome debugger của VS Code ≥ 1.70)
- Node.js ≥ 18
- Chrome browser

---

## 1. Debug Backend (Node.js / Express)

### Cách 1 — Launch trực tiếp từ VS Code (dừng server hiện tại trước)

1. Mở tab **Run & Debug** (`Ctrl+Shift+D` / `Cmd+Shift+D`)
2. Chọn config **`BE: Debug Node (index.js)`**
3. Nhấn `F5` hoặc nút ▶ xanh lá
4. VS Code sẽ khởi động `backend/index.js` với `--inspect`, đọc `.env` ở thư mục gốc
5. Đặt breakpoint bằng cách click vào số dòng trong bất kỳ file `.js` nào của `backend/`

> **Lưu ý path alias**: Project dùng `#services/*`, `#modules/*`, v.v. (Node.js subpath imports).  
> Debugger resolve đúng nhờ `jsconfig.json` — không cần cấu hình thêm.

### Cách 2 — Attach vào process đang chạy (nodemon / npm start)

Chạy backend với flag `--inspect` trong terminal:

```bash
cd backend
node --inspect index.js
# hoặc dùng nodemon:
node --inspect node_modules/.bin/nodemon index.js
```

Sau đó trong VS Code:
1. Chọn config **`BE: Attach to Running Node`**
2. Nhấn `F5` — VS Code kết nối vào port `9229`

### Breakpoint nâng cao

| Loại | Cách dùng |
|------|-----------|
| Conditional | Click chuột phải vào breakpoint → *Edit Breakpoint* → nhập điều kiện, vd: `req.body.message === 'test'` |
| Logpoint | Click phải → *Add Logpoint* → nhập `{variable}` — in ra console không dừng code |
| Exception | Trong panel *Breakpoints* (góc dưới Run & Debug), bật **Caught Exceptions** hoặc **Uncaught Exceptions** |

### Xem biến & call stack

- **VARIABLES**: xem/sửa biến tại breakpoint
- **WATCH**: thêm expression tùy ý, vd: `req.body`, `user?.id`
- **CALL STACK**: trace ngược call chain
- **DEBUG CONSOLE**: chạy expression JS trực tiếp trong context hiện tại (vd: `JSON.stringify(req.headers)`)

---

## 2. Debug Frontend (React / CRA — Create React App)

### Yêu cầu

Frontend dùng **react-scripts (CRA)** → sourcemap được tạo tự động, không cần cấu hình Webpack riêng.

### Bước thực hiện

1. Khởi động dev server FE trong terminal:

```bash
cd frontend
npm start        # mặc định chạy http://localhost:3000
```

2. Trong VS Code, chọn config **`FE: Chrome (CRA localhost:3000)`**
3. Nhấn `F5` — VS Code mở Chrome mới với debug session kết nối sẵn
4. Đặt breakpoint trong file `.jsx` / `.js` bất kỳ trong `frontend/src/`

### Attach vào Chrome đang mở sẵn

Nếu muốn dùng Chrome đang mở (profile, cookie, v.v.):

1. Tắt Chrome hoàn toàn
2. Mở Chrome với remote debug:

```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Windows
chrome.exe --remote-debugging-port=9222
```

3. Vào `http://localhost:3000` trong Chrome đó
4. Trong VS Code chọn **`FE: Attach to Chrome`** → `F5`

### Tips FE

- **React DevTools** + VS Code debugger hoạt động song song — mở React DevTools trong Chrome để xem component tree, VS Code để step qua code
- Sourcemap của CRA map `webpack:///./src/*` → `frontend/src/*` (đã cấu hình trong `launch.json`)
- Nếu breakpoint có dấu `?` (unverified): chờ app load xong rồi reload lại trang

---

## 3. Debug Full Stack (BE + FE cùng lúc)

1. Đảm bảo `frontend` đang chạy (`npm start`) trong terminal riêng
2. Trong VS Code, chọn compound config **`Full Stack: BE + FE (Chrome)`**
3. Nhấn `F5` — VS Code khởi động cả backend lẫn Chrome debug session
4. Có thể đặt breakpoint ở cả `backend/` và `frontend/src/` đồng thời

---

## 4. Xử lý lỗi thường gặp

### Backend không dừng tại breakpoint

- Kiểm tra file có trong scope `backend/` không (không phải `node_modules`)
- Sourcemap: chạy `node --inspect` thay vì `nodemon` để loại trừ vấn đề reload
- Đảm bảo không có process khác chiếm port `9229`: `lsof -i :9229`

### Frontend — breakpoint không hit

- Reload trang trong Chrome sau khi đặt breakpoint
- Kiểm tra `webRoot` trong `launch.json` trỏ đúng `frontend/src`
- Tắt browser extensions (ad-blocker có thể chặn sourcemap)
- Thử `GENERATE_SOURCEMAP=true npm start` nếu sourcemap bị tắt

### Attach thất bại (port đã bị dùng)

```bash
# Tìm process dùng port debug
lsof -i :9229   # Node
lsof -i :9222   # Chrome

# Kill process nếu cần
kill -9 <PID>
```

### `.env` không load khi debug

Config `launch.json` đã trỏ `"envFile": "${workspaceFolder}/.env"`.  
Nếu có file `.env` riêng cho backend thì đổi thành `"${workspaceFolder}/backend/.env"`.

---

## 5. Cấu trúc `.vscode/launch.json`

```
.vscode/
  launch.json     ← tất cả debug configs (BE + FE + compound)
  settings.json   ← bỏ qua node_internals & node_modules khi step
```

File `launch.json` có 4 config đơn + 1 compound:

| Config | Mục đích |
|--------|----------|
| `BE: Debug Node (index.js)` | Launch BE từ VS Code |
| `BE: Attach to Running Node` | Attach vào Node process (port 9229) |
| `FE: Chrome (CRA localhost:3000)` | Launch Chrome + attach FE |
| `FE: Attach to Chrome` | Attach vào Chrome đang mở (port 9222) |
| `Full Stack: BE + FE (Chrome)` | Chạy cả hai cùng lúc |
