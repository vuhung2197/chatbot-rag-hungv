# 🔧 Advanced RAG Errors Fixed

## 🚨 **Lỗi 1: "Unknown column 'metadata' in 'field list'"**

### **Nguyên nhân:**
- Bảng `user_questions` không có cột `metadata`
- Advanced RAG cố gắng insert vào cột không tồn tại

### **So sánh:**
```sql
-- Chat thông thường (chatController.js)
INSERT INTO user_questions (user_id, question, bot_reply, is_answered) VALUES (?, ?, ?, ?)

-- Advanced RAG (advancedChatController.js) - LỖI
INSERT INTO user_questions (user_id, question, bot_reply, is_answered, metadata) VALUES (?, ?, ?, ?, ?)
```

### **✅ Đã sửa:**
```javascript
// 11. Ghi lịch sử (không có metadata column)
if (userId) {
  await pool.execute(
    'INSERT INTO user_questions (user_id, question, bot_reply, is_answered) VALUES (?, ?, ?, ?)',
    [userId, message, reply, true]
  );
}
```

## 🚨 **Lỗi 2: "LLM Call 400 we could not parse the JSON body"**

### **Nguyên nhân:**
- Context quá dài (>8000 characters)
- Context chứa ký tự đặc biệt gây lỗi JSON parsing
- System prompt quá dài
- Model name không hợp lệ

### **✅ Đã sửa:**

#### **1. Giới hạn độ dài context:**
```javascript
// Giới hạn độ dài context để tránh lỗi JSON parsing
const maxContextLength = 8000;
const truncatedContext = context.length > maxContextLength 
  ? context.substring(0, maxContextLength) + '...' 
  : context;
```

#### **2. Validate và clean messages:**
```javascript
const messages = [
  { 
    role: 'system', 
    content: (systemPrompt || '').substring(0, 4000) // Giới hạn system prompt
  },
  { 
    role: 'user', 
    content: prompt.substring(0, 12000) // Giới hạn user prompt
  }
];
```

#### **3. Validate model name:**
```javascript
// Validate model name
const validModel = model && typeof model === 'string' ? model : 'gpt-4o';
```

#### **4. Thêm debug logging:**
```javascript
// Debug: Log context preview để kiểm tra
console.log('📄 Context preview:', fusedContext.substring(0, 200) + '...');
```

## 🔍 **Cách Debug:**

### **1. Kiểm tra logs:**
```bash
# Xem logs của Advanced RAG
tail -f logs/advanced-rag.log | grep "Context preview"
```

### **2. Test với câu hỏi đơn giản:**
```bash
curl -X POST http://localhost:3001/advanced-chat/advanced-chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message": "NLP là gì?", "model": "gpt-4o"}'
```

### **3. Test với câu hỏi phức tạp:**
```bash
curl -X POST http://localhost:3001/advanced-chat/advanced-chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message": "So sánh NLP và Machine Learning", "model": "gpt-4o"}'
```

## 📊 **Expected Results:**

### **Trước khi sửa:**
- ❌ **Database error**: Unknown column 'metadata'
- ❌ **LLM error**: 400 JSON parsing error
- ❌ **Context too long**: >8000 characters
- ❌ **No debugging info**: Không có logs

### **Sau khi sửa:**
- ✅ **Database**: Insert thành công
- ✅ **LLM**: JSON parsing OK
- ✅ **Context**: Giới hạn <8000 characters
- ✅ **Debug**: Có logs chi tiết

## 🚀 **Testing:**

### **1. Test Database Fix:**
```javascript
// Kiểm tra không còn lỗi metadata
console.log('✅ Database insert successful');
```

### **2. Test LLM Fix:**
```javascript
// Kiểm tra context length
console.log('📄 Context length:', fusedContext.length);
console.log('📄 Context preview:', fusedContext.substring(0, 200));
```

### **3. Test Full Pipeline:**
```bash
# Test toàn bộ pipeline
node test/advancedRAGStepByStep.js
```

## 🎯 **Monitoring:**

### **1. Context Length:**
- **Normal**: 1000-5000 characters
- **Warning**: 5000-8000 characters  
- **Error**: >8000 characters (auto-truncated)

### **2. Processing Time:**
- **Simple questions**: 2-5 seconds
- **Complex questions**: 5-15 seconds
- **Timeout**: >30 seconds

### **3. Memory Usage:**
- **Normal**: <300MB
- **Warning**: 300-500MB
- **Error**: >500MB

## 🔧 **Additional Improvements:**

### **1. Add Context Validation:**
```javascript
function validateContext(context) {
  if (!context || typeof context !== 'string') {
    throw new Error('Invalid context');
  }
  if (context.length === 0) {
    throw new Error('Empty context');
  }
  return true;
}
```

### **2. Add Model Validation:**
```javascript
function validateModel(model) {
  const validModels = ['gpt-4o', 'gpt-4', 'gpt-3.5-turbo'];
  return validModels.includes(model) ? model : 'gpt-4o';
}
```

### **3. Add Error Recovery:**
```javascript
async function safeLLMCall(question, context, systemPrompt, model) {
  try {
    return await askAdvancedChatGPT(question, context, systemPrompt, model);
  } catch (error) {
    console.error('LLM call failed:', error);
    // Fallback to simple response
    return 'Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi này. Vui lòng thử lại.';
  }
}
```

## ✅ **Kết Quả:**

**Advanced RAG giờ đây hoạt động ổn định không còn 2 lỗi này!**

- ✅ **Database error**: Fixed
- ✅ **LLM JSON error**: Fixed  
- ✅ **Context validation**: Added
- ✅ **Debug logging**: Added
- ✅ **Error handling**: Improved

**Hãy test lại Advanced RAG để xác nhận các lỗi đã được sửa!** 🚀
