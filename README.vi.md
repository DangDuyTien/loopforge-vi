# LoopForge — Bản tiếng Việt

Bản Việt hóa độc lập của [Tencent LoopForge](https://github.com/Tencent/LoopForge), nền
tảng điều phối nhiều AI Agent cho quy trình bàn giao phần mềm (SOP, workflow, runner,
sandbox, phê duyệt thủ công, kiểm tra mã nguồn, sản phẩm đầu ra, chi phí).

- Ngôn ngữ mặc định: **Tiếng Việt**
- Chuyển đổi: **VI / EN / 中** ngay trên giao diện
- Giữ nguyên toàn bộ tính năng, kiến trúc và khả năng điều phối multi-agent của upstream

## Phiên bản nền

| | |
|---|---|
| Upstream | `Tencent/LoopForge` tag `v0.4.2` |
| Commit | `d2462fa583be8e25e9a74f4ee2b7a4f5d55ca9ae` |
| Nhánh Việt hóa | `feature/vi-VN-localization` |

## Khởi chạy nhanh

```bash
docker compose \
  -f compose.yaml -f compose.dev.yaml -f compose.vi.yaml \
  --profile platform up -d --build
```

Mở <http://127.0.0.1:8091>. Tài khoản đăng ký đầu tiên trở thành quản trị viên.

## Chuyển ngôn ngữ

Bộ chọn **VI / EN / 中** ở góc phải topbar và trên trang đăng nhập. Lựa chọn được lưu
trong `localStorage["loopforge.lang"]` và giữ nguyên sau khi refresh hoặc restart.

## Kiểm tra bản dịch

```bash
make i18n-check
```

Hiện tại: 5.069/5.069 khóa có bản dịch tiếng Việt hợp lệ, 0 chuỗi tiếng Trung ngoài
từ điển.

## AI Agent trả lời tiếng Việt

Khi dùng bản này, prompt gửi tới Claude Code / Codex / CodeBuddy có kèm directive yêu
cầu phân tích, kế hoạch, báo cáo tiến độ, review, giải thích lỗi và yêu cầu phê duyệt
bằng tiếng Việt. Source code, lệnh CLI, JSON key và log terminal được giữ nguyên.

Đổi ngôn ngữ agent bằng biến môi trường:

```bash
AGENTFLOW_AGENT_LANGUAGE=vi   # mặc định
AGENTFLOW_AGENT_LANGUAGE=en   # tiếng Anh
AGENTFLOW_AGENT_LANGUAGE=zh   # hành vi gốc của upstream
```

## Tài liệu

Xem [`docs/VIETNAMESE_LOCALIZATION.md`](docs/VIETNAMESE_LOCALIZATION.md) để biết chi
tiết về kiến trúc bản địa hóa, build image, kiểm thử, cập nhật upstream và các hạn chế.

## Giấy phép

Kế thừa giấy phép của upstream — xem [`LICENSE`](LICENSE) và
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
