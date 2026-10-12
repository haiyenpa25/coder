# SỔ TAY VẬN HÀNH DÀNH CHO NHÂN SỰ ÂM THANH NHÀ THỜ
## HỆ THỐNG X32 AI SOUND ENGINEER (CHURCHMIX)

---

### 1. NGUYÊN TẮC VÀNG TRƯỚC GIỜ LỄ
1. **Âm thanh phục vụ sự thờ phượng:** Chất giọng trung thực, rõ lời, êm dịu, không gây chói tai hay mệt mỏi cho hội chúng.
2. **Bất biến an toàn sống còn (Hard Invariant):** Cổng **DL16 số 11** (Micro Talkback ban nhạc) **CHỈ ĐƯỢC PHÉP ĐI VÀO P16**, **TUYỆT ĐỐI KHÔNG ĐƯỢC PHÉP RA LOA FOH**.
3. **Mặc định Chỉ Đọc (`OBSERVE`):** Khi khởi động, phần mềm luôn ở chế độ chỉ đọc. Mọi thay đổi đều phải được kỹ thuật viên bấm **Duyệt (Approve)**.
4. **Nút STOP AUTO khẩn cấp:** Nếu có bất kỳ hiện tượng âm thanh bất thường nào, bấm ngay nút **STOP AUTO** màu đỏ ở góc trên màn hình hoặc thao tác trực tiếp trên cần gạt của bàn mixer vật lý.

---

### 2. QUY TRÌNH CHUẨN BỊ TRƯỚC GIỜ LỄ (30 PHÚT TRƯỚC LỄ)

#### Bước 1: Khởi động hệ thống
1. Bật nguồn mixer **Behringer X32 Compact** và stagebox **DL16**.
2. Cắm cáp mạng LAN từ laptop vào cổng Ethernet của X32 (hoặc kết nối cùng Wi-Fi router nội bộ).
3. Nhấp đúp chuột vào file `start_church_engineer.bat` trên màn hình laptop.
4. Trình duyệt sẽ tự động mở trang điều khiển tại địa chỉ: `http://127.0.0.1:8080`.

#### Bước 2: Thực hiện Wizard 2 (Pre-Service Line Check)
1. Trên thanh Header, nhấn nút **`[Wizards Quy Trình]`**.
2. Chọn tab **`W2: Line Check Chúa Nhật`**.
3. Tiến hành kiểm tra thực tế 4 mục vật lý và tích chọn:
   * [x] **Pin micro không dây:** Kiểm tra mic Mục sư và Ban hát (pin $\ge 2$ vạch).
   * [x] **Cáp mạng AES50 A:** Đảm bảo đèn xanh kết nối DL16 sáng ổn định, không chập chờn.
   * [x] **Cáp mạng P16-D:** Kiểm tra 3 bộ mixer cá nhân P16-HQ của ban nhạc đã có tiếng.
   * [x] **Micro Talkback DL16 #11:** Bấm thử mic, xác nhận chỉ nghe trong tai nghe ban nhạc, loa lớn FOH hoàn toàn im lặng.
4. Đối chiếu bảng 32 kênh: Đảm bảo các kênh micro chính không bị Mute vô ý.
5. Khi bảng hiển thị **`READY 100%`** màu xanh $\rightarrow$ Hoàn tất chuẩn bị.

---

### 3. QUY TRÌNH HIỆU CHUẨN TRONG BUỔI TẬP (REHEARSAL)

#### Hiệu chuẩn giọng hát & bài giảng (Wizard 3):
1. Trong cửa sổ Wizards, chọn tab **`W3: Cân Chỉnh Giọng (Vocal)`**.
2. Chọn kênh tương ứng (ví dụ: Kênh 1 - Mục sư, Kênh 3 - Nữ đơn ca).
3. Yêu cầu người nói/hát phát âm tự nhiên 20–30 giây.
4. Bấm **`Lấy Mẫu 20s & Phân Tích Đề Xuất Âm Học`**.
5. Đọc hướng dẫn bố trí khoảng cách micro và thông số HPF/Compressor đề xuất.
6. Quan sát biểu đồ đáp tuyến mô phỏng A/B trước khi áp dụng.

#### Dò hú an toàn khi tập (Wizard 5):
* **Lưu ý:** Chỉ thực hiện khi hội trường không có người.
1. Chọn tab **`W5: Dò Hú Khi Tập (Ring-Out)`**.
2. Đặt micro tại vị trí ca sĩ đứng thật.
3. Làm theo 8 bước hướng dẫn SOP hiển thị trên màn hình.
4. Đẩy nhẹ fader cho tới khi xuất hiện tiếng rền chớm hú $\rightarrow$ hệ thống bắt chính xác tần số và tạo **Notch Filter phẫu thuật** cực hẹp ($Q=6.5$) để triệt tiêu mà không làm mỏng giọng.

---

### 4. VẬN HÀNH TRONG GIỜ LỄ TRỰC TIẾP
* Luôn để màn hình ở giao diện chính để quan sát:
  * Biểu đồ phổ tần số thời gian thực **1/12-Octave RTA**.
  * Cột đèn LED mức tín hiệu 32 kênh.
  * Trạng thái **Silence Hold**: Bộ điều khiển tự động khóa chặt fader khi Mục sư ngưng nói, không tự đẩy tiếng ồn nền lên.
* Nếu Mục sư nói quá lớn mấp mé ngưỡng vỡ tiếng ($\text{Peak} > -1.5\text{ dBFS}$), hệ thống kích hoạt **Anti-Clipping Guard** để bảo vệ an toàn.

---

### 5. KẾT THÚC BUỔI LỄ (WIZARD 7)
1. Nhấn nút **`[Wizards Quy Trình]`** $\rightarrow$ Chọn tab **`W7: Báo Cáo Buổi Lễ`**.
2. Nhấn nút **`Xuất Báo Cáo (.md)`** để tải về nhật ký vận hành buổi lễ lưu trữ cho ban kỹ thuật.
