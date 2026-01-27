-- ============================================
-- TEST QUERIES: KIỂM TRA QUYỀN HẠN ADMIN VS USER
-- Ngày: 2026-01-23
-- ============================================

USE chatbot;

-- ============================================
-- 1. KIỂM TRA PHÂN BỐ ROLES HIỆN TẠI
-- ============================================

-- Xem có bao nhiêu user và admin
SELECT 
    role,
    COUNT(*) as user_count,
    GROUP_CONCAT(email SEPARATOR ', ') as emails
FROM users
GROUP BY role;

-- Xem chi tiết tất cả users với role
SELECT 
    id,
    name,
    email,
    role,
    email_verified,
    account_status,
    created_at
FROM users
ORDER BY created_at DESC;

-- ============================================
-- 2. KIỂM TRA AI ĐÃ THÊM KNOWLEDGE
-- ============================================

-- Nếu có user_id trong knowledge_base (hiện tại KHÔNG có)
-- SELECT kb.*, u.email, u.role
-- FROM knowledge_base kb
-- LEFT JOIN users u ON kb.user_id = u.id;

-- Hiện tại: Bất kỳ ai cũng có thể thêm vì KHÔNG track user_id
SELECT 
    id,
    title,
    SUBSTRING(content, 1, 100) as content_preview,
    'KHÔNG TRACK USER' as created_by
FROM knowledge_base
ORDER BY id DESC
LIMIT 20;

-- ============================================
-- 3. KIỂM TRA UPLOAD FILE LOGS
-- ============================================

-- Check user_usage để xem ai đã upload files
SELECT 
    uu.user_id,
    u.email,
    u.role,
    uu.date,
    uu.file_uploads_count,
    uu.file_uploads_size_mb,
    CASE 
        WHEN u.role = 'user' THEN '🔴 USER UPLOADED (KHÔNG NÊN)'
        WHEN u.role = 'admin' THEN '✅ ADMIN UPLOADED (OK)'
        ELSE '❓ UNKNOWN'
    END as status
FROM user_usage uu
JOIN users u ON uu.user_id = u.id
WHERE uu.file_uploads_count > 0
ORDER BY uu.date DESC;

-- ============================================
-- 4. KIỂM TRA UNANSWERED QUESTIONS
-- ============================================

-- Xem tất cả câu hỏi chưa trả lời (public, không track ai query)
SELECT 
    id,
    SUBSTRING(question, 1, 100) as question_preview,
    hash,
    created_at,
    answered,
    'PUBLIC - Ai cũng xem được' as access_level
FROM unanswered_questions
ORDER BY created_at DESC
LIMIT 20;

-- ============================================
-- 5. PHÁT HIỆN USER THƯỜNG ĐÃ LÀM GÌ
-- ============================================

-- Check usage của user thường (role='user')
SELECT 
    u.id,
    u.email,
    u.role,
    COUNT(DISTINCT uu.date) as days_active,
    SUM(uu.queries_count) as total_queries,
    SUM(uu.advanced_rag_count) as total_advanced_rag,
    SUM(uu.file_uploads_count) as total_file_uploads,
    SUM(uu.file_uploads_size_mb) as total_size_mb,
    CASE 
        WHEN SUM(uu.file_uploads_count) > 0 
        THEN '🔴 CRITICAL: User uploaded files!'
        ELSE '✅ OK: No uploads'
    END as upload_status
FROM users u
LEFT JOIN user_usage uu ON u.id = uu.user_id
WHERE u.role = 'user'
GROUP BY u.id, u.email, u.role
ORDER BY total_file_uploads DESC;

-- ============================================
-- 6. KIỂM TRA ADMIN ACTIVITIES
-- ============================================

-- Check usage của admin
SELECT 
    u.id,
    u.email,
    u.role,
    COUNT(DISTINCT uu.date) as days_active,
    SUM(uu.queries_count) as total_queries,
    SUM(uu.file_uploads_count) as total_file_uploads,
    SUM(uu.file_uploads_size_mb) as total_size_mb
FROM users u
LEFT JOIN user_usage uu ON u.id = uu.user_id
WHERE u.role = 'admin'
GROUP BY u.id, u.email, u.role;

