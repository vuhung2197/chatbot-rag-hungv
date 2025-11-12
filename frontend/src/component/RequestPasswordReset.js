import React, { useState } from 'react';
import axios from 'axios';
import { useLanguage } from './LanguageContext';

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

  const bgColor = darkMode ? '#2d2d2d' : '#f9f9f9';
  const textColor = darkMode ? '#f0f0f0' : '#333';
  const borderColor = darkMode ? '#555' : '#ddd';
  const inputBg = darkMode ? '#1a1a1a' : '#fff';
  const inputBorder = darkMode ? '#444' : '#ccc';
  const buttonBg = '#7137ea';

  if (success) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: bgColor,
        borderRadius: '8px',
        border: `1px solid ${borderColor}`,
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '16px',
        }}>
          ✅
        </div>
        <h3 style={{
          margin: 0,
          marginBottom: '12px',
          color: textColor,
        }}>
          {t('password.forgotEmailSent')}
        </h3>
        <p style={{
          margin: 0,
          color: darkMode ? '#ccc' : '#666',
          fontSize: '14px',
        }}>
          {t('password.forgotMessage')}
        </p>
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      backgroundColor: bgColor,
      borderRadius: '8px',
      border: `1px solid ${borderColor}`,
    }}>
      <h3 style={{
        marginTop: 0,
        marginBottom: '16px',
        fontSize: '18px',
        color: textColor,
      }}>
        🔐 {t('password.forgotTitle')}
      </h3>

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: darkMode ? '#4a1f1f' : '#fee',
          color: darkMode ? '#ff6b6b' : '#dc3545',
          borderRadius: '6px',
          marginBottom: '16px',
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            fontSize: '14px',
            color: textColor,
          }}>
            {t('auth.email')}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('password.forgotPlaceholder')}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${inputBorder}`,
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: inputBg,
              color: textColor,
              boxSizing: 'border-box',
            }}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: buttonBg,
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? t('password.forgotSending') : t('password.forgotButton')}
        </button>
      </form>
    </div>
  );
}

