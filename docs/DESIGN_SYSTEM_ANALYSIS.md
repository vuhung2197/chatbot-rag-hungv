# Design System Analysis — Frontend

> Phân tích hiện trạng và đề xuất chuẩn hóa design system

---

## 1. Tổng quan hiện trạng

### Cấu trúc CSS hiện tại

```
frontend/src/
├── index.css                        # Global body/reset (chỉ 2 rules)
└── styles/
    ├── shared.module.css            # ✅ Layout, typography utilities
    ├── forms.module.css             # ✅ Input, label, textarea, select
    ├── buttons.module.css           # ✅ Button variants & sizes
    ├── messages.module.css          # ✅ Alert/message states
    ├── darkMode.module.css          # ✅ Dark mode utilities
    ├── README.md
    ├── components/
    │   └── *.module.css             # 28 component-level CSS modules
    └── [legacy]                     # ❌ 9 file .css thuần (không phải module)
        ├── AddBankModal.css
        ├── BankAccountManager.css
        ├── CurrencySelector.css
        ├── DepositModal.css
        ├── KnowledgeAdmin.css
        ├── KnowledgeAdminExtra.css
        ├── TransactionHistory.css
        ├── WalletDashboard.css
        └── WithdrawModal.css
```

### Điểm mạnh
- Đã có 5 shared modules tái sử dụng (`shared`, `forms`, `buttons`, `messages`, `darkMode`)
- Cấu trúc features-based đã được triển khai (`features/auth`, `features/chat`, v.v.)
- CSS Modules được dùng nhất quán cho các component mới

