import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { DarkModeProvider } from './context/DarkModeContext';
import { LanguageProvider } from './context/LanguageContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <DarkModeProvider>
    <LanguageProvider>
      <ToastProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </ToastProvider>
    </LanguageProvider>
  </DarkModeProvider>
);
