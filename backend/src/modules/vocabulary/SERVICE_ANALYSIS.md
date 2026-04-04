# PHÂN TÍCH CHI TIẾT - VOCABULARY SERVICE & REPOSITORY

## Tổng quan
- File Service: `vocabulary.service.js`
- File Repository: `vocabulary.repository.js`

Module này quản lý từ vựng với hệ thống Spaced Repetition System (SRS) để tối ưu hóa việc ghi nhớ.

---

## VocabularyService (Service Layer)

Service layer cung cấp business logic và gọi repository để thao tác database.

### 1. getSystemVocabulary(userId, level)

**Mục đích**: Lấy danh sách từ vựng hệ thống theo level

**Parameters**:
- `userId` (number): ID người dùng (để check từ đã thêm)
- `level` (string): Cấp độ (A1, A2, B1, B2, C1, C2)

**Returns**: `Promise<Array>` - Danh sách từ vựng hệ thống

**Logic**:
- Gọi `vocabularyRepository.getSystemVocabulary()`
- Repository sẽ LEFT JOIN với user_vocabulary để đánh dấu từ đã thêm

---

### 2. getRecommendWords(userId, count = 5)

**Mục đích**: Gợi ý từ mới cho người dùng

**Parameters**:
- `userId` (number): ID người dùng
- `count` (number): Số lượng từ gợi ý (mặc định: 5)

**Returns**: `Promise<Array>` - Danh sách từ gợi ý

**Logic**:
- Gọi repository để lấy từ chưa học
- Sử dụng thuật toán deterministic random (md5 hash)
- Ưu tiên từ dễ (A1) trước

---

### 3. addSystemWordToUser(userId, wordId)

**Mục đích**: Thêm từ vựng hệ thống vào danh sách cá nhân

**Parameters**:
- `userId` (number): ID người dùng
- `wordId` (number): ID từ vựng hệ thống

**Returns**: `Promise<Object>` - Từ vựng vừa thêm

**Logic**:
1. Gọi repository để thêm từ
2. Nếu từ đã tồn tại → reset mastery về 0
3. Set next_review_at = NOW()

---

### 4. addMultipleSystemWords(userId, wordIds = [])

**Mục đích**: Thêm nhiều từ vựng cùng lúc

**Parameters**:
- `userId` (number): ID người dùng
- `wordIds` (Array<number>): Mảng ID từ vựng

**Returns**: `Promise<Array>` - Danh sách từ đã thêm

**Logic**:
- Loop qua từng wordId
- Gọi `addSystemWordToUser()` cho mỗi từ
- Collect kết quả vào mảng

**Lưu ý**: Có thể tối ưu bằng bulk insert

---

### 5. getUserVocabulary(userId, itemType = 'vocabulary', topic = null)

**Mục đích**: Lấy danh sách từ vựng cá nhân

**Parameters**:
- `userId` (number): ID người dùng
- `itemType` (string): Loại item ('vocabulary', 'phrase')
- `topic` (string): Chủ đề (optional)

**Returns**: `Promise<Object>` - Từ vựng và thống kê

**Return format**:
```javascript
{
  words: [...],
  stats: {
    total: 150,
    mastered: 50,
    learning: 80,
    new: 20
  }
}
```

**Logic**:
1. Gọi repository để lấy danh sách từ
2. Gọi repository để lấy thống kê
3. Combine và return

---

### 6. getWordsDueForReview(userId)

**Mục đích**: Lấy danh sách từ cần ôn tập

**Parameters**:
- `userId` (number): ID người dùng

**Returns**: `Promise<Array>` - Danh sách từ cần ôn

**Logic**:
- Gọi repository
- Lọc từ có next_review_at <= NOW()
- Chỉ lấy từ chưa mastered (mastery < 5)
- Limit 20 từ

---

### 7. getUserTopics(userId)

**Mục đích**: Lấy danh sách topics của user

**Parameters**:
- `userId` (number): ID người dùng

**Returns**: `Promise<Array<string>>` - Danh sách topics

---

### 8. updateMastery(userId, wordId, isCorrect)

**Mục đích**: Cập nhật độ thành thạo sau khi ôn tập

**Parameters**:
- `userId` (number): ID người dùng
- `wordId` (number): ID từ vựng
- `isCorrect` (boolean): Trả lời đúng hay sai

**Returns**: `Promise<Object>` - Từ vựng đã cập nhật

