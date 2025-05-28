import React, { useEffect, useState } from "react";
import SaveWord from './SaveWord';

export default function MyWords() {
  const [words, setWords] = useState([]);
  const [msg, setMsg] = useState("");
  const [toast, setToast] = useState("");

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }

  async function fetchWords() {
    const res = await fetch("http://localhost:3001/dictionary/user-words");
    const data = await res.json();
    setWords(data);
  }

  useEffect(() => { fetchWords(); }, []);

  async function approveWord(id) {
    if (!window.confirm("Bạn có chắc muốn duyệt từ này vào hệ thống từ điển?")) return;
    const res = await fetch("http://localhost:3001/dictionary/approve-word", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    setMsg(data.message);
    fetchWords();
    setTimeout(() => setMsg(""), 2000);
  }

  async function deleteWord(id) {
    if (!window.confirm("Bạn có chắc muốn xóa từ này khỏi danh sách?")) return;
    const res = await fetch("http://localhost:3001/dictionary/delete-user-word", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    setMsg(data.message);
    fetchWords();
    setTimeout(() => setMsg(""), 2000);
  }

  return (
    <div
      style={{
        background: "#fff",
        padding: 20,
        borderRadius: 14,
        minHeight: 200
      }}
    >
      <h3 style={{ color: "#7137ea", marginBottom: 16 }}>
        📚 My Words
      </h3>

      {/* Thông báo toast */}
      {toast && (
        <div
          style={{
            background: "#4BB543",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: 8,
            position: "fixed",
            top: 36,
            left: "50%",
            transform: "translateX(-50%)",
            fontWeight: 500,
            zIndex: 2000,
            boxShadow: "0 2px 8px #6667"
          }}
        >
          {toast}
        </div>
      )}

      <SaveWord
        onSaved={() => {
          fetchWords();
          showToast("Đã lưu từ thành công!");
        }}
      />

      {msg && (
        <div
          style={{
            color: msg.startsWith("Đã duyệt") ? "green" : "red",
            marginBottom: 10
          }}
        >
          {msg}
        </div>
      )}

      {words.length === 0 ? (
        <div>Chưa có từ nào được lưu.</div>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse"
          }}
        >
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Từ tiếng Anh</th>
              <th style={{ textAlign: "left" }}>Nghĩa tiếng Việt</th>
              <th style={{ textAlign: "left" }}>Ngày lưu</th>
              <th>Duyệt</th>
            </tr>
          </thead>
          <tbody style={{ color: '#000' }}>
            {words.map(word => (
              <tr key={word.id}>
                <td>{word.word_en}</td>
                <td>{word.word_vi}</td>
                <td>{new Date(word.created_at).toLocaleString()}</td>
                <td>
                  <button
                    onClick={() => approveWord(word.id)}
                    style={{
                      background: "#44bd32",
                      color: "#fff",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: 6,
                      cursor: "pointer",
                      marginRight: 6
                    }}
                  >
                    Duyệt
                  </button>
                  <button
                    onClick={() => deleteWord(word.id)}
                    style={{
                      background: "#e84118",
                      color: "#fff",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: 6,
                      cursor: "pointer"
                    }}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
