import React from "react";

function HelpGuide() {
  return (
    <div style={{
      background: "#f6f9fc",
      border: "1px solid #d5e2ef",
      borderRadius: 10,
      padding: 18,
      marginBottom: 20,
      color: "#333"
    }}>
      <h3 style={{ marginTop: 0, color: "#1976d2" }}>Hướng dẫn sử dụng chatbot tra từ điển</h3>
      <ul style={{ paddingLeft: 18, marginBottom: 8 }}>
        <li>
          <b>Tra nghĩa tiếng Việt của từ tiếng Anh:</b>
          <br />
          <code>dịch từ [từ tiếng Anh] sang tiếng Việt</code><br />
          <code>dịch sang tiếng việt từ [từ tiếng Anh]</code><br />
          <code>nghĩa của [từ tiếng Anh] là gì</code><br />
          <code>từ [từ tiếng Anh] nghĩa tiếng việt là gì</code><br />
          <code>what does [từ tiếng Anh] mean?</code><br />
          <code>translate [từ tiếng Anh] to vietnamese </code><br />
          <code>[từ tiếng Anh]</code> (nếu chỉ cần tra nghĩa đơn giản)
          <br />
          <span style={{ color: "#40916c" }}>Ví dụ: <i>dịch từ <b>apple</b> sang tiếng Việt</i> → quả táo</span>
        </li>
        <li style={{ marginTop: 10 }}>
          <b>Tra nghĩa tiếng Anh của từ tiếng Việt:</b>
          <br />
          <code>dịch từ [từ tiếng Việt] sang tiếng Anh</code><br />
          <code>nghĩa tiếng Anh của [từ tiếng Việt] là gì</code>
          <br />
          <span style={{ color: "#40916c" }}>Ví dụ: <i>dịch từ <b>con mèo</b> sang tiếng Anh</i> → cat</span>
        </li>
        <li style={{ marginTop: 10 }}>
          <b>Lưu ý:</b>
          <ul style={{ marginLeft: 18 }}>
            <li>Nhập đúng <b>từ cần tra</b> (không cần dấu nháy, có thể viết hoa/thường)</li>
            <li>Hệ thống nhận diện nhiều cách hỏi (có thể hỏi tự nhiên)</li>
            <li>Nếu không tìm thấy kết quả, hãy gửi góp ý để bot học thêm</li>
          </ul>
        </li>
      </ul>
    </div>
  );
}

export default HelpGuide;
