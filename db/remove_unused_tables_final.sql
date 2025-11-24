-- ============================================
-- Script xóa các bảng KHÔNG SỬ DỤNG trong database
-- ============================================
-- ⚠️ LƯU Ý: Backup database trước khi chạy script này!
-- Chạy script này để dọn dẹp database

USE chatbot;

-- ============================================
-- CÁC BẢNG KHÔNG ĐƯỢC SỬ DỤNG - XÓA AN TOÀN
-- ============================================

-- 1. Bảng CHAT_HISTORY - Không được sử dụng
-- Chỉ có comment trong code nhưng không có code thực sự query bảng này
-- Conversation management hiện dùng user_questions với conversation_id
DROP TABLE IF EXISTS chat_history;

-- 2. Bảng CONVERSATION_SESSIONS - Không được sử dụng
-- Conversation management hiện dùng user_questions với conversation_id
DROP TABLE IF EXISTS conversation_sessions;

-- 3. Bảng FEEDBACKS - Không còn controller/route
-- Đã xóa feedbackController.js và feedback routes
DROP TABLE IF EXISTS feedbacks;

-- 4. Bảng USER_WORDS - Không được sử dụng
-- Không có controller hoặc service nào sử dụng bảng này
DROP TABLE IF EXISTS user_words;

-- 5. Bảng USER_HIGHLIGHTED_TEXT - Tính năng đã xóa
-- Highlights feature đã được xóa hoàn toàn
-- Đã xóa highlightsController.js, highlights.js route, Highlights.js component
DROP TABLE IF EXISTS user_highlighted_text;

-- 6. Bảng WRITING_SESSIONS - Không được sử dụng
-- Không có controller hoặc service nào sử dụng bảng này
DROP TABLE IF EXISTS writing_sessions;

-- 7. Bảng SENTENCE_EXAMPLES - Không được sử dụng
-- Không có controller hoặc service nào sử dụng bảng này
DROP TABLE IF EXISTS sentence_examples;

-- 8. Bảng UNKNOWN_QUERIES - Không được sử dụng
-- Không có controller hoặc service nào sử dụng bảng này
-- (Có unanswered_questions để thay thế)
DROP TABLE IF EXISTS unknown_queries;

-- ============================================
-- CÁC BẢNG ĐANG ĐƯỢC SỬ DỤNG - KHÔNG XÓA
-- ============================================
-- ✅ users - Auth system, profile management
-- ✅ user_questions - Chat history, conversation management
-- ✅ user_usage - Usage tracking (queries, advanced RAG, tokens)
-- ✅ user_preferences - User preferences (settings)
-- ✅ unanswered_questions - Unanswered questions tracking
-- ✅ knowledge_base - Knowledge base storage
-- ✅ knowledge_chunks - RAG chunks with embeddings
-- ✅ dictionary - Word suggestions (used in chatController.js)
-- ✅ google_tokens - OAuth token storage
-- ✅ important_keywords - Keywords for search (if exists)

-- ============================================
-- TÓM TẮT CÁC BẢNG ĐÃ XÓA:
-- ============================================
-- ✅ chat_history
-- ✅ conversation_sessions
-- ✅ feedbacks
-- ✅ user_words
-- ✅ user_highlighted_text
-- ✅ writing_sessions
-- ✅ sentence_examples
-- ✅ unknown_queries
--
-- Tổng cộng: 8 bảng đã được xóa

