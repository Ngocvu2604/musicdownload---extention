# AudioFlow 🎵 - Modern Audio Detector, Manager & Downloader (Chrome Extension MV3)

> Tiện ích mở rộng Google Chrome (Manifest V3) hiện đại, tối giản và mạnh mẽ giúp người dùng phát hiện, nghe thử trực tiếp và quản lý tải xuống các tệp âm thanh từ mọi website tương thích.

---

## 🌟 Tính Năng Nổi Bật

### 1. 🔍 Audio Detection Engine (Bộ Phát Hiện Âm Thanh Thông Minh)
- **Hỗ trợ đầy đủ các định dạng phổ biến:**
  - `MP3`, `WAV`, `FLAC`, `AAC`, `M4A`, `OGG`, `OPUS`, `WEBM Audio`.
- **Nhận diện đa tầng (Dual-layer Detection):**
  - **Tầng DOM (Content Script):** Quét thẻ `<audio>`, `<video>`, `<source>`, các liên kết tải xuống trực tiếp (`a[href]`) và thuộc tính `data-audio`.
  - **Tầng Network (Background Service Worker):** Giám sát phản hồi HTTP qua `chrome.webRequest.onHeadersReceived` với MIME Type `audio/*` và các audio chunk/stream.
  - Tự động phát hiện âm thanh chèn động bằng `MutationObserver` (hỗ trợ Single Page Apps: SoundCloud, Spotify Preview, podcast sites).
- **Thông tin chi tiết:**
  - Tên file & Tiêu đề bài hát.
  - Định dạng âm thanh với màu sắc trực quan.
  - Kích thước tệp (Content-Length).
  - Thời lượng (Duration).
  - Nguồn gốc (DOM Audio, Stream, Link) & Domain trang web.

### 2. ⚡ Download Manager Chuyên Nghiệp
- Tích hợp trực tiếp **Chrome Downloads API** (`chrome.downloads`).
- Hỗ trợ tải từng file hoặc **Tải hàng loạt (Batch Download)** nhiều file đã chọn.
- Theo dõi tiến trình tải trực quan với thanh Progress Bar và dung lượng `bytesReceived / totalBytes`.
- Hỗ trợ **Tạm dừng (Pause)**, **Tiếp tục (Resume)** và **Hủy (Cancel)** quá trình tải.
- Hộp thoại **Đổi tên file (Rename Modal)** trước khi tải với kiểm tra hợp lệ tên tệp.
- Mở nhanh tệp trong thư mục hoặc mở thư mục Downloads hệ điều hành.

### 3. 🛡️ YouTube Support & Tuân Thủ Bản Quyền
- Tự động nhận diện khi người dùng đang xem trang YouTube (`youtube.com`).
- Hiển thị bảng thông báo trạng thái riêng biệt cho YouTube.
- Nhận diện các liên kết tải chính thức, podcast được cấp quyền hoặc Creative Commons từ tác giả.
- Cung cấp hướng dẫn sử dụng phương thức tải chính thức (YouTube Premium).
- **Tuyệt đối tuân thủ chính sách:** Không vượt DRM, không giải mã luồng mã hóa bảo vệ bản quyền, an toàn 100%.

### 4. 📚 Audio Library & Lịch Sử Tải
- Lưu trữ lịch sử tải xuống cục bộ an toàn (`chrome.storage.local`).
- Thanh tìm kiếm thông minh theo tên bài hát, tên file hoặc tên trang web.
- Bộ lọc định dạng: Tất cả, MP3, WAV, FLAC, M4A...
- Đánh dấu bài hát **Yêu thích (Favorites)**.
- Sắp xếp linh hoạt: Mới nhất, Cũ nhất, Dung lượng lớn nhất.
- Nghe lại hoặc Tải lại một chạm.

