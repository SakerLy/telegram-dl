# Telegram Media Downloader

Userscript tải ảnh, video, GIF và voice từ **Telegram Web**, kể cả kênh bật chặn lưu nội dung.
A userscript to download photos, videos, GIFs and voice messages from **Telegram Web**, including channels that restrict saving content.

[Tiếng Việt](#tiếng-việt) · [English](#english) · [Changelog](CHANGELOG.md)

---

## Tiếng Việt

### Tính năng

- Tải từng file ngay trong trình xem media
- Chọn và tải hàng loạt ảnh, có dấu tick trên từng ảnh
- Auto-queue: tự tải toàn bộ video trong một post, dừng khi hết video
- Chống trùng: không tải lại media đã tải, không ghi đè file
- Tuỳ chỉnh tên file, thư mục lưu và thư mục con theo ngày hoặc kênh
- Giao diện tiếng Việt và tiếng Anh, tự cập nhật phiên bản mới

Hỗ trợ `web.telegram.org/k/` (WebK) và `web.telegram.org/a/` (WebA). Một số tính năng như Auto-queue chỉ có trên WebK.

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

### Cài đặt nâng cao

Bấm biểu tượng bánh răng trên panel.

| Mục | Mô tả |
|---|---|
| Ngôn ngữ | Tiếng Việt hoặc English |
| Định dạng tên file | Tên gốc, ngày giờ, số thứ tự, hoặc kết hợp |
| Tiền tố | Chuỗi thêm vào đầu tên file |
| Thư mục lưu | Lưu vào thư mục riêng thay cho Downloads |
| Thư mục con tự động | Theo ngày, theo kênh, hoặc kết hợp. Cần chọn thư mục lưu trước. |
| Media đã tải | Số media đã nhớ để không tải lại, có nút **Quên hết** |

Thư mục lưu và thư mục con chỉ dùng được trên Chrome, Edge, Brave và Opera. Trên Brave cần bật `brave://flags/#file-system-access-api` rồi khởi động lại trình duyệt. Sau mỗi lần khởi động lại trình duyệt, lần tải đầu tiên sẽ hỏi lại quyền ghi thư mục.

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
| Ảnh vừa cuộn tới không được chọn | Đợi ảnh tải xong rồi bấm lại |
| Lỗi khác | Mở Console (F12), gửi các dòng `[sakerly]` kèm ảnh chụp vào Issues |

Script tự kiểm tra bản mới mỗi 24 giờ. Muốn kiểm tra ngay: Tampermonkey → Dashboard → **Check for userscript updates**.

---

## English

### Features

- Download any single file from the media viewer
- Batch-select and download photos, with a tick on each selected photo
- Auto-queue: downloads every video in a post and stops when they're done
- Duplicate protection: skips media already downloaded, never overwrites files
- Configurable file names, destination folder and date/channel subfolders
- Vietnamese and English UI, automatic updates

Supports `web.telegram.org/k/` (WebK) and `web.telegram.org/a/` (WebA). Some features, such as Auto-queue, are WebK only.

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

### Settings

Click the gear icon on either panel.

| Option | Description |
|---|---|
| Language | Tiếng Việt or English |
| File naming | Original name, date-time, sequence number, or a combination |
| Prefix | Text prepended to every file name |
| Destination folder | Save into a folder of your choice instead of Downloads |
| Auto subfolder | By date, by channel, or both. Requires a destination folder. |
| Downloaded media | How many media are remembered and won't be downloaded again, with a **Forget all** button |

Destination folder and subfolders work on Chrome, Edge, Brave and Opera only. On Brave, enable `brave://flags/#file-system-access-api` and relaunch. After each browser restart, the first download asks for folder permission again.

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
| A photo just scrolled into view isn't selected | Wait for it to finish loading, then press again |
| Anything else | Open the Console (F12) and send the `[sakerly]` lines plus a screenshot to Issues |

The script checks for updates every 24 hours. To check now: Tampermonkey → Dashboard → **Check for userscript updates**.

---

Built by **SakerLy**
