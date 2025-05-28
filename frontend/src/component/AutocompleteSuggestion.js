import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

export default function AutocompleteSuggestion({ value, onChange, onSelect, onEnterKey }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [isSelected, setIsSelected] = useState(false);
  const debounceTimeout = useRef();
  const inputRef = useRef();

  useEffect(() => {
    if (!value.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      setHighlight(-1);
      setIsSelected(false);
      return;
    }
    if (isSelected) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      axios
        .get(`http://localhost:3001/chat/suggest?query=${encodeURIComponent(value)}`)
        .then(res => {
          setSuggestions(res.data || []);
          setShowDropdown(true);
          setHighlight(-1);
        })
        .catch(() => {
          setSuggestions([]);
          setShowDropdown(false);
          setHighlight(-1);
        });
    }, 200);

    return () => clearTimeout(debounceTimeout.current);
  }, [value, isSelected]);

  const handleKeyDown = (e) => {
    if (showDropdown && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight(h => (h + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight(h => (h <= 0 ? suggestions.length - 1 : h - 1));
      } else if (e.key === "Enter") {
        if (highlight >= 0 && highlight < suggestions.length) {
          handleSelect(suggestions[highlight]);
        } else if (onEnterKey) {
          onEnterKey();
        }
      }
    } else {
      if (e.key === "Enter" && onEnterKey) onEnterKey();
    }
  };

  const handleSelect = word => {
    onChange(word);
    setShowDropdown(false);
    setHighlight(-1);
    setIsSelected(true);
    if (onSelect) onSelect(word);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div style={{ position: "relative", flex: 1 }}>
      <input
        ref={inputRef}
        style={{
          width: "90%", padding: "10px 14px", borderRadius: "1em 0 0 1em",
          border: "1px solid #bcbcbc", fontSize: "1em", outline: "none", background: "#f8f8ff"
        }}
        value={value}
        placeholder="Nhập từ hoặc câu hỏi..."
        onChange={e => {
          onChange(e.target.value);
          setHighlight(-1);
          setIsSelected(false);
        }}
        onFocus={() => {
          if (!isSelected && suggestions.length) setShowDropdown(true);
        }}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {showDropdown && suggestions.length > 0 && (
        <ul style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          background: "#fff",
          border: "1px solid #bcbcbc",
          borderRadius: "0 0 8px 8px",
          position: "absolute",
          left: 0,
          width: "100%",
          top: "44px",
          zIndex: 10,
          maxHeight: 180,
          overflowY: "auto"
        }}>
          {suggestions.map((word, idx) =>
            <li key={idx}
              onClick={() => handleSelect(word)}
              style={{
                padding: "8px 16px",
                cursor: "pointer",
                background: highlight === idx ? "#e4e7ff" : "#fff",
                color: highlight === idx ? "#5223a7" : "#222",
                borderBottom: idx === suggestions.length - 1 ? "none" : "1px solid #f2f2f2"
              }}
              onMouseEnter={() => setHighlight(idx)}
            >{word}</li>
          )}
        </ul>
      )}
    </div>
  );
}
