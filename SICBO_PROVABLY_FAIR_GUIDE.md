# Hướng Dẫn & Giải Thích: Hệ Thống Provably Fair (Công Bằng Tuyệt Đối)

## 1. Provably Fair Là Gì?

**Provably Fair** (Công bằng có thể kiểm chứng) là một thuật toán giúp người chơi xác minh rằng kết quả của ván cược **không bị sắp đặt trước** hoặc **bị thay đổi** bởi nhà cái sau khi người chơi đã đặt cược.

### Nguyên lý đơn giản (Ví dụ xào bài):
1.  **Nhà cái** xào một bộ bài và đặt úp xuống bàn. (Người chơi không nhìn thấy, nhưng Nhà cái cũng không thể thay đổi thứ tự lá bài nữa).
2.  **Người chơi** được yêu cầu: "Anh muốn cắt bài (kinh bài) ở vị trí nào?".
3.  **Hành động**: Người chơi chọn cắt tại lá thứ 10.
4.  **Kết quả**: Lật lá bài thứ 10 lên.

-> Nhà cái không thể gian lận vì họ không biết người chơi sẽ cắt bài ở đâu. Người chơi cũng không thể gian lận vì họ không biết lá bài úp là gì.

---

## 2. Cách Hoạt Động Kỹ Thuật (Trong Sic Bo)

Hệ thống dựa trên 3 yếu tố chính:

### A. Server Seed (Hạt giống máy chủ)
- Là một chuỗi ký tự ngẫu nhiên do Server tạo ra (Ví dụ: `w84885838...`).
- **Quan trọng**: Trước khi ván chơi bắt đầu, Server sẽ đưa cho người chơi xem bản **Hash** (mã hóa) của chuỗi này.
- *Ý nghĩa*: Giống như việc Nhà cái bỏ bộ bài vào két sắt kính. Người chơi thấy cái két (Hash) nhưng không chạm vào được bài (Seed gốc). Điều này cam kết Server không đổi Seed sau khi thấy tiền cược của User.

### B. Client Seed (Hạt giống người chơi)
- Là một chuỗi ký tự do trình duyệt của người chơi tạo ra (hoặc người chơi tự nhập).
- *Ý nghĩa*: Giống như việc Người chơi quyết định "vị trí cắt bài". Server không thể kiểm soát được biến số này.

### C. Nonce (Số thứ tự)
- Là số đếm tăng dần cho mỗi ván cược (0, 1, 2, 3...).
- *Ý nghĩa*: Đảm bảo mỗi ván chơi lật ra một kết quả khác nhau dù Seed không đổi.

---

## 3. Quy Trình Một Ván Cược Provably Fair

### Bước 1: Khởi tạo (Trước khi cược)
- Server tạo `ServerSeed`.
- Server gửi `ServerSeedHash` (đã mã hóa SHA256) cho Client.
- Người chơi không biết `ServerSeed` gốc, nhưng biết chắc chắn nó đã tồn tại và không thể đổi.

### Bước 2: Đặt cược & Quay số
- Người chơi nhấn "Cược". Client gửi `ClientSeed` lên Server.
- Server tính toán kết quả dựa trên công thức:
  ```javascript
  ResultHash = HMAC_SHA256(ServerSeed, ClientSeed + Nonce)
  ```
- Kết quả `ResultHash` là chuỗi Hex luông luôn cố định nếu đầu vào giống nhau.

### Bước 3: Biến đổi ra Xúc Xắc (Dice)
- Từ chuỗi `ResultHash` (dài 64 ký tự), ta lấy từng phần nhỏ để chuyển thành số.
- Ví dụ lấy 2 ký tự đầu `a1` -> chuyển sang thập phân -> Modulo 6 -> Cộng 1 -> Ra mặt xúc xắc (1-6).
- Lặp lại cho 3 viên xúc xắc.

### Bước 4: Công bố & Kiểm tra (Sau khi có kết quả)
- Server trả về kết quả thắng/thua.
- Server **Công bố (Reveal)** `ServerSeed` gốc của ngày hôm trước (hoặc chuỗi cũ).
- **Kiểm chứng**: Người chơi copy `ServerSeed` gốc + `ClientSeed` + `Nonce` ván đó, chạy lại thuật toán Hash. Nếu kết quả ra đúng 3 con xúc xắc như đã hiện -> **Công Bằng**.

---

## 4. Ví Dụ Cài Đặt (Implementation Concepts)

Dưới đây là đoạn code minh họa cách tính toán kết quả xúc xắc từ 3 yếu tố trên:

