# PHÂN TÍCH CHI TIẾT - WRITING SERVICE

## Tổng quan
File: `writing.service.js`

Service quản lý bài tập viết với AI grading và streak system.

---

## Constants

### STREAK_BADGES
```javascript
[
  { days: 7, badge: 'week_warrior', label: '🥉 Week Warrior' },
  { days: 30, badge: 'monthly_master', label: '🥈 Monthly Master' },
  { days: 100, badge: 'century_writer', label: '🥇 Century Writer' },
  { days: 365, badge: 'writing_legend', label: '💎 Writing Legend' }
]
```

### DAILY_LIMITS
```javascript
{ free: 3, pro: 999, team: 999 }
```

---

## Main Functions

### 1. getExercises({ level, type, page, limit })
Lấy danh sách bài tập với pagination.

### 2. getExerciseById(id)
Lấy chi tiết một bài tập.

### 3. generateExercise(level, type)

**Duplicate Prevention**:
```javascript
const existingExercises = await writingRepository.getExercises({ level, type, limit: 50 });
const existingTitles = existingExercises.map(e => e.title);

for (let attempt = 1; attempt <= 3; attempt++) {
  const data = await writingAiService.generateExercise(level, type, existingTitles);

  const isDuplicate = existingExercises.some(existing =>
    this._isSimilar(existing.title, data.title) ||
    this._isSimilar(existing.prompt, data.prompt)
  );

  if (!isDuplicate) {
    return await writingRepository.createExercise(data);
  }
}
```

**_isSimilar() Algorithm**:
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
  const similarity = matchCount / Math.max(wordsA.length, wordsB.length);

  return similarity > 0.6; // 60% threshold
}
```

---

### 4. submitWriting(userId, { exerciseId, content, userPlan })

**Full Flow**:

#### Step 1: Validate exercise
```javascript
let exercise = null;
if (exerciseId) {
  exercise = await writingRepository.getExerciseById(exerciseId);
  if (!exercise) throw new Error('Exercise not found');
}
```

#### Step 2: Count words
```javascript
const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;
if (wordCount < 5) throw new Error('Please write at least 5 words');
```

#### Step 3: Create submission
```javascript
const submission = await writingRepository.createSubmission({
  userId,
  exerciseId: exerciseId || null,
  content,
  wordCount
});
```

#### Step 4: Grade with AI
```javascript
const exerciseObj = exercise || {
  level: 'B1',
  type: 'free_writing',
  prompt: 'Write about a topic of your choice.'
};

