import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

const API_URL = process.env.REACT_APP_API_URL;

export default function WritingHistory() {
  const [writings, setWritings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`${API_URL}/writing/history`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        });
        const data = await res.json();
        setWritings(data);
      } catch (err) {
        console.error("Lỗi khi lấy lịch sử viết:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, []);

  return (
    <div style={{ padding: "2em", background: "#fff", borderRadius: "1em", maxWidth: 700, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 20 }}>📚 Lịch sử bài viết của bạn</h2>

      {loading ? (
        <p>Đang tải dữ liệu...</p>
      ) : writings.length === 0 ? (
        <p>Bạn chưa viết bài nào.</p>
      ) : (
        writings.map((item, index) => (
          <div key={index} style={{
            marginBottom: 24,
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: "10px",
            background: "#f9f9f9",
            color: "#333"
          }}>
            <div style={{ fontSize: "0.9em", color: "#666", marginBottom: 6 }}>
              🗓 {new Date(item.created_at).toLocaleString("vi-VN")}
              {item.score && <span style={{ marginLeft: 12 }}>🎯 Điểm: <b>{item.score}/10</b></span>}
            </div>

            <div style={{ marginBottom: 12 }}>
              <strong>✍️ Bài viết:</strong>
              <p style={{ whiteSpace: "pre-line", marginTop: 6 }}>{item.content}</p>
            </div>

            <div>
              <strong>🤖 Phản hồi từ GPT:</strong>
              <div style={{ marginTop: 6, background: "#eef", padding: "8px 12px", borderRadius: 8 }}>
                <ReactMarkdown>{item.feedback}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}