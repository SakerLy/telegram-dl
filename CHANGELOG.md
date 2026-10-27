# Changelog

Mọi thay đổi đáng chú ý của Telegram Media Downloader được ghi lại ở đây.
Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/), phiên bản theo [Semantic Versioning](https://semver.org/lang/vi/).

## Chưa phát hành

### Thêm
- Phát hành theo giấy phép **GPL-3.0-or-later** (file [LICENSE](LICENSE), khai báo `@license` trong header của script).

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
