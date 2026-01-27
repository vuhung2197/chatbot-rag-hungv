import React, { createContext, useContext, useState, useEffect } from 'react';
import styles from '../styles/components/DarkModeContext.module.css';

const DarkModeContext = createContext();

export function DarkModeProvider({ children }) {
  // Auto-detect system preference on first load
  const getInitialDarkMode = () => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return saved === 'true';
    }
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return true;
    }
    return false;
  };

  const [darkMode, setDarkMode] = useState(getInitialDarkMode);

  function toggleDarkMode() {
    setDarkMode(d => {
      const newValue = !d;
      localStorage.setItem('darkMode', newValue);
      return newValue;
    });
  }

  // Listen to system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      // Only auto-update if user hasn't manually set preference
      if (localStorage.getItem('darkMode') === null) {
        setDarkMode(e.matches);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    document.body.style.background = darkMode ? '#23272f' : '#fff';
    document.body.style.color = darkMode ? '#fafafa' : '#222';
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    return () => {
      document.body.style.background = '';
      document.body.style.color = '';
      document.documentElement.removeAttribute('data-theme');
    };
  }, [darkMode]);

  return (
    <DarkModeContext.Provider value={{ darkMode, toggleDarkMode }}>
      <div className={`${styles.wrapper} ${darkMode ? styles.darkMode : ''}`}>
        {children}
      </div>
    </DarkModeContext.Provider>
  );
}

// Custom hook cho tiện dùng
export function useDarkMode() {
  return useContext(DarkModeContext);
}
