import React, { useState } from "react";

export default function SaveWord({ onSaved }) {
  const [show, setShow] = useState(false);
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("success"); // "success" | "error"

  const save = async () => {
    if (!word.trim()) {
      setMsgType("error");
      setMsg("Bạn chưa nhập từ tiếng Anh!");
      return;
    }
    try {
      const res = await fetch("http://localhost:3001/save-word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word_en: word, word_vi: meaning })
      });
      const data = await res.json();
      if (res.ok) {
        setMsgType("success");
        setMsg("Đã lưu thành công!");
        setWord(""); setMeaning("");
        if (onSaved) onSaved();
        setTimeout(() => {
          setShow(false);
          setMsg("");
        }, 1200);
      } else {
        setMsgType("error");
        setMsg(data.message || "Có lỗi khi lưu!");
      }
    } catch (err) {
      setMsgType("error");
      setMsg("Không kết nối được tới server!");
    }
  };

  return (
    <>
      <button onClick={() => setShow(true)} style={{marginBottom: 12}}>+ Lưu từ mới</button>
      {show && (
        <div style={{
          position: "fixed", left: 0, top: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.2)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000
        }}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 8, minWidth: 320, boxShadow: "0 2px 12px #999" }}>
            <h4>Lưu từ mới</h4>
            <input value={word} onChange={e => setWord(e.target.value)}
              placeholder="Từ tiếng Anh"
              style={{ width: "100%", marginBottom: 8, padding: 8, borderRadius: 4, border: "1px solid #ccc" }} />
            <input value={meaning} onChange={e => setMeaning(e.target.value)}
              placeholder="Nghĩa tiếng Việt (tuỳ chọn)"
              style={{ width: "100%", marginBottom: 8, padding: 8, borderRadius: 4, border: "1px solid #ccc" }} />
            <div style={{
              color: msgType === "success" ? "green" : "red",
              minHeight: 22,
              marginBottom: 4,
              fontWeight: 500
            }}>
              {msg}
            </div>
            <div style={{ marginTop: 8 }}>
              <button onClick={save} style={{ marginRight: 10, padding: "6px 18px", background: "#7137ea", color: "#fff", border: "none", borderRadius: 6 }}>Lưu</button>
              <button onClick={() => {setShow(false); setMsg("");}} style={{ padding: "6px 18px" }}>Huỷ</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
