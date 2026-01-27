import React, { useState } from 'react';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';
import shared from '../../styles/shared.module.css';
import forms from '../../styles/forms.module.css';
import buttons from '../../styles/buttons.module.css';
import messages from '../../styles/messages.module.css';
import styles from '../../styles/components/RequestPasswordReset.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function RequestPasswordReset({ darkMode = false, onSuccess }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email) {
      setError(t('auth.email') + ' ' + t('common.required'));
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API_URL}/auth/password/reset`, { email });
      setSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      // Don't reveal if email exists (security best practice)
      setSuccess(true); // Show success message anyway
      if (onSuccess) onSuccess();
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={`${shared.container} ${darkMode ? shared.darkMode : ''} ${styles.container}`}>
        <div className={styles.successIcon}>✅</div>
        <h3 className={`${shared.title} ${darkMode ? shared.darkMode : ''} ${styles.title}`}>
          {t('password.forgotEmailSent')}
        </h3>
        <p className={`${shared.text} ${darkMode ? shared.darkMode : ''} ${styles.text}`}>
          {t('password.forgotMessage')}
        </p>
      </div>
    );
  }

  return (
    <div className={`${shared.container} ${darkMode ? shared.darkMode : ''}`}>
      <h3 className={`${shared.title} ${darkMode ? shared.darkMode : ''}`}>
        🔐 {t('password.forgotTitle')}
      </h3>

      {error && (
        <div className={`${messages.error} ${darkMode ? messages.darkMode : ''}`}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={forms.form}>
        <div className={forms.formGroup}>
          <label className={`${forms.label} ${darkMode ? forms.darkMode : ''}`}>
            {t('auth.email')}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('password.forgotPlaceholder')}
            className={`${forms.input} ${darkMode ? forms.darkMode : ''}`}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`${buttons.button} ${buttons.buttonPrimary} ${buttons.buttonFullWidth} ${darkMode ? buttons.darkMode : ''}`}
        >
          {loading ? t('password.forgotSending') : t('password.forgotButton')}
        </button>
      </form>
    </div>
  );
}

