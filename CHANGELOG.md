# Changelog

## 2.1.0 — Panel trên viewer WebA (top-layer), UI mới, auto-queue thông minh, chống trùng lặp

### Panel "biến mất" trên view video (WebA) — sửa tận gốc
- **Nguyên nhân thật** (khác mọi chẩn đoán trước): WebA render media viewer là **`<dialog id="MediaViewer">` mở bằng `showModal()`** (MediaViewer.tsx:633 + useLayoutEffect `dialog.showModal()`). Dialog nằm trong **top layer** của browser — vẽ **trên mọi z-index** (kể cả 2147483646) và khiến toàn bộ phần còn lại của trang **inert** (không click được). Đó là lý do panel "bị ẩn" và không thao tác được khi mở video trên WebA, đã kiểm chứng trên cả source (clone f67a408) lẫn bundle deploy thật (`showModal` + `MediaViewerSlide--active` trong `extra-*.js`, CSS `#MediaViewer{position:fixed;top:0;left:0;width:100vw;height:100%;border:0;margin:0;padding:0}` — không transform khi đã mở).
- **Fix**: `keepPanelsOnTop()` — khi viewer WebA mở, chuyển `#sk-panel`, `#sk-select`, `#sk-settings` **vào bên trong dialog đang mở** (renders cùng top layer, click được); đóng viewer thì trả về `document.body`. Panel là `position:fixed` nên không ảnh hưởng grid layout của dialog. MutationObserver giờ cũng theo dõi `removedNodes` để kéo panel về body ngay khi dialog bị gỡ.
- **Panel Downloads luôn hiển thị** (bỏ logic ẩn khi rỗng): khi chưa có task hiện dòng mờ "Chưa có tải xuống nào" — panel luôn nhìn thấy được trên viewer.

### UI nút mới — rõ ràng hơn
- Hệ nút thiết kế lại: cao 34–42px, font đậm 12–13px, bo góc 10px, hover/active/focus-visible rõ ràng.
- **Toggle chip** cho "Chế độ chọn" / "Auto-queue video": chấm trằng trạng thái + nền xanh khi BẬT (không còn chữ "✓" lẫn vào text, không còn nút "danger" gây hiểu lầm).
- Nút tải chính: nền xanh + icon tải + shadow — nổi bật hẳn so với nút phụ.
- Nút task card (Tạm dừng / Hủy / Thử lại) đồng bộ стиль, Hủy đỏ rõ ràng.

### "Chọn tất cả hiển thị" — sửa 3 lỗi
- **Đẩy scroll panel**: danh sách mục đã chọn giờ **cao tối đa 150px + scrollbar riêng** (không còn tràn đẩy nội dung), và `updateSelectBar` **giữ nguyên scrollTop** của panel khi vẽ lại.
- **Tải mục không nhìn thấy**: visibility check giờ chạy trên **đúng ảnh sẽ được tải** (`item.el` — ảnh lớn nhất trong scope) thay vì ảnh đầu tiên query được.
- **Ảnh album bị gộp/mất**: key chọn ảnh giờ thêm hash URL (`msg:peer:mid.<urlhash>`) — mỗi ảnh trong album là một mục riêng, không bị gộp còn 1 như trước (WebK) và không trùng lặp khi chọn lại.

### Chống tải trùng lặp file
- `downloadMedia` dedupe **thêm theo URL**: cùng nguồn được xếp hàng qua 2 đường khác nhau (viewer vs batch select) trả về đúng 1 task đang chạy thay vì tạo bản sao.
- Task evict (quá 30 mục) giờ **xóa cả card** — hết card "mồ côi" mà nút Xoá lịch sử không với tới.

### Auto-queue: tự chuyển video + phát hiện video trong post/reply (WebA hoạt động đầy đủ)
- **WebA trước đây không tự chuyển được**: `postMediaItems`/`armPostFromClick` chỉ biết selector WebK (`.bubble`, `.attachment`), và `autoAdvanceViewer` chỉ click `.media-viewer-switcher-next` của WebK. Giờ:
  - Nhận media item của cả WebA (`.Message`, `.media-inner`, `.album-item`) — mở video đơn hay album đều arm đúng post.
  - `autoAdvanceViewer` WebA: click `#MediaViewer .navigation.next` (nút next thật của viewer), fallback synthetic `ArrowRight` (WebA gắn keydown trên document — MediaViewerSlides.tsx:644).
  - `viewerOpen()` đúng theo client (`#MediaViewer` vs `.media-viewer-whole` — WebK gỡ khỏi body khi đóng, đã xác minh base.ts:1056).
