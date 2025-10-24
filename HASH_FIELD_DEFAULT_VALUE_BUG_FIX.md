# 🐛 Hash Field Default Value Bug Fix

## 🚨 **Lỗi Đã Phát Hiện**

### **Error Message:**
```
field 'hash' doesn't have a default value
```

## 🔍 **Nguyên Nhân**

### **Vấn đề:**
Trong `advancedChatController.js`, function `logUnanswered` thiếu field `hash` khi insert vào bảng `unanswered_questions`.

### **Database Schema:**
```sql
ALTER TABLE unanswered_questions ADD COLUMN hash CHAR(64) NOT NULL UNIQUE AFTER question;
```

**Field `hash` được định nghĩa là `NOT NULL` nhưng không có default value.**

### **Luồng lỗi:**
1. **Advanced RAG**: Gặp câu hỏi không trả lời được
2. **Backend**: Gọi `logUnanswered(question)`
3. **Database**: Cố gắng insert với thiếu field `hash`
4. **MySQL**: Báo lỗi "field 'hash' doesn't have a default value"

## ✅ **Giải Pháp**

### **Before (SAI):**
```javascript
// ❌ SAI: Thiếu field hash
async function logUnanswered(question) {
  try {
    await pool.execute(
      'INSERT INTO unanswered_questions (question, created_at) VALUES (?, NOW())',
      [question]
    );
  } catch (err) {
    console.error('❌ Lỗi log unanswered:', err);
  }
}
```

### **After (ĐÚNG):**
```javascript
// ✅ ĐÚNG: Có đầy đủ field hash
async function logUnanswered(question) {
  try {
    const hash = hashQuestion(question);
    const [rows] = await pool.execute(
      'SELECT 1 FROM unanswered_questions WHERE hash = ? LIMIT 1',
      [hash]
    );
    if (rows.length === 0) {
      await pool.execute(
        'INSERT INTO unanswered_questions (question, hash, created_at) VALUES (?, ?, NOW())',
        [question, hash]
      );
    }
  } catch (err) {
    console.error('❌ Lỗi log unanswered:', err);
  }
}
```

## 🔧 **Chi Tiết Thay Đổi**

### **1. File: `backend/controllers/advancedChatController.js`**

#### **Thay đổi 1: Thêm import hashQuestion**
```javascript
// ✅ Thêm import
import { hashQuestion } from '../utils/hash.js';
```

#### **Thay đổi 2: Sửa function logUnanswered**
```javascript
// ✅ Thay đổi từ
async function logUnanswered(question) {
  try {
    await pool.execute(
      'INSERT INTO unanswered_questions (question, created_at) VALUES (?, NOW())',
      [question]
    );
  } catch (err) {
    console.error('❌ Lỗi log unanswered:', err);
  }
}

// ✅ Thành
async function logUnanswered(question) {
  try {
    const hash = hashQuestion(question);
    const [rows] = await pool.execute(
      'SELECT 1 FROM unanswered_questions WHERE hash = ? LIMIT 1',
      [hash]
    );
    if (rows.length === 0) {
      await pool.execute(
        'INSERT INTO unanswered_questions (question, hash, created_at) VALUES (?, ?, NOW())',
        [question, hash]
      );
    }
  } catch (err) {
    console.error('❌ Lỗi log unanswered:', err);
  }
}
```

## 📊 **So Sánh Với Regular Chat**

### **Regular Chat Controller (ĐÚNG):**
```javascript
// ✅ ĐÚNG: Có đầy đủ logic hash
async function logUnanswered(question) {
  try {
    const hash = hashQuestion(question);
    const [rows] = await pool.execute(
      'SELECT 1 FROM unanswered_questions WHERE hash = ? LIMIT 1',
      [hash]
    );
    if (rows.length === 0) {
      await pool.execute(
        'INSERT INTO unanswered_questions (question, hash, created_at) VALUES (?, ?, NOW())',
        [question, hash]
      );
    }
  } catch (err) {
    console.error('❌ Lỗi log unanswered:', err);
  }
}
```

