// Validation utilities

// Email validation
export function validateEmail(email) {
  const errors = [];

  if (!email || email.trim() === '') {
    errors.push('Email không được để trống');
    return { isValid: false, errors };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    errors.push('Định dạng email không hợp lệ');
  }

  if (email.length > 254) {
    errors.push('Email quá dài (tối đa 254 ký tự)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: email.trim().toLowerCase(),
  };
}

// Password validation
export function validatePassword(password) {
  const errors = [];

  if (!password) {
    errors.push('Mật khẩu không được để trống');
    return { isValid: false, errors };
  }

  if (password.length < 8) {
    errors.push('Mật khẩu phải có ít nhất 8 ký tự');
  }

  if (password.length > 128) {
    errors.push('Mật khẩu quá dài (tối đa 128 ký tự)');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Mật khẩu phải có ít nhất 1 chữ hoa');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Mật khẩu phải có ít nhất 1 chữ thường');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Mật khẩu phải có ít nhất 1 số');
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password),
  };
}

function calculatePasswordStrength(password) {
  let score = 0;

  // Length
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  // Character types
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  // Patterns
  if (!/(.)\1{2,}/.test(password)) score += 1; // No repeating chars

  if (score <= 2) return 'weak';
  if (score <= 4) return 'medium';
  return 'strong';
}

// Array validation
export function validateEmailArray(emails) {
  const errors = [];

  if (!Array.isArray(emails)) {
    return { isValid: false, errors: ['Danh sách email không hợp lệ'] };
  }

  if (emails.length === 0) {
    return { isValid: false, errors: ['Vui lòng chọn ít nhất 1 email'] };
  }

  if (emails.length > 100) {
    errors.push('Chỉ được chọn tối đa 100 emails');
  }

  return {
    isValid: errors.length === 0,
    errors,
    count: emails.length,
  };
}

// File validation
export function validateFileUpload(file, options = {}) {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['.pdf', '.doc', '.docx', '.txt'],
    maxFiles = 5,
  } = options;

  const errors = [];

  if (!file) {
    return { isValid: false, errors: ['Vui lòng chọn file'] };
  }

  // File size
  if (file.size > maxSize) {
    errors.push(`File quá lớn. Tối đa ${formatFileSize(maxSize)}`);
  }

  // File type
  const fileExt = `.${file.name.split('.').pop().toLowerCase()}`;
  if (!allowedTypes.includes(fileExt)) {
    errors.push(
      `Định dạng file không được hỗ trợ. Chấp nhận: ${allowedTypes.join(', ')}`
    );
  }

  // File name
  if (file.name.length > 255) {
    errors.push('Tên file quá dài');
  }

  return {
    isValid: errors.length === 0,
    errors,
    fileInfo: {
      name: file.name,
      size: file.size,
      type: file.type,
      extension: fileExt,
    },
  };
}

// URL validation
export function validateUrl(url) {
  const errors = [];

  if (!url || url.trim() === '') {
    return { isValid: false, errors: ['URL không được để trống'] };
  }

  try {
    const parsed = new URL(url);

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      errors.push('URL phải bắt đầu bằng http:// hoặc https://');
    }

    // Block local addresses in production
    if (process.env.NODE_ENV === 'production') {
      const hostname = parsed.hostname.toLowerCase();
      const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];

      if (
        blockedHosts.includes(hostname) ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.')
      ) {
        errors.push('URL không được truy cập địa chỉ local');
      }
    }
  } catch (error) {
    errors.push('Định dạng URL không hợp lệ');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: url.trim(),
  };
}

// Helper functions
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Generic form validation
export function validateForm(formData, validationRules) {
  const errors = {};
  let isValid = true;

  Object.keys(validationRules).forEach(field => {
    const rules = validationRules[field];
    const value = formData[field];
    const fieldErrors = [];

    // Required check
    if (rules.required && (!value || value.toString().trim() === '')) {
      fieldErrors.push(`${rules.label || field} là bắt buộc`);
    }

    // Type-specific validation
    if (value && rules.type) {
      let validation;
      switch (rules.type) {
        case 'email':
          validation = validateEmail(value);
          break;
        case 'password':
          validation = validatePassword(value);
          break;
        case 'url':
          validation = validateUrl(value);
          break;
      }

      if (validation && !validation.isValid) {
        fieldErrors.push(...validation.errors);
      }
    }

    // Custom validation function
    if (value && rules.custom && typeof rules.custom === 'function') {
      const customResult = rules.custom(value, formData);
      if (customResult !== true) {
        fieldErrors.push(customResult);
      }
    }

    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
      isValid = false;
    }
  });

  return { isValid, errors };
}

// Example usage:
// const validationRules = {
//   email: { required: true, type: 'email', label: 'Email' },
//   password: { required: true, type: 'password', label: 'Mật khẩu' },
//   confirmPassword: {
//     required: true,
//     custom: (value, formData) =>
//       value !== formData.password ? 'Mật khẩu xác nhận không khớp' : true
//   }
// };
