import React, { useState } from 'react';
import axios from 'axios';
import shared from '../styles/shared.module.css';
import forms from '../styles/forms.module.css';
import buttons from '../styles/buttons.module.css';
import messages from '../styles/messages.module.css';
import styles from '../styles/components/EmailVerification.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function EmailVerification({ 
  email, 
  emailVerified, 
  darkMode = false,
  onVerificationUpdate 
}) {
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);

  const handleSendVerification = async () => {
    setSending(true);
    setError('');
    setSuccess('');

    try {
      const authToken = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/user/verify-email`,
        {},
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      // Check if email service is configured
      if (res.data.verificationCode) {
        // Development mode - email service not configured
        console.log('📧 Verification Code:', res.data.verificationCode);
        console.log('📧 Verification URL:', res.data.verificationUrl);
        setSuccess(`Email verification đã được gửi! (Development mode - Code: ${res.data.verificationCode})`);
        setShowTokenInput(true);
        // Auto-fill token if available
        if (res.data.verificationCode) {
          setToken(res.data.verificationCode.replace(/-/g, ''));
        }
      } else {
        setSuccess('Email verification đã được gửi! Vui lòng kiểm tra email của bạn (bao gồm cả Spam folder).');
        setShowTokenInput(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi gửi email verification');
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (!token.trim()) {
      setError('Vui lòng nhập verification token');
      return;
    }

    setVerifying(true);
    setError('');
    setSuccess('');

    try {
      // Verify email doesn't require authentication token (uses token from URL)
      const res = await axios.get(
        `${API_URL}/user/verify-email/${token}`
      );

      setSuccess('Email đã được xác thực thành công!');
      setToken('');
      setShowTokenInput(false);
      
      // Notify parent component to reload profile
      if (onVerificationUpdate) {
        onVerificationUpdate(true);
      }
      
      // Don't reload page - let parent component handle the update
      // This allows ProfileSettings to reload profile from API
    } catch (err) {
      setError(err.response?.data?.message || 'Token không hợp lệ hoặc đã hết hạn');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className={`${shared.container} ${darkMode ? shared.darkMode : ''} ${styles.container}`}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.icon}>
            {emailVerified ? '✅' : '⚠️'}
          </span>
          <div>
            <div className={`${shared.subtitle} ${darkMode ? shared.darkMode : ''}`}>
              Email Verification
            </div>
            <div className={`${shared.textSmall} ${darkMode ? shared.darkMode : ''}`}>
              {email}
            </div>
          </div>
        </div>
        <div className={`${styles.badge} ${emailVerified ? styles.badgeVerified : styles.badgeUnverified}`}>
          {emailVerified ? 'Đã xác thực' : 'Chưa xác thực'}
        </div>
      </div>

      {!emailVerified && (
        <div>
          {!showTokenInput ? (
            <div>
              <p className={`${shared.text} ${darkMode ? shared.darkMode : ''} ${styles.descriptionText}`}>
                Email của bạn chưa được xác thực. Vui lòng xác thực để đảm bảo tính bảo mật của tài khoản.
              </p>
              <button
                onClick={handleSendVerification}
                disabled={sending}
                className={`${buttons.button} ${buttons.buttonPrimary} ${darkMode ? buttons.darkMode : ''}`}
              >
                {sending ? 'Đang gửi...' : '📧 Gửi email xác thực'}
              </button>
            </div>
          ) : (
            <div>
              <p className={`${shared.text} ${darkMode ? shared.darkMode : ''} ${styles.descriptionText}`}>
                Vui lòng kiểm tra email và copy <strong>mã xác thực</strong> vào ô bên dưới:
              </p>
              <div className={styles.tokenHintBox}>
                <div className={`${shared.textSmall} ${darkMode ? shared.darkMode : ''} ${styles.tokenHintText}`}>
                  💡 Mẹo: Mã xác thực nằm trong email, có thể có dấu gạch ngang (-)
                </div>
                <div className={`${shared.textSmall} ${darkMode ? shared.darkMode : ''}`}>
                  Bạn có thể paste mã có hoặc không có dấu gạch ngang
                </div>
              </div>
              <div className={styles.tokenInputGroup}>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => {
                    // Auto-remove dashes and spaces for easier paste
                    const cleaned = e.target.value.replace(/[-\s]/g, '');
                    setToken(cleaned);
                  }}
                  placeholder="Dán mã xác thực từ email (có thể có dấu -)"
                  className={`${forms.input} ${styles.tokenInput} ${darkMode ? forms.darkMode : ''}`}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleVerify();
                    }
                  }}
                  onPaste={(e) => {
                    // Auto-clean pasted text
                    e.preventDefault();
                    const pasted = e.clipboardData.getData('text');
                    const cleaned = pasted.replace(/[-\s]/g, '');
                    setToken(cleaned);
                  }}
                />
                <button
                  onClick={handleVerify}
                  disabled={verifying || !token.trim()}
                  className={`${buttons.button} ${buttons.buttonSuccess} ${darkMode ? buttons.darkMode : ''}`}
                >
                  {verifying ? 'Đang xác thực...' : '✅ Xác thực'}
                </button>
              </div>
              <div className={`${shared.textSmall} ${darkMode ? shared.darkMode : ''} ${styles.tokenHintTextBottom}`}>
                Hoặc nhấp vào link trong email để xác thực tự động
              </div>
              <button
                onClick={() => {
                  setShowTokenInput(false);
                  setToken('');
                  setError('');
                  setSuccess('');
                }}
                className={`${buttons.button} ${buttons.buttonSmall} ${buttons.buttonSecondary} ${darkMode ? buttons.darkMode : ''}`}
              >
                Hủy
              </button>
            </div>
          )}
        </div>
      )}

      {emailVerified && (
        <div className={`${messages.success} ${darkMode ? messages.darkMode : ''} ${styles.successMessage}`}>
          ✅ Email của bạn đã được xác thực thành công!
        </div>
      )}

      {error && (
        <div className={`${messages.error} ${darkMode ? messages.darkMode : ''} ${styles.errorMessage}`}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className={`${messages.success} ${darkMode ? messages.darkMode : ''} ${styles.successMessageTop}`}>
          ✅ {success}
        </div>
      )}
    </div>
  );
}

