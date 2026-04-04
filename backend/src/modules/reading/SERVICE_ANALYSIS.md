# PHÂN TÍCH CHI TIẾT - READING & LISTENING SERVICES

## Reading Service

### getPassages({ level, topic, page, limit })
Lấy danh sách bài đọc với pagination.

### getPassageById(id)
Lấy chi tiết một bài đọc.

### generatePassage(level, topic)
Tạo bài đọc mới bằng AI và lưu vào DB.

### lookupWord(word, sentence, level)
Tra từ trong context của câu.

### submitQuiz(userId, { passageId, answers, wordsLookedUp, readingTimeSeconds })

**Logic chi tiết**:

#### Step 1: Get passage
```javascript
const passage = await readingRepository.getPassageById(passageId);
const questions = passage.questions || [];
```

#### Step 2: Grade answers
```javascript
let correct = 0;
const feedback = [];

for (const q of questions) {
  const userAnswer = answers.find(a => a.id === q.id);
  const isCorrect = userAnswer && userAnswer.answer === q.correctAnswer;
  if (isCorrect) correct++;

  feedback.push({
    questionId: q.id,
    question: q.question,
    userAnswer: userAnswer?.answer || 'Không trả lời',
    correctAnswer: q.correctAnswer,
    isCorrect: !!isCorrect,
    explanation: q.explanation
  });
}

const scoreTotal = Math.round((correct / questions.length) * 100);
```

#### Step 3: Save submission
```javascript
const submission = await readingRepository.createSubmission({ userId, passageId });
await readingRepository.updateSubmissionQuiz(submission.id, {
  quizAnswers: answers,
  scoreTotal,
  feedback: { results: feedback, correct, total: questions.length },
  wordsLookedUp,
  readingTimeSeconds
});
```

#### Step 4: Save vocabulary
```javascript
if (wordsLookedUp.length > 0) {
  await readingRepository.addVocabularyBatch(userId, wordsLookedUp, submission.id)
    .catch(e => console.error('Silent vocab save fail:', e));
}
```

---

## Listening Service

### getExercises({ level, type, page, limit })
Lấy danh sách bài nghe với pagination.

### getExerciseById(id)
Lấy chi tiết một bài nghe.

### generateExercise(level, topic)

**Logic**:
1. Lấy existing exercises để tránh trùng
2. Generate với AI (max 3 retries)
3. Check duplicate bằng `_isSimilar()`
4. Nếu không trùng → save
5. Nếu trùng → retry

**Duplicate Detection**:
```javascript
_isSimilar(textA, textB) {
  // Normalize text
  const normalize = (t) => t.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2);

  const wordsA = normalize(textA);
  const wordsB = normalize(textB);

  // Calculate overlap
  const setB = new Set(wordsB);
  const matchCount = wordsA.filter(w => setB.has(w)).length;
  const similarity = matchCount / Math.max(wordsA.length, wordsB.length);

  return similarity > 0.6; // 60% threshold
}
```

### submitDictation(userId, { exerciseId, content })

**Logic chi tiết**:

#### Step 1: Validate
```javascript
if (!content || content.trim().length === 0) {
  throw new Error('Bạn cần nhập ít nhất vài từ cho bài nghe.');
}

const exercise = await listeningRepository.getExerciseById(exerciseId);
if (!exercise || exercise.type !== 'dictation') {
  throw new Error('Bài tập không hợp lệ.');
}
```

#### Step 2: Create submission
```javascript
const submission = await listeningRepository.createSubmission({
  userId,
  exerciseId,
  userAnswers: { text: content }
});
```

#### Step 3: Grade with AI
```javascript
const feedbackData = await listeningAiService.gradeDictation(
  exercise.level,
  exercise.audio_text,
  content
);
```

**Feedback format**:
```javascript
{
  scores: {
    accuracy: 85,
    total: 85
  },
  errors: [
    {
      expected: "think",
      heard: "sink",
      type: "pronunciation"
    }
  ],
  suggestions: [
    "Practice /θ/ sound"
  ]
}
```

#### Step 4: Save feedback
```javascript
await listeningRepository.updateSubmissionFeedback(submission.id, {
  scoreTotal: feedbackData.scores.total,
  feedback: feedbackData
});
```

#### Step 5: Save vocabulary
```javascript
if (feedbackData.newWords?.length > 0) {
  await listeningRepository.addVocabularyBatch(
    userId,
    feedbackData.newWords,
    submission.id
  ).catch(e => console.error('Silent vocab save fail:', e));
}
```

---

## Common Patterns

### Pagination
```javascript
const offset = (page - 1) * limit;
const { items, total } = await repository.getItems({ limit, offset });

return {
  items,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  }
};
```

### AI Generation with Retry
```javascript
const MAX_RETRIES = 3;
for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
  const data = await aiService.generate(...);

  if (!isDuplicate(data)) {
    return await repository.create(data);
  }

  console.warn(`Attempt ${attempt}/${MAX_RETRIES}: duplicate detected`);
}

// Fallback: save anyway
const data = await aiService.generate(...);
return await repository.create(data);
```

### Silent Fail for Secondary Operations
```javascript
// Primary operation
const submission = await createSubmission(...);

// Secondary operation (don't throw)
await saveVocabulary(...)
  .catch(e => console.error('Silent fail:', e));

return submission;
```

---

## Best Practices

### 1. Validate Input
```javascript
if (!content || content.trim().length === 0) {
  throw new Error('Content required');
}
```

### 2. Silent Fail for Non-Critical
```javascript
// Don't let vocab save fail the submission
await saveVocabulary(...).catch(console.error);
```

### 3. Detailed Feedback
```javascript
// Provide actionable feedback
feedback.push({
  isCorrect,
  explanation: 'Why this is correct/wrong',
  suggestion: 'How to improve'
});
```

---

## Cải tiến trong tương lai

### Reading
1. **Adaptive Difficulty**: Adjust based on performance
2. **Reading Speed Tracking**: WPM calculation
3. **Comprehension Strategies**: Teach techniques
4. **Vocabulary Highlighting**: Mark difficult words

### Listening
1. **Playback Speed Control**: 0.5x, 0.75x, 1x, 1.25x
2. **Transcript Toggle**: Show/hide transcript
3. **Accent Variety**: British, American, Australian
4. **Background Noise**: Train in realistic conditions