### **Advanced Chat Controller (ĐÃ SỬA):**
```javascript
// ✅ ĐÚNG: Giờ đã giống Regular Chat
async function logUnanswered(question) {
  try {
    const hash = hashQuestion(question);
    const [rows] = await pool.execute(
      'SELECT 1 FROM unanswered_questions WHERE hash = ? LIMIT 1',
      [hash]
    );
    if (rows.length === 0) {
      await pool.execute(
        'INSERT INTO unanswered_questions (question, hash, created_at) VALUES (?, ?, NOW())',
        [question, hash]
      );
    }
  } catch (err) {
    console.error('❌ Lỗi log unanswered:', err);
  }
}
```

## 🧪 **Testing**

### **Test Case 1: Câu hỏi không trả lời được (Regular RAG)**
```javascript
// User gửi: "What is quantum computing?"
// Backend: Không tìm thấy chunks phù hợp
// Expected: Ghi vào unanswered_questions với hash ✅
```

### **Test Case 2: Câu hỏi không trả lời được (Advanced RAG)**
```javascript
// User gửi: "What is quantum computing?"
// Backend: Không tìm thấy chunks phù hợp
// Expected: Ghi vào unanswered_questions với hash ✅
```

### **Test Case 3: Câu hỏi trùng lặp**
```javascript
// User gửi: "What is AI?" (lần 1)
// Expected: Ghi vào unanswered_questions ✅

// User gửi: "What is AI?" (lần 2)
// Expected: Không ghi trùng (do hash check) ✅
```

## 📈 **Impact Analysis**

### **Before Fix:**
- ❌ **Error**: "field 'hash' doesn't have a default value"
- ❌ **Advanced RAG**: Không thể log unanswered questions
- ❌ **Database**: Insert fails
- ❌ **User Experience**: Error khi sử dụng Advanced RAG

### **After Fix:**
- ✅ **No Error**: Insert thành công
- ✅ **Advanced RAG**: Có thể log unanswered questions
- ✅ **Database**: Insert works properly
- ✅ **User Experience**: Advanced RAG hoạt động bình thường

## 🔒 **Database Consistency**

### **Hash Function:**
```javascript
// hashQuestion function tạo hash SHA256
export function hashQuestion(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}
```

### **Hash Benefits:**
- ✅ **Uniqueness**: Mỗi câu hỏi có hash duy nhất
- ✅ **Deduplication**: Tránh ghi trùng câu hỏi
- ✅ **Performance**: Index trên hash field
- ✅ **Consistency**: Cùng logic với Regular RAG

## 🚀 **Deployment Checklist**

### **1. Backend Changes**
- ✅ **advancedChatController.js**: Fixed logUnanswered function
- ✅ **Import**: Added hashQuestion import
- ✅ **Logic**: Added hash generation and duplicate check

### **2. Database Schema**
- ✅ **unanswered_questions**: hash field is NOT NULL
- ✅ **Index**: UNIQUE index on hash field
- ✅ **Consistency**: Both controllers use same logic

### **3. Testing Required**
- ✅ **Unit Tests**: Test logUnanswered function
- ✅ **Integration Tests**: Test Advanced RAG with unanswered questions
- ✅ **Database Tests**: Test hash uniqueness

## ✅ **Kết Quả**

### **Bugs đã sửa:**
- ✅ **Hash field missing**: Fixed
- ✅ **Database insert error**: Fixed
- ✅ **Advanced RAG logging**: Fixed
- ✅ **Consistency**: Both controllers now use same logic

### **Improvements:**
- 🔒 **Database Integrity**: Proper hash field handling
- 🚀 **Performance**: Hash-based deduplication
- 🧹 **Code Quality**: Consistent logic across controllers
- 🛡️ **Reliability**: No more database errors

**Bug đã được sửa thành công! Advanced RAG hoạt động bình thường!** 🚀