**Logic**: Gọi repository để update theo SRS algorithm

---

## VocabularyRepository (Data Layer)

Repository layer thao tác trực tiếp với database.

### 1. getSystemVocabulary(userId, level, limit = 50, offset = 0)

**SQL Query**:
```sql
SELECT sv.*,
       CASE WHEN uv.id IS NOT NULL THEN true ELSE false END as is_added
FROM system_vocabulary sv
LEFT JOIN user_vocabulary uv
  ON sv.word = uv.word
  AND uv.user_id = $1
  AND uv.item_type = 'vocabulary'
WHERE sv.is_active = true
  AND sv.level = $2  -- nếu có level
ORDER BY sv.level, sv.id
LIMIT $3 OFFSET $4
```

**Giải thích**:
- LEFT JOIN để check từ đã thêm chưa
- CASE WHEN để tạo flag `is_added`
- Filter theo level nếu có
- Pagination với LIMIT/OFFSET

---

### 2. getRecommendWords(userId, count = 5)

**SQL Query**:
```sql
SELECT sv.*
FROM system_vocabulary sv
LEFT JOIN user_vocabulary uv
  ON sv.word = uv.word
  AND uv.user_id = $1
  AND uv.item_type = 'vocabulary'
WHERE sv.is_active = true
  AND uv.id IS NULL  -- Chưa thêm
ORDER BY
  sv.level ASC,  -- Ưu tiên từ dễ
  md5(sv.id::text || CURRENT_DATE::text || $1::text)  -- Deterministic random
LIMIT $2
```

**Giải thích thuật toán**:
1. **Tránh từ đã thêm**: `uv.id IS NULL`
2. **Ưu tiên từ dễ**: `ORDER BY sv.level ASC`
3. **Deterministic random**:
   - Sử dụng md5(id + date + userId)
   - Cùng ngày, cùng user → cùng danh sách
   - Ngày mới → danh sách tự động đổi
   - Tránh RANDOM() vì không ổn định

**Lợi ích**:
- User thấy danh sách nhất quán trong ngày
- Ngày mới có từ mới
- Không cần cache

---

### 3. addSystemWordToUser(userId, wordId)

**Logic xử lý**:
1. Fetch từ vựng từ system_vocabulary
2. Nếu không tìm thấy → throw Error
3. Insert vào user_vocabulary với ON CONFLICT

**SQL Query**:
```sql
INSERT INTO user_vocabulary (
  user_id, word, pos, phonetic, definition,
  translation, example_sentence, level,
  source, source_id, item_type, topic
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'system', $9, 'vocabulary', $10)
ON CONFLICT (user_id, word, item_type)
DO UPDATE SET
  mastery = 0,
  next_review_at = NOW(),
  updated_at = NOW()
RETURNING *;
```

**Giải thích ON CONFLICT**:
- Nếu từ đã tồn tại → reset mastery về 0
- Set next_review_at = NOW() để ôn ngay
- Không tạo duplicate

---

### 4. getUserVocabulary(userId, itemType, topic, masteryLevel)

**SQL Query** (dynamic):
```sql
SELECT * FROM user_vocabulary
WHERE user_id = $1
  AND item_type = $2  -- nếu có
  AND topic = $3      -- nếu có
  AND mastery >= 5    -- nếu masteryLevel = 'memorized'
  AND mastery < 5     -- nếu masteryLevel = 'learning'
ORDER BY created_at DESC
```

**Dynamic query building**:
- Thêm WHERE clause tùy theo parameters
- Sử dụng parameterized query để tránh SQL injection

---

### 5. getWordsDueForReview(userId)

**SQL Query**:
```sql
SELECT * FROM user_vocabulary
WHERE user_id = $1
  AND item_type = 'vocabulary'
  AND mastery < 5
  AND next_review_at <= NOW()
ORDER BY next_review_at ASC
LIMIT 20
```

**Giải thích**:
- Chỉ lấy từ chưa mastered (mastery < 5)
- Lọc theo thời gian ôn tập (next_review_at <= NOW())
- Sắp xếp theo thời gian (từ cần ôn gấp nhất trước)
- Limit 20 để không overwhelm user

---

### 6. updateMastery(userId, wordId, isCorrect)

**Spaced Repetition Algorithm**:

