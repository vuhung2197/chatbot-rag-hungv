# PHÂN TÍCH CHI TIẾT - LISTENING SERVICE

## Tổng quan
File: `listening.service.js`

Service quản lý bài tập luyện nghe với dictation và AI grading.

---

## Main Functions

### 1. getExercises({ level, type, page, limit })
Lấy danh sách bài tập với pagination.

### 2. getExerciseById(id)
Lấy chi tiết một bài tập.

### 3. generateExercise(level, topic)

**Duplicate Prevention**:
```javascript
const MAX_RETRIES = 3;
for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
  const data = await listeningAiService.generateDictation(level, topic, existingTexts);

  const isDuplicate = existingTexts.some(existing =>
    this._isSimilar(existing, data.audio_text)
  );

  if (!isDuplicate) {
    return await listeningRepository.createExercise(data);
  }
}
```

### 4. submitDictation(userId, { exerciseId, content })

**Full Flow**:
1. Validate input
2. Create submission
3. Grade with AI
4. Save feedback
5. Save vocabulary (silent fail)

---

## AI Grading

### gradeDictation(level, correctText, userText)

**Comparison Logic**:
- Word-by-word comparison
- Identify missing/extra/wrong words
- Calculate accuracy score
- Generate suggestions

**Return format**:
```javascript
{
  scores: {
    accuracy: 85,
    total: 85
  },
  errors: [
    { expected: "think", heard: "sink", type: "pronunciation" }
  ],
  suggestions: ["Practice /θ/ sound"],
  newWords: [
    { word: "think", definition: "...", level: "A1" }
  ]
}
```

---

## Best Practices

### Silent Fail Pattern
```javascript
await saveVocabulary(...)
  .catch(e => console.error('Silent vocab save fail:', e.message));
```

### Similarity Check
```javascript
_isSimilar(textA, textB) {
  const normalize = (t) => t.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2);

  const wordsA = normalize(textA);
  const wordsB = normalize(textB);
  const setB = new Set(wordsB);
  const matchCount = wordsA.filter(w => setB.has(w)).length;

  return matchCount / Math.max(wordsA.length, wordsB.length) > 0.6;
}
```

---

## Cải tiến trong tương lai

1. **Speech Recognition**: Real-time transcription
2. **Accent Training**: Multiple accents
3. **Speed Control**: Adjustable playback speed
4. **Partial Credit**: Score partial correctness
