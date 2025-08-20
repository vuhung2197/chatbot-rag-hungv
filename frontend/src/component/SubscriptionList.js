import React, { useState } from "react";
// import DOMPurify from "dompurify";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

function sanitizeUnsubscribeLink(raw) {
  if (!raw) return null;

  const matches = raw.match(/<([^>]+)>/g);
  if (matches && matches.length > 0) {
    return matches[0].replace(/[<>]/g, ''); // Bỏ < và >
  }

  // fallback nếu không có <...> mà chỉ là 1 link
  return raw.trim().split(',')[0];
}

export default function SubscriptionList({ subs }) {
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const handleUnsubscribeSelected = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/email/gmail/unsubscribe`,
        { 
          emails: selected,
          userEmail: "hung97vu@gmail.com" // TODO: Get from user context/auth
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      
      const { message, summary } = response.data;
      alert(`${message}\n✅ Thành công: ${summary.success}\n❌ Thất bại: ${summary.failed}`);
      
      // Reset selection after successful unsubscribe
      setSelected([]);
    } catch (err) {
      console.error("❌ Lỗi unsubscribe:", err);
      const errorMessage = err.response?.data?.message || "Hủy đăng ký thất bại.";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!subs || subs.length === 0) {
    return (
      <div style={{ padding: "16px", textAlign: "center", color: "#666" }}>
        Không tìm thấy bản tin nào trong hộp thư của bạn.
      </div>
    );
  }

  return (
    <div style={{ padding: "16px" }}>
      <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px", color: "#fff" }}>
        📬 Danh sách bản tin đã đăng ký
      </h2>

      <button
        onClick={handleUnsubscribeSelected}
        disabled={loading || selected.length === 0}
        style={{
          backgroundColor: "#dc2626",
          color: "white",
          padding: "8px 12px",
          borderRadius: "6px",
          border: "none",
          cursor: "pointer",
          marginBottom: "16px",
        }}
      >
        ❌ Hủy {selected.length} bản tin đã chọn
      </button>

      {subs.map((item, index) => (
        <EmailCard
          key={item.id}
          item={item}
          isSelected={selected.includes(item.id)}
          onToggle={() => toggleSelect(item.id)}
          />
      ))}
    </div>
  );
}

function EmailCard({ item, isSelected, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const link = sanitizeUnsubscribeLink(item.unsubscribe);

  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: "8px",
        padding: "16px",
        backgroundColor: "#fff",
        color: "#000",
        marginBottom: "16px",
        display: "flex",
        gap: "12px",
        alignItems: "flex-start",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
      }}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        style={{ marginTop: "6px" }}
      />

      <div style={{ flex: 1 }}>
        <p style={{ fontSize: "14px", color: "#333", marginBottom: "4px" }}>
          <strong style={{ color: "#1d4ed8" }}>Người gửi:</strong> {item.from}
        </p>

        <p style={{ fontSize: "16px", fontWeight: 500, marginBottom: "8px" }}>
          📌 {item.subject}
        </p>

        {item.unsubscribe ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "14px", color: "#dc2626", textDecoration: "underline" }}
          >
            ❌ Hủy đăng ký thủ công
          </a>
        ) : (
          <p style={{ fontSize: "14px", color: "#888" }}>🚫 Không có link hủy</p>
        )}

        {item.body && (
          <div style={{ marginTop: "12px", fontSize: "14px", color: "#333" }}>
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                background: "none",
                border: "none",
                color: "#1d4ed8",
                cursor: "pointer",
                padding: 0,
                marginBottom: "8px",
              }}
            >
              {expanded ? "🔼 Thu gọn nội dung" : "🔽 Xem nội dung"}
            </button>

            {expanded && (
              <div
                style={{
                  maxHeight: "400px",
                  overflowY: "auto",
                  border: "1px solid #eee",
                  padding: "8px",
                  backgroundColor: "#fafafa",
                  borderRadius: "4px",
                }}
                dangerouslySetInnerHTML={{ __html: item.body }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

