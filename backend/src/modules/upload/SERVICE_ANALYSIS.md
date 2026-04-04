# PHÂN TÍCH CHI TIẾT - UPLOAD SERVICE

## Tổng quan
File: `upload.service.js`

Service xử lý upload file (DOCX, TXT) và tự động tạo knowledge base với vector embeddings.

---

## Class: UploadService

### processFile(file)

**Mục đích**: Xử lý file upload và tạo knowledge entry

**Parameters**:
- `file` (Object): Multer file object

**Returns**: `Promise<Object>` - Upload result

**Logic chi tiết**:

#### Step 1: Validate file
```javascript
if (!file) throw new Error('No file uploaded');
const ext = path.extname(file.originalname).toLowerCase();
```

#### Step 2: Extract text content
```javascript
if (ext === '.docx') {
  const result = await mammoth.extractRawText({ path: filePath });
  content = result.value;
} else if (ext === '.txt') {
  content = fs.readFileSync(filePath, 'utf-8');
} else {
  throw new Error('Unsupported file format');
}
```

**Supported formats**:
- `.docx` - Microsoft Word (sử dụng mammoth)
- `.txt` - Plain text

#### Step 3: Handle Vietnamese filename
```javascript
const rawName = Buffer.from(
  path.basename(file.originalname, ext),
  'latin1'
).toString('utf8');
const title = rawName;
```

**Giải thích**: Convert encoding để hiển thị đúng tiếng Việt

#### Step 4: Check duplicate
```javascript
const [rows] = await pool.execute(
  'SELECT id FROM knowledge_base WHERE title = ? LIMIT 1',
  [title]
);
if (rows.length > 0) {
  throw new Error('File already uploaded and trained');
}
```

#### Step 5: Insert to database
```javascript
const [insertRows] = await pool.execute(
  'INSERT INTO knowledge_base (title, content) VALUES (?, ?) RETURNING id',
  [title, content]
);
const knowledgeId = insertRows[0].id;
```

#### Step 6: Generate chunks and embeddings
```javascript
await updateChunksForKnowledge(knowledgeId, title, content);
```

**updateChunksForKnowledge** làm gì:
1. Split content thành chunks (theo token limit)
2. Generate embedding cho mỗi chunk
3. Lưu chunks vào `knowledge_chunks` table

#### Step 7: Calculate file size
```javascript
const fileSizeMB = file.size / (1024 * 1024);
```

#### Step 8: Cleanup temp file
```javascript
fs.unlink(filePath, (err) => {
  if (err) console.error('Error deleting temp file:', err);
});
```

#### Step 9: Return result
```javascript
return {
  knowledgeId,
  title,
  sizeMB: fileSizeMB
};
```

---

## File Processing Flow

```
1. User uploads file
   ↓
2. Multer saves to temp directory
   ↓
3. processFile() extracts text
   ↓
4. Check duplicate by title
   ↓
5. Insert to knowledge_base
   ↓
6. Generate chunks + embeddings
   ↓
7. Delete temp file
   ↓
8. Return result
```

---

## Integration với Knowledge Module

### updateChunksForKnowledge()
External service tạo chunks và embeddings:

```javascript
// Pseudo code
async function updateChunksForKnowledge(knowledgeId, title, content) {
  // 1. Delete old chunks
  await deleteOldChunks(knowledgeId);

  // 2. Split content into chunks
  const chunks = splitIntoChunks(content, MAX_TOKENS);

  // 3. Generate embeddings
  for (const chunk of chunks) {
    const embedding = await getEmbedding(chunk);
    await saveChunk(knowledgeId, chunk, embedding);
  }
}
```

---

## Error Handling

### Common Errors
```javascript
// No file
if (!file) throw new Error('No file uploaded');

// Unsupported format
if (!['.docx', '.txt'].includes(ext)) {
  throw new Error('Unsupported file format');
}

// Duplicate file
if (existingFile) {
  throw new Error('File already uploaded and trained');
}

// Extraction failed
try {
  content = await extractText(file);
} catch (e) {
  throw new Error('Failed to extract text from file');
}
```

---

## File Size Limits

### Recommended Limits
```javascript
const FILE_SIZE_LIMITS = {
  free: 1 * 1024 * 1024,      // 1MB
  pro: 10 * 1024 * 1024,      // 10MB
  team: 50 * 1024 * 1024      // 50MB
};
```

### Validation
```javascript
const userPlan = await getUserPlan(userId);
const limit = FILE_SIZE_LIMITS[userPlan];

if (file.size > limit) {
  throw new Error(`File too large. Max size: ${limit / 1024 / 1024}MB`);
}
```

---

## Multer Configuration

### Storage
```javascript
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/temp/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
```

### File Filter
```javascript
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.docx', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};
```

---

## Best Practices

### 1. Always Cleanup Temp Files
```javascript
// GOOD: Cleanup in finally block
try {
  await processFile(file);
} finally {
  fs.unlink(file.path, () => {});
}

// BAD: No cleanup
await processFile(file);
```

### 2. Validate Before Processing
```javascript
// GOOD: Validate first
if (!file) throw new Error('No file');
if (file.size > MAX_SIZE) throw new Error('Too large');
await processFile(file);

// BAD: Process then validate
await processFile(file);
if (file.size > MAX_SIZE) throw new Error('Too large');
```

### 3. Handle Encoding Properly
```javascript
// GOOD: Handle Vietnamese
const title = Buffer.from(filename, 'latin1').toString('utf8');

// BAD: Direct use (broken Vietnamese)
const title = filename;
```

---

## Security Considerations

### 1. File Type Validation
```javascript
// Validate MIME type
const allowedMimes = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

if (!allowedMimes.includes(file.mimetype)) {
  throw new Error('Invalid file type');
}
```

### 2. Filename Sanitization
```javascript
// Remove dangerous characters
const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
```

### 3. Virus Scanning
```javascript
// Recommended: Scan uploaded files
await scanForVirus(file.path);
```

---

## Performance Optimization

### 1. Async Processing
```javascript
// Process in background
uploadQueue.add({
  fileId,
  filePath,
  userId
});

return { status: 'processing', fileId };
```

### 2. Streaming for Large Files
```javascript
// Stream instead of loading entire file
const stream = fs.createReadStream(filePath);
const chunks = [];

stream.on('data', chunk => {
  chunks.push(chunk);
});
```

### 3. Batch Embedding Generation
```javascript
// Generate embeddings in batch
const embeddings = await generateEmbeddingsBatch(chunks);
```

---

## Cải tiến trong tương lai

1. **More File Formats**: PDF, PPTX, Excel
2. **OCR Support**: Extract text from images
3. **Async Processing**: Queue-based processing
4. **Progress Tracking**: Real-time upload progress
5. **Cloud Storage**: S3, GCS integration
6. **Virus Scanning**: ClamAV integration
7. **Compression**: Compress before storage
8. **Versioning**: Track file versions
