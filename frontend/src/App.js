// 📁 src/App.jsx
import React, { useState, useEffect } from 'react';
import Chat from './component/Chat';
// import Highlights from './component/Highlights';
import KnowledgeAdmin from './component/KnowledgeAdmin';
import Email from './component/Email';
import Login from './component/Login';
import Register from './component/Register';
import { useDarkMode } from './component/DarkModeContext';

export default function App() {
  const [view, setView] = useState('chat');
  const [toast, setToast] = useState('');
  const { darkMode, toggleDarkMode } = useDarkMode();

  const [role, setRole] = useState(localStorage.getItem('role'));
  const [page, setPage] = useState('login');

  useEffect(() => {
    if (role) setView(role === 'admin' ? 'knowledgeadmin' : 'chat');
  }, [role]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setRole(null);
    setPage('login');
  }

  if (!role) {
    return (
      <div style={{ maxWidth: 360, margin: '40px auto' }}>
        {page === 'login' ? (
          <>
            <Login onLogin={r => setRole(r)} />
            <p style={{ marginTop: 10, textAlign: 'center' }}>
              Chưa có tài khoản?{' '}
              <button
                onClick={() => setPage('register')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#7137ea',
                  cursor: 'pointer',
                }}
              >
                Đăng ký
              </button>
            </p>
          </>
        ) : (
          <>
            <Register onRegister={() => setPage('login')} />
            <p style={{ marginTop: 10, textAlign: 'center' }}>
              Đã có tài khoản?{' '}
              <button
                onClick={() => setPage('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#7137ea',
                  cursor: 'pointer',
                }}
              >
                Đăng nhập
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
      <button
        onClick={handleLogout}
        style={{
          position: 'absolute',
          left: 0,
          top: 10,
          background: '#eee',
          border: '1px solid #666',
          padding: '6px 18px',
          borderRadius: 20,
          cursor: 'pointer',
          zIndex: 1000,
        }}
      >
        Đăng xuất
      </button>
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
          Tra cứu kiến thức
        </button>
        {/* <button
          onClick={() => setView('highlights')}
          style={{
            background: view === 'highlights' ? '#7137ea' : '#f6f9fc',
            color: view === 'highlights' ? '#fff' : '#333',
            border: "1px solid #7137ea",
            borderRadius: 8,
            padding: "8px 16px"
          }}
        >
          Highlights
        </button> */}
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
        <button
          onClick={() => setView('email')}
          style={{
            background: view === 'email' ? '#7137ea' : '#f6f9fc',
            color: view === 'email' ? '#fff' : '#333',
            border: '1px solid #7137ea',
            borderRadius: 8,
            padding: '8px 16px',
          }}
        >
          Email Subscription
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
      {view === 'email' && <Email darkMode={darkMode} />}
      {view === 'chat' && <Chat darkMode={darkMode} />}
      {/* {view === 'highlights' && <Highlights darkMode={darkMode} />} */}
      {view === 'knowledgeadmin' && <KnowledgeAdmin darkMode={darkMode} />}
    </>
  );
}
