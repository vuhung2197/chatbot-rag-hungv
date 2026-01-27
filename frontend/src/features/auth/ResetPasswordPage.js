import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';
import shared from '../../styles/shared.module.css';
import forms from '../../styles/forms.module.css';
import buttons from '../../styles/buttons.module.css';
import messages from '../../styles/messages.module.css';
import styles from '../../styles/components/ResetPasswordPage.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function ResetPasswordPage({ darkMode = false }) {
  const { t } = useLanguage();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!token) {
      setError(t('password.noToken'));
      return;
    }

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
      await axios.post(
        `${API_URL}/auth/password/reset/${token}`,
        {
          newPassword,
        }
      );

      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || t('password.resetError'));
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
          {t('password.resetSuccess')}
        </h2>
        <p className={`${shared.text} ${darkMode ? shared.darkMode : ''} ${styles.successText}`}>
          {t('password.resetSuccessMessage')}
        </p>
          <button
            onClick={() => window.location.href = '/'}
            className={`${buttons.button} ${buttons.buttonPrimary}`}
          >
            {t('password.backToLogin')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={`${shared.card} ${darkMode ? shared.darkMode : ''} ${styles.cardForm}`}>
        <h2 className={`${shared.titleLarge} ${darkMode ? shared.darkMode : ''} ${styles.title}`}>
          🔐 {t('password.reset')}
        </h2>

        {error && (
          <div className={`${messages.error} ${darkMode ? messages.darkMode : ''}`}>
            {error}
          </div>
        )}

        {!token && (
          <div className={`${messages.warning} ${darkMode ? messages.darkMode : ''}`}>
            ⚠️ {t('password.noToken')}
          </div>
        )}

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
              className={`${forms.input} ${darkMode ? forms.darkMode : ''}`}
              required
              minLength={8}
            />
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
            disabled={loading || !token}
            className={`${buttons.button} ${buttons.buttonPrimary} ${buttons.buttonFullWidth} ${darkMode ? buttons.darkMode : ''}`}
          >
            {loading ? t('common.loading') : t('password.reset')}
          </button>
        </form>

        <div className={styles.backLinkContainer}>
          <a
            href="/"
            className={styles.backLink}
          >
            {t('password.backToLoginLink')}
          </a>
        </div>
      </div>
    </div>
  );
}