```javascript
const crypto = require('crypto');

function rollDice(serverSeed, clientSeed, nonce) {
    // 1. Tạo chuỗi kết hợp
    const message = `${clientSeed}:${nonce}`;
    
    // 2. Tạo HMAC Hash (Chuỗi hex 64 ký tự)
    const hash = crypto.createHmac('sha256', serverSeed)
                       .update(message)
                       .digest('hex');

    // 3. Lấy kết quả 3 viên xúc xắc
    // Chia hash thành các đoạn nhỏ, mỗi đoạn dùng cho 1 viên
    const dice = [];
    let index = 0;
    
    while (dice.length < 3) {
        // Lấy 5 ký tự hex (đủ lớn để chia đều xác suất)
        const subHash = hash.substring(index, index + 5);
        if (!subHash) break; // Should not happen

        const decimalValue = parseInt(subHash, 16);
        
        // Kiểm tra xem số này có < 1,000,000 không để đảm bảo uniform distribution
        // (Nếu số quá lớn sát giới hạn biên của 5 ký tự hex thì bỏ qua để tránh Bias)
        if (decimalValue < 1000000) {
            // Modulo 6 để lấy giá trị 0-5, cộng 1 để ra 1-6
            const diceValue = (decimalValue % 6) + 1;
            dice.push(diceValue);
        }
        
        index += 5;
    }
    
    return dice;
}

// Ví dụ chạy thử
const serverSeed = "b84576329..."; // Đã được hash public trước đó
const clientSeed = "user_lucky_string"; 
const nonce = 10;

console.log(rollDice(serverSeed, clientSeed, nonce)); 
// Output: [2, 5, 1] (Ví dụ)
```

---

## 5. Chi Tiết Về Các Tham Số & Cách Lấy

Để kiểm tra, bạn cần 3 tham số đầu vào. Dưới đây là cách lấy chúng:

### 1. Server Seed (Chuỗi bí mật của nhà cái)
Đây là chuỗi ngẫu nhiên 64 ký tự Hex do Server tạo ra.
- **Trong Game thực tế**: Bạn chỉ nhận được chuỗi này **SAU KHI ván chơi kết thúc** (nhà cái "ngửa bài"). Nó sẽ hiện trong phần "Chi tiết lịch sử cược" hoặc API Response.
- **Để Tự Tạo (Test)**: Bạn có thể tự tạo một chuỗi ngẫu nhiên để test công cụ kiểm tra.
  - Chạy lệnh: `node verify_sicbo.js gen`
  - Tool sẽ sinh ra một chuỗi ngẫu nhiên an toàn, ví dụ: `b84576329ef3b6d9c73...`

### 2. Client Seed (Mã định danh người chơi)
Đây là chuỗi do phía người chơi quyết định, đảm bảo Server không thể biết trước.
- **Mặc định**: Hệ thống sử dụng **User ID** của bạn (Ví dụ: `101`).
- **Tùy chỉnh**: Trong các phiên bản nâng cao, người chơi có thể tự nhập một chuỗi bất kỳ (Ví dụ: `my_lucky_seed_2024`) vào ô "Client Seed" trước khi cược.

### 3. Nonce (Số thứ tự ván)
Đây là biến số thay đổi liên tục để mỗi ván cược có kết quả khác nhau dù Seed không đổi.
- **Trong hệ thống hiện tại**: Chúng tôi đang sử dụng **Timestamp** (thời gian tính bằng mili-giây) của thời điểm đặt cược. Ví dụ: `1706501234567`.
- **Cách xem**: Xem trong metadata của giao dịch hoặc API response field `nonce`.

---

## 6. Hướng Dẫn Tự Kiểm Tra (Dành Cho Người Dùng)

Chúng tôi cung cấp một công cụ mã nguồn mở để bất kỳ ai cũng có thể tự kiểm tra lại kết quả ván cược của mình.

### Bước 1: Lấy thông tin ván cược
Sau khi chơi, hãy vào phần **Lịch sử**, bấm vào chi tiết một phiên chơi để lấy các thông số sau:
1.  **Server Seed**: (Chuỗi bí mật mà nhà cái công bố sau khi xổ).
2.  **Client Seed**: (Mã định danh của bạn hoặc chuỗi bạn tự nhập).
3.  **Nonce**: (Thời gian hoặc số thứ tự ván).

### Bước 2: Chạy công cụ kiểm tra
Bạn có thể sử dụng công cụ có sẵn trong mã nguồn hoặc copy đoạn code Javascript ở trên vào [JSFiddle](https://jsfiddle.net/) để chạy.

Nếu bạn có quyền truy cập mã nguồn dự án, hãy chạy lệnh sau trong Terminal:

```bash
# 1. Tạo Server Seed ngẫu nhiên (để test thử)
node verify_sicbo.js gen
# Output: a8f... (Copy chuỗi này)

# 2. Chạy kiểm tra với Seed vừa tạo, ID của bạn và Thời gian
node verify_sicbo.js <Paste_Server_Seed> <Your_ID> <Timestamp>

# Ví dụ thực tế
node verify_sicbo.js a2f388960782f93bc51b3a6237699661448b3075252875152341235612378901 user_123 1700000000
```

### Bước 3: So sánh
Công cụ sẽ in ra:
- Hash được tạo ra.
- Cách chuyển đổi từ Hash sang 3 con xúc xắc.
- Kết quả cuối cùng.

Nếu kết quả này trùng khớp 100% với những gì hiển thị trên game, nghĩa là: **Ván cược HOÀN TOÀN CÔNG BẰNG và KHÔNG BỊ CAN THIỆP.**

---

## 6. Kết Luận
Việc áp dụng **Provably Fair** sẽ biến game Sic Bo từ một trò chơi "tin vào nhà cái" thành một hệ thống **minh bạch toán học** (Cryptographically Verifiable). Đây là tiêu chuẩn vàng của các Casino Online hiện đại.
