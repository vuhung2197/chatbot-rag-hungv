// 📁 src/components/Register.jsx
import React, { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

export default function Register({ onRegister }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [role, setRole] = useState("user");

  async function handleRegister(e) {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/auth/register`, {
        name,
        email,
        password,
        role
      });
      const data = res.data;
      if (res.status === 200) {
        alert("Đăng ký thành công. Hãy đăng nhập.");
        onRegister();
      } else {
        setError(data.message || "Đăng ký thất bại");
      }
    } catch (err) {
      setError("Lỗi mạng hoặc máy chủ");
    }
  }

  return (
    <form onSubmit={handleRegister} style={{ background: "#fff", padding: 24, borderRadius: 12, boxShadow: "0 2px 12px #ccc" }}>
      <h2 style={{ marginBottom: 16, color: "#333" }}>📝 Đăng ký</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Tên" required style={{ width: "100%", marginBottom: 12, padding: 8 }} />
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required style={{ width: "100%", marginBottom: 12, padding: 8 }} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mật khẩu" required style={{ width: "100%", marginBottom: 16, padding: 8 }} />
      <label style={{ display: "block", marginTop: 12 }}>Vai trò:</label>
      <select value={role} onChange={e => setRole(e.target.value)} style={{ width: "100%", padding: 8, marginBottom: 16 }}>
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </select>
      <button type="submit" style={{ padding: "8px 16px", background: "#7137ea", color: "#fff", border: "none", borderRadius: 6 }}>Đăng ký</button>
    </form>
  );
}