### Vấn đề chính
- **Không có CSS custom properties** — toàn bộ màu sắc, spacing, radius hardcode lặp lại ở mỗi file
- **9 legacy CSS files** không dùng CSS Modules, có thể gây conflict class name
- **Dark mode bằng companion class** (`.darkMode`) thay vì CSS variables — mỗi component phải viết 2 lần
- **Màu sắc không nhất quán** — cùng một màu primary có nhiều biến thể (#7137ea, #5a2bb8, #764ba2)

---

## 2. Design Tokens hiện tại (đang dùng ngầm)

Các giá trị này được hardcode lặp lại khắp codebase. Đây là danh sách được chuẩn hóa từ thực tế:

### 2.1 Colors

#### Brand / Primary
| Token (đề xuất) | Giá trị | Dùng ở |
|-----------------|---------|--------|
| `--color-primary` | `#7137ea` | Buttons, links, auth |
| `--color-primary-hover` | `#5a2bb8` | Button hover states |
| `--color-accent` | `#10a37f` | Chat, logo, CTA |
| `--color-accent-hover` | `#0d8a6b` | Accent hover |
| `--color-gradient-start` | `#667eea` | Wallet, KnowledgeAdmin header |
| `--color-gradient-end` | `#764ba2` | Wallet, KnowledgeAdmin header |

#### Semantic States
| Token (đề xuất) | Giá trị | Dùng ở |
|-----------------|---------|--------|
| `--color-success` | `#28a745` | Success messages, badges |
| `--color-success-hover` | `#218838` | |
| `--color-success-light` | `#d1fae5` | Success backgrounds |
| `--color-danger` | `#dc3545` | Errors, delete actions |
| `--color-danger-hover` | `#c82333` | |
| `--color-danger-light` | `#fee2e2` | Error backgrounds |
| `--color-warning` | `#ffc107` | Warnings |
| `--color-warning-hover` | `#e0a800` | |
| `--color-warning-light` | `#fef3c7` | Warning backgrounds |
| `--color-info` | `#1976d2` | Info messages |
| `--color-info-light` | `#dbeafe` | Info backgrounds |

#### Neutrals (Light Mode)
| Token (đề xuất) | Giá trị | Dùng ở |
|-----------------|---------|--------|
| `--color-bg` | `#ffffff` | Card backgrounds |
| `--color-bg-secondary` | `#f9fafb` | Page backgrounds, inputs |
| `--color-bg-tertiary` | `#f3f4f6` | Hover states |
| `--color-border` | `#e5e7eb` | Borders, dividers |
| `--color-border-light` | `#f0f0f0` | Subtle borders |
| `--color-text` | `#111827` | Primary text |
| `--color-text-secondary` | `#6b7280` | Secondary text, placeholders |
| `--color-text-muted` | `#9ca3af` | Disabled, hints |

#### Neutrals (Dark Mode)
| Token (đề xuất) | Giá trị | Dùng ở |
|-----------------|---------|--------|
| `--color-bg-dark` | `#1a1a1a` | Dark card backgrounds |
| `--color-bg-dark-secondary` | `#252525` | Dark page backgrounds |
| `--color-bg-dark-tertiary` | `#2a2a2a` | Dark hover states |
| `--color-border-dark` | `#333333` | Dark borders |
| `--color-text-dark` | `#f9fafb` | Dark mode text |
| `--color-text-dark-secondary` | `#9ca3af` | Dark secondary text |

#### Subscription Tiers
| Token (đề xuất) | Giá trị | Dùng ở |
|-----------------|---------|--------|
| `--color-tier-free` | `#6b7280` | Free plan badge |
| `--color-tier-pro` | `#7137ea` | Pro plan badge |
| `--color-tier-team` | `#10a37f` | Team plan badge |

### 2.2 Spacing

Scale 4px — toàn bộ padding/margin/gap trong codebase dùng các giá trị sau:

| Token (đề xuất) | Giá trị |
|-----------------|---------|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |
| `--space-10` | `40px` |
| `--space-12` | `48px` |

### 2.3 Typography

| Token (đề xuất) | Giá trị | Dùng cho |
|-----------------|---------|----------|
| `--font-family` | `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` | Global |
| `--font-family-mono` | `source-code-pro, Menlo, Monaco, 'Courier New', monospace` | Code |
| `--text-xs` | `12px` | Labels, hints, meta |
| `--text-sm` | `13px` | Secondary text |
| `--text-base` | `14px` | Body text (dominant) |
| `--text-md` | `16px` | Standard text |
| `--text-lg` | `18px` | Subtitles |
| `--text-xl` | `20px` | Section titles |
| `--text-2xl` | `24px` | Page headers |
| `--text-3xl` | `32px` | Hero headings |
| `--font-normal` | `400` | |
| `--font-medium` | `500` | Labels, buttons |
| `--font-semibold` | `600` | Titles |
| `--font-bold` | `700` | Headings |
| `--leading-tight` | `1.2` | Headings |
| `--leading-normal` | `1.5` | Body text |
| `--leading-relaxed` | `1.6` | Long content |

### 2.4 Border Radius

| Token (đề xuất) | Giá trị | Dùng cho |
|-----------------|---------|----------|
| `--radius-sm` | `4px` | Tags, badges nhỏ |
| `--radius-md` | `6px` | Inputs, buttons nhỏ |
| `--radius-lg` | `8px` | Cards, buttons (phổ biến nhất) |
| `--radius-xl` | `12px` | Modals, panels |
| `--radius-2xl` | `16px` | Large cards |
| `--radius-full` | `9999px` | Pills, toggles |

### 2.5 Shadows

| Token (đề xuất) | Giá trị | Dùng cho |
|-----------------|---------|----------|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.08)` | Subtle elevation |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.08)` | Cards, panels |
| `--shadow-lg` | `0 8px 32px rgba(0,0,0,0.12)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 60px rgba(0,0,0,0.15)` | Large modals |
| `--shadow-colored` | `0 4px 15px rgba(113,55,234,0.3)` | Primary buttons |

### 2.6 Transitions

| Token (đề xuất) | Giá trị |
|-----------------|---------|
| `--transition-fast` | `0.15s ease` |
| `--transition-base` | `0.2s ease` |
| `--transition-slow` | `0.3s ease` |

### 2.7 Breakpoints

