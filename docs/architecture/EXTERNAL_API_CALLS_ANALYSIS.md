# Phân Tích Các Lời Gọi API Bên Ngoài Trong Project

## 📋 Tổng Quan

Project của bạn đang gọi **các API bên ngoài** tại nhiều vị trí khác nhau, chủ yếu liên quan đến:
- **OpenAI API**: Cho embeddings và chat completions
- **LLM APIs khác**: Thông qua hàm `callLLM` (có thể là Ollama, OpenAI, hoặc bất kỳ LLM API nào)

---

## 🔍 Chi Tiết Các Vị Trí Gọi API Ngoài

### 1. **OpenAI Embeddings API** 
📁 `backend/services/embeddingVector.js`

```javascript
// Line 10-17
export async function getEmbedding(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  const response = await axios.post(
    'https://api.openai.com/v1/embeddings',  // 🌐 EXTERNAL API CALL
    { input: text, model: 'text-embedding-3-small' },
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );
  return response.data.data[0].embedding;
}
```

**Mục đích**: Tạo embedding vector cho text để tìm kiếm semantic similarity
**Khi nào được gọi**: Mỗi khi user gửi câu hỏi (regular RAG và Advanced RAG)

---

### 2. **OpenAI Chat Completions API** (Cho Translations)
📁 `backend/controllers/chatController.js`

```javascript
// Line 304-309 trong hàm translateSingleWord
const completion = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: prompt }],
  max_tokens: 100,
  temperature: 0.3,
});
```

**Mục đích**: Dịch từ/câu tiếng Anh sang tiếng Việt
**Khi nào được gọi**: Khi gọi hàm `translateSingleWord` hoặc `translateWordByWord`

---

### 3. **OpenAI Completions API** (Cho Word Suggestions)
📁 `backend/controllers/suggestController.js`

```javascript
// Line 16-31 trong hàm suggestNextWord
const openaiRes = await axios.post(
  'https://api.openai.com/v1/completions',  // 🌐 EXTERNAL API CALL
  {
    model: 'gpt-3.5-turbo-instruct',
    prompt,
    max_tokens: 3,
    temperature: 0.7,
    logprobs: 5,
    stop: null,
  },
  {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
  }
);
```

**Mục đích**: Gợi ý từ tiếp theo cho autocomplete
**Khi nào được gọi**: Khi user sử dụng tính năng autocomplete/suggestion

---

### 4. **Generic LLM API Call** (Cho Chat Responses)
📁 `backend/controllers/chatController.js`

```javascript
// Line 408-423 trong hàm callLLM
const response = await axios.post(
  fullUrl,  // 🌐 EXTERNAL API CALL - có thể là Ollama, OpenAI, v.v.
  {
    model: nameModel,
    messages,
    temperature: temperatureModel,
    max_tokens: maxTokensModel,
  },
  {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 180000,
  }
);
```

**Mục đích**: Gửi context và câu hỏi đến LLM để tạo phản hồi
**URL động**: Tùy vào model được chọn (có thể là Ollama local hoặc OpenAI)
**Khi nào được gọi**: 
- Mỗi khi user chat (regular RAG)
- Mỗi khi user chat với Advanced RAG mode

---

## 📊 Tổng Kết

### Các API đang được gọi:

| File | Chức năng | API Endpoint | Mục đích | Tần suất |
|------|-----------|--------------|----------|----------|
| `embeddingVector.js` | Tạo embeddings | `https://api.openai.com/v1/embeddings` | Vector search | **Mỗi câu hỏi** |
| `chatController.js` | Dịch từ | `openai.chat.completions.create` | Translation | Tùy chọn |
| `suggestController.js` | Gợi ý từ | `https://api.openai.com/v1/completions` | Autocomplete | Tùy chọn |
| `chatController.js` | Chat response | `{model.url}/chat/completions` | Phản hồi bot | **Mỗi câu hỏi** |
| `advancedChatController.js` | Chat response (Advanced) | `{model.url}/chat/completions` | Phản hồi bot | Mỗi câu hỏi (Advanced mode) |

### ⚠️ Lưu Ý Quan Trọng:

1. **Mỗi câu hỏi của user tạo ra 2-3 lời gọi API**:
   - 1 lần gọi `getEmbedding()` → OpenAI Embeddings API
   - 1 lần gọi `callLLM()` → LLM API (Ollama/OpenAI)

2. **Advanced RAG có thể gọi nhiều lần hơn**:
   - Multiple retrieval stages
   - Multiple semantic operations
   - Mỗi operation có thể tạo thêm embeddings

3. **API Keys cần thiết**:
   - `OPENAI_API_KEY` cho embeddings và completions
   - Model API key cho chat completions (nếu dùng OpenAI)

---

## 🎯 Khuyến Nghị

Nếu muốn giảm phụ thuộc vào API bên ngoài:

1. **Sử dụng local models**: 
   - Cài đặt Ollama local
   - Deploy một local LLM API
   - Chỉ dùng OpenAI cho embeddings (hoặc thay thế bằng local embedding model)

2. **Cache embeddings**:
   - Lưu embeddings của các câu hỏi thường gặp
   - Tránh gọi lại API cho câu hỏi tương tự

3. **Batch processing**:
   - Xử lý nhiều câu hỏi cùng lúc để giảm số lần gọi API

4. **Fallback mechanisms**:
   - Đã có sẵn các cơ chế error handling
   - Cần thêm fallback khi API bị lỗi

---

**Tạo bởi**: AI Assistant  
**Ngày**: $(date)  
**Version**: 1.0

