# Exercise 2: Setup Testing Framework

## Nhiệm vụ
Thiết lập testing infrastructure cho project

## Step 1: Cài đặt testing dependencies

```bash
cd frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
```

## Step 2: Tạo test setup file

Tạo `frontend/src/setupTests.js`:

```javascript
import '@testing-library/jest-dom';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock window.location
delete window.location;
window.location = {
  href: 'http://localhost:3000',
  assign: jest.fn(),
  reload: jest.fn(),
  replace: jest.fn(),
};

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
```

## Step 3: Viết test cho utilities

Tạo `frontend/src/utils/__tests__/validation.test.js`:

```javascript
import {
  validateEmail,
  validatePassword,
  validateEmailArray,
  validateForm
} from '../validation';

describe('validateEmail', () => {
  test('should pass with valid email', () => {
    const result = validateEmail('test@example.com');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.sanitized).toBe('test@example.com');
  });

  test('should fail with invalid email format', () => {
    const result = validateEmail('invalid-email');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Định dạng email không hợp lệ');
  });

  test('should fail with empty email', () => {
    const result = validateEmail('');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Email không được để trống');
  });

  test('should sanitize email (trim and lowercase)', () => {
    const result = validateEmail('  TEST@EXAMPLE.COM  ');
    expect(result.sanitized).toBe('test@example.com');
  });
});

describe('validatePassword', () => {
  test('should pass with strong password', () => {
    const result = validatePassword('MyStr0ngP@ssw0rd');
    expect(result.isValid).toBe(true);
    expect(result.strength).toBe('strong');
  });

  test('should fail with weak password', () => {
    const result = validatePassword('123');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('should check for required character types', () => {
    const result = validatePassword('onlylowercase');
    expect(result.errors).toContain('Mật khẩu phải có ít nhất 1 chữ hoa');
    expect(result.errors).toContain('Mật khẩu phải có ít nhất 1 số');
  });
});

describe('validateEmailArray', () => {
  test('should pass with valid email array', () => {
    const result = validateEmailArray(['email1', 'email2']);
    expect(result.isValid).toBe(true);
    expect(result.count).toBe(2);
  });

  test('should fail with empty array', () => {
    const result = validateEmailArray([]);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Vui lòng chọn ít nhất 1 email');
  });

  test('should fail with non-array input', () => {
    const result = validateEmailArray('not-array');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Danh sách email không hợp lệ');
  });
});
```

## Step 4: Test cho error handler

Tạo `frontend/src/utils/__tests__/errorHandler.test.js`:

```javascript
import {
  AuthenticationError,
  ValidationError,
  NetworkError,
  parseApiError,
  isAuthError,
  getUserErrorMessage
} from '../errorHandler';

describe('Error Classes', () => {
  test('AuthenticationError should have correct properties', () => {
    const error = new AuthenticationError('Token expired', 401);
    expect(error.name).toBe('AuthenticationError');
    expect(error.statusCode).toBe(401);
    expect(error.userMessage).toBe('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  });

  test('ValidationError should have correct properties', () => {
    const error = new ValidationError('email', 'Invalid format');
    expect(error.name).toBe('ValidationError');
    expect(error.field).toBe('email');
    expect(error.userMessage).toBe('Invalid format');
  });
});

describe('parseApiError', () => {
  test('should parse 401 error as AuthenticationError', () => {
    const apiError = {
      response: {
        status: 401,
        data: { message: 'Token expired' }
      }
    };
    
    const result = parseApiError(apiError);
    expect(result).toBeInstanceOf(AuthenticationError);
    expect(result.statusCode).toBe(401);
  });

  test('should parse network error', () => {
    const apiError = {
      message: 'Network Error'
    };
    
    const result = parseApiError(apiError);
    expect(result).toBeInstanceOf(NetworkError);
  });

  test('should parse 400 error as ValidationError', () => {
    const apiError = {
      response: {
        status: 400,
        data: { message: 'Invalid input' }
      }
    };
    
    const result = parseApiError(apiError);
    expect(result).toBeInstanceOf(ValidationError);
  });
});

describe('isAuthError', () => {
  test('should detect AuthenticationError', () => {
    const error = new AuthenticationError();
    expect(isAuthError(error)).toBe(true);
  });

  test('should detect 401 status', () => {
    const error = { response: { status: 401 } };
    expect(isAuthError(error)).toBe(true);
  });

  test('should detect token-related messages', () => {
    const error = { message: 'Token expired' };
    expect(isAuthError(error)).toBe(true);
  });
});
```

