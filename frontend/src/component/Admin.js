import React, { useState, useEffect } from 'react';

function Admin() {
  const [feedbacks, setFeedbacks] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3001/feedbacks')
      .then(res => res.json())
      .then(data => setFeedbacks(data));
  }, []);

  const approveFeedback = async (id) => {
    await fetch('http://localhost:3001/approve-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    // Reload
    fetch('http://localhost:3001/feedbacks')
      .then(res => res.json())
      .then(data => setFeedbacks(data));
  };


  return (
    <div>
      <h3>Danh sách góp ý ({feedbacks.length})</h3>
      <div style={{ maxHeight: 350, overflowY: 'auto', border: '1px solid #eee', padding: 10 }}>
        {feedbacks.map((fb, idx) => (
          <div key={idx} style={{ marginBottom: 15, background: fb.approved ? '#e6ffe6' : '#fff' }}>
            <b>Message:</b> {fb.message} <br />
            <b>Suggested:</b> {fb.suggested_reply} <br />
            <b>Explanation:</b> {fb.explanation || '---'} <br />
            <b>Time:</b> {new Date(fb.time).toLocaleString()} <br />
            <b>Approved:</b> {fb.approved ? '✔' : '✗'}
            {!fb.approved && (
              <button style={{ marginLeft: 10 }} onClick={() => approveFeedback(fb.id)}>Duyệt góp ý</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Admin;
