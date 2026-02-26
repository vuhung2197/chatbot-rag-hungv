# Kế Hoạch Nâng Cấp: Từ Traditional RAG → Agentic RAG

## Mục Lục
1. [Vấn Đề Hiện Tại](#1-vấn-đề-hiện-tại)
2. [Agentic RAG Là Gì?](#2-agentic-rag-là-gì)
3. [So Sánh Kiến Trúc Hiện Tại vs Agentic RAG](#3-so-sánh-kiến-trúc-hiện-tại-vs-agentic-rag)
4. [Kiến Trúc Agentic RAG Đề Xuất](#4-kiến-trúc-agentic-rag-đề-xuất)
5. [Các Agent Cần Xây Dựng](#5-các-agent-cần-xây-dựng)
6. [Lộ Trình Triển Khai (3 Phase)](#6-lộ-trình-triển-khai-3-phase)
7. [Công Nghệ & Framework](#7-công-nghệ--framework)
8. [Ví Dụ Minh Họa](#8-ví-dụ-minh-họa)

---

## 1. Vấn Đề Hiện Tại

### Cách hệ thống hiện tại hoạt động (Traditional RAG)

```
Người dùng hỏi → Intent Router → [KNOWLEDGE | LIVE_SEARCH | GREETING] → Trả lời
```

Đây là luồng **tuyến tính, một chiều (Linear Pipeline)**:
1. Nhận câu hỏi.
2. Phân loại ý định (1 lần duy nhất).
3. Truy xuất dữ liệu (1 lần duy nhất từ 1 nguồn).
4. Sinh câu trả lời (1 lần duy nhất).
5. → **Xong. Không kiểm tra lại. Không tự sửa lỗi.**

### Hạn chế cụ thể

| Vấn đề | Ví dụ thực tế |
|---|---|
| **Không tự kiểm tra chất lượng** | AI trả lời sai nhưng vẫn gửi cho người dùng, không có bước "đọc lại" |
| **Không biết phân rã câu hỏi** | "So sánh RAG vs Fine-tuning, cái nào rẻ hơn?" → Hệ thống tìm 1 lần, thường trả lời thiếu vế |
| **Không biết kết hợp nhiều nguồn** | Câu hỏi cần cả dữ liệu nội bộ + Web nhưng hệ thống chỉ chọn 1 |
| **Không có memory dài hạn** | Mỗi cuộc hội thoại mới bắt đầu từ 0, không nhớ sở thích/thói quen người dùng |
| **Router cứng nhắc** | Intent Router phân loại sai → toàn bộ pipeline đi sai hướng, không thể tự sửa |

---

## 2. Agentic RAG Là Gì?

**Agentic RAG** = RAG + **Agent tự chủ (Autonomous Agent)**.

Thay vì chạy 1 pipeline cố định, hệ thống có một **"bộ não" trung tâm (Agent)** biết:
- 🧠 **Suy nghĩ (Reason)**: Phân tích câu hỏi, lập kế hoạch.
- 🔧 **Hành động (Act)**: Gọi công cụ phù hợp (Search DB, Search Web, Tính toán...).
- 👀 **Quan sát (Observe)**: Đánh giá kết quả trả về.
- 🔁 **Lặp lại (Iterate)**: Nếu chưa đủ tốt → thử lại với cách khác.

### Ví dụ so sánh cụ thể

**Câu hỏi**: "Giá cổ phiếu VNM hôm nay so với tuần trước có tăng không?"

#### Traditional RAG (Hiện tại):
```
1. Router: LIVE_SEARCH (vì có "hôm nay")
2. Web Search: Tìm "giá cổ phiếu VNM"
3. LLM: Sinh câu trả lời từ kết quả web
→ ❌ Chỉ có giá hôm nay, KHÔNG có tuần trước, KHÔNG so sánh được
```

#### Agentic RAG (Mục tiêu):
```
1. Agent NGHĨ: "Câu hỏi cần 2 thông tin: giá hôm nay + giá tuần trước"
2. Agent LẬP KẾ HOẠCH:
   - Bước 1: Tìm giá VNM hôm nay (Web Search)
   - Bước 2: Tìm giá VNM 7 ngày trước (Web Search với query khác)
   - Bước 3: So sánh và tính % thay đổi (Calculator Tool)
3. Agent THỰC HIỆN từng bước
4. Agent KIỂM TRA: "Đã có đủ 2 số liệu? → Có"
5. Agent TỔNG HỢP: Sinh câu trả lời so sánh chi tiết
→ ✅ Câu trả lời đầy đủ, chính xác
```

---

## 3. So Sánh Kiến Trúc Hiện Tại vs Agentic RAG

| Đặc điểm | Hệ thống Hiện tại | Agentic RAG (Mục tiêu) |
|---|---|---|
| **Luồng xử lý** | Tuyến tính (Retrieve → Generate) | Vòng lặp (Plan → Act → Observe → Repeat) |
| **Ra quyết định** | Intent Router cứng (1 lần) | Agent tự quyết định linh hoạt (nhiều lần) |
| **Nguồn dữ liệu** | 1 nguồn/lần (KB hoặc Web) | Đa nguồn đồng thời (KB + Web + API + Calculator) |
| **Tự sửa lỗi** | ❌ Không | ✅ Có (Self-Reflection) |
| **Phân rã câu hỏi** | ❌ Không | ✅ Có (Query Decomposition) |
| **Bộ nhớ** | Chỉ lịch sử chat ngắn (6 tin nhắn) | Bộ nhớ ngắn hạn + dài hạn |
| **Công cụ** | 2 cái (RAG Search + Web Search) | Nhiều tools mở rộng (Calculator, Code Runner, API...) |

---

## 4. Kiến Trúc Agentic RAG Đề Xuất

### Sơ đồ kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────┐
│                    USER MESSAGE                              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  🧠 MASTER AGENT                             │
│  (Orchestrator - Bộ não trung tâm)                          │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  1. PHÂN TÍCH câu hỏi                               │    │
│  │  2. LẬP KẾ HOẠCH (chia thành sub-tasks)              │    │
│  │  3. CHỌN CÔNG CỤ phù hợp                            │    │
│  │  4. THỰC THI từng bước                               │    │
│  │  5. ĐÁNH GIÁ kết quả (Self-Reflection)              │    │
│  │  6. LẶP LẠI nếu chưa đủ tốt                        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 🔍 RAG   │  │ 🌐 Web   │  │ 🧮 Calc  │  │ 💾 Memory│   │
│  │ Search   │  │ Search   │  │ Tool     │  │ Store    │   │
│  │ Tool     │  │ Tool     │  │          │  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              🔄 SELF-REFLECTION AGENT                        │
│  "Câu trả lời đã đủ tốt chưa?"                              │
│  → Nếu CHƯA: Quay lại Master Agent với feedback             │
│  → Nếu RỒI: Gửi cho người dùng                              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    FINAL RESPONSE                            │
│  (Markdown + Citations + Sources + Reasoning Steps)          │
└─────────────────────────────────────────────────────────────┘
```

### Mapping với code hiện tại

| Component Agentic | Code Hiện Tại | Hành động |
|---|---|---|
| Master Agent | `ChatService.processChat()` | **Viết lại** thành Agent Loop |
| RAG Search Tool | `advancedRAGFixed.js` | **Giữ nguyên**, wrap thành Tool |
| Web Search Tool | `webSearch.service.js` | **Giữ nguyên**, wrap thành Tool |
| Intent Router | `intentRouter.js` | **Loại bỏ** (Agent tự quyết định) |
| Self-Reflection | ❌ Chưa có | **Tạo mới** |
| Memory Store | Chỉ có `getChatHistory()` | **Nâng cấp** thành Long-term Memory |
| Calculator Tool | ❌ Chưa có | **Tạo mới** |

---

## 5. Các Agent Cần Xây Dựng

### 5.1 Master Agent (ReAct Pattern)

Đây là "bộ não" chính, hoạt động theo vòng lặp **ReAct (Reason + Act)**:

```
Thought: Tôi cần tìm giá vàng hôm nay và so sánh với hôm qua
Action: web_search("giá vàng SJC hôm nay")
Observation: Giá vàng SJC hôm nay: 92.5 triệu/lượng
Thought: Tốt, giờ tôi cần giá hôm qua
Action: web_search("giá vàng SJC hôm qua")
Observation: Giá vàng SJC hôm qua: 91.8 triệu/lượng
Thought: Đã đủ dữ liệu, tôi có thể so sánh
Action: calculate("92.5 - 91.8")
Observation: 0.7
Thought: Giá vàng tăng 0.7 triệu, tức khoảng 0.76%. Tôi đã có đủ thông tin.
Final Answer: Giá vàng SJC hôm nay là 92.5 triệu/lượng, tăng 0.7 triệu (+0.76%) so với hôm qua.
```

### 5.2 Tools (Công cụ)

Mỗi Tool là một function mà Agent có thể gọi:

| Tool | Mô tả | Có sẵn? |
|---|---|---|
| `rag_search` | Tìm kiếm trong Knowledge Base nội bộ | ✅ Có (`multiStageRetrieval`) |
| `web_search` | Tìm kiếm trên Internet (Tavily) | ✅ Có (`performWebSearch`) |
| `calculator` | Tính toán số học | ❌ Tạo mới |
| `date_time` | Lấy ngày giờ hiện tại | ❌ Tạo mới |
| `code_executor` | Chạy code JavaScript/Python | ❌ Tạo mới (Tùy chọn) |
| `memory_recall` | Nhớ lại thông tin từ các cuộc hội thoại trước | ❌ Tạo mới |

### 5.3 Self-Reflection Agent

Kiểm tra chất lượng câu trả lời trước khi gửi:

```javascript
// Pseudo-code
async function selfReflect(question, answer, context) {
    const prompt = `
        Câu hỏi: ${question}
        Câu trả lời: ${answer}
        Ngữ cảnh được sử dụng: ${context}
        
        Hãy đánh giá:
        1. Câu trả lời có đúng với ngữ cảnh không? (Faithfulness)
        2. Câu trả lời có đầy đủ không? (Completeness)
        3. Có thông tin nào bịa đặt (hallucination) không?
        
        Trả về JSON: {"quality": "good|needs_improvement", "feedback": "..."}
    `;
    // Nếu quality === "needs_improvement" → Quay lại Master Agent
}
```

---

## 6. Lộ Trình Triển Khai (3 Phase)

### Phase 1: ReAct Agent Cơ Bản (1-2 tuần)
**Mục tiêu**: Thay thế Intent Router bằng Agent tự quyết định.

**Thay đổi chính**:
1. Tạo file `backend/services/agentService.js` với vòng lặp ReAct.
2. Wrap `multiStageRetrieval` và `performWebSearch` thành Tools.
3. Thêm Tool `calculator` và `date_time` đơn giản.
4. Xóa bỏ phụ thuộc vào `intentRouter.js` cứng nhắc.
5. Cập nhật `ChatService` để gọi Agent thay vì pipeline cũ.

**Kết quả**: Agent có thể tự chọn dùng RAG hay Web Search, hoặc cả hai.

### Phase 2: Self-Reflection + Query Decomposition (2-3 tuần)
**Mục tiêu**: Agent biết tự kiểm tra và chia nhỏ câu hỏi phức tạp.

**Thay đổi chính**:
1. Thêm module `selfReflection.js`.
2. Thêm logic phân rã câu hỏi (Query Decomposition).
3. Giới hạn số vòng lặp tối đa (max 3-5 iterations) để tránh loop vô hạn.
4. Thêm logging chi tiết cho từng bước suy luận (hiển thị trên Frontend).

**Kết quả**: Agent trả lời chính xác hơn, ít hallucination hơn.

### Phase 3: Long-term Memory + Multi-Agent (3-4 tuần)
**Mục tiêu**: Agent nhớ được thông tin dài hạn và có thể phối hợp nhiều agent.

**Thay đổi chính**:
1. Tạo bảng `agent_memory` trong Database (lưu facts đã học về user).
2. Mỗi cuộc hội thoại, Agent tự trích xuất "facts" quan trọng và lưu lại.
3. Tạo chuyên gia con (Sub-agents): `ResearchAgent`, `AnalysisAgent`, `WritingAgent`.
4. Master Agent phân bổ công việc cho các sub-agents khi câu hỏi phức tạp.

**Kết quả**: Chatbot biết cá nhân hóa, nhớ sở thích người dùng.

---

## 7. Công Nghệ & Framework

### Lựa chọn 1: Tự viết (Khuyến nghị để hiểu sâu)
- **Ưu điểm**: Kiểm soát hoàn toàn, không phụ thuộc framework ngoài, nhẹ.
- **Nhược điểm**: Viết nhiều code hơn.
- **Cách làm**: Tự implement vòng lặp ReAct bằng JavaScript thuần + `callLLM()` hiện có.

### Lựa chọn 2: LangGraph.js (Khi cần scale nhanh)
- **Ưu điểm**: Framework mạnh mẽ, có sẵn ReAct template, hỗ trợ state management.
- **Nhược điểm**: Thêm dependency, learning curve.
- **Cài đặt**: `npm install @langchain/langgraph @langchain/core @langchain/openai`

### Lựa chọn 3: Vercel AI SDK (Nếu dùng Next.js)
- **Ưu điểm**: Tích hợp tốt với React/Next.js, hỗ trợ streaming.
- **Nhược điểm**: Gắn chặt với hệ sinh thái Vercel.

### → Đề Xuất: **Lựa chọn 1** (Tự viết) cho Phase 1, chuyển sang **LangGraph.js** khi cần Multi-Agent ở Phase 3.

---

## 8. Ví Dụ Minh Họa

### Pseudo-code cho Agent Loop (Phase 1)

```javascript
// backend/services/agentService.js

const TOOLS = {
    rag_search: {
        name: 'rag_search',
        description: 'Tìm kiếm thông tin trong cơ sở tri thức nội bộ',
        execute: async (query) => {
            const embedding = await getEmbedding(query);
            const chunks = await multiStageRetrieval(embedding, query, 5);
            return chunks.map(c => c.content).join('\n');
        }
    },
    web_search: {
        name: 'web_search',
        description: 'Tìm kiếm thông tin mới nhất trên Internet',
        execute: async (query) => {
            const result = await performWebSearch(query);
            return result.context;
        }
    },
    calculator: {
        name: 'calculator',
        description: 'Tính toán biểu thức toán học',
        execute: async (expression) => {
            return String(Function('"use strict"; return (' + expression + ')')());
        }
    },
    get_current_time: {
        name: 'get_current_time',
        description: 'Lấy ngày giờ hiện tại',
        execute: async () => new Date().toLocaleString('vi-VN')
    }
};

async function runAgent(question, history, modelConfig, maxIterations = 5) {
    const toolDescriptions = Object.values(TOOLS)
        .map(t => `- ${t.name}: ${t.description}`)
        .join('\n');

    const systemPrompt = `Bạn là một AI Agent thông minh. Bạn có thể sử dụng các công cụ sau:
${toolDescriptions}

Quy trình làm việc (ReAct):
1. Thought: Suy nghĩ về câu hỏi, lập kế hoạch
2. Action: Chọn tool và input. Format: {"tool": "tool_name", "input": "..."}
3. Observation: Xem kết quả từ tool
4. Lặp lại 1-3 nếu cần thêm thông tin
5. Final Answer: Khi đã đủ thông tin, trả lời trực tiếp

QUAN TRỌNG: Mỗi lượt, trả về ĐÚNG 1 trong 2 format:
- Nếu cần dùng tool: {"thought": "...", "action": {"tool": "...", "input": "..."}}
- Nếu đã xong: {"thought": "...", "final_answer": "..."}
`;

    let messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-6),
        { role: 'user', content: question }
    ];

    const reasoningSteps = [];

    for (let i = 0; i < maxIterations; i++) {
        const response = await callLLM(modelConfig, messages, 0.2, 500);
        const parsed = JSON.parse(response);

        reasoningSteps.push({
            iteration: i + 1,
            thought: parsed.thought
        });

        // Nếu Agent đã có câu trả lời cuối cùng
        if (parsed.final_answer) {
            return {
                reply: parsed.final_answer,
                reasoning_steps: reasoningSteps,
                iterations: i + 1
            };
        }

        // Nếu Agent cần gọi Tool
        const { tool, input } = parsed.action;
        const toolFn = TOOLS[tool];
        if (!toolFn) throw new Error(`Unknown tool: ${tool}`);

        const observation = await toolFn.execute(input);

        reasoningSteps.push({
            iteration: i + 1,
            action: tool,
            input: input,
            observation: observation.substring(0, 500) // Cắt ngắn cho log
        });

        // Thêm kết quả vào lịch sử để Agent tiếp tục suy luận
        messages.push({ role: 'assistant', content: response });
        messages.push({ role: 'user', content: `Observation: ${observation}` });
    }

    return {
        reply: 'Xin lỗi, tôi đã thử nhiều cách nhưng không tìm được câu trả lời phù hợp.',
        reasoning_steps: reasoningSteps,
        iterations: maxIterations
    };
}
```

### So sánh Output trước và sau

**Trước (Traditional RAG)**:
```json
{
    "reply": "Giá vàng SJC hôm nay là 92.5 triệu/lượng.",
    "reasoning_steps": ["Intent: LIVE_SEARCH", "Web Search completed"],
    "chunks_used": []
}
```

**Sau (Agentic RAG)**:
```json
{
    "reply": "Giá vàng SJC hôm nay là 92.5 triệu/lượng, tăng 0.7 triệu (+0.76%) so với hôm qua.",
    "reasoning_steps": [
        {"iteration": 1, "thought": "Cần tìm giá hôm nay và hôm qua để so sánh"},
        {"iteration": 1, "action": "web_search", "input": "giá vàng SJC hôm nay"},
        {"iteration": 2, "thought": "Đã có giá hôm nay, cần giá hôm qua"},
        {"iteration": 2, "action": "web_search", "input": "giá vàng SJC hôm qua"},
        {"iteration": 3, "thought": "Đủ dữ liệu, tính % thay đổi"},
        {"iteration": 3, "action": "calculator", "input": "(92.5-91.8)/91.8*100"},
        {"iteration": 4, "thought": "Đã có đủ thông tin để trả lời"}
    ],
    "iterations": 4
}
```

---

## Kết Luận

Việc nâng cấp lên **Agentic RAG** sẽ biến Chatbot của bạn từ một "cỗ máy hỏi-đáp" thành một **trợ lý AI thông minh thực sự**, có khả năng:
- Tự suy luận và lập kế hoạch.
- Kết hợp nhiều nguồn thông tin.
- Tự kiểm tra chất lượng câu trả lời.
- Nhớ và cá nhân hóa trải nghiệm.

**Bước tiếp theo đề xuất**: Bắt đầu với **Phase 1** - Tạo Agent Loop cơ bản. Tôi có thể hỗ trợ bạn triển khai code ngay nếu bạn sẵn sàng.