## Step 5: Test cho custom hooks

Tạo `frontend/src/hooks/__tests__/useApi.test.js`:

```javascript
import { renderHook, act } from '@testing-library/react';
import axios from 'axios';
import { useApi, useForm, useLocalStorage } from '../useApi';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('useApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should fetch data successfully', async () => {
    const mockData = { message: 'success' };
    mockedAxios.mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(() => 
      useApi('/test-url', { immediate: false })
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  test('should handle API error', async () => {
    const mockError = {
      response: { status: 404, data: { message: 'Not found' } }
    };
    mockedAxios.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => 
      useApi('/test-url', { immediate: false })
    );

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeNull();
  });
});

describe('useForm', () => {
  test('should handle form values and validation', () => {
    const initialValues = { email: '', password: '' };
    const validationRules = {
      email: { 
        required: true, 
        validate: (value) => value.includes('@') || 'Email must contain @' 
      }
    };

    const { result } = renderHook(() => 
      useForm(initialValues, validationRules)
    );

    // Initial state
    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});

    // Set field value
    act(() => {
      result.current.setFieldValue('email', 'invalid-email');
    });

    expect(result.current.values.email).toBe('invalid-email');

    // Touch field to trigger validation
    act(() => {
      result.current.setFieldTouched('email');
    });

    expect(result.current.errors.email).toContain('Email must contain @');
  });
});

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('should read and write to localStorage', () => {
    const { result } = renderHook(() => 
      useLocalStorage('test-key', 'default-value')
    );

    // Should use default value initially
    expect(result.current[0]).toBe('default-value');

    // Should update value
    act(() => {
      result.current[1]('new-value');
    });

    expect(result.current[0]).toBe('new-value');
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'test-key', 
      JSON.stringify('new-value')
    );
  });
});
```

## Step 6: Chạy tests

```bash
cd frontend
npm test

# Hoặc watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage
```

## Step 7: Component testing example

Tạo `frontend/src/component/__tests__/SubscriptionList.test.js`:

```javascript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubscriptionList from '../SubscriptionList';

// Mock dependencies
jest.mock('../hooks/useApi');
jest.mock('../utils/config');

describe('SubscriptionList Component', () => {
  const mockEmails = [
    {
      id: '1',
      from: 'test@example.com',
      subject: 'Test Subject',
      unsubscribe: 'http://unsubscribe.example.com'
    }
  ];

  test('should render email list', () => {
    render(<SubscriptionList subs={mockEmails} />);
    
    expect(screen.getByText('📬 Danh sách bản tin đã đăng ký')).toBeInTheDocument();
    expect(screen.getByText('Test Subject')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  test('should handle email selection', async () => {
    const user = userEvent.setup();
    render(<SubscriptionList subs={mockEmails} />);
    
    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);
    
    expect(checkbox).toBeChecked();
  });

  test('should show empty state when no emails', () => {
    render(<SubscriptionList subs={[]} />);
    
    expect(screen.getByText('Không tìm thấy bản tin nào trong hộp thư của bạn.')).toBeInTheDocument();
  });

  test('should show auth needed state', () => {
    const authError = { type: 'TOKEN_REQUIRED', message: 'Auth needed' };
    render(<SubscriptionList subs={[]} authError={authError} />);
    
    expect(screen.getByText('⚠️ Cần xác thực Google')).toBeInTheDocument();
    expect(screen.getByText('🔐 Kết nối với Google')).toBeInTheDocument();
  });
});
```

## Kết quả mong đợi

Sau khi setup xong, bạn sẽ có:

1. **✅ Unit Tests**: Test các utility functions
2. **✅ Integration Tests**: Test custom hooks  
3. **✅ Component Tests**: Test UI components
4. **✅ Coverage Reports**: Biết được % code được test
5. **✅ Continuous Testing**: Auto-run khi code thay đổi

## Lợi ích

- **🐛 Catch Bugs Early**: Phát hiện lỗi ngay khi viết code
- **🔧 Safe Refactoring**: Yên tâm sửa code mà không lo phá vỡ
- **📚 Documentation**: Tests như documentation cho code
- **🚀 Confidence**: Deploy với confidence cao hơn