| Token (đề xuất) | Giá trị | Ghi chú |
|-----------------|---------|---------|
| `--breakpoint-sm` | `480px` | Mobile |
| `--breakpoint-md` | `768px` | Tablet |
| `--breakpoint-lg` | `1024px` | Desktop |

### 2.8 Z-Index Scale

| Token (đề xuất) | Giá trị | Dùng cho |
|-----------------|---------|----------|
| `--z-dropdown` | `100` | Dropdown menus |
| `--z-sticky` | `200` | Sticky headers |
| `--z-modal` | `1000` | Modal overlays |
| `--z-toast` | `10000` | Toast notifications |

---

## 3. Shared CSS Modules — Inventory

### 3.1 `shared.module.css`
| Class | Mô tả |
|-------|-------|
| `.container` | Wrapper với padding, bg, border-radius, shadow |
| `.card` | Card component |
| `.title`, `.titleLarge` | Heading styles |
| `.subtitle`, `.text`, `.textSecondary`, `.textSmall` | Typography |
| `.loading` | Loading state |
| `.emptyState` | Empty content placeholder |
| `.marginTop`, `.marginBottom`, `.padding` | Spacing utilities |
| `.flex`, `.flexColumn`, `.flexCenter` | Flex utilities |
| `.gap`, `.gapSmall` | Gap utilities |
| `.grid`, `.gridAutoFit` | Grid utilities |

Tất cả đều có companion `.darkMode` variant.

### 3.2 `forms.module.css`
| Class | Mô tả |
|-------|-------|
| `.form`, `.formGroup`, `.formRow` | Form layout |
| `.label` | Field label |
| `.input`, `.textarea`, `.select` | Input controls |
| `.errorText` | Validation error |
| `.hint` | Helper text |

### 3.3 `buttons.module.css`
| Class | Mô tả |
|-------|-------|
| `.button` | Base button |
| `.buttonPrimary` | Purple — primary action |
| `.buttonSecondary` | Gray — secondary action |
| `.buttonSuccess` | Green |
| `.buttonDanger` | Red |
| `.buttonWarning` | Orange |
| `.buttonSmall`, `.buttonLarge` | Size variants |
| `.buttonFullWidth` | Full-width |
| `.buttonIcon` | Icon-only |

### 3.4 `messages.module.css`
| Class | Mô tả |
|-------|-------|
| `.error` | Red alert |
| `.success` | Green alert |
| `.info` | Blue alert |
| `.warning` | Yellow alert |

### 3.5 `darkMode.module.css`
| Class | Mô tả |
|-------|-------|
| `.darkMode` | Dark mode marker |
| `.bgLight` / `.bgSecondary` | Background switching |
| `.textLight` / `.textSecondary` | Text switching |
| `.borderLight` | Border switching |

---

## 4. Component Inventory

### 4.1 Component CSS Modules (28 files)

| Component | File | Kích thước ước tính | Ghi chú |
|-----------|------|---------------------|---------|
| Chat | `Chat.module.css` | ~680 lines | Module lớn nhất |
| ConversationsList | `ConversationsList.module.css` | ~200 lines | |
| ChatInputSuggest | `ChatInputSuggest.module.css` | ~100 lines | |
| ModelManager | `ModelManager.module.css` | ~100 lines | |
| Login | `Login.module.css` | ~80 lines | |
| Register | `Register.module.css` | ~60 lines | |
| RequestPasswordReset | `RequestPasswordReset.module.css` | ~60 lines | |
| ResetPasswordPage | `ResetPasswordPage.module.css` | ~60 lines | |
| SetPasswordPage | `SetPasswordPage.module.css` | ~60 lines | |
| OAuthProviders | `OAuthProviders.module.css` | ~80 lines | |
| EmailVerification | `EmailVerification.module.css` | ~80 lines | |
| ProfileSettings | `ProfileSettings.module.css` | ~120 lines | |
| AvatarUploader | `AvatarUploader.module.css` | ~80 lines | |
| AvatarCropModal | `AvatarCropModal.module.css` | ~80 lines | |
| ChangePassword | `ChangePassword.module.css` | ~80 lines | |
| UsageDashboard | `UsageDashboard.module.css` | ~60 lines | |
| UsageChart | `UsageChart.module.css` | ~60 lines | |
| UsageLimits | `UsageLimits.module.css` | ~60 lines | |
| UsageCounter | `UsageCounter.module.css` | ~40 lines | |
| SubscriptionPlans | `SubscriptionPlans.module.css` | ~200 lines | Tier-specific styling |
| SubscriptionStatus | `SubscriptionStatus.module.css` | ~80 lines | |
| BillingHistory | `BillingHistory.module.css` | ~80 lines | |
| BillingHistoryModal | `BillingHistoryModal.module.css` | ~80 lines | |
| UpgradePrompt | `UpgradePrompt.module.css` | ~80 lines | |
| KnowledgeAdmin | `KnowledgeAdmin.module.css` | ~100 lines | |
| ConfirmDialog | `ConfirmDialog.module.css` | ~80 lines | |
| Toast | `Toast.module.css` | ~80 lines | slideIn/slideOut animation |
| ToastContainer | `ToastContainer.module.css` | ~40 lines | |

