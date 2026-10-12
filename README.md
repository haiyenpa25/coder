# ChurchMix — X32 AI Sound Engineer

> **Hệ Thống Trợ Lý Kỹ Thuật Âm Thanh Nhà Thờ Thông Minh & An Toàn**  
> Dành cho mixer **Behringer X32 Compact / Midas M32**, stagebox **Midas DL16** và hệ thống monitor cá nhân **Ultranet P16**.

[![Safety Verified](https://img.shields.io/badge/Safety-Invariant%20Guaranteed-success.svg)](#nguyên-tắc-bất-biến-sống-còn-hard-invariants)
[![Tests Passing](https://img.shields.io/badge/Tests-178%2F178%20Passing-brightgreen.svg)](#kiểm-thử-tự-động)
[![OSC Read-Only First](https://img.shields.io/badge/Mode-READ__ONLY__MODE%20First-blue.svg)](#chế-độ-vận-hành)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%2F11%20%7C%20Linux-lightgrey.svg)](#yêu-cầu-môi-trường)

---

## 1. Giới Thiệu & Mục Tiêu

**ChurchMix (X32 AI Sound Engineer)** được thiết kế chuyên biệt cho môi trường thờ phượng tại nhà thờ, giải quyết bài toán thiếu hụt nhân sự âm thanh chuyên nghiệp nhưng vẫn đảm bảo:
* Giọng nói Mục sư rõ lời, tròn vành, không om bí, không mỏng gắt.
* Ban nhạc và ca đoàn hòa quyện, âm trường sân khấu sống động.
* **Giảm tối đa nguy cơ hú rít** trong thánh lễ (không hệ thống nào loại trừ được hoàn toàn: vị trí micro, hướng loa và gain đúng vẫn là tuyến phòng thủ đầu tiên).
* **An toàn trước hết:** Trợ lý AI chỉ đưa ra đề xuất âm học và giải thích bằng tiếng Việt; chỉ thực thi lệnh ghi sau khi kỹ thuật viên xác nhận.

---

## 2. Sơ Đồ Đấu Nối Thực Tế

```text
[Sân khấu] Midas DL16 (AES50 A) ──────────┐
                                          │
[Monitor] DL16 Ultranet ──> P16-D ──> 3x P16-HQ In-Ear
                                          │
[FOH Console] Behringer X32 Compact ──────┤
   │                                      │
   ├── [Cáp LAN / UDP 10023] ─────────────┼──> [Máy tính điều khiển Laptop/PC]
   └── [Cáp USB / X-USB Audio 32-ch] ─────┘    (Chạy ChurchMix Server & UI)
```

---

## 3. Các Bất Biến Sống Còn (Hard Invariants)

1. **Bất Biến Cổng DL16 #11 (Band Talkback):**
   * Tín hiệu từ cổng này **CHỈ ĐƯỢC PHÉP** đi vào hệ thống Ultranet P16 của ban nhạc.
   * **TUYỆT ĐỐI CẤM** định tuyến ra loa FOH (Main LR, Mono/Center, hay Matrix). Bất kỳ giao dịch nào vi phạm sẽ bị hủy bỏ ngay lập tức với lỗi `InvariantViolationError`.
   * Hệ thống kiểm tra **mọi** đường ra FOH: Main LR, Mono/Center, Bus → Main/Mono và Bus → Matrix. Một send đang bật được tính là đường rò rỉ dù level đang ở −∞.
   * Kênh X32 nhận DL16 #11 **được cấu hình**, không mặc định bằng số cổng: `configs/safety-defaults.yaml` → `talkback_protection.x32_channel`. Nếu tên kênh trên mixer cho thấy patch đã đổi (một kênh khác tên "Talkback"), mọi lệnh ghi bị khóa cho tới khi cập nhật cấu hình.
   * Snapshot thiếu bất kỳ tham số routing nào → khóa ghi (fail-closed).
2. **Khởi Động Read-Only (Mặc định chỉ đọc):**
   * Mọi kết nối đến phần cứng luôn khởi đầu ở trạng thái `READ_ONLY_MODE = True`.
3. **Nút Khẩn Cấp STOP AUTO:**
   * Luôn ghim trên thanh tiêu đề và phím tắt; phản hồi dưới 50ms để khóa cứng toàn bộ luồng ghi tham số khi có sự cố.
4. **Silence Hold (Chống trôi Fader):**
   * Tuyệt đối không tự động đẩy fader lên khi micro im lặng hoặc người nói tạm ngừng để tránh kéo ồn nền hội trường.
5. **No-Boost-in-Nulls:**
   * Không bao giờ tăng dải EQ vào các điểm triệt tiêu pha âm học phòng ($Coherence < 0.65$ & $Magnitude < -6\text{ dB}$).
6. **Chống Hú Đa Bằng Chứng:**
   * Phân tích dãy hài âm tự nhiên ($2f, 3f, 4f$) để loại trừ nốt ca sĩ ngân dài hoặc tiếng đàn organ, chỉ can thiệp notch hẹp ($Q \ge 6.0$, độ sâu giới hạn $-3\text{dB}$ đến $-4.5\text{dB}$) vào đúng tần số cộng hưởng hú thật.

---

## 4. Khởi Động Nhanh (Quick Start)

### 4.1 Khởi động bằng 1 cú nhấp chuột (Windows)
Double-click vào tệp:
```text
start_church_engineer.bat
```
Ứng dụng sẽ tự khởi chạy máy chủ backend và mở giao diện tại địa chỉ:
👉 **`http://127.0.0.1:8080`**

> **Bảo vệ API:** chỉ chính giao diện ChurchMix (cùng origin) hoặc `localhost` mới được gửi lệnh thay đổi mixer; trang web lạ mở trên cùng máy sẽ bị chặn (HTTP 403). Nếu dùng máy tính bảng trong mạng LAN nhà thờ với origin khác, khai báo: `$env:CHURCHMIX_ALLOWED_ORIGINS = "http://192.168.1.50:8080"`.

### 4.2 Khởi động thủ công qua PowerShell
```powershell
# 1. Cài đặt thư viện phụ thuộc
pip install -r requirements.txt

# 2. Khởi động Web & API Server
python -m uvicorn apps.api.main:app --host 127.0.0.1 --port 8080
```

---

## 5. Quy Trình Chuẩn 7 Bước (SOP Wizards)

Hệ thống tích hợp sẵn 7 Wizards chuẩn hóa toàn diện quy trình âm thanh nhà thờ:

| Wizard | Tên Quy Trình | Mục Đích Sử Dụng |
| :---: | :--- | :--- |
| **W1** | **Inventory & Safety Routing** | Quét kiểm kê 32 line và xác thực cách ly cổng DL16 #11. |
| **W2** | **Sunday Pre-Service Line Check** | Kiểm tra dây dẫn, pin micro không dây, gain cấu trúc trước giờ lễ. |
| **W3** | **Vocal & Speech Calibration** | Thu mẫu 20s giọng Mục sư/Ca trưởng, đề xuất 4-band PEQ và nghe thử A/B. |
| **W4** | **Room & PA Tuning (H1)** | Cân chỉnh đáp tuyến loa hội trường qua hàm truyền 2 kênh & căn delay. |
| **W5** | **Safe Feedback Ring-Out** | Dò tìm tần số hú an toàn trong buổi tập khi không có khán giả. |
| **W6** | **Live Service Tactical Assistant** | Giám sát trực tiếp buổi lễ: Headroom, VAD, Silence Hold, cảnh báo clipping. |
| **W7** | **Post-Service Debrief** | Tổng kết thống kê sự cố, mức âm lượng trung bình và xuất báo cáo Markdown. |

---

## 6. Xuất File Cắm USB Mặt Trước X32 (.scn)

Không cần máy tính trực tiếp trong giờ lễ, bạn có thể xuất toàn bộ cấu hình tối ưu thành file Scene chuẩn Behringer X32:
1. Nhấn nút **"Xuất File Scene USB (.scn) Cho X32"** trên dashboard.
2. Sao chép tệp `ChurchMix_FOH.scn` vào thư mục gốc của USB định dạng FAT32.
3. Cắm vào cổng USB trên mặt bàn trộn X32 và chọn **Scenes $\rightarrow$ Utility $\rightarrow$ Load Scene**.

---

## 7. Kiểm Thử Tự Động (Automated Testing)

Toàn bộ hệ thống được bảo vệ bởi **178 bài kiểm thử tự động** chạy độc lập trên bộ giả lập UDP `MockX32Server`:

```powershell
& "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe" -m unittest discover -s tests -p "test_*.py"
```

* Thời gian chạy: **~5.2 giây**.
* Kết quả: **178 / 178 tests PASSING**.
* Nếu đang chạy sẵn một ChurchMix khác (chiếm UDP 10023), đặt cổng mock riêng cho test: `$env:CHURCHMIX_X32_PORT = "10923"`.

---

## 8. Cấu Trúc Mã Nguồn

```text
ChurchMix/
├── apps/
│   ├── api/                    # FastAPI REST & WebSocket Telemetry Server
│   ├── capture_agent/          # Native Audio Capture qua SoundDevice (X-USB ASIO/WASAPI)
│   └── web/                    # Dashboard UI Canvas 60fps RTA, Strips & Wizards
├── packages/
│   ├── mock_x32/               # UDP Simulator giả lập X32 trên cổng 10023
│   ├── x32_osc_adapter/        # Binary OSC Codec, Snapshot SHA-256, UDP Discovery
│   ├── safety_controller/      # Whitelist, Routing Graph, Safety Transactions & Rollback
│   ├── signal_analysis/        # 1/12-Octave RTA, Welch PSD, Peak/RMS
│   ├── feedback_detector/      # Dò hú đa bằng chứng loại trừ hài âm ca sĩ (2f..5f)
│   ├── eq_optimizer/           # Đề xuất 4-Band PEQ chuẩn phần cứng X32
│   ├── acoustic_measurement/   # Đo hàm truyền H1, Coherence, Parser OSM CSV
│   ├── mix_assistant/          # Speech Leveler & Silence Hold chống trôi fader
│   ├── storage/                # SQLite DB (Snapshots, Audit Logs, Acoustic history)
│   └── wizards/                # Nghiệp vụ 7 quy trình chuẩn SOP (W1-W7)
├── configs/                    # Whitelist OSC, Phân quyền RBAC, Safety defaults
├── deploy/                     # Dockerfile, Docker Compose, Windows Service, Systemd
├── docs/                       # Toàn bộ 7 tài liệu kỹ thuật & quy chuẩn vận hành
└── tests/                      # Unit & Integration test suites (178 tests)
```

---

## 9. Giấy Phép & Đóng Góp

* Phát triển cho cộng đồng âm thanh nhà thờ phục vụ phụng vụ thánh.
* Chi tiết bản quyền và ghi công thư viện nguồn mở xem tại [docs/licensing-SBOM.md](docs/licensing-SBOM.md).

