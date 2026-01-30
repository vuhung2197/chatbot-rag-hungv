# 🤖 Chatbot-RAG-Powered AI Assistant

## 🧠 Giới Thiệu Dự Án

Chatbot AI thông minh được xây dựng với kiến trúc **RAG (Retrieval-Augmented Generation)** tối ưu, hỗ trợ:

- **🎯 Thuần RAG**: Tìm kiếm và trả lời dựa trên kiến thức đã học
- **📚 Quản lý kiến thức**: Upload, chunking và embedding tự động
- **⚡ Advanced RAG**: Multi-stage retrieval, semantic clustering, multi-hop reasoning
- **⚡ Tối ưu hiệu suất**: Vector database với indexing và caching
- **🔒 Bảo mật**: Authentication và authorization đầy đủ
- **🎲 Giải trí**: Tích hợp Game Arena (Sic Bo, Bầu Cua Tôm Cá) với hệ thống tiền tệ ảo minh bạch

> **Kiến trúc**: Frontend (React Modular) + Backend (Node.js Modular Monolith) + PostgreSQL + Vector Database

---

## 🚀 Tính Năng Chính

### ✅ **RAG Chatbot Thông Minh**
- **Vector Search**: Tìm kiếm semantic với embedding vectors
- **Knowledge Base**: Quản lý kiến thức dạng chunks với embedding
- **Smart Retrieval**: Tự động tìm context phù hợp nhất
- **Response Generation**: Trả lời dựa trên context + GPT

### 📚 **Quản Lý Kiến Thức**
- **Upload Files**: Hỗ trợ `.txt`, `.docx`, `.pdf`
- **Auto Chunking**: Chia nhỏ nội dung thành semantic chunks
- **Vector Embedding**: Tự động tạo embedding cho mỗi chunk
- **Admin Interface**: Quản lý kiến thức trực quan

### 🎲 **Multi-Game Arena**
- **Sic Bo (Tài Xỉu)**: Game cược xúc xắc cổ điển với tính năng Soi Cầu (Trend Analysis).
- **Bầu Cua Tôm Cá**: (Mới) Game dân gian Việt Nam với giao diện hiện đại, hiệu ứng 3D Shake.
- **Provably Fair**: Tất cả game đều tích hợp công nghệ kiểm chứng công bằng (Server Seed + Client Seed).
- **Wallet System**: Quản lý số dư thống nhất, tự động quy đổi tiền tệ.
- **[Xem Chi Tiết Hệ Thống Bầu Cua](./BAUCUA_SYSTEM_ANALYSIS.md)**

### ⚡ **Tối Ưu Hiệu Suất**
- **Vector Indexing**: Tìm kiếm nhanh với large-scale vectors
- **Caching Layer**: Cache kết quả tìm kiếm
- **Hybrid Search**: Kết hợp vector + keyword search
- **Batch Processing**: Xử lý nhiều queries cùng lúc

### 🚀 **Advanced RAG**
- **Multi-Stage Retrieval**: Lấy chunks theo nhiều giai đoạn
- **Semantic Clustering**: Nhóm chunks theo chủ đề
- **Multi-Hop Reasoning**: Tìm mối liên kết giữa chunks
- **Context Re-ranking**: Sắp xếp lại context theo độ liên quan
- **Adaptive Retrieval**: Điều chỉnh retrieval dựa trên độ phức tạp

---

## 🏗️ Kiến Trúc Hệ Thống

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (React)       │◄──►│   (Node.js)     │◄──►│ (PostgreSQL)    │
│                 │    │                 │    │                 │
│ • Chat Features │    │ • RAG Engine    │    │ • Knowledge     │
│ • Admin Module  │    │ • Vector Search │    │ • Vectors       │
│ • User Module   │    │ • Modules API   │    │ • Users         │
│ • Game Module   │    │ • Game Engine   │    │ • Game Sessions │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **RAG Processing Flow**
```
User Question → Embedding → Vector Search → Context → GPT → Response
```

---

## 📂 Cấu Trúc Dự Án (New Architecture)

