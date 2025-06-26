import React, { useState, useEffect } from 'react';
import HelpGuide from "./HelpGuide";
import ChatInputSuggest from "./ChatInputSuggest";
import CryptoJS from "crypto-js";
import ReactMarkdown from 'react-markdown';

const API_URL = process.env.REACT_APP_API_URL;

export default function Chat() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [showGuide, setShowGuide] = useState(true);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("embedding");
  const [questionHistory, setQuestionHistory] = useState([]);
  const [showRecentModal, setShowRecentModal] = useState(false);

  const algorithmDescriptions = {
    embedding: "📚 RAG + Chunk: Thuật toán kết hợp truy xuất ngữ nghĩa (RAG) và chia đoạn nhỏ (chunking) giúp chuyển câu hỏi thành vector embedding rồi tìm kiếm chính xác đoạn kiến thức phù hợp. Cho phép xử lý câu hỏi khó, không cần trùng từ khóa.",
    context: "🧠 Score Context: So sánh từ khóa giữa câu hỏi và nội dung kiến thức bằng cách đếm số từ khớp, ưu tiên cụm từ quan trọng, độ tương đồng và phạt độ dài. Hiệu quả khi nội dung và câu hỏi có từ ngữ gần nhau."
  };

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    const saved = localStorage.getItem(`chatbot_history_${userId}`);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Lỗi khi parse history:", e);
      }
    }
  }, []);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    localStorage.setItem(`chatbot_history_${userId}`, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`${API_URL}/chat/history`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        });
        const data = await res.json();
        setQuestionHistory(data);
      } catch (err) {
        console.error("Lỗi khi lấy lịch sử câu hỏi:", err);
      }
    }

    fetchHistory();
  }, []);

  const hashQuestion = (text) => {
    return CryptoJS.SHA256(text.trim().toLowerCase()).toString();
  };

  async function sendChat() {
    if (!input.trim() || loading) return;
    setLoading(true);
    const timestamp = new Date().toISOString();
    const hash = hashQuestion(input);
    const cached = JSON.parse(localStorage.getItem("chatbot_cache") || "{}");

    if (cached[hash]) {
      setHistory([{ user: input, bot: cached[hash], createdAt: timestamp }, ...history]);
      setInput("");
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: input, mode })
      });
      const data = await res.json();
      setHistory([{ user: input, bot: data.reply, createdAt: timestamp }, ...history]);

      const isNoAnswer = [
        "Xin lỗi, tôi chưa có kiến thức phù hợp để trả lời câu hỏi này.",
        "Không thể tính embedding câu hỏi!",
        "Bot đang bận, vui lòng thử lại sau!",
        "Tôi chưa có kiến thức phù hợp để trả lời câu hỏi này."
      ].includes(data.reply);

      if (!isNoAnswer) {
        cached[hash] = data.reply;
        localStorage.setItem("chatbot_cache", JSON.stringify(cached));
      }

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
      maxWidth: 620,
      boxShadow: "0 8px 32px 0 rgba(31,38,135,0.18)",
      border: "1px solid #bcbcbc",
      margin: "0 auto"
    }}>
      <button onClick={() => setShowGuide(v => !v)}>
        {showGuide ? "Ẩn hướng dẫn" : "Hiện hướng dẫn"}
      </button>
      {showGuide && <HelpGuide />}

      {questionHistory.length > 0 && (
        <button
          style={{
            marginTop: 16,
            marginBottom: 16,
            backgroundColor: "#2563eb",
            color: "white",
            padding: "8px 16px",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer"
          }}
          onClick={() => setShowRecentModal(true)}
        >
          🕘 Xem câu hỏi gần đây
        </button>
      )}

      {showRecentModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          backgroundColor: "rgba(0,0,0,0.4)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            backgroundColor: "#fff", width: "90%", maxWidth: 800,
            maxHeight: "80%", overflowY: "auto",
            borderRadius: 12, padding: "24px 32px", position: "relative",
            boxShadow: "0 12px 32px rgba(0,0,0,0.25)"
          }}>
            <h2 style={{ marginTop: 0, color: "#222", marginBottom: 16 }}>🕘 Câu hỏi & trả lời gần đây</h2>

            <button
              onClick={() => setShowRecentModal(false)}
              style={{
                position: "absolute", top: 16, right: 20,
                background: "#ef4444", color: "#fff", border: "none",
                borderRadius: 6, padding: "6px 12px", cursor: "pointer"
              }}
            >
              Đóng
            </button>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {questionHistory.map((item, index) => (
                <div key={index} style={{
                  background: "#f9fafb", borderRadius: 10, padding: "16px 20px",
                  border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
                }}>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: "#6b7280", fontSize: "0.85em" }}>
                      🗓 {new Date(item.created_at).toLocaleString("vi-VN")}
                    </span>
                  </div>

                  <div style={{
                    background: "#eef2ff", padding: "10px 14px",
                    borderRadius: 8, color: "#1e3a8a", fontSize: "1em",
                    marginBottom: 10
                  }}>
                    <b>Bạn:</b> {item.question}
                  </div>

                  <div style={{
                    background: "#ecfdf5", padding: "10px 14px",
                    borderRadius: 8, color: "#065f46", fontSize: "1em",
                    whiteSpace: "pre-wrap"
                  }}>
                    <b>Bot:</b>
                    <div style={{ marginTop: 6 }}>
                      <ReactMarkdown>{item.bot_reply}</ReactMarkdown>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setInput(item.question);
                      setShowRecentModal(false);
                    }}
                    style={{
                      marginTop: 12, background: "#3b82f6", color: "#fff",
                      border: "none", padding: "6px 12px", borderRadius: 6,
                      cursor: "pointer", fontSize: "0.95em"
                    }}
                  >
                    🔁 Gửi lại câu hỏi này
                  </button>

                  <button
                    onClick={async () => {
                      if (!window.confirm("Bạn có chắc chắn muốn xóa câu hỏi này?")) return;
                      try {
                        const res = await fetch(`${API_URL}/chat/history/${item.id}`, {
                          method: "DELETE",
                          headers: {
                            Authorization: `Bearer ${localStorage.getItem("token")}`
                          }
                        });
                        if (res.ok) {
                          setQuestionHistory(prev => prev.filter(q => q.id !== item.id));
                        } else {
                          alert("Xóa thất bại!");
                        }
                      } catch (err) {
                        console.error("Lỗi khi xóa câu hỏi:", err);
                        alert("Đã xảy ra lỗi khi xóa!");
                      }
                    }}
                    style={{
                      background: "#ef4444", color: "#fff",
                      border: "none", padding: "6px 12px", borderRadius: 6,
                      cursor: "pointer", fontSize: "0.95em"
                    }}
                  >
                    🗑 Xóa
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {history.length > 0 && (
        <button
          onClick={() => {
            if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử không?")) {
              setHistory([]);
              localStorage.removeItem("chatbot_history");
              localStorage.removeItem("chatbot_cache");
            }
          }}
          style={{
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
      )}

      <label style={{ marginTop: 16, display: "block", fontWeight: "bold", color: "#000" }}>
        Chọn thuật toán:
      </label>
      <select value={mode} onChange={e => setMode(e.target.value)} style={{ marginBottom: 8 }}>
        <option value="embedding">📚 RAG + Chunk</option>
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
        maxHeight: 340,
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
                <div style={{ marginTop: 4 }}>
                  <ReactMarkdown>{item.bot}</ReactMarkdown>
                </div>
                <div style={{ fontSize: "0.8em", color: "#999", marginTop: 4 }}>{time}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}