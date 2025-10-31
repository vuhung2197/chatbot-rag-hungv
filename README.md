# 🤖 Chatbot-RAG-Powered AI Assistant

## 🧠 Giới Thiệu Dự Án

Chatbot AI thông minh được xây dựng với kiến trúc **RAG (Retrieval-Augmented Generation)** tối ưu, hỗ trợ:

- **🎯 Thuần RAG**: Tìm kiếm và trả lời dựa trên kiến thức đã học
- **📚 Quản lý kiến thức**: Upload, chunking và embedding tự động
- **⚡ Advanced RAG**: Multi-stage retrieval, semantic clustering, multi-hop reasoning
- **⚡ Tối ưu hiệu suất**: Vector database với indexing và caching
- **🔒 Bảo mật**: Authentication và authorization đầy đủ

> **Kiến trúc**: Frontend (React) + Backend (Node.js) + MySQL + Vector Database

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
│   (React)       │◄──►│   (Node.js)     │◄──►│   (MySQL)       │
│                 │    │                 │    │                 │
│ • Chat UI       │    │ • RAG Engine    │    │ • Knowledge     │
│ • Admin Panel   │    │ • Vector Search │    │ • Vectors       │
│ • Model Manager │    │ • API Routes    │    │ • Users         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **RAG Processing Flow**
```
User Question → Embedding → Vector Search → Context → GPT → Response
```

---

## 📂 Cấu Trúc Dự Án

```
english-chatbot/
├── 📁 backend/                 # Node.js API Server
│   ├── 📁 controllers/        # API Controllers
│   ├── 📁 services/          # Business Logic
│   │   ├── 🔧 rag_retrieve.js      # Vector search
│   │   ├── 🔧 vectorDatabase.js    # Vector DB service
│   │   └── 🔧 embeddingVector.js   # Embedding service
│   ├── 📁 routes/            # API Routes
│   ├── 📁 middlewares/       # Auth & Error handling
│   └── 📁 utils/             # Utilities
├── 📁 frontend/              # React Application
│   ├── 📁 src/component/     # React Components
│   │   ├── 💬 Chat.js        # Main chat interface
│   │   ├── 🔧 ModelManager.js # Model selection
│   │   └── 📚 KnowledgeAdmin.js # Knowledge management
│   └── 📁 src/hooks/         # Custom hooks
├── 📁 db/                    # Database Scripts
│   ├── 🔧 init.sql          # Database schema
│   ├── 🔧 vector_optimization.sql # Vector optimization
│   └── 🔧 remove_unused_tables.sql # Cleanup scripts
├── 📁 test/                 # Testing files
└── 📄 docker-compose.yml    # Docker configuration
```

---

## ⚙️ Cài Đặt & Chạy Dự Án

### **1. Yêu Cầu Hệ Thống**
- **Docker** + **Docker Compose**
- **Node.js** 18+ (cho development)
- **MySQL** 8.0+ (hoặc sử dụng Docker)

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
# Database
DB_HOST=localhost
DB_USER=chatbot_user
DB_PASSWORD=chatbot_pass
DB_NAME=chatbot
DB_ROOT_PASSWORD=rootpass

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
- **Database**: localhost:3306

---

## 🗄️ Database Setup

### **1. Khởi Tạo Database**
```bash
# Chạy script khởi tạo
mysql -u root -p < db/init.sql
```

### **2. Tối Ưu Vector Database**
```bash
# Chạy script tối ưu hóa vector
mysql -u root -p chatbot < db/vector_optimization.sql
```

### **3. Dọn Dẹp Database (Nếu Cần)**
```bash
# Loại bỏ các bảng không cần thiết
mysql -u root -p chatbot < db/remove_unused_tables.sql
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

### **4. Chọn Model LLM**
- Quản lý và chuyển đổi giữa các model (OpenAI, Ollama)
- Cấu hình temperature và max tokens
- Monitor performance của từng model

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
mysql -u root -p -e "SELECT COUNT(*) FROM knowledge_chunks;"

# Monitor logs
docker-compose logs -f backend
```

---

## 🛠️ Development

### **Code Structure**
- **Backend**: Express.js với modular architecture
- **Frontend**: React với hooks và context
- **Database**: MySQL với vector optimization
- **AI**: OpenAI API với RAG pattern

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
- [ ] Hybrid search (vector + keyword)
- [ ] Context compression
- [ ] Re-ranking system

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
- MySQL team for vector search capabilities
- All contributors and testers

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Email**: hung97vu@gmail.com
- **Documentation**: [Wiki](https://github.com/your-repo/wiki)