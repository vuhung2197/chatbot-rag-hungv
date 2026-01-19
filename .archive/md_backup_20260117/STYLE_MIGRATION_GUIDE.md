# 📘 Style Migration Guide - Inline Styles to CSS Modules

## Mục tiêu
Chuyển đổi tất cả inline styles sang CSS Modules để dễ quản lý và bảo trì.

## Cấu trúc thư mục
```
frontend/src/
  ├── styles/
  │   └── components/
  │       ├── ComponentName.module.css
  │       └── ...
  └── component/
      ├── ComponentName.js
      └── ...
```

## Pattern chuyển đổi

### 1. Tạo CSS Module file
- Tạo file: `frontend/src/styles/components/ComponentName.module.css`
- Sử dụng CSS Modules để tránh conflict tên class

### 2. Import CSS Module vào component
```javascript
import styles from '../styles/components/ComponentName.module.css';
```

### 3. Chuyển đổi inline styles
**Trước:**
```javascript
<div style={{ padding: '16px', backgroundColor: '#fff', color: '#333' }}>
```

**Sau:**
```javascript
<div className={styles.container}>
```

### 4. Xử lý dynamic styles
**Trước:**
```javascript
<div style={{ color: darkMode ? '#fff' : '#333' }}>
```

**Sau:**
```javascript
<div className={`${styles.text} ${darkMode ? styles.darkMode : ''}`}>
```

### 5. Xử lý conditional styles
**Trước:**
```javascript
<div style={{ 
  border: isActive ? '2px solid #10a37f' : '1px solid #ddd',
  backgroundColor: isActive ? '#f0fdf4' : '#fff'
}}>
```

**Sau:**
```javascript
const containerClasses = [
  styles.container,
  isActive ? styles.active : ''
].filter(Boolean).join(' ');

<div className={containerClasses}>
```

## Components đã hoàn thành
- ✅ ChatInputSuggest.js
- ✅ UsageCounter.js

## Components cần chuyển đổi
- [ ] Chat.js (69 inline styles)
- [ ] ProfileSettings.js (31 inline styles)
- [ ] ChangePassword.js (36 inline styles)
- [ ] ModelManager.js (27 inline styles)
- [ ] UsageLimits.js (23 inline styles)
- [ ] SubscriptionPlans.js (24 inline styles)
- [ ] SubscriptionStatus.js (22 inline styles)
- [ ] ConversationsList.js (22 inline styles)
- [ ] OAuthProviders.js (20 inline styles)
- [ ] UsageDashboard.js (18 inline styles)
- [ ] SessionManagement.js (17 inline styles)
- [ ] KnowledgeAdmin.js (17 inline styles)
- [ ] SetPasswordPage.js (17 inline styles)
- [ ] AvatarUploader.js (11 inline styles)
- [ ] Register.js (9 inline styles)
- [ ] Login.js (15 inline styles)
- [ ] ResetPasswordPage.js (21 inline styles)
- [ ] RequestPasswordReset.js (11 inline styles)
- [ ] EmailVerification.js (21 inline styles)
- [ ] VerifyEmailPage.js (15 inline styles)
- [ ] AvatarCropModal.js (10 inline styles)
- [ ] ConfirmDialog.js (5 inline styles)
- [ ] DarkModeContext.js (1 inline style)

## Best Practices
1. **Đặt tên class có ý nghĩa**: Sử dụng tên mô tả như `container`, `button`, `input`, `label`
2. **Nhóm các styles liên quan**: Tổ chức CSS theo component structure
3. **Sử dụng CSS variables**: Cho các giá trị được dùng lại nhiều lần
4. **Dark mode support**: Sử dụng class modifiers cho dark mode
5. **Responsive design**: Sử dụng media queries trong CSS modules
6. **Giữ lại dynamic styles**: Một số styles cần tính toán động (như width, height) có thể giữ inline

## Lưu ý
- CSS Modules tự động scope class names để tránh conflict
- Sử dụng `className` thay vì `style` prop
- Kết hợp nhiều classes: `className={`${styles.class1} ${styles.class2}`}`
- Filter empty strings khi combine classes: `.filter(Boolean).join(' ')`

