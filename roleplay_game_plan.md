# Kế Hoạch MVp: Game Nhập Vai Cốt Truyện (Roleplay Adventure)

Dự án phát triển tính năng mới cho nền tảng chatbot học tiếng Anh: Game kết hợp luyện tập ngoại ngữ và nhập vai theo ngữ cảnh.

## 1. Mục tiêu (Goals)
*   Chuyển đổi từ mô hình học "hỏi-đáp" nhàm chán sang **tình huống giao tiếp mô phỏng thực tế**.
*   Người dùng (người học) được đóng vai một nhân vật, trò chuyện với NPC (do AI điều khiển).
*   Đạt được nhiệm vụ cụ thể để qua vòng (Ví dụ: hỏi được mật khẩu, qua cửa hải quan...).
*   Hệ thống sửa lỗi âm thầm (shadow feedback) mà không phá vỡ tính nhập vai (breaking the 4th wall).

## 2. Kịch bản đề xuất (Scenarios)
Hỗ trợ các cấp độ từ dễ đến khó:
*   🟢 **Dễ (A1-A2) | Quán Cà Phê Mới Đến:**
    *   *Sứ mệnh:* Đặt thành công một món đồ uống tùy chỉnh và xin được mật khẩu wifi.
    *   *NPC:* Nhân viên pha chế nhiệt tình nhưng hơi vội vã.
*   🟡 **Trung bình (B1) | Sân Bay Mất Hành Lý:**
    *   *Sứ mệnh:* Báo cáo đặc điểm valy bị mất và lấy được số phiếu chứng nhận của bộ phận hỗ trợ mặt đất.
    *   *NPC:* Nhân viên mặt đất bướng bỉnh, yêu cầu độ chi tiết cao.
*   🔴 **Khó (B2-C1) | Thám Tử Phá Án:**
    *   *Sứ mệnh:* Lấy lời khai nhân chứng tại hiện trường để tìm ra mâu thuẫn trong câu chuyện.
    *   *NPC:* Một nhân chứng xảo quyệt, cố tình nói vòng vo hoặc đánh lạc hướng.

## 3. Luồng hoạt động (Gameplay Loop)

1.  **Lựa chọn:** Người học chọn màn chơi, hệ thống khởi tạo ngữ cảnh (System Prompt riêng biệt cho AI).
2.  **Khởi đầu:** NPC (AI) chủ động mở lời bằng một câu hỏi hoặc câu cảm thán.
3.  **Tương tác xoay vòng:**
    *   Người học gõ câu phản hồi (hoặc dùng Voice Chat - tính năng tương lai).
    *   Backend nhận câu trả lời, gửi cho LLM (OpenAI) với format trả về dạng JSON bao gồm:
        *   `npc_reply`: Lời đáp của NPC (giữ đúng vai, thái độ, tính cách).
        *   `grammar_correction`: Sửa lỗi câu người dùng vừa nói (chỉ sửa ngữ pháp/từ vựng, không liên quan cốt truyện).
        *   `goal_progress`: Tiền độ phần trăm hoặc trạng thái hoàn thành yêu cầu màn chơi.
        *   `is_completed`: Boolean, đánh dấu màn chơi kết thúc.
4.  **Trao thưởng:** Khi `is_completed = true`:
    *   Frontend nổ hiệu ứng pháo hoa 🎆.
    *   Tổng hợp các từ mới, điểm số và cộng chuỗi ngày (Streak).
    *   Lưu trữ các lỗi ngữ pháp đã gặp vào "Sổ tay kiến thức".

## 4. Cấu Trúc Kỹ Thuật (Dự Kiến)

### Frontend (React)
*   **Thư mục mới:** `src/features/roleplay/`
*   **Component cốt lõi:**
    *   `RoleplayMenu`: Chọn kịch bản.
    *   `RoleplayEngine`: Màn hình chat trực tuyến giả lập giao diện Game Visual Novel (Khung hội thoại lớn, Avatar NPC chân dung).
    *   `RoleplayFeedback`: Sidebar hoặc Popup nhỏ hiển thị lỗi ngữ pháp của câu vừa gõ (Shadow Correction).
*   **Tích hợp App:** Thêm Tab điều hướng mới (`view === 'roleplay'`). Thêm icon 🎭 vào menu hệ thống [App.js](file:///d:/english-chatbot/frontend/src/App.js).

### Backend (Node.js/Express)
*   **Thư mục mới:** `src/modules/roleplay/`
*   **Routes & Controller (`roleplay.controller.js`):**
    *   `GET /scenarios`: Lọc danh sách kịch bản hiện có.
    *   `POST /chat`: Gửi câu nói của người học, nhận lại luồng JSON từ AI.
*   **AI Service (`roleplay.service.js`):**
    *   Sử dụng API OpenAI với `response_format: { type: "json_object" }`.
    *   Xây dựng System Prompt siêu chặt chẽ để tách biệt **hành vi NPC** và **công việc của gia sư** trong cùng một request (nhằm tối ưu tốc độ, chi phí).
*   **Repository (`roleplay.repository.js`):**
    *   Lưu lịch sử hội thoại vào bảng `roleplay_sessions` để AI có Context Memory.
    *   Liên kết với `user_vocabulary` và `learning_streaks`.
