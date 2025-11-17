// 📁 src/components/Register.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useToastContext } from '../context/ToastContext';
import shared from '../styles/shared.module.css';
import forms from '../styles/forms.module.css';
import buttons from '../styles/buttons.module.css';
import messages from '../styles/messages.module.css';
import styles from '../styles/components/Register.module.css';

const API_URL = process.env.REACT_APP_API_URL;

export default function Register({ onRegister }) {
  const { success: showSuccess } = useToastContext();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [role, setRole] = useState('user');

  async function handleRegister(e) {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/auth/register`, {
        name,
        email,
        password,
        role,
      });
      const data = res.data;
      if (res.status === 200) {
        showSuccess('Đăng ký thành công. Hãy đăng nhập.');
        onRegister();
      } else {
        setError(data.message || 'Đăng ký thất bại');
      }
    } catch (err) {
      setError('Lỗi mạng hoặc máy chủ');
    }
  }

  return (
    <form
      onSubmit={handleRegister}
      className={styles.form}
    >
      <h2 className={shared.titleLarge}>📝 Đăng ký</h2>
      {error && <p className={messages.error}>{error}</p>}
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder='Tên'
        required
        className={`${forms.input} ${shared.marginBottom}`}
      />
      <input
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder='Email'
        required
        className={`${forms.input} ${shared.marginBottom}`}
      />
      <input
        type='password'
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder='Mật khẩu'
        required
        className={`${forms.input} ${shared.marginBottom}`}
      />
      <label className={forms.label}>Vai trò:</label>
      <select
        value={role}
        onChange={e => setRole(e.target.value)}
        className={`${forms.select} ${shared.marginBottom}`}
      >
        <option value='user'>User</option>
        <option value='admin'>Admin</option>
      </select>
      <button
        type='submit'
        className={`${buttons.button} ${buttons.buttonPrimary} ${buttons.buttonFullWidth}`}
      >
        Đăng ký
      </button>
    </form>
  );
}
