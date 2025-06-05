import React, { useState, useEffect } from 'react';
import HelpGuide from "./HelpGuide";
import ChatInputSuggest from "./ChatInputSuggest";

function speak(text, lang = "en-US") {
  if ('speechSynthesis' in window) {
    const utter = new window.SpeechSynthesisUtterance(text);
    utter.lang = lang;
    window.speechSynthesis.speak(utter);
  } else {
    alert("Trình duyệt không hỗ trợ phát âm!");
  }
}

function extractWordFromBotReply(botReply) {
  const match = botReply.match(/nghĩa của &quot;(.+?)&quot;/i)
    || botReply.match(/nghĩa của "(.+?)"/i)
    || botReply.match(/Từ &quot;(.+?)&quot;/i)
    || botReply.match(/Từ "(.+?)"/i)
    || botReply.match(/Bạn có hỏi từ "&lt;b&gt;(.+?)&lt;\/b&gt;/i)
    || botReply.match(/Bạn có hỏi từ "<b>(.+?)<\/b>/i);
  return match ? match[1] : null;
}

export default function Chat() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [showGuide, setShowGuide] = useState(true);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("embedding");

  const algorithmDescriptions = {
    embedding: "🔍 Thuật toán Embedding Vector: Dựa trên mô hình AI OpenAI để chuyển câu hỏi thành vector số và so sánh với vector kiến thức bằng cosine similarity. Hiệu quả với câu hỏi ngữ nghĩa sâu, không cần trùng từ khóa.",
    context: "🧠 Thuật toán Score Context: So sánh từ khóa giữa câu hỏi và nội dung kiến thức bằng cách đếm số từ khớp, ưu tiên cụm từ quan trọng, độ tương đồng và phạt độ dài. Hiệu quả khi nội dung và câu hỏi có từ ngữ gần nhau."
  };

  useEffect(() => {
    const saved = localStorage.getItem("chatbot_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Lỗi khi parse history từ localStorage:", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("chatbot_history", JSON.stringify(history));
  }, [history]);

  async function sendChat() {
    if (!input.trim() || loading) return;
    setLoading(true);
    const timestamp = new Date().toISOString();
    try {
      const res = await fetch("http://localhost:3001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, mode })
      });
      const data = await res.json();
      setHistory([{ user: input, bot: data.reply, createdAt: timestamp }, ...history]);
      setInput("");
    } catch (err) {
      setHistory([{ user: input, bot: "Lỗi khi gửi câu hỏi!", createdAt: timestamp }, ...history]);
      setInput("");
    }
    setLoading(false);
  }

  return (
    <div style={{
      background: "rgba(255,255,255,0.92)",
      borderRadius: "2em",
      padding: "2em 2.5em",
      maxWidth: 480,
      boxShadow: "0 8px 32px 0 rgba(31,38,135,0.18)",
      border: "1px solid #bcbcbc",
      margin: "0 auto"
    }}>
      <button onClick={() => setShowGuide(v => !v)}>
        {showGuide ? "Ẩn hướng dẫn" : "Hiện hướng dẫn"}
      </button>
      {showGuide && <HelpGuide />}

      <button
        onClick={() => {
          if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử không?")) {
            setHistory([]);
            localStorage.removeItem("chatbot_history");
          }
        }}
        style={{
          marginTop: 8,
          marginBottom: 12,
          backgroundColor: "#f44336",
          color: "white",
          border: "none",
          borderRadius: "6px",
          padding: "6px 12px",
          cursor: "pointer"
        }}
      >
        🗑 Xóa toàn bộ lịch sử
      </button>

      <label style={{ marginTop: 16, display: "block", fontWeight: "bold", color: "#000" }}>
        Chọn thuật toán:
      </label>
      <select value={mode} onChange={e => setMode(e.target.value)} style={{ marginBottom: 8 }}>
        <option value="embedding">🔍 Embedding vector</option>
        <option value="context">🧠 Score context</option>
      </select>
      <div style={{ fontSize: "0.95em", color: "#666", marginBottom: 16 }}>
        {algorithmDescriptions[mode]}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: "1.5em" }}>
        <ChatInputSuggest
          value={input}
          onChange={setInput}
          onSend={sendChat}
          disabled={loading}
        />
      </div>

      <div style={{
        maxHeight: 260,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column-reverse",
        gap: "1em"
      }}>
        {loading && (
          <div style={{
            textAlign: "left",
            color: "#999",
            fontStyle: "italic",
            margin: "0.5em 0 0.5em 10px"
          }}>
            <b>Bot:</b> <span>Đang trả lời...</span>
          </div>
        )}
        {history.map((item, idx) => {
          const botWord = extractWordFromBotReply(item.bot);
          const time = new Date(item.createdAt).toLocaleString("vi-VN");

          return (
            <div key={idx}>
              <div style={{
                background: "#e4e7ff", color: "#35477d",
                alignSelf: "flex-end", marginLeft: "auto",
                padding: "8px 12px", borderRadius: "1em",
                marginBottom: 4, display: "inline-block", maxWidth: "85%"
              }}>
                <b>Bạn:</b> {item.user}
                <div style={{ fontSize: "0.8em", color: "#999", marginTop: 4 }}>{time}</div>
              </div>
              <div style={{
                background: "#e2fcfa", color: "#24637c",
                alignSelf: "flex-start", marginRight: "auto",
                padding: "8px 12px", borderRadius: "1em",
                marginBottom: 4, display: "inline-block", maxWidth: "85%",
                whiteSpace: "normal", fontSize: "1.06em"
              }}>
                <b>Bot:</b>
                {botWord && (
                  <button
                    title={`Phát âm "${botWord}"`}
                    onClick={() => speak(botWord)}
                    style={{
                      marginLeft: 8,
                      background: "none",
                      border: "none",
                      color: "#2d8cf0",
                      fontSize: "1.1em",
                      cursor: "pointer",
                      verticalAlign: "middle"
                    }}
                  >🔊</button>
                )}
                <div style={{ marginTop: 4 }} dangerouslySetInnerHTML={{ __html: item.bot }} />
                <div style={{ fontSize: "0.8em", color: "#999", marginTop: 4 }}>{time}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
