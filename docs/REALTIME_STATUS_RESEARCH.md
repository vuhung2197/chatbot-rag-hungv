# 📡 Nghiên Cứu & Giải Pháp: Realtime Status Updates (WebSocket vs SSE)

Để hiển thị trạng thái "Đang tìm kiếm trên internet...", "Đang suy luận...", hoặc hiệu ứng gõ chữ (typing effect), hệ thống cần cơ chế giao tiếp thời gian thực từ Server về Client.

Dưới đây là so sánh và giải pháp đề xuất tối ưu cho Chatbot hiện tại.

---

## 1. So Sánh Công Nghệ

| Tiêu chí | **Server-Sent Events (SSE)** | **WebSocket (Socket.io)** |
| :--- | :--- | :--- |
| **Giao thức** | HTTP chuẩn (Text Streaming). | Giao thức TCP riêng. |
| **Hướng dữ liệu** | Một chiều: Server -> Client. (Đúng nhu cầu hiện tại). | Hai chiều: Server <-> Client. |
| **Độ phức tạp** | Thấp. Dùng được ngay trên hạ tầng HTTP/REST hiện có. | Cao. Cần cài thư viện riêng, setup handshake server, quản lý connection state. |
| **Proxy/Firewall** | Rất tốt (như request web bình thường). | Thường bị chặn bởi Firewall công ty hoặc Proxy khó tính. |
| **Reconnection** | Browser tự động reconnect. | Cần thư viện quản lý (như socket.io-client). |
| **Sử dụng bởi** | **OpenAI (ChatGPT), Anthropic (Claude)**. | Các ứng dụng Chat realtime (Facebook Messenger, Discord). |

### 👉 Kết Luận: Chọn HTTP Streaming (SSE Style)
Vì chúng ta đang xây dựng bot dạng "Hỏi - Đáp" (Request - Response Streaming) chứ không phải chatroom nhiều người, **SSE (hoặc HTTP Chunked Streaming)** là lựa chọn chuẩn công nghiệp (giống cách ChatGPT hoạt động).

Ưu điểm:
- Không cần sửa cấu trúc server quá nhiều (vẫn dùng Express Controller).
- Frontend có thể consume stream dễ dàng.
- Nhẹ nhàng, không tốn tài nguyên duy trì kết nối idle lâu dài như Socket.

---

## 2. Kiến Trúc Đề Xuất (HTTP Streaming)

Thay vì endpoint trả về một cục JSON khổng lồ (`res.json(...)`), chúng ta sẽ chuyển sang trả về **Stream các sự kiện**.

### Cấu Trúc Dữ Liệu Stream (Format: `data: JSON\n\n`)

Luồng dữ liệu sẽ diễn ra như sau trong **1 Request duy nhất**:

1.  **Event 1 (Status):** `data: {"type": "status", "content": "🔍 Đang phân tích câu hỏi..."}\n\n`
2.  **Event 2 (Status):** `data: {"type": "status", "content": "🌍 Đang tìm kiếm trên Google..."}\n\n`
3.  **Event 3 (Token):** `data: {"type": "token", "content": "Theo"}\n\n`
4.  **Event 4 (Token):** `data: {"type": "token", "content": " thông"}\n\n`
...
5.  **Event N (Done):** `data: {"type": "done", "metadata": {...}}\n\n`

---

## 3. Kế Hoạch Triển Khai Chi Tiết

### A. Backend (`chat.controller.js`)

1.  **Headers:**
    Thiết lập header để báo hiệu đây là dữ liệu stream:
    ```javascript
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    ```

2.  **Helper `sendEvent`:**
    Tạo hàm helper để gửi data chunks:
    ```javascript
    const sendEvent = (res, type, data) => {
        res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    };
    ```

3.  **Cập nhập Logic Xử Lý:**
    Thay vì `return res.json(...)`, ta sẽ gọi `sendEvent` tại từng bước:
    - Khi Router xong: `sendEvent(res, 'status', { message: 'Đang tìm kiếm...' })`
    - Khi Web Search xong: `sendEvent(res, 'sources', { urls: [...] })`
    - Khi LLM chạy: Cần update hàm `callLLM` để hỗ trợ `stream: true` từ OpenAI.

### B. Frontend (`Chat.js`)

Hiện tại `axios` không hỗ trợ tốt việc đọc stream từng chút một. Chúng ta cần dùng `fetch` native hoặc thư viện chuyên dụng như `@microsoft/fetch-event-source` (được khuyên dùng vì nó tự handle POST request streaming rất tốt).

**Code Frontend Mẫu (dùng fetch native):**

```javascript
const response = await fetch(`${API_URL}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: input })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n\n');
    
    for (const line of lines) {
        if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'status') {
                setLoadingStatus(data.content); // "Đang tìm kiếm..."
            } else if (data.type === 'token') {
                setBotReply(prev => prev + data.content); // Typing effect
            }
        }
    }
}
```

---

## 4. Các Thay Đổi Cần Thiết

1.  [Backend] Tạo endpoint mới `/chat/stream` (để không làm hỏng tính năng chat cũ đang chạy ổn định).
2.  [Backend] Update `llmService.js` để hỗ trợ streaming response từ OpenAI/LLM Provider.
3.  [Frontend] Cài đặt logic đọc stream trong `Chat.js`.
