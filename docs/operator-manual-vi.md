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

---

### 6. TẬP LỄ ẢO KỸ THUẬT SỐ (VIRTUAL SOUNDCHECK)
Khi ban nhạc và ca đoàn chưa có mặt đủ hoặc kỹ thuật viên cần cân chỉnh trước:
1. Nhấn nút **`[Soundcheck Ảo]`** màu xanh dương trên thanh Header.
2. Chọn 1 trong 4 phiên tập multitrack 32 track mẫu:
   - **Thờ Phượng Êm Dịu (Ballad):** Piano, Acoustic Guitar, Nữ đơn ca.
   - **Ngợi Khen Sôi Động (Uptempo):** Trống cajon/kick, Bass, Guitar, Nam đơn ca.
   - **Bài Giảng Mục Sư (Preaching):** Giọng nói Mục sư kiểm tra Silence Hold & Leveler.
   - **Cầu Nguyện Chung (Prayer):** Tiếng cầu nguyện kết hợp piano êm dịu.
3. Bấm **`Bắt Đầu Phát Đa Kênh`** để đưa luồng âm thanh vào hệ thống phân tích RTA và cân chỉnh EQ.
4. Bất biến an toàn DL16 #11 tự động kích hoạt bảo vệ: tín hiệu Talkback luôn bị cách ly ở mức an toàn -55dBFS, tuyệt đối không lọt ra Main FOH.

---

### 7. CHỌN HỒ SƠ PHÒNG & SO SÁNH BASELINE ÂM HỌC (MULTI-SANCTUARY)
Khi làm lễ ở các hội trường hoặc phòng nhóm khác nhau:
1. Nhấn nút **`[Phòng: ...]`** màu xanh ngọc trên thanh Header.
2. Chọn không gian phục vụ:
   - **Hội Trường Lớn (Main Sanctuary):** Sức chứa 800 chỗ, RT60 mục tiêu 1.60s, Line Array FOH.
   - **Phòng Giới Trẻ (Youth Chapel):** Sức chứa 150 chỗ, RT60 0.85s, Point Source.
   - **Hội Trường Thông Công (Fellowship Hall):** Sức chứa 300 chỗ, RT60 1.95s, Bê tông & kính.
   - **Sân Khấu Ngoài Trời (Outdoor Campus):** Sức chứa 1200 chỗ, RT60 0.25s, Không gian mở.
3. Nhấn **`Kích Hoạt Phòng Này`** để nạp cấu hình âm học tương ứng.
4. Nhấn **`Kiểm Tra Lệch Baseline`** để hệ thống so sánh đáp tuyến thực tế với baseline chuẩn, đưa ra khuyến nghị kỹ thuật (kiểm tra độ lệch delay, dải tần cộng hưởng phòng hoặc khóa No-Boost-in-Nulls).

---

### 8. HỎI ĐÁP VỚI TRỢ LÝ AI COPILOT TIẾNG VIỆT
1. Ở góc dưới bên phải giao diện chính, nhập câu hỏi vào ô **"Hỏi Trợ Lý Âm Học AI..."**
2. Trợ lý tích hợp cơ sở tri thức âm học nhà thờ chuẩn và ngữ cảnh thời gian thực của mixer X32:
   - *"Micro mục sư bị um ở dải trầm thì xử lý thế nào?"*
   - *"Quy tắc cách ly kênh 11 Talkback ban nhạc là gì?"*
   - *"Hệ thống có đang gặp nguy cơ hú không?"*
3. Bấm **`Gửi`** để nhận câu trả lời chi tiết bằng tiếng Việt có cấu trúc rõ ràng.

---

### 9. IN BÁO CÁO BUỔI LỄ CHỦ NHẬT (PRINTABLE REPORT)
1. Bấm nút **`[In Báo Cáo]`** trên thanh Header.
2. Trình duyệt mở trang `/api/v1/reports/sunday-service` chuẩn HTML/CSS sẵn sàng in ấn A4:
   - Bảng điểm an toàn hệ thống (100% DL16 In 11 Isolation).
   - Danh sách phân bổ kênh 1-32.
   - Nhật ký điều chỉnh và can thiệp fader.
   - Khuyến nghị âm học cho buổi lễ kế tiếp.