const feedbackData = await writingAiService.gradeSubmission(exerciseObj, content);
```

**Feedback format**:
```javascript
{
  scores: {
    grammar: 8.5,
    vocabulary: 7.0,
    coherence: 8.0,
    task: 7.5,
    total: 7.75
  },
  errors: [
    {
      mistake: "I am go to school",
      correction: "I go to school",
      type: "grammar",
      explanation: "Use base form after 'do/does'"
    }
  ],
  suggestions: [
    "Try using more varied vocabulary",
    "Add more specific examples"
  ],
  modelAnswer: "Sample answer...",
  newWords: [
    { word: "sophisticated", definition: "...", level: "C1" }
  ],
  grammarItems: [
    {
      grammar_error: "I am go",
      grammar_correction: "I go",
      definition: "Present simple usage"
    }
  ]
}
```

#### Step 5: Save feedback
```javascript
const updatedSubmission = await this.saveFeedback(submission.id, feedbackData);
```

#### Step 6: Save knowledge (silent fail)
```javascript
if (feedbackData.newWords?.length > 0 || feedbackData.grammarItems?.length > 0) {
  await writingRepository.addKnowledgeBatch(
    userId,
    feedbackData.newWords,
    feedbackData.grammarItems,
    submission.id
  ).catch(e => console.error('Silent fail on add vocab:', e));
}
```

#### Step 7: Log mistakes to analytics (silent fail)
```javascript
if (feedbackData.errors?.length > 0) {
  feedbackData.errors.forEach(err => {
    analyticsService.logMistake({
      userId,
      sourceModule: 'writing',
      errorCategory: 'grammar',
      errorDetail: err.correction || err.mistake || 'unknown_grammar_error',
      contextText: err.mistake || '',
      sessionId: submission.id
    }).catch(e => console.error('Silent fail on log mistake:', e));
  });
}
```

#### Step 8: Update streak (nếu score >= 60)
```javascript
let streakInfo = { streakIncremented: false, newStreak: 0, milestoneReached: null };
if (feedbackData.scores?.total >= 60) {
  streakInfo = await this.updateStreakAfterWriting(userId, wordCount);
}
```

#### Step 9: Return result
```javascript
return {
  ...updatedSubmission,
  level: exerciseObj.level,
  streakInfo
};
```

---

### 5. saveFeedback(submissionId, feedbackData)

**Update submission với feedback**:
```javascript
const updated = await writingRepository.updateSubmissionFeedback(submissionId, {
  scoreTotal: scores.total,
  scoreGrammar: scores.grammar,
  scoreVocabulary: scores.vocabulary,
  scoreCoherence: scores.coherence,
  scoreTask: scores.task,
  feedback: { errors, suggestions, model_answer: modelAnswer },
  newWords: newWords || []
});
```

---

### 6. getSubmissions(userId, { page, limit })
Lấy lịch sử submissions với pagination.

### 7. getSubmissionDetail(userId, submissionId)
Lấy chi tiết một submission.

---

## Streak System

### getStreak(userId)
Lấy streak hiện tại của user.

### updateStreakAfterWriting(userId, wordCount)

**Logic**:
1. Get or create streak record
2. Check if already wrote today
3. If not:
   - Check if yesterday had activity (continue streak)
   - Or reset streak to 1
4. Update last_activity_date
5. Check milestones
6. Return streak info

**Milestone Detection**:
```javascript
const milestone = STREAK_BADGES.find(b => b.days === newStreak);
if (milestone) {
  return {
    streakIncremented: true,
    newStreak,
    milestoneReached: milestone
  };
}
```

---

## AI Grading Criteria

### Grammar (0-10)
- Sentence structure
- Verb tenses
- Subject-verb agreement
- Articles usage

### Vocabulary (0-10)
- Range and variety
- Appropriateness
- Collocations
- Academic/formal words

### Coherence & Cohesion (0-10)
- Logical flow
- Paragraph structure
- Linking words
- Topic sentences

### Task Achievement (0-10)
- Address all parts
- Relevant examples
- Clear position
- Adequate length

---

## Error Handling

### Grading Failure
```javascript
try {
  const feedbackData = await writingAiService.gradeSubmission(...);
  // ... process feedback
} catch (e) {
  console.error('Grading failed:', e);
  await writingRepository.markSubmissionError(submission.id, e.message);
  throw new Error(`AI system failed to process. Details: ${e.message}`);
}
```

---

## Best Practices

### 1. Silent Fail for Secondary Operations
```javascript
// Don't let vocab save fail the submission
await saveVocabulary(...).catch(console.error);
await logMistakes(...).catch(console.error);
```

### 2. Validate Before Processing
```javascript
if (wordCount < 5) throw new Error('Too short');
if (!exercise && exerciseId) throw new Error('Exercise not found');
```

### 3. Detailed Feedback
```javascript
// Provide actionable feedback
errors: [
  {
    mistake: "...",
    correction: "...",
    explanation: "Why this is wrong and how to fix"
  }
]
```

---

## Cải tiến trong tương lai

1. **Plagiarism Detection**: Check for copied content
2. **Style Analysis**: Formal vs informal
3. **Peer Review**: Students review each other
4. **Writing Templates**: Structured formats
5. **Progressive Writing**: Draft → revision → final
6. **Real-time Suggestions**: As user types