### 5. 🎧 Trình Nghe Thử Trực Tiếp (Inline Mini Player)
- Thanh nghe thử âm thanh mini tích hợp sẵn ngay trong popup.
- Điều khiển phát/dừng (Play/Pause), tua thời gian (Seek Slider), tắt/bật tiếng (Mute/Unmute).
- Xử lý mượt mà cả khi luồng bị hạn chế CORS.

### 6. ⚙️ Cài Đặt Tùy Biến
- Bật/tắt tự động phát hiện (Auto Detection).
- Thiết lập thư mục lưu trữ con trong Downloads (mặc định: `AudioFlow`).
- Bộ lọc kích thước tối thiểu (loại bỏ tiếng click chuột hoặc icon sfx nhỏ < 50KB).
- Tùy chọn luôn hỏi vị trí lưu file (Save As prompt).
- Nút dọn dẹp dữ liệu và bộ nhớ đệm tiện ích.

---

## 🎨 Thiết Kế Giao Diện (Modern Dark UI)

- **Phong cách:** Modern Dark, Premium Minimalist, viền bo tròn tinh tế.
- **Bảng màu chủ đạo:**
  - Nền (Background): `#101114`
  - Thẻ (Card): `#1A1B20`
  - Màu chính (Primary): `#A78BFA` (Violet)
  - Màu nhấn (Accent): `#22D3EE` (Cyan)
  - Văn bản chính: `#FFFFFF`
  - Văn bản phụ: `#9CA3AF`
- **Kích thước Popup:** Chuẩn `400 x 560 px`, thanh cuộn siêu mỏng tùy chỉnh, hiệu ứng chuyển tab mượt mà.

---

## 📁 Cấu Trúc Mã Nguồn

```
audioflow/
├── public/
│   ├── icons/               # Icon các kích thước: 16x16, 32x32, 48x48, 128x128
│   └── manifest.json        # Cấu hình Manifest V3
├── src/
│   ├── background/
│   │   └── index.ts         # Service worker bắt webRequest & Chrome Downloads
│   ├── content/
│   │   └── index.ts         # Content script quét DOM, video, audio & link
│   ├── popup/
│   │   ├── main.tsx         # Điểm khởi động React Popup
│   │   ├── App.tsx          # Ứng dụng Popup điều phối chính
│   │   └── index.css        # Tailwind CSS & custom scrollbar
│   ├── components/
│   │   ├── Header.tsx       # Thanh tiêu đề, logo, badge, nút Scan Again
│   │   ├── Navbar.tsx       # 4 tab điều hướng dưới cùng
│   │   ├── AudioCard.tsx    # Card hiển thị âm thanh phát hiện
│   │   ├── MiniPlayer.tsx   # Trình phát audio nghe thử
│   │   ├── RenameModal.tsx  # Hộp thoại đổi tên file trước khi tải
│   │   ├── DownloadsView.tsx# Giao diện quản lý tiến trình tải
│   │   ├── LibraryView.tsx  # Giao diện thư viện, tìm kiếm, lọc
│   │   ├── SettingsView.tsx # Giao diện cấu hình tiện ích
│   │   ├── YouTubeNotice.tsx# Thông báo chính sách an toàn cho YouTube
│   │   └── EmptyState.tsx   # Trạng thái rỗng cho các màn hình
│   ├── services/
│   │   └── downloadManager.ts # Quản lý Chrome Downloads API
│   ├── storage/
│   │   └── storageService.ts  # Quản lý chrome.storage.local
│   ├── types/
│   │   └── audio.ts         # Định nghĩa TypeScript interfaces
│   └── utils/
│       ├── audioDetector.ts # Nhận diện định dạng, MIME type, hashing
│       └── formatters.ts    # Định dạng dung lượng, thời gian, tên file
├── test-page/
│   └── test-audio.html      # Trang kiểm thử toàn diện các định dạng audio
├── scripts/
│   ├── build-scripts.js     # Script biên dịch background & content scripts
│   └── generate-icons.js    # Script tạo PNG icons chất lượng cao
├── vite.config.ts           # Cấu hình Vite cho React extension
├── tailwind.config.js       # Cấu hình Tailwind màu sắc & animation
├── tsconfig.json            # Cấu hình TypeScript
├── package.json             # Danh sách dependencies & build scripts
└── README.md
```

