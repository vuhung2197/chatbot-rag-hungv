# Phân Tích Kỹ Thuật Toán Game Sic Bo (Tài Xỉu)

## 1. Tổng Quan Thuật Toán
Hệ thống sử dụng **Pseudo-Random Number Generator (PRNG)** có sẵn của Javascript (`Math.random()`) để mô phỏng việc tung xúc xắc.

### Logic Cốt Lõi:
```javascript
// 5. Roll Dice & Determine Result
const dice1 = Math.floor(Math.random() * 6) + 1;
const dice2 = Math.floor(Math.random() * 6) + 1;
const dice3 = Math.floor(Math.random() * 6) + 1;
const totalScore = dice1 + dice2 + dice3;
```

Mỗi viên xúc xắc được quay độc lập, đảm bảo xác suất xuất hiện của mỗi mặt (1-6) là 1/6 (~16.67%).

---

## 2. Phân Tích Xác Suất & House Edge

### Cơ Chế Xác Định Kết Quả:
- **TỔNG ĐIỂM**: 3 đến 18.
- **TÀI (BIG)**: Tổng từ 11 đến 17.
- **XỈU (SMALL)**: Tổng từ 4 đến 10.
- **BÃO (TRIPLE)**: 3 viên xúc xắc giống nhau (Ví dụ: 1-1-1, 6-6-6).

### House Edge (Lợi thế nhà cái):
Trong Sic Bo truyền thống và phiên bản này, **BÃO (Triple)** là trường hợp đặc biệt:
- Nếu ra Bão (bất kể tổng điểm bao nhiêu), người chơi đặt Tài hoặc Xỉu đều **THUA**.
- Tổng số trường hợp có thể xảy ra: $6 \times 6 \times 6 = 216$.
- Số trường hợp Bão: 6 (1-1-1 đến 6-6-6).
- Xác suất ra Bão: $6/216 \approx 2.78\%$.

Do đó, tỷ lệ thắng thực tế của người chơi khi đặt Tài/Xỉu là:
$$ \frac{216 - 6}{2} \div 216 = \frac{105}{216} \approx 48.61\% $$

**Lợi thế nhà cái (House Edge):**
$$ 100\% - (48.61\% \times 2) \approx 2.78\% $$

Điều này đảm bảo về lâu dài, Nhà cái luôn có lãi khoảng 2.78% trên tổng doanh thu cược.

---

## 3. Đánh Giá Độ An Toàn & Công Bằng

### Hiện Tại: `Math.random()`
- **Ưu điểm**: Nhanh, dễ cài đặt, không tốn tài nguyên.
- **Nhược điểm**: 
  - Không phải là ngẫu nhiên thực sự (True Random).
  - Có thể dự đoán được nếu biết trạng thái hạt giống (seed) của V8 engine (mặc dù cực khó trong môi trường Node.js server-side nhiều request).
  - Không minh bạch với người chơi (người chơi phải "tin" vào server).

### Đề Xuất Cải Tiến (Provably Fair)
Để nâng cao uy tín, nên chuyển sang thuật toán **Provably Fair** (Công bằng có thể kiểm chứng):

1.  **Server Seed**: Một chuỗi ngẫu nhiên bí mật sinh ra từ trước.
2.  **Client Seed**: Người dùng có thể tự nhập hoặc random.
3.  **Nonce**: Số thứ tự ván cược (0, 1, 2...).
4.  **Công thức**: 
    ```javascript
    HMAC_SHA256(ServerSeed, ClientSeed + Nonce)
    ```
5.  **Kết quả**: Lấy hash hex chuyển sang số thập phân để chia lấy dư (Modulo 6).

Cơ chế này cho phép người chơi tự kiểm tra lại kết quả sau khi ván cược kết thúc để đảm bảo Server không "sửa" kết quả.

---

## 4. Kết Luận
Thuật toán hiện tại (Math.random) là **đủ dùng** cho quy mô giải trí, demo hoặc ứng dụng nhỏ. Cơ chế House Edge (Bão) được cài đặt chuẩn xác theo luật quốc tế.

Tuy nhiên, nếu triển khai thực tế (Real Money Operation), **BẮT BUỘC** phải nâng cấp lên **CSPRNG** (Cryptographically Secure Pseudo-Random Number Generator) ví dụ như `crypto.randomInt()` của Node.js hoặc hệ thống Provably Fair đầy đủ.
