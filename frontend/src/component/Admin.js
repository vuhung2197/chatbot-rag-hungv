import React, { useState, useEffect } from 'react';

function Admin() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [toast, setToast] = useState('');

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  }

  // Lấy danh sách góp ý
  const fetchFeedbacks = () => {
    fetch('http://localhost:3001/feedback')
      .then(res => res.json())
      .then(data => setFeedbacks(data));
  };

  useEffect(() => { fetchFeedbacks(); }, []);

  // Duyệt góp ý
  const approveFeedback = async (id) => {
    const res = await fetch('http://localhost:3001/feedback/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    showToast(data.message || 'Đã duyệt!');
    fetchFeedbacks();
  };

  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: 24, minHeight: 300, maxWidth: 560, margin: "0 auto"
    }}>
      <h3 style={{ color: "#7137ea", marginBottom: 14 }}>🛠 Quản lý góp ý ({feedbacks.length})</h3>
      {toast && <div style={{
        background: "#44bd32", color: "#fff", padding: "8px 18px", borderRadius: 8,
        marginBottom: 14, fontWeight: 500
      }}>{toast}</div>}
      <div style={{ maxHeight: 350, overflowY: 'auto', border: '1px solid #eee', borderRadius: 10, padding: 14 }}>
        {feedbacks.length === 0 ? <div>Chưa có góp ý nào.</div> : feedbacks.map((fb) => (
          <div
            key={fb.id}
            style={{
              marginBottom: 18,
              background: fb.approved ? "#e6ffe6" : "#fffbe7",
              borderRadius: 8,
              boxShadow: "0 2px 10px #f0f0f0",
              padding: "12px 16px"
            }}
          >
            <div style={{ marginBottom: 4 }}>
              <b>Message:</b> <span style={{ color: "#222" }}>{fb.message}</span>
            </div>
            <div style={{ marginBottom: 4 }}>
              <b>Gợi ý trả lời:</b> <span style={{ color: "#24637c" }}>{fb.suggested_reply}</span>
            </div>
            <div style={{ marginBottom: 4 }}>
              <b>Giải thích:</b> <span style={{ color: "#999" }}>{fb.explanation || '---'}</span>
            </div>
            <div style={{ marginBottom: 4 }}>
              <b>Thời gian:</b> <span style={{ color: "#999" }}>
                {fb.created_at ? new Date(fb.created_at).toLocaleString() : '---'}
              </span>
            </div>
            <div>
              <b>Trạng thái:</b>{" "}
              <span style={{ color: fb.approved ? "#44bd32" : "#f39c12", fontWeight: 600 }}>
                {fb.approved ? "Đã duyệt" : "Chờ duyệt"}
              </span>
              {!fb.approved && (
                <button
                  style={{
                    marginLeft: 18,
                    background: "#44bd32",
                    color: "#fff",
                    border: "none",
                    padding: "6px 14px",
                    borderRadius: 7,
                    cursor: "pointer",
                    fontWeight: 500
                  }}
                  onClick={() => approveFeedback(fb.id)}
                >Duyệt góp ý & thêm từ điển</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Admin;
