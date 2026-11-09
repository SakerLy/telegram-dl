# Changelog

Mọi thay đổi đáng chú ý của Telegram Media Downloader được ghi lại ở đây.
Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/), phiên bản theo [Semantic Versioning](https://semver.org/lang/vi/).

## 2.2.2

### Thêm
- Phát hành theo giấy phép **GPL-3.0-or-later** (file [LICENSE](LICENSE), khai báo `@license` trong header của script).
- **Mẫu tên file tuỳ chỉnh**: chọn *Tuỳ chỉnh* trong Cài đặt → Tên file rồi ghép `{name}`, `{date}`, `{time}`, `{seq}`, `{channel}` theo ý muốn.
- **Xem file đã tải**: nút thư mục trên panel *Tải xuống* liệt kê file trong thư mục lưu (kể cả thư mục con), mới nhất ở trên, để biết file đã lưu ở đâu. Trình duyệt không cho trang web mở Explorer nên danh sách hiện ngay trong panel.
- **Auto-queue báo số video còn lại**: panel *Chọn hàng loạt* hiện "Còn N video phía trước". Cài đặt mới *Auto-queue dừng khi*: sau video cuối đã đếm (mặc định; đếm lại nếu chat đã tải thêm video) hoặc hết slide.

### Thay đổi
- Bỏ nút Cài đặt trên panel *Tải xuống*; mở Cài đặt từ panel *Chọn hàng loạt*.

### Sửa lỗi
- Không tải được video có tuỳ chọn độ phân giải trên WebK (báo nhầm "Telegram đã giải phóng media này"). WebK phát loại video này qua HLS nên nguồn là MediaSource, không đọc được dữ liệu. Giờ script tìm đúng playlist HLS của video (khớp theo thời lượng) rồi ưu tiên tải **file gốc** qua `stream/`; nếu Telegram không cho (vd file `.mov`) thì ghép các đoạn HLS thành một file mp4, chọn bản **H.264** cao nhất (HEVC/AV1 nhiều trình phát không mở được). Lưu vào thư mục lưu, đặt tên theo mẫu, có tiến trình, Tạm dừng/Tiếp tục và Thử lại như file thường.
- Panel *Tải xuống* sau khi kéo đi chỗ khác bị tràn khỏi đáy màn hình khi thêm task, che mất tiến trình. Giờ panel neo theo mép gần hơn và không cao quá chỗ còn trống.
- Panel thu gọn rồi kéo sát góc, khi mở rộng lại bị chui qua viền màn hình. Giờ cả hai panel neo theo mép trái/phải và trên/dưới gần hơn, và tự kéo vào trong mỗi khi đổi kích thước.
- Khi tải bằng nhiều luồng vào thư mục lưu, các luồng cùng tạo file một lúc nên ra nhiều file (`x.mp4`, `x (1).mp4`…): các file thừa 0 byte, file còn lại đủ dung lượng nhưng thiếu đoạn nên không xem được (gặp nhiều nhất với HLS). Giờ chỉ tạo đúng một file.
- Media đã tải trước đó bị bỏ qua mà không báo gì; giờ panel *Tải xuống* hiện thẻ "Đã tải trước đó, bỏ qua".
- Console không còn hiện lỗi `blob: … ERR_FILE_NOT_FOUND` mỗi khi tải video HLS (do script dò nguồn video).
- Bấm **×** trên task đang tải chỉ ẩn card: task vẫn tải tiếp, tự thử lại và card hiện lại. Giờ × trên task chưa xong sẽ hủy hẳn.
- Auto-queue trên WebK: video có nguồn `blob:` xếp hàng sau file lớn bị lỗi `ERR_FILE_NOT_FOUND` vì tới lượt thì Telegram đã giải phóng media. Giờ script đọc lấy dữ liệu ngay lúc xếp hàng, khi media còn trên màn hình (kể cả blob do worker của Telegram tạo); nếu media đã mất thật thì báo lỗi rõ ràng ngay thay vì thử lại vô ích.
- Hủy rồi bấm **Thử lại** tạo ra file hỏng (thiếu phần đầu) mà vẫn báo Hoàn tất.
- Hai file trùng tên tải cùng lúc vào thư mục lưu ghi đè lên nhau, mất một file.
- Khi chuyển sang trình duyệt tự tải sau lỗi (WebA), file dở dang còn nằm lại trong thư mục lưu và tên file bị thêm tiền tố / số thứ tự hai lần.
- Bấm Tạm dừng rồi Tiếp tục quá nhanh có thể làm task thất bại.
- Nút **Thêm vào hàng chờ** không xếp hàng lại được video đã lỗi hoặc đã hủy cho tới khi tải lại trang.

## 2.2.1

### Thay đổi
- **Auto-queue biết trước còn bao nhiêu video.** Ngay khi bạn click vào một media, script đếm số video phía trước trong khung chat và dừng ngay sau video cuối cùng, không còn đi tiếp qua các slide chỉ có ảnh.
- **Danh sách mục đã chọn dạng lưới ảnh thu nhỏ**, có số thứ tự; click vào một ô để cuộn tới ảnh đó trong chat.
- **Cài đặt thiết kế lại**: chia 4 nhóm (Chung, Tên file, Nơi lưu, Dữ liệu) và có dòng xem trước tên file theo định dạng đang chọn.

### Sửa lỗi
- Auto-queue dừng giữa chừng dù phía trước vẫn còn video (sau nhiều slide ảnh liên tiếp, khi trình xem bỏ qua lệnh chuyển slide, hoặc khi cùng một file xuất hiện hai lần).
- Chữ và icon của nút "Tải mục đã chọn" bị tím trên WebK, do trùng tên class với Telegram.
- Danh sách mục đã chọn đẩy các nút xuống mỗi khi dài thêm.

## 2.2.0

### Sửa lỗi
- **Chọn tất cả hiển thị** chỉ chọn ảnh thật sự nhìn thấy trong khung chat; không còn chọn ảnh khuất sau ô nhập tin, sticker, ảnh bản đồ hay tin quảng cáo (WebA).
- **Auto-queue** đọc đúng slide đang xem trên WebK, không còn đứng im khi video tải chậm; trên WebA chuyển slide bằng phím → như client gốc.
- **Tạm dừng → Tiếp tục** hoạt động với mọi task: không còn lỗi khi tải qua bộ nhớ (Firefox) và không còn treo sau khi tạm dừng.
- **Panel Tải xuống** không tự bung ra sau khi bạn đã thu gọn; danh sách cuộn bên trong panel.
- **Màu nút** dễ đọc ở cả hai theme (độ tương phản tối thiểu 4.5:1).
- Nút xoá danh sách tải có icon thùng rác.

## 2.1.0

### Thêm
- Panel hiển thị và bấm được ngay trên trình xem media của WebA.
- Panel Tải xuống luôn hiển thị, có trạng thái "Chưa có tải xuống nào".
- Nút gạt cho Chế độ chọn và Auto-queue; nút tải chính có icon và nổi bật hơn.

### Sửa lỗi
- Ảnh trong album không còn bị gộp thành một mục khi chọn.
- Cùng một file được xếp hàng từ hai nơi (trình xem và chat) chỉ tạo một task.
- Nút "Xoá lịch sử" xoá được mọi task, trừ task đang tải.
- Auto-queue hoạt động trên WebA.

## 2.0.2

### Sửa lỗi
- WebA: mở video trong trình xem không tải được bằng Auto-queue.

### Thêm
- Nút "Thêm vào hàng chờ" trong trình xem media của WebA.

## 2.0.1

### Sửa lỗi
- Hộp thoại Cài đặt hiện sẵn khi tải trang, không có nhãn và không đóng được.
- Nút "Tải mục đã chọn" khi chưa chọn gì khó đọc.

## 2.0.0

Engine tải được viết lại, dựa trên cách hai client Web chính thức của Telegram ([tweb](https://github.com/morethanwords/tweb) và [telegram-tt](https://github.com/Ajaxy/telegram-tt)) tải file.

### Thêm
- Tải song song 1–4 luồng mỗi file (mặc định 3), chỉnh trong Cài đặt.
- Tự thử lại từng phần tới 5 lần; tự giảm kích thước phần khi mạng chậm.
- Tiếp tục từ chỗ dừng sau lỗi; Tạm dừng / Tiếp tục.
- Tốc độ thực và thời gian còn lại trên mỗi task.
- Firefox: file trên 1,2 GB ở WebA được chuyển cho trình tải gốc của Telegram, ghi thẳng xuống đĩa.

### Sửa lỗi
- Video trên WebA không tải được.
- File lớn tải chậm vì chỉ dùng một luồng.
- Lỗi giữa chừng buộc phải tải lại từ đầu.

## 1.0

Phiên bản đầu tiên.

- Hai panel: *Tải xuống* và *Chọn hàng loạt*, kéo thả và thu gọn được.
- Chọn ảnh hàng loạt: click, Shift+Click chọn dải, "Chọn tất cả hiển thị" có dấu tick trên từng ảnh.
- Auto-queue cho video: tự xếp hàng video khi mở trong trình xem.
- Nút "Thêm vào hàng chờ" trên thanh công cụ trình xem và nút tải trên trình phát video.
- Chống trùng: nhớ media đã tải, không ghi đè file trong thư mục lưu.
- Cài đặt: ngôn ngữ, định dạng tên file, tiền tố, số thứ tự, thư mục lưu, thư mục con.
- Tự cập nhật qua Tampermonkey.
