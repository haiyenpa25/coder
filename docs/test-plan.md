# Kế Hoạch & Ma Trận Kiểm Thử Tự Động (Automated Test Plan)

Tài liệu kiểm định chất lượng, bao phủ toàn bộ 63 bài kiểm thử tự động (Unit & Integration Tests) của hệ thống **X32 AI Sound Engineer**.

---

## 1. Mục Tiêu & Nguyên Tắc Kiểm Thử

1. **Nguyên Tắc Cô Lập Phần Cứng:**
   - 100% các bài test tự động chạy độc lập trên môi trường giả lập `MockX32Server` hoặc bộ dữ liệu tổng hợp deterministic.
   - Tuyệt đối không gửi gói tin đột biến tham số (write OSC) đến bàn trộn X32 thật trong quá trình kiểm thử CI/CD.
2. **Kiểm Tra Bất Biến An Toàn (Safety Invariant Gate):**
   - Mọi tình huống vi phạm quy tắc cách ly Talkback DL16 #11 đều phải bị phát hiện và ném lỗi `InvariantViolationError`.
   - Mọi đề xuất đột biến tham số chưa được phê duyệt đều phải bị từ chối với mã lỗi HTTP 400 / 403.
   - Khi kích hoạt nút khẩn cấp `STOP AUTO`, mọi thao tác ghi đều bị khóa cứng lập tức.

---

## 2. Bảng Phân Bổ 63 Bài Test Theo Module (Test Suite Matrix)

