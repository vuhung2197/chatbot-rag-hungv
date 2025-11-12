import React, { useState } from 'react';
import axios from 'axios';

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

  const bgColor = darkMode ? '#2d2d2d' : '#f9f9f9';
  const textColor = darkMode ? '#f0f0f0' : '#333';
  const borderColor = darkMode ? '#555' : '#ddd';
  const inputBg = darkMode ? '#1a1a1a' : '#fff';
  const inputBorder = darkMode ? '#444' : '#ccc';
  const buttonBg = darkMode ? '#7137ea' : '#7137ea';
  const successColor = '#28a745';
  const errorColor = '#dc3545';

  return (
    <div style={{
      padding: '16px',
      backgroundColor: bgColor,
      borderRadius: '8px',
      border: `1px solid ${borderColor}`,
      marginTop: '16px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>
            {emailVerified ? '✅' : '⚠️'}
          </span>
          <div>
            <div style={{
              fontWeight: '500',
              fontSize: '14px',
              color: textColor,
            }}>
              Email Verification
            </div>
            <div style={{
              fontSize: '12px',
              color: darkMode ? '#999' : '#666',
            }}>
              {email}
            </div>
          </div>
        </div>
        <div style={{
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '500',
          backgroundColor: emailVerified ? successColor : '#ffc107',
          color: '#fff',
        }}>
          {emailVerified ? 'Đã xác thực' : 'Chưa xác thực'}
        </div>
      </div>

      {!emailVerified && (
        <div>
          {!showTokenInput ? (
            <div>
              <p style={{
                fontSize: '13px',
                color: darkMode ? '#ccc' : '#666',
                marginBottom: '12px',
              }}>
                Email của bạn chưa được xác thực. Vui lòng xác thực để đảm bảo tính bảo mật của tài khoản.
              </p>
              <button
                onClick={handleSendVerification}
                disabled={sending}
                style={{
                  padding: '8px 16px',
                  backgroundColor: buttonBg,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: sending ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: sending ? 0.6 : 1,
                }}
              >
                {sending ? 'Đang gửi...' : '📧 Gửi email xác thực'}
              </button>
            </div>
          ) : (
            <div>
              <p style={{
                fontSize: '13px',
                color: darkMode ? '#ccc' : '#666',
                marginBottom: '12px',
              }}>
                Vui lòng kiểm tra email và copy <strong>mã xác thực</strong> vào ô bên dưới:
              </p>
              <div style={{
                backgroundColor: darkMode ? '#1a1a1a' : '#f5f5f5',
                border: `2px dashed ${darkMode ? '#555' : '#7137ea'}`,
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '12px',
                textAlign: 'center',
              }}>
                <div style={{
                  fontSize: '11px',
                  color: darkMode ? '#999' : '#666',
                  marginBottom: '4px',
                }}>
                  💡 Mẹo: Mã xác thực nằm trong email, có thể có dấu gạch ngang (-)
                </div>
                <div style={{
                  fontSize: '12px',
                  color: darkMode ? '#999' : '#666',
                }}>
                  Bạn có thể paste mã có hoặc không có dấu gạch ngang
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => {
                    // Auto-remove dashes and spaces for easier paste
                    const cleaned = e.target.value.replace(/[-\s]/g, '');
                    setToken(cleaned);
                  }}
                  placeholder="Dán mã xác thực từ email (có thể có dấu -)"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: `1px solid ${inputBorder}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: inputBg,
                    color: textColor,
                    boxSizing: 'border-box',
                    fontFamily: 'monospace',
                    letterSpacing: '1px',
                  }}
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
                  style={{
                    padding: '10px 20px',
                    backgroundColor: buttonBg,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: (verifying || !token.trim()) ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: (verifying || !token.trim()) ? 0.6 : 1,
                  }}
                >
                  {verifying ? 'Đang xác thực...' : '✅ Xác thực'}
                </button>
              </div>
              <div style={{
                fontSize: '12px',
                color: darkMode ? '#999' : '#666',
                marginBottom: '8px',
              }}>
                Hoặc nhấp vào link trong email để xác thực tự động
              </div>
              <button
                onClick={() => {
                  setShowTokenInput(false);
                  setToken('');
                  setError('');
                  setSuccess('');
                }}
                style={{
                  padding: '4px 12px',
                  backgroundColor: 'transparent',
                  color: textColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Hủy
              </button>
            </div>
          )}
        </div>
      )}

      {emailVerified && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: darkMode ? '#1a3a1a' : '#d4edda',
          borderRadius: '6px',
          fontSize: '13px',
          color: successColor,
        }}>
          ✅ Email của bạn đã được xác thực thành công!
        </div>
      )}

      {error && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: darkMode ? '#3a1a1a' : '#f8d7da',
          borderRadius: '6px',
          fontSize: '13px',
          color: errorColor,
          marginTop: '8px',
        }}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: darkMode ? '#1a3a1a' : '#d4edda',
          borderRadius: '6px',
          fontSize: '13px',
          color: successColor,
          marginTop: '8px',
        }}>
          ✅ {success}
        </div>
      )}
    </div>
  );
}

