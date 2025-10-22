# 🤖 Modern AI Components - Hướng dẫn sử dụng

## 📋 Tổng quan

Bộ component hiện đại được thiết kế để tạo trải nghiệm giống các mô hình AI hàng đầu như ChatGPT, Claude, Gemini với các thuật toán streaming, typing effects và interactions thông minh.

---

## 🧩 Các Component chính

### **1. ModernBotOutput.js**
**Component hiển thị phản hồi của bot với streaming và typing effects**

#### **Tính năng:**
- ✅ **Streaming Effect** - hiển thị từng ký tự như ChatGPT
- ✅ **Typing Cursor** - con trỏ nhấp nháy khi đang gõ
- ✅ **Action Buttons** - Copy, Regenerate với animation
- ✅ **Markdown Support** - render nội dung phong phú
- ✅ **Auto-scroll** - tự động cuộn theo cursor

#### **Props:**
```javascript
<ModernBotOutput
  content="Nội dung phản hồi của bot"
  isStreaming={true}           // Đang streaming
  isComplete={false}           // Hoàn thành chưa
  onComplete={() => {}}        // Callback khi hoàn thành
  showTyping={true}            // Hiển thị typing cursor
/>
```

#### **Thuật toán Streaming:**
```javascript
// Tốc độ typing: 30ms/ký tự
const typingSpeed = 30;

// Hiển thị từng ký tự
useEffect(() => {
  const timer = setInterval(() => {
    setCurrentIndex(prev => {
      if (prev >= content.length) {
        clearInterval(timer);
        setIsTyping(false);
        onComplete();
        return prev;
      }
      setDisplayedContent(content.slice(0, prev + 1));
      return prev + 1;
    });
  }, typingSpeed);
}, [content, isStreaming]);
```

---

### **2. ModernUserMessage.js**
**Component hiển thị tin nhắn của user với hover effects**

#### **Tính năng:**
- ✅ **Hover Actions** - Copy, Edit, Delete khi hover
- ✅ **User Avatar** - icon người dùng
- ✅ **Timestamp** - thời gian gửi
- ✅ **Smooth Animations** - fade in/out effects

#### **Props:**
```javascript
<ModernUserMessage
  content="Nội dung tin nhắn"
  timestamp="2024-01-15T10:30:00Z"
  onEdit={(newContent) => {}}  // Chỉnh sửa tin nhắn
  onDelete={() => {}}          // Xóa tin nhắn
/>
```

---

### **3. ModernLoadingState.js**
**Component loading state với progress steps**

#### **Tính năng:**
- ✅ **Progress Steps** - các bước xử lý
- ✅ **Animated Dots** - loading dots với pulse
- ✅ **Progress Bar** - thanh tiến độ
- ✅ **Step Indicators** - icon trạng thái từng bước

#### **Props:**
```javascript
<ModernLoadingState
  message="Đang suy nghĩ..."
  showProgress={true}
  progress={75}                // 0-100
  steps={[
    "Đang phân tích câu hỏi...",
    "Tìm kiếm thông tin liên quan...",
    "Tạo phản hồi phù hợp...",
    "Hoàn thiện câu trả lời..."
  ]}
/>
```

#### **Thuật toán Progress:**
```javascript
// Tự động chuyển step mỗi 2 giây
useEffect(() => {
  const interval = setInterval(() => {
    setCurrentStep(prev => {
      if (prev >= steps.length - 1) {
        clearInterval(interval);
        return prev;
      }
      return prev + 1;
    });
  }, 2000);
}, [showProgress, steps.length]);
```

---

### **4. ModernMessageContainer.js**
**Container quản lý toàn bộ messages với auto-scroll**

#### **Tính năng:**
- ✅ **Auto-scroll** - tự động cuộn xuống tin nhắn mới
- ✅ **Scroll Detection** - phát hiện user đang cuộn
- ✅ **Scroll to Bottom Button** - nút cuộn xuống
- ✅ **Empty State** - trạng thái chưa có tin nhắn
- ✅ **Message Management** - quản lý edit/delete

#### **Props:**
```javascript
<ModernMessageContainer
  messages={[
    {
      id: 1,
      type: 'user',
      content: 'Xin chào!',
      timestamp: '2024-01-15T10:30:00Z'
    },
    {
      id: 2,
      type: 'bot',
      content: 'Chào bạn! Tôi có thể giúp gì?',
      isComplete: true
    }
  ]}
  isLoading={false}
  onEditMessage={(id, content) => {}}
  onDeleteMessage={(id) => {}}
  onRegenerateMessage={(id) => {}}
/>
```

---

### **5. ModernInputArea.js**
**Input area hiện đại với suggestions và shortcuts**

#### **Tính năng:**
- ✅ **Auto-resize Textarea** - tự động điều chỉnh chiều cao
- ✅ **Smart Suggestions** - gợi ý thông minh
- ✅ **Keyboard Shortcuts** - Enter, Shift+Enter, Arrow keys
- ✅ **Character Counter** - đếm ký tự với cảnh báo
- ✅ **Send/Stop Toggle** - chuyển đổi gửi/dừng

#### **Props:**
```javascript
<ModernInputArea
  value={input}
  onChange={setInput}
  onSend={handleSend}
  onStop={handleStop}
  disabled={false}
  isLoading={false}
  placeholder="Nhập câu hỏi của bạn..."
  suggestions={[
    { title: "Dịch sang tiếng Anh", description: "Dịch văn bản" },
    { title: "Giải thích ngữ pháp", description: "Học ngữ pháp" }
  ]}
  onSuggestionClick={(suggestion) => {}}
  maxLength={4000}
/>
```

