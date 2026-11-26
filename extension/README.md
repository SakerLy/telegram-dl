# Telegram Media Downloader — extension

Bản extension (Manifest V3) tách từ userscript `telegram-dl.user.js` 2.2.2, phát triển riêng.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `manifest.json` | Khai báo extension và **version** (nguồn duy nhất của số phiên bản) |
| `build.mjs` | Ghép `src/` thành `content.js` |
| `content.js` | File sinh ra, không có trong git, **đừng sửa trực tiếp** |
| `bridge.js` | Cầu nối chạy ở isolated world: đồng bộ `chrome.storage` ↔ trang Telegram, mở trang cài đặt |
| `options.html`, `options.css`, `options.js` | Trang cài đặt riêng của extension (dùng chung chuỗi trong `src/strings.js`) |
| `icons/icon-*.png` | Icon 16/32/48/128px, thu nhỏ từ icon của Telegram Web (`web.telegram.org/k/assets/img/android-chrome-192x192.png`). Logo Telegram là thương hiệu của Telegram: dùng cá nhân, đừng đăng lên store với icon này |
| `src/config.js` | Hằng số: chunk, retry, timeout, giới hạn |
| `src/strings.js` | Chuỗi giao diện tiếng Việt / tiếng Anh |
| `src/core.js` | Lưu trữ, dịch `t()`, lỗi, log, `sleep`, định dạng, cài đặt, IndexedDB |
| `src/blob-registry.js` | Giữ Blob sau `blob:` URL của app, nhận diện MediaSource |
| `src/hls.js` | HLS của WebK: bắt playlist, đọc playlist, chọn bản, khớp video |
| `src/engine.js` | Engine tải: Range song song, writer, blob, ghép HLS |
| `src/files.js` | Khóa media, chống trùng, tên file, thư mục lưu, liệt kê file |
| `src/tasks.js` | Lưu file, `download/` WebA, hàng đợi và vòng đời task |
| `src/styles.js` | Icon và CSS (màu lấy từ theme đang dùng của Telegram) |
| `src/panels.js` | Nút nổi và dock (tab Tải xuống · Chọn · Thư mục), thông báo nhỏ, kéo nút nổi |
| `src/viewer.js` | Trình xem media WebK/WebA: nguồn slide, nút tải, xếp hàng |
| `src/select.js` | Chọn hàng loạt ảnh |
| `src/autoqueue.js` | Auto-queue video |
| `src/ext-sync.js` | Nhận cài đặt mới từ trang cài đặt (qua `bridge.js`) và áp dụng ngay; xin mở trang cài đặt |
| `src/app.js` | Gắn nút vào WebK/WebA, copy ở kênh chặn lưu, `boot()` |

**Cách các file ghép lại:** `build.mjs` nối các file theo thứ tự trong `ORDER` vào **một IIFE**. Vì vậy file sau dùng được mọi thứ file trước khai báo, và không có biến nào lọt ra trang Telegram.

**Lưu ý khi thêm file mới:**
- Thêm tên file vào `ORDER` trong `build.mjs`.
- Lệnh chạy ngay khi nạp (ví dụ `loadStore(...)`, `BlobRegistry.install()`) chỉ được dùng thứ đã khai báo ở file đứng trước.
- Hàm thì gọi được thứ khai báo ở file sau, miễn là lúc hàm chạy thì thứ đó đã được nạp.

Extension chạy trong **main world** của trang (`"world": "MAIN"`), tức chung môi trường với Telegram, nên mới gắn được vào `URL.createObjectURL`, `fetch` và `XMLHttpRequest`. Cần Chrome/Edge 111+ hoặc Firefox 128+.

## Giao diện trong Telegram (khác userscript)

- **Nút nổi tròn** ở góc màn hình: vòng quanh nút là tiến độ chung của các file đang tải, nhãn nhỏ là số task đang chạy (đỏ "!" nếu có task lỗi). Bấm để mở/đóng dock, kéo để dời chỗ (vị trí được nhớ).
- **Dock** mở về phía còn trống quanh nút nổi, gồm 3 tab: *Tải xuống* (danh sách task, tạm dừng / tiếp tục / thử lại / hủy), *Chọn* (công tắc Chế độ chọn và Auto-queue, lưới ảnh đã chọn, nút tải), *Thư mục* (chọn/đổi thư mục lưu, xem file đã lưu).
- Thông báo ngắn (đã bỏ qua file đã tải, xong auto-queue…) hiện cạnh nút nổi.
- Màu sắc lấy từ theme đang dùng của Telegram nên tự theo sáng/tối và màu nhấn của bạn.

## Cài đặt (khác userscript)

- **Nơi chỉnh:** bản extension không có hộp cài đặt trong trang. Bấm bánh răng ở đầu dock, hoặc chuột phải icon extension → *Tùy chọn*, để mở **trang cài đặt riêng** trong tab mới.
- **Nơi lưu dữ liệu:** cài đặt, số thứ tự, danh sách đã tải và tên thư mục lưu nằm trong `chrome.storage` của extension. `bridge.js` chép sang trang Telegram đang mở, nên đổi gì ở trang cài đặt thì Telegram áp dụng ngay.
- **Chọn thư mục lưu:** ở tab *Thư mục* của dock, vì trình duyệt chỉ cho mở hộp chọn thư mục từ thao tác trong trang. Tab này cũng liệt kê file đã lưu. Bỏ chọn ở trang cài đặt.
- **Lần cài đầu tiên:** extension lấy cài đặt đang có trong trang Telegram (ví dụ từ userscript) làm gốc.

## Build

```bash
node build.mjs
```

Không cần `npm install`. Lệnh này chạy trong thư mục `extension`. Chạy lại mỗi khi sửa `src/` hoặc version.

## Cài để dùng

**Chrome / Edge / Brave / Opera**
1. Chạy `node build.mjs`.
2. Mở `chrome://extensions` (Edge: `edge://extensions`) và bật **Developer mode**.
3. Bấm **Load unpacked** và chọn thư mục `extension`.
4. Tải lại `https://web.telegram.org/`.

Sau khi sửa code: chạy lại `node build.mjs`, bấm nút tải lại (↻) của extension, rồi tải lại tab Telegram.

**Firefox** (bản tạm, mất khi tắt trình duyệt)
1. Chạy `node build.mjs`.
2. Mở `about:debugging#/runtime/this-firefox`, bấm **Load Temporary Add-on…** và chọn `extension/manifest.json`.

> **Trước khi bật extension:** tắt userscript trong Tampermonkey. Chạy cả hai cùng lúc sẽ có hai bộ giao diện và tải trùng file.
>
> **Dữ liệu dùng chung với userscript:** extension ghi cài đặt sang bộ nhớ của trang Telegram, nên userscript cũng đọc thấy nếu bật lại.

## Đóng gói thành file zip

```bash
node build.mjs && tar -a -cf telegram-media-downloader.zip manifest.json content.js bridge.js options.html options.css options.js src/strings.js icons
```

Dùng `tar` (có sẵn từ Windows 10): `Compress-Archive` của PowerShell 5 ghi đường dẫn trong zip bằng `\`, Chrome/Firefox có thể đọc sai.

## Tăng phiên bản

Sửa `"version"` trong `manifest.json` rồi chạy `node build.mjs`. `SCRIPT_VERSION` trong `content.js` được lấy từ đó.