```
english-chatbot/
├── 📁 backend/                 # Node.js API Server (Modular Architecture)
│   ├── 📁 src/modules/         # Feature Modules (Routes & Controllers)
│   │   ├── 📁 auth/           # Authentication
│   │   ├── 📁 chat/           # Chat Logic & History
│   │   ├── 📁 knowledge/      # Knowledge Base Management
│   │   ├── 📁 games/          # Game Logic (Sic Bo, etc.)
│   │   ├── 📁 wallet/         # Wallet & Payment
│   │   ├── 📁 user/           # User Management
│   │   └── ...
│   ├── 📁 services/            # Business Logic & Integrations
│   │   ├── 🔧 advancedRAGFixed.js  # Advanced RAG Core Engine
│   │   ├── 🔧 embeddingVector.js   # Embedding Service
│   │   ├── 🔧 momoService.js       # MoMo Payment Integration
│   │   ├── 🔧 vnpayService.js      # VNPay Payment Integration
│   │   └── 🔧 emailService.js      # Email Service
│   ├── 📁 middlewares/         # Shared Middlewares (Auth, Error)
│   └── 📁 db/                  # Database Scripts
├── 📁 frontend/                # React Application (Feature-based)
│   ├── 📁 src/features/        # Feature Modules (UI & Logic)
│   │   ├── 📁 auth/           # Login, Register, OAuth
│   │   ├── 📁 chat/           # Chat Interface
│   │   ├── 📁 knowledge/      # Admin Dashboard & Search
│   │   ├── 📁 games/          # Game Interfaces (Sic Bo)
│   │   ├── 📁 wallet/         # Wallet & Transactions
│   │   └── 📁 user/           # Profile & Settings
│   ├── 📁 src/components/      # Shared Components
│   │   ├── 📁 ui/             # Atomic UI (Buttons, Modals)
│   │   └── 📁 shared/         # Common Widgets
│   ├── 📁 src/context/         # Global State Providers
│   ├── 📁 src/hooks/           # Custom Hooks
│   └── 📁 src/pages/           # Page Wrappers
├── 📁 db/                      # SQL Init Scripts
└── 📄 docker-compose.yml       # Docker Configuration
```

---

## ⚙️ Cài Đặt & Chạy Dự Án

### **1. Yêu Cầu Hệ Thống**
- **Docker** + **Docker Compose**
- **Node.js** 18+ (cho development)
- **PostgreSQL** 13+ (với pgvector extension)

### **2. Clone Repository**
```bash
git clone <repository-url>
cd english-chatbot
```

### **3. Cấu Hình Environment**
```bash
# Copy file environment
cp .env.example .env

# Chỉnh sửa file .env
nano .env
```

**Cấu hình `.env`:**
```env
# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres123
DB_DATABASE=chatbot

# PostgreSQL Docker (Optional)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_DB=chatbot

# OpenAI API
OPENAI_API_KEY=sk-your-openai-api-key

# Server
PORT=3001
NODE_ENV=development

# Frontend
REACT_APP_API_URL=http://localhost:3001
```

### **4. Khởi Chạy Với Docker**
```bash
# Build và chạy tất cả services
docker-compose up -d

# Xem logs
docker-compose logs -f

# Dừng services
docker-compose down
```

### **5. Khởi Chạy Development Mode**
```bash
# Backend
cd backend
npm install
npm start

# Frontend (terminal mới)
cd frontend
npm install
npm start
```

### **6. Truy Cập Ứng Dụng**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Database**: localhost:5432

---

## 👑 Quản Lý Admin & User

Để truy cập các tính năng quản trị (Knowledge Admin, System Settings) và đóng vai trò "Nhà cái" trong các Games, bạn cần có tài khoản **Admin** với số dư lớn.

### **1. Tạo Tài Khoản Admin Nhanh**
Chúng tôi cung cấp script tự động để tạo tài khoản admin (hoặc nâng quyền nếu email đã tồn tại).

1.  Mở terminal tại thư mục `backend`:
    ```bash
    cd backend
    ```
2.  Chạy script:
    ```bash
    node create_admin.js
    ```
    *   **Mặc định**: Email `admin@example.com` / Password `Admin123!`
    *   Bạn có thể sửa file `backend/create_admin.js` để đổi email/pass theo ý muốn.

### **2. Nạp Tiền (Top-up) Cho Admin/User**
Để test game hoặc làm "Nhà cái", tài khoản cần có tiền.

1.  Sửa file `backend/topup_admin.js` (dòng 5 và 6) để nhập Email và Số tiền mong muốn:
    ```javascript
    const email = 'admin@example.com'; // Email tài khoản cần nạp
    const amount = 10000000000;         // Số tiền (USD/VND)
    ```
2.  Chạy script:
    ```bash
    node topup_admin.js
    ```
    *   Script sẽ tự động tìm ví của user và cộng tiền vào (tạo ví mới nếu chưa có).
    *   Hệ thống hỗ trợ số dư cực lớn (lên tới 30 chữ số thập phân) để phục vụ việc làm "Nhà cái".

### **3. Cách Thủ Công (SQL)**
Nếu không muốn dùng script, bạn có thể chạy SQL trực tiếp:

```sql
-- Nâng quyền Admin
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';

-- Nạp tiền (Ví dụ: 10 Tỷ)
UPDATE user_wallets 
SET balance = balance + 10000000000 
WHERE user_id = (SELECT id FROM users WHERE email = 'your-email@example.com');
```

> **Lưu ý**: Tài khoản Admin đầu tiên được tạo sẽ mặc định đóng vai trò "Nhà cái" (House) trong các game như Sic Bo, Bầu Cua để nhận/trả tiền cược. Hãy đảm bảo "Nhà cái" luôn có đủ số dư!

-----

## 🗄️ Database Setup

### **1. Khởi Tạo Database**
```bash
# Chạy script khởi tạo
psql -U postgres -f db/init.sql
```

### **2. Tối Ưu Vector Database**
```bash
# Chạy script tối ưu hóa vector
psql -U postgres -d chatbot -f db/vector_optimization.sql
```