#### **Thuật toán Auto-resize:**
```javascript
// Tự động điều chỉnh chiều cao textarea
useEffect(() => {
  if (textareaRef.current) {
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }
}, [value]);
```

---

## 🎨 Design System

### **Color Palette:**
```css
Primary: #10a37f (Green - giống ChatGPT)
Secondary: #f7f7f8 (Light gray background)
Text: #1f2937 (Dark gray)
Muted: #6b7280 (Medium gray)
Borders: #e5e7eb (Light borders)
Success: #065f46 (Dark green)
Warning: #f59e0b (Orange)
Error: #ef4444 (Red)
```

### **Typography:**
```css
Font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto
Sizes: 11px (help), 12px (small), 14px (buttons), 15px (messages), 16px (input)
Weights: 400 (normal), 500 (medium), 600 (semibold)
```

### **Spacing:**
```css
Padding: 4px, 6px, 8px, 12px, 16px, 20px, 24px
Margins: 4px, 8px, 12px, 16px, 20px, 24px
Gaps: 4px, 8px, 12px, 16px, 24px
```

### **Border Radius:**
```css
Small: 4px, 6px, 8px
Medium: 12px, 18px
Large: 50% (circles)
```

---

## ⚡ Animations & Effects

### **1. Typing Effect:**
```css
@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
```

### **2. Pulse Loading:**
```css
@keyframes pulse {
  0%, 80%, 100% { opacity: 0.3; }
  40% { opacity: 1; }
}
```

### **3. Fade In:**
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### **4. Spin Loading:**
```css
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

---

## 🔧 Integration với Chat.js

### **Cách sử dụng trong Chat component:**

```javascript
import ModernMessageContainer from './ModernMessageContainer';
import ModernInputArea from './ModernInputArea';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    // Add user message
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // API call
      const response = await axios.post('/api/chat', { message: input });
      
      // Add bot message with streaming
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.data.reply,
        isStreaming: true,
        isComplete: false
      };
      
      setMessages(prev => [...prev, botMessage]);
      
      // Simulate streaming
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.id === botMessage.id 
            ? { ...msg, isStreaming: false, isComplete: true }
            : msg
        ));
        setIsLoading(false);
      }, 2000);
      
    } catch (error) {
      setIsLoading(false);
      // Handle error
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div>...</div>
      
      {/* Messages */}
      <ModernMessageContainer
        messages={messages}
        isLoading={isLoading}
        onEditMessage={(id, content) => {
          setMessages(prev => prev.map(msg => 
            msg.id === id ? { ...msg, content } : msg
          ));
        }}
        onDeleteMessage={(id) => {
          setMessages(prev => prev.filter(msg => msg.id !== id));
        }}
        onRegenerateMessage={(id) => {
          // Regenerate logic
        }}
      />
      
      {/* Input */}
      <ModernInputArea
        value={input}
        onChange={setInput}
        onSend={handleSend}
        onStop={() => setIsLoading(false)}
        disabled={isLoading}
        isLoading={isLoading}
        suggestions={[
          { title: "Dịch sang tiếng Anh", description: "Dịch văn bản" },
          { title: "Giải thích ngữ pháp", description: "Học ngữ pháp" }
        ]}
        onSuggestionClick={(suggestion) => {
          setInput(suggestion.title);
        }}
      />
    </div>
  );
}
```

---

## 🚀 Performance Optimizations

### **1. Streaming Algorithm:**
- **Typing Speed**: 30ms/ký tự (có thể điều chỉnh)
- **Memory Efficient**: Chỉ render ký tự hiện tại
- **Smooth Animation**: requestAnimationFrame cho mượt mà

### **2. Auto-scroll Algorithm:**
- **Smart Detection**: Phát hiện user đang cuộn
- **Debounced Scroll**: Tránh scroll quá nhiều
- **Smooth Behavior**: CSS scroll-behavior

### **3. Component Optimization:**
- **useRef**: Tránh re-render không cần thiết
- **useCallback**: Memoize functions
- **useMemo**: Cache expensive calculations

---

## 🎯 Best Practices

### **1. State Management:**
```javascript
// Tách riêng state cho từng component
const [messages, setMessages] = useState([]);
const [isLoading, setIsLoading] = useState(false);
const [streamingContent, setStreamingContent] = useState('');
```

### **2. Error Handling:**
```javascript
// Wrap API calls với try-catch
try {
  const response = await apiCall();
  // Handle success
} catch (error) {
  // Show error message
  setError(error.message);
}
```

### **3. Accessibility:**
```javascript
// ARIA labels và keyboard navigation
<button
  aria-label="Gửi tin nhắn"
  onKeyDown={handleKeyDown}
  tabIndex={0}
>
  📤
</button>
```

---

## 🎉 Kết quả

### **Trải nghiệm người dùng:**
- ✅ **Giống ChatGPT** - streaming, typing effects
- ✅ **Smooth Animations** - mượt mà, professional
- ✅ **Smart Interactions** - hover effects, shortcuts
- ✅ **Responsive Design** - tối ưu mọi thiết bị
- ✅ **Accessibility** - hỗ trợ keyboard, screen reader

### **Technical Excellence:**
- ✅ **Modern Algorithms** - streaming, auto-scroll, suggestions
- ✅ **Performance** - optimized rendering, memory efficient
- ✅ **Maintainable** - clean code, separation of concerns
- ✅ **Scalable** - dễ dàng mở rộng tính năng

**Bộ component đã sẵn sàng tạo ra trải nghiệm AI hiện đại cạnh tranh với các chatbot hàng đầu!** 🚀
