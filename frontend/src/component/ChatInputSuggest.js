import React, { useState, useRef } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

export default function ChatInputSuggest({ value, onChange, onSend, disabled }) {
  const [suggest, setSuggest] = useState("");
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const debounceRef = useRef();

  // Gợi ý từ tiếp theo mỗi khi người dùng nhập
  function handleInput(e) {
    const val = e.target.value;
    onChange(val);
    setSuggest("");
    clearTimeout(debounceRef.current);

    if (val.trim() && !disabled) {
      setLoadingSuggest(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await axios.post(`${API_URL}/suggest-next-word`, {
            prompt: val
          });
          setSuggest(res.data.suggest);
        } catch {
          setSuggest("");
        }
        setLoadingSuggest(false);
      }, 250);
    } else {
      setLoadingSuggest(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Tab" && suggest) {
      e.preventDefault();
      onChange(value + suggest);
      setSuggest("");
    }
    if (e.key === "Enter" && value.trim() && !disabled) {
      onSend();
    }
  }

  return (
    <div style={{ position: "relative", width: "100%" }}>
        <input
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            style={{
            width: "100%",
            padding: "10px 48px 10px 16px",
            fontSize: 17,
            borderRadius: 15,
            border: "1.5px solid #e3e0fd",
            boxSizing: "border-box"
            }}
            placeholder="Nhập câu hỏi hoặc từ cần dịch..."
            autoFocus
        />
        {/* Button nằm trọn bên trong input */}
        <button
            onClick={() => !disabled && value.trim() && onSend()}
            disabled={disabled || !value.trim()}
            style={{
            position: "absolute",
            right: 5,
            top: "36%",
            transform: "translateY(-50%)",
            background: disabled || !value.trim() ? "#e2e2e2" : "#4f3ed7",
            border: "none",
            borderRadius: "50%",
            width: 34,
            height: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: "1.3em",
            cursor: disabled || !value.trim() ? "not-allowed" : "pointer",
            boxShadow: "0 2px 8px #d2d2ff44",
            transition: "background 0.2s",
            zIndex: 2,
            padding: 0,
            }}
            tabIndex={-1}
            title="Gửi"
        >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 16V4M10 4L4 10M10 4l6 6"
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        </button>

        {value && suggest && !loadingSuggest && !disabled && (
        <span style={{
            position: "absolute",
            left: 18 + value.length * 9,
            top: 10,
            color: "#b8b8ea",
            fontSize: 17,
            pointerEvents: "none",
            userSelect: "none"
        }}>
            {suggest}
        </span>
        )}
        {loadingSuggest && (
        <span style={{
            position: "absolute",
            right: 50,
            top: 13,
            color: "#aaa",
            fontSize: 15
        }}>
            ...
        </span>
        )}
        <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
        {suggest
            ? <>Nhấn <b>Tab</b> để chèn gợi ý: <span style={{ color: "#4f3ed7" }}>{suggest}</span></>
            : "Gợi ý từ tiếp theo tự động"}
        </div>
    </div>
    );
}