3. Nhấn `Ctrl + P` để in ra giấy hoặc lưu thành file PDF nộp cho Ban Trị Sự / Mục Sư.

---

### 10. TỰ CHẨN ĐOÁN TIỀN LỄ (10-POINT PRE-SERVICE HEALTH CHECK)
Trước khi bắt đầu buổi lễ 15 phút:
1. Quan sát huy hiệu **`[Khám Sức Khỏe: 10/10 OK]`** màu xanh lá ở góc trên thanh Header.
2. Bấm vào huy hiệu để mở bảng chi tiết chẩn đoán 10 tiêu chuẩn:
   - Thư viện Core Python, Cơ sở dữ liệu SQLite, Bất biến DL16 #11 Talkback.
   - Kết nối OSC X32 Read-Only, Sound Card USB, Sơ đồ 32 kênh, Hồ sơ phòng, Virtual Soundcheck, Copilot RAG, Bản in báo cáo.
3. Nếu tất cả hiển thị **`PASS`**, hệ thống hoàn toàn sẵn sàng. Có thể chạy qua dòng lệnh terminal bằng:
   ```powershell
   python diagnose_system.py
   ```

---

### 11. QUẢN LÝ SƠ ĐỒ 32 KÊNH NHÀ THỜ (CHURCH CHANNEL MAP)
1. Bấm nút **`[Sơ Đồ Kênh]`** màu tím trên thanh Header.
2. Màn hình mở lưới 32 kênh của nhà thờ:
   - Bấm **`Chỉnh Sửa`** tại bất kỳ kênh nào để đổi tên ca sĩ, vai trò âm học (Role) hoặc ghi chú phụ trách.
   - Sau khi lưu, tên kênh sẽ tự động cập nhật ngay lập tức xuống các dải fader trên màn hình chính.
   - **Bảo vệ vĩnh viễn Kênh 11:** Biểu tượng ổ khóa màu đỏ báo hiệu cổng Talkback DL16 #11 được khóa bất biến, ngăn ngừa hoàn toàn nguy cơ gán nhầm sang loa lớn FOH.
   - Nút **`Khôi Phục Mặc Định`** giúp nạp lại cấu hình chuẩn ban đầu khi cần thiết.

---

### 12. KHO LƯU TRỮ SCENE & SO SÁNH KHÁC BIỆT (SCENE VAULT & SNAPSHOT DIFF)
1. Bấm nút **`[Kho Lưu Trữ Scene]`** màu hổ phách trên thanh Header.
2. **Tạo bản sao lưu tức thì (Snapshot Live Mixer):**
   - Nhập tên bản lưu (ví dụ: *"Lễ Sáng Chúa Nhật 12/10"*), người thực hiện và ghi chú.
   - Bấm **`Lưu Bản Sao Vào Kho`**: Hệ thống sẽ chụp toàn bộ 32 kênh từ bàn mixer thật/giả lập, tự động tính toán mã toàn vẹn SHA-256 và thẩm định nghiêm ngặt bất biến Talkback DL16 #11.
3. **Xuất file USB .scn cắm bàn mixer thật:**
   - Tại danh sách bản lưu, bấm nút **`[Tải .scn USB]`** tương ứng với snapshot mong muốn.
   - Trình duyệt sẽ tải về file `.scn` chuẩn Behringer X32/M32. Người vận hành chỉ cần chép file này vào USB rồi cắm trực tiếp vào mặt trước bàn trộn cơ vật lý để nạp cảnh mà không cần máy tính.
4. **So sánh khác biệt (Snapshot Delta Diff):**
   - Tích chọn ô vuông trước **chính xác 2 bản sao lưu** muốn so sánh.
   - Bấm **`[So Sánh 2 Bản Chọn]`**: Hệ thống tự động phân tích chi tiết từng kênh bị thay đổi (tên kênh, fader tăng/giảm bao nhiêu %, trạng thái Mute/Unmute, bộ lọc HPF và các dải PEQ 1-4).
   - Kiểm định an toàn bất biến Talkback trên cả 2 bản sao lưu được hiển thị rõ ràng trên đầu kết quả.

