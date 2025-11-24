import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from './LanguageContext';
import shared from '../styles/shared.module.css';
import forms from '../styles/forms.module.css';
import buttons from '../styles/buttons.module.css';
import messages from '../styles/messages.module.css';
import styles from '../styles/components/SetPasswordPage.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function SetPasswordPage({ darkMode = false }) {
  const { t } = useLanguage();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      // Save token to localStorage for authentication
      localStorage.setItem('token', tokenFromUrl);
    } else {
      setError('Token không hợp lệ. Vui lòng thử lại.');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!newPassword || !confirmPassword) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (newPassword.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);

    try {
      const authToken = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/auth/password/set`,
        { newPassword },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      setSuccess(true);
      // Redirect to chat after 2 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi thiết lập mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.pageContainer}>
        <div className={`${shared.card} ${darkMode ? shared.darkMode : ''} ${styles.card}`}>
          <div className={styles.successIcon}>✅</div>
          <h2 className={`${messages.success} ${styles.successTitle}`}>
            Mật khẩu đã được thiết lập thành công!
          </h2>
          <p className={`${shared.text} ${darkMode ? shared.darkMode : ''} ${styles.successText}`}>
            Bạn sẽ được chuyển đến trang chủ trong giây lát...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={`${shared.card} ${darkMode ? shared.darkMode : ''} ${styles.cardForm}`}>
        <h2 className={`${shared.titleLarge} ${darkMode ? shared.darkMode : ''} ${styles.title}`}>
          🔐 Thiết lập mật khẩu
        </h2>
        <p className={`${shared.text} ${darkMode ? shared.darkMode : ''} ${styles.description}`}>
          Bạn đã đăng nhập bằng Google. Vui lòng thiết lập mật khẩu để có thể đăng nhập bằng email sau này.
        </p>

        {error && (
          <div className={`${messages.error} ${darkMode ? messages.darkMode : ''}`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={forms.form}>
          <div className={forms.formGroup}>
            <label className={`${forms.label} ${darkMode ? forms.darkMode : ''}`}>
              Mật khẩu mới
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
              required
              className={`${forms.input} ${darkMode ? forms.darkMode : ''}`}
            />
          </div>

          <div className={forms.formGroup}>
            <label className={`${forms.label} ${darkMode ? forms.darkMode : ''}`}>
              Xác nhận mật khẩu
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              required
              className={`${forms.input} ${darkMode ? forms.darkMode : ''}`}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`${buttons.button} ${buttons.buttonPrimary} ${buttons.buttonFullWidth} ${darkMode ? buttons.darkMode : ''}`}
          >
            {loading ? 'Đang xử lý...' : 'Thiết lập mật khẩu'}
          </button>
        </form>
      </div>
    </div>
  );
}

