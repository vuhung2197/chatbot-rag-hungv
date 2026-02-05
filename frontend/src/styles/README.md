# CSS Modules Structure

## Shared Modules (Tái sử dụng)

Các module này được thiết kế để tái sử dụng ở nhiều component:

### 1. `shared.module.css`
Chứa các styles chung cho containers, typography, loading states, và utilities:
- `.container` - Container với padding, background, border
- `.card` - Card component
- `.title`, `.titleLarge`, `.subtitle` - Typography
- `.loading`, `.emptyState` - Loading và empty states
- Flex và Grid utilities

### 2. `forms.module.css`
Chứa các styles cho forms và inputs:
- `.form`, `.formGroup`, `.formRow` - Form layout
- `.label` - Form labels
- `.input`, `.textarea`, `.select` - Form inputs
- `.errorText`, `.hint` - Form validation

### 3. `buttons.module.css`
Chứa các styles cho buttons:
- `.button` - Base button
- `.buttonPrimary`, `.buttonSecondary`, `.buttonSuccess`, `.buttonDanger` - Button variants
- `.buttonSmall`, `.buttonLarge` - Button sizes
- `.buttonFullWidth` - Full width button
- `.buttonIcon` - Icon button

### 4. `messages.module.css`
Chứa các styles cho messages:
- `.error` - Error message
- `.success` - Success message
- `.info` - Info message
- `.warning` - Warning message

### 5. `darkMode.module.css`
Chứa các utilities cho dark mode (optional, có thể dùng trực tiếp trong các module khác)

## Component-Specific Modules

Các file trong `components/` chỉ nên chứa styles **unique** cho component đó, không nên duplicate các styles đã có trong shared modules.

## Cách sử dụng

```jsx
import shared from '../styles/shared.module.css';
import forms from '../styles/forms.module.css';
import buttons from '../styles/buttons.module.css';
import messages from '../styles/messages.module.css';
import styles from '../styles/components/YourComponent.module.css';

function YourComponent({ darkMode = false }) {
  return (
    <div className={`${shared.container} ${darkMode ? shared.darkMode : ''}`}>
      <h3 className={`${shared.title} ${darkMode ? shared.darkMode : ''}`}>
        Title
      </h3>
      
      {error && (
        <div className={`${messages.error} ${darkMode ? messages.darkMode : ''}`}>
          {error}
        </div>
      )}
      
      <form className={forms.form}>
        <div className={forms.formGroup}>
          <label className={`${forms.label} ${darkMode ? forms.darkMode : ''}`}>
            Label
          </label>
          <input
            className={`${forms.input} ${darkMode ? forms.darkMode : ''}`}
          />
        </div>
        
        <button
          className={`${buttons.button} ${buttons.buttonPrimary} ${darkMode ? buttons.darkMode : ''}`}
        >
          Submit
        </button>
      </form>
    </div>
  );
}
```

## Lợi ích

1. **Giảm code duplication** - Styles chung chỉ định nghĩa một lần
2. **Dễ maintain** - Thay đổi một chỗ, áp dụng cho tất cả components
3. **Consistency** - Đảm bảo UI nhất quán
4. **Smaller bundle size** - CSS được tối ưu hóa tốt hơn

