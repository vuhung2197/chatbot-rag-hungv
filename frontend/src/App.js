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

// ─── Custom Hook: Handle OAuth and Auth Params ───
function useAuthParams({ showToast, setRole, setIsSettingPassword, setIsResettingPassword, setIsVerifyingEmail, isResettingPassword, isSettingPassword }) {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const roleFromUrl = urlParams.get('role');
    const idFromUrl = urlParams.get('id');
    const error = urlParams.get('error');
    const pathname = window.location.pathname;

    const oauthLinked = urlParams.get('oauth_linked');
    const oauthSuccess = urlParams.get('success');
    if (oauthLinked && oauthSuccess === 'true' && pathname === '/profile') {
      showToast(`✅ ${oauthLinked} đã được liên kết thành công!`);
      window.history.replaceState({}, document.title, '/profile');
      return;
    }

    if (error) {
      let errorMessage = `OAuth error: ${error}`;
      if (error === 'already_linked_to_another_account') errorMessage = 'Tài khoản này đã được liên kết với một tài khoản khác';
      else if (error === 'user_not_found') errorMessage = 'Không tìm thấy người dùng';
      showToast(errorMessage);
      window.history.replaceState({}, document.title, '/');
      return;
    }

    if (pathname === '/set-password' && token && roleFromUrl && idFromUrl) {
      if (urlParams.get('newUser') === 'true') {
        localStorage.setItem('token', token);
        localStorage.setItem('role', roleFromUrl);
        localStorage.setItem('userId', idFromUrl);
        setIsSettingPassword(true);
        return;
      }
    }

    if (token && roleFromUrl && idFromUrl && pathname !== '/set-password' && !oauthLinked) {
      localStorage.setItem('token', token);
      localStorage.setItem('role', roleFromUrl);
      localStorage.setItem('userId', idFromUrl);
      setRole(roleFromUrl);
      showToast('Đăng nhập thành công!');
      window.history.replaceState({}, document.title, '/');
      setTimeout(() => window.location.reload(), 100);
      return;
    }

    if (token && !roleFromUrl && (pathname === '/reset-password' || pathname === '/')) {
      setIsResettingPassword(true);
      return;
    }

    if (token && !roleFromUrl && !isResettingPassword && !isSettingPassword) {
      setIsVerifyingEmail(true);
    }
  }, [showToast, setRole, setIsSettingPassword, setIsResettingPassword, setIsVerifyingEmail, isResettingPassword, isSettingPassword]);
}

// ─── Sub-component: Global Nav ───
function GlobalNav({ view, setView, role }) {
  const navStyle = (activeView) => ({
    background: view === activeView ? (['speaking', 'learning'].includes(activeView) ? '#ec4899' : activeView === 'analytics' ? '#eab308' : activeView === 'vocabulary' ? '#10b981' : '#7137ea') : '#f6f9fc',
    color: view === activeView ? '#fff' : '#333',
    border: `1px solid ${['speaking', 'learning'].includes(activeView) ? '#ec4899' : activeView === 'analytics' ? '#eab308' : activeView === 'vocabulary' ? '#10b981' : '#7137ea'}`,
    borderRadius: 8, padding: '8px 16px', cursor: 'pointer'
  });

  return (
    <nav style={{ marginBottom: 20, display: 'flex', justifyContent: 'center', gap: 10 }}>
      <button onClick={() => setView('chat')} style={navStyle('chat')}>Knowledge Search</button>
      <button onClick={() => setView('writing')} style={navStyle('writing')}>✍️ Writing Practice</button>
      <button onClick={() => setView('listening')} style={navStyle('listening')}>🎧 Listening Practice</button>
      <button onClick={() => setView('reading')} style={navStyle('reading')}>📖 Reading Practice</button>
      <button onClick={() => setView('speaking')} style={navStyle('speaking')}>🎙️ Speaking Practice</button>
      <button onClick={() => setView('learning')} style={navStyle('learning')}>🎓 Learning Hub</button>
      <button onClick={() => setView('analytics')} style={navStyle('analytics')}>📊 Analytics</button>
      <button onClick={() => setView('vocabulary')} style={navStyle('vocabulary')}>📓 Sổ Từ Vựng</button>
      {role === 'admin' && (
        <button onClick={() => setView('knowledgeadmin')} style={navStyle('knowledgeadmin')}>Knowledge Admin</button>
      )}
    </nav>
  );
}

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

  useAuthParams({ showToast, setRole, setIsSettingPassword, setIsResettingPassword, setIsVerifyingEmail, isResettingPassword, isSettingPassword });

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
            onFocus={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.background = darkMode ? '#450a0a' : '#fee2e2';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = darkMode ? '#3f1a1a' : '#ffebee';
            }}
            onBlur={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = darkMode ? '#3f1a1a' : '#ffebee';
            }}
          >
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>

      <GlobalNav view={view} setView={setView} role={role} />

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
