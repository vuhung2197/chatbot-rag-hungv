# Quick Start Guide - Currency Conversion Feature

## 🚀 Khởi động nhanh

### 1. Cài đặt (nếu chưa có)

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### 2. Khởi động ứng dụng

#### Terminal 1 - Backend
```bash
cd backend
npm start
```
✅ Backend chạy tại: http://localhost:3001

#### Terminal 2 - Frontend
```bash
cd frontend
npm start
```
✅ Frontend chạy tại: http://localhost:3000

### 3. Sử dụng tính năng

1. **Đăng nhập** vào hệ thống
2. **Vào Wallet Dashboard** (menu bên trái)
3. **Nhìn lên đầu trang**, bạn sẽ thấy:
   ```
   Đơn vị tiền tệ
   [USD $] [VND ₫]
   ```
4. **Click vào nút VND** (nếu đang dùng USD) hoặc ngược lại
5. **Modal xác nhận** sẽ hiện ra:
   - Hiển thị: USD → VND
   - Tỷ giá: 1 USD = 24,000 VND
   - Cảnh báo: Không thể hoàn tác
6. **Click "Xác nhận"**
7. **Thành công!** Số dư đã được chuyển đổi

## 📱 Demo nhanh

### Ví dụ 1: Chuyển USD sang VND
```
Trước:  $10.00 USD
Sau:    ₫240,000 VND
Tỷ giá: 1 USD = 24,000 VND
```

### Ví dụ 2: Chuyển VND sang USD
```
Trước:  ₫240,000 VND
Sau:    $10.00 USD
Tỷ giá: 1 VND = 0.0000417 USD
```

## 🎯 Test nhanh

### Test 1: Kiểm tra API
```bash
# 1. Lấy danh sách currencies
curl -X GET http://localhost:3001/wallet/currencies \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Lấy payment methods
curl -X GET http://localhost:3001/wallet/payment-methods \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Chuyển đổi sang VND
curl -X PUT http://localhost:3001/wallet/currency \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currency":"VND"}'
```

### Test 2: Kiểm tra UI
1. ✅ Currency selector hiển thị
2. ✅ Click USD/VND button
3. ✅ Modal hiện ra
4. ✅ Thông tin chính xác
5. ✅ Confirm hoạt động
6. ✅ Cancel hoạt động
7. ✅ Số dư cập nhật
8. ✅ Transaction history có log

## 🐛 Troubleshooting nhanh

### Lỗi: "Cannot find module"
```bash
# Cài lại dependencies
cd backend
npm install

cd frontend
npm install
```

### Lỗi: "Port already in use"
```bash
# Tìm và kill process
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3001 | xargs kill -9
```

### Lỗi: "Unauthorized"
- Đăng nhập lại
- Kiểm tra token trong localStorage
- Xóa cache và refresh

### Modal không hiện
- F12 → Console → Xem lỗi
- Refresh trang
- Clear cache

## 📝 Checklist nhanh

- [ ] Backend đang chạy (port 3001)
- [ ] Frontend đang chạy (port 3000)
- [ ] Database đang chạy
- [ ] Đã đăng nhập
- [ ] Có số dư trong ví
- [ ] Currency selector hiển thị
- [ ] Click được các nút
- [ ] Modal hiện ra
- [ ] Confirm hoạt động

## 🎨 Screenshots

### 1. Currency Selector
```
┌─────────────────────────────────┐
│ Đơn vị tiền tệ                  │
│ ┌─────────┐  ┌─────────┐       │
│ │    $    │  │    ₫    │       │
│ │   USD   │  │   VND   │       │
│ └─────────┘  └─────────┘       │
└─────────────────────────────────┘
```

### 2. Confirmation Modal
```
┌─────────────────────────────────┐
│ Đổi đơn vị tiền tệ          ✕  │
├─────────────────────────────────┤
│                                 │
│  Từ: USD  →  Sang: VND         │
│                                 │
│  Tỷ giá: 1 USD = 24,000 VND    │
│                                 │
│  ⚠️ Cảnh báo: Không thể hoàn tác│
│                                 │
│  [Hủy]  [Xác nhận]             │
└─────────────────────────────────┘
```

## 🔗 Links hữu ích

- **Backend API:** http://localhost:3001
- **Frontend:** http://localhost:3000
- **Wallet Dashboard:** http://localhost:3000/wallet
- **API Docs:** `.analysis/CURRENCY_CONVERSION_FEATURE.md`
- **User Guide:** `.analysis/CURRENCY_FEATURE_GUIDE_VI.md`

## 💡 Tips

1. **Luôn kiểm tra console** (F12) nếu có lỗi
2. **Refresh trang** sau khi chuyển đổi để thấy cập nhật
3. **Kiểm tra transaction history** để xem log chuyển đổi
4. **Có thể chuyển đổi nhiều lần** giữa USD và VND
5. **Số dư được làm tròn** phù hợp với từng đơn vị

## ⚡ Shortcuts

```bash
# Start cả backend và frontend cùng lúc (nếu có script)
npm run dev

# Hoặc dùng 2 terminal riêng
# Terminal 1
cd backend && npm start

# Terminal 2
cd frontend && npm start
```

## 📞 Support

Nếu gặp vấn đề:
1. Kiểm tra console (F12)
2. Kiểm tra backend logs
3. Xem file `.analysis/CURRENCY_FEATURE_GUIDE_VI.md`
4. Liên hệ team support

## ✨ Enjoy!

Tính năng chuyển đổi tiền tệ đã sẵn sàng sử dụng. Chúc bạn trải nghiệm tốt! 🎉
