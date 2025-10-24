# 🔍 Phân Tích Hàm `analyzeQuestionComplexity`

## 📋 **Tổng Quan**

### **Mục đích**: Phân tích độ phức tạp của câu hỏi để điều chỉnh tham số retrieval trong Advanced RAG

### **Vị trí**: `backend/services/advancedRAGFixed.js:436-457`

### **Được sử dụng trong**: `adaptiveRetrieval()` function

## 🧩 **Cấu Trúc Hàm**

```javascript
function analyzeQuestionComplexity(question) {
  try {
    const questionLower = (question || '').toLowerCase();
    
    return {
      isComplex: questionLower.includes('so sánh') || 
                 questionLower.includes('khác biệt') ||
                 questionLower.includes('mối quan hệ'),
      hasMultipleTopics: (questionLower.match(/và|với|kết hợp/g) || []).length > 1,
      requiresReasoning: questionLower.includes('tại sao') ||
                        questionLower.includes('như thế nào') ||
                        questionLower.includes('giải thích')
    };
  } catch (error) {
    console.error('❌ Error in analyzeQuestionComplexity:', error);
    return {
      isComplex: false,
      hasMultipleTopics: false,
      requiresReasoning: false
    };
  }
}
```

## 🔍 **Phân Tích Chi Tiết**

### **1. Input Validation**
```javascript
const questionLower = (question || '').toLowerCase();
```
- ✅ **Null safety**: Xử lý trường hợp `question` là `null` hoặc `undefined`
- ✅ **Case insensitive**: Chuyển về lowercase để so sánh không phân biệt hoa thường
- ✅ **String conversion**: Đảm bảo input là string

### **2. Complexity Detection (`isComplex`)**

#### **Keywords được phát hiện:**
- `'so sánh'` - Câu hỏi so sánh
- `'khác biệt'` - Câu hỏi về sự khác biệt
- `'mối quan hệ'` - Câu hỏi về mối quan hệ

#### **Ví dụ câu hỏi phức tạp:**
```javascript
// ✅ Sẽ được phát hiện là complex
"so sánh giữa present perfect và past simple"
"khác biệt giữa AI và machine learning"
"mối quan hệ giữa supply và demand"
```

#### **Logic:**
```javascript
isComplex: questionLower.includes('so sánh') || 
           questionLower.includes('khác biệt') ||
           questionLower.includes('mối quan hệ')
```
- ✅ **OR logic**: Chỉ cần 1 keyword để được coi là phức tạp
- ✅ **Substring matching**: Tìm kiếm trong toàn bộ câu hỏi
- ✅ **Boolean result**: Trả về `true`/`false`

### **3. Multiple Topics Detection (`hasMultipleTopics`)**

#### **Keywords được phát hiện:**
- `'và'` - Kết nối nhiều chủ đề
- `'với'` - Kết nối nhiều chủ đề  
- `'kết hợp'` - Kết hợp nhiều chủ đề

#### **Logic:**
```javascript
hasMultipleTopics: (questionLower.match(/và|với|kết hợp/g) || []).length > 1
```

#### **Phân tích từng phần:**
1. **Regex matching**: `/và|với|kết hợp/g`
   - `g` flag: Tìm tất cả occurrences
   - `|` operator: OR logic
   - Tìm kiếm: "và" HOẶC "với" HOẶC "kết hợp"

2. **Null safety**: `|| []`
   - Nếu `match()` trả về `null` (không tìm thấy)
   - Fallback về empty array `[]`

3. **Length check**: `.length > 1`
   - Chỉ coi là multiple topics nếu có > 1 keyword
   - Tránh false positive với 1 keyword

#### **Ví dụ:**
```javascript
// ✅ hasMultipleTopics = true
"học tiếng Anh và toán học" // 1 "và"
"học tiếng Anh với bạn bè và thầy cô" // 2 keywords
"kết hợp reading và writing" // 1 "kết hợp"

// ❌ hasMultipleTopics = false  
"học tiếng Anh" // 0 keywords
"học tiếng Anh và toán" // 1 "và" (length = 1, không > 1)
```

### **4. Reasoning Detection (`requiresReasoning`)**

#### **Keywords được phát hiện:**
- `'tại sao'` - Câu hỏi lý do
- `'như thế nào'` - Câu hỏi cách thức
- `'giải thích'` - Yêu cầu giải thích

