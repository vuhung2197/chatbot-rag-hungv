// 📁 src/App.jsx
import React, { useState, useEffect } from 'react';
import Chat from './component/Chat';
import KnowledgeAdmin from './component/KnowledgeAdmin';
import Login from './component/Login';
import Register from './component/Register';
import UsageCounter from './component/UsageCounter';
import ProfileSettings from './component/ProfileSettings';
import VerifyEmailPage from './component/VerifyEmailPage';
import ResetPasswordPage from './component/ResetPasswordPage';
import SetPasswordPage from './component/SetPasswordPage';
import { useDarkMode } from './component/DarkModeContext';
import { useLanguage } from './component/LanguageContext';

export default function App() {
  const [view, setView] = useState('chat');
  const [toast, setToast] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const { darkMode, toggleDarkMode } = useDarkMode();
  const { t } = useLanguage();

  const [role, setRole] = useState(localStorage.getItem('role'));
  const [page, setPage] = useState('login');
  
  // Check if this is a verification link
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  }
  
  // Handle Google OAuth callback token and other token-based flows
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const roleFromUrl = urlParams.get('role');
    const idFromUrl = urlParams.get('id');
    const error = urlParams.get('error');
    const pathname = window.location.pathname;
    
    // Handle OAuth errors
    if (error) {
      showToast(`OAuth error: ${error}`);
      // Clean URL
      window.history.replaceState({}, document.title, '/');
      return;
    }
    
    // Priority 1: Check if this is set password page (new OAuth user)
    if (pathname === '/set-password' && token && roleFromUrl && idFromUrl) {
      const newUser = urlParams.get('newUser') === 'true';
      if (newUser) {
        localStorage.setItem('token', token);
        localStorage.setItem('role', roleFromUrl);
        localStorage.setItem('userId', idFromUrl);
        setIsSettingPassword(true);
        return;
      }
    }
    
    // Priority 2: Handle Google OAuth success (token from callback)
    // Google OAuth will have token, role, and id in URL
    if (token && roleFromUrl && idFromUrl && pathname !== '/set-password') {
      console.log('🔐 Google OAuth callback - Setting token and role:', { token: token.substring(0, 20) + '...', roleFromUrl, idFromUrl });
      localStorage.setItem('token', token);
      localStorage.setItem('role', roleFromUrl);
      localStorage.setItem('userId', idFromUrl);
      setRole(roleFromUrl);
      showToast('Đăng nhập thành công!');
      // Clean URL immediately
      window.history.replaceState({}, document.title, '/');
      // Force a small delay to ensure state updates
      setTimeout(() => {
        // This ensures the component re-renders with the new role
        window.location.reload();
      }, 100);
      return;
    }
    
    // Priority 3: Check if this is a reset password link
    // Reset password will have token but no role/id, and pathname might be /reset-password
    if (token && !roleFromUrl && (pathname === '/reset-password' || pathname === '/')) {
      setIsResettingPassword(true);
      return;
    }
    
    // Priority 4: Check if URL contains verification token (for email verification)
    // Email verification will have token but no role/id
    if (token && !roleFromUrl && !isResettingPassword && !isSettingPassword) {
      setIsVerifyingEmail(true);
      return;
    }
  }, []);

  useEffect(() => {
    if (role) setView(role === 'admin' ? 'knowledgeadmin' : 'chat');
  }, [role]);

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    setRole(null);
    setPage('login');
  }

  // Show set password page if new OAuth user
  if (isSettingPassword) {
    return <SetPasswordPage darkMode={darkMode} />;
  }

  // Show reset password page if token in URL
  if (isResettingPassword) {
    return <ResetPasswordPage darkMode={darkMode} />;
  }

  // Show verification page if token in URL
  if (isVerifyingEmail) {
    return <VerifyEmailPage darkMode={darkMode} />;
  }

  if (!role) {
    return (
      <div style={{ maxWidth: 360, margin: '40px auto' }}>
        {page === 'login' ? (
          <>
            <Login onLogin={r => setRole(r)} />
            <p style={{ marginTop: 10, textAlign: 'center' }}>
              {t('auth.noAccount')}{' '}
              <button
                onClick={() => setPage('register')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#7137ea',
                  cursor: 'pointer',
                }}
              >
                {t('auth.register')}
              </button>
            </p>
          </>
        ) : (
          <>
            <Register onRegister={() => setPage('login')} />
            <p style={{ marginTop: 10, textAlign: 'center' }}>
              {t('auth.hasAccount')}{' '}
              <button
                onClick={() => setPage('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#7137ea',
                  cursor: 'pointer',
                }}
              >
                {t('auth.login')}
              </button>
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={toggleDarkMode}
        style={{
          position: 'absolute',
          right: -15,
          top: 10,
          background: darkMode ? '#333' : '#fff',
          color: darkMode ? '#fff' : '#7137ea',
          border: '1px solid #7137ea',
          borderRadius: 20,
          padding: '6px 18px',
          cursor: 'pointer',
          zIndex: 1000,
        }}
      >
        {darkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
      </button>
      <div style={{
        position: 'absolute',
        left: 0,
        top: 10,
        display: 'flex',
        gap: '8px',
        zIndex: 1000,
      }}>
        <button
          onClick={() => setShowProfile(true)}
          style={{
            background: darkMode ? '#2d2d2d' : '#f0f0f0',
            border: `1px solid ${darkMode ? '#555' : '#ccc'}`,
            padding: '6px 18px',
            borderRadius: 20,
            cursor: 'pointer',
            color: darkMode ? '#fff' : '#333',
            fontSize: '14px',
          }}
        >
          👤 Profile
        </button>
        <button
          onClick={handleLogout}
          style={{
            background: '#eee',
            border: '1px solid #666',
            padding: '6px 18px',
            borderRadius: 20,
            cursor: 'pointer',
          }}
        >
          {t('auth.logout')}
        </button>
      </div>
      <h3
        style={{
          color: '#7137ea',
          fontSize: '2em',
          fontWeight: 'bold',
          marginBottom: '1em',
          textAlign: 'center',
        }}
      >
        📚 Knowledge Chatbot
      </h3>

      <nav
        style={{
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <button
          onClick={() => setView('chat')}
          style={{
            background: view === 'chat' ? '#7137ea' : '#f6f9fc',
            color: view === 'chat' ? '#fff' : '#333',
            border: '1px solid #7137ea',
            borderRadius: 8,
            padding: '8px 16px',
          }}
        >
          {t('chat.title')}
        </button>
        <button
          onClick={() => setView('knowledgeadmin')}
          style={{
            background: view === 'knowledgeadmin' ? '#7137ea' : '#f6f9fc',
            color: view === 'knowledgeadmin' ? '#fff' : '#333',
            border: '1px solid #7137ea',
            borderRadius: 8,
            padding: '8px 16px',
          }}
        >
          Knowledge Admin
        </button>
      </nav>

      {toast && (
        <div
          style={{
            background: '#4BB543',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: 8,
            position: 'fixed',
            top: 36,
            left: '50%',
            transform: 'translateX(-50%)',
            fontWeight: 500,
            zIndex: 2000,
            boxShadow: '0 2px 8px #6667',
          }}
        >
          {toast}
        </div>
      )}
      <UsageCounter darkMode={darkMode} />
      {showProfile ? (
        <div style={{
          padding: '20px',
          backgroundColor: darkMode ? '#1a1a1a' : '#f5f5f5',
          minHeight: 'calc(100vh - 200px)',
        }}>
          <ProfileSettings
            darkMode={darkMode}
            onClose={() => setShowProfile(false)}
          />
        </div>
      ) : (
        <>
          {view === 'chat' && <Chat darkMode={darkMode} />}
          {view === 'knowledgeadmin' && <KnowledgeAdmin darkMode={darkMode} />}
        </>
      )}
    </>
  );
}
