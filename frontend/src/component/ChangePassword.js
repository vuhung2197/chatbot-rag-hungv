import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from './LanguageContext';

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

  const bgColor = darkMode ? '#2d2d2d' : '#f9f9f9';
  const textColor = darkMode ? '#f0f0f0' : '#333';
  const borderColor = darkMode ? '#555' : '#ddd';
  const inputBg = darkMode ? '#1a1a1a' : '#fff';
  const inputBorder = darkMode ? '#444' : '#ccc';
  const buttonBg = '#7137ea';
  const successColor = '#28a745';
  const errorColor = '#dc3545';

  return (
    <div style={{
      padding: '20px',
      backgroundColor: bgColor,
      borderRadius: '8px',
      border: `1px solid ${borderColor}`,
      marginTop: '20px',
    }}>
      <h3 style={{
        marginTop: 0,
        marginBottom: '20px',
        fontSize: '18px',
        color: textColor,
      }}>
        🔐 {t('password.change')}
      </h3>

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

      {success && (
        <div style={{
          padding: '12px',
          backgroundColor: darkMode ? '#1f4a1f' : '#efe',
          color: darkMode ? '#6bff6b' : successColor,
          borderRadius: '6px',
          marginBottom: '16px',
          border: `1px solid ${darkMode ? '#2b6b2b' : '#cfc'}`,
        }}>
          {success}
        </div>
      )}

      {checkingPassword ? (
        <div style={{ textAlign: 'center', padding: '20px', color: textColor }}>
          {t('common.loading')}...
        </div>
      ) : !hasPassword ? (
        <>
          {/* Set password form (for OAuth users without password) */}
          <div>
          <div style={{
            padding: '12px',
            backgroundColor: darkMode ? '#2d3a4a' : '#e3f2fd',
            color: darkMode ? '#90caf9' : '#1976d2',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '14px',
          }}>
            ℹ️ {language === 'vi' 
              ? 'Bạn đã đăng nhập bằng Google và chưa có mật khẩu. Vui lòng thiết lập mật khẩu để có thể đăng nhập bằng email sau này.'
              : 'You logged in with Google and don\'t have a password yet. Please set a password so you can log in with email later.'}
          </div>
          <form onSubmit={handleSetPassword}>
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
                required
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
                minLength={8}
              />
              {newPassword && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px',
                  }}>
                    <div style={{
                      flex: 1,
                      height: '4px',
                      backgroundColor: darkMode ? '#444' : '#e0e0e0',
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${(passwordStrength.strength + 1) * 20}%`,
                        height: '100%',
                        backgroundColor: passwordStrength.color,
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                    <span style={{
                      fontSize: '12px',
                      color: passwordStrength.color,
                      fontWeight: '500',
                      minWidth: '60px',
                    }}>
                      {passwordStrength.label}
                    </span>
                  </div>
                </div>
              )}
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
                required
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
              disabled={loading}
              style={{
                padding: '10px 20px',
                backgroundColor: buttonBg,
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: loading ? 0.6 : 1,
                width: '100%',
              }}
            >
              {loading ? t('common.loading') : (language === 'vi' ? 'Thiết lập mật khẩu' : 'Set Password')}
            </button>
          </form>
        </div>
        </>
      ) : (
        <>
          {/* Change password form (for users with existing password) */}
          <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '500',
              fontSize: '14px',
              color: textColor,
            }}>
              {t('password.current')}
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={t('password.currentPlaceholder')}
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
            {newPassword && (
              <div style={{ marginTop: '8px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px',
                }}>
                  <div style={{
                    flex: 1,
                    height: '4px',
                    backgroundColor: darkMode ? '#444' : '#e0e0e0',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${(passwordStrength.strength + 1) * 20}%`,
                      height: '100%',
                      backgroundColor: passwordStrength.color,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                  <span style={{
                    fontSize: '12px',
                    color: passwordStrength.color,
                    fontWeight: '500',
                    minWidth: '60px',
                  }}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div style={{
                  fontSize: '12px',
                  color: darkMode ? '#999' : '#666',
                }}>
                  {newPassword.length < 8 && `⚠️ ${t('password.minLength')}`}
                  {newPassword.length >= 8 && !/[a-z]/.test(newPassword) && !/[A-Z]/.test(newPassword) && `💡 ${t('password.addCase')}`}
                  {newPassword.length >= 8 && !/\d/.test(newPassword) && `💡 ${t('password.addNumber')}`}
                  {newPassword.length >= 8 && !/[^a-zA-Z\d]/.test(newPassword) && `💡 ${t('password.addSpecial')}`}
                </div>
              </div>
            )}
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
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: buttonBg,
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: loading ? 0.6 : 1,
              width: '100%',
            }}
          >
            {loading ? t('common.loading') : t('password.change')}
          </button>
        </form>
        </>
      )}
    </div>
  );
}