-- ============================================
-- 7. TẠO ADMIN ĐẦU TIÊN (NẾU CHƯA CÓ)
-- ============================================

-- Xem user nào sẽ được promote thành admin
SELECT 
    id,
    name,
    email,
    role,
    created_at,
    'Candidate for admin promotion' as note
FROM users
WHERE email = 'your-email@example.com'  -- ← THAY EMAIL CỦA BẠN
   OR id = 1;  -- Hoặc user đầu tiên

-- UNCOMMENT dòng dưới để promote user thành admin
-- UPDATE users 
-- SET role = 'admin' 
-- WHERE email = 'your-email@example.com'  -- ← THAY EMAIL CỦA BẠN
-- LIMIT 1;

-- Verify sau khi promote
-- SELECT id, email, role FROM users WHERE email = 'your-email@example.com';

-- ============================================
-- 8. KIỂM TRA KNOWLEDGE_BASE INTEGRITY
-- ============================================

-- Đếm số lượng knowledge entries
SELECT 
    COUNT(*) as total_knowledge,
    COUNT(DISTINCT title) as unique_titles,
    SUM(CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END) as has_embedding,
    SUM(CASE WHEN embedding IS NULL THEN 1 ELSE 0 END) as no_embedding
FROM knowledge_base;

-- Top 10 knowledge entries mới nhất
SELECT 
    id,
    title,
    CHAR_LENGTH(content) as content_length,
    CASE WHEN embedding IS NOT NULL THEN 'YES' ELSE 'NO' END as has_embedding
FROM knowledge_base
ORDER BY id DESC
LIMIT 10;

-- ============================================
-- 9. KIỂM TRA CHUNKS
-- ============================================

-- Thống kê chunks theo parent
SELECT 
    kb.id as knowledge_id,
    kb.title,
    COUNT(kc.id) as chunk_count,
    SUM(kc.token_count) as total_tokens
FROM knowledge_base kb
LEFT JOIN knowledge_chunks kc ON kb.id = kc.parent_id
GROUP BY kb.id, kb.title
ORDER BY chunk_count DESC
LIMIT 20;

-- ============================================
-- 10. SECURITY AUDIT
-- ============================================

-- Tổng hợp security issues
SELECT 'Total Users' as metric, COUNT(*) as count FROM users
UNION ALL
SELECT 'Users with role=user', COUNT(*) FROM users WHERE role = 'user'
UNION ALL
SELECT 'Users with role=admin', COUNT(*) FROM users WHERE role = 'admin'
UNION ALL
SELECT 'Total Knowledge Entries', COUNT(*) FROM knowledge_base
UNION ALL
SELECT 'Total Chunks', COUNT(*) FROM knowledge_chunks
UNION ALL
SELECT 'Unanswered Questions', COUNT(*) FROM unanswered_questions
UNION ALL
SELECT 'Users who uploaded files', COUNT(DISTINCT user_id) FROM user_usage WHERE file_uploads_count > 0;

-- Chi tiết users đã upload
SELECT 
    u.id,
    u.email,
    u.role,
    SUM(uu.file_uploads_count) as total_uploads,
    CASE 
        WHEN u.role = 'user' THEN '🔴 SECURITY ISSUE'
        ELSE '✅ OK'
    END as security_status
FROM users u
JOIN user_usage uu ON u.id = uu.user_id
WHERE uu.file_uploads_count > 0
GROUP BY u.id, u.email, u.role;

-- ============================================
-- END OF TEST QUERIES
-- ============================================

-- 📊 SUMMARY REPORT
-- 
-- Các issue cần kiểm tra:
-- 1. ✅ Có bao nhiêu user với role='admin'?
-- 2. ✅ Có user nào với role='user' đã upload file?
-- 3. ✅ Knowledge base có tracking user_id không?
-- 4. ✅ Unanswered questions có tracking ai xem/xóa không?
-- 
-- Expected Results:
-- - Nếu có user thường upload file → 🔴 CRITICAL ISSUE
-- - Nếu không track user_id trong knowledge → 🔴 ISSUE
-- - Nếu không có admin nào → ⚠️ WARNING
