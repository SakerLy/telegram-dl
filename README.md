# Telegram Media Downloader

Userscript tải ảnh, GIF, video và voice từ **Telegram Web** — kể cả kênh bật *noforwards* (cấm lưu/forward).

Hỗ trợ:
- `web.telegram.org/k/` (WebK)
- `web.telegram.org/a/` · `web.telegram.org/z/` (WebA / WebZ)
- `webk.telegram.org`, `webz.telegram.org`

---

## Tiếng Việt

### 1. Cài trình quản lý userscript

Chọn **một** tiện ích phù hợp với trình duyệt:

| Trình duyệt | Tiện ích |
|---|---|
| Chrome / Edge / Brave / Opera | [Tampermonkey](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |
| Firefox | [Tampermonkey](https://addons.mozilla.org/firefox/addon/tampermonkey/) · hoặc [Violentmonkey](https://addons.mozilla.org/firefox/addon/violentmonkey/) |
| Safari | [Userscripts](https://apps.apple.com/app/userscripts/id1463298887) |

### 2. Cài script

Nhấn vào link raw để Tampermonkey tự nhận:

**[Cài Telegram Media Downloader](https://raw.githubusercontent.com/SakerLy/telegram-media-downloader/main/Telegram%20Downloader.user.js)**

Tampermonkey mở tab xác nhận → bấm **Install**.

### 3. Dùng

Mở `https://web.telegram.org/` — 2 panel xuất hiện:
- **Panel trên-phải**: *Chọn hàng loạt*
- **Panel dưới-phải**: *Tải xuống* (chỉ hiện khi có task)

#### Tải một file
Mở ảnh/video trong viewer → bấm **⤓** ở topbar.

#### Tải hàng loạt ảnh
1. Bấm **Chế độ chọn** trong panel
2. Click vào từng bubble ảnh (viền xanh = đã chọn)
3. Shift+Click = chọn một dải
4. Bấm **Tải mục đã chọn (N)**

#### Tải hàng loạt video (noforwards channel)
Video chỉ load src khi mở viewer. Dùng **Auto-queue**:
1. Bấm **Auto-queue video** (nền xanh = bật)
2. Mở video đầu tiên bằng tay
3. Script tự thêm vào hàng chờ + tự chuyển slide tiếp theo trong album
4. Dùng mũi tên trái/phải (hoặc nút chuyển TG) để qua post khác, mỗi video mới tự enqueue
5. Tắt Auto-queue khi xong

### 4. Phím tắt

| Phím | Chức năng |
|---|---|
| `Ctrl + Shift + M` | Bật/tắt Chế độ chọn |
| `Ctrl + Shift + A` | Bật/tắt Auto-queue |
| `Ctrl + Shift + D` | Tải mục đã chọn |

### 5. Auto update

Script tự check update qua Tampermonkey. Mặc định mỗi 24h kiểm tra 1 lần.

**Bật/tắt thủ công**: Tampermonkey → Dashboard → mở script → tab **Settings** → mục *Updates* → chọn khoảng kiểm tra.

**Cập nhật ngay**: Tampermonkey → Dashboard → nút **Check for userscript updates**.

### 6. Troubleshoot

| Triệu chứng | Cách xử lý |
|---|---|
| Không thấy panel | F5 lại trang. Kiểm tra Tampermonkey đã bật script chưa. |
| Video chọn ra ảnh | Video chưa mở viewer — dùng Auto-queue thay vì chọn bubble trực tiếp. |
| Tải HTTP 403 | Kênh đã đóng hoặc URL hết hạn, mở lại viewer để refresh. |
| Treo lúc tải | Mở DevTools Console → copy log `[sakerly]` + screenshot gửi vào Issues. |

---

## English

### 1. Install a userscript manager

| Browser | Extension |
|---|---|
| Chrome / Edge / Brave / Opera | [Tampermonkey](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |
| Firefox | [Tampermonkey](https://addons.mozilla.org/firefox/addon/tampermonkey/) · [Violentmonkey](https://addons.mozilla.org/firefox/addon/violentmonkey/) |
| Safari | [Userscripts](https://apps.apple.com/app/userscripts/id1463298887) |

### 2. Install the script

**[Install Telegram Media Downloader](https://raw.githubusercontent.com/SakerLy/telegram-media-downloader/main/Telegram%20Downloader.user.js)**

Click **Install** when Tampermonkey opens the install page.

### 3. Usage

Open `https://web.telegram.org/` — two panels appear:
- **Top-right**: *Batch select*
- **Bottom-right**: *Downloads* (only when active)

#### Single file
Open the media in viewer → click **⤓** on the topbar.

#### Batch photos
1. Toggle **Select mode**
2. Click each photo bubble
3. Shift+Click for range select
4. **Download selected (N)**

#### Batch videos (noforwards channels)
Videos only have a src once the viewer is opened. Use **Auto-queue**:
1. Toggle **Auto-queue video**
2. Open the first video manually
3. Script enqueues + auto-advances to the next slide in the album
4. Use ← → to move between posts; each new video is auto-queued
5. Toggle Auto-queue off when done

### 4. Shortcuts

| Key | Action |
|---|---|
| `Ctrl + Shift + M` | Toggle Select mode |
| `Ctrl + Shift + A` | Toggle Auto-queue |
| `Ctrl + Shift + D` | Download selected |

### 5. Auto update

Tampermonkey checks for updates every 24h by default via `@updateURL` / `@downloadURL`.

**Manual check**: Tampermonkey → Dashboard → **Check for userscript updates**.

### 6. Language

Default follows browser language (VI if `navigator.language` starts with `vi`, else EN). Change anytime via the dropdown at the bottom of the Downloads panel.

---

## Changelog

### 1.0
- Dual-panel UI: Downloads (bottom-right) + Batch select (top-right), draggable & collapsible
- Range-fetch engine (HTTP 206, 4 MB chunks, 2 concurrent, 30 s timeout, retry/cancel per task)
- Batch photo select with Shift+Click range support
- Auto-queue mode for videos (resolves on viewer open, auto-advances to next slide in album)
- Queue button on viewer topbar + download button on video controls
- VI / EN language toggle, persisted via localStorage
- Auto-update via `@updateURL` / `@downloadURL`

---

Built by **SakerLy**
