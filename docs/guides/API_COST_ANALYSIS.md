# Phân Tích Chi Phí API và Cách Tối Ưu Hóa

## 💰 CÁC API ĐANG SỬ DỤNG BẰNG PHÍ (COST MONEY)

### 🔴 **1. OpenAI Embeddings API** - **TỐN PHÍ BẮT BUỘC**
**📁 Location**: `backend/services/embeddingVector.js`  
**💰 Chi phí**: 
- Model `text-embedding-3-small`: **$0.02 per 1M tokens** (đầu vào)
- Rẻ nhất trong các model embedding của OpenAI
- Ví dụ: 10,000 câu hỏi ≈ 500,000 tokens ≈ **$0.01**

**Tần suất**: **MỖI câu hỏi** đều gọi API này  
**Không thể tránh**: Đây là lõi của RAG system, cần để tìm semantic similarity

**Cách tối ưu**:
- ✅ Cache embeddings cho câu hỏi tương tự
- ✅ Batch multiple questions cùng lúc
- ⚠️ Khó thay thế hoàn toàn (cần model embedding khác)

---

### 🔴 **2. OpenAI Chat/Completion APIs** - **TỐN PHÍ TÙY CHỌN**

#### A. OpenAI Chat Completions (cho Chat Response)
**📁 Location**: Khi `model.url` là `https://api.openai.com`  
**💰 Chi phí**:
- GPT-4 Turbo: **$10-30 per 1M input tokens**, **$30 per 1M output tokens**
- GPT-3.5 Turbo: **$0.50-1.5 per 1M input tokens**, **$2 per 1M output tokens**

**Tần suất**: Mỗi câu hỏi (nếu dùng OpenAI model)  
**Khi nào tốn phí**:
- ✅ Nếu chọn OpenAI model từ Model Manager
- ❌ Nếu chọn Ollama local → **MIỄN PHÍ**

#### B. OpenAI Completions (cho Word Suggestions)
**📁 Location**: `backend/controllers/suggestController.js`  
**💰 Chi phí**: 
- GPT-3.5-turbo-instruct: **$1.5 per 1M input tokens**, **$2 per 1M output tokens**

**Tần suất**: Tùy chọn (khi user dùng autocomplete)  
**Tính năng**: Không cần thiết, có thể tắt

#### C. OpenAI Chat Completions (cho Translations)
**📁 Location**: `backend/controllers/chatController.js` (translateSingleWord)  
**💰 Chi phí**: GPT-4o - **$2.5-$10 per 1M tokens** (tùy input/output)

**Tần suất**: Tùy chọn (khi dịch từ)  
**Tính năng**: Không cần thiết, ít khi được gọi

---

## 🟢 **3. Ollama Local LLM** - **MIỄN PHÍ**

**📁 Location**: Khi `model.url` là `http://localhost:11434` hoặc local Ollama server  
**💰 Chi phí**: **$0** (chạy local trên máy của bạn)

**Tần suất**: Mỗi câu hỏi (nếu dùng Ollama)  
**Cách sử dụng**: 
1. Cài đặt Ollama: `ollama install llama3.2`
2. Trong Model Manager, thêm model với URL: `http://localhost:11434`
3. Chọn model đó → **KHÔNG TỐN PHÍ**

---

## 📊 TỔNG KẾT CHI PHÍ

### Scenario 1: Dùng 100% OpenAI
```
Mỗi câu hỏi:
- OpenAI Embeddings: ~$0.00001 (rất rẻ)
- OpenAI Chat (GPT-4o): ~$0.01-0.03 (đắt!)
Tổng: ~$0.02 per câu hỏi
100 câu hỏi = $2-3
```

### Scenario 2: Ollama + OpenAI Embeddings (KHUYẾN NGHỊ)
```
Mỗi câu hỏi:
- OpenAI Embeddings: ~$0.00001 (rất rẻ)
- Ollama LLM: $0 (miễn phí)
Tổng: ~$0.00001 per câu hỏi
10,000 câu hỏi = ~$0.10
```

### Scenario 3: 100% Local (khó khăn)
```
Yêu cầu: Thay thế OpenAI Embeddings bằng model local
Chi phí: $0
Khó khăn: Cần cài đặt embedding model (ví dụ: BGE-large-en-v1.5)
```

---

## 🎯 KHUYẾN NGHỊ TỐI ƯU CHI PHÍ

### ✅ **Nên làm**:

1. **Sử dụng Ollama cho Chat Response** ⭐⭐⭐
   - Giảm 99% chi phí API
   - Chất lượng vẫn tốt với LLaMA 3.2, Mistral 7B
   - Hướng dẫn:
     ```bash
     # Cài đặt Ollama
     curl -fsSL https://ollama.ai/install.sh | sh
     
     # Cài model (chọn 1)
     ollama pull llama3.2        # Nhẹ, nhanh
     ollama pull mistral:7b      # Tốt, vừa
     ollama pull codellama:7b    # Mạnh cho code
     
     # Trong Model Manager, thêm:
     Name: Local LLaMA
     URL: http://localhost:11434
     Model: llama3.2
     ```

