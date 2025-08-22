// Custom hooks for API calls and common logic
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { handleApiError, getUserErrorMessage } from '../utils/errorHandler';
import { CONFIG } from '../utils/config';

// Hook for API calls with loading, error states
export function useApi(url, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    immediate = true, // Auto-fetch on mount
    method = 'GET',
    dependencies = [], // Re-fetch when these change
    onSuccess,
    onError
  } = options;

  const fetchData = useCallback(async (customOptions = {}) => {
    try {
      setLoading(true);
      setError(null);

      const config = {
        method,
        url,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
          ...customOptions.headers
        },
        ...customOptions
      };

      const response = await axios(config);
      setData(response.data);
      
      if (onSuccess) {
        onSuccess(response.data);
      }
      
      return response.data;
    } catch (err) {
      const parsedError = handleApiError(err, `API call to ${url}`);
      setError(parsedError);
      
      if (onError) {
        onError(parsedError);
      }
      
      throw parsedError;
    } finally {
      setLoading(false);
    }
  }, [url, method, onSuccess, onError]);

  useEffect(() => {
    if (immediate) {
      fetchData();
    }
  }, [fetchData, immediate, ...dependencies]);

  const refetch = useCallback(() => fetchData(), [fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
    execute: fetchData
  };
}

// Hook for form handling with validation
export function useForm(initialValues, validationRules = {}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = useCallback((name, value) => {
    const rules = validationRules[name];
    if (!rules) return [];

    const fieldErrors = [];

    // Required validation
    if (rules.required && (!value || value.toString().trim() === '')) {
      fieldErrors.push(`${rules.label || name} là bắt buộc`);
    }

    // Custom validation
    if (value && rules.validate && typeof rules.validate === 'function') {
      const result = rules.validate(value, values);
      if (result !== true) {
        fieldErrors.push(result);
      }
    }

    return fieldErrors;
  }, [validationRules, values]);

  const setFieldValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Validate on change if field was already touched
    if (touched[name]) {
      const fieldErrors = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: fieldErrors }));
    }
  }, [touched, validateField]);

  const setFieldTouched = useCallback((name, isTouched = true) => {
    setTouched(prev => ({ ...prev, [name]: isTouched }));
    
    if (isTouched) {
      const fieldErrors = validateField(name, values[name]);
      setErrors(prev => ({ ...prev, [name]: fieldErrors }));
    }
  }, [validateField, values]);

  const validateForm = useCallback(() => {
    const formErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach(name => {
      const fieldErrors = validateField(name, values[name]);
      if (fieldErrors.length > 0) {
        formErrors[name] = fieldErrors;
        isValid = false;
      }
    });

    setErrors(formErrors);
    setTouched(Object.keys(validationRules).reduce((acc, name) => {
      acc[name] = true;
      return acc;
    }, {}));

    return isValid;
  }, [validationRules, values, validateField]);

  const handleSubmit = useCallback(async (onSubmit) => {
    setIsSubmitting(true);
    
    try {
      const isValid = validateForm();
      if (isValid && onSubmit) {
        await onSubmit(values);
      }
      return isValid;
    } catch (error) {
      console.error('Form submission error:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validateForm]);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setFieldValue,
    setFieldTouched,
    handleSubmit,
    resetForm,
    isValid: Object.keys(errors).every(key => errors[key].length === 0)
  };
}

// Hook for managing local storage with sync
export function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  const setStoredValue = useCallback((newValue) => {
    try {
      setValue(newValue);
      if (newValue === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(newValue));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  return [value, setStoredValue];
}

// Hook for toast notifications
export function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9);
    
    setToast({ id, message, type });
    
    setTimeout(() => {
      setToast(null);
    }, duration);
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return {
    toast,
    showToast,
    hideToast,
    showSuccess: (message) => showToast(message, 'success'),
    showError: (message) => showToast(message, 'error'),
    showWarning: (message) => showToast(message, 'warning'),
    showInfo: (message) => showToast(message, 'info')
  };
}

// Hook for authentication state
export function useAuth() {
  const [user, setUser] = useLocalStorage('user', null);
  const [token, setToken] = useLocalStorage('token', null);
  const [role, setRole] = useLocalStorage('role', null);

  const login = useCallback(async (credentials) => {
    try {
      const response = await axios.post(`${CONFIG.API_URL}/auth/login`, credentials);
      const { token, role, user } = response.data;
      
      setToken(token);
      setRole(role);
      setUser(user);
      
      return { success: true, user };
    } catch (error) {
      const parsedError = handleApiError(error, 'login');
      throw parsedError;
    }
  }, [setToken, setRole, setUser]);

  const logout = useCallback(() => {
    setToken(null);
    setRole(null);
    setUser(null);
  }, [setToken, setRole, setUser]);

  const isAuthenticated = Boolean(token);
  const isAdmin = role === 'admin';

  return {
    user,
    token,
    role,
    isAuthenticated,
    isAdmin,
    login,
    logout
  };
}