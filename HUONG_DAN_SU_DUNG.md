# HƯỚNG DẪN SỬ DỤNG HAINGUYENCODER

> Công cụ chạy trên máy (local) giúp **tạo dự án mới** hoặc **gắn chuẩn vào dự án có sẵn**, kèm bộ quy tắc / skill / hook để AI trong **Antigravity IDE** code như một lập trình viên chuyên nghiệp. Có kèm cấu hình MCP trình duyệt (Chrome DevTools, Playwright) và file `run.bat` để chạy dự án **không cần XAMPP**.

---

## Mục lục

1. [Cần gì trước khi dùng](#1-cần-gì-trước-khi-dùng)
2. [Đóng gói và chép sang máy khác](#2-đóng-gói-và-chép-sang-máy-khác)
3. [Cài đặt lần đầu trên máy mới (setup.bat)](#3-cài-đặt-lần-đầu-trên-máy-mới-setupbat)
4. [Mở ứng dụng hằng ngày (start.bat)](#4-mở-ứng-dụng-hằng-ngày-startbat)
5. [Tạo dự án mới — từng bước](#5-tạo-dự-án-mới--từng-bước)
6. [Áp dụng vào dự án có sẵn](#6-áp-dụng-vào-dự-án-có-sẵn)
7. [Chạy dự án không cần XAMPP (run.bat)](#7-chạy-dự-án-không-cần-xampp-runbat)
8. [Làm việc với AI trong Antigravity](#8-làm-việc-với-ai-trong-antigravity)
9. [Quản lý dự án: sửa port, link, Doctor, đồng bộ template](#9-quản-lý-dự-án)
10. [Trang "Môi trường máy"](#10-trang-môi-trường-máy)
11. [Tùy biến chuẩn cho riêng bạn](#11-tùy-biến-chuẩn-cho-riêng-bạn)
12. [Thư viện community-skills](#12-thư-viện-community-skills)
13. [Xử lý sự cố thường gặp](#13-xử-lý-sự-cố-thường-gặp)
14. [Checklist thử nghiệm trên máy mới](#14-checklist-thử-nghiệm-trên-máy-mới)

---

## 1. Cần gì trước khi dùng

| Yêu cầu | Ghi chú |
|---|---|
| Windows 10 / 11 | Có sẵn **winget** (ứng dụng "App Installer" trong Microsoft Store). Mở PowerShell gõ `winget --version` để kiểm tra. |
| Internet | Chỉ cần ở lần cài đầu (tải Node.js, Git, PHP...). |
| Google Chrome | Nên có, để AI dùng **Chrome DevTools MCP**. Không có Chrome thì tự dùng Microsoft Edge. |
| Antigravity IDE | Đã cài và đăng nhập. |

**Không cần** cài trước Node.js — `setup.bat` sẽ tự cài.

---

## 2. Đóng gói và chép sang máy khác

### Cách 1 — Dùng `pack.bat` (khuyên dùng)

Double-click **`pack.bat`** trong thư mục `HAINGUYENCODER`. Kết quả là 1 file zip nằm **cạnh** thư mục, ví dụ:

```
D:\HAINGUYEN\HAINGUYENCODER-20261008-1145.zip
```

File zip **đã loại bỏ**:
- `data\` — danh sách dự án và cài đặt của máy hiện tại (đường dẫn máy này không đúng ở máy khác);
- các thư mục `.git` bên trong `community-skills`;
- file tạm `*.tmp`, `*.log`.

| Lựa chọn | Lệnh | Dung lượng |
|---|---|---|
| Đầy đủ | double-click `pack.bat` | lớn (có `antigravity-awesome-skills` ~26.000 file) |
| Gọn nhẹ | mở cmd tại thư mục, gõ `pack.bat -Lite` | ~8 MB |

> Bản **-Lite** chỉ bỏ kho tham khảo `antigravity-awesome-skills`. Mọi tính năng và 11 skill cộng đồng được cài vẫn đầy đủ.

### Cách 2 — Chép thủ công

Chép cả thư mục `HAINGUYENCODER`, **trừ** thư mục `data\`.

---

## 3. Cài đặt lần đầu trên máy mới (setup.bat)

1. Giải nén zip ra nơi bạn muốn, ví dụ `D:\HAINGUYEN\HAINGUYENCODER` (đường dẫn nào cũng được).
2. Double-click **`setup.bat`**.
3. Script hiển thị bảng trạng thái công cụ:

   ```
   ==> Trạng thái công cụ trên máy này
     [OK] Node.js LTS: v22.x
     [!]  Git: CHƯA CÀI (bắt buộc)
     [!]  PHP 8.3: CHƯA CÀI
     ...
   ```

4. **Node.js và Git được cài tự động** (bắt buộc). Với các công cụ còn lại, script hỏi từng cái — gõ `y` để cài, Enter để bỏ qua:

   | Công cụ | Khi nào nên cài |
   |---|---|
   | PHP 8.3 | Làm PHP thuần / Laravel. *Nếu máy có XAMPP, script dùng luôn PHP của XAMPP, không cần cài thêm.* |
   | Composer | Làm Laravel / dự án PHP có thư viện. |
   | Python 3 | Làm FastAPI / Django. |
   | Google clasp | Làm Google Apps Script. |
   | XAMPP | Chỉ khi bạn vẫn muốn Apache + MySQL + phpMyAdmin (cần quyền Admin). |
   | Docker Desktop | Chỉ khi dùng môi trường Docker (cần Admin, WSL2, khởi động lại máy). |
   | Chrome DevTools MCP / Playwright MCP | **Nên cài** — AI mở trình duyệt nhanh hơn và chạy được khi offline. |

5. Script hỏi đặt **ExecutionPolicy = RemoteSigned** → gõ `y` (để lệnh `npm` chạy được trong PowerShell).
6. Script tự động làm thêm 2 việc cho Antigravity:
   - **Ghi MCP** vào `%USERPROFILE%\.gemini\config\mcp_config.json` (Chrome DevTools + Playwright). Các MCP server bạn đã có từ trước **được giữ nguyên**; nếu file cũ bị hỏng thì được sao lưu thành `mcp_config.json.bak-<ngày giờ>`.
   - **Cài 11 skill cộng đồng** vào `%USERPROFILE%\.gemini\config\skills\` (xem [mục 12](#12-thư-viện-community-skills)). Skill trùng tên đã có sẵn sẽ **không bị ghi đè**.
7. Cuối cùng ứng dụng tự mở trong trình duyệt.

> ⚠️ **Sau khi setup xong: đóng hẳn và mở lại Antigravity IDE** (và mọi cửa sổ terminal) để nhận PATH mới và nạp MCP.

**Kiểm tra MCP đã nạp:** trong Antigravity → menu **… (Additional Options) → MCP Servers** → thấy `chrome-devtools` và `playwright`.

---

## 4. Mở ứng dụng hằng ngày (start.bat)

- Double-click **`start.bat`** → trình duyệt tự mở `http://127.0.0.1:4590`.
- Giữ cửa sổ đen (console) mở trong lúc dùng; **đóng cửa sổ đó = tắt ứng dụng**.
- Ứng dụng chỉ nghe ở `127.0.0.1` (máy khác trong mạng không truy cập được).

Menu bên trái:

| Mục | Dùng để |
|---|---|
| **Dự án của bạn** | Danh sách dự án, tìm kiếm, sửa, Doctor, mở thư mục |
| **Tạo dự án mới** | Tạo mới hoặc áp dụng vào thư mục có sẵn |
| **Môi trường máy** | Xem / cài công cụ còn thiếu |
| **Thư viện template** | Xem các rule, skill, hook gốc |
| **Cài đặt** | Thư mục gốc dự án, XAMPP, ngôn ngữ AI trả lời, profile mặc định |

> **Việc nên làm ngay lần đầu:** vào **Cài đặt** → kiểm tra **"Thư mục gốc mặc định cho dự án mới"**. Máy có ổ D: thì mặc định là `D:\HAINGUYEN\PROJECTS`; máy không có ổ D: thì là `C:\Users\<tên>\Projects`. Bấm **Lưu cài đặt**.

---

## 5. Tạo dự án mới — từng bước

Vào **Tạo dự án mới** → chọn tab **Dự án mới**.

### Bước 1 — Thông tin
- **Tên dự án** (bắt buộc): gõ tiếng Việt thoải mái, VD `Quản lý đội nhóm`. Thư mục sẽ tự đặt là `quan-ly-doi-nhom`.
- **Thư mục gốc chứa dự án**: mặc định lấy từ Cài đặt.
- **Link Google Trang tính**, **GitHub**: không bắt buộc, có thể cập nhật sau. Các link này được ghi vào `PROJECT_CONTEXT.md` để AI biết.

### Bước 2 — Ngôn ngữ / Stack
Tick một hoặc nhiều: PHP thuần, Laravel, Node.js/React/Next.js, Python, HTML/CSS/JS tĩnh, Google Apps Script. Stack quyết định rule nào được sinh (VD tick Laravel → có rule PHP + Laravel + Frontend).

### Bước 3 — Môi trường & Port

| Môi trường | Chọn khi | File được sinh thêm |
|---|---|---|
| **Không (chạy trực tiếp)** | ✅ Khuyên dùng — chạy bằng `run.bat`, không cần XAMPP | `run.bat` (+ `router.php` nếu PHP thuần) |
| XAMPP | Muốn chạy qua Apache của XAMPP | `xampp/vhost.conf` + `run.bat` |
| Docker | Muốn môi trường container hóa đầy đủ (có MySQL + phpMyAdmin riêng) | `docker-compose.yml`, `docker/…` + `run.bat` |

- Bấm **↻ Gợi ý port trống**: app quét port đang dùng trên máy **và** port của các dự án đã đăng ký → không bao giờ trùng.
- Tick **Cần database** nếu dự án dùng MySQL (xem lưu ý database ở [mục 7.4](#74-database)).

### Bước 4 — Mức cấu hình AI

| Profile | Nội dung | Dùng cho |
|---|---|---|
| Minimal | 2 skill, không hook | Script nhỏ, thử nghiệm |
| **Balanced** (khuyên dùng) | 11 skill, hook format + cổng kiểm chứng, agent reviewer, rule kiến trúc / bảo mật / test | Hầu hết dự án |
| Strict | Như Balanced + bắt buộc viết plan, review độc lập, lưu bằng chứng kiểm chứng | Hệ thống quan trọng, nhiều người dùng |

### Xem trước → Tạo dự án
- **Xem trước** liệt kê từng file với trạng thái: *mới* / *giống hệt* / *xung đột* / *giữ nguyên*. Cảnh báo nếu máy thiếu công cụ.
- **Tạo dự án** → file được ghi ra đĩa. App **không bao giờ ghi đè** file khác nội dung, trừ khi bạn tick chọn ghi đè.

### Dự án sau khi tạo trông như thế nào

```text
quan-ly-doi-nhom/
├── AGENTS.md            ← quy tắc làm việc cho AI (luôn bật)
├── DESIGN.md            ← hệ thống thiết kế: màu, font, khoảng cách (chuẩn Google Labs)
├── PROJECT_CONTEXT.md   ← stack, port, link Sheet/GitHub, cách chạy + GHI CHÚ CỦA BẠN
├── run.bat              ← double-click để chạy dự án
├── router.php           ← (PHP thuần) router cho PHP built-in server
├── .env / .env.example  ← cấu hình (APP_PORT, DB_...). .env KHÔNG commit
├── .agents/
│   ├── rules/           ← rule theo stack: php, laravel, frontend, testing, security...
│   ├── skills/          ← 11 skill: brainstorming, TDD, browser-verification, debug...
│   ├── agents/          ← reviewer (+ test-engineer ở Strict)
│   ├── hooks.json       ← tự format sau khi sửa + cổng kiểm chứng trước khi AI báo xong
│   └── hooks/*.mjs
├── .ai/                 ← plans / reviews / verification / decisions + verify.json
└── scripts/verify.mjs   ← chạy toàn bộ lệnh kiểm chứng
```

---

## 6. Áp dụng vào dự án có sẵn

Dùng khi bạn đã có code (kể cả code tải từ GitHub về).

1. **Tạo dự án mới** → tab **Áp dụng vào thư mục có sẵn**.
2. Dán **Đường dẫn thư mục có sẵn**, VD `D:\HAINGUYEN\PROJECTS\web-cu`.
3. Tick **Tự detect**: app đọc `composer.json`, `package.json`, `requirements.txt`, `artisan`, `appsscript.json`... để tự chọn stack **và** tìm lệnh lint/test/build có thật trong dự án → điền vào `.ai/verify.json`.
4. Chọn môi trường, port, profile → **Xem trước**.
5. Các file đã có (VD bạn đã có `AGENTS.md` riêng) sẽ hiện **xung đột** — chỉ tick ghi đè file nào bạn chắc chắn muốn thay.
6. **Tạo dự án**.

> **Laravel / Next.js / framework mới tinh:** tạo khung framework **trước** (VD `composer create-project laravel/laravel ten-du-an` hoặc `npx create-next-app ten-du-an`), **sau đó** dùng chế độ "Áp dụng vào thư mục có sẵn". Làm ngược lại thì `composer create-project` sẽ báo thư mục không trống.

---

## 7. Chạy dự án không cần XAMPP (run.bat)

### 7.1 Cách dùng
Mở thư mục dự án → double-click **`run.bat`**:
1. Đọc port từ `.env` (`APP_PORT=...`);
2. Tìm công cụ cần thiết (PHP trong PATH, hoặc trong `C:\xampp\php`, `D:\xampp\php`, `E:\xampp\php`);
3. Khởi động server; khoảng 3 giây sau trình duyệt tự mở `http://127.0.0.1:<port>`;
4. **Đóng cửa sổ đen = tắt server.**

### 7.2 Mỗi stack chạy bằng gì

| Stack | run.bat chạy | Cần có trước |
|---|---|---|
| PHP thuần | `php -S 127.0.0.1:PORT router.php` | PHP (hoặc XAMPP) |
| Laravel | `php artisan serve --port=PORT` | Mã nguồn Laravel + `composer install` |
| Node / React / Next | `npm install` (lần đầu) → `npm run dev -- --port PORT` | `package.json` |
| Python | `manage.py runserver` (Django) hoặc `uvicorn app.main:app` (FastAPI); tự dùng `.venv` nếu có | Python + thư viện |
| HTML tĩnh | `npx serve` | Node.js (lần đầu cần Internet) |

Nếu thiếu thứ gì, `run.bat` hiện `[LOI] ...` kèm cách khắc phục và **dừng lại chờ bạn đọc**.

### 7.3 router.php làm gì (PHP thuần)
- File có thật (`style.css`, `img/logo.png`, `admin/login.php`) → phục vụ trực tiếp.
- Đường dẫn không có file (`/users/42`) → chuyển vào `index.php` (kiểu front controller).
- **Chặn** truy cập `.env`, `.git`, `.agents`, `.ai`, `vendor`, `node_modules`, `scripts` → trả 404.
- Chưa có `index.php` → hiện trang chào để biết server đã chạy.

### 7.4 Database
`run.bat` chỉ thay thế **Apache**. Nếu dự án dùng **MySQL**, bạn vẫn cần một MySQL đang chạy:

| Cách | Làm thế nào |
|---|---|
| MySQL của XAMPP | Mở XAMPP Control Panel → chỉ bấm **Start ở dòng MySQL** (không cần Apache). `.env` đã trỏ sẵn `127.0.0.1:3306`, user `root`. |
| Docker | Chọn môi trường Docker khi tạo dự án → có MySQL + phpMyAdmin riêng, port riêng. |
| SQLite (tự cấu hình) | Không cần server DB, dữ liệu là 1 file trong dự án. Laravel: đặt `DB_CONNECTION=sqlite` trong `.env`. PHP thuần: dùng `new PDO('sqlite:' . __DIR__ . '/database.sqlite')`. Cần bật extension `pdo_sqlite` trong `php.ini` nếu PHP báo thiếu driver. |

### 7.5 Đổi port
Sửa port trong app (mục 9) **hoặc** sửa trực tiếp `APP_PORT` trong `.env` → lần chạy `run.bat` tiếp theo tự dùng port mới, không cần tạo lại file.

---

## 8. Làm việc với AI trong Antigravity

### 8.1 Mở đúng thư mục
Trong Antigravity: **File → Open Folder** → chọn **thư mục gốc của dự án** (nơi có `AGENTS.md`). AI tự nạp `AGENTS.md`, `.agents/rules`, `.agents/skills`, hooks.

### 8.2 AI sẽ tự làm gì
| Thành phần | Tác dụng |
|---|---|
| `AGENTS.md` | Quy trình **Hỏi rõ → Test → Code → Review → Kiểm chứng**; đặt tên, OOP, bảo mật, git an toàn, chỉ dùng port trong PROJECT_CONTEXT |
| `DESIGN.md` + rule frontend | Khi sửa HTML/CSS/React/Vue, AI đọc DESIGN.md để dùng đúng màu/font/khoảng cách; tránh giao diện "AI slop" |
| Rule testing | Bảng "chống viện cớ": không được bỏ test với lý do "đơn giản quá", "test sau"... Sửa bug phải có test tái hiện trước |
| Skill | Được gọi khi phù hợp: `brainstorming`, `test-driven-development`, `browser-verification`, `root-cause-debugging`, `code-review`, `security-audit`... |
| Hook PostToolUse | Tự format file vừa sửa (nếu dự án có formatter) |
| Hook Stop | Trước khi AI báo "xong", chạy các lệnh trong `.ai/verify.json`; lỗi thì bắt AI sửa tiếp (tối đa 2 lần để tránh lặp vô hạn) |

### 8.3 ⚠️ Bật lệnh kiểm chứng (quan trọng)
Dự án mới chưa có lint/test nên mọi lệnh trong `.ai/verify.json` đang `"enabled": false` (Doctor sẽ báo *"Chưa bật lệnh kiểm chứng nào"*). Khi dự án đã có test, mở `.ai/verify.json` và đổi thành `true`:

```json
{ "id": "test", "kind": "test", "command": "php artisan test", "required": true, "enabled": true }
```

Chạy thử bằng tay: `node scripts/verify.mjs`.

### 8.4 Câu lệnh mẫu nên dùng với AI
- *"Đọc PROJECT_CONTEXT.md và DESIGN.md, sau đó đề xuất cấu trúc thư mục cho chức năng quản lý thành viên. Hỏi tôi nếu chưa rõ."*
- *"Dùng skill brainstorming: tôi muốn thêm chức năng điểm danh."*
- *"Sửa lỗi đăng nhập báo sai mật khẩu. Viết test tái hiện lỗi trước rồi mới sửa."*
- *"Chạy run.bat rồi dùng Chrome DevTools MCP mở http://127.0.0.1:8100, kiểm tra console và network có lỗi không."*
- *"Review lại các thay đổi hôm nay theo skill code-review."*

Có thể dùng thêm lệnh có sẵn của Antigravity: `/plan` (lập kế hoạch việc phức tạp), `/grill-me` (AI phỏng vấn ngược bạn để chốt yêu cầu).

### 8.5 Ghi chú riêng cho AI
Viết ghi chú nghiệp vụ vào `PROJECT_CONTEXT.md`, **bên ngoài** khối `<!-- HNC:BEGIN --> ... <!-- HNC:END -->`. Phần ngoài khối này không bao giờ bị app ghi đè.

---

## 9. Quản lý dự án

Vào **Dự án của bạn**, mỗi thẻ dự án có các thao tác:

| Thao tác | Tác dụng |
|---|---|
| Sửa | Đổi tên, link Sheet/GitHub, port → tự cập nhật `PROJECT_CONTEXT.md`, `.env`, `.env.example`, vhost XAMPP |
| Doctor | Kiểm tra: rule/skill hợp lệ, hooks.json đúng chuẩn, `.env` đã vào `.gitignore`, port có trùng không, máy đã đủ công cụ chưa |
| Đồng bộ template | Khi bạn cập nhật template trong HAINGUYENCODER → áp vào dự án cũ (có xem trước, file bị sửa tay hiện "xung đột") |
| Cài vhost XAMPP | Chỉ với dự án môi trường XAMPP; luôn sao lưu `httpd-vhosts.conf` trước |
| Mở thư mục | Mở Explorer tại dự án |
| Gỡ | Chỉ xóa khỏi danh sách, **không xóa file** |

---

## 10. Trang "Môi trường máy"

- Hiện từng công cụ: đã cài / chưa, phiên bản, **dự án nào đang cần**.
- Tick công cụ thiếu → **Cài mục đã chọn** → mở cửa sổ PowerShell để bạn theo dõi (có thể hiện hộp thoại quyền Admin).
- Cài xong bấm **↻ Kiểm tra lại** (không cần khởi động lại app).

---

## 11. Tùy biến chuẩn cho riêng bạn

Mọi chuẩn nằm trong `HAINGUYENCODER\templates\`. Sửa ở đây → **dự án tạo sau** dùng chuẩn mới; dự án cũ dùng **Đồng bộ template**.

| Muốn thay đổi | Sửa file |
|---|---|
| Thói quen cá nhân (luôn bật mọi dự án) | `templates/personal/personal.md` |
| Quy tắc chung cho AI | `templates/core/AGENTS.md` |
| Màu, font, khoảng cách mặc định | `templates/core/DESIGN.md.template` |
| Rule theo ngôn ngữ | `templates/rules/*.md` |
| Skill | `templates/skills/<tên>/SKILL.md` (tên thư mục = `name:` trong frontmatter) |
| Danh sách skill cộng đồng cài toàn cục | `setup/global-skills.json` |
| Danh sách công cụ cài đặt | `setup/tools.json` |

Sau khi sửa template nên chạy kiểm tra: `node --test "tests/**/*.test.js"` (cần pass hết).

---

## 12. Thư viện community-skills

Thư mục `community-skills\` chứa bản sao (offline) của các kho skill nổi tiếng, đều giấy phép MIT/Apache:

| Thư mục | Nguồn | Nội dung |
|---|---|---|
| `agent-skills` | addyosmani/agent-skills | 25 skill chuẩn kỹ sư Google, bảng chống viện cớ |
| `mattpocock-skills` | mattpocock/skills | to-spec, to-tickets, tdd, diagnosing-bugs... |
| `taste-skill` | Leonxlnx/taste-skill | Gu thẩm mỹ UI cho landing page / portfolio |
| `superpowers` | obra/superpowers | Phương pháp brainstorm → plan → TDD |
| `design.md` | google-labs-code/design.md | Chuẩn DESIGN.md + công cụ lint |
| `antigravity-kit` | vudovn/antigravity-kit | Bộ kit Antigravity (tác giả Việt Nam) |
| `antigravity-awesome-skills` | sickn33 | Kho tham khảo rất lớn (~26.000 file) |

**`setup.bat` chỉ cài 11 skill chọn lọc** (liệt kê trong `setup/global-skills.json`) vào `%USERPROFILE%\.gemini\config\skills\` — dùng được ở mọi dự án:

`interview-me`, `spec-driven-development`, `planning-and-task-breakdown`, `debugging-and-error-recovery`, `code-simplification`, `security-and-hardening`, `performance-optimization`, `browser-testing-with-devtools`, `frontend-ui-engineering`, `design-taste-frontend`, `redesign-existing-projects`.

> Vì sao không cài hết? Mỗi skill toàn cục làm dài thêm ngữ cảnh của **mọi** cuộc trò chuyện. Chọn lọc giúp AI chọn đúng skill và trả lời nhanh hơn.

**Thêm skill khác:** thêm một dòng vào `setup/global-skills.json` rồi chạy lại `setup.bat`; hoặc chép thủ công thư mục skill (có `SKILL.md`) vào `%USERPROFILE%\.gemini\config\skills\` (toàn cục) hoặc `<dự án>\.agents\skills\` (chỉ dự án đó).

**Cập nhật kho từ GitHub (tùy chọn):** trên máy gốc còn thư mục `.git`, mở terminal tại `community-skills\<kho>` và chạy `git pull`.

---

## 13. Xử lý sự cố thường gặp

| Hiện tượng | Nguyên nhân / Cách xử lý |
|---|---|
| `setup.bat` báo *"Không tìm thấy winget"* | Cài **App Installer** từ Microsoft Store rồi chạy lại. |
| Cài xong vẫn báo thiếu Node/PHP | Đóng hết cửa sổ terminal / Antigravity rồi mở lại (PATH mới chỉ có hiệu lực ở cửa sổ mới). Trường hợp cứng đầu: khởi động lại máy. |
| `npm : ... running scripts is disabled` | Chạy lại `setup.bat` và đồng ý đặt RemoteSigned, hoặc dùng `npm.cmd` thay cho `npm`. |
| `start.bat` báo *"Port 4590 đang bận"* | App đã chạy ở cửa sổ khác → cứ mở `http://127.0.0.1:4590`. Muốn chạy port khác: PowerShell `$env:PORT=4591; node server.js`. |
| Tạo dự án báo *"Ổ đĩa X:\ không có trên máy này"* | Vào **Cài đặt** → đổi "Thư mục gốc mặc định" sang ổ đang có. |
| `run.bat` báo *"Khong tim thay PHP"* | Trang **Môi trường máy** → cài PHP; hoặc cài XAMPP vào `C:\xampp` / `D:\xampp`. |
| `run.bat` mở trình duyệt nhưng trang lỗi | Server khởi động chậm (Node/Vite) → đợi vài giây rồi F5. Xem thông báo trong cửa sổ đen. |
| Laravel: `[LOI] Chua co ma nguon Laravel` | Xem mục [6](#6-áp-dụng-vào-dự-án-có-sẵn) — tạo Laravel trước, áp dụng HAINGUYENCODER sau. |
| Không thấy MCP trong Antigravity | Khởi động lại Antigravity. Kiểm tra `%USERPROFILE%\.gemini\config\mcp_config.json` có `chrome-devtools`, `playwright`. Chạy thử `chrome-devtools-mcp --version` trong terminal. |
| MCP trình duyệt không mở được | Cần Google Chrome (hoặc Edge). Cài Chrome rồi chạy lại `setup.bat` để ghi lại cấu hình. |
| AI không làm theo rule | Kiểm tra đã **Open Folder** đúng thư mục gốc dự án; chạy **Doctor** để xem rule/skill có hợp lệ không. |
| Hook Stop bắt AI sửa mãi | Lệnh trong `.ai/verify.json` đang lỗi thật → chạy `node scripts/verify.mjs` để xem lỗi; hook tự dừng sau 2 lần. |

---

## 14. Checklist thử nghiệm trên máy mới

Đánh dấu từng mục khi thử:

- [ ] Giải nén zip → chạy `setup.bat` → bảng công cụ hiện ra, Node + Git được cài.
- [ ] Cuối setup thấy dòng *"Đã ghi …mcp_config.json"* và danh sách 11 skill `[OK]`.
- [ ] Ứng dụng mở ở `http://127.0.0.1:4590`.
- [ ] **Cài đặt**: thư mục gốc mặc định đúng ổ đĩa của máy → Lưu.
- [ ] **Môi trường máy**: các công cụ bạn cần đều `OK`.
- [ ] Tạo dự án thử: tên `Thử nghiệm`, stack **PHP thuần**, môi trường **Không (chạy trực tiếp)**, bấm Gợi ý port, profile **Balanced** → Xem trước → Tạo.
- [ ] Bấm **Doctor** cho dự án đó → không có mục lỗi (đỏ).
- [ ] Mở thư mục dự án, tạo `index.php` với nội dung `<?php echo "Xin chao";` → double-click `run.bat` → trình duyệt hiện *Xin chao*.
- [ ] Thử mở `http://127.0.0.1:<port>/.env` → phải ra **Not found**.
- [ ] Khởi động lại Antigravity → **MCP Servers** có `chrome-devtools`, `playwright`.
- [ ] Open Folder dự án thử trong Antigravity → hỏi AI: *"Đọc PROJECT_CONTEXT.md và cho tôi biết dự án chạy ở port nào"* → AI trả lời đúng port.
- [ ] Hỏi AI: *"Dùng Chrome DevTools MCP mở trang dự án và kiểm tra console"* → AI mở được trình duyệt.

Nếu mục nào không đạt, chụp màn hình cửa sổ báo lỗi và gửi lại để xử lý.