- **Săn video tiếp post/reply**: hết slide của post hiện tại không dừng ngay — tiếp tục tự chuyển qua các slide kế tiếp (post/reply liền kề) và xếp hàng mọi video mới tìm thấy; dừng khi hết slide hoặc **10 slide liên tiếp không có video mới** (`AUTO_QUEUE_HUNT_SLIDES`). Flash "Xong post: N video" giữ nguyên.

### Nút "Xoá lịch sử tải" clear hết
- Trước đây chỉ bỏ task `finished` đang trong `downloadTasks` → sót card mồ côi + task paused/queued không bao giờ biến mất. Giờ: quét **toàn bộ card trong DOM**, task queued/paused/failed/cancelled bị hủy rồi bỏ card, card mồ côi bị xóa thẳng; chỉ giữ task đang thực sự tải (downloading/preparing/saving).

### Dọn code
- Bỏ các comment song ngữ dài dòng và ghi chú "BUGFIX" lịch sử — giữ comment ngắn gọn tiếng Việt cho các chỗ logic khó.

## 2.0.2 — Sửa lỗi WebA: auto-queue/không tải được video khi mở viewer

- **Triệu chứng**: trên web.telegram.org/a, khi mở video trong viewer: không có gì xảy ra — panel Downloads "bị ẩn" mãi (không task nào được tạo) và video không tải được bằng Auto-queue.
  - Nguyên nhân gốc: toàn bộ luồng auto-queue + nút hàng đợi trong viewer chỉ được viết cho WebK (`processAutoQueue` gọi `resolveViewerWebKMedia` với selector `.media-viewer-whole` — không tồn tại trên WebA; `refreshWebA` không bao giờ gọi `processAutoQueue`, cũng không có nút queue).
- **Fix**:
  - `resolveViewerWebAMedia()` mới — đọc đúng **slide active** (`#MediaViewer .MediaViewerSlide--active`); chỉ slide active mới có `<video>` (slide khác chỉ là poster), slide video chưa có src trả `null` thay vì nhầm poster thành ảnh.
  - `processAutoQueue()` giờ chọn resolver theo client (`isWebA` → WebA) và được gọi ở đầu `refreshWebA` → mở viewer trên WebA là video tự động xếp hàng như WebK, task card hiện → panel Downloads xuất hiện.
  - `queueCurrentWebAMedia()` + nút hàng đợi (`Button smaller translucent-white round`) trong actions bar và player controls của WebA viewer — ngang hàng WebK.
  - `downloadCurrentWebAMedia` dùng resolver chung; nếu chưa đọc được nguồn (video chưa phát) thì log cảnh báo rõ ràng thay vì thất bại im lặng.
- Đối chiếu selector với source telegram-tt hiện tại: `#MediaViewer`, `.MediaViewerSlide--active`, `.MediaViewerActions`, `.VideoPlayer`, `.VideoPlayerControls .buttons`, `.spacer` — tất cả còn đúng ở bản deploy (đã kiểm chứng qua bundle web.telegram.org/a và repo clone 2026-10-16).
- Test engine: tăng latency mô phỏng của bài đo song song (10→60ms) để loại flake `maxInFlight` — 43/43 ổn định × 4 lần chạy.

## 2.0.1 — Sửa lỗi UI: modal Cài đặt dính trên màn hình (settings dialog stuck)

- **Lỗi UI nghiêm trọng**: hộp thoại Cài đặt bị **hiển thị vĩnh viễn từ khi tải trang**, mọi trường trống (không nhãn, dropdown trắng, select luồng đứng ở "1", các select không có chữ), bấm × / Esc / click nền cũng không tắt được.
  - Nguyên nhân: rule `#sk-settings { display:flex }` (specificity 1-0-0) override rule mặc định `[hidden] { display:none }` của trình duyệt; rule ẩn của script (`#sk-settings [hidden]`) chỉ khớp phần tử **con cháu**, bỏ sót chính root — nên `hidden` không còn tác dụng với modal.
  - Fix: bổ sung `#sk-panel[hidden], #sk-select[hidden], #sk-settings[hidden] { display:none !important }` — modal ẩn đúng lúc khởi tạo, chỉ hiện khi bấm gear.
- **Chống trạng thái trắng**: tách `translateSettingsUI()` khỏi `refreshSettingsUI()` và gọi ngay lúc dựng UI — nhãn/option/nút được dịch sẵn, modal không bao giờ trắng trơn kể cả khi đường mở gặp lỗi.
- Nút "Tải mục đã chọn" khi disable: đổi từ nền xanh mờ 50% (tương phản kém) sang nền xám + chữ muted dễ đọc.

## 2.0.0 — Parallel engine rewrite (nâng cấp lõi tải theo 2 client Web chính thức)

Engine v1 (range-fetch tuần tự 4 MB, 1 luồng/file, 0 retry) được viết lại hoàn toàn dựa trên kiến trúc tải file của **Telegram WebK** (`morethanwords/tweb`) và **Telegram WebA** (`Ajaxy/telegram-tt`).

