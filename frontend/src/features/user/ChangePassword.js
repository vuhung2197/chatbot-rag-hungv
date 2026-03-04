import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';
import shared from '../../styles/shared.module.css';
import forms from '../../styles/forms.module.css';
import buttons from '../../styles/buttons.module.css';
import messages from '../../styles/messages.module.css';
import styles from '../../styles/components/ChangePassword.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// ─── Extracted: Password strength calculator ───
function getPasswordStrength(password, t) {
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
  const idx = Math.min(strength, 4);

  return { strength: idx, label: labels[idx], color: colors[idx] };
}

// ─── Extracted: Password Strength Bar UI ───
function PasswordStrengthBar({ password, passwordStrength, darkMode }) {
  if (!password) return null;
  return (
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
  );
}

// ─── Extracted: Password Hints ───
function PasswordHints({ newPassword, darkMode, t }) {
  if (!newPassword) return null;

  const getHint = () => {
    if (newPassword.length < 8) return `⚠️ ${t('password.minLength')}`;
    if (!/[a-z]/.test(newPassword) && !/[A-Z]/.test(newPassword)) return `💡 ${t('password.addCase')}`;
    if (!/\d/.test(newPassword)) return `💡 ${t('password.addNumber')}`;
    if (!/[^a-zA-Z\d]/.test(newPassword)) return `💡 ${t('password.addSpecial')}`;
    return '';
  };

  const hint = getHint();
  if (!hint) return null;

  return (
    <div className={`${forms.hint} ${darkMode ? forms.darkMode : ''}`}>
      {hint}
    </div>
  );
}

// ─── Extracted: Mismatch Warning ───
function MismatchWarning({ newPassword, confirmPassword, t }) {
  if (!confirmPassword || newPassword === confirmPassword) return null;
  return (
    <div className={forms.errorText}>
      ⚠️ {t('password.mismatch')}
    </div>
  );
}

// ─── Extracted: Set Password Form (OAuth users) ───
function SetPasswordForm({ darkMode, language, t, passwordStrength, onSubmit, loading }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const strength = getPasswordStrength(newPassword, t);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ newPassword, confirmPassword });
  };

  return (
    <div>
      <div className={`${messages.info} ${darkMode ? messages.darkMode : ''}`}>
        ℹ️ {language === 'vi'
          ? 'Bạn đã đăng nhập bằng Google và chưa có mật khẩu. Vui lòng thiết lập mật khẩu để có thể đăng nhập bằng email sau này.'
          : 'You logged in with Google and don\'t have a password yet. Please set a password so you can log in with email later.'}
      </div>
      <form onSubmit={handleSubmit} className={forms.form}>
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
          <PasswordStrengthBar password={newPassword} passwordStrength={strength} darkMode={darkMode} />
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
          <MismatchWarning newPassword={newPassword} confirmPassword={confirmPassword} t={t} />
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
  );
}

// ─── Extracted: Change Password Form (existing password) ───
function ChangePasswordForm({ darkMode, t, onSubmit, loading }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const strength = getPasswordStrength(newPassword, t);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ currentPassword, newPassword, confirmPassword });
  };

  return (
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
        <PasswordStrengthBar password={newPassword} passwordStrength={strength} darkMode={darkMode} />
        <PasswordHints newPassword={newPassword} darkMode={darkMode} t={t} />
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
        <MismatchWarning newPassword={newPassword} confirmPassword={confirmPassword} t={t} />
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`${buttons.button} ${buttons.buttonPrimary} ${buttons.buttonFullWidth} ${darkMode ? buttons.darkMode : ''}`}
      >
        {loading ? t('common.loading') : t('password.change')}
      </button>
    </form>
  );
}

// ─── Helper: Validate password fields ───
function validatePassword({ newPassword, confirmPassword, currentPassword, isChange }, t) {
  if (isChange && (!currentPassword || !newPassword || !confirmPassword)) return t('password.fillAll');
  if (!isChange && (!newPassword || !confirmPassword)) return t('password.fillAll');
  if (newPassword.length < 8) return t('password.minLength');
  if (newPassword !== confirmPassword) return t('password.mismatch');
  if (isChange && currentPassword === newPassword) return t('password.sameAsCurrent');
  return null;
}

// ─── Main Component ───
export default function ChangePassword({ darkMode = false }) {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasPassword, setHasPassword] = useState(true);
  const [checkingPassword, setCheckingPassword] = useState(true);

  useEffect(() => {
    const checkPassword = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setHasPassword(res.data.hasPassword !== false);
      } catch (err) {
        console.error('Error checking password status:', err);
        setHasPassword(true);
      } finally {
        setCheckingPassword(false);
      }
    };
    checkPassword();
  }, []);

  const handleChangePassword = async ({ currentPassword, newPassword, confirmPassword }) => {
    setError(''); setSuccess('');
    const validationError = validatePassword({ newPassword, confirmPassword, currentPassword, isChange: true }, t);
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/auth/password/change`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(t('password.changeSuccess'));
      setHasPassword(true);
    } catch (err) {
      const errorMessage = err.response?.data?.message || t('password.changeError');
      setError(errorMessage);
      if (errorMessage.includes('chưa có mật khẩu') || errorMessage.includes('thiết lập mật khẩu')) {
        setHasPassword(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async ({ newPassword, confirmPassword }) => {
    setError(''); setSuccess('');
    const validationError = validatePassword({ newPassword, confirmPassword, isChange: false }, t);
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/auth/password/set`,
        { newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(t('password.setSuccess') || 'Mật khẩu đã được thiết lập thành công!');
      setHasPassword(true);
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
        <SetPasswordForm
          darkMode={darkMode}
          language={language}
          t={t}
          onSubmit={handleSetPassword}
          loading={loading}
        />
      ) : (
        <ChangePasswordForm
          darkMode={darkMode}
          t={t}
          onSubmit={handleChangePassword}
          loading={loading}
        />
      )}
    </div>
  );
}
