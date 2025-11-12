import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from './LanguageContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function SetPasswordPage({ darkMode = false }) {
  const { t } = useLanguage();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      // Save token to localStorage for authentication
      localStorage.setItem('token', tokenFromUrl);
    } else {
      setError('Token không hợp lệ. Vui lòng thử lại.');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!newPassword || !confirmPassword) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (newPassword.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);

    try {
      const authToken = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/auth/password/set`,
        { newPassword },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      setSuccess(true);
      // Redirect to chat after 2 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi thiết lập mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  const bgColor = darkMode ? '#1a1a1a' : '#f5f5f5';
  const textColor = darkMode ? '#f0f0f0' : '#333';
  const cardBg = darkMode ? '#2d2d2d' : '#fff';
  const borderColor = darkMode ? '#555' : '#ddd';
  const inputBg = darkMode ? '#1a1a1a' : '#fff';
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
          background: cardBg,
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
          <h2 style={{ color: successColor, marginBottom: '16px' }}>
            Mật khẩu đã được thiết lập thành công!
          </h2>
          <p style={{ color: textColor, marginBottom: '20px' }}>
            Bạn sẽ được chuyển đến trang chủ trong giây lát...
          </p>
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
        background: cardBg,
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        maxWidth: '400px',
        width: '100%',
      }}>
        <h2 style={{ 
          color: textColor, 
          marginBottom: '8px',
          textAlign: 'center',
        }}>
          🔐 Thiết lập mật khẩu
        </h2>
        <p style={{ 
          color: textColor, 
          marginBottom: '24px',
          fontSize: '14px',
          textAlign: 'center',
          opacity: 0.8,
        }}>
          Bạn đã đăng nhập bằng Google. Vui lòng thiết lập mật khẩu để có thể đăng nhập bằng email sau này.
        </p>

        {error && (
          <div style={{
            background: errorColor + '20',
            color: errorColor,
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              color: textColor,
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
            }}>
              Mật khẩu mới
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '6px',
                border: `1px solid ${borderColor}`,
                background: inputBg,
                color: textColor,
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              color: textColor,
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
            }}>
              Xác nhận mật khẩu
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '6px',
                border: `1px solid ${borderColor}`,
                background: inputBg,
                color: textColor,
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#999' : buttonBg,
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Đang xử lý...' : 'Thiết lập mật khẩu'}
          </button>
        </form>
      </div>
    </div>
  );
}

