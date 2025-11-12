import React, { useState, useEffect } from 'react';
import axios from 'axios';

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

  const bgColor = darkMode ? '#1a1a1a' : '#f5f5f5';
  const textColor = darkMode ? '#f0f0f0' : '#333';
  const cardBg = darkMode ? '#2d2d2d' : '#fff';
  const borderColor = darkMode ? '#555' : '#ddd';
  const successColor = '#28a745';
  const errorColor = '#dc3545';

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
        {status === 'verifying' && (
          <>
            <div style={{
              fontSize: '48px',
              marginBottom: '20px',
            }}>
              ⏳
            </div>
            <h2 style={{
              color: textColor,
              marginBottom: '16px',
            }}>
              Đang xác thực email...
            </h2>
            <p style={{
              color: darkMode ? '#999' : '#666',
              fontSize: '14px',
            }}>
              {message}
            </p>
          </>
        )}

        {status === 'success' && (
          <>
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
              Xác thực thành công!
            </h2>
            <p style={{
              color: darkMode ? '#ccc' : '#666',
              marginBottom: '24px',
              lineHeight: '1.6',
            }}>
              Email của bạn đã được xác thực thành công. Bạn sẽ được chuyển đến trang chủ trong giây lát...
            </p>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '12px 24px',
                backgroundColor: '#7137ea',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              Về trang chủ
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              fontSize: '64px',
              marginBottom: '20px',
            }}>
              ❌
            </div>
            <h2 style={{
              color: errorColor,
              marginBottom: '16px',
            }}>
              Xác thực thất bại
            </h2>
            <p style={{
              color: darkMode ? '#ccc' : '#666',
              marginBottom: '24px',
              lineHeight: '1.6',
            }}>
              {message}
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
            }}>
              <button
                onClick={() => window.location.href = '/'}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#7137ea',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Về trang chủ
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  color: textColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
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

