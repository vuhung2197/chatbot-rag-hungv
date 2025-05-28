import React, { useState } from 'react';
import Chat from './component/Chat';
import Feedback from './component/Feedback';
import Admin from './component/Admin';
import MyWords from './component/MyWords';
import Highlights from './component/Highlights';
import { useDarkMode } from './component/DarkModeContext';

export default function App() {
  const [view, setView] = useState('chat');
  const [toast, setToast] = useState("");
  const { darkMode, toggleDarkMode } = useDarkMode();

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }

  return (
    <>
      {/* Nút chuyển dark/light mode */}
      <button
        onClick={toggleDarkMode}
        style={{
          position: "absolute", right: 30, top: 0,
          background: darkMode ? "#333" : "#fff",
          color: darkMode ? "#fff" : "#7137ea",
          border: "1px solid #7137ea",
          borderRadius: 20, padding: "6px 18px", cursor: "pointer",
          zIndex: 1000
        }}
      >
        {darkMode ? "🌙 Dark Mode" : "☀️ Light Mode"}
      </button>
      <h2 style={{ textAlign: "center", color: darkMode ? "#fff" : "#7137ea" }}>English Chatbot</h2>
      <nav style={{
        marginBottom: 20, display: 'flex', justifyContent: 'center', gap: 10
      }}>
        <button
          onClick={() => setView('chat')}
          style={{
            background: view === 'chat' ? '#7137ea' : '#f6f9fc',
            color: view === 'chat' ? '#fff' : '#333',
            border: "1px solid #7137ea",
            borderRadius: 8,
            padding: "8px 16px"
          }}
        >
          Học tiếng Anh
        </button>
        <button
          onClick={() => setView('mywords')}
          style={{
            background: view === 'mywords' ? '#7137ea' : '#f6f9fc',
            color: view === 'mywords' ? '#fff' : '#333',
            border: "1px solid #7137ea",
            borderRadius: 8,
            padding: "8px 16px"
          }}
        >
          My Words
        </button>
        <button
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
        </button>
        <button
          onClick={() => setView('feedback')}
          style={{
            background: view === 'feedback' ? '#7137ea' : '#f6f9fc',
            color: view === 'feedback' ? '#fff' : '#333',
            border: "1px solid #7137ea",
            borderRadius: 8,
            padding: "8px 16px"
          }}
        >
          Góp ý bot
        </button>
        <button
          onClick={() => setView('admin')}
          style={{
            background: view === 'admin' ? '#7137ea' : '#f6f9fc',
            color: view === 'admin' ? '#fff' : '#333',
            border: "1px solid #7137ea",
            borderRadius: 8,
            padding: "8px 16px"
          }}
        >
          Admin (Duyệt góp ý)
        </button>
      </nav>
      {toast && (
        <div style={{
          background: "#4BB543",
          color: "#fff",
          padding: "12px 24px",
          borderRadius: 8,
          position: "fixed",
          top: 36,
          left: "50%",
          transform: "translateX(-50%)",
          fontWeight: 500,
          zIndex: 2000,
          boxShadow: "0 2px 8px #6667"
        }}>
          {toast}
        </div>
      )}
      {view === 'chat' && <Chat darkMode={darkMode} />}
      {view === 'mywords' && <MyWords darkMode={darkMode} />}
      {view === 'highlights' && <Highlights darkMode={darkMode} />}
      {view === 'feedback' && <Feedback darkMode={darkMode} />}
      {view === 'admin' && <Admin darkMode={darkMode} />}
    </>
  );
}
