# ✍️ Writing Practice Tab - Ý Tưởng & Workflow

**Ngày tạo:** 2026-02-26  
**Phiên bản:** 1.0  
**Thuộc:** PILLAR 2 - EdTech Features  

---

## 📋 Tổng Quan

Xây dựng một tab **"Writing Practice"** riêng biệt trong app, cho phép người dùng luyện viết tiếng Anh theo **cấp độ tăng dần** (CEFR A1→C2), có **AI chấm bài real-time**, lưu **streak** và **từ mới** để theo dõi tiến bộ.

---

## 🎯 Core Features

### 1. Hệ Thống Cấp Độ (6 Levels - CEFR)

| Level | Tên | Dạng Bài | Giới Hạn Từ | Ví Dụ |
|-------|-----|----------|-------------|-------|
| **A1** | Beginner | Viết câu đơn, điền từ | 10-30 từ | "Describe your family" |
| **A2** | Elementary | Viết đoạn ngắn, email | 30-60 từ | "Write a short email to a friend" |
| **B1** | Intermediate | Viết paragraph, thư | 80-150 từ | "Write about your last holiday" |
| **B2** | Upper-Inter | Essay ngắn, review | 150-250 từ | "Write a movie review" |
| **C1** | Advanced | Essay, report | 250-400 từ | "Discuss pros and cons of remote work" |
| **C2** | Mastery | Academic essay | 400+ từ | "Analyze the impact of AI on education" |

### 2. Loại Bài Tập

```
📝 WRITING EXERCISE TYPES
├── 🔤 Sentence Building    (A1-A2) - Sắp xếp / Hoàn thành câu
├── 📧 Email/Letter         (A2-B1) - Viết email theo tình huống
├── 📖 Story Continuation   (B1-B2) - Viết tiếp câu chuyện
├── 💬 Opinion Writing      (B1-C1) - Bày tỏ quan điểm
├── 📊 Report/Summary       (B2-C1) - Tóm tắt / Báo cáo
└── 📚 Academic Essay       (C1-C2) - Luận văn học thuật
```

### 3. AI Feedback System

AI sẽ chấm bài theo **4 tiêu chí** (giống IELTS Writing):

| Tiêu Chí | Trọng Số | Nội Dung |
|-----------|----------|----------|
| **Grammar** | 30% | Lỗi ngữ pháp, cấu trúc câu |
| **Vocabulary** | 25% | Phong phú từ vựng, dùng từ đúng |
| **Coherence** | 25% | Mạch lạc, logic, liên kết |
| **Task Response** | 20% | Trả lời đúng yêu cầu đề bài |

**Output của AI:**
- ✅ Điểm tổng (0-100) + điểm từng tiêu chí
- 🔴 Highlight lỗi sai trực tiếp trong bài viết
- 💡 Gợi ý sửa cụ thể cho từng lỗi
- 📝 Bản viết lại mẫu (Model Answer)
- 🆕 Danh sách từ mới gợi ý thêm vào vocabulary

### 4. Streak System

```
🔥 STREAK TRACKING
├── Daily Streak: Viết ít nhất 1 bài/ngày
├── Streak Milestones:
│   ├── 🥉  7 ngày  → Badge "Week Warrior"
│   ├── 🥈 30 ngày  → Badge "Monthly Master" 
│   ├── 🥇 100 ngày → Badge "Century Writer"
│   └── 💎 365 ngày → Badge "Writing Legend"
├── Streak Freeze: 1 lần/tuần (Premium: 3 lần)
└── Streak Recovery: Dùng XP để khôi phục (trong 24h)
```

### 5. Vocabulary Tracker

- **Auto-collect**: AI tự động gom từ mới từ bài viết + gợi ý
- **Manual add**: User thêm từ bất kỳ
- **Mỗi từ lưu**: word, definition, example sentence, level, ngày học
- **SRS Review**: Ôn tập theo Spaced Repetition (SM-2)
- **Stats**: Tổng từ đã học, từ đã master, từ cần ôn

---

## 🗄️ Database Schema

