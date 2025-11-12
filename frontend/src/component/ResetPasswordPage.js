import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from './LanguageContext';

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

  const bgColor = darkMode ? '#1a1a1a' : '#f5f5f5';
  const textColor = darkMode ? '#f0f0f0' : '#333';
  const cardBg = darkMode ? '#2d2d2d' : '#fff';
  const borderColor = darkMode ? '#555' : '#ddd';
  const inputBg = darkMode ? '#1a1a1a' : '#fff';
  const inputBorder = darkMode ? '#444' : '#ccc';
  const buttonBg = '#7137ea';
  const successColor = '#28a745';
  const errorColor = '#dc3545';

  if (success) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bgColor,
        padding: '20px',
      }}>
        <div style={{
          backgroundColor: cardBg,
          borderRadius: '12px',
          padding: '40px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: darkMode ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '20px',
          }}>
            ✅
          </div>
          <h2 style={{
            color: successColor,
            marginBottom: '16px',
          }}>
            {t('password.resetSuccess')}
          </h2>
          <p style={{
            color: darkMode ? '#ccc' : '#666',
            marginBottom: '24px',
            lineHeight: '1.6',
          }}>
            {t('password.resetSuccessMessage')}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              padding: '12px 24px',
              backgroundColor: buttonBg,
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {t('password.backToLogin')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: bgColor,
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: cardBg,
        borderRadius: '12px',
        padding: '40px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: darkMode ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)',
      }}>
        <h2 style={{
          marginTop: 0,
          marginBottom: '24px',
          fontSize: '24px',
          color: textColor,
          textAlign: 'center',
        }}>
          🔐 {t('password.reset')}
        </h2>

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: darkMode ? '#4a1f1f' : '#fee',
            color: darkMode ? '#ff6b6b' : errorColor,
            borderRadius: '6px',
            marginBottom: '16px',
            border: `1px solid ${darkMode ? '#6b2b2b' : '#fcc'}`,
          }}>
            {error}
          </div>
        )}

        {!token && (
          <div style={{
            padding: '12px',
            backgroundColor: darkMode ? '#3a3a1a' : '#fff3cd',
            color: darkMode ? '#ffd700' : '#856404',
            borderRadius: '6px',
            marginBottom: '16px',
            border: `1px solid ${darkMode ? '#5a5a2a' : '#ffc107'}`,
          }}>
            ⚠️ {t('password.noToken')}
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
              {t('password.new')}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('password.newPlaceholder')}
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
              minLength={8}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '500',
              fontSize: '14px',
              color: textColor,
            }}>
              {t('password.confirm')}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('password.confirmPlaceholder')}
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
            {confirmPassword && newPassword !== confirmPassword && (
              <div style={{
                marginTop: '4px',
                fontSize: '12px',
                color: errorColor,
              }}>
                ⚠️ {t('password.mismatch')}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: buttonBg,
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: (loading || !token) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: (loading || !token) ? 0.6 : 1,
            }}
          >
            {loading ? t('common.loading') : t('password.reset')}
          </button>
        </form>

        <div style={{
          marginTop: '20px',
          textAlign: 'center',
        }}>
          <a
            href="/"
            style={{
              color: '#7137ea',
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            {t('password.backToLoginLink')}
          </a>
        </div>
      </div>
    </div>
  );
}

