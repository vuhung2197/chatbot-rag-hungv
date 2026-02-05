-- ============================================
-- Script xóa các bảng không sử dụng
-- ============================================
-- Chạy script này để dọn dẹp database
-- Lưu ý: Backup database trước khi chạy!

USE chatbot;

-- ============================================
-- 1. Bảng FEEDBACKS - Không còn controller/route
-- ============================================
-- Đã xóa feedbackController.js và feedback routes
DROP TABLE IF EXISTS feedbacks;

-- ============================================
-- 2. Bảng USER_WORDS - Không được sử dụng
-- ============================================
-- Không có controller hoặc service nào sử dụng bảng này
DROP TABLE IF EXISTS user_words;

-- ============================================
-- 3. Bảng USER_HIGHLIGHTED_TEXT - Tính năng đã xóa
-- ============================================
-- Highlights feature đã được xóa hoàn toàn
-- Đã xóa highlightsController.js, highlights.js route, Highlights.js component
DROP TABLE IF EXISTS user_highlighted_text;

-- ============================================
-- 4. Bảng CONVERSATION_SESSIONS - Không được sử dụng
-- ============================================
-- Không có controller hoặc service nào sử dụng bảng này
-- Conversation management hiện dùng user_questions với conversation_id
DROP TABLE IF EXISTS conversation_sessions;

-- ============================================
-- 5. Bảng WRITING_SESSIONS - Không được sử dụng
-- ============================================
-- Không có controller hoặc service nào sử dụng bảng này
DROP TABLE IF EXISTS writing_sessions;

-- ============================================
-- 6. Bảng ALGORITHM_SELECTIONS - Cần kiểm tra
-- ============================================
-- Bảng này có thể được sử dụng bởi algorithmSelector service
-- Nếu không sử dụng, có thể xóa bằng cách uncomment dòng dưới:
-- DROP TABLE IF EXISTS algorithm_selections;

-- ============================================
-- 7. Bảng DICTIONARY - Được tham chiếu nhưng không có trong init.sql
-- ============================================
-- Bảng này được tham chiếu trong chatController.js (suggest function)
-- Nếu bảng không tồn tại, cần tạo hoặc xóa code tham chiếu
-- Kiểm tra trước khi xóa:
-- SHOW TABLES LIKE 'dictionary';
-- Nếu không tồn tại và không cần thiết, xóa code trong chatController.js

-- ============================================
-- TÓM TẮT CÁC BẢNG ĐÃ XÓA:
-- ============================================
-- ✅ feedbacks
-- ✅ user_words  
-- ✅ user_highlighted_text
-- ✅ conversation_sessions
-- ✅ writing_sessions
--
-- ⚠️ CẦN KIỂM TRA:
-- - algorithm_selections (có thể đang được sử dụng)
-- - dictionary (được tham chiếu nhưng có thể không tồn tại)

-- ============================================
-- CÁC BẢNG ĐANG ĐƯỢC SỬ DỤNG (KHÔNG XÓA):
-- ============================================
-- ✅ users - Auth system
-- ✅ user_questions - Chat history, conversation management
-- ✅ unanswered_questions - Unanswered questions tracking
-- ✅ knowledge_base - Knowledge base storage
-- ✅ knowledge_chunks - RAG chunks with embeddings
-- ✅ important_keywords - Keywords for search
-- ✅ google_tokens - OAuth token storage
-- ✅ user_usage - Usage tracking (quick wins)
-- ✅ user_preferences - User preferences (quick wins)
