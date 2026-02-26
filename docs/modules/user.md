# Tài liệu Module User (Người dùng)

## 1. Tổng quan
**Module User** xử lý việc quản lý hồ sơ người dùng, tải lên ảnh đại diện (avatar) và cài đặt tài khoản.

## 2. Các thành phần chính

### 2.1 Backend (`backend/src/modules/user`)
- **`UserService`**: Quản lý cập nhật hồ sơ và lưu trữ đường dẫn avatar.
- **Lưu trữ Avatar**: Filesystem cục bộ tại `uploads/avatars/`.

### 2.2 Frontend (`frontend/src/features/user`)
- **`ProfileSettings.js`**: Form để sửa tên, tiểu sử, v.v.
- **`AvatarUploader.js`**: Xử lý chọn và tải ảnh lên (kèm cắt ảnh qua `AvatarCropModal.js`).
- **`ChangePassword.js`**: Cài đặt bảo mật.

## 3. Phân tích kỹ thuật

### 3.1 Quản lý Hồ sơ
- **`updateProfile`**: Cập nhật tên hiển thị, tiểu sử, múi giờ, v.v.
    - **Đổi Email**: Nếu email thay đổi, `email_verified` sẽ được đặt lại về `FALSE`.

### 3.2 Xử lý Avatar (`uploadAvatar`)
- **Lưu trữ**: Filesystem cục bộ (`uploads/avatars/`).
- **Tối ưu hóa**: Sử dụng `sharp` để thay đổi kích thước ảnh về 200x200px JPEG.
- **Dọn dẹp**: Tự động xóa file avatar cũ để tránh rác hệ thống.

### 3.3 Xác thực Email
- Tạo một token hex ngẫu nhiên.
- Lưu hash/token vào bảng `users`.
- Gửi email thông qua `emailService`.

## 4. Hướng dẫn sử dụng

### Cập nhật Hồ sơ
```javascript
await userService.updateProfile(userId, {
    displayName: "Tên Mới",
    bio: "Đam mê AI"
});
```

### Phục vụ Avatar
Avatar được phục vụ như các file tĩnh. Cơ sở dữ liệu lưu đường dẫn tương đối.
