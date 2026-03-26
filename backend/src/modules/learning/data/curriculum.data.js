// Giáo trình chuẩn được cấu trúc hoá theo chủ đề (category) và cấp độ (level)
export const LEARNING_CURRICULUM = {
    grammar: {
        A1: [
            { id: 'g_a1_1', title: 'Động từ To Be (am/is/are) và Cách dùng' },
            { id: 'g_a1_2', title: 'Thì Hiện Tại Đơn (Present Simple)' },
            { id: 'g_a1_3', title: 'Thì Hiện Tại Tiếp Diễn (Present Continuous)' },
            { id: 'g_a1_4', title: 'Đại Từ Nhân Xưng & Tính Từ Sở Hữu' },
            { id: 'g_a1_5', title: 'Danh Từ Số Ít, Số Nhiều & Không Đếm Được' },
            { id: 'g_a1_6', title: 'Mạo từ Cơ Bản (A / An / The)' },
            { id: 'g_a1_7', title: 'Giới từ Chỉ Nơi Chốn Cơ Bản (In, On, At, Under)' },
            { id: 'g_a1_8', title: 'Cách Đặt Câu Hỏi Có Từ Để Hỏi (Wh-Questions)' }
        ],
        A2: [
            { id: 'g_a2_1', title: 'Thì Quá Khứ Đơn (Past Simple)' },
            { id: 'g_a2_2', title: 'Thì Quá Khứ Tiếp Diễn (Past Continuous)' },
            { id: 'g_a2_3', title: 'Thì Tương Lai Đơn (Will vs Be going to)' },
            { id: 'g_a2_4', title: 'Giới Từ Chỉ Thời Gian Phổ Biến (In, On, At)' },
            { id: 'g_a2_5', title: 'Tính Từ So Sánh Hơn & So Sánh Nhất' },
            { id: 'g_a2_6', title: 'Động Từ Khuyết Thiếu Cơ Bản (Can, Could, Should)' },
            { id: 'g_a2_7', title: 'Liên Từ Đơn Giản (And, But, So, Because)' },
            { id: 'g_a2_8', title: 'Đại Từ Phản Thân (Myself, Yourself...)' }
        ],
        B1: [
            { id: 'g_b1_1', title: 'Thì Hiện Tại Hoàn Thành (Present Perfect)' },
            { id: 'g_b1_2', title: 'Câu Điều Kiện Cấu Trúc Cơ Bản (Loại 1 & 2)' },
            { id: 'g_b1_3', title: 'Mệnh Đề Quan Hệ Cơ Bản Có Dấu Phẩy & Không Dấu Phẩy' },
            { id: 'g_b1_4', title: 'Câu Bị Động Tổng Quát (Passive Voice)' },
            { id: 'g_b1_5', title: 'Câu Trực Tiếp & Truyền Đạt Gián Tiếp (Reported Speech)' },
            { id: 'g_b1_6', title: 'Các Từ Định Lượng (Much, Many, A lot of, Few, Little)' },
            { id: 'g_b1_7', title: 'Thì Tương Lai Tiếp Diễn (Future Continuous)' }
        ],
        B2: [
            { id: 'g_b2_1', title: 'Thì Quá Khứ Hoàn Thành (Past Perfect)' },
            { id: 'g_b2_2', title: 'Câu Điều Kiện Rút Gọn, Loại 3 & Hỗn Hợp' },
            { id: 'g_b2_3', title: 'Cấu Trúc Wish & If Only (Câu Điều Ước)' },
            { id: 'g_b2_4', title: 'Đảo Ngữ Trạng Từ Khẳng Định / Phủ Định Cơ Bản' },
            { id: 'g_b2_5', title: 'V-ing và To-V theo Sau Các Động Từ Đặc Biệt' },
            { id: 'g_b2_6', title: 'Liên Từ & Trạng Từ Chỉ Sự Nhượng Bộ (Although, In spite of)' },
            { id: 'g_b2_7', title: 'Mệnh Đề Quan Hệ Rút Gọn Hiện Tại & Quá Khứ Phân Từ' },
            { id: 'g_b2_8', title: 'Quá Khứ Thói Quen (Used to & Would)' }
        ],
        C1: [
            { id: 'g_c1_1', title: 'Mệnh Đề Phân Từ Cấu Trúc Khép (Participle Clauses)' },
            { id: 'g_c1_2', title: 'Đảo Ngữ Nâng Cao (No sooner, Hardly, Not only...)' },
            { id: 'g_c1_3', title: 'Cấu Trúc Nhấn Mạnh Cleft Sentences (Câu Chẻ)' },
            { id: 'g_c1_4', title: 'Thể Truyền Khiến & Nhờ Vả (Causative Form: Have/Get sth done)' },
            { id: 'g_c1_5', title: 'Nhấn Mạnh Với Trợ Động Từ (Emphatic Do/Does/Did)' },
            { id: 'g_c1_6', title: 'Trợ Động Từ Khuyết Thiếu Dự Đoán (Could have, Must have...)' }
        ],
        C2: [
            { id: 'g_c2_1', title: 'Sự Hòa Hợp Chủ Vị Các Trường Hợp Bất Quy Tắc Nâng Cao' },
            { id: 'g_c2_2', title: 'Câu Giả Định Chuyên Sâu (Subjunctive Mood: It is imperative that...)' },
            { id: 'g_c2_3', title: 'Cấu Trúc Lược Bỏ Liên Từ Ở Câu Kép (Asyndeton)' },
            { id: 'g_c2_4', title: 'Cụm Giới Từ Phức Tạp Chuyên Thuật Ngữ Học Thuật' },
            { id: 'g_c2_5', title: 'Cấu Trúc Ngữ Pháp Trang Trọng (Formal Academic Writing Styles)' }
        ]
    },
    pattern: {
        A1: [
            { id: 'p_a1_1', title: 'Cách Chào Hỏi & Giới Thiệu Bản Thân' },
            { id: 'p_a1_2', title: 'Mẫu Câu Hỏi Đường & Chỉ Đường' },
            { id: 'p_a1_3', title: 'Giao Tiếp Cơ Bản Khi Mua Sắm' },
            { id: 'p_a1_4', title: 'Hỏi và Trả Lời Về Thời Tiết (What\'s the weather like...)' },
            { id: 'p_a1_5', title: 'Hỏi Giờ Tấc, Ngày Tháng (What time is it...)' },
            { id: 'p_a1_6', title: 'Gọi Món Tính Tiền Ở Nhà Hàng (I\'d like to order...)' },
            { id: 'p_a1_7', title: 'Diễn Đạt Sự Yêu Thích / Ghét Khác Nhau (I really like...)' }
        ],
        A2: [
            { id: 'p_a2_1', title: 'Cách Đưa Ra Lời Mời (Would you like...)' },
            { id: 'p_a2_2', title: 'Cách Đề Nghị Giúp Đỡ (Can I help...)' },
            { id: 'p_a2_3', title: 'Nói Về Sở Thích Bí Quyết Cá Nhân' },
            { id: 'p_a2_4', title: 'Xin Lỗi & Phản Hồi Khi Ai Đó Xin Lỗi (No worries!)' },
            { id: 'p_a2_5', title: 'Cách Xin Phép Lịch Sự (May I... / Is it okay if I...)' },
            { id: 'p_a2_6', title: 'Nói Về Các Kế Hoạch Tương Lai Gần (I\'m planning to...)' },
            { id: 'p_a2_7', title: 'Phàn Nàn Nhẹ Nhàng Ở Khách Sạn/Trạm Xe' }
        ],
        B1: [
            { id: 'p_b1_1', title: 'Bày Tỏ Quan Điểm Của Mình (In my opinion...)' },
            { id: 'p_b1_2', title: 'Thể Hiện Sự Đồng Ý, Không Đồng Ý Lịch Sự' },
            { id: 'p_b1_3', title: 'Cách Đưa Lời Khuyên & Cảnh Báo (You had better...)' },
            { id: 'p_b1_4', title: 'Yêu Cầu Làm Rõ Vấn Đề (Could you specify...)' },
            { id: 'p_b1_5', title: 'Cảm Ơn Chi Tiết, Chân Thành Nhất (I truly appreciate...)' },
            { id: 'p_b1_6', title: 'Mô Tả Kỷ Niệm Hoặc Kể Chuyện Cũ' },
            { id: 'p_b1_7', title: 'Sử Dụng Câu Hỏi Đuôi Kiểm Tra Thông Tin (..., isn\'t it?)' }
        ],
        B2: [
            { id: 'p_b2_1', title: 'Viện Lý Do, Thể Hiện Sự Từ Chối Khéo Léo' },
            { id: 'p_b2_2', title: 'Mẫu Câu Ngắt Lời Lịch Sự Kẻ Khác (Sorry to interrupt...)' },
            { id: 'p_b2_3', title: 'Thể Hiện Điểm Mấu Chốt (The bottom line is...)' },
            { id: 'p_b2_4', title: 'So Sánh Ưu Nhược Điểm Mặt Này, Mặt Kia' },
            { id: 'p_b2_5', title: 'Thể Hiện Sự Đoán Chừng Chắc Chắn (It must have been...)' },
            { id: 'p_b2_6', title: 'Tạo Sự Đồng Cảm Giữ Nhịp Trò Chuyện (I know exactly how...)' },
            { id: 'p_b2_7', title: 'Cách Chấm Dứt Cuộc Hội Thoại Không Mất Lòng' }
        ],
        C1: [
            { id: 'p_c1_1', title: 'Nhượng Bộ Trong Các Bàn Cãi Tranh Luận (Admittedly...)' },
            { id: 'p_c1_2', title: 'Làm Rõ Những Quan Điểm Trừu Tượng (What I mean is...)' },
            { id: 'p_c1_3', title: 'Đánh Giá, Bác Bỏ Quan Điểm Trịnh Trọng (That\'s a valid point, however...)' },
            { id: 'p_c1_4', title: 'Diễn Đạt Mức Độ Cực Kỳ Chắc Chắn (Without a shadow of a doubt)' },
            { id: 'p_c1_5', title: 'Giao Tiếp Gây Ấn Tượng & Tìm Ẩn Ý (Reading between the lines...)' },
            { id: 'p_c1_6', title: 'Báo Cáo Tình Hình, Cập Nhật Tiến Độ Công Việc (To bring you up to speed...)' }
        ],
        C2: [
            { id: 'p_c2_1', title: 'Sử Dụng Cụm Thành Ngữ & Quán Ngữ (Idioms) Khi Đàm Phán' },
            { id: 'p_c2_2', title: 'Mẫu Câu Châm Biếm Nhẹ Nhàng Thâm Thúy (Sarcasm)' },
            { id: 'p_c2_3', title: 'Ứng Phó Câu Hỏi Khó Hoặc Lảng Tránh Từ Chối Đi Thẳng (That\'s an interesting question...)' },
            { id: 'p_c2_4', title: 'Tuyệt Kỹ Chuyển Hướng Giao Tiếp Không Sượng (That brings me seamlessly to)' },
            { id: 'p_c2_5', title: 'Kỹ Thuật Câu Kéo Nghe Tự Nhiên, Không Nói Vấp (Fillers & complex transitions)' }
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
