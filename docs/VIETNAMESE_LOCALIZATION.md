# Bản Việt hóa LoopForge

Tài liệu này mô tả bản Việt hóa độc lập của **Tencent LoopForge**, cách cài đặt, build,
chuyển ngôn ngữ, kiểm thử và cách cập nhật từ upstream mà không làm mất bản dịch.

## 1. Phiên bản nền

| Mục | Giá trị |
|---|---|
| Repository gốc | <https://github.com/Tencent/LoopForge> |
| Tag upstream | `v0.4.2` |
| Commit upstream | `d2462fa583be8e25e9a74f4ee2b7a4f5d55ca9ae` (`fix(workspace): prevent embedded VS Code reload loops (#1256)`) |
| Nhánh Việt hóa | `feature/vi-VN-localization` |
| Ngôn ngữ mặc định | Tiếng Việt (`vi`) |
| Ngôn ngữ khác | English (`en`), 简体中文 (`zh`) |

Bản này chỉ bổ sung bản dịch và một directive ngôn ngữ cho AI Agent. Không viết lại
LoopForge, không đổi kiến trúc, không cắt giảm tính năng và không liên quan tới JARVIS
hay bất kỳ dự án nào khác trên máy.

## 2. Kiến trúc bản địa hóa

LoopForge render trực tiếp copy tiếng Trung trong HTML/JS và dịch tại runtime bằng một
từ điển `zh → en`. Bản Việt hóa mở rộng đúng lớp đó thành ba ngôn ngữ, không tạo hệ
thống dịch song song:

```
web/i18n-en.js   zh → en   (upstream + 395 khóa còn thiếu)
web/i18n-vi.js   zh → vi   (5.069 khóa)
web/i18n.js      chọn từ điển theo ngôn ngữ, dịch text node + attribute,
                 theo dõi DOM thay đổi, dịch cả SPA /chatbot/
web/boot.js      đọc localStorage, mặc định vi, đặt html lang=vi-VN
```

- Khóa từ điển là chính chuỗi tiếng Trung trong source, nên không phải sửa hàng nghìn
  file component.
- `i18n.js` vẫn giữ fallback chuẩn: khóa mới từ upstream chỉ hiển thị nguyên văn tiếng
  Trung, không làm crash giao diện.
- Ngôn ngữ được lưu ở `localStorage["loopforge.lang"]`, tồn tại qua refresh và restart.
- `html lang="vi-VN"` cho phép `Intl` định dạng ngày/giờ và số theo locale Việt Nam.

### Ngôn ngữ của AI Agent

Giao diện được dịch ở runtime, nhưng Claude Code / Codex / CodeBuddy không biết ngôn ngữ
giao diện. Gói `internal/agentlang` chèn một directive ngắn vào các prompt nền tảng vốn
đã dựng sẵn (workflow node, assistant, clarify, báo cáo hoàn thành, tiêu đề phiên):

- mặc định `vi`: phân tích, kế hoạch, báo cáo tiến độ, review, giải thích lỗi, yêu cầu
  phê duyệt và báo cáo hoàn thành bằng tiếng Việt;
- giữ nguyên source code, identifier, JSON key, lệnh CLI, đường dẫn và log terminal gốc;
- `AGENTFLOW_AGENT_LANGUAGE=zh` khôi phục hành vi upstream, `=en` trả lời tiếng Anh.

## 3. Cài đặt và khởi chạy

Yêu cầu: macOS/Linux, Docker (Compose v2). Build từ source cần Go 1.26.11 và Node 22.

```bash
git clone --recurse-submodules https://github.com/Tencent/LoopForge.git loop
cd loop
git checkout feature/vi-VN-localization
cp .env.example .env          # nếu chưa có; scripts/configure.sh tạo cấu hình
```

Khởi chạy bản Việt hóa (source build, không dùng image GHCR):

```bash
docker compose \
  -f compose.yaml -f compose.dev.yaml -f compose.vi.yaml \
  --profile platform up -d --build
```

`compose.vi.yaml` chỉ đổi tag image và `AGENTFLOW_ISOLATED_IMAGE` để không đụng vào
installation LoopForge khác trên cùng máy.

Truy cập: <http://127.0.0.1:8091> (cấu hình hiện tại; cổng lấy từ `.env`
`AGENTFLOW_HTTP_PORT`, MySQL từ `LOOPFORGE_MYSQL_PORT`).

Lần đầu chạy, tài khoản đăng ký đầu tiên trở thành quản trị viên nền tảng. Có thể tạo
tài khoản tại `/login.html` hoặc qua API:

```bash
curl -X POST http://127.0.0.1:8091/api/auth/register \
  -H 'Content-Type: application/json' -H 'Origin: http://127.0.0.1:8091' \
  -d '{"login":"admin","password":"<mật-khẩu-đủ-mạnh>"}'
```

Đăng nhập về sau dùng `POST /api/auth/password` (không phải `/api/auth/login`).

## 4. Build image

Cách chuẩn (cần registry để lấy base image):

```bash
docker build -t loopforge-platform:vi-local .
```

Trong môi trường hiện tại, proxy của Docker daemon trỏ tới một proxy đã chết
(`192.168.5.2:59767`) nên BuildKit không resolve được `docker/dockerfile:1` và các base
image. Bản đang chạy được build bằng cách biên dịch binary từ source Việt hóa rồi phủ lên
đúng runtime image sẵn có (cùng base, cùng Python/CLI/Docker socket):

