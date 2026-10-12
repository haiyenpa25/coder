# HAINGUYENCODER

Web app chạy local để **tạo dự án mới (hoặc áp dụng vào dự án có sẵn)** kèm bộ cấu hình chuẩn cho Antigravity IDE:
`AGENTS.md`, rules theo stack, skills, hooks kiểm chứng, `PROJECT_CONTEXT.md`, cấp port không trùng, file môi trường XAMPP/Docker.

## Chạy

- Double-click `start.bat`, **hoặc**
- `node server.js` rồi mở <http://127.0.0.1:4590>

Không cần `npm install` (không có dependency). Cần Node.js ≥ 20.
Test: `node --test "tests/**/*.test.js"`

> 📖 **Xem hướng dẫn chi tiết từng bước:** [HUONG_DAN_SU_DUNG.md](HUONG_DAN_SU_DUNG.md)

## Chép sang máy khác

1. **Đóng gói bằng `pack.bat`**:
   - Double-click **`pack.bat`** (hoặc chạy `pack.bat -Lite` để có file zip gọn nhẹ ~8 MB).
   - Script tự động loại bỏ `data/` (danh sách dự án riêng máy cũ), `.git` trong thư viện và các file tạm.
   - Kết quả là 1 file zip nằm cạnh thư mục app, sẵn sàng copy sang máy mới / USB.
2. **Cài đặt trên máy mới (Double-click `setup.bat`)** — không cần Node.js có sẵn. Script sẽ:
   - kiểm tra từng công cụ trong [`setup/tools.json`](setup/tools.json);
   - tìm bản đã cài nhưng chưa có trong PATH (VD `D:\xampp\php`) và **chỉ thêm PATH**;
   - cài **Node.js + Git** (bắt buộc) qua `winget`, hỏi từng công cụ còn lại: PHP, Composer, Python, clasp, XAMPP, Docker;
   - tự động cấu hình **Chrome DevTools MCP** và **Playwright MCP** vào `%USERPROFILE%\.gemini\config\mcp_config.json` cho Antigravity IDE (bảo tồn server cũ của bạn, sao lưu nếu hỏng);
   - tự động cài **11 skill cộng đồng chọn lọc** (từ [`setup/global-skills.json`](setup/global-skills.json)) vào `%USERPROFILE%\.gemini\config\skills\` (không ghi đè skill đã có);
   - Composer tải từ getcomposer.org và **kiểm tra SHA-256**;
   - ghi PATH vào biến môi trường **User** (không dùng `setx`, không bị cắt 1024 ký tự);
   - đề nghị đặt ExecutionPolicy `RemoteSigned` (CurrentUser) để lệnh `npm` chạy được trong PowerShell;
   - mở app tại `http://127.0.0.1:4590`.
3. Trong app, trang **Môi trường máy** hiển thị công cụ còn thiếu (kèm dự án nào cần, MCP servers) và cài thêm bằng một cú bấm. Doctor và màn Xem trước cũng cảnh báo khi máy thiếu công cụ cho dự án.