### Engine mới — học từ client chính thức

- **Tải song song thật**: N worker đồng thời mỗi file (mặc định 3 — bằng `MAX_CONCURRENT_CONNECTIONS` của WebA, chỉnh 1–4 trong Settings). Chunk 512 KB-aligned khớp grid nội bộ của SW WebK và clamp 512 KB/response của SW WebA; URL `stream/` (WebK) tự tăng lên 1 MB sau 4 chunk đầy (bằng `MAX_DOWNLOAD_FILE_PART_SIZE` của cả hai client).
- **RangeLedger** (kiểu `FileView` của WebA): bản đồ interval byte — chunk về out-of-order, response bị SW kẹp ngắn không gây lỗi, resume chỉ tải đúng phần thiếu.
- **Retry + backoff**: mỗi chunk retry tối đa 5 lần với backoff 250 ms × 2^n + jitter (pattern `getRetryTimeout` của mediaLoader WebA); stall timeout 60 s reset theo dữ liệu (pattern `SENDER_TIMEOUT`); timeout liên tiếp → tự thu nhỏ chunk 512→256 KB; task tự retry 1 lần sau 3 s khi lỗi mạng.
- **NetBudget 12 MB in-flight** (pattern `dcBandwidthManager` của WebA) + watchdog 120 s chống treo.
- **Resume trong phiên**: lỗi giữa chừng commit phần đã tải (FileSystemWritableFileStream + `keepExistingData`); nút **Retry** tiếp tục từ chunk chưa xong; **Pause/Resume** giữ nguyên tiến trình.
- **BlobRegistry**: hook `URL.createObjectURL` giữ Blob gốc — blob: URL tải bằng `Blob.slice` trực tiếp, 0 network, Blob vẫn dùng được sau khi app revoke URL.
- **Tốc độ thực + ETA**: SpeedMeter cửa sổ trượt 3 s (thay vì tốc độ trung bình cả phiên), progress throttle 50 ms (pattern tweb).
- **WebA native fallback**: khi engine hết retry hoặc file > 1,2 GB mà trình duyệt không có File System Access (Firefox), tự chuyển sang endpoint `download/` của SW WebA — browser stream xuống disk trực tiếp, không tốn RAM.

### Sửa lỗi thực tế

- **Video WebA (web.telegram.org/a/) không tải được**: v1 yêu cầu range 4 MB + timeout 30 s + validation Content-Range quá cứng trong khi SW WebA trả tối đa 512 KB/response và cho part chờ tới 60 s → giờ chunk đúng grid, timeout đúng, response ngắn được ledger hấp thu.
- **Chậm trên file lớn**: v1 chỉ 1 luồng/file — không tận dụng được queue 9×512 KB part song song của app; giờ N luồng × 2 task.
- **Lỗi giữa chừng mất trắng**: giờ có retry per-chunk + auto task-retry + resume.

### UI mới

- Task card: % + thanh tiến trình, tốc độ thực, **ETA**, Pause/Resume, Retry-resume (hiển thị "Tiếp tục từ X%"), thông báo lỗi dịch sẵn.
- Settings mới: **Số luồng tải mỗi file (1–4)**.
- Giữ nguyên toàn bộ tính năng v1: batch select + tick + Shift-click, select-all-visible, auto-queue video, chống trùng, naming/prefix/subfolder, thư mục lưu (File System Access), stories, pinned audio, phím tắt, VI/EN.

### Kỹ thuật

- Ghi file qua `createWritable` + positioned writes (out-of-order an toàn), tự xóa file rỗng khi hủy task trong thư mục đích.
- Dedupe key bền vững hơn: parse file id từ URL `stream/` (WebK) và `progressive/document…` (WebA).
- 43 bài test headless (Node) cho engine: ledger, song song, retry, pause/resume, cancel, mime fatal, blob fast-path.

## 1.0

- Dual-panel UI: Downloads (bottom-right) + Batch select (top-right), draggable & collapsible
- Range-fetch engine (HTTP 206, 4 MB chunks, 2 concurrent, 30 s timeout, retry/cancel per task)
- Batch photo select: click, Shift+Click range, and additive "Select all visible" with a tick on each photo
- Auto-queue for videos only: queues each video opened in the viewer and auto-advances to the next slide
- Queue button on viewer topbar + download button on video controls
- Duplicate protection: per-media identity (file id / message id), in-flight dedupe, remembers downloaded media so batch and auto-queue skip them, never overwrites files in the destination folder
- Settings: language (VI / EN), file naming formats, prefix, sequence counter, destination folder, auto subfolders, forget downloaded list
- Auto-update via `@updateURL` / `@downloadURL`