### **3. Dọn Dẹp Database (Nếu Cần)**
```bash
# Loại bỏ các bảng không cần thiết
psql -U postgres -d chatbot -f db/remove_unused_tables.sql
```

---

## 🎯 Sử Dụng Chatbot

### **1. Đăng Ký/Đăng Nhập**
- Truy cập http://localhost:3000
- Đăng ký tài khoản mới hoặc đăng nhập

### **2. Chat Với Bot**
- Nhập câu hỏi vào chat interface
- Bot sẽ tự động tìm kiếm kiến thức liên quan
- Nhận câu trả lời dựa trên RAG

### **3. Quản Lý Kiến Thức (Admin)**
- Upload file kiến thức (.txt, .docx, .pdf)
- Xem và chỉnh sửa chunks
- Quản lý câu hỏi chưa trả lời

### **4. Chơi Game Sic Bo**
- Truy cập mục **Games** từ menu
- Đặt cược vào cửa Tài hoặc Xỉu
- Sử dụng tính năng **Soi Cầu** để xem lịch sử và dự đoán kết quả

---

## 🔧 API Endpoints

### **Authentication**
```http
POST /auth/register    # Đăng ký
POST /auth/login       # Đăng nhập
POST /auth/logout      # Đăng xuất
```

### **Chat**
```http
POST /chat            # Gửi tin nhắn
GET  /chat/history    # Lịch sử chat
DELETE /chat/history/:id # Xóa tin nhắn
```

### **Knowledge Management**
```http
GET    /knowledge      # Lấy danh sách kiến thức
POST   /knowledge      # Thêm kiến thức
PUT    /knowledge/:id  # Cập nhật kiến thức
DELETE /knowledge/:id  # Xóa kiến thức
```

### **Games (Arena)**
```http
POST   /games/taixiu/bet      # Đặt cược Sic Bo
GET    /games/taixiu/history  # Lịch sử Sic Bo
POST   /games/baucua/bet      # Đặt cược Bầu Cua
GET    /games/baucua/history  # Lịch sử Bầu Cua
```

### **File Upload**
```http
POST /upload          # Upload file
GET  /upload/:id      # Lấy file
```

---

## 📊 Performance & Monitoring

### **Vector Search Performance**
- **Small Dataset** (< 10K vectors): < 10ms
- **Medium Dataset** (10K-100K vectors): < 50ms  
- **Large Dataset** (100K+ vectors): < 100ms

### **Caching Strategy**
- **Embedding Cache**: Cache embeddings của câu hỏi thường gặp
- **Context Cache**: Cache kết quả tìm kiếm
- **Session Cache**: Cache dữ liệu session

### **Monitoring Commands**
```bash
# Kiểm tra performance
node test/vector_performance_test.js

# Xem database stats
psql -U postgres -d chatbot -c "SELECT COUNT(*) FROM knowledge_chunks;"

# Monitor logs
docker-compose logs -f backend
```

---

## 🛠️ Development

### **Code Structure**
- **Backend**: Express.js với modular architecture
- **Frontend**: React với Feature-based architecture
- **Database**: PostgreSQL với pgvector optimization
- **AI**: OpenAI API với Advanced RAG pattern

### **Key Features**
- **Vector Database**: Tối ưu cho large-scale vector search
- **Caching Layer**: Redis-style caching cho performance
- **Error Handling**: Comprehensive error handling
- **Security**: JWT authentication, input validation

### **Testing**
```bash
# Chạy tests
npm test

# Performance testing
node test/vector_performance_test.js

# Load testing
node test/load_test.js
```

---

## 🚀 Deployment

### **Production Setup**
```bash
# Build production
docker-compose -f docker-compose.prod.yml up -d

# Environment variables
export NODE_ENV=production
export DB_HOST=your-db-host
export OPENAI_API_KEY=your-api-key
```

### **Scaling**
- **Horizontal**: Multiple backend instances
- **Database**: Read replicas cho vector search
- **Caching**: Redis cluster cho cache layer

---

## 📝 Roadmap

### **Phase 1: Performance** ✅
- [x] Vector database optimization
- [x] Caching implementation
- [x] Database indexing

### **Phase 2: Advanced Features** 🔄
- [x] Advanced RAG implementation
- [x] Hybrid search (vector + keyword)
- [x] Context re-ranking
- [x] Integrate Mini-games (Sic Bo)

### **Phase 3: Intelligence** 📋
- [ ] ML-based algorithm selection
- [ ] Feedback learning
- [ ] A/B testing framework

### **Phase 4: Scale** 📋
- [ ] Vector database migration
- [ ] Microservices architecture
- [ ] Enhanced UX

---

## 🤝 Contributing

1. **Fork** repository
2. **Create** feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

- **Hùng Vũ** - *Initial work* - [hung97vu@gmail.com](mailto:hung97vu@gmail.com)

---

## 🙏 Acknowledgments

- OpenAI API for GPT integration
- React community for excellent documentation
- PostgreSQL team and pgvector for vector search capabilities
- All contributors and testers

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Email**: hung97vu@gmail.com
- **Documentation**: [Wiki](https://github.com/your-repo/wiki)