import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { DarkModeProvider } from './component/DarkModeContext';
import { LanguageProvider } from './component/LanguageContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <DarkModeProvider>
    <LanguageProvider>
    <App />
    </LanguageProvider>
  </DarkModeProvider>
);
