import React, { useEffect, useState } from "react";

export default function Highlights() {
  const [highlights, setHighlights] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3001/highlights")
      .then(res => res.json())
      .then(setHighlights);
  }, []);

  return (
    <div style={{ background: "#fff", padding: 20, borderRadius: 14 }}>
      <h3 style={{ color: "#7137ea", marginBottom: 16 }}>📝 Đoạn văn đã lưu</h3>
      {highlights.length === 0
        ? <div>Chưa có đoạn văn nào được lưu từ extension!</div>
        : (
          <ul style={{ paddingLeft: 0, listStyle: "none" }}>
            {highlights.map(h => (
              <li key={h.id} style={{ marginBottom: 16, background: "#f8f8ff", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ color: "#222", marginBottom: 6 }}>
                  <b>🇬🇧 Gốc:</b> {h.text}
                </div>
                {h.translated_text && (
                  <div style={{ color: "#24637c", marginTop: 4 }}>
                    <b>🇻🇳 Dịch:</b> {h.translated_text}
                  </div>
                )}
                <div style={{ fontSize: "0.94em", color: "#999" }}>{new Date(h.created_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
