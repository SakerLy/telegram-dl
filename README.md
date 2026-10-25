# Telegram Media Downloader

Userscript tải ảnh, video, GIF và voice từ **Telegram Web**, kể cả kênh bật chặn lưu nội dung.
A userscript to download photos, videos, GIFs and voice messages from **Telegram Web**, including channels that restrict saving content.

[Tiếng Việt](#tiếng-việt) · [English](#english) · [Changelog](CHANGELOG.md)

---

## Tiếng Việt

### Tính năng

**Engine v2.0 — viết lại theo kiến trúc tải file của 2 client Web chính thức của Telegram** ([WebK](https://github.com/morethanwords/tweb) + [WebA](https://github.com/Ajaxy/telegram-tt)):

- **Tải song song** nhiều chunk đồng thời mỗi file (mặc định 3 luồng như Telegram WebA, chỉnh 1–4 trong Settings)
- **Tự động retry** chunk lỗi 5 lần với backoff lũy tiến (250ms → 8s + jitter), tự thu nhỏ chunk khi timeout
- **Resume trong phiên**: lỗi giữa chừng bấm *Retry* tải tiếp từ chỗ dừng, không tải lại từ đầu; có **Pause/Resume**
- **Tốc độ thực + ETA** (cửa sổ trượt 3s gần nhất)
- **Chống treo**: stall timeout 60s, watchdog 120s, tự retry task khi mạng nhấp nháy
- **File lớn an toàn**: ghi trực tiếp xuống disk theo position (Chrome/Edge/Brave); Firefox tự chuyển sang endpoint download gốc của Telegram khi file > 1,2 GB
- Video **WebA** (`web.telegram.org/a/`) giờ tải được ổn định (v1 hay lỗi)

Cùng các tính năng từ v1:

- Tải từng file ngay trong trình xem media; nút tải thêm vào cả stories và pinned audio
- Chọn và tải hàng loạt ảnh, có dấu tick trên từng ảnh, Shift+Click chọn dải
- Auto-queue: tự tải toàn bộ video trong một post, dừng khi hết video
- Chống trùng: không tải lại media đã tải, không ghi đè file
- Tuỳ chỉnh tên file, tiền tố, thư mục lưu và thư mục con theo ngày hoặc kênh
- Giao diện tiếng Việt và tiếng Anh, tự cập nhật phiên bản mới

Hỗ trợ `web.telegram.org/k/` (WebK) và `web.telegram.org/a/` (WebA). Auto-queue chỉ có trên WebK.

### Cài đặt

1. Cài một trình quản lý userscript:
   - Chrome, Edge, Brave, Opera: [Tampermonkey](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - Firefox: [Tampermonkey](https://addons.mozilla.org/firefox/addon/tampermonkey/) hoặc [Violentmonkey](https://addons.mozilla.org/firefox/addon/violentmonkey/)
2. Mở [link cài script](https://raw.githubusercontent.com/SakerLy/telegram-dl/main/telegram-dl.user.js) rồi bấm **Install**.
3. Mở hoặc tải lại `https://web.telegram.org/`.

### Sử dụng

**Tải một file.** Mở ảnh hoặc video trong trình xem, bấm nút tải trên thanh công cụ phía trên.

**Tải hàng loạt ảnh.**
1. Bật **Chế độ chọn** trong panel *Chọn hàng loạt*.
2. Click vào post ảnh để chọn, Shift+Click để chọn một dải. Hoặc bấm **Chọn tất cả hiển thị**: bấm lại sau khi cuộn để cộng thêm ảnh mới.
3. Bấm **Tải mục đã chọn**.

**Tải video.** Video chỉ có nguồn tải khi được mở trong trình xem, vì vậy dùng **Auto-queue**:
1. Bật **Auto-queue video**.
2. Click vào media đầu tiên của post. Script đếm số video trong post ngay lúc này.
3. Script tự tải từng video, bỏ qua ảnh, tự chuyển slide và dừng khi đủ video của post.

**Pause / Resume / Retry.** Mỗi task trong panel *Tải xuống* có nút Tạm dừng — Tiếp tục — Thử lại. Thử lại sau khi lỗi chỉ tải phần chưa xong, không tải lại từ đầu.

### Cài đặt nâng cao

Bấm biểu tượng bánh răng trên panel.

| Mục | Mô tả |
|---|---|
| Ngôn ngữ | Tiếng Việt hoặc English |
| Số luồng tải mỗi file | 1–4 chunk song song (mặc định 3, như Telegram WebA) |
| Định dạng tên file | Tên gốc, ngày giờ, số thứ tự, hoặc kết hợp |
| Tiền tố | Chuỗi thêm vào đầu tên file |
| Thư mục lưu | Lưu vào thư mục riêng thay cho Downloads |
| Thư mục con tự động | Theo ngày, theo kênh, hoặc kết hợp. Cần chọn thư mục lưu trước. |
| Media đã tải | Số media đã nhớ để không tải lại, có nút **Quên hết** |

Thư mục lưu và thư mục con chỉ dùng được trên Chrome, Edge, Brave và Opera. Trên Brave cần bật `brave://flags/#file-system-access-api` rồi khởi động lại trình duyệt. Sau mỗi lần khởi động lại trình duyệt, lần tải đầu tiên sẽ hỏi lại quyền ghi thư mục.

Trên Firefox (không có File System Access): file nhỏ và vừa tải qua bộ nhớ rồi gửi trình duyệt lưu; file lớn hơn 1,2 GB trên WebA tự chuyển cho endpoint download gốc của Telegram để stream thẳng xuống disk.

### Phím tắt

| Phím | Chức năng |
|---|---|
| `Ctrl+Shift+M` | Bật/tắt Chế độ chọn |
| `Ctrl+Shift+A` | Bật/tắt Auto-queue |
| `Ctrl+Shift+D` | Tải mục đã chọn |

### Xử lý sự cố

| Hiện tượng | Cách xử lý |
|---|---|
| Không thấy panel | Tải lại trang, kiểm tra script đang bật trong Tampermonkey |
| Nút **Chọn thư mục** bị xám | Trình duyệt không hỗ trợ, hoặc Brave chưa bật flag ở trên |
| Click vào video không chọn được | Chế độ chọn chỉ dành cho ảnh, dùng Auto-queue cho video |
| Tốc độ không tăng | Thử tăng *Số luồng* trong Settings; tốc độ còn phụ thuộc giới hạn server Telegram cho tài khoản thường (premium được nhanh hơn) |
| Lỗi khác | Mở Console (F12), gửi các dòng `[sakerly]` kèm ảnh chụp vào Issues |

Script tự kiểm tra bản mới mỗi 24 giờ. Muốn kiểm tra ngay: Tampermonkey → Dashboard → **Check for userscript updates**.

---

## English

### Features

**v2.0 engine — rewritten after the file-download architecture of the two official Telegram Web clients** ([WebK](https://github.com/morethanwords/tweb) + [WebA](https://github.com/Ajaxy/telegram-tt)):

- **True parallel download**: N concurrent chunks per file (default 3, matching Telegram WebA; configurable 1–4 in Settings)
- **Automatic retry**: up to 5 attempts per chunk with exponential backoff (250ms → 8s + jitter), auto-shrinking chunk size on repeated timeouts
- **In-session resume**: after a failure, *Retry* continues from where it stopped instead of restarting; **Pause/Resume** supported
- **Real speed + ETA** (3-second sliding window)
- **Hang-proof**: 60s stall timeout, 120s watchdog, task-level auto-retry on network blips
- **Large-file safe**: streams straight to disk with positioned writes (Chrome/Edge/Brave); on Firefox, files > 1.2 GB fall back to Telegram's own download endpoint (browser streams to disk, zero RAM)
- WebA (`web.telegram.org/a/`) videos now download reliably

Plus everything from v1:

- Download any single file from the media viewer; buttons added to stories and pinned audio too
- Batch-select and download photos, with a tick on each selected photo, Shift+Click for ranges
- Auto-queue: downloads every video in a post and stops when they're done
- Duplicate protection: skips media already downloaded, never overwrites files
- Configurable file names, destination folder and date/channel subfolders
- Vietnamese and English UI, automatic updates

Supports `web.telegram.org/k/` (WebK) and `web.telegram.org/a/` (WebA). Auto-queue is WebK only.

### Installation

1. Install a userscript manager:
   - Chrome, Edge, Brave, Opera: [Tampermonkey](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - Firefox: [Tampermonkey](https://addons.mozilla.org/firefox/addon/tampermonkey/) or [Violentmonkey](https://addons.mozilla.org/firefox/addon/violentmonkey/)
2. Open the [install link](https://raw.githubusercontent.com/SakerLy/telegram-dl/main/telegram-dl.user.js) and click **Install**.
3. Open or reload `https://web.telegram.org/`.

### Usage

**Single file.** Open the photo or video in the viewer and click the download button in the top bar.

**Batch photos.**
1. Enable **Select mode** in the *Batch select* panel.
2. Click photo posts to select them, Shift+Click to select a range. Or press **Select all visible**: press it again after scrolling to add more.
3. Click **Download selected**.

**Videos.** A video only has a downloadable source once it's open in the viewer, so use **Auto-queue**:
1. Enable **Auto-queue video**.
2. Click the first media of a post. The script counts the post's videos at that moment.
3. It downloads each video, skips photos, advances slides by itself and stops once the post's videos are done.

**Pause / Resume / Retry.** Every task in the *Downloads* panel has Pause — Resume — Retry controls. Retrying after a failure only fetches the missing part, never from scratch.

### Settings

Click the gear icon on either panel.

| Option | Description |
|---|---|
| Language | Tiếng Việt or English |
| Connections per file | 1–4 parallel chunks (default 3, same as Telegram WebA) |
| File naming | Original name, date-time, sequence number, or a combination |
| Prefix | Text prepended to every file name |
| Destination folder | Save into a folder of your choice instead of Downloads |
| Auto subfolder | By date, by channel, or both. Requires a destination folder. |
| Downloaded media | How many media are remembered and won't be downloaded again, with a **Forget all** button |

Destination folder and subfolders work on Chrome, Edge, Brave and Opera only. On Brave, enable `brave://flags/#file-system-access-api` and relaunch. After each browser restart, the first download asks for folder permission again.

On Firefox (no File System Access): small and medium files are buffered in memory and handed to the browser; files larger than 1.2 GB on WebA fall back to Telegram's own download endpoint and stream straight to disk.

### Shortcuts

| Key | Action |
|---|---|
| `Ctrl+Shift+M` | Toggle Select mode |
| `Ctrl+Shift+A` | Toggle Auto-queue |
| `Ctrl+Shift+D` | Download selected |

### Troubleshooting

| Problem | Fix |
|---|---|
| Panels don't appear | Reload the page and check the script is enabled in Tampermonkey |
| **Pick folder** is greyed out | Browser not supported, or the Brave flag above isn't enabled |
| Clicking a video doesn't select it | Select mode is for photos only; use Auto-queue for videos |
| Speed doesn't improve | Raise *Connections* in Settings; throughput is also capped by Telegram servers for regular accounts (premium is faster) |
| Anything else | Open the Console (F12) and send the `[sakerly]` lines plus a screenshot to Issues |

The script checks for updates every 24 hours. To check now: Tampermonkey → Dashboard → **Check for userscript updates**.

---

Built by **SakerLy** — v2.0 engine inspired by the download pipelines of [tweb](https://github.com/morethanwords/tweb) and [telegram-tt](https://github.com/Ajaxy/telegram-tt).