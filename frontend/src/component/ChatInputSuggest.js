import React, { useState, useRef } from 'react';
import axios from 'axios';
import '../styles/Chat.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function ChatInputSuggest({
  value,
  onChange,
  onSend,
  disabled,
  onKeyPress,
  placeholder = "Nhập câu hỏi của bạn..."
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
    if (onKeyPress) {
      onKeyPress(e);
    }
  }

  return (
    <div className="chat-input-wrapper">
      <textarea
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="chat-textarea"
        placeholder={placeholder}
        autoFocus
      />

      {/* Send Button */}
      <button
        onClick={() => !disabled && value.trim() && onSend()}
        disabled={disabled || !value.trim()}
        className="chat-send-button"
        tabIndex={-1}
        title='Gửi tin nhắn'
      >
        <svg width='16' height='16' viewBox='0 0 20 20' fill='none'>
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
        <span className="chat-suggestion">
          {suggest}
        </span>
      )}

      {/* Loading Indicator */}
      {loadingSuggest && (
        <div className="chat-loading-indicator">
          <div className="chat-loading-spinner"></div>
          <span>Đang gợi ý...</span>
        </div>
      )}

      {/* Help Text */}
      <div className="chat-help-text">
        {suggest ? (
          <>
            <span>Nhấn <b>Tab</b> để chèn gợi ý:</span>
            <span className="chat-suggestion-text">
              {suggest}
            </span>
          </>
        ) : (
          <span>💡 Gợi ý từ tiếp theo tự động</span>
        )}
      </div>
    </div>
  );
}