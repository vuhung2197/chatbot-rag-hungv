# PHÂN TÍCH CHI TIẾT - SPEAKING SERVICE

## Tổng quan
File: `speaking.service.js`

Service này quản lý bài tập luyện nói với đánh giá phát âm bằng Azure Speech Service và AI.

---

## Helper Functions

### 1. gradePronunciationType(topic, audioFilePath, transcript)

**Mục đích**: Chấm điểm phát âm/shadowing với Azure fallback

**Logic**:
1. Thử chấm bằng Azure Speech Service trước
2. Nếu Azure fail → fallback sang Whisper AI
3. Return evaluation result

**Use cases**:
- Topic type = 'pronunciation'
- Topic type = 'shadowing'

---

### 2. gradeByTopicType(topic, audioFilePath, transcript)

**Mục đích**: Chấm điểm theo loại topic

**Logic**:
```javascript
if (type === 'shadowing' || type === 'pronunciation') {
  return await gradePronunciationType(...);
}
if (type === 'reflex') {
  return await speakingAiService.gradeReflex(...);
}
return await speakingAiService.gradeTopic(...);
```

**Topic Types**:
- **pronunciation**: Đọc từ/câu cụ thể
- **shadowing**: Bắt chước native speaker
- **reflex**: Phản xạ nhanh (quick response)
- **topic**: Nói về chủ đề

---

### 3. extractKnowledgeItems(topic, evaluation)

**Mục đích**: Trích xuất lỗi để lưu vào knowledge hub

**Return**:
```javascript
{
  pronunciationItems: [
    {
      expected: 'think',
      heard: 'sink',
      tip: 'Use /θ/ sound'
    }
  ],
  grammarItems: [
    {
      mistake: 'I go to school yesterday',
      correction: 'I went to school yesterday',
      explanation: 'Use past tense'
    }
  ]
}
```

---

### 4. logMistakesToAnalytics(userId, submissionId, pronunciationItems, grammarItems)

**Mục đích**: Ghi nhận lỗi vào Analytics module (fire-and-forget)

**Logic**:
- Loop qua pronunciation errors → log với category 'pronunciation'
- Loop qua grammar errors → log với category 'grammar'
- Sử dụng silent fail (catch error nhưng không throw)

**Lý do fire-and-forget**:
- Không muốn analytics fail làm ảnh hưởng submission
- Log là secondary operation

---

### 5. saveKnowledgeBatch(userId, submissionId, newWords, pronunciationItems, grammarItems)

**Mục đích**: Lưu từ vựng và lỗi vào knowledge hub

**Logic**:
1. Combine pronunciation và grammar items
2. Call repository để bulk insert
3. Catch error nhưng không throw

---

## Main Service Functions

### 1. getTopics({ type, level, page, limit })

**Mục đích**: Lấy danh sách topics với pagination

**Parameters**:
```javascript
{
  type: 'pronunciation' | 'shadowing' | 'reflex' | 'topic',
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2',
  page: 1,
  limit: 10
}
```

**Returns**:
```javascript
{
  topics: [...],
  pagination: {
    page: 1,
    limit: 10,
    total: 50,
    totalPages: 5
  }
}
```

**Logic**:
1. Tính offset = (page - 1) * limit
2. Call repository với filters
3. Return topics + pagination info

---

### 2. getTopicById(id)

**Mục đích**: Lấy chi tiết một topic

**Parameters**:
- `id` (number): ID của topic

**Returns**: `Promise<Object>` - Topic details

**Logic**:
1. Call repository để get topic
2. Nếu không tìm thấy → throw Error
3. Return topic

---

### 3. ensureTopicAudio(id)

**Mục đích**: Đảm bảo topic có audio (tạo TTS nếu chưa có)

**Parameters**:
- `id` (number): ID của topic

**Returns**: `Promise<string>` - Audio URL

**Logic**:
1. Get topic by ID
2. Nếu đã có audio_url → return luôn
3. Nếu chưa có:
   - Generate audio bằng TTS (text-to-speech)
   - Upload lên storage
   - Update topic với audio_url
   - Return audio_url

**Use cases**:
- Shadowing exercises cần audio mẫu
- Pronunciation exercises cần audio hướng dẫn

---

### 4. submitSpeaking(userId, { topicId, audioFile, transcript, newWords })

**Mục đích**: Nộp bài nói và tự động chấm điểm

**Parameters**:
```javascript
{
  topicId: 123,
  audioFile: File,           // File audio đã ghi
  transcript: 'text...',     // Transcript (optional, sẽ tự động tạo nếu không có)
  newWords: ['word1', ...]   // Từ mới học được (optional)
}
```

**Returns**:
```javascript
{
  submission: {
    id: 1,
    user_id: 123,
    topic_id: 456,
    audio_url: 'https://...',
    transcript: 'I think this is good',
    score_pronunciation: 8.5,
    score_fluency: 7.0,
    score_total: 7.75,
    feedback: {...},
    created_at: '2026-03-27T10:00:00Z'
  },
  evaluation: {
    pronunciation: 8.5,
    fluency: 7.0,
    completeness: 9.0,
    mistakes: [...],
    suggestions: [...]
  }
}
```

**Logic chi tiết**:

#### Step 1: Validate và prepare
```javascript
// Get topic
const topic = await getTopicById(topicId);

// Upload audio file
const audioUrl = await uploadAudio(audioFile);

// Transcribe nếu chưa có
if (!transcript) {
  transcript = await transcribeAudio(audioFile);
}
```

#### Step 2: Grade theo topic type
```javascript
const evaluation = await gradeByTopicType(
  topic,
  audioFilePath,
  transcript
);
```

**Evaluation format**:
```javascript
{
  pronunciation: 8.5,      // Điểm phát âm (0-10)
  fluency: 7.0,           // Điểm trôi chảy (0-10)
  completeness: 9.0,      // Điểm hoàn thành (0-10)
  mistakes: [             // Danh sách lỗi
    {
      expected: 'think',
      heard: 'sink',
      tip: 'Use /θ/ sound'
    }
  ],
  suggestions: [          // Gợi ý cải thiện
    'Practice /θ/ sound more',
    'Speak more slowly'
  ]
}
```

#### Step 3: Calculate total score
```javascript
const scoreTotal = (
  evaluation.pronunciation * 0.4 +
  evaluation.fluency * 0.3 +
  evaluation.completeness * 0.3
);
```

**Trọng số**:
- Pronunciation: 40%
- Fluency: 30%
- Completeness: 30%

#### Step 4: Save submission
```javascript
const submission = await speakingRepository.createSubmission({
  userId,
  topicId,
  audioUrl,
  transcript,
  scorePronunciation: evaluation.pronunciation,
  scoreFluency: evaluation.fluency,
  scoreTotal,
  feedback: evaluation
});
```

#### Step 5: Extract và save knowledge
```javascript
const { pronunciationItems, grammarItems } =
  extractKnowledgeItems(topic, evaluation);

await saveKnowledgeBatch(
  userId,
  submission.id,
  newWords,
  pronunciationItems,
  grammarItems
);
```

#### Step 6: Log mistakes to analytics (fire-and-forget)
```javascript
logMistakesToAnalytics(
  userId,
  submission.id,
  pronunciationItems,
  grammarItems
);
```

#### Step 7: Return result
```javascript
return {
  submission,
  evaluation
};
```

---

## Azure Speech Service Integration

### Pronunciation Assessment API

**Request**:
```javascript
{
  audioFile: Buffer,
  referenceText: 'I think this is good',
  language: 'en-US'
}
```

**Response**:
```javascript
{
  pronunciationScore: 85,
  accuracyScore: 90,
  fluencyScore: 80,
  completenessScore: 95,
  words: [
    {
      word: 'think',
      accuracyScore: 75,
      errorType: 'Mispronunciation'
    }
  ]
}
```

**Mapping to our format**:
```javascript
{
  pronunciation: pronunciationScore / 10,
  fluency: fluencyScore / 10,
  completeness: completenessScore / 10,
  mistakes: words
    .filter(w => w.errorType)
    .map(w => ({
      expected: w.word,
      heard: w.word,
      tip: `Improve pronunciation of "${w.word}"`
    }))
}
```

---

## AI Grading (Fallback)

### When Azure fails
1. Transcribe audio bằng Whisper
2. Gửi transcript + reference text cho GPT-4
3. GPT-4 phân tích và đánh giá

### Prompt template
```
You are an English pronunciation expert.

Reference text: "I think this is good"
Student said: "I sink zis is good"

Evaluate:
1. Pronunciation accuracy (0-10)
2. Fluency (0-10)
3. Completeness (0-10)
4. List specific mistakes
5. Provide improvement suggestions

Return JSON format.
```

---

## Topic Types Chi Tiết

### 1. Pronunciation
**Mục đích**: Luyện phát âm từ/câu cụ thể

**Example**:
```javascript
{
  type: 'pronunciation',
  level: 'A1',
  prompt_text: 'think, this, that, three',
  audio_url: 'https://...'  // Audio mẫu
}
```

**Grading focus**:
- Accuracy của từng âm
- Stress và intonation

---

### 2. Shadowing
**Mục đích**: Bắt chước native speaker

**Example**:
```javascript
{
  type: 'shadowing',
  level: 'B1',
  prompt_text: 'I think this is a great opportunity...',
  audio_url: 'https://...'  // Audio native speaker
}
```

**Grading focus**:
- Pronunciation
- Rhythm và intonation
- Speed matching

---

### 3. Reflex
**Mục đích**: Phản xạ nhanh, trả lời câu hỏi

**Example**:
```javascript
{
  type: 'reflex',
  level: 'B2',
  prompt_text: 'What did you do yesterday?'
}
```

**Grading focus**:
- Response time
- Grammar correctness
- Vocabulary usage

---

### 4. Topic
**Mục đích**: Nói về chủ đề trong 1-2 phút

**Example**:
```javascript
{
  type: 'topic',
  level: 'C1',
  prompt_text: 'Describe your favorite place and explain why you like it.'
}
```

**Grading focus**:
- Content relevance
- Grammar và vocabulary
- Coherence và organization

---

## Best Practices

### 1. Audio Processing
```javascript
// Validate audio format
const allowedFormats = ['audio/wav', 'audio/mp3', 'audio/ogg'];
if (!allowedFormats.includes(audioFile.mimetype)) {
  throw new Error('Invalid audio format');
}

// Check file size (max 10MB)
if (audioFile.size > 10 * 1024 * 1024) {
  throw new Error('Audio file too large');
}
```

### 2. Error Handling
```javascript
try {
  evaluation = await azureSpeechService.evaluate(...);
} catch (azureError) {
  console.warn('Azure failed, using AI fallback');
  evaluation = await speakingAiService.grade(...);
}
```

### 3. Async Operations
```javascript
// Fire-and-forget operations
Promise.all([
  logMistakesToAnalytics(...),
  saveKnowledgeBatch(...)
]).catch(e => console.error('Background task failed:', e));

// Don't await, don't block main flow
```

---

## Performance Optimization

### 1. Audio Upload
```javascript
// Upload to CDN asynchronously
const audioUrl = await uploadToCDN(audioFile);

// Generate thumbnail/waveform in background
generateWaveform(audioUrl).catch(console.error);
```

### 2. Caching
```javascript
// Cache topic audio URLs
const cacheKey = `topic_audio:${topicId}`;
let audioUrl = await cache.get(cacheKey);
if (!audioUrl) {
  audioUrl = await ensureTopicAudio(topicId);
  await cache.set(cacheKey, audioUrl, 86400); // 24 hours
}
```

### 3. Batch Processing
```javascript
// Process multiple submissions in parallel
const submissions = await Promise.all(
  audioFiles.map(file => submitSpeaking(userId, file))
);
```

---

## Cải tiến trong tương lai

1. **Real-time Feedback**: WebSocket cho feedback real-time
2. **Voice Cloning**: Clone giọng native speaker để practice
3. **Conversation Mode**: Luyện hội thoại 2 chiều
4. **Accent Training**: Luyện giọng British/American
5. **Peer Review**: Học viên đánh giá lẫn nhau
6. **Progress Tracking**: Theo dõi cải thiện theo thời gian