### 4.2 Legacy CSS Files (9 files — cần migrate)

| File | Tính năng | Ưu tiên migrate |
|------|-----------|-----------------|
| `WalletDashboard.css` | Wallet overview, stats grid | Cao |
| `DepositModal.css` | Deposit flow | Cao |
| `WithdrawModal.css` | Withdraw flow | Cao |
| `AddBankModal.css` | Add bank account | Cao |
| `BankAccountManager.css` | Bank account list | Cao |
| `TransactionHistory.css` | Transaction table | Cao |
| `CurrencySelector.css` | Currency dropdown | Trung bình |
| `KnowledgeAdmin.css` | Admin knowledge UI | Trung bình |
| `KnowledgeAdminExtra.css` | Admin extras | Thấp |

---

## 5. Các vấn đề cần giải quyết

### 5.1 Không có CSS Variables — vấn đề lớn nhất

Màu sắc được hardcode ở **mọi file**, ví dụ màu primary `#7137ea` xuất hiện ở:
- `buttons.module.css`
- `Login.module.css`
- `ConversationsList.module.css`
- `SubscriptionPlans.module.css`
- ... và nhiều file khác

**Hậu quả:** Thay đổi brand color phải sửa hàng chục file.

### 5.2 Dark Mode phức tạp, dễ bị bỏ sót

Pattern hiện tại yêu cầu viết **2 lần** mỗi rule:
```css
/* Phải viết lại cho mỗi class */
.container { background: #ffffff; color: #111827; }
.container.darkMode { background: #1a1a1a; color: #f9fafb; }
```

Nếu thêm property mới, dễ quên cập nhật dark mode companion.

### 5.3 Màu sắc primary không nhất quán

Cùng là màu "primary purple" nhưng dùng 3 giá trị khác nhau:
- `#7137ea` — auth, buttons (shared modules)
- `#764ba2` — wallet, knowledge admin (legacy gradient)
- `#5a2bb8` — hover states

### 5.4 Một số component không dùng shared modules

Ví dụ `KnowledgeAdmin.css` tự định nghĩa lại buttons, forms thay vì dùng `buttons.module.css` và `forms.module.css`.

### 5.5 Legacy CSS có thể xung đột

Các file `.css` thuần (không phải module) export class names vào global scope, có thể gây conflict nếu tên trùng.

---

## 6. Đề xuất chuẩn hóa

### 6.1 Tạo Design Tokens (CSS Custom Properties)

Tạo file `frontend/src/styles/tokens.css` và import vào `index.css`:

