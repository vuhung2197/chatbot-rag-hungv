# Bản Sửa Lỗi Chuyển Đổi Tiền Tệ Cho Thống Kê Ví

## Mô Tả Vấn Đề

Khi đơn vị tiền tệ của ví người dùng được đặt thành **VND**, các thống kê tổng số tiền nạp và tổng số tiền đã chi không được chuyển đổi từ USD sang VND. Điều này khiến các thống kê hiển thị giá trị không chính xác.

### Nguyên Nhân Gốc Rễ

Endpoint `getWalletStats` trong `walletController.js` đang trả về thống kê thô từ cơ sở dữ liệu, nơi tất cả các giao dịch được lưu trữ bằng **USD**. Khi frontend cố gắng định dạng các giá trị này bằng đơn vị tiền tệ hiện tại của người dùng (VND), nó chỉ đơn giản áp dụng định dạng VND cho số tiền USD, dẫn đến hiển thị không chính xác.

Ví dụ:
- Nếu người dùng nạp $100 USD (tương đương 2,400,000 VND sau khi chuyển đổi)
- Cơ sở dữ liệu lưu trữ giá trị này là 100 USD trong giao dịch
- Khi ví được chuyển sang VND, thống kê hiển thị "100 VND" thay vì "2,400,000 VND"

## Giải Pháp

Đã cập nhật hàm `getWalletStats` trong `backend/controllers/walletController.js` để chuyển đổi các thống kê sang đơn vị tiền tệ hiện tại của ví người dùng trước khi gửi chúng đến frontend.

### Các Thay Đổi Code

**File:** `backend/controllers/walletController.js`

**Trước:**
```javascript
export async function getWalletStats(req, res) {
    // ... truy vấn database ...
    
    res.json(stats[0]);
}
```

**Sau:**
```javascript
export async function getWalletStats(req, res) {
    // ... truy vấn database ...
    
    const result = stats[0];
    
    // Chuyển đổi total_deposits và total_spent sang đơn vị tiền tệ của ví nếu cần
    // Giao dịch được lưu trữ bằng USD, nên chuyển sang VND nếu ví đang dùng VND
    if (result.currency === 'VND') {
        result.total_deposits = currencyService.convertCurrency(
            parseFloat(result.total_deposits) || 0,
            'USD',
            'VND'
        );
        result.total_spent = currencyService.convertCurrency(
            parseFloat(result.total_spent) || 0,
            'USD',
            'VND'
        );
    }

    res.json(result);
}
```

## Cách Hoạt Động

1. **Lưu Trữ Cơ Sở Dữ Liệu:** Tất cả giao dịch vẫn được lưu trữ bằng USD để đảm bảo tính nhất quán
2. **Chuyển Đổi Tiền Tệ:** Khi đơn vị tiền tệ của ví là VND, backend sẽ chuyển đổi các thống kê sử dụng tỷ giá hối đoái (1 USD = 24,000 VND)
3. **Hiển Thị Frontend:** Frontend nhận các giá trị đã được chuyển đổi sẵn và áp dụng định dạng phù hợp

## Kiểm Tra

Để xác minh bản sửa lỗi:

1. **Tạo ví bằng USD** và thực hiện một lần nạp tiền (ví dụ: $100)
2. **Chuyển sang VND** bằng công cụ chọn tiền tệ
3. **Kiểm tra các thống kê:**
   - Tổng Số Tiền Nạp nên hiển thị ~2,400,000 VND (không phải 100 VND)
   - Tổng Số Tiền Đã Chi nên hiển thị đúng số tiền VND
   - Số dư nên được chuyển đổi chính xác

## Tỷ Giá Hối Đoái

Tỷ giá hối đoái hiện tại được định nghĩa trong `backend/services/currencyService.js`:
- **USD sang VND:** 1 USD = 24,000 VND
- **VND sang USD:** 1 VND = 0.0000417 USD

## Các File Liên Quan

- `backend/controllers/walletController.js` - Chứa bản sửa lỗi
- `backend/services/currencyService.js` - Logic chuyển đổi tiền tệ
- `frontend/src/component/WalletDashboard.js` - Hiển thị các thống kê