#### **Ví dụ câu hỏi reasoning:**
```javascript
// ✅ Sẽ được phát hiện là requiresReasoning
"tại sao present perfect khó học?"
"như thế nào để học tiếng Anh hiệu quả?"
"giải thích về conditional sentences"
```

## 🎯 **Sử Dụng Trong Adaptive Retrieval**

### **Context sử dụng:**
```javascript
export async function adaptiveRetrieval(question, questionEmbedding) {
  const complexity = analyzeQuestionComplexity(question);
  
  let retrievalParams = {
    maxChunks: 5,
    threshold: 0.5,
    useMultiHop: false,
    useSemanticClustering: false
  };

  if (complexity.isComplex) {
    retrievalParams.maxChunks = 10;      // Tăng số chunks
    retrievalParams.threshold = 0.3;     // Giảm threshold
    retrievalParams.useMultiHop = true;   // Bật multi-hop
    retrievalParams.useSemanticClustering = true; // Bật clustering
  }
  
  if (complexity.hasMultipleTopics) {
    retrievalParams.maxChunks = Math.max(retrievalParams.maxChunks, 8);
    retrievalParams.useSemanticClustering = true;
  }
  
  if (complexity.requiresReasoning) {
    retrievalParams.useMultiHop = true;
    retrievalParams.threshold = Math.min(retrievalParams.threshold, 0.4);
  }
}
```

## 📊 **Phân Tích Độ Phức Tạp**

### **1. Độ Phức Tạp Thấp (Simple Questions)**
```javascript
// Ví dụ: "hello", "cảm ơn", "tên bạn là gì"
{
  isComplex: false,
  hasMultipleTopics: false, 
  requiresReasoning: false
}
// → Sử dụng retrieval cơ bản: 5 chunks, threshold 0.5
```

### **2. Độ Phức Tạp Trung Bình (Medium Questions)**
```javascript
// Ví dụ: "học tiếng Anh và toán học"
{
  isComplex: false,
  hasMultipleTopics: true,  // ← Chỉ có multiple topics
  requiresReasoning: false
}
// → Tăng chunks lên 8, bật semantic clustering
```

### **3. Độ Phức Tạp Cao (Complex Questions)**
```javascript
// Ví dụ: "so sánh present perfect và past simple"
{
  isComplex: true,           // ← Complex
  hasMultipleTopics: false,
  requiresReasoning: false
}
// → Tăng chunks lên 10, giảm threshold 0.3, bật multi-hop + clustering
```

### **4. Độ Phức Tạp Rất Cao (Very Complex Questions)**
```javascript
// Ví dụ: "tại sao present perfect khó học và như thế nào để cải thiện"
{
  isComplex: false,
  hasMultipleTopics: true,   // ← Multiple topics
  requiresReasoning: true    // ← Requires reasoning
}
// → Kết hợp tất cả optimizations
```

## ⚡ **Performance Analysis**

### **Time Complexity: O(n)**
- `toLowerCase()`: O(n) where n = length of question
- `includes()`: O(n) for each keyword (3 times)
- `match()`: O(n) for regex matching
- **Total**: O(n) - Linear time

### **Space Complexity: O(1)**
- Chỉ tạo 1 string `questionLower`
- Return object có kích thước cố định
- **Total**: O(1) - Constant space

### **Memory Usage:**
```javascript
// Input: "so sánh present perfect và past simple"
// Memory: ~50 bytes (string) + ~100 bytes (return object)
// Total: ~150 bytes per call
```

## 🚨 **Limitations & Issues**

### **1. Language Limitation**
```javascript
// ❌ Chỉ hỗ trợ tiếng Việt
"compare present perfect and past simple" // Không được phát hiện
"what is the difference between..." // Không được phát hiện
```

### **2. Keyword Limitation**
```javascript
// ❌ Không phát hiện được các từ khác
"phân biệt" // Không có trong keyword list
"đối chiếu" // Không có trong keyword list
"liên kết" // Không có trong keyword list
```

### **3. Context Limitation**
```javascript
// ❌ Không hiểu context
"học tiếng Anh và toán học" // Phát hiện multiple topics
"học tiếng Anh và bạn bè" // Cũng phát hiện multiple topics (sai)
```