```css
/* frontend/src/styles/tokens.css */
:root {
  /* Colors — Brand */
  --color-primary: #7137ea;
  --color-primary-hover: #5a2bb8;
  --color-accent: #10a37f;
  --color-accent-hover: #0d8a6b;

  /* Colors — Semantic */
  --color-success: #28a745;
  --color-danger: #dc3545;
  --color-warning: #ffc107;
  --color-info: #1976d2;

  /* Colors — Neutrals */
  --color-bg: #ffffff;
  --color-bg-secondary: #f9fafb;
  --color-bg-tertiary: #f3f4f6;
  --color-border: #e5e7eb;
  --color-text: #111827;
  --color-text-secondary: #6b7280;
  --color-text-muted: #9ca3af;

  /* Spacing */
  --space-1: 4px;   --space-2: 8px;   --space-3: 12px;
  --space-4: 16px;  --space-5: 20px;  --space-6: 24px;
  --space-8: 32px;  --space-10: 40px; --space-12: 48px;

  /* Typography */
  --text-xs: 12px; --text-sm: 13px; --text-base: 14px;
  --text-md: 16px; --text-lg: 18px; --text-xl: 20px;
  --text-2xl: 24px; --text-3xl: 32px;

  /* Border Radius */
  --radius-sm: 4px; --radius-md: 6px; --radius-lg: 8px;
  --radius-xl: 12px; --radius-2xl: 16px; --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.12);

  /* Transitions */
  --transition-fast: 0.15s ease;
  --transition-base: 0.2s ease;
  --transition-slow: 0.3s ease;

  /* Z-index */
  --z-modal: 1000;
  --z-toast: 10000;
}

/* Dark mode override */
[data-theme="dark"] {
  --color-bg: #1a1a1a;
  --color-bg-secondary: #252525;
  --color-bg-tertiary: #2a2a2a;
  --color-border: #333333;
  --color-text: #f9fafb;
  --color-text-secondary: #9ca3af;
}
```

### 6.2 Đơn giản hóa Dark Mode

Sau khi có CSS variables, dark mode không cần companion class nữa:

```css
/* Trước (hiện tại): */
.container { background: #ffffff; }
.container.darkMode { background: #1a1a1a; }

/* Sau (với tokens): */
.container { background: var(--color-bg); }
/* Dark mode tự động qua [data-theme="dark"] */
```

### 6.3 Migrate legacy CSS files

Thứ tự ưu tiên:
1. `WalletDashboard.css` → `WalletDashboard.module.css` (wallet là tính năng quan trọng)
2. `DepositModal.css`, `WithdrawModal.css`, `AddBankModal.css`, `BankAccountManager.css`, `TransactionHistory.css` → tương ứng `.module.css`
3. `KnowledgeAdmin.css` + `KnowledgeAdminExtra.css` → `KnowledgeAdmin.module.css`
4. `CurrencySelector.css` → `CurrencySelector.module.css`

### 6.4 Cập nhật shared modules dùng tokens

Sau khi có `tokens.css`, cập nhật `buttons.module.css`:
```css
/* Trước: */
.buttonPrimary { background: #7137ea; }
.buttonPrimary:hover { background: #5a2bb8; }

/* Sau: */
.buttonPrimary { background: var(--color-primary); }
.buttonPrimary:hover { background: var(--color-primary-hover); }
```

---

## 7. Thứ tự thực hiện (Roadmap)

| Bước | Công việc | Tác động | Effort |
|------|-----------|----------|--------|
| 1 | Tạo `tokens.css` với CSS variables | Nền tảng cho mọi bước tiếp theo | Thấp |
| 2 | Import `tokens.css` vào `index.css` | | Thấp |
| 3 | Cập nhật 5 shared modules dùng tokens | Mọi component dùng shared modules được hưởng lợi ngay | Trung bình |
| 4 | Migrate 9 legacy CSS → CSS Modules | Loại bỏ global scope conflicts | Cao |
| 5 | Cập nhật Dark Mode context dùng `data-theme` attribute | Loại bỏ companion `.darkMode` classes | Cao |
| 6 | Dần cập nhật component modules dùng tokens | Theo từng sprint | Dài hạn |

---

*Tạo: 2026-05-19 | Dựa trên phân tích thực tế codebase tại `frontend/src/`*