2. **Giữ lại OpenAI Embeddings** ⭐⭐⭐
   - Rẻ nhất: $0.02 per 1M tokens
   - Chất lượng tốt
   - Khó thay thế

3. **Tắt các tính năng không cần thiết**:
   - Word Suggestions (tốn phí nhưng ít dùng)
   - Translations (có thể bỏ)
   - Code:
     ```javascript
     // Để tắt suggestions, xóa hoặc comment
     // backend/controllers/suggestController.js
     ```

4. **Cache Embeddings**:
   - Lưu embeddings của câu hỏi tương tự
   - Tránh gọi lại API cho câu hỏi đã trả lời
   - Tiết kiệm ~30-50% chi phí embeddings

5. **Monitor API Usage**:
   - Check OpenAI dashboard thường xuyên
   - Set budget alerts
   - Track số lượng requests

### ❌ **Không nên**:

1. **Dùng GPT-4 Turbo cho production** (trừ khi có budget lớn)
   - Đắt 10-20x so với GPT-3.5
   - Chỉ dùng khi cần độ chính xác cực cao

2. **Không cache bất cứ gì**
   - Tăng chi phí không cần thiết

3. **Dùng OpenAI cho tất cả**
   - Chi phí rất cao nếu user base lớn

---

## 📈 ƯỚC TÍNH CHI PHÍ THEO USAGE

### 10 người dùng, mỗi người 50 câu hỏi/tháng:
```
Scenario OpenAI: ~$10-20/tháng
Scenario Ollama + Embeddings: ~$0.10/tháng
```

### 100 người dùng, mỗi người 100 câu hỏi/tháng:
```
Scenario OpenAI: ~$200-400/tháng
Scenario Ollama + Embeddings: ~$1/tháng
```

### 1000 người dùng:
```
Scenario OpenAI: ~$2000-4000/tháng
Scenario Ollama + Embeddings: ~$10/tháng
```

---

## 🚀 HƯỚNG DẪN SETUP OLLAMA (MIỄN PHÍ)

### Bước 1: Cài đặt Ollama
```bash
# Linux/Mac
curl -fsSL https://ollama.ai/install.sh | sh

# Windows: Download từ https://ollama.ai/download
```

### Bước 2: Pull model
```bash
ollama pull llama3.2  # Model nhẹ, nhanh
# hoặc
ollama pull mistral    # Model tốt hơn
```

### Bước 3: Thêm vào Model Manager
1. Mở Chat interface
2. Click "Quản lý Model" button
3. Thêm model mới:
   - Name: `Local LLaMA`
   - URL: `http://localhost:11434`
   - Model: `llama3.2`
   - Temperature: `0.7`
   - MaxTokens: `1024`
4. Click "Chọn model này"

### Bước 4: Test
- Gửi một câu hỏi test
- Kiểm tra console log: `🔗 Calling LLM: { url: 'http://localhost:11434/chat/completions' }`
- Nếu thấy log này → Đang dùng Ollama (miễn phí)

---

## 🛡️ BẢO VỆ NGÂN SÁCH

### 1. Set Usage Limits trong OpenAI Dashboard:
```
Settings → Organization → Usage Limits
- Hard Limit: $50/tháng (warning khi tới $45)
- Soft Limit: $30/tháng
```

### 2. Monitor:
```javascript
// Thêm vào backend để log usage
console.log('💰 Total OpenAI cost this hour:', calculateCost());
```

### 3. Block đúng lúc:
- Nếu vượt quá budget → switch to Ollama
- Alert khi cost > threshold

---

## 📌 TÓM TẮT

| API | Chi Phí | Tần Suất | Có thể tránh? | Khuyến nghị |
|-----|---------|----------|--------------|-------------|
| **OpenAI Embeddings** | $0.02/1M tokens | Mỗi câu hỏi | ❌ Khó | ✅ Giữ lại |
| **OpenAI Chat (GPT-4)** | $2.5-30/1M tokens | Mỗi câu hỏi | ✅ Có | ❌ Quá đắt |
| **OpenAI Chat (GPT-3.5)** | $0.5-2/1M tokens | Mỗi câu hỏi | ✅ Có | ⚠️ Tạm thời |
| **Ollama Local** | $0 | Mỗi câu hỏi | - | ✅ **KHUYẾN NGHỊ** |
| Word Suggestions | ~$1.5/1M tokens | Tùy chọn | ✅ Có | ❌ Tắt đi |
| Translations | ~$2.5/1M tokens | Tùy chọn | ✅ Có | ❌ Tắt đi |

---

**💡 KẾT LUẬN**:
- **Chi phí chính**: OpenAI Embeddings (~$0.00001/câu) + ChatGPT Response (~$0.01-0.03/câu nếu dùng OpenAI)
- **Giải pháp tốt nhất**: Ollama cho chat + OpenAI cho embeddings
- **Tiết kiệm**: 99% chi phí so với dùng 100% OpenAI

**Tạo bởi**: AI Assistant  
**Ngày**: $(date)  
**Version**: 1.0