```bash
export PATH="$HOME/.local/go1.26.11/go/bin:$PATH"
GOOS=linux GOARCH=arm64 bash scripts/build-binaries.sh /tmp/lf-out

# Dockerfile tối giản, không cần registry
printf 'FROM loopforge-platform:vi-base\nCOPY bin/ /app/bin/\n' > /tmp/lf-image/Dockerfile
cp -R /tmp/lf-out /tmp/lf-image/bin
docker build -t loopforge-platform:vi-local /tmp/lf-image

docker compose -f compose.yaml -f compose.dev.yaml -f compose.vi.yaml \
  --profile platform up -d --no-build
```

Cách này vẫn là build từ source Việt hóa: `agentflow` (kèm web + chatbot embed) và toàn
bộ runner/gate được biên dịch lại từ commit hiện tại.

## 5. Chuyển ngôn ngữ

Bộ chọn nằm ở góc phải topbar và trên trang đăng nhập: **VI / EN / 中**.

- Mặc định là tiếng Việt khi chưa có lựa chọn nào.
- Chuyển ngôn ngữ sẽ reload có hiệu ứng mờ, áp dụng cho toàn bộ shell và SPA chatbot.
- Lựa chọn được ghi vào `localStorage["loopforge.lang"]`, giữ nguyên sau refresh/restart.
- Không tự quay về tiếng Trung hay tiếng Anh.

## 6. Kiểm tra độ phủ bản dịch

```bash
make i18n-check          # hoặc: node scripts/i18n-check.mjs --verbose
```

Công cụ phát hiện:

- khóa tiếng Trung thiếu bản dịch tiếng Việt, khóa thừa;
- bản dịch rỗng hoặc để nguyên tiếng Trung;
- lệch placeholder `{{...}}`, `{name}`, `%s`, `$1`;
- chuỗi tiếng Trung hiển thị trong `web/*.html` nhưng ngoài từ điển;
- khóa trùng trong file từ điển (cảnh báo; upstream có 27 khóa trùng).

Kết quả hiện tại: **5.069/5.069 khóa có bản dịch tiếng Việt hợp lệ**, 0 chuỗi HTML
ngoài từ điển.

## 7. Kết quả kiểm thử

| Hạng mục | Kết quả |
|---|---|
| `make i18n-check` | PASS — 5.069/5.069 khóa, 0 lỗi placeholder |
| Web tests (`npm --prefix webtest test`) | 240/240 pass |
| Go tests (`internal/agentlang`, `internal/engine`, `internal/notification`, `internal/httpapi`) | pass |
| Kiểm tra trình duyệt thật | 16 màn hình + chatbot: 0 chuỗi Trung, 0 nhãn bị cắt |
| Chuyển ngôn ngữ VI → EN → 中 → VI | pass, đúng `html lang` và nhãn |
| Ghi nhớ sau reload | pass (`loopforge.lang=vi`) |
| Console errors | 0 |

Các màn hình đã kiểm tra: AI workspace, danh sách yêu cầu, lượt thực thi, phê duyệt,
mẫu quy trình, vai trò, tài sản năng lực, môi trường cách ly, thống kê, cấu hình dự án,
trình thực thi, tác vụ định kỳ, kênh thông báo, cài đặt cá nhân, quản trị nền tảng,
khóa truy cập và SPA `/chatbot/`.

Ngoài các phần tử hiển thị, một lượt quét DOM toàn bộ (kể cả tooltip, dialog và panel
ẩn) cho kết quả **0 chuỗi tiếng Trung**.

## 8. Cập nhật upstream mà không mất bản dịch

```bash
git fetch origin
git checkout feature/vi-VN-localization
git rebase origin/main
make i18n-check
```

- Từ điển là file bổ sung (`web/i18n-vi.js`), không sửa component, nên rebase hiếm khi
  xung đột. Xung đột có thể xuất hiện ở khối `Object.assign` cuối `web/i18n-en.js` nếu
  upstream sửa đúng phần đuôi file.
- Sau rebase, `make i18n-check` liệt kê khóa mới chưa dịch. Thêm bản dịch vào
  `web/i18n-vi.js` (và `web/i18n-en.js` nếu muốn English mode cũng đủ).
- Chạy lại `npm --prefix webtest test` và kiểm tra giao diện.

## 9. Hạn chế còn tồn tại

- **Chưa chạy một agent thật để xem câu trả lời tiếng Việt**: môi trường này chưa cấu
  hình API key/model credential. Directive đã được kiểm thử bằng unit test và được chèn
  vào mọi prompt; khi cấu hình model, agent sẽ trả lời tiếng Việt theo mặc định.
- **Build Docker chuẩn bị chặn bởi proxy registry của máy**, nên image đang chạy được
  tạo bằng binary build từ source phủ lên runtime image cùng base (mục 4). Khi proxy
  hoạt động, `docker build` chuẩn sẽ cho kết quả tương đương.
- **VS Code workbench nhúng** (`web/vscode-web`, `web/monaco`) giữ nguyên ngôn ngữ của
  upstream; đây là editor nhúng, không phải giao diện LoopForge.
- **Log terminal, source code, JSON key, lệnh CLI** được giữ nguyên có chủ đích, kèm
  giải thích tiếng Việt khi cần.
- Một số câu ghép động (số lượng + nhãn) có thể đọc ngắn gọn hơn văn nói tự nhiên, do
  cơ chế ghép chuỗi của upstream; nội dung vẫn đúng và không còn tiếng Trung.