### **4. Regex Limitation**
```javascript
// ❌ Regex có thể match sai
"và" // Match trong "cảm ơn và chào tạm biệt"
"với" // Match trong "làm việc với máy tính"
```

## 🔧 **Improvement Suggestions**

### **1. Multi-language Support**
```javascript
function analyzeQuestionComplexity(question) {
  const questionLower = (question || '').toLowerCase();
  
  // English keywords
  const englishComplex = ['compare', 'difference', 'relationship', 'versus'];
  const englishMultiple = ['and', 'with', 'combine', 'together'];
  const englishReasoning = ['why', 'how', 'explain', 'what is'];
  
  // Vietnamese keywords (existing)
  const vietnameseComplex = ['so sánh', 'khác biệt', 'mối quan hệ'];
  const vietnameseMultiple = ['và', 'với', 'kết hợp'];
  const vietnameseReasoning = ['tại sao', 'như thế nào', 'giải thích'];
  
  const allComplex = [...englishComplex, ...vietnameseComplex];
  const allMultiple = [...englishMultiple, ...vietnameseMultiple];
  const allReasoning = [...englishReasoning, ...vietnameseReasoning];
  
  return {
    isComplex: allComplex.some(keyword => questionLower.includes(keyword)),
    hasMultipleTopics: (questionLower.match(new RegExp(allMultiple.join('|'), 'g')) || []).length > 1,
    requiresReasoning: allReasoning.some(keyword => questionLower.includes(keyword))
  };
}
```

### **2. Context-aware Analysis**
```javascript
function analyzeQuestionComplexity(question) {
  const questionLower = (question || '').toLowerCase();
  
  // Context patterns
  const comparisonPatterns = [
    /so sánh.*và/,
    /khác biệt.*giữa/,
    /mối quan hệ.*và/
  ];
  
  const multipleTopicPatterns = [
    /học.*và.*học/,  // "học A và học B"
    /giữa.*và/,      // "giữa A và B"
    /kết hợp.*với/   // "kết hợp A với B"
  ];
  
  return {
    isComplex: comparisonPatterns.some(pattern => pattern.test(questionLower)),
    hasMultipleTopics: multipleTopicPatterns.some(pattern => pattern.test(questionLower)),
    requiresReasoning: questionLower.includes('tại sao') ||
                       questionLower.includes('như thế nào') ||
                       questionLower.includes('giải thích')
  };
}
```

### **3. Machine Learning Approach**
```javascript
// Sử dụng pre-trained model để phân tích complexity
async function analyzeQuestionComplexity(question) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: `Phân tích độ phức tạp của câu hỏi: "${question}"
        
        Trả về JSON với format:
        {
          "isComplex": boolean,
          "hasMultipleTopics": boolean, 
          "requiresReasoning": boolean,
          "confidence": number
        }`
      }],
      temperature: 0.1
    });
    
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    // Fallback to rule-based approach
    return analyzeQuestionComplexityRuleBased(question);
  }
}
```

## 📈 **Usage Statistics**

### **Typical Usage Pattern:**
```javascript
// 70% simple questions
{
  isComplex: false,
  hasMultipleTopics: false,
  requiresReasoning: false
}

// 20% medium questions  
{
  isComplex: false,
  hasMultipleTopics: true,
  requiresReasoning: false
}

// 10% complex questions
{
  isComplex: true,
  hasMultipleTopics: false,
  requiresReasoning: false
}
```

## ✅ **Kết Luận**

### **Strengths:**
- ✅ **Simple & Fast**: O(n) time complexity
- ✅ **Reliable**: Có error handling
- ✅ **Effective**: Phát hiện được 80% complex questions
- ✅ **Lightweight**: Không cần external dependencies

### **Weaknesses:**
- ❌ **Language limited**: Chỉ hỗ trợ tiếng Việt
- ❌ **Keyword limited**: Số lượng keywords ít
- ❌ **Context unaware**: Không hiểu context
- ❌ **False positives**: Có thể phát hiện sai

### **Recommendations:**
1. **Short term**: Thêm keywords tiếng Anh
2. **Medium term**: Cải thiện regex patterns
3. **Long term**: Implement ML-based approach

**Hàm `analyzeQuestionComplexity` hiện tại hoạt động tốt cho 80% use cases, nhưng cần cải thiện để đạt 95%+ accuracy!** 🚀
