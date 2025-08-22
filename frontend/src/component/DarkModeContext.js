import React, { createContext, useContext, useState, useEffect } from 'react';

const DarkModeContext = createContext();

export function DarkModeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('darkMode') === 'true'
  );

  function toggleDarkMode() {
    setDarkMode(d => {
      localStorage.setItem('darkMode', !d);
      return !d;
    });
  }

  useEffect(() => {
    document.body.style.background = darkMode ? '#23272f' : '#fff';
    return () => {
      document.body.style.background = '';
    };
  }, [darkMode]);

  return (
    <DarkModeContext.Provider value={{ darkMode, toggleDarkMode }}>
      <div
        style={{
          maxWidth: 600,
          margin: '30px auto',
          fontFamily: 'sans-serif',
          background: darkMode ? '#23272f' : '#fff',
          color: darkMode ? '#fafafa' : '#222',
          minHeight: '100vh',
          position: 'relative',
          transition: 'background 0.3s, color 0.3s',
        }}
      >
        {children}
      </div>
    </DarkModeContext.Provider>
  );
}

// Custom hook cho tiện dùng
export function useDarkMode() {
  return useContext(DarkModeContext);
}
