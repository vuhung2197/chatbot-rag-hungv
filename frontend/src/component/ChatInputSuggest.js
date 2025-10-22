import { useState, useRef } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function ChatInputSuggest({
  value,
  onChange,
  onSend,
  disabled,
  placeholder = 'Nhập câu hỏi của bạn...'
}) {
  const [suggest, setSuggest] = useState('');
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const debounceRef = useRef();

  // Gợi ý từ tiếp theo mỗi khi người dùng nhập
  function handleInput(e) {
    const val = e.target.value;
    onChange(val);
    setSuggest('');
    clearTimeout(debounceRef.current);

    if (val.trim() && !disabled) {
      setLoadingSuggest(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await axios.post(`${API_URL}/suggest-next-word`, {
            prompt: val,
          });
          setSuggest(res.data.suggest);
        } catch {
          setSuggest('');
        }
        setLoadingSuggest(false);
      }, 250);
    } else {
      setLoadingSuggest(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Tab' && suggest) {
      e.preventDefault();
      onChange(value + suggest);
      setSuggest('');
    }
    if (e.key === 'Enter' && value.trim() && !disabled) {
      onSend();
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <textarea
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        style={{
          width: '100%',
          minHeight: '48px',
          maxHeight: '120px',
          padding: '12px 16px',
          fontSize: '15px',
          borderRadius: '12px',
          border: '1px solid #d1d5db',
          boxSizing: 'border-box',
          resize: 'none',
          fontFamily: 'inherit',
          lineHeight: '1.5',
          backgroundColor: disabled ? '#f9fafb' : '#ffffff',
          color: disabled ? '#6b7280' : '#1f2937',
          outline: 'none',
          transition: 'all 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}
        placeholder={placeholder}
        autoFocus
        onFocus={(e) => {
          e.target.style.borderColor = '#10a37f';
          e.target.style.boxShadow = '0 0 0 3px rgba(16, 163, 127, 0.1)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#d1d5db';
          e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        }}
      />
      {/* Send Button */}
      <button
        onClick={() => !disabled && value.trim() && onSend()}
        disabled={disabled || !value.trim()}
        style={{
          position: 'absolute',
          right: '8px',
          bottom: '8px',
          background: disabled || !value.trim() ? '#d1d5db' : '#10a37f',
          border: 'none',
          borderRadius: '8px',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '14px',
          cursor: disabled || !value.trim() ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          zIndex: 2,
          padding: 0,
        }}
        tabIndex={-1}
        title='Gửi tin nhắn'
      >
        <svg width='16' height='16' viewBox='0 0 20 20'
          fill='none'>
          <path
            d='M10 16V4M10 4L4 10M10 4l6 6'
            stroke='white'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      </button>

      {/* Suggestion Text */}
      {value && suggest && !loadingSuggest && !disabled && (
        <span
          style={{
            position: 'absolute',
            left: '16px',
            bottom: '8px',
            color: '#9ca3af',
            fontSize: '14px',
            pointerEvents: 'none',
            userSelect: 'none',
            backgroundColor: '#f9fafb',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid #e5e7eb'
          }}
        >
          {suggest}
        </span>
      )}

      {/* Loading Indicator */}
      {loadingSuggest && (
        <div
          style={{
            position: 'absolute',
            right: '48px',
            bottom: '8px',
            color: '#9ca3af',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <div style={{
            width: '12px',
            height: '12px',
            border: '2px solid #e5e7eb',
            borderTop: '2px solid #10a37f',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <span>Đang gợi ý...</span>
        </div>
      )}

      {/* Help Text */}
      <div style={{ 
        fontSize: '12px', 
        color: '#6b7280', 
        marginTop: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        {suggest ? (
          <>
            <span>Nhấn <b>Tab</b> để chèn gợi ý:</span>
            <span style={{ 
              color: '#10a37f', 
              backgroundColor: '#f0fdf4',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid #bbf7d0'
            }}>
              {suggest}
            </span>
          </>
        ) : (
          <span>💡 Gợi ý từ tiếp theo tự động</span>
        )}
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}