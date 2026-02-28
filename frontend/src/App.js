// 📁 src/App.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Chat from './features/chat/Chat';
import KnowledgeAdmin from './features/knowledge/KnowledgeAdmin';
import WritingTab from './features/writing/WritingTab';
import ListeningTab from './features/listening/ListeningTab';
import ReadingTab from './features/reading/ReadingTab';
import SpeakingTab from './features/speaking/SpeakingTab';
import LearningTab from './features/learning/LearningTab';
import VocabularyHub from './features/vocabulary/VocabularyHub';
import AnalyticsDashboard from './features/analytics/AnalyticsDashboard';
import Login from './features/auth/Login';
import Register from './features/auth/Register';
import UsageCounter from './features/user/UsageCounter';
import ProfileSettings from './features/user/ProfileSettings';
import VerifyEmailPage from './features/auth/VerifyEmailPage';
import ResetPasswordPage from './features/auth/ResetPasswordPage';
import SetPasswordPage from './features/auth/SetPasswordPage';
import { useDarkMode } from './context/DarkModeContext';
import { useLanguage } from './context/LanguageContext';

import { setupAxiosInterceptor } from './utils/axiosConfig';

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

    // Handle OAuth link success
    const oauthLinked = urlParams.get('oauth_linked');
    const oauthSuccess = urlParams.get('success');
    if (oauthLinked && oauthSuccess === 'true' && pathname === '/profile') {
      showToast(`✅ ${oauthLinked} đã được liên kết thành công!`);
      // Clean URL
      window.history.replaceState({}, document.title, '/profile');
      return;
    }

    // Handle OAuth errors
    if (error) {
      let errorMessage = `OAuth error: ${error}`;
      if (error === 'already_linked_to_another_account') {
        errorMessage = 'Tài khoản này đã được liên kết với một tài khoản khác';
      } else if (error === 'user_not_found') {
        errorMessage = 'Không tìm thấy người dùng';
      }
      showToast(errorMessage);
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
    // Check this BEFORE checking for oauth_linked to handle login flow
    if (token && roleFromUrl && idFromUrl && pathname !== '/set-password' && !oauthLinked) {
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

  // Setup axios interceptor to handle 401 errors (session expired/revoked)
  useEffect(() => {
    const handleAutoLogout = () => {
      // Close profile settings if open
      setShowProfile(false);
      setRole(null);
      setPage('login');
      showToast('Phiên đăng nhập đã hết hạn hoặc bị hủy. Vui lòng đăng nhập lại.');
    };

    setupAxiosInterceptor(handleAutoLogout);
  }, []);

  async function handleLogout() {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Call logout API to delete session in database
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        await axios.post(
          `${API_URL}/auth/logout`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }
    } catch (err) {
      // Even if API call fails, still clear local storage
      console.error('Logout API error:', err);
    } finally {
      // Always clear local storage and reset state
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userId');
      setRole(null);
      setPage('login');
    }
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
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px 0',
        gap: '15px'
      }}>
        <h3
          style={{
            color: '#7137ea',
            fontSize: '2em',
            fontWeight: 'bold',
            margin: 0,
            textAlign: 'center',
          }}
        >
          📚 Knowledge Chatbot
        </h3>

        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <button
            onClick={toggleDarkMode}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            style={{
              background: darkMode ? '#333' : '#fff',
              color: darkMode ? '#fff' : '#7137ea',
              border: '1px solid #7137ea',
              borderRadius: '20px',
              padding: '8px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 500,
              fontSize: '0.9rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}
          >
            {darkMode ? '🌙' : '☀️'} <span style={{ display: 'none', '@media (min-width: 768px)': { display: 'inline' } }}>{darkMode ? 'Dark' : 'Light'}</span>
          </button>

          <button
            onClick={() => setShowProfile(true)}
            style={{
              background: darkMode ? '#2d2d2d' : '#f0f0f0',
              border: `1px solid ${darkMode ? '#555' : '#e5e7eb'}`,
              padding: '8px 16px',
              borderRadius: '20px',
              cursor: 'pointer',
              color: darkMode ? '#fff' : '#333',
              fontSize: '0.9rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}
          >
            <i className="fas fa-user-circle"></i> Profile
          </button>

          <button
            onClick={handleLogout}
            title={t('auth.logout')}
            style={{
              background: darkMode ? '#3f1a1a' : '#ffebee',
              border: `1px solid ${darkMode ? '#7f1d1d' : '#fecaca'}`,
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#ef4444',
              fontSize: '1.1rem',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.background = darkMode ? '#450a0a' : '#fee2e2';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = darkMode ? '#3f1a1a' : '#ffebee';
            }}
          >
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>

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
            cursor: 'pointer'
          }}
        >
          Knowledge Search
        </button>
        <button
          onClick={() => setView('writing')}
          style={{
            background: view === 'writing' ? '#7137ea' : '#f6f9fc',
            color: view === 'writing' ? '#fff' : '#333',
            border: '1px solid #7137ea',
            borderRadius: 8,
            padding: '8px 16px',
            cursor: 'pointer'
          }}
        >
          ✍️ Writing Practice
        </button>
        <button
          onClick={() => setView('listening')}
          style={{
            background: view === 'listening' ? '#7137ea' : '#f6f9fc',
            color: view === 'listening' ? '#fff' : '#333',
            border: '1px solid #7137ea',
            borderRadius: 8,
            padding: '8px 16px',
            cursor: 'pointer'
          }}
        >
          🎧 Listening Practice
        </button>
        <button
          onClick={() => setView('reading')}
          style={{
            background: view === 'reading' ? '#7137ea' : '#f6f9fc',
            color: view === 'reading' ? '#fff' : '#333',
            border: '1px solid #7137ea',
            borderRadius: 8,
            padding: '8px 16px',
            cursor: 'pointer'
          }}
        >
          📖 Reading Practice
        </button>
        <button
          onClick={() => setView('speaking')}
          style={{
            background: view === 'speaking' ? '#ec4899' : '#f6f9fc',
            color: view === 'speaking' ? '#fff' : '#333',
            border: '1px solid #ec4899',
            borderRadius: 8,
            padding: '8px 16px',
            cursor: 'pointer'
          }}
        >
          🎙️ Speaking Practice
        </button>
        <button
          onClick={() => setView('learning')}
          style={{
            background: view === 'learning' ? '#ec4899' : '#f6f9fc',
            color: view === 'learning' ? '#fff' : '#333',
            border: '1px solid #ec4899',
            borderRadius: 8,
            padding: '8px 16px',
            cursor: 'pointer'
          }}
        >
          🎓 Learning Hub
        </button>
        <button
          onClick={() => setView('analytics')}
          style={{
            background: view === 'analytics' ? '#eab308' : '#f6f9fc',
            color: view === 'analytics' ? '#fff' : '#333',
            border: '1px solid #eab308',
            borderRadius: 8,
            padding: '8px 16px',
            cursor: 'pointer'
          }}
        >
          📊 Analytics
        </button>
        <button
          onClick={() => setView('vocabulary')}
          style={{
            background: view === 'vocabulary' ? '#10b981' : '#f6f9fc',
            color: view === 'vocabulary' ? '#fff' : '#333',
            border: '1px solid #10b981',
            borderRadius: 8,
            padding: '8px 16px',
            cursor: 'pointer'
          }}
        >
          📓 Sổ Từ Vựng
        </button>
        {role === 'admin' && (
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
        )}

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
          {view === 'knowledgeadmin' && role === 'admin' && <KnowledgeAdmin darkMode={darkMode} />}
          {view === 'writing' && <WritingTab darkMode={darkMode} />}
          {view === 'listening' && <ListeningTab darkMode={darkMode} />}
          {view === 'reading' && <ReadingTab darkMode={darkMode} />}
          {view === 'speaking' && <SpeakingTab darkMode={darkMode} />}
          {view === 'learning' && <LearningTab darkMode={darkMode} />}
          {view === 'analytics' && <AnalyticsDashboard darkMode={darkMode} />}
          {view === 'vocabulary' && <VocabularyHub darkMode={darkMode} />}
        </>
      )}
    </>
  );
}
