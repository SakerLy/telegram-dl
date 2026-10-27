<div align="center">

# Telegram Media Downloader

Tải ảnh, video, GIF và voice từ **Telegram Web**, kể cả kênh chặn lưu nội dung.<br>
Download photos, videos, GIFs and voice messages from **Telegram Web**, including channels that restrict saving.

[![Version](https://img.shields.io/badge/version-2.2.1-1a72bd)](CHANGELOG.md)
[![WebK](https://img.shields.io/badge/Telegram-WebK-2aabee)](https://web.telegram.org/k/)
[![WebA](https://img.shields.io/badge/Telegram-WebA-2aabee)](https://web.telegram.org/a/)
[![Userscript](https://img.shields.io/badge/userscript-Tampermonkey%20%7C%20Violentmonkey-00485b)](#cài-đặt)
[![License](https://img.shields.io/badge/license-GPL--3.0--or--later-blue)](LICENSE)

**[Tiếng Việt](#tiếng-việt)** · **[English](#english)** · **[Changelog](CHANGELOG.md)**

</div>

---

## Tiếng Việt

### Tính năng

- **Tải từng file**: nút tải trong trình xem media, trong stories và trên audio đang ghim.
- **Tải hàng loạt ảnh**: chọn từng ảnh, Shift+Click để chọn một dải, hoặc chọn tất cả ảnh đang hiển thị. Danh sách đã chọn hiện dạng lưới ảnh thu nhỏ để kiểm tra trước khi tải.
- **Auto-queue video**: tự chuyển qua từng slide, tải video và dừng ngay sau video cuối cùng phía trước.
- **Engine tải song song**: 1–4 luồng mỗi file, tự thử lại khi lỗi, tiếp tục từ chỗ dừng, Tạm dừng / Tiếp tục, hiển thị tốc độ và thời gian còn lại.
- **Chống trùng**: nhớ media đã tải để không tải lại, không bao giờ ghi đè file có sẵn.
- **Tên file và nơi lưu**: tên gốc, ngày giờ hoặc số thứ tự kèm tiền tố; lưu vào thư mục riêng với thư mục con theo ngày hoặc theo kênh.
- Giao diện tiếng Việt và tiếng Anh, theme sáng và tối, tự cập nhật bản mới.

### Hỗ trợ

| | Ghi chú |
|---|---|
| WebK `web.telegram.org/k/` | Đầy đủ tính năng |
| WebA `web.telegram.org/a/` | Đầy đủ tính năng |
| Chrome, Edge, Opera | Đầy đủ, kể cả lưu vào thư mục riêng |
| Brave | Đầy đủ sau khi bật `brave://flags/#file-system-access-api` |
| Firefox | Không lưu được vào thư mục riêng, file tải về thư mục Downloads |
| Safari / iOS | Không hỗ trợ |

### Cài đặt

1. Cài một trình quản lý userscript:
   [Tampermonkey](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) (Chrome, Edge, Brave, Opera) hoặc
   [Tampermonkey](https://addons.mozilla.org/firefox/addon/tampermonkey/) / [Violentmonkey](https://addons.mozilla.org/firefox/addon/violentmonkey/) (Firefox).
2. Mở **[link cài script](https://raw.githubusercontent.com/SakerLy/telegram-dl/main/telegram-dl.user.js)** rồi bấm **Install**.
3. Mở hoặc tải lại `https://web.telegram.org/`.

### Sử dụng

**Tải một file.** Mở ảnh hoặc video trong trình xem rồi bấm nút tải trên thanh công cụ.

**Tải hàng loạt ảnh.**
1. Bật **Chế độ chọn** trong panel *Chọn hàng loạt*.
2. Click vào ảnh để chọn, Shift+Click để chọn một dải. Hoặc bấm **Chọn tất cả hiển thị**; cuộn tiếp rồi bấm lại để cộng thêm.
3. Kiểm tra lưới ảnh đã chọn (click vào một ô để cuộn tới ảnh đó trong chat), rồi bấm **Tải mục đã chọn**.

**Tải video.** Video chỉ có nguồn tải khi được mở trong trình xem, vì vậy dùng **Auto-queue**:
1. Bật **Auto-queue video**.
2. Click vào media muốn bắt đầu. Script đếm ngay số video phía trước trong khung chat.
3. Script tự tải từng video, bỏ qua ảnh, tự chuyển slide và dừng ngay sau video cuối cùng.

**Tạm dừng, tiếp tục, thử lại.** Mỗi task trong panel *Tải xuống* có các nút này. Thử lại sau lỗi chỉ tải phần còn thiếu.

### Cài đặt nâng cao

Bấm biểu tượng bánh răng trên một trong hai panel.

| Nhóm | Mục | Mô tả |
|---|---|---|
| Chung | Ngôn ngữ | Tiếng Việt hoặc English |
| | Số luồng tải mỗi file | 1–4, mặc định 3 |
| Tên file | Định dạng | Tên gốc, ngày giờ, số thứ tự hoặc kết hợp; có dòng xem trước |
| | Tiền tố | Chuỗi thêm vào đầu tên file |
| Nơi lưu | Thư mục lưu | Lưu vào thư mục riêng thay cho Downloads |
| | Thư mục con | Theo ngày, theo kênh hoặc cả hai; cần chọn thư mục lưu trước |
| Dữ liệu | Số thứ tự | Số kế tiếp, có nút đặt lại |
| | Media đã tải | Số media đã nhớ, có nút **Quên hết** |

> **Lưu ý:** sau mỗi lần khởi động lại trình duyệt, lần tải đầu tiên sẽ hỏi lại quyền ghi vào thư mục lưu.

### Phím tắt

| Phím | Chức năng |
|---|---|
| <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>M</kbd> | Bật/tắt Chế độ chọn |
| <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>A</kbd> | Bật/tắt Auto-queue |
| <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd> | Tải mục đã chọn |

### Xử lý sự cố

| Hiện tượng | Cách xử lý |
|---|---|
| Không thấy panel | Tải lại trang, kiểm tra script đang bật trong Tampermonkey |
| Nút **Chọn thư mục** bị xám | Trình duyệt không hỗ trợ, hoặc Brave chưa bật flag ở mục *Hỗ trợ* |
| Click vào video không chọn được | Chế độ chọn chỉ dành cho ảnh, dùng Auto-queue cho video |
| Tốc độ không tăng | Tăng *Số luồng* trong Cài đặt; tốc độ còn phụ thuộc giới hạn của Telegram |
| Lỗi khác | Mở Console (F12), gửi các dòng `[sakerly]` kèm ảnh chụp vào Issues |

### Cập nhật

Script tự kiểm tra bản mới mỗi 24 giờ. Muốn kiểm tra ngay: Tampermonkey → Dashboard → **Check for userscript updates**.

---

## English

### Features

- **Single files**: a download button in the media viewer, in stories and on pinned audio.
- **Batch photos**: pick photos one by one, Shift+Click for a range, or select every photo on screen. The selection is shown as a thumbnail grid so you can check it before downloading.
- **Video auto-queue**: steps through the slides, downloads each video and stops right after the last video ahead.
- **Parallel engine**: 1–4 connections per file, automatic retries, resume after failure, Pause / Resume, live speed and time left.
- **Duplicate protection**: remembers what was downloaded and never overwrites existing files.
- **File names and locations**: original name, date-time or sequence number plus a prefix; save into your own folder with date or channel subfolders.
- Vietnamese and English UI, light and dark theme, automatic updates.

### Compatibility

| | Notes |
|---|---|
| WebK `web.telegram.org/k/` | All features |
| WebA `web.telegram.org/a/` | All features |
| Chrome, Edge, Opera | All features, including saving into a custom folder |
| Brave | All features after enabling `brave://flags/#file-system-access-api` |
| Firefox | No custom folder; files go to the Downloads folder |
| Safari / iOS | Not supported |

### Installation

1. Install a userscript manager:
   [Tampermonkey](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) (Chrome, Edge, Brave, Opera) or
   [Tampermonkey](https://addons.mozilla.org/firefox/addon/tampermonkey/) / [Violentmonkey](https://addons.mozilla.org/firefox/addon/violentmonkey/) (Firefox).
2. Open the **[install link](https://raw.githubusercontent.com/SakerLy/telegram-dl/main/telegram-dl.user.js)** and click **Install**.
3. Open or reload `https://web.telegram.org/`.

### Usage

**Single file.** Open the photo or video in the viewer and click the download button in the toolbar.

**Batch photos.**
1. Enable **Select mode** in the *Batch select* panel.
2. Click photos to select them, Shift+Click for a range. Or press **Select all visible**; scroll and press again to add more.
3. Check the thumbnail grid (click a tile to scroll to that photo in the chat), then click **Download selected**.

**Videos.** A video only has a downloadable source once it's open in the viewer, so use **Auto-queue**:
1. Enable **Auto-queue video**.
2. Click the media you want to start from. The script immediately counts the videos ahead in the chat.
3. It downloads each video, skips photos, advances slides by itself and stops right after the last video.

**Pause, resume, retry.** Every task in the *Downloads* panel has these controls. Retrying after a failure only fetches the missing part.

### Settings

Click the gear icon on either panel.

| Group | Option | Description |
|---|---|---|
| General | Language | Tiếng Việt or English |
| | Connections per file | 1–4, default 3 |
| File name | Format | Original name, date-time, sequence number or a combination, with a live preview |
| | Prefix | Text prepended to every file name |
| Saving | Destination folder | Save into a folder of your choice instead of Downloads |
| | Subfolders | By date, by channel or both; needs a destination folder |
| Data | Sequence | Next number, with a reset button |
| | Downloaded media | How many media are remembered, with a **Forget all** button |

> **Note:** after each browser restart, the first download asks for permission to write to the destination folder again.

### Shortcuts

| Keys | Action |
|---|---|
| <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>M</kbd> | Toggle Select mode |
| <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>A</kbd> | Toggle Auto-queue |
| <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd> | Download selected |

### Troubleshooting

| Problem | Fix |
|---|---|
| Panels don't appear | Reload the page and check the script is enabled in Tampermonkey |
| **Pick folder** is greyed out | Browser not supported, or the Brave flag under *Compatibility* isn't enabled |
| Clicking a video doesn't select it | Select mode is for photos only; use Auto-queue for videos |
| Speed doesn't improve | Raise *Connections* in Settings; speed is also capped by Telegram |
| Anything else | Open the Console (F12) and send the `[sakerly]` lines plus a screenshot to Issues |

### Updates

The script checks for updates every 24 hours. To check now: Tampermonkey → Dashboard → **Check for userscript updates**.

---

<div align="center">

Built by **SakerLy** · download engine modelled on [tweb](https://github.com/morethanwords/tweb) and [telegram-tt](https://github.com/Ajaxy/telegram-tt)

Phát hành theo giấy phép / Licensed under [GPL-3.0-or-later](LICENSE)

</div>
