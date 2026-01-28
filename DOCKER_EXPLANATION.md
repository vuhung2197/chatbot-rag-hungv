# Giải thích chi tiết về Docker và cơ chế hoạt động

## Mục lục
1. [Docker là gì?](#docker-là-gì)
2. [Các khái niệm cơ bản](#các-khái-niệm-cơ-bản)
3. [Cơ chế hoạt động của Docker](#cơ-chế-hoạt động-của-docker)
4. [Docker Images và Containers](#docker-images-và-containers)
5. [Docker Volumes và vấn đề Node Modules](#docker-volumes-và-vấn-đề-node-modules)
6. [Vấn đề Sharp mà chúng ta gặp phải](#vấn-đề-sharp-mà-chúng-ta-gặp-phải)
7. [Giải pháp đã áp dụng](#giải-pháp-đã-áp-dụng)

---

## Docker là gì?

**Docker** là một platform cho phép đóng gói ứng dụng cùng với toàn bộ dependencies (thư viện, runtime, tools) vào trong một "container" nhẹ, có thể chạy độc lập trên bất kỳ máy chủ nào có cài Docker.

### So sánh với Virtual Machine (VM):

```
┌─────────────────────────────────────────────────┐
│              Virtual Machine                    │
│  ┌──────────────┐  ┌──────────────┐           │
│  │   Guest OS   │  │   Guest OS   │           │
│  │  + App       │  │  + App       │           │
│  └──────────────┘  └──────────────┘           │
│         │                  │                   │
│  ┌──────────────────────────────────┐          │
│  │      Hypervisor (VMware/etc)     │          │
│  └──────────────────────────────────┘          │
│         │                                       │
│  ┌──────────────────────────────────┐          │
│  │        Host Operating System     │          │
│  └──────────────────────────────────┘          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                 Docker                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Container│  │ Container│  │ Container│     │
│  │  + App   │  │  + App   │  │  + App   │     │
│  └──────────┘  └──────────┘  └──────────┘     │
│         │             │             │          │
│  ┌──────────────────────────────────┐          │
│  │      Docker Engine               │          │
│  └──────────────────────────────────┘          │
│         │                                       │
│  ┌──────────────────────────────────┐          │
│  │        Host Operating System     │          │
│  └──────────────────────────────────┘          │
└─────────────────────────────────────────────────┘
```

**Điểm khác biệt chính:**
- **VM**: Mỗi VM cần một Guest OS riêng → nặng, tốn tài nguyên
- **Docker**: Chia sẻ kernel của Host OS → nhẹ, nhanh, tiết kiệm tài nguyên

---

## Các khái niệm cơ bản

### 1. **Docker Image** (Hình ảnh)
- Là một **template** bất biến (immutable) chứa:
  - Operating system (Linux base)
  - Runtime (Node.js, Python, etc.)
  - Application code
  - Dependencies
  - Configuration
- Ví dụ: `node:18`, `mysql:8`, `nginx:latest`
- Được build từ **Dockerfile**

### 2. **Docker Container** (Container)
- Là một **instance đang chạy** của Image
- Có thể start, stop, restart
- Có thể có nhiều containers từ cùng một image
- Mỗi container có:
  - Filesystem riêng
  - Network riêng
  - Process tree riêng

### 3. **Dockerfile**
- File text chứa các lệnh để build image
- Mỗi lệnh tạo một "layer" trong image

### 4. **Docker Compose**
- Tool để quản lý nhiều containers cùng lúc
- Định nghĩa trong file `docker-compose.yml`
- Cho phép:
  - Build nhiều services
  - Cấu hình network giữa containers
  - Cấu hình volumes
  - Environment variables

---

## Cơ chế hoạt động của Docker

### Quy trình Build Image

```bash
# 1. Viết Dockerfile
FROM node:18          # Bắt đầu từ image node:18 (base layer)
WORKDIR /app          # Tạo và chuyển đến thư mục /app
COPY package*.json ./ # Copy package.json (tạo layer mới)
RUN npm install       # Chạy npm install (tạo layer mới)
COPY . .              # Copy toàn bộ code (tạo layer mới)
EXPOSE 3001           # Khai báo port (metadata, không tạo layer)
CMD ["node", "index.js"] # Lệnh mặc định khi start container
```

**Quá trình build:**

```
┌─────────────────────────────────────────────┐
│  docker build -t myapp:latest .             │
└─────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│  Layer 1: FROM node:18                      │
│  - Download base image từ Docker Hub        │
│  - Chứa OS và Node.js runtime              │
└─────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│  Layer 2: WORKDIR /app                      │
│  - Tạo thư mục /app                         │
└─────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│  Layer 3: COPY package*.json ./             │
│  - Copy file từ host vào image              │
└─────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│  Layer 4: RUN npm install                   │
│  - Chạy lệnh trong container                │
│  - Tạo node_modules với binaries Linux      │
└─────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│  Layer 5: COPY . .                          │
│  - Copy source code vào image               │
└─────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│  Final Image: myapp:latest                  │
│  - Chứa tất cả các layers                   │
│  - Sẵn sàng để tạo containers              │
└─────────────────────────────────────────────┘
```

**Đặc điểm quan trọng:**
- Mỗi layer là **immutable** (bất biến)
- Nếu thay đổi code, chỉ Layer 5 được rebuild
- Các layers trước đó được cache → build nhanh hơn

### Quy trình chạy Container

```bash
docker run -d -p 3001:3001 myapp:latest
```

**Quá trình:**

```
┌─────────────────────────────────────────────┐
│  1. Pull/Create image (nếu chưa có)        │
└─────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│  2. Tạo Container Filesystem                │
│     - Copy-on-Write (COW) từ image         │
│     - Container có filesystem riêng        │
└─────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│  3. Allocate Network                       │
│     - Tạo virtual network interface        │
│     - Map port 3001:3001                   │
└─────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│  4. Start Container Process                 │
│     - Chạy CMD hoặc ENTRYPOINT             │
│     - Process chạy trong namespace riêng   │
└─────────────────────────────────────────────┘
```

**Container Filesystem:**
```
┌─────────────────────────────────────────────┐
│  Image Layers (Read-Only)                   │
│  ├─ Layer 1: Base OS                       │
│  ├─ Layer 2: Node.js                       │
│  ├─ Layer 3: Dependencies                  │
│  └─ Layer 4: App Code                      │
└─────────────────────────────────────────────┘
              │
              ▼ Copy-on-Write
┌─────────────────────────────────────────────┐
│  Container Layer (Read-Write)               │
│  ├─ /app/node_modules (từ image)          │
│  ├─ /app/index.js (từ image)              │
│  └─ Logs, temp files, etc. (tạo mới)      │
└─────────────────────────────────────────────┘
```

---

## Docker Images và Containers

### Image Layers (Read-Only)

```dockerfile
FROM node:18              # Layer 1: Base image (500MB)
WORKDIR /app              # Layer 2: Metadata
RUN npm install           # Layer 3: node_modules (200MB)
COPY . .                  # Layer 4: Source code (5MB)
```

**Khi có nhiều containers từ cùng image:**

```
Image: myapp:latest (Read-Only)
├─ Layer 1 (500MB)
├─ Layer 2
├─ Layer 3 (200MB)
└─ Layer 4 (5MB)

Container 1          Container 2          Container 3
├─ Shares Layer 1    ├─ Shares Layer 1   ├─ Shares Layer 1
├─ Shares Layer 2    ├─ Shares Layer 2   ├─ Shares Layer 2
├─ Shares Layer 3    ├─ Shares Layer 3   ├─ Shares Layer 3
├─ Shares Layer 4    ├─ Shares Layer 4   ├─ Shares Layer 4
└─ R/W Layer (1MB)   └─ R/W Layer (1MB)  └─ R/W Layer (1MB)

Tổng dung lượng: ~705MB (không phải 2115MB!)
```

### Container Runtime

```
Host OS (Windows/Linux/Mac)
    │
    ├─ Docker Engine
    │     │
    │     ├─ Container 1 (Namespace riêng)
    │     │     ├─ PID namespace
    │     │     ├─ Network namespace
    │     │     ├─ Mount namespace
    │     │     └─ Filesystem namespace
    │     │
    │     ├─ Container 2 (Namespace riêng)
    │     │     └─ ...
    │     │
    │     └─ Container 3 (Namespace riêng)
    │           └─ ...
```

**Namespace Isolation:**
- Mỗi container không thấy processes của container khác
- Mỗi container có network riêng
- Mỗi container có filesystem riêng

---

## Docker Volumes và vấn đề Node Modules

### Docker Volumes là gì?

**Volume** cho phép mount thư mục từ host vào container để:
- Persist data (lưu trữ dữ liệu)
- Share data giữa containers
- **Development:** Mount source code để hot reload

### Các loại Volumes

#### 1. **Bind Mount** (Mount từ host)
```yaml
volumes:
  - ./backend:/app  # Mount ./backend (host) → /app (container)
```

**Cơ chế:**
```
Host (Windows)              Container (Linux)
├─ D:\english-chatbot       ├─ /app
│  └─ backend               │  └─ (mount point)
│     ├─ index.js  ────────┼─> index.js (đồng bộ)
│     ├─ package.json ─────┼─> package.json (đồng bộ)
│     └─ node_modules      │  └─ node_modules ❌
│        └─ (Windows binaries)   (bị mount từ host!)
```

**Vấn đề:**
- Thư mục host **ghi đè hoàn toàn** thư mục trong container
- Nếu host có `node_modules` (Windows), nó sẽ mount vào container
- Container cần `node_modules` Linux → **LỖI!**

#### 2. **Named Volume**
```yaml
volumes:
  - mydata:/var/lib/mysql  # Named volume
```

#### 3. **Anonymous Volume** (Volume ẩn danh)
```yaml
volumes:
  - /app/node_modules  # Tạo volume riêng cho node_modules
```

### Giải pháp: Anonymous Volume cho node_modules

```yaml
volumes:
  - ./backend:/app           # Mount code từ host
  - /app/node_modules        # Tạo volume riêng → KHÔNG mount từ host
```

**Cơ chế hoạt động:**

```
Host (Windows)              Container (Linux)
├─ D:\english-chatbot       ├─ /app
│  └─ backend               │  ├─ index.js (mount từ host) ✅
│     ├─ index.js  ────────┼─> package.json (mount từ host) ✅
│     ├─ package.json ─────┼─> src/ (mount từ host) ✅
│     └─ node_modules      │  │
│        └─ (Windows)      │  └─ node_modules (volume riêng) ✅
│                          │     └─ (Linux binaries từ image)
│                          │
│                          └─ Anonymous Volume
│                             └─ node_modules (Linux) ✅
```

**Thứ tự mount (quan trọng!):**
1. Docker tạo `/app` từ image (có `node_modules` Linux)
2. Bind mount `./backend:/app` → mount code từ host
3. Anonymous volume `/app/node_modules` → **ghi đè** node_modules từ bind mount
4. Kết quả: Code từ host + node_modules Linux từ image ✅

---

## Vấn đề Sharp mà chúng ta gặp phải

### Vấn đề ban đầu

**Sharp** là thư viện xử lý ảnh có:
- Binary files phụ thuộc platform (Windows/Linux/macOS)
- Windows binary: `sharp-win32-x64`
- Linux binary: `sharp-linux-x64`

### Tình huống:

```
1. Developer cài đặt trên Windows:
   npm install sharp
   → node_modules/sharp chứa Windows binaries

2. Build Docker image (Linux):
   FROM node:18
   RUN npm install --include=optional sharp
   → node_modules/sharp chứa Linux binaries ✅

3. Chạy container với volume mount:
   volumes:
     - ./backend:/app
   
   → ./backend/node_modules (Windows) mount vào /app
   → Ghi đè node_modules Linux trong container ❌
   → Lỗi: "Could not load linux-x64 runtime"
```

### Error Message:

```
Error: Could not load the "sharp" module using the linux-x64 runtime

Possible solutions:
- Ensure optional dependencies can be installed
- Add platform-specific dependencies
```

---

## Giải pháp đã áp dụng

### Bước 1: Cập nhật Dockerfile

**Trước:**
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install              # ❌ Không cài optional deps
COPY . .
```

**Sau:**
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install --include=optional  # ✅ Cài optional deps (Linux binaries)
RUN npm rebuild sharp              # ✅ Rebuild sharp cho Linux
COPY . .
```

**Giải thích:**
- `--include=optional`: Đảm bảo cài các optional dependencies (platform-specific binaries)
- `npm rebuild sharp`: Build lại sharp cho platform hiện tại (Linux)

### Bước 2: Cập nhật docker-compose.yml

**Trước:**
```yaml
volumes:
  - ./backend:/app  # ❌ Mount cả node_modules từ host
```

**Sau:**
```yaml
volumes:
  - ./backend:/app           # ✅ Mount code từ host
  - /app/node_modules        # ✅ Volume riêng cho node_modules
```

**Giải thích:**
- Bind mount `./backend:/app`: Mount source code để hot reload
- Anonymous volume `/app/node_modules`: Giữ node_modules Linux từ image, không bị mount từ host

### Quy trình hoạt động sau khi fix:

```
1. Build Image:
   ├─ npm install --include=optional
   │  └─ Cài sharp với Linux binaries ✅
   └─ npm rebuild sharp
      └─ Đảm bảo sharp hoạt động trên Linux ✅

2. Create Container:
   ├─ Copy image layers (có node_modules Linux) ✅
   ├─ Bind mount ./backend:/app (mount code) ✅
   └─ Anonymous volume /app/node_modules
      └─ Ghi đè node_modules từ bind mount ✅
      └─ Giữ lại Linux binaries ✅

3. Run Container:
   ├─ Code từ host (hot reload) ✅
   └─ node_modules từ image (Linux binaries) ✅
   └─ Sharp hoạt động bình thường! ✅
```

---

## Tóm tắt

### Kiến thức quan trọng:

1. **Docker Images** là read-only templates, được tạo thành các layers
2. **Containers** là running instances với read-write layer riêng
3. **Bind Mounts** ghi đè thư mục trong container
4. **Anonymous Volumes** tạo volume riêng để tránh mount từ host
5. **Platform-specific binaries** (như sharp) cần được cài đúng platform

### Best Practices:

✅ **DO:**
- Sử dụng anonymous volume cho `node_modules` khi mount source code
- Build image trên platform tương tự với runtime (hoặc dùng buildx)
- Cài optional dependencies với `--include=optional`

❌ **DON'T:**
- Mount `node_modules` từ host vào container (nếu khác platform)
- Quên cài optional dependencies
- Build Windows binaries rồi chạy trên Linux container

### Lệnh hữu ích:

```bash
# Xem layers của image
docker history myapp:latest

# Xem volumes
docker volume ls

# Inspect container để xem mounts
docker inspect <container_id>

# Rebuild trong container đang chạy
docker-compose exec backend npm rebuild sharp

# Xem logs
docker-compose logs -f backend
```

---

## Tài liệu tham khảo

- [Docker Documentation](https://docs.docker.com/)
- [Docker Volumes](https://docs.docker.com/storage/volumes/)
- [Sharp Installation](https://sharp.pixelplumbing.com/install)
- [Docker Layers](https://docs.docker.com/storage/storagedriver/)
- [Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)

---

**Tác giả:** Auto (Cursor AI)  
**Ngày tạo:** 2024  
**Dự án:** English Chatbot




