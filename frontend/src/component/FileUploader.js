import React, { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

export default function FileUploader() {
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState('');

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const res = await axios.post(`${API_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = res.data;
    setMsg(data.message || data.error);
    setFile(null);
  };

  return (
    <div
      style={{
        margin: '1em 0',
        padding: '1em',
        border: '1px solid #ccc',
        borderRadius: 8,
      }}
    >
      <h3>📄 Tải file để huấn luyện</h3>
      <input type='file' onChange={e => setFile(e.target.files[0])} />
      <button onClick={handleUpload} style={{ marginLeft: 10 }}>
        Upload
      </button>
      {msg && <p>{msg}</p>}
    </div>
  );
}
