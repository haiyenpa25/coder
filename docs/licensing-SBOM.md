# BẢN QUYỀN MÃ NGUỒN VÀ BẢNG KÊ THÀNH PHẦN (SBOM)

## Bổ sung dashboard giám sát — 12/10/2026

`apps/web/monitoring.js`, `apps/web/monitoring.css` và `packages/monitoring/` được viết mới trong dự án. Biểu đồ dùng Canvas API có sẵn của trình duyệt; xử lý mức tín hiệu dùng NumPy đã có. Không thêm thư viện biểu đồ, CDN, mã sao chép hoặc tham chiếu bên thứ ba trong phần bổ sung này. Giữ nguyên các giấy phép và ghi công của thành phần hiện có bên dưới.

Hệ thống **X32 AI Sound Engineer** tôn trọng nghiêm ngặt bản quyền mã nguồn mở và quy định pháp lý của các thư viện tích hợp.

---

### 1. Bảng Kê Thành Phần Mã Mở (Open-Source SBOM)

| Thành phần / Repo | Vai trò trong hệ thống | Giấy phép | Tình trạng tích hợp |
|---|---|---|---|
| **pmaillot/X32-Behringer** | Tham khảo cú pháp giao thức OSC của X32/M32 | Tài liệu kỹ thuật | Tham chiếu giao thức; toàn bộ adapter được viết mới bằng Python type-safe |
| **wrodie/behringer-mixer** | Tham khảo mô hình điều khiển fader/mute/gain | MIT License | Tham chiếu kiến trúc; không copy code trực tiếp |
| **CristianMoresi/M32LiveConsoleTool** | Tham khảo nguyên lý Auto-Level và Anti-Clip | MIT License | Port thuật toán VAD & Silence Hold có kiểm thử nghiêm ngặt |
| **psmokotnin/osm (Open Sound Meter)** | Phần mềm đo âm học hội trường độc lập | GPL-3.0 | Tích hợp qua định dạng xuất file CSV/FRD chuẩn công nghiệp; không liên kết mã nguồn động |
| **HEnquist/camilladsp** | Mô phỏng bộ lọc IIR/FIR | Dual GPL-3.0 / MPL-2.0 | Công cụ nghiên cứu ngoại tuyến trong phòng thí nghiệm (Offline Lab) |
| **jaakkopasanen/AutoEq** | Tối ưu hóa bộ lọc đáp tuyến PEQ | MIT License | Tham khảo công thức toán học bộ lọc Biquad Peaking EQ |

---

### 2. Các Thư Viện Python Cốt Lõi
* **FastAPI (MIT):** Web framework hiện đại, hiệu năng cao với ASGI và OpenAPI schema.
* **Uvicorn (BSD-3-Clause):** Lightning-fast ASGI server.
* **NumPy (BSD-3-Clause):** Tính toán ma trận và đại số tuyến tính cho mảng âm thanh số.
* **SciPy (BSD-3-Clause):** Xử lý tín hiệu số (DSP), biến đổi Welch PSD và bộ lọc biquad.
* **SoundDevice (MIT):** Giao tiếp PortAudio thời gian thực với Windows WASAPI/ASIO.
* **python-osc (Public Domain / CC0):** Giải mã và đóng gói binary OSC UDP packets.