Chạy script thủ công:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File setup\install-tools.ps1 -CheckOnly
powershell -NoProfile -ExecutionPolicy Bypass -File setup\install-tools.ps1 -Tools php,composer
```

Yêu cầu: Windows 10/11 có `winget` (App Installer). Sau khi cài, mở lại terminal / Antigravity IDE để nhận PATH mới.

## Cấu trúc

```text
HAINGUYENCODER/
├── start.bat              # Khởi động app & mở trình duyệt (127.0.0.1:4590)
├── setup.bat              # Cài đặt môi trường, MCP & 11 skill cho máy mới
├── pack.bat / pack.ps1    # Đóng gói zip để chép máy (có tùy chọn -Lite)
├── server.js              # HTTP server (chỉ 127.0.0.1, zero-dependency)
├── HUONG_DAN_SU_DUNG.md   # Hướng dẫn chi tiết đầy đủ 14 mục
├── src/
│   ├── catalog.js         # stack, profile, dải port — sửa ở đây để thêm stack
│   ├── projectGenerator.js# validate → file set → preview → ghi (không ghi đè im lặng)
│   ├── projectService.js  # điều phối nghiệp vụ
│   ├── portAllocator.js   # netstat + registry + thử bind
│   ├── stackDetector.js   # detect stack & lệnh verify có thật
│   ├── projectContext.js  # PROJECT_CONTEXT.md (khối HNC được quản lý)
│   ├── envFiles.js        # run.bat, router.php, docker-compose, Dockerfile, .env, vhost XAMPP
│   ├── xampp.js           # cài vhost vào httpd-vhosts.conf (có backup)
│   ├── doctor.js          # kiểm tra cấu hình dự án
│   └── storage.js         # data/settings.json, data/projects.json
├── templates/             # KHO GỐC — sửa ở đây để đổi chuẩn cho dự án tạo sau
│   ├── core/              # AGENTS.md, DESIGN.md.template, .ai/*
│   ├── personal/          # personal.md — thói quen cá nhân, luôn bật
│   ├── rules/             # architecture, security, testing, php, laravel, typescript, frontend, python, apps-script, docker, database-migrations
│   ├── skills/            # 11 core skills (bao gồm brainstorming, TDD, browser-verification)
│   ├── agents/            # reviewer, test-engineer (thử nghiệm)
│   ├── hooks/             # hooks.json + wrapper .mjs
│   └── scripts/verify.mjs
├── community-skills/      # Thư viện offline: agent-skills, taste-skill, superpowers, design.md...
├── setup/
│   ├── install-tools.ps1  # Script cài winget, MCP & skill toàn cục
│   ├── tools.json         # Danh mục công cụ & lệnh cài
│   └── global-skills.json # 11 skill cộng đồng chọn lọc cài vào Antigravity
├── public/                # Giao diện web local
└── data/                  # Registry dự án + cài đặt (tự tạo lúc chạy, không commit/pack)
```

## Dự án được sinh ra

```text
<du-an>/
├── AGENTS.md                  # policy ngắn, luôn bật (Plan → Test → Implement → Review → Verify)
├── DESIGN.md                  # chuẩn Google Labs: Design Tokens, bảng màu WCAG AA, Typography
├── PROJECT_CONTEXT.md         # link Sheet/GitHub, stack, port, cách chạy + ghi chú của bạn
├── run.bat                    # Chạy dự án trực tiếp KHÔNG CẦN XAMPP (đọc port từ .env)
├── router.php                 # (chỉ PHP thuần) Router tích hợp, chặn file nhạy cảm (.env, .git...)
├── .agents/
│   ├── rules/                 # personal + rule theo stack (frontend đọc DESIGN.md)
│   ├── skills/                # 11 skills: brainstorming, TDD, browser-verification, debug...
│   ├── agents/                # reviewer (+ test-engineer ở strict)
│   ├── hooks.json             # PostToolUse format + Stop quality gate
│   └── hooks/*.mjs
├── .ai/                       # plans / reviews / verification / decisions + verify.json
├── scripts/verify.mjs         # chạy mọi lệnh trong .ai/verify.json
├── docker-compose.yml, docker/  (nếu Docker)
├── xampp/vhost.conf             (nếu XAMPP)
├── .env (secret, không commit), .env.example
└── .gitignore
```

## Nguyên tắc an toàn

- File đã tồn tại và khác template → **xung đột**, chỉ ghi đè khi bạn tick.
- `.env` và `.ai/verify.json` chỉ tạo khi chưa có.
- `PROJECT_CONTEXT.md`: chỉ khối `HNC:BEGIN…END` được cập nhật, phần ghi chú của bạn giữ nguyên.
- Cài vhost XAMPP luôn backup `httpd-vhosts.conf` trước.
- "Gỡ" dự án chỉ xóa khỏi danh sách, không xóa file.
- Stop hook tối đa ép agent chạy tiếp 2 lần / hội thoại để tránh vòng lặp vô hạn.

## Lưu ý

- Thư mục `.agents/agents/` (subagent) không có trong tài liệu customization đi kèm IDE — coi là thử nghiệm.
- PostToolUse hook chỉ format được khi payload có đường dẫn file; nếu IDE không gửi, hook bỏ qua (không lỗi).
