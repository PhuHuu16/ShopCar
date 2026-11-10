# ShopCar API

Backend cho showroom ô tô ShopCar: danh sách xe với bộ lọc, tài khoản khách hàng, đặt hàng qua giỏ
hàng có kiểm soát tồn kho, đặt cọc online, trang quản trị và chat thời gian thực giữa khách hàng với showroom.

**Công nghệ:** Node.js 20+, Express 5, MongoDB (Mongoose 8), Socket.IO, Zod, bcrypt, JWT, sharp, Node test runner.

## Chạy server

```bash
cd server
npm install
npm run dev        # http://localhost:3000
```

Không cần cài cơ sở dữ liệu khi phát triển: nếu `MONGODB_URI` để trống, `npm run dev` tự khởi động
một MongoDB trên máy (dữ liệu lưu ở `server/.data/`) và thêm dữ liệu mẫu ở lần chạy đầu tiên.
API tự khởi động lại khi sửa code, còn MongoDB vẫn chạy tiếp.

Tài khoản đăng nhập được đặt trong `server/.env`, không ghi trong mã nguồn hay tài liệu:

| Biến | Dùng cho |
|---|---|
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | tài khoản quản trị. Bắt buộc khi chạy production (mật khẩu ít nhất 8 ký tự). Mỗi lần khởi động, server tạo tài khoản nếu chưa có, hoặc cập nhật tên và mật khẩu theo `.env` |
| `DEMO_PASSWORD` | mật khẩu các tài khoản khách hàng mẫu (như `demo`), áp dụng khi chạy `npm run seed` |

Các lệnh khác:

```bash
npm test           # test API và chat trên một cơ sở dữ liệu tạm
npm run db:check   # kiểm tra kết nối tới MONGODB_URI (không in mật khẩu)
npm run seed       # xóa và tạo lại dữ liệu mẫu (tắt server dev trước)
npm start          # chạy production (cần MONGODB_URI và JWT_SECRET)
```

Cấu hình nằm trong `server/.env` (xem `.env.example`). Nếu không có `EMAIL_USER`/`EMAIL_PASS`,
các email như link kích hoạt tài khoản sẽ được in ra console.

### Đặt cọc online (VNPay)

Khi chưa có `VNPAY_TMN_CODE` / `VNPAY_HASH_SECRET`, API chuyển khách sang một trang thanh toán thử
nghiệm tại `/api/payment/demo-gateway`, được ký giống hệt VNPay, nên có thể chạy thử toàn bộ luồng
ngay trên máy. Để dùng VNPay sandbox thật:

1. Đăng ký tài khoản merchant thử nghiệm tại <https://sandbox.vnpayment.vn/devreg/>, rồi chép
   mã TMN và chuỗi bí mật (hash secret) vào `.env`.
2. Trong trang quản lý merchant, đặt địa chỉ IPN là `https://<tên-miền>/api/payment/vnpay/ipn`
   (VNPay phải truy cập được địa chỉ này từ internet; trang kết quả cũng xác nhận thanh toán).
3. `CLIENT_URL` phải là địa chỉ web khách hàng: VNPay đưa khách quay về `CLIENT_URL/payment/result`.

Tiền cọc là `DEPOSIT_PER_CAR` (mặc định 10.000.000 đ) cho mỗi xe, không bao giờ vượt quá tổng tiền đơn hàng.

## Cấu trúc thư mục

```
index.js              khởi động: cơ sở dữ liệu, dữ liệu mẫu, server HTTP + Socket.IO
src/app.js            ứng dụng Express: API, ảnh (/uploads), hai web đã build (/ và /admin)
src/config.js         cấu hình từ biến môi trường
src/constants.js      các mã dùng chung (nhiên liệu, trạng thái đơn, trạng thái thanh toán...)
src/db.js             kết nối MongoDB, tự khởi động MongoDB trên máy khi phát triển
src/models/           schema Mongoose (Admin, Customer, Brand, Car, Order, Conversation, Message)
src/routes/           public.js, customer.js, admin.js, payment.js
src/services/         tìm xe, đơn hàng + tồn kho, chat, thanh toán
src/socket.js         chat thời gian thực
src/middleware/       xác thực (JWT + vai trò), xử lý lỗi, tải ảnh lên
src/utils/            mật khẩu/token, email, ảnh (GridFS), slug, chữ ký VNPay, thông báo lỗi tiếng Việt
scripts/dev.js        npm run dev: một MongoDB trên máy + API tự khởi động lại
scripts/seed.js       dữ liệu mẫu (xe được tạo ảnh minh họa)
scripts/upload-images.js  chép ảnh cũ từ server/uploads vào database
test/                 node:test + supertest + socket.io-client
```

## API

Mọi phản hồi đều là JSON. Lỗi có dạng `{ "message": "...", "errors": [{ "field", "message" }] }`.
Các yêu cầu cần đăng nhập gửi kèm header `Authorization: Bearer <token>`.

