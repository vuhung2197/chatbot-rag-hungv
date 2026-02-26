// Giáo trình chuẩn được cấu trúc hoá theo chủ đề (category) và cấp độ (level)
export const LEARNING_CURRICULUM = {
    grammar: {
        A1: [
            { id: 'g_a1_1', title: 'Động từ To Be (am/is/are) và Cách dùng' },
            { id: 'g_a1_2', title: 'Thì Hiện Tại Đơn (Present Simple)' },
            { id: 'g_a1_3', title: 'Đại Từ Nhân Xưng & Tính Từ Sở Hữu' },
            { id: 'g_a1_4', title: 'Danh Từ Số Ít & Số Nhiều' },
            { id: 'g_a1_5', title: 'Mạo từ A / An / The' }
        ],
        A2: [
            { id: 'g_a2_1', title: 'Thì Quá Khứ Đơn (Past Simple)' },
            { id: 'g_a2_2', title: 'Thì Tương Lai Đơn (Will vs Be going to)' },
            { id: 'g_a2_3', title: 'Giới Từ Chỉ Thời Gian (In, On, At)' },
            { id: 'g_a2_4', title: 'Tính Từ So Sánh Hơn & Nhất' },
            { id: 'g_a2_5', title: 'Động Từ Khuyết Thiếu (Can, Could, Should)' }
        ],
        B1: [
            { id: 'g_b1_1', title: 'Thì Hiện Tại Hoàn Thành (Present Perfect)' },
            { id: 'g_b1_2', title: 'Câu Điều Kiện Loại 1 & 2' },
            { id: 'g_b1_3', title: 'Mệnh Đề Quan Hệ Cơ Bản (Who, Which, That)' },
            { id: 'g_b1_4', title: 'Câu Bị Động (Passive Voice)' },
            { id: 'g_b1_5', title: 'Câu Trực Tiếp & Gián Tiếp (Reported Speech)' }
        ],
        B2: [
            { id: 'g_b2_1', title: 'Thì Quá Khứ Hoàn Thành (Past Perfect)' },
            { id: 'g_b2_2', title: 'Câu Điều Kiện Loại 3 & Hỗn Hợp' },
            { id: 'g_b2_3', title: 'Cấu Trúc Wish (Câu Điều Ước)' },
            { id: 'g_b2_4', title: 'Đảo Ngữ Cơ Bản (Inversion)' },
            { id: 'g_b2_5', title: 'V-ing và To-V sau Động Từ' }
        ],
        C1: [
            { id: 'g_c1_1', title: 'Mệnh Đề Phân Từ (Participle Clauses)' },
            { id: 'g_c1_2', title: 'Đảo Ngữ Nâng Cao (No sooner, Hardly)' },
            { id: 'g_c1_3', title: 'Cấu Trúc Cleft Sentences (Câu Chẻ)' }
        ],
        C2: [
            { id: 'g_c2_1', title: 'Sự Hòa Hợp Chủ Vị Nâng Cao' },
            { id: 'g_c2_2', title: 'Cấu Trúc Ngữ Pháp Trang Trọng (Formal Academic)' }
        ]
    },
    pattern: {
        A1: [
            { id: 'p_a1_1', title: 'Cách Chào Hỏi & Giới Thiệu Bản Thân' },
            { id: 'p_a1_2', title: 'Mẫu Câu Hỏi Đường & Chỉ Đường' },
            { id: 'p_a1_3', title: 'Giao Tiếp Cơ Bản Khi Mua Sắm' }
        ],
        A2: [
            { id: 'p_a2_1', title: 'Cách Đưa Ra Lời Mời (Would you like...)' },
            { id: 'p_a2_2', title: 'Cách Đề Nghị Giúp Đỡ (Can I help...)' },
            { id: 'p_a2_3', title: 'Nói Về Sở Thích Cá Nhân (I am interested in...)' }
        ],
        B1: [
            { id: 'p_b1_1', title: 'Bày Tỏ Quan Điểm (In my opinion...)' },
            { id: 'p_b1_2', title: 'Thể Hiện Sự Đồng Ý, Không Đồng Ý Lịch Sự' },
            { id: 'p_b1_3', title: 'Cách Đưa Lời Khuyên (You had better...)' }
        ],
        B2: [
            { id: 'p_b2_1', title: 'Viện Lý Do, Từ Chối Tế Nhị' },
            { id: 'p_b2_2', title: 'Mẫu Câu Ngắt Lời Lịch Sự (Sorry to interrupt...)' },
            { id: 'p_b2_3', title: 'Thể Hiện Điểm Mấu Chốt (The bottom line is...)' }
        ],
        C1: [
            { id: 'p_c1_1', title: 'Nhượng Bộ Trong Tranh Luận (Admittedly...)' },
            { id: 'p_c1_2', title: 'Làm Rõ Quan Điểm Khó Hiểu (What I mean is...)' }
        ],
        C2: [
            { id: 'p_c2_1', title: 'Sử Dụng Thành Ngữ (Idioms) Trong Đàm Phán' },
            { id: 'p_c2_2', title: 'Mẫu Câu Châm Biếm Nhẹ Nhàng (Sarcasm)' }
        ]
    },
    pronunciation: {
        A1: [
            { id: 'pr_a1_1', title: 'Phân biệt Nguyên Âm Ngắn /æ/ & /e/ (cat vs bed)' },
            { id: 'pr_a1_2', title: 'Phân biệt /ɪ/ & /i:/ (ship vs sheep)' },
            { id: 'pr_a1_3', title: 'Quy tắc Phát Âm Đuôi /s/ /es/' }
        ],
        A2: [
            { id: 'pr_a2_1', title: 'Quy tắc Phát Âm Đuôi /ed/ (t, d, id)' },
            { id: 'pr_a2_2', title: 'Phân biệt Phụ Âm /p/ & /b/' },
            { id: 'pr_a2_3', title: 'Trọng Âm Tính Từ & Động Từ 2 Âm Tiết' }
        ],
        B1: [
            { id: 'pr_b1_1', title: 'Phát Âm Chuẩn Thẻ Lưỡi /θ/ & /ð/ (think vs this)' },
            { id: 'pr_b1_2', title: 'Phân biệt Môi /ʃ/ & /tʃ/ (shoe vs chew)' },
            { id: 'pr_b1_3', title: 'Nối Âm Cơ Bản (Consonant to Vowel)' }
        ],
        B2: [
            { id: 'pr_b2_1', title: 'Âm Câm (Silent Letters) Thường Gặp' },
            { id: 'pr_b2_2', title: 'Nhấn Trọng Âm Câu (Sentence Stress)' },
            { id: 'pr_b2_3', title: 'Ngữ Điệu Cơ Bản Lên Xuống (Intonation)' }
        ],
        C1: [
            { id: 'pr_c1_1', title: 'Nuốt Âm (Elision) Giọng Mỹ' },
            { id: 'pr_c1_2', title: 'Biến Âm (Assimilation) Tốc Độ Nhanh' }
        ],
        C2: [
            { id: 'pr_c2_1', title: 'Nối Âm Đặc Biệt (Connected Speech Advanced)' },
            { id: 'pr_c2_2', title: 'Rèn Luyện Cảm Quan Đọc Accents' }
        ]
    }
};
