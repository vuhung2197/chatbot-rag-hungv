import React, { useState } from 'react';

function Feedback() {
  const [message, setMessage] = useState('');
  const [suggested, setSuggested] = useState('');
  const [explanation, setExplanation] = useState('');
  const [noti, setNoti] = useState('');

  const sendFeedback = async () => {
    if (!message || !suggested) {
      setNoti('Hãy điền đầy đủ nội dung!');
      return;
    }
    const res = await fetch('http://localhost:3001/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, suggested_reply: suggested, explanation })
    });
    const data = await res.json();
    setNoti(data.message);
    setMessage(''); setSuggested(''); setExplanation('');
  };

  return (
    <div>
      <div>
        <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Câu hỏi/vấn đề của bạn" style={{ width: '98%', marginBottom: 8 }} />
        <input value={suggested} onChange={e => setSuggested(e.target.value)} placeholder="Câu trả lời/bot nên nói gì?" style={{ width: '98%', marginBottom: 8 }} />
        <input value={explanation} onChange={e => setExplanation(e.target.value)} placeholder="Giải thích (nếu có)" style={{ width: '98%', marginBottom: 8 }} />
      </div>
      <button onClick={sendFeedback}>Gửi góp ý</button>
      <div style={{ color: 'green', marginTop: 8 }}>{noti}</div>
    </div>
  );
}

export default Feedback;