### Công khai
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/api/cars` | danh sách xe: `q, brand, fuel, transmission, bodyType, condition, minPrice, maxPrice, minYear, maxYear, inStock, sort (newest, price_asc, price_desc, name_asc, year_desc, popular), page, limit` |
| GET | `/api/cars/featured` | xe mới về và xe bán chạy |
| GET | `/api/cars/filters` | danh sách hãng và khoảng giá trị cho bộ lọc |
| GET | `/api/cars/:slug` | chi tiết xe + các xe liên quan |
| GET | `/api/brands` | tất cả các hãng |
| GET | `/api/payment/config` | `{ depositPerCar, provider: 'vnpay' \| 'demo' }` |
| GET | `/api/payment/vnpay/return` | web chuyển kết quả từ VNPay về đây; kiểm tra chữ ký và ghi nhận kết quả |
| GET | `/api/payment/vnpay/ipn` | VNPay gọi trực tiếp để xác nhận thanh toán, trả về `{ RspCode, Message }` |

### Khách hàng (`/api/customer`)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| POST | `/signup` | đăng ký, gửi email kích hoạt |
| POST | `/activate` | `{ id, token }` lấy từ link trong email |
| POST | `/resend-activation` | `{ email }` |
| POST | `/login` | trả về `{ token, customer }` |
| POST | `/forgot-password` | `{ email }`, link có hiệu lực 30 phút |
| POST | `/reset-password` | `{ id, token, password }` |
| GET / PUT | `/me` | thông tin cá nhân; đổi mật khẩu cần `currentPassword` |
| POST | `/orders` | `{ items: [{ car, quantity }], note, payment: 'showroom' \| 'vnpay' }`: giá và tổng tiền do server tính; với `vnpay`, phản hồi có thêm `payUrl` |
| POST | `/orders/:id/pay` | tạo link thanh toán mới cho đơn đang chờ và chưa đặt cọc |
| GET | `/orders`, `/orders/:id` | chỉ đơn hàng của chính mình |
| POST | `/orders/:id/cancel` | khi đơn còn chờ xác nhận và chưa đặt cọc |
| GET | `/chat` | cuộc trò chuyện của mình + tin nhắn |
| POST | `/chat/messages`, `/chat/read` | gửi tin / đánh dấu đã đọc |

### Quản trị (`/api/admin`, cần token quản trị trừ khi đăng nhập)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| POST | `/login` | đăng nhập |
| GET | `/stats` | số liệu tổng, doanh thu theo tháng (12 tháng), xe bán chạy, xe sắp hết, tiền cọc (đã nhận / cần hoàn) |
| GET/POST/PUT/DELETE | `/brands` | không xóa được hãng vẫn còn xe |
| POST | `/uploads` | multipart `images` (tối đa 12 ảnh) → `[{ url, thumbUrl }]`, chuyển sang WebP |
| GET/POST/PUT/DELETE | `/cars` | ảnh bị gỡ khỏi xe sẽ bị xóa khỏi database |
| GET | `/orders` | `status, customer, payment (none, pending, paid, failed), q (tên, số điện thoại, email hoặc mã đơn), page, limit` |
| PATCH | `/orders/:id/status` | `APPROVED` trừ kho, hủy đơn đã xác nhận thì trả lại kho |
| GET | `/customers` | `q, page, limit`; mỗi khách có `orderCount` và `totalSpent` |
| GET | `/customers/:id` | chi tiết khách hàng |
| PATCH | `/customers/:id/status` | `active` / `blocked` (khách bị khóa bị đăng xuất ngay) |
| POST | `/customers/:id/resend-activation` | gửi lại email kích hoạt |
| GET | `/chats`, `/chats/:id/messages` | danh sách cuộc trò chuyện / tin nhắn |
| POST | `/chats/with/:customerId` | mở (hoặc tạo) cuộc trò chuyện với một khách hàng |
| POST | `/chats/:id/messages`, `/chats/:id/read` | gửi tin / đánh dấu đã đọc |

### Chat thời gian thực (Socket.IO)

```js
const socket = io({ auth: { token, role: 'customer' } }); // hoặc role: 'admin'
socket.emit('message:send', { text, car /* id xe, không bắt buộc */ }, (ack) => {});
// quản trị viên gửi thêm conversationId
socket.on('message:new', ({ conversationId, conversation, message }) => {});
socket.emit('conversation:read', { conversationId /* chỉ quản trị viên */ });
// chỉ quản trị viên nhận
socket.on('order:new', (order) => {});
socket.on('order:paid', (order) => {});
```

## Bảo mật

- Mật khẩu được băm bằng bcrypt; link trong email dùng token ngẫu nhiên dùng một lần, lưu dưới dạng băm SHA-256.
- JWT có ghi vai trò, nên token khách hàng không gọi được API quản trị.
- Tổng tiền và tồn kho do server quyết định; xác nhận đơn dùng lệnh cập nhật có điều kiện nên tồn kho không bao giờ bị âm.
- Dữ liệu đầu vào được kiểm tra bằng Zod; giới hạn số lần thử khi đăng nhập, đăng ký và đặt lại mật khẩu; API có header bảo mật của Helmet.
- Kết quả thanh toán VNPay được kiểm tra chữ ký HMAC-SHA512 và số tiền trước khi ghi nhận.
