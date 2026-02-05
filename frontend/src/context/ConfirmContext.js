import React, { createContext, useContext, useState, useCallback } from 'react';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useDarkMode } from './DarkModeContext';

const ConfirmContext = createContext();

function ConfirmProviderInner({ children }) {
  const { darkMode } = useDarkMode();
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'Xác nhận',
    cancelText: 'Hủy',
    confirmColor: '#dc3545',
  });

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title: options.title || '',
        message: options.message || '',
        confirmText: options.confirmText || 'Xác nhận',
        cancelText: options.cancelText || 'Hủy',
        confirmColor: options.confirmColor || '#dc3545',
        onConfirm: () => {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      });
    });
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={confirmState.onCancel}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        confirmColor={confirmState.confirmColor}
        darkMode={darkMode}
      />
    </ConfirmContext.Provider>
  );
}

export function ConfirmProvider({ children }) {
  return <ConfirmProviderInner>{children}</ConfirmProviderInner>;
}

export function useConfirmContext() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirmContext must be used within ConfirmProvider');
  }
  return context;
}