```javascript
let newMastery = word.mastery;
let daysToNext = 0;

if (isCorrect) {
  newMastery = Math.min(5, newMastery + 1);
  daysToNext = Math.pow(2, newMastery) - 1;
  // Mastery 1 → 1 day
  // Mastery 2 → 3 days
  // Mastery 3 → 7 days
  // Mastery 4 → 15 days
  // Mastery 5 → 31 days
} else {
  newMastery = Math.max(0, newMastery - 1);
  daysToNext = 0; // Ôn lại ngay
}
```

**SQL Query**:
```sql
UPDATE user_vocabulary
SET mastery = $1,
    review_count = review_count + 1,
    next_review_at = NOW() + INTERVAL '${daysToNext} days',
    updated_at = NOW()
WHERE id = $2 AND user_id = $3
RETURNING *;
```

**Giải thích thuật toán**:
- **Correct**: Tăng mastery, kéo dài thời gian ôn
- **Wrong**: Giảm mastery, ôn lại ngay
- **Exponential backoff**: 2^n - 1 days
- **Max mastery**: 5 (mastered)

---

### 7. getVocabularyStats(userId)

**SQL Query**:
```sql
SELECT
  COUNT(*) as total_words,
  SUM(CASE WHEN mastery >= 5 THEN 1 ELSE 0 END) as memorized_words,
  SUM(CASE WHEN mastery < 5 THEN 1 ELSE 0 END) as learning_words,
  SUM(CASE WHEN item_type = 'pronunciation' THEN 1 ELSE 0 END) as pronunciation_errors,
  SUM(CASE WHEN item_type = 'grammar' THEN 1 ELSE 0 END) as grammar_errors
FROM user_vocabulary
WHERE user_id = $1
```

**Giải thích**:
- Sử dụng CASE WHEN để đếm theo điều kiện
- Một query duy nhất cho tất cả stats
- Hiệu quả hơn nhiều query riêng lẻ

---

## Spaced Repetition System (SRS)

### Mastery Levels
```
0: New (chưa học)
1: Just learned (mới học)
2: Learning (đang học)
3: Familiar (quen thuộc)
4: Proficient (thành thạo)
5: Mastered (thuộc lòng)
```

### Review Intervals
```
Mastery 0 → 0 days (ngay lập tức)
Mastery 1 → 1 day
Mastery 2 → 3 days
Mastery 3 → 7 days
Mastery 4 → 15 days
Mastery 5 → 31 days
```

### Algorithm Flow
```
User reviews word
    ↓
Is correct?
    ↓ Yes              ↓ No
Mastery + 1        Mastery - 1
    ↓                  ↓
Interval = 2^n-1   Interval = 0
    ↓                  ↓
Next review        Review now
```

---

## Best Practices

### 1. Batch Operations
```javascript
// BAD: Loop với await
for (const id of wordIds) {
  await addSystemWordToUser(userId, id);
}

// GOOD: Bulk insert
await vocabularyRepository.bulkAddWords(userId, wordIds);
```

### 2. Caching
```javascript
// Cache system vocabulary
const cacheKey = `system_vocab:${level}`;
let words = await cache.get(cacheKey);
if (!words) {
  words = await repository.getSystemVocabulary(userId, level);
  await cache.set(cacheKey, words, 3600); // 1 hour
}
```

### 3. Error Handling
```javascript
try {
  await updateMastery(userId, wordId, isCorrect);
} catch (error) {
  if (error.message === 'Word not found') {
    // Handle gracefully
  }
  throw error;
}
```

---

## Performance Optimization

### Database Indexes
```sql
-- User vocabulary queries
CREATE INDEX idx_user_vocab_user ON user_vocabulary(user_id);
CREATE INDEX idx_user_vocab_review ON user_vocabulary(user_id, next_review_at);
CREATE INDEX idx_user_vocab_mastery ON user_vocabulary(user_id, mastery);

-- System vocabulary
CREATE INDEX idx_system_vocab_level ON system_vocabulary(level);
CREATE INDEX idx_system_vocab_active ON system_vocabulary(is_active);
```

### Query Optimization
- Sử dụng LIMIT để giới hạn kết quả
- Pagination thay vì load all
- Aggregate queries thay vì multiple queries

---

## Cải tiến trong tương lai

1. **Adaptive SRS**: Điều chỉnh interval dựa trên performance
2. **Context Learning**: Học từ trong ngữ cảnh
3. **Audio Integration**: Phát âm tự động
4. **Gamification**: Streak, badges, leaderboard
5. **AI Suggestions**: Gợi ý từ dựa trên nội dung đang học
