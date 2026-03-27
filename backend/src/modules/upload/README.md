# Module Upload

## Mục đích
Module Upload xử lý việc upload file từ người dùng, bao gồm hình ảnh, audio, video và documents.

## Chức năng chính

### 1. File Upload
- Upload hình ảnh (avatar, images)
- Upload audio (speaking exercises)
- Upload documents (PDF, DOCX, TXT)
- Validation file type và size

### 2. File Processing
- Resize và optimize hình ảnh
- Convert audio format
- Extract text từ documents
- Generate thumbnails

### 3. Storage Management
- Lưu trữ local hoặc cloud
- Tạo unique filename
- Organize theo folders
- Cleanup old files

### 4. CDN Integration
- Serve files qua CDN
- Generate signed URLs
- Cache control

## Cấu trúc

```
upload/
├── controllers/
│   └── upload.controller.js         # Xử lý HTTP requests
├── routes/
│   └── upload.routes.js             # Định nghĩa API endpoints
└── services/
    └── upload.service.js            # Business logic
```

## API Endpoints

### POST /api/upload/image
Upload hình ảnh

**Request:** multipart/form-data
- `file`: File hình ảnh

**Response:**
```json
{
  "url": "https://cdn.example.com/images/abc123.jpg",
  "filename": "abc123.jpg",
  "size": 102400
}
```

### POST /api/upload/audio
Upload file audio

### POST /api/upload/document
Upload document

### DELETE /api/upload/:filename
Xóa file

## File Validation

### Allowed Types
```javascript
const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  document: ['application/pdf', 'application/msword', 'text/plain']
};
```

### Size Limits
```javascript
const SIZE_LIMITS = {
  image: 5 * 1024 * 1024,      // 5MB
  audio: 10 * 1024 * 1024,     // 10MB
  document: 20 * 1024 * 1024   // 20MB
};
```

## Storage Structure

```
uploads/
├── images/
│   ├── avatars/
│   └── content/
├── audio/
│   ├── speaking/
│   └── listening/
└── documents/
    └── knowledge/
```

## Image Processing

```javascript
import sharp from 'sharp';

// Resize và optimize
await sharp(inputPath)
  .resize(800, 600, { fit: 'inside' })
  .jpeg({ quality: 80 })
  .toFile(outputPath);
```

## Security

### File Validation
- Check MIME type
- Verify file extension
- Scan for malware
- Sanitize filename

### Access Control
- Private files require authentication
- Signed URLs with expiration
- Rate limiting

## Sử dụng

```javascript
import uploadService from './services/upload.service.js';

// Upload file
const result = await uploadService.uploadFile(file, 'image');

// Delete file
await uploadService.deleteFile(filename);

// Get signed URL
const url = await uploadService.getSignedUrl(filename, 3600);
```

## Cải tiến trong tương lai
- Cloud storage (S3, GCS)
- Image CDN integration
- Video processing
- Batch upload
- Progress tracking