| Tập File Test | Số Bài Test | Phạm Vi Kiểm Tra | Trạng Thái |
| :--- | :---: | :--- | :---: |
| [tests/test_sprint1_osc.py](file:///c:/xampp/htdocs/ChurchMix/tests/test_sprint1_osc.py) | **8** | Mã hóa/giải mã nhị phân OSC (string, int, float, blob padding), Client kết nối UDP, State Mirror, Heartbeat loop, Snapshot SHA-256 integrity, Snapshot diffing delta. | **PASS** |
| [tests/test_sprint2_safety.py](file:///c:/xampp/htdocs/ChurchMix/tests/test_sprint2_safety.py) | **6** | Routing Graph Parser, Xác minh bất biến DL16 #11 $\rightarrow$ P16 only, Chặn các đường đi FOH/Matrix, Whitelist channel EQ, Chặn sửa Routing/P16, Rollback tự động khi readback sai lệch. | **PASS** |
| [tests/test_sprint3_dsp.py](file:///c:/xampp/htdocs/ChurchMix/tests/test_sprint3_dsp.py) | **5** | Tạo sóng âm (sine, pink noise, baritone vocal), Phân tích phổ Welch PSD, RTA 1/12-Octave (61 dải log), Bộ dò hú đa bằng chứng, Loại trừ nốt ca sĩ ngân dài có hài âm $2f..5f$. | **PASS** |
| [tests/test_sprint4_peq.py](file:///c:/xampp/htdocs/ChurchMix/tests/test_sprint4_peq.py) | **5** | Chuyển đổi hai chiều $Hz \leftrightarrow X32\ float$, $dB \leftrightarrow X32\ float$, $Q \leftrightarrow X32\ float$, Đề xuất PEQ bảo toàn giọng Mục sư, 7 vai trò nhạc cụ và giọng hát (Pastor, Nữ đơn ca, Nam đơn ca, Ca đoàn, Guitar, Piano, Bass), Mô phỏng đáp tuyến biquad A/B. | **PASS** |
| [tests/test_sprint5_api.py](file:///c:/xampp/htdocs/ChurchMix/tests/test_sprint5_api.py) | **10** | FastAPI Status & DL16 Invariant, Trạng thái 32 kênh, Khóa khẩn cấp STOP AUTO (HTTP 403), Trợ lý tiếng Việt Copilot Q&A, Đo âm học H1, Nhập CSV Open Sound Meter, Lịch sử Audit Log SQLite & Acoustic Sessions, Kích hoạt mô phỏng buổi lễ Sunday Simulation Endpoint, `/generate-role` và `/generate-notch`. | **PASS** |
| [tests/test_sprint6_acoustic_and_dynamics.py](file:///c:/xampp/htdocs/ChurchMix/tests/test_sprint6_acoustic_and_dynamics.py) | **5** | Đo hàm truyền hai kênh $H_1$, Căn độ trễ delay cross-correlation, Quy tắc **No-Boost-in-Nulls**, Parser file OSM / REW CSV & FRD, Bộ cân mức giọng nói VAD & Silence Hold (chống trôi fader). | **PASS** |
| [tests/test_sprint7_wizards.py](file:///c:/xampp/htdocs/ChurchMix/tests/test_sprint7_wizards.py) | **8** | Wizard 1 Báo cáo kiểm kê Markdown, Wizard 2 Line Check Chúa Nhật, Wizard 3 Hiệu chuẩn giọng hát, Wizard 5 Dò hú Rehearsal, Wizard 6 Trợ lý trực tiếp buổi lễ, Wizard 7 Báo cáo tổng kết, Hardware Switcher LAN IP ↔ Simulator, Tự động quét mạng dò tìm X32 UDP broadcast. | **PASS** |
| [tests/test_sprint8_audio_capture.py](file:///c:/xampp/htdocs/ChurchMix/tests/test_sprint8_audio_capture.py) | **5** | Liệt kê thiết bị sound card (WASAPI / ASIO / MME), Tự động nhận diện card X-USB / X-LIVE, Khởi tạo AudioStreamWorker, Bộ đệm vòng đa kênh, Đo mức âm lượng dBFS thời gian thực. | **PASS** |
| [tests/test_sprint9_scene_export.py](file:///c:/xampp/htdocs/ChurchMix/tests/test_sprint9_scene_export.py) | **2** | Trích xuất file Scene Behringer X32 (`.scn`), Khóa cứng kênh 11 `/ch/11/mix/lr OFF` và định tuyến Ultranet `/outputs/p16/11/src 11` trên file cắm USB. | **PASS** |
| [tests/test_sprint10_database_and_discovery.py](file:///c:/xampp/htdocs/ChurchMix/tests/test_sprint10_database_and_discovery.py) | **5** | SQLite Database persistence (Snapshot SHA-256, Audit Event bất biến với cryptographic hash, Phiên đo âm học H1), Tự động quét tìm bàn trộn X32 qua UDP OSC broadcast (`/info`), Wizard 6 Live Service Tactical Assistant. | **PASS** |
| [tests/test_sprint11_e2e_service.py](file:///c:/xampp/htdocs/ChurchMix/tests/test_sprint11_e2e_service.py) | **4** | Kịch bản mô phỏng toàn diện buổi lễ Chúa Nhật (End-to-End Sunday Service Lifecycle): Boot & Invariant verification, Line Check 32 kênh, Vocal Tuning & Harmonic Rejection, Live Tactical Monitoring & Silence Hold & USB Scene export. | **PASS** |
| [tests/test_sprint12_soundcheck_and_profile.py](file:///c:/xampp/htdocs/ChurchMix/tests/test_sprint12_soundcheck_and_profile.py) | **8** | Virtual Soundcheck Player Engine (4 phiên multitrack 32 kênh), Church Profile Manager (bảo lưu kênh 11 Talkback cách ly), Bộ tạo báo cáo in ấn Chủ Nhật (Printable Sunday Report HTML). | **PASS** |
| [tests/test_sprint13_chaos_and_resilience.py](file:///c:/xampp/htdocs/ChurchMix/tests/test_sprint13_chaos_and_resilience.py) | **6** | Chaos, Fault-Injection & Safety Gate Resilience: Chặn tiêm rò rỉ Talkback FOH, Chặn can thiệp trái phép path cấm, Chặn tấn công đa kênh chéo, Chặn bước nhảy fader quá nhanh, Chống xung đột revision lock SHA-256, Tự động Rollback khi readback sai khác. | **PASS** |
| [tests/test_sprint14_ai_copilot_rag.py](file:///c:/xampp/htdocs/ChurchMix/tests/test_sprint14_ai_copilot_rag.py) | **10** | Trợ lý âm học AI Copilot RAG: Khử dấu tiếng Việt tìm kiếm ngữ nghĩa, 7 bài viết tài liệu âm học nhà thờ, Tiêm ngữ cảnh thời gian thực (trạng thái STOP AUTO, Talkback Invariant, Rủi ro hú), Tích hợp REST API `/api/v1/copilot/ask`. | **PASS** |
| [tests/test_sprint15_hall_profiles.py](file:///c:/xampp/htdocs/ChurchMix/tests/test_sprint15_hall_profiles.py) | **6** | Quản lý Hồ sơ Âm học Hội trường Đa không gian (Multi-Sanctuary Profiles: Main Sanctuary, Youth Chapel, Fellowship Hall, Outdoor Campus), So sánh độ lệch Baseline, Cảnh báo triệt tiêu pha No-Boost-in-Nulls, REST API chuyển đổi và đối soát baseline. | **PASS** |
| [tests/test_sprint16_diagnostics_and_channel_map.py](file:///c:/xampp/htdocs/ChurchMix/tests/test_sprint16_diagnostics_and_channel_map.py) | **7** | Bộ Tự Chẩn Đoán Hệ Thống Tiền Lễ 10 Tiêu Chuẩn (`diagnose_system.py`), Quản Lý Sơ Đồ 32 Kênh Nhà Thờ (`church_profile`), Khóa Cứng Bất Biến Kênh 11, Tự Động Đồng Bộ Tên Kênh và REST API. | **PASS** |
| **TỔNG CỘNG PYTHON** | **100** | **Bao phủ 100% 16 Sprints, mọi bất biến an toàn, chẩn đoán tiền lễ và quy trình âm học** | **100% PASS** |
| **TỔNG CỘNG NODE** | **19** | **Kiểm thử công cụ CLI, hook JSON schema, template rules và environment** | **100% PASS** |
| **TOÀN BỘ HỆ THỐNG** | **119** | **119 / 119 Bài kiểm thử tự động hoàn tất thành công** | **100% PASS** |

---

## 3. Lệnh Chạy Toàn Bộ Test Suite

Để thực thi toàn bộ 100 bài kiểm thử Python:
```powershell
& "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe" -m unittest discover -s tests -p "test_*.py"
```

Để thực thi 19 bài kiểm thử Node.js:
```powershell
npm test
```
Thời gian thực thi trung bình: **~16.5 giây (Python) + ~1.8 giây (Node)**.

