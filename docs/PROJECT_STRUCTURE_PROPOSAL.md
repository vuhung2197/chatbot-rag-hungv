# Đề Xuất Cải Tiến Cấu Trúc Dự Án (Project Structure Proposal)

## 1. Hiện Trạng (Current State)

### Backend
Hệ thống hiện tại đang sử dụng cấu trúc **Layered Architecture** phẳng (Flattened):
- `controllers/`: Chứa toàn bộ logic xử lý request (20 files).
  - Có các file rất lớn như `walletController.js` (37KB), `authController.js` (26KB).
  - Logic thanh toán phân tán: `vnpayController.js`, `momoController.js`, `paymentController.js`.
  - Có các file controller "lạ" hoặc chưa được dọn dẹp: `walletController_addition.js`, `wallet_withdrawal_part.js`.
- `services/`: Chứa logic nghiệp vụ.
- `routes/`: Định nghĩa API endpoints.

**Nhược điểm:**
- **Coupling cao**: Các module phụ thuộc lẫn nhau khó kiểm soát (ví dụ: `wallet` phụ thuộc chặt vào `auth` và `currency`).
- **Khó bảo trì**: Khi thêm một tính năng mới (ví dụ: một cổng thanh toán mới), phải sửa đổi nhiều nơi (`controller`, `service`, `routes`).
- **Khó tìm kiếm**: Danh sách file trong folder `controllers` quá dài và không được phân nhóm.

### Frontend
Frontend xây dựng bằng React với cấu trúc phẳng:
- `src/component/`: Chứa tất cả components (40 files), trộn lẫn giữa:
  - **Smart Components** (Pages/Containers): `WalletDashboard.js`, `ProfileSettings.js`.
  - **Dumb Components** (UI): `ConfirmDialog.js`, `Toast.js`.
  - **Business Logic Components**: `DepositModal.js`, `TransactionHistory.js`.
- `src/styles/`: Styles hỗn hợp giữa CSS Global và CSS Modules.

**Nhược điểm:**
- **Lack of clarity**: Khó phân biệt đâu là Page, đâu là Component tái sử dụng.
- **Scalability**: Khi project lớn lên, folder `component` sẽ trở nên hỗn loạn.
- **Styles leakage**: Sử dụng global CSS (ví dụ `WalletDashboard.css`) dễ gây conflict style giữa các trang.

---

## 2. Đề Xuất Cấu Trúc Mới (Proposal)

Chúng ta nên chuyển dịch sang **Feature-Internal Modular Architecture (Screaming Architecture)**. Cấu trúc này nhóm các file theo **Tính năng (Feature)** thay vì theo **Loại file (Technical Type)**.

### A. Backend Structure Proposal

```
backend/
  src/
    modules/                 # CHÍNH: Chia theo nghiệp vụ
      auth/
        auth.controller.js
        auth.service.js
        auth.routes.js
        auth.validation.js
      wallet/
        controllers/
          wallet.controller.js
          vnpay.controller.js
          momo.controller.js
        services/
          wallet.service.js
          payment.gateway.js
        wallet.routes.js
      chat/
      user/
    shared/                  # Các module dùng chung
      middleware/
      utils/
      config/
      constants/
    app.js
    server.js
```

**Lợi ích:**
- **Cohesion (Độ kết dính) cao**: Code liên quan đến Wallet nằm chung 1 chỗ.
- **Dễ dàng mở rộng**: Thêm feature mới chỉ cần tạo folder mới trong `modules/`.
- **Dọn dẹp code**: Dễ dàng phát hiện code thừa (`walletController_addition.js` sẽ được merge vào đúng chỗ).

### B. Frontend Structure Proposal

Phân tách rõ ràng giữa **Features** (nghiệp vụ) và **Core/Shared** (hạ tầng/UI chung).

```
frontend/src/
  features/                  # Modules nghiệp vụ
    auth/
      components/            # UI components cụ thể cho Auth
        LoginForm.js
        RegisterForm.js
      hooks/
      pages/                 # Pages của Auth
        LoginPage.js
    wallet/
      components/
        DepositModal/
          DepositModal.js
          DepositModal.module.css  # CSS Module đi kèm component
        TransactionHistory/
      pages/
        WalletDashboard.js
        WalletDashboard.module.css
      walletService.js       # API calls riêng cho wallet
    chat/
  
  components/                # UI Components dùng chung (Design System)
    Button/
    Modal/
    Input/
    Toast/
  
  layouts/                   # Layout chung (Header, Sidebar)
    MainLayout.js
  
  hooks/                     # Custom hooks dùng chung (useForm, useFetch)
  contexts/                  # Global state (Theme, AuthContext)
  utils/                     # Helper functions
  lib/                       # Third-party configs (axios setup)
```

**Lợi ích:**
- **Dễ tìm kiếm**: Tìm logic nạp tiền? -> Vào `features/wallet`.
- **Styles Isolation**: Bắt buộc dùng CSS Modules (hoặc Styled Components) cho từng feature/component.
- **Reusability**: `components/` chỉ chứa các UI components "ngu" (không chứa business logic), dễ tái sử dụng.

---

## 3. Lộ Trình Chuyển Đổi (Migration Plan)

Không nên đập đi xây lại (Big Bang), mà nên Refactor dần dần (Strangler Fig Pattern).

### Giai đoạn 1: Chuẩn hóa & Dọn dẹp (Housekeeping)
- [ ] Backend: Merge các file controller thừa (`walletController_addition.js`).
- [ ] Backend: Tạo folder `modules/` và `shared/`.
- [ ] Frontend: Tạo folder `features/` và `components/`.

### Giai đoạn 2: Di chuyển các Module nhỏ (Pilot)
- [ ] **Backend**: Chuyển module `auth` trước (vì nó độc lập).
  - Move `authController.js`, `authMiddleware.js` vào `modules/auth/`.
- [ ] **Frontend**: Chuyển các component UI cơ bản (`Button`, `Modal`, `Toast`) vào `src/components/`.

### Giai đoạn 3: Refactor "God Components" (Core)
- [ ] **Backend - Wallet**:
  - Tạo `modules/wallet`.
  - Tách `walletController.js` thành `wallet.controller.js` và `payment.controller.js`.
  - Gom `vnpayController`, `momoController` vào đây.
- [ ] **Frontend - Wallet**:
  - Move `WalletDashboard` vào `features/wallet/pages/`.
  - Move `DepositModal` vào `features/wallet/components/`.
  - Chuyển đổi CSS Global của Dashboard sang CSS Modules.

### Giai đoạn 4: Hoàn tất
- [ ] Xóa các folder cũ (`backend/controllers`, `frontend/src/component`).
- [ ] Cập nhật lại imports trong toàn bộ dự án.

## 4. Quy Ước Đặt Tên (Naming Convention)

Để tránh hỗn loạn khi project scale:
- **File**: `featureName.type.js` (ví dụ: `auth.controller.js`, `user.service.js`).
- **Component**: PascalCase (`WalletDashboard.js`).
- **Style**: `Component.module.css`.

---

> **Lưu ý**: Việc refactor cần đảm bảo hệ thống Test (nếu có) vẫn chạy đúng (Green) sau mỗi bước chuyển đổi.
