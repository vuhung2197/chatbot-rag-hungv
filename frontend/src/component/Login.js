// 📁 src/components/Login.jsx
import React, { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });
      const data = res.data;
      if (res.status === 200) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.role);
        localStorage.setItem("userId", data.userId);
        onLogin(data.role);
      } else {
        setError(data.message || "Đăng nhập thất bại");
      }
    } catch (err) {
      setError("Lỗi mạng hoặc máy chủ");
    }
  }

  return (
    <form onSubmit={handleLogin} style={{ background: "#fff", padding: 24, borderRadius: 12, boxShadow: "0 2px 12px #ccc" }}>
      <h2 style={{ marginBottom: 16, color: "#333" }}>🔐 Đăng nhập</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required style={{ width: "100%", marginBottom: 12, padding: 8 }} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mật khẩu" required style={{ width: "100%", marginBottom: 16, padding: 8 }} />
      <button type="submit" style={{ padding: "8px 16px", background: "#7137ea", color: "#fff", border: "none", borderRadius: 6 }}>Đăng nhập</button>
    </form>
  );
}