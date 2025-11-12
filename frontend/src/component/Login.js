// 📁 src/components/Login.jsx
import React, { useState } from 'react';
import axios from 'axios';
import RequestPasswordReset from './RequestPasswordReset';
import { useLanguage } from './LanguageContext';

const API_URL = process.env.REACT_APP_API_URL;

export default function Login({ onLogin }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });
      const data = res.data;
      if (res.status === 200) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        localStorage.setItem('userId', data.id);
        onLogin(data.role);
      } else {
        setError(data.message || 'Đăng nhập thất bại');
      }
    } catch (err) {
      setError('Lỗi mạng hoặc máy chủ');
    }
  }

  if (showResetPassword) {
    return (
      <div>
        <RequestPasswordReset 
          darkMode={false}
          onSuccess={() => setShowResetPassword(false)}
        />
        <p style={{ marginTop: 10, textAlign: 'center' }}>
          <button
            onClick={() => setShowResetPassword(false)}
            style={{
              background: 'none',
              border: 'none',
              color: '#7137ea',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {t('password.backToLoginLink')}
          </button>
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleLogin}
      style={{
        background: '#fff',
        padding: 24,
        borderRadius: 12,
        boxShadow: '0 2px 12px #ccc',
      }}
    >
      <h2 style={{ marginBottom: 16, color: '#333' }}>🔐 Đăng nhập</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <input
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder='Email'
        required
        style={{ width: '100%', marginBottom: 12, padding: 8 }}
      />
      <input
        type='password'
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder='Mật khẩu'
        required
        style={{ width: '100%', marginBottom: 8, padding: 8 }}
      />
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <button
          type='button'
          onClick={() => setShowResetPassword(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#7137ea',
            cursor: 'pointer',
            fontSize: '12px',
            textDecoration: 'underline',
            padding: 0,
          }}
        >
          {t('password.forgot')}
        </button>
      </div>
      <button
        type='submit'
        style={{
          padding: '8px 16px',
          background: '#7137ea',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          width: '100%',
          marginBottom: 12,
        }}
      >
        {t('auth.login')}
      </button>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        margin: '16px 0',
        color: '#666',
      }}>
        <div style={{ flex: 1, height: 1, background: '#ddd' }}></div>
        <span style={{ padding: '0 12px', fontSize: '12px' }}>{t('auth.or')}</span>
        <div style={{ flex: 1, height: 1, background: '#ddd' }}></div>
      </div>
      
      <button
        type='button'
        onClick={() => {
          const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
          window.location.href = `${backendUrl}/auth/google`;
        }}
        style={{
          padding: '8px 16px',
          background: '#fff',
          color: '#333',
          border: '1px solid #ddd',
          borderRadius: 6,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          cursor: 'pointer',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd">
            <path d="M17.64 9.2045c0-.6371-.0573-1.2496-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.344 0-4.3282-1.5831-5.0368-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853"/>
            <path d="M3.9632 10.71c-.18-.54-.2822-1.117-.2822-1.71s.1022-1.17.2823-1.71V4.9582H.9573C.3482 6.1732 0 7.5477 0 9s.3482 2.8268.9573 4.0418L3.9632 10.71z" fill="#FBBC05"/>
            <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.3459l2.5813-2.5814C13.4632.8918 11.4264 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.9632 7.29C4.6718 5.1627 6.6559 3.5795 9 3.5795z" fill="#EA4335"/>
          </g>
        </svg>
        {t('auth.loginWithGoogle')}
      </button>
    </form>
  );
}