```sql
-- 1. Writing Exercises (Ngân hàng đề bài)
CREATE TABLE writing_exercises (
    id SERIAL PRIMARY KEY,
    level VARCHAR(2) NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
    type VARCHAR(50) NOT NULL, -- 'sentence','email','story','opinion','report','essay'
    title VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,          -- Đề bài
    hints JSONB,                   -- Gợi ý, từ khóa
    min_words INT DEFAULT 10,
    max_words INT DEFAULT 500,
    sample_answer TEXT,            -- Bài mẫu (optional)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Writing Submissions (Bài nộp)
CREATE TABLE writing_submissions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INT REFERENCES writing_exercises(id),
    content TEXT NOT NULL,          -- Bài viết của user
    word_count INT NOT NULL,
    -- AI Scores
    score_total DECIMAL(5,2),       -- 0-100
    score_grammar DECIMAL(5,2),
    score_vocabulary DECIMAL(5,2),
    score_coherence DECIMAL(5,2),
    score_task DECIMAL(5,2),
    -- AI Feedback
    feedback JSONB,                 -- {errors: [], suggestions: [], model_answer: ""}
    new_words JSONB,                -- ["word1", "word2"] - từ mới AI gợi ý
    status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted','graded','reviewed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ws_user ON writing_submissions(user_id);
CREATE INDEX idx_ws_exercise ON writing_submissions(exercise_id);
CREATE INDEX idx_ws_created ON writing_submissions(user_id, created_at);

-- 3. Writing Streaks
CREATE TABLE writing_streaks (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    last_writing_date DATE,
    streak_freezes_used INT DEFAULT 0,
    total_writings INT DEFAULT 0,
    total_words_written INT DEFAULT 0,
    avg_score DECIMAL(5,2) DEFAULT 0,
    badges JSONB DEFAULT '[]',     -- ["week_warrior", "monthly_master"]
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Vocabulary (Sổ từ vựng)
CREATE TABLE user_vocabulary (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word VARCHAR(100) NOT NULL,
    definition TEXT,
    example_sentence TEXT,
    source VARCHAR(50),            -- 'writing_feedback', 'manual', 'quiz'
    source_id INT,                 -- ID bài viết nguồn
    level VARCHAR(2),              -- CEFR level của từ
    mastery INT DEFAULT 0,         -- 0-5 (SRS level)
    next_review_at TIMESTAMPTZ,    -- Lần ôn tiếp theo
    review_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, word)
);
CREATE INDEX idx_uv_user ON user_vocabulary(user_id);
CREATE INDEX idx_uv_review ON user_vocabulary(user_id, next_review_at);
```

---

## 🏗️ Kiến Trúc Backend

```
backend/src/modules/writing/
├── writing.controller.js     # API endpoints
├── writing.service.js        # Business logic + AI grading
├── writing.repository.js     # Database queries
├── writing.routes.js         # Route definitions
├── writing.prompts.js        # AI prompt templates cho từng level
└── writing.seed.js           # Seed data cho exercises
```

**API Endpoints:**

| Method | Endpoint | Mô Tả |
|--------|----------|--------|
| GET | `/api/writing/exercises?level=B1` | Lấy danh sách đề bài |
| GET | `/api/writing/exercises/:id` | Chi tiết đề bài |
| POST | `/api/writing/submit` | Nộp bài → AI chấm |
| GET | `/api/writing/submissions` | Lịch sử bài viết |
| GET | `/api/writing/streak` | Thông tin streak |
| POST | `/api/writing/streak/freeze` | Dùng streak freeze |
| GET | `/api/writing/vocabulary` | Danh sách từ vựng |
| POST | `/api/writing/vocabulary` | Thêm từ thủ công |
| GET | `/api/writing/vocabulary/review` | Từ cần ôn tập hôm nay |
| PUT | `/api/writing/vocabulary/:id/review` | Cập nhật kết quả ôn |
| GET | `/api/writing/stats` | Thống kê tiến bộ |

---

## 🎨 Frontend Structure

