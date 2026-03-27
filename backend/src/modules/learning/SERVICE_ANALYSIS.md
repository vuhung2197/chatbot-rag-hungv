# PHÂN TÍCH CHI TIẾT - LEARNING SERVICE

## Tổng quan
Files: `learning.service.js`, `learningAI.service.js`

Service cung cấp bite-sized AI lessons với quiz và flashcards.

---

## learningService

### 1. getMiniLesson(category, level, topicTitle)

**Mục đích**: Tạo bài học AI real-time

**Parameters**:
- `category`: 'grammar' | 'pattern' | 'pronunciation'
- `level`: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
- `topicTitle`: Tên chủ đề cụ thể

**Returns**: Lesson plan từ AI

**Logic**: Gọi `learningAiService.generateLesson()`

---

### 2. submitQuiz(userId, { category, level, title, score, flashcard_item })

**Mục đích**: Nộp kết quả quiz và lưu flashcard

**Logic chi tiết**:

#### Step 1: Save history
```javascript
const historyRecord = await learningRepository.saveHistory(
  userId, category, level, title, score
);
```

#### Step 2: Save flashcard to Knowledge Hub
```javascript
if (flashcard_item) {
  await learningRepository.saveToKnowledgeHub(
    userId, flashcard_item, category, level
  );
}
```

#### Step 3: Update streak (nếu score >= 50%)
```javascript
if (score >= 50) {
  const writingService = await import('../../writing/services/writing.service.js');
  streakInfo = await writingService.default.updateStreakAfterWriting(userId, 50);
}
```

**Returns**:
```javascript
{
  ...historyRecord,
  streakInfo: {
    streakIncremented: true,
    newStreak: 7,
    milestoneReached: 'week_warrior'
  }
}
```

---

### 3. getUserStats(userId)

**Mục đích**: Lấy thống kê học tập

**Returns**: User learning statistics

---

## learningAiService

### generateLesson(category, level, topicTitle)

**Mục đích**: Generate lesson bằng GPT-4

**System Prompt**:
```
You are a lively, expert English teacher creating a 3-minute bite-sized micro-lesson for a Vietnamese learner.

Category: [Ngữ pháp/Mẫu câu/Phát âm]
Student Level: [A1-C2]
Topic: "[topicTitle]"

Task:
1. Create practical, focused lesson
2. Write theory in Vietnamese
3. Provide 3 examples (EN + VI + explain)
4. Create 3-question quiz
5. Create flashcard summary

Return JSON only.
```

**Return format**:
```javascript
{
  title: "Tên bài học",
  theory: "Lý thuyết bằng tiếng Việt",
  examples: [
    {
      en: "English sentence",
      vi: "Câu tiếng Việt",
      explain: "Giải thích"
    }
  ],
  quiz: [
    {
      question: "Câu hỏi",
      options: ["A", "B", "C"],
      correct_index: 0,
      explanation: "Giải thích"
    }
  ],
  flashcard_item: {
    word: "Chủ đề",
    definition: "Tóm tắt",
    grammar_error: "Ví dụ sai",
    grammar_correction: "Cách sửa"
  }
}
```

**Model Config**:
```javascript
{
  name: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 1500
}
```

---

## Lesson Categories

### Grammar (Ngữ pháp)
- Present tenses
- Past tenses
- Conditionals
- Passive voice
- etc.

### Pattern (Mẫu câu giao tiếp)
- Greetings
- Making requests
- Giving opinions
- etc.

### Pronunciation (Phát âm)
- Vowel sounds
- Consonant sounds
- Word stress
- Intonation
- etc.

---

## Integration

### Knowledge Hub
Flashcards được lưu vào user_vocabulary:
```javascript
{
  word: "Present Perfect",
  definition: "Dùng cho hành động đã hoàn thành...",
  grammar_error: "I have go",
  grammar_correction: "I have gone",
  item_type: "grammar",
  level: "B1"
}
```

### Streak System
Tích hợp với Writing module để track streak:
- Score >= 50% → increment streak
- Check milestones (7, 30, 100, 365 days)

---

## Best Practices

### 1. Real-time Generation
```javascript
// Generate fresh content mỗi lần
const lesson = await generateLesson(category, level, topic);
// Không cache để đảm bảo variety
```

### 2. Error Handling
```javascript
try {
  const lesson = await generateLesson(...);
  return lesson;
} catch (error) {
  throw new Error('Could not generate lesson. Please try again.');
}
```

### 3. JSON Parsing
```javascript
// Clean markdown formatting
const cleanJson = rawResponse
  .replace(/```json\n?|```/g, '')
  .trim();
return JSON.parse(cleanJson);
```

---

## Cải tiến trong tương lai

1. **Lesson Caching**: Cache popular lessons
2. **Personalization**: Adapt to user level
3. **Progress Tracking**: Track topics covered
4. **Spaced Repetition**: Review old lessons
5. **Multi-modal**: Add audio/video
