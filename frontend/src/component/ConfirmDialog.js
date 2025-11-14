import React from 'react';
import './ConfirmDialog.css';

export default function ConfirmDialog({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  confirmColor = '#dc3545',
  darkMode = false
}) {
  if (!isOpen) return null;

  const bgColor = darkMode ? '#2d2d2d' : '#fff';
  const textColor = darkMode ? '#f0f0f0' : '#333';
  const borderColor = darkMode ? '#555' : '#ddd';

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div 
        className="confirm-dialog-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: bgColor,
          color: textColor,
          border: `1px solid ${borderColor}`,
        }}
      >
        {title && (
          <h3 className="confirm-dialog-title" style={{ color: textColor }}>
            {title}
          </h3>
        )}
        <p className="confirm-dialog-message" style={{ color: textColor }}>
          {message}
        </p>
        <div className="confirm-dialog-actions">
          <button
            className="confirm-dialog-button confirm-dialog-button-cancel"
            onClick={onCancel}
            style={{
              backgroundColor: darkMode ? '#555' : '#f0f0f0',
              color: textColor,
              border: `1px solid ${borderColor}`,
            }}
          >
            {cancelText}
          </button>
          <button
            className="confirm-dialog-button confirm-dialog-button-confirm"
            onClick={onConfirm}
            style={{
              backgroundColor: confirmColor,
              color: '#fff',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

