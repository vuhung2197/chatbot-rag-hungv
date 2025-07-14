// 📁 src/component/WritingPractice.jsx
import React from 'react';
import WritingHistory from './WritingHistory';
import Chat from './Chat';

export default function WritingPractice() {
  return (
    <div>
      <h2 style={{ color: "#7137ea", marginBottom: 12 }}>✍️ Luyện viết tiếng Anh</h2>
      <p style={{ marginBottom: 24 }}>
        Viết một đoạn văn tiếng Anh (3–10 câu), hệ thống sẽ phản hồi và góp ý giúp bạn cải thiện kỹ năng viết.
      </p>
      <Chat /> {/* Sử dụng lại Chat có sẵn với modeChat="writing" */}
      <hr style={{ margin: "2em 0" }} />
      <WritingHistory />
    </div>
  );
}