```
frontend/src/features/writing/
├── WritingTab.js              # Tab chính
├── ExerciseList.js            # Danh sách đề bài theo level
├── WritingEditor.js           # Text editor + word count
├── FeedbackPanel.js           # Hiển thị AI feedback
├── StreakWidget.js             # Widget streak + badges
├── VocabularyList.js           # Sổ từ vựng
├── VocabularyReview.js         # Flashcard ôn tập
├── ProgressDashboard.js        # Biểu đồ tiến bộ
└── components/
    ├── LevelSelector.js        # Chọn level CEFR
    ├── ScoreRadar.js           # Radar chart 4 tiêu chí
    ├── StreakCalendar.js        # Calendar heatmap
    └── ErrorHighlight.js       # Highlight lỗi trong bài
```

---

## 📍 Implementation Workflow (5 Phases)

### Phase 1: Database & Backend Core (3-4 ngày)
- [ ] Tạo migration SQL (4 tables)
- [ ] Tạo `writing` module (controller, service, repository, routes)
- [ ] Seed 20-30 đề bài mẫu (mỗi level 4-5 đề)
- [ ] API: CRUD exercises, submit, get submissions

### Phase 2: AI Grading Engine (3-4 ngày)
- [ ] Thiết kế prompt templates cho từng level
- [ ] Implement `gradeWriting()` service (gọi OpenAI GPT-4o)
- [ ] Parse AI response → scores + errors + suggestions + new words
- [ ] API: POST `/submit` → trả về feedback real-time (hoặc SSE)

### Phase 3: Streak & Vocabulary (2-3 ngày)
- [ ] Implement streak logic (tính streak, freeze, recovery)
- [ ] Implement vocabulary CRUD + auto-collect từ feedback
- [ ] SRS algorithm (SM-2) cho vocabulary review
- [ ] APIs cho streak + vocabulary

### Phase 4: Frontend UI (5-7 ngày)
- [ ] `WritingTab` - Layout chính với navigation
- [ ] `ExerciseList` + `LevelSelector` - Chọn bài theo level
- [ ] `WritingEditor` - Text area + toolbar + word counter
- [ ] `FeedbackPanel` - Hiển thị điểm + lỗi + gợi ý
- [ ] `StreakWidget` - Hiện streak + badges + calendar
- [ ] `VocabularyList` + `VocabularyReview` - Sổ từ + flashcard
- [ ] `ProgressDashboard` - Charts thống kê

### Phase 5: Polish & Integration (2-3 ngày)
- [ ] Tích hợp tab vào `App.js` (thêm route/navigation)
- [ ] Responsive design cho mobile
- [ ] Tích hợp với Wallet (Premium features)
- [ ] Tích hợp với Subscription (giới hạn Free vs Pro)
- [ ] Testing end-to-end

---

## ⏱️ Timeline Tổng

| Phase | Công Việc | Thời Gian | Tích Lũy |
|-------|-----------|-----------|----------|
| 1 | Database & Backend | 3-4 ngày | ~4 ngày |
| 2 | AI Grading | 3-4 ngày | ~8 ngày |
| 3 | Streak & Vocab | 2-3 ngày | ~11 ngày |
| 4 | Frontend UI | 5-7 ngày | ~18 ngày |
| 5 | Polish | 2-3 ngày | **~20 ngày** |

**Tổng ước tính: ~3-4 tuần**

---

## 🔗 Tích Hợp Với Hệ Thống Hiện Có

| Hệ thống | Cách tích hợp |
|-----------|---------------|
| **Auth** | Yêu cầu đăng nhập, dùng `req.user.id` |
| **Subscription** | Free: 3 bài/ngày, Pro: unlimited |
| **Wallet/XP** | Hoàn thành bài → +XP, streak milestone → +coins |
| **Chat** | Link "Practice Writing" từ chat suggestions |
| **Usage** | Track writing usage trong `user_usage` |

---

## 💡 Tính Năng Mở Rộng (Tương Lai)

- 🤝 **Peer Review**: User chấm bài cho nhau
- 📊 **Writing Analytics**: Phân tích xu hướng lỗi theo thời gian  
- 🎯 **IELTS/TOEFL Mode**: Bài tập theo format thi thật
- 🏆 **Leaderboard**: Xếp hạng theo điểm trung bình
- 📱 **Push Notification**: Nhắc viết hàng ngày để giữ streak

---

> **Bước tiếp theo:** Chọn Phase để bắt đầu implement. Khuyến nghị bắt đầu từ **Phase 1** (Database + Backend).
