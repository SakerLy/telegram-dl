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

**[Cài Telegram Media Downloader](https://raw.githubusercontent.com/SakerLy/telegram-dl/main/telegram-dl.user.js)**

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
2. Click vào media đầu tiên của post để mở viewer. Lúc click, script đếm sẵn post có bao nhiêu video.
3. Script tự thêm từng video vào hàng chờ và tự chuyển slide. Ảnh trong post được bỏ qua, không tải.
4. Khi đã gặp đủ số video của post, hoặc tới item cuối của post, script dừng lại và nút tải hiện "Xong post: N video". Nó không chạy sang post khác.
5. Muốn tải post khác: đóng viewer và click vào post đó.

### 4. Phím tắt

| Phím | Chức năng |
|---|---|
| `Ctrl + Shift + M` | Bật/tắt Chế độ chọn |
| `Ctrl + Shift + A` | Bật/tắt Auto-queue |
| `Ctrl + Shift + D` | Tải mục đã chọn |

### 5. Cài đặt

Bấm nút bánh răng trên panel (panel nào cũng được) để mở Cài đặt.

| Mục | Ý nghĩa |
|---|---|
| Ngôn ngữ | Tiếng Việt / English. Mặc định theo ngôn ngữ trình duyệt. |
| Định dạng tên file | Tên gốc · Ngày giờ · Số thứ tự · Ngày giờ + Tên gốc · Số thứ tự + Tên gốc |
| Tiền tố | Chuỗi thêm vào đầu tên file, ví dụ tên kênh. Có thể để trống. |
| Số thứ tự | Hiện số kế tiếp, có nút đặt lại về 1. |
| Thư mục lưu | Chọn một thư mục riêng thay cho Downloads mặc định. |
| Thư mục con tự động | Theo ngày · Theo kênh · Ngày / Kênh · Kênh / Ngày. Chỉ bật được sau khi đã chọn thư mục lưu. |

#### Lưu vào thư mục riêng và tạo thư mục con

1. Cài đặt → **Thư mục lưu** → **Chọn thư mục** → chọn hoặc tạo thư mục, ví dụ `D:\Telegram`.
2. Trình duyệt hỏi có cho trang sửa file trong thư mục đó không → bấm **Lưu thay đổi** (Allow).
3. Ở **Thư mục con tự động**, chọn kiểu muốn dùng. Ví dụ chọn *Kênh / Ngày* thì file được lưu vào `D:\Telegram\TênKênh\2026-10-24\`. Thư mục chưa có thì script tự tạo.

Lưu ý:
- Chỉ hỗ trợ Chrome, Edge, Brave và Opera. Firefox và Safari không có API chọn thư mục, file sẽ vào Downloads mặc định.
- Sau khi tắt hẳn trình duyệt rồi mở lại, lần tải đầu tiên trình duyệt sẽ hỏi lại quyền. Nếu từ chối, file rơi về Downloads mặc định.
- Tên kênh lấy theo chat đang mở tại thời điểm file lưu xong. Đừng chuyển chat khi batch còn đang tải.

#### Brave: nút "Chọn thư mục" bị xám

Brave tắt sẵn File System Access API. Cách bật:

1. Mở tab mới, vào `brave://flags/#file-system-access-api`
2. Chuyển **File System Access API** sang **Enabled**
3. Bấm **Relaunch** để khởi động lại Brave
4. Mở lại web.telegram.org → Cài đặt → nút **Chọn thư mục** đã bấm được.

### 6. Auto update

Script tự check update qua Tampermonkey. Mặc định mỗi 24h kiểm tra 1 lần.

**Bật/tắt thủ công**: Tampermonkey → Dashboard → mở script → tab **Settings** → mục *Updates* → chọn khoảng kiểm tra.

**Cập nhật ngay**: Tampermonkey → Dashboard → nút **Check for userscript updates**.

### 7. Troubleshoot

| Triệu chứng | Cách xử lý |
|---|---|
| Không thấy panel | F5 lại trang. Kiểm tra Tampermonkey đã bật script chưa. |
| Nút "Chọn thư mục" bị xám | Trình duyệt không hỗ trợ hoặc đang tắt API. Với Brave xem mục *Brave* ở trên. |
| Ô "Thư mục con tự động" bị xám | Chưa chọn thư mục lưu. Chọn thư mục trước. |
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

**[Install Telegram Media Downloader](https://raw.githubusercontent.com/SakerLy/telegram-dl/main/telegram-dl.user.js)**

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
2. Click the first media of a post to open the viewer. On that click the script counts the post's videos.
3. Each video is queued and the viewer auto-advances. Photos in the post are skipped, not downloaded.
4. Once every video of the post was seen, or the post's last item is reached, it stops and the download button shows "Post done: N video(s)". It never runs on into other posts.
5. For another post: close the viewer and click that post.

### 4. Shortcuts

| Key | Action |
|---|---|
| `Ctrl + Shift + M` | Toggle Select mode |
| `Ctrl + Shift + A` | Toggle Auto-queue |
| `Ctrl + Shift + D` | Download selected |

### 5. Settings

Click the gear icon on either panel to open Settings.

| Option | What it does |
|---|---|
| Language | Tiếng Việt / English. Defaults to the browser language. |
| File naming | Original · Date-time · Sequence · Date + Original · Sequence + Original |
| Prefix | Optional text prepended to every file name, e.g. the channel name. |
| Sequence | Shows the next number, with a reset-to-1 button. |
| Destination folder | Save into a folder of your choice instead of the default Downloads folder. |
| Auto subfolder | By date · By channel · Date / Channel · Channel / Date. Only available after a destination folder is picked. |

#### Saving into a custom folder with subfolders

1. Settings → **Destination folder** → **Pick folder** → choose or create a folder, e.g. `D:\Telegram`.
2. The browser asks whether the site may edit files in that folder → click **Save changes** (Allow).
3. Under **Auto subfolder**, choose a layout. With *Channel / Date*, files go to `D:\Telegram\ChannelName\2026-10-24\`. Missing folders are created automatically.

Notes:
- Chrome, Edge, Brave and Opera only. Firefox and Safari have no folder-picker API, so files go to the default Downloads folder.
- After fully restarting the browser, it asks for permission again on the first download. If you decline, files fall back to Downloads.
- The channel name is taken from the chat open when each file finishes saving. Don't switch chats while a batch is still downloading.

#### Brave: "Pick folder" is greyed out

Brave disables the File System Access API by default. To enable it:

1. Open `brave://flags/#file-system-access-api`
2. Set **File System Access API** to **Enabled**
3. Click **Relaunch**
4. Reopen web.telegram.org → Settings → **Pick folder** now works.

### 6. Auto update

Tampermonkey checks for updates every 24h by default via `@updateURL` / `@downloadURL`.

**Manual check**: Tampermonkey → Dashboard → **Check for userscript updates**.

---

## Changelog

Xem / See [CHANGELOG.md](CHANGELOG.md).

---

Built by **SakerLy**
