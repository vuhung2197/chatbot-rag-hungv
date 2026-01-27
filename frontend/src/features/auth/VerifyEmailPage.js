import React, { useState, useEffect } from 'react';
import axios from 'axios';
import shared from '../../styles/shared.module.css';
import buttons from '../../styles/buttons.module.css';
import messages from '../../styles/messages.module.css';
import styles from '../../styles/components/VerifyEmailPage.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function VerifyEmailPage({ darkMode = false }) {
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    // Get token from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');

    if (!tokenFromUrl) {
      setStatus('error');
      setMessage('Không tìm thấy token xác thực trong URL.');
      return;
    }

    setToken(tokenFromUrl);
    verifyEmail(tokenFromUrl);
  }, []);

  const verifyEmail = async (emailToken) => {
    try {
      setStatus('verifying');
      setMessage('Đang xác thực email...');

      const res = await axios.get(
        `${API_URL}/user/verify-email/${emailToken}`
      );

      setStatus('success');
      setMessage('✅ Email đã được xác thực thành công!');
      
      // Clean URL and redirect to chat after 2 seconds
      setTimeout(() => {
        // Remove token from URL
        window.history.replaceState({}, document.title, '/');
        window.location.reload();
      }, 2000);
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Token không hợp lệ hoặc đã hết hạn.');
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={`${shared.card} ${darkMode ? shared.darkMode : ''} ${styles.card}`}>
        {status === 'verifying' && (
          <>
            <div className={styles.statusIcon}>⏳</div>
            <h2 className={`${shared.titleLarge} ${darkMode ? shared.darkMode : ''} ${styles.title}`}>
              Đang xác thực email...
            </h2>
            <p className={`${shared.text} ${darkMode ? shared.darkMode : ''} ${styles.text}`}>
              {message}
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className={styles.statusIconLarge}>✅</div>
            <h2 className={`${messages.success} ${styles.successTitle}`}>
              Xác thực thành công!
            </h2>
            <p className={`${shared.text} ${darkMode ? shared.darkMode : ''} ${styles.successText}`}>
              Email của bạn đã được xác thực thành công. Bạn sẽ được chuyển đến trang chủ trong giây lát...
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className={`${buttons.button} ${buttons.buttonPrimary}`}
            >
              Về trang chủ
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className={styles.statusIconLarge}>❌</div>
            <h2 className={`${messages.error} ${styles.errorTitle}`}>
              Xác thực thất bại
            </h2>
            <p className={`${shared.text} ${darkMode ? shared.darkMode : ''} ${styles.errorText}`}>
              {message}
            </p>
            <div className={styles.buttonGroup}>
              <button
                onClick={() => window.location.href = '/'}
                className={`${buttons.button} ${buttons.buttonPrimary}`}
              >
                Về trang chủ
              </button>
              <button
                onClick={() => window.location.reload()}
                className={`${buttons.button} ${buttons.buttonSecondary} ${darkMode ? buttons.darkMode : ''}`}
              >
                Thử lại
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

