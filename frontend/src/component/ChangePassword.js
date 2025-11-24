import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from './LanguageContext';
import shared from '../styles/shared.module.css';
import forms from '../styles/forms.module.css';
import buttons from '../styles/buttons.module.css';
import messages from '../styles/messages.module.css';
import styles from '../styles/components/ChangePassword.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function ChangePassword({ darkMode = false }) {
  const { t, language } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasPassword, setHasPassword] = useState(true); // Assume user has password initially
  const [checkingPassword, setCheckingPassword] = useState(true);

  // Password strength indicator
  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    const labels = [
      t('password.strength.veryWeak'),
      t('password.strength.weak'),
      t('password.strength.medium'),
      t('password.strength.strong'),
      t('password.strength.veryStrong')
    ];
    const colors = ['#dc3545', '#ffc107', '#ff9800', '#28a745', '#20c997'];
    
    return {
      strength: Math.min(strength, 4),
      label: labels[Math.min(strength, 4)],
      color: colors[Math.min(strength, 4)]
    };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  // Check if user has password
  useEffect(() => {
    const checkPassword = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Check if user has password from profile response
        setHasPassword(res.data.hasPassword !== false);
      } catch (err) {
        console.error('Error checking password status:', err);
        // Default to true if error (assume user has password)
        setHasPassword(true);
      } finally {
        setCheckingPassword(false);
      }
    };
    checkPassword();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t('password.fillAll'));
      return;
    }

    if (newPassword.length < 8) {
      setError(t('password.minLength'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('password.mismatch'));
      return;
    }

    if (currentPassword === newPassword) {
      setError(t('password.sameAsCurrent'));
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/auth/password/change`,
        {
          currentPassword,
          newPassword,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccess(t('password.changeSuccess'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setHasPassword(true); // User now has password
    } catch (err) {
      const errorMessage = err.response?.data?.message || t('password.changeError');
      setError(errorMessage);
      
      // If error indicates user doesn't have password, switch to set password mode
      if (errorMessage.includes('chưa có mật khẩu') || errorMessage.includes('thiết lập mật khẩu')) {
        setHasPassword(false);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle set password for OAuth users (no current password required)
  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!newPassword || !confirmPassword) {
      setError(t('password.fillAll'));
      return;
    }

    if (newPassword.length < 8) {
      setError(t('password.minLength'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('password.mismatch'));
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/auth/password/set`,
        { newPassword },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccess(t('password.setSuccess') || 'Mật khẩu đã được thiết lập thành công!');
      setNewPassword('');
      setConfirmPassword('');
      setHasPassword(true); // User now has password
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi thiết lập mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${shared.container} ${darkMode ? shared.darkMode : ''}`}>
      <h3 className={`${shared.title} ${darkMode ? shared.darkMode : ''}`}>
        🔐 {t('password.change')}
      </h3>

      {error && (
        <div className={`${messages.error} ${darkMode ? messages.darkMode : ''}`}>
          {error}
        </div>
      )}

      {success && (
        <div className={`${messages.success} ${darkMode ? messages.darkMode : ''}`}>
          {success}
        </div>
      )}

      {checkingPassword ? (
        <div className={`${shared.loading} ${darkMode ? shared.darkMode : ''}`}>
          {t('common.loading')}...
        </div>
      ) : !hasPassword ? (
        <>
          {/* Set password form (for OAuth users without password) */}
          <div>
          <div className={`${messages.info} ${darkMode ? messages.darkMode : ''}`}>
            ℹ️ {language === 'vi' 
              ? 'Bạn đã đăng nhập bằng Google và chưa có mật khẩu. Vui lòng thiết lập mật khẩu để có thể đăng nhập bằng email sau này.'
              : 'You logged in with Google and don\'t have a password yet. Please set a password so you can log in with email later.'}
          </div>
          <form onSubmit={handleSetPassword} className={forms.form}>
            <div className={forms.formGroup}>
              <label className={`${forms.label} ${darkMode ? forms.darkMode : ''}`}>
                {t('password.new')}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('password.newPlaceholder')}
                required
                className={`${forms.input} ${darkMode ? forms.darkMode : ''}`}
                minLength={8}
              />
              {newPassword && (
                <div className={styles.strengthContainer}>
                  <div className={styles.strengthBarContainer}>
                    <div className={`${styles.strengthBarWrapper} ${darkMode ? styles.darkMode : ''}`}>
                      <div 
                        className={styles.strengthBarFill}
                        style={{
                          width: `${(passwordStrength.strength + 1) * 20}%`,
                          backgroundColor: passwordStrength.color,
                        }}
                      />
                    </div>
                    <span 
                      className={`${forms.textSmall} ${styles.strengthLabel}`}
                      style={{ color: passwordStrength.color }}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className={forms.formGroup}>
              <label className={`${forms.label} ${darkMode ? forms.darkMode : ''}`}>
                {t('password.confirm')}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('password.confirmPlaceholder')}
                required
                className={`${forms.input} ${darkMode ? forms.darkMode : ''}`}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <div className={forms.errorText}>
                  ⚠️ {t('password.mismatch')}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`${buttons.button} ${buttons.buttonPrimary} ${buttons.buttonFullWidth} ${darkMode ? buttons.darkMode : ''}`}
            >
              {loading ? t('common.loading') : (language === 'vi' ? 'Thiết lập mật khẩu' : 'Set Password')}
            </button>
          </form>
        </div>
        </>
      ) : (
        <>
          {/* Change password form (for users with existing password) */}
          <form onSubmit={handleSubmit} className={forms.form}>
          <div className={forms.formGroup}>
            <label className={`${forms.label} ${darkMode ? forms.darkMode : ''}`}>
              {t('password.current')}
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={t('password.currentPlaceholder')}
              className={`${forms.input} ${darkMode ? forms.darkMode : ''}`}
              required
            />
          </div>

          <div className={forms.formGroup}>
            <label className={`${forms.label} ${darkMode ? forms.darkMode : ''}`}>
              {t('password.new')}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('password.newPlaceholder')}
              className={`${forms.input} ${darkMode ? forms.darkMode : ''}`}
              required
              minLength={8}
            />
            {newPassword && (
              <div className={styles.strengthContainer}>
                <div className={styles.strengthBarContainer}>
                  <div className={`${styles.strengthBarWrapper} ${darkMode ? styles.darkMode : ''}`}>
                    <div 
                      className={styles.strengthBarFill}
                      style={{
                        width: `${(passwordStrength.strength + 1) * 20}%`,
                        backgroundColor: passwordStrength.color,
                      }}
                    />
                  </div>
                  <span 
                    className={forms.textSmall}
                    style={{ color: passwordStrength.color, fontWeight: 500, minWidth: '60px' }}
                  >
                    {passwordStrength.label}
                  </span>
                </div>
                <div className={`${forms.hint} ${darkMode ? forms.darkMode : ''}`}>
                  {newPassword.length < 8 && `⚠️ ${t('password.minLength')}`}
                  {newPassword.length >= 8 && !/[a-z]/.test(newPassword) && !/[A-Z]/.test(newPassword) && `💡 ${t('password.addCase')}`}
                  {newPassword.length >= 8 && !/\d/.test(newPassword) && `💡 ${t('password.addNumber')}`}
                  {newPassword.length >= 8 && !/[^a-zA-Z\d]/.test(newPassword) && `💡 ${t('password.addSpecial')}`}
                </div>
              </div>
            )}
          </div>

          <div className={forms.formGroup}>
            <label className={`${forms.label} ${darkMode ? forms.darkMode : ''}`}>
              {t('password.confirm')}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('password.confirmPlaceholder')}
              className={`${forms.input} ${darkMode ? forms.darkMode : ''}`}
              required
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <div className={forms.errorText}>
                ⚠️ {t('password.mismatch')}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`${buttons.button} ${buttons.buttonPrimary} ${buttons.buttonFullWidth} ${darkMode ? buttons.darkMode : ''}`}
          >
            {loading ? t('common.loading') : t('password.change')}
          </button>
        </form>
        </>
      )}
    </div>
  );
}

