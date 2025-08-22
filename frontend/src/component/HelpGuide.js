import React from 'react';

function HelpGuide() {
  return (
    <div style={{
      background: '#f6f9fc',
      border: '1px solid #d5e2ef',
      borderRadius: 10,
      padding: 18,
      marginBottom: 20,
      color: '#333'
    }}>
      <h3 style={{ marginTop: 0, color: '#1976d2' }}>Hướng dẫn sử dụng Chatbot Tra cứu Kiến Thức</h3>
      <ul style={{ paddingLeft: 18, marginBottom: 8 }}>
        <li>
          <b>Hỏi về các thông tin đã lưu trong hệ thống:</b>
          <br />
          <span style={{ color: '#333' }}>
            Bạn có thể hỏi về bất kỳ nội dung nào mà hệ thống đã được học hoặc admin đã nhập vào.<br />
            <i>Ví dụ:</i>
            <br />
            <code>Địa chỉ công ty TNHH ABC ở đâu?</code><br />
            <code>Số điện thoại liên hệ của công ty là gì?</code><br />
            <code>Nội quy làm việc của công ty ra sao?</code><br />
            <code>Chính sách bảo hiểm nhân viên như thế nào?</code><br />
            <code>Giờ làm việc công ty TNHH ABC?</code>
          </span>
        </li>
        <li style={{ marginTop: 10 }}>
          <b>Hỏi về quy định, thông báo hoặc các chủ đề đã lưu:</b>
          <br />
          <span style={{ color: '#333' }}>
            <code>Nội dung thông báo nghỉ lễ mới nhất là gì?</code><br />
            <code>Các quy định về sử dụng email nội bộ</code>
          </span>
        </li>
        <li style={{ marginTop: 10 }}>
          <b>Lưu ý:</b>
          <ul style={{ marginLeft: 18 }}>
            <li>Bạn có thể hỏi tự nhiên như nói chuyện với người thật.</li>
            <li>Chỉ những thông tin đã được lưu trong hệ thống hoặc đã “dạy” cho bot mới được trả lời.</li>
            <li>Nếu bot trả lời “Xin lỗi, tôi chưa có kiến thức phù hợp...” tức là nội dung này chưa được bổ sung.</li>
            <li>Nếu cần bổ sung kiến thức, hãy liên hệ admin hoặc gửi góp ý.</li>
          </ul>
        </li>
      </ul>
      <div style={{ marginTop: 16, color: '#1976d2', fontWeight: 500 }}>
        📚 <i>Hãy hỏi bot về những gì bạn muốn biết trong phạm vi kiến thức đã được lưu trữ!</i>
      </div>
    </div>
  );
}

export default HelpGuide;
