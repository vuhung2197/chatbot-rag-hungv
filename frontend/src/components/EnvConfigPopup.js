import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function EnvConfigPopup({ darkMode, onClose, onSuccess, mode = 'protected' }) {
  const isPublic = mode === 'public';
  const initialParams = isPublic ? {
    GOOGLE_CLIENT_ID: '',
    GOOGLE_CLIENT_SECRET: ''
  } : {
    OPENAI_API_KEY: '',
    TAVILY_API_KEY: '',
    VNPAY_TMN_CODE: '',
    VNPAY_HASH_SECRET: '',
    VNPAY_URL: '',
    VNPAY_RETURN_URL: '',
    MOMO_PARTNER_CODE: '',
    MOMO_ACCESS_KEY: '',
    MOMO_SECRET_KEY: '',
    MOMO_ENDPOINT: '',
    MOMO_REDIRECT_URL: '',
    MOMO_IPN_URL: '',
    GOOGLE_CLIENT_ID: '',
    GOOGLE_CLIENT_SECRET: '',
    DB_HOST: '',
    DB_PORT: '',
    DB_USER: '',
    DB_PASSWORD: '',
    DB_DATABASE: '',
    JWT_SECRET: '',
    HMAC_KEY: '',
    FRONTEND_URL: '',
    PORT: '',
    EMAIL_SERVICE: '',
    EMAIL_USER: '',
    EMAIL_PASSWORD: '',
    EMAIL_FROM_NAME: ''
  };

  const [activeTab, setActiveTab] = useState(isPublic ? 'google' : 'ai');

  const [configParams, setConfigParams] = useState(initialParams);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL || window.location.origin.replace(':3000', ':3001');
      const endpoint = isPublic ? '/settings/public-env' : '/settings/env';
      const headers = isPublic ? {} : { Authorization: `Bearer ${token}` };
      
      console.log('[EnvConfig] Fetching from:', `${API_URL}${endpoint}`);
      const res = await axios.get(`${API_URL}${endpoint}`, { headers });
      console.log('[EnvConfig] Response:', res.data);
      
      // If public mode, only keep public keys from response
      if (isPublic) {
        setConfigParams({
          GOOGLE_CLIENT_ID: res.data.GOOGLE_CLIENT_ID || '',
          GOOGLE_CLIENT_SECRET: res.data.GOOGLE_CLIENT_SECRET || ''
        });
      } else {
        setConfigParams(res.data);
      }
    } catch (err) {
      console.error('[EnvConfig] Fetch error:', err?.response?.status, err?.response?.data, err.message);
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err.message;
      setError(`Cannot load config data (${status || 'Network Error'}: ${msg})`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, val) => {
    setConfigParams(prev => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL || window.location.origin.replace(':3000', ':3001');
      const endpoint = isPublic ? '/settings/public-env' : '/settings/env';
      const headers = isPublic ? {} : { Authorization: `Bearer ${token}` };

      await axios.post(`${API_URL}${endpoint}`, configParams, { headers });
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to update config variables. Check server logs.');
    } finally {
      setSaving(false);
    }
  };

  const isRequired = (key) => {
    if (isPublic) return true;
    return key === 'OPENAI_API_KEY' || key === 'GOOGLE_CLIENT_ID' || key === 'GOOGLE_CLIENT_SECRET';
  };

  const hasMissing = Object.keys(configParams).some(key => {
    if (!isRequired(key)) return false;
    return !configParams[key] || configParams[key].trim() === '';
  });

  const tabs = [
    { id: 'ai', label: '💬 AI & Search', keys: ['OPENAI_API_KEY', 'TAVILY_API_KEY'] },
    { id: 'google', label: '🔐 Google OAuth', keys: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'] },
    { id: 'db', label: '🗄️ Database', keys: ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_DATABASE'] },
    { id: 'email', label: '✉️ Email', keys: ['EMAIL_SERVICE', 'EMAIL_USER', 'EMAIL_PASSWORD', 'EMAIL_FROM_NAME'] },
    { id: 'payment', label: '💳 Payment', keys: ['VNPAY_TMN_CODE', 'VNPAY_HASH_SECRET', 'VNPAY_URL', 'VNPAY_RETURN_URL', 'MOMO_PARTNER_CODE', 'MOMO_ACCESS_KEY', 'MOMO_SECRET_KEY', 'MOMO_ENDPOINT', 'MOMO_REDIRECT_URL', 'MOMO_IPN_URL'] },
    { id: 'core', label: '🛠️ Core', keys: ['JWT_SECRET', 'HMAC_KEY', 'FRONTEND_URL', 'PORT'] }
  ];

  const CONFIG_DESCRIPTIONS = {
    // AI & Search
    OPENAI_API_KEY: 'API key từ OpenAI để sử dụng ChatGPT cho chatbot',
    TAVILY_API_KEY: 'API key từ Tavily để tìm kiếm thông tin trên web',
    // Google OAuth
    GOOGLE_CLIENT_ID: 'Client ID từ Google Cloud Console cho đăng nhập Google',
    GOOGLE_CLIENT_SECRET: 'Client Secret từ Google Cloud Console',
    // Database
    DB_HOST: 'Địa chỉ host của database (vd: localhost, db, IP...)',
    DB_PORT: 'Cổng kết nối database (MySQL: 3306, PostgreSQL: 5432)',
    DB_USER: 'Tên người dùng để kết nối database',
    DB_PASSWORD: 'Mật khẩu kết nối database',
    DB_DATABASE: 'Tên database sử dụng cho ứng dụng',
    // Email
    EMAIL_SERVICE: 'Dịch vụ email (vd: gmail, outlook, smtp...)',
    EMAIL_USER: 'Địa chỉ email dùng để gửi mail hệ thống',
    EMAIL_PASSWORD: 'App Password của email (không phải mật khẩu tài khoản)',
    EMAIL_FROM_NAME: 'Tên hiển thị khi gửi email (vd: English Chatbot)',
    // VNPay
    VNPAY_TMN_CODE: 'Mã website đăng ký trên VNPay',
    VNPAY_HASH_SECRET: 'Chuỗi bí mật để mã hóa dữ liệu thanh toán VNPay',
    VNPAY_URL: 'URL cổng thanh toán VNPay (sandbox hoặc production)',
    VNPAY_RETURN_URL: 'URL callback sau khi thanh toán VNPay hoàn tất',
    // MoMo
    MOMO_PARTNER_CODE: 'Mã đối tác MoMo',
    MOMO_ACCESS_KEY: 'Access Key từ MoMo Business',
    MOMO_SECRET_KEY: 'Secret Key từ MoMo Business',
    MOMO_ENDPOINT: 'URL API endpoint của MoMo (test hoặc production)',
    MOMO_REDIRECT_URL: 'URL chuyển hướng sau khi thanh toán MoMo',
    MOMO_IPN_URL: 'URL nhận thông báo thanh toán tự động từ MoMo (IPN)',
    // Core
    JWT_SECRET: 'Chuỗi bí mật để mã hóa token đăng nhập (JWT)',
    HMAC_KEY: 'Khóa HMAC dùng cho xác thực và mã hóa nội bộ',
    FRONTEND_URL: 'URL frontend (vd: http://localhost:3000)',
    PORT: 'Cổng chạy Backend server (mặc định: 3001)'
  };

  const visibleTabs = isPublic ? tabs.filter(t => t.id === 'google') : tabs;
  const currentTabKeys = visibleTabs.find(t => t.id === activeTab)?.keys || [];

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: darkMode ? '#1e1e1e' : '#fff',
        color: darkMode ? '#eee' : '#333',
        padding: '24px',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        <h2 style={{ marginTop: 0, marginBottom: 12, color: darkMode ? '#a78bfa' : '#7137ea' }}>
          ⚙️ System Configuration
        </h2>
        <p style={{ fontSize: '0.9rem', marginBottom: 20, color: darkMode ? '#aaa' : '#666' }}>
          Please ensure these important environment variables are configured correctly for the system to run smoothly.
        </p>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Tabs Header */}
            <div style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              marginBottom: '20px',
              paddingBottom: '8px',
              borderBottom: `1px solid ${darkMode ? '#444' : '#eee'}`
            }}>
              {visibleTabs.map(tab => {
                const isActive = activeTab === tab.id;
                // Check if this tab has missing required fields
                const hasError = tab.keys.some(k => isRequired(k) && (!configParams[k] || configParams[k].trim() === ''));
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: 'none',
                      whiteSpace: 'nowrap',
                      background: isActive ? '#7137ea' : (darkMode ? '#2d2d2d' : '#f0f0f0'),
                      color: isActive ? '#fff' : (darkMode ? '#ccc' : '#444'),
                      cursor: 'pointer',
                      fontWeight: isActive ? 'bold' : 'normal',
                      boxShadow: isActive ? '0 2px 8px rgba(113, 55, 234, 0.4)' : 'none',
                      position: 'relative'
                    }}
                  >
                    {tab.label}
                    {hasError && (
                      <span style={{
                        position: 'absolute',
                        top: '-2px', right: '-2px',
                        width: '10px', height: '10px',
                        borderRadius: '50%',
                        background: '#ef4444'
                      }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div style={{ minHeight: '300px' }}>
              {currentTabKeys.map(key => (
                <div key={key} style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontWeight: 'bold',
                    marginBottom: '2px',
                    fontSize: '0.9rem'
                  }}>
                    {key} {isRequired(key) && <span style={{ color: 'red' }}>*</span>}
                  </label>
                  {CONFIG_DESCRIPTIONS[key] && (
                    <p style={{
                      margin: '0 0 6px 0',
                      fontSize: '0.78rem',
                      color: darkMode ? '#888' : '#999',
                      fontStyle: 'italic'
                    }}>
                      {CONFIG_DESCRIPTIONS[key]}
                    </p>
                  )}
                  <input
                    type={key.includes('PASSWORD') || key.includes('SECRET') ? "password" : "text"}
                    value={configParams[key]}
                    onChange={e => handleChange(key, e.target.value)}
                    placeholder={isRequired(key) ? `Enter ${key}...` : `Optional: ${key}`}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: `1px solid ${darkMode ? '#444' : '#ccc'}`,
                      backgroundColor: darkMode ? '#2d2d2d' : '#f9f9f9',
                      color: darkMode ? '#fff' : '#000',
                      boxSizing: 'border-box'
                    }}
                    required={isRequired(key)}
                  />
                </div>
              ))}
            </div>

            {error && <p style={{ color: '#ef4444', fontSize: '0.9rem' }}>{error}</p>}
            {hasMissing && <p style={{ color: '#eab308', fontSize: '0.9rem' }}>Please fill all required keys to continue.</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              {!hasMissing && (
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '6px',
                    border: `1px solid ${darkMode ? '#555' : '#ddd'}`,
                    background: 'transparent',
                    color: darkMode ? '#ccc' : '#666',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={saving || hasMissing}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: (saving || hasMissing) ? '#9ca3af' : '#7137ea',
                  color: '#fff',
                  cursor: (saving || hasMissing) ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
