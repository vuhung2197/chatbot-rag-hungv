# Nghiên cứu Cải tiến Hệ thống RAG & Xử lý Câu hỏi Ngoài Kiến thức (OOK)

Tài liệu này tổng hợp các hướng nghiên cứu chuyên sâu để tối ưu hóa hệ thống RAG, đặc biệt là việc ngăn chặn ảo giác (hallucination) và xử lý các câu hỏi không nằm trong cơ sở dữ liệu.

---

## 1. Cơ chế Hybrid Search (Tìm kiếm hỗn hợp)
**Vấn đề:** Vector Search (Semantic) đôi khi bỏ lỡ các thông tin quan trọng nếu người dùng dùng từ khóa chính xác nhưng ngữ cảnh vector không khớp hoàn toàn.

- **Tiếp cận:** Kết hợp **Full-Text Search (BM25/FTS)** và **Vector Search (Cosine Similarity)**.
- **Thuật toán RRF (Reciprocal Rank Fusion):** 
  - Tính điểm dựa trên thứ hạng thay vì điểm số tuyệt đối.
  - Công thức: $score = \sum_{d \in D} \frac{1}{k + rank(d)}$.
  - Giúp trung hòa kết quả từ nhiều nguồn tìm kiếm khác nhau.

## 2. Re-ranking (Tối ưu hóa tầng thứ hai)
**Vấn đề:** Vector Search (Bi-Encoder) tìm kiếm nhanh nhưng độ chính xác về ngữ nghĩa sâu chưa cao.

- **Cross-Encoder Model:** Nhận diện mối quan hệ trực tiếp giữa Cặp (Câu hỏi, Đoạn văn).
- **Quy trình triển khai:**
  1. **Tầng 1 (Retrieval):** Lấy Top 50 ứng viên bằng Vector Search nhanh.
  2. **Tầng 2 (Re-rank):** Dùng các model như `BGE-Reranker` hoặc `Cohere API` để chấm điểm lại 50 ứng viên đó.
- **Xử lý OOK (Out-of-Knowledge):** Thiết lập **Relevance Threshold** (Ngưỡng liên quan). Nếu điểm Re-rank cao nhất < 0.3, hệ thống sẽ kết luận không có kiến thức và từ chối trả lời thay vì "chém gió".

## 3. Kiến trúc Router (Định tuyến thông minh)
**Vấn đề:** Không phải câu hỏi nào cũng cần tra cứu cơ sở dữ liệu (ví dụ: "Chào bạn", "Bạn là ai?").

- **Intent Classification:** LLM phân loại câu hỏi ngay từ đầu.
- **Cơ chế:**
  - **Route A (Greeting/General):** Trả lời trực tiếp bằng LLM, tiết kiệm tài nguyên Vector DB.
  - **Route B (Knowledge):** Chỉ kích hoạt RAG khi câu hỏi thực sự liên quan đến kiến thức chuyên môn.
  - **Route C (OOD - Out of Domain):** Từ chối ngay lập tức nếu nằm trong danh mục cấm (chính trị, tôn giáo...).

## 4. Query Transformation (Biến đổi truy vấn)
Giúp hệ thống "hiểu" câu hỏi tốt hơn trước khi đi tìm kiến thức.

- **HyDE (Hypothetical Document Embeddings):** LLM tạo một câu trả lời giả định, sau đó dùng câu trả lời đó để tìm kiến thức thật sự tương đồng.
- **Multi-Query:** Sinh ra nhiều biến thể của câu hỏi gốc để tăng xác suất khớp với tài liệu.
- **Step-back Prompting:** Hỏi về các nguyên lý cơ bản trước khi trả lời câu hỏi cụ thể.

## 5. Kiểm soát đầu ra (Guardrails)
- **"I don't know" Prompting:** Ép LLM chỉ trả lời dựa trên Context được cung cấp.
- **Citation Enforcement:** Yêu cầu LLM phải chỉ rõ thông tin lấy từ Chunk ID nào. Nếu không có dẫn chứng, câu trả lời sẽ không được hiển thị.
- **Self-RAG:** AI tự đánh giá tính xác thực của câu trả lời dựa trên các dữ kiện đã tìm thấy.

---

## Lộ trình triển khai khuyến nghị
1. **Giai đoạn 1:** Triển khai **Re-ranking** (Dùng Cohere API hoặc BGE model) và thiết lập **Threshold**. Đây là cách nhanh nhất để giảm 80% lỗi ảo giác.
2. **Giai đoạn 2:** Xây dựng **Router** để phân loại câu hỏi, giảm tải cho hệ thống và tăng tốc độ phản hồi cho các câu hỏi xã giao.
3. **Giai đoạn 3:** Tối ưu hóa tìm kiếm bằng **Hybrid Search** kết hợp với FTS của PostgreSQL.

---
*Tài liệu nghiên cứu được tổng hợp vào ngày 04/02/2026 bởi Antigravity.*