---

## 🚀 Hướng Dẫn Cài Đặt Vào Chrome

### Bước 1: Build mã nguồn
Đảm bảo máy đã cài **Node.js** (khuyến nghị v18+). Mở terminal tại thư mục dự án và chạy:

```bash
# Cài đặt thư viện phụ thuộc (nếu chưa cài)
npm install

# Biên dịch toàn bộ extension
npm run build
```
Lệnh trên sẽ tạo ra thư mục `dist/` chứa toàn bộ extension hoàn chỉnh gồm `manifest.json`, `index.html`, `background.js`, `content.js`, icons và các file css/js.

---

### Bước 2: Cài đặt vào Google Chrome bằng "Load Unpacked"

1. Mở trình duyệt Google Chrome (hoặc Edge / Brave).
2. Truy cập vào đường dẫn:
   ```
   chrome://extensions/
   ```
3. Bật công tắc **Developer mode** (Chế độ dành cho nhà phát triển) ở góc trên bên phải.
4. Bấm vào nút **Load unpacked** (Tải tiện ích đã giải nén) ở góc trên bên trái.
5. Chọn thư mục `dist` trong thư mục dự án của bạn:
   ```
   D:\CODE\musicdownload - extention\dist
   ```
6. Tiện ích **AudioFlow - Audio Detector & Downloader** sẽ xuất hiện ngay lập tức trên thanh công cụ của Chrome!
7. Bấm vào biểu tượng mảnh ghép (Extensions) trên thanh trình duyệt và ghim (Pin) icon **AudioFlow** để sử dụng tiện lợi.

---

## 🧪 Hướng Dẫn Kiểm Thử (Testing)

Bạn có thể kiểm thử toàn bộ tính năng phát hiện và tải xuống với file kiểm thử mẫu đi kèm:

1. Kéo thả file `test-page/test-audio.html` vào Google Chrome (hoặc mở qua live server / file URL).
2. Bấm vào icon **AudioFlow** trên thanh công cụ:
   - Thấy badge hiển thị số lượng file âm thanh phát hiện trên trang.
   - Thấy danh sách các file MP3, OGG, WAV, video có audio.
3. Bấm nút **Play (▶)** để nghe thử đoạn nhạc trực tiếp qua Mini Player.
4. Bấm nút **Rename (✏️)** để thử đổi tên file trước khi tải.
5. Bấm nút **Download (⬇)** để tải về máy và chuyển sang tab **Đang tải** xem tiến trình thực tế.
6. Vào tab **Thư viện** để tìm kiếm, lọc theo định dạng, và đánh dấu yêu thích.
7. Thử bấm nút **"Chèn Audio Động Vào Trang"** trên trang test để thấy AudioFlow tự động phát hiện audio mới qua `MutationObserver`!

---

## 🔒 Cam Kết Bảo Mật & An Toàn

- **Manifest V3:** Tuân thủ tiêu chuẩn bảo mật mới nhất của Google Chrome.
- **Quyền riêng tư tuyệt đối:** Không gửi bất kỳ dữ liệu, URL hay lịch sử lướt web nào đến server bên ngoài. Toàn bộ thông tin được xử lý và lưu trữ cục bộ (`chrome.storage.local`).
- **An toàn hiệu năng:** Bộ quét thông minh có cơ chế debounce, không chạy vòng lặp liên tục, tiết kiệm CPU và bộ nhớ RAM của người dùng.
- **Tuân thủ bản quyền:** Không giải mã luồng DRM, không can thiệp trái phép vào các dịch vụ có bảo vệ bản quyền.

