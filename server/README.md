# ShopCar API

Backend cho showroom ô tô ShopCar: danh sách xe với bộ lọc, tài khoản khách hàng, đặt hàng qua giỏ
hàng (có hoặc không cần tài khoản) với giữ xe 24 giờ, đặt cọc online, liên hệ, trang quản trị, chat thời gian thực
giữa khách hàng với showroom và trợ lý tự động trả lời khi không có nhân viên online.
Tài liệu kiến trúc đầy đủ: [../structure.md](../structure.md).

**Công nghệ:** Node.js 20+, Express 5, MongoDB (Mongoose 8), Socket.IO, Zod, bcrypt, JWT, sharp.

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
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | tài khoản **chủ** (quản trị viên). Bắt buộc khi chạy production (mật khẩu ít nhất 8 ký tự). Mỗi lần khởi động, server tạo tài khoản nếu chưa có, hoặc cập nhật tên và mật khẩu theo `.env` (đăng xuất phiên cũ); tài khoản nhân viên không bị đụng tới |
| `DEMO_PASSWORD` | mật khẩu các tài khoản khách hàng mẫu (như `demo`), áp dụng khi chạy `npm run seed` |

Các lệnh khác:

```bash
npm run db:check   # kiểm tra kết nối tới MONGODB_URI (không in mật khẩu)
npm run seed       # xóa và tạo lại dữ liệu mẫu (tắt server dev trước)
                   # chỉ chạy thẳng trên MongoDB của máy dev; database ngoài (Atlas) phải thêm -- --remote
                   # và gõ lại tên database; NODE_ENV=production thì luôn bị chặn
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

### Giữ xe và trợ lý tự động

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `ORDER_HOLD_HOURS` | `24` | Đơn chưa đặt cọc chỉ giữ xe trong số giờ này; quá hạn thì tự hủy và trả xe về kho (kiểm tra mỗi phút) |
| `CHATBOT` | bật | Đặt `off` để tắt trợ lý tự động trả lời chat khi không có nhân viên online |

Địa chỉ, hotline và giờ mở cửa mà trợ lý tự động trả lời nằm trong `src/config.js` (`showroom`).

## Cấu trúc thư mục

```
index.js              khởi động: cơ sở dữ liệu, dữ liệu mẫu, server HTTP + Socket.IO
src/app.js            ứng dụng Express: API, ảnh (/uploads), hai web đã build (/ và /admin)
src/config.js         cấu hình từ biến môi trường
src/constants.js      các mã dùng chung (nhiên liệu, trạng thái đơn, trạng thái thanh toán...)
src/db.js             kết nối MongoDB, tự khởi động MongoDB trên máy khi phát triển
src/models/           schema Mongoose (Admin, Customer, Brand, Car, Order, Contact, Conversation, Message)
src/routes/           public.js, customer.js, orders.js (đơn không đăng nhập), chat.js (chat không đăng nhập),
                      admin.js, payment.js, schemas.js (schema Zod dùng chung)
src/services/         tìm xe, đơn hàng + giữ xe, chat, trợ lý tự động (bot.js), thanh toán
src/socket.js         Socket.IO: xác thực, phòng, chat, theo dõi đơn
src/realtime.js       phát sự kiện (đơn, tồn kho, có nhân viên online không) từ mọi nơi trong server
src/middleware/       xác thực (JWT + vai trò), xử lý lỗi, tải ảnh lên
src/utils/            mật khẩu/token, email, ảnh (GridFS), slug, tìm xe (bỏ dấu, tách từ khóa), chữ ký VNPay, thông báo lỗi tiếng Việt
scripts/dev.js        npm run dev: một MongoDB trên máy + API tự khởi động lại
scripts/seed.js       dữ liệu mẫu (xe được tạo ảnh minh họa)
scripts/upload-images.js  chép ảnh cũ từ server/uploads vào database
```

## API

Mọi phản hồi đều là JSON. Lỗi có dạng `{ "message": "...", "errors": [{ "field", "message" }] }`.
Các yêu cầu cần đăng nhập gửi kèm header `Authorization: Bearer <token>`.

### Công khai
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/api/cars` | danh sách xe: `q, brand, fuel, transmission, bodyType, condition, minPrice, maxPrice, minYear, maxYear, inStock, sort (newest, price_asc, price_desc, name_asc, year_desc, popular), page, limit` |
| GET | `/api/cars/featured` | xe mới về và xe bán chạy |
| GET | `/api/cars/suggest` | `q`: gợi ý khi đang gõ, tối đa 6 xe `{ _id, name, slug, brand, price, stock, image }` kèm `total`; không phân biệt hoa thường, dấu, gạch ("cx5" ra "CX-5"); không bao giờ có xe đã ẩn |
| GET | `/api/cars/filters` | danh sách hãng và khoảng giá trị cho bộ lọc |
| GET | `/api/cars/:slug` | chi tiết xe + các xe liên quan |
| GET | `/api/brands` | tất cả các hãng |
| POST | `/api/contact` | `{ name, phone, email?, message, car? }` để lại lời nhắn (5 lần / 10 phút / IP) |
| GET | `/api/payment/config` | `{ depositPerCar, holdHours, provider: 'vnpay' \| 'demo' }` |
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
| POST | `/orders` | `{ items: [{ car, quantity }], note, payment: 'showroom' \| 'vnpay' }`: giá và tổng tiền do server tính, xe được giữ ngay (`holdUntil`); với `vnpay`, phản hồi có thêm `payUrl` |
| POST | `/orders/:id/pay` | tạo link thanh toán mới cho đơn đang chờ và chưa đặt cọc |
| GET | `/orders`, `/orders/:id` | chỉ đơn hàng của chính mình |
| POST | `/orders/:id/cancel` | khi đơn còn chờ xác nhận và chưa đặt cọc |
| GET | `/chat` | cuộc trò chuyện của mình + tin nhắn |
| POST | `/chat/messages`, `/chat/read` | gửi tin / đánh dấu đã đọc |

### Đặt hàng không cần đăng nhập (`/api/orders`)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| POST | `/` | `{ customerInfo: { name, phone, email }, items, note, payment }` → đơn + `trackToken` (+ `payUrl`); gửi email kèm link theo dõi. 10 đơn / giờ / IP |
| GET | `/:id?token=` | xem đơn bằng mã theo dõi |
| POST | `/:id/pay`, `/:id/cancel` | đặt cọc lại / hủy đơn đang chờ và chưa cọc (gửi kèm `token`) |

### Chat không cần đăng nhập (`/api/chat`)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| POST | `/visitor` | cấp mã khách `{ token }` (30 lần / giờ / IP) |
| GET | `/` | header `X-Visitor-Token`: `{ conversation, messages }` |
| POST | `/read` | header `X-Visitor-Token`: đánh dấu đã đọc |

### Quản trị (`/api/admin`, cần token quản trị trừ khi đăng nhập)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| POST | `/login` | đăng nhập; tài khoản bị khóa trả 403 |
| GET / PUT | `/me` | thông tin và quyền của mình; `PUT` đổi `name`, hoặc `currentPassword` + `newPassword` (≥ 8 ký tự; trả token mới, các phiên khác bị đăng xuất). Tài khoản chủ đổi mật khẩu trong `.env` |
| GET / POST | `/staff` | danh sách tài khoản quản trị / nhân viên; tạo tài khoản `{ username, name, role, password }` (chỉ quản trị viên) |
| PATCH | `/staff/:id` | `{ name?, role?, status?, password? }`: đổi vai trò, tắt / bật (`status: disabled / active`), đặt lại mật khẩu. Không sửa được tài khoản chủ và chính mình |
| DELETE | `/staff/:id` | xóa hẳn tài khoản: đăng xuất ngay, ghi nhật ký `staff.delete`. 403 với tài khoản chủ, 409 khi tự xóa mình hoặc xóa quản trị viên cuối cùng còn hoạt động. Đơn hàng, chat, liên hệ, nhật ký vẫn giữ tên người làm |
| GET | `/audit` | nhật ký thao tác (chỉ quản trị viên), lọc `actor`, `target`, `group`, `action`, `from`, `to`, có phân trang |
| GET | `/stats` | số liệu tổng, doanh thu theo tháng (12 tháng), xe bán chạy, xe sắp hết, tiền cọc (đã nhận / cần hoàn) |
| GET/POST/PUT/DELETE | `/brands` | không xóa được hãng đã có xe (kể cả xe đã ẩn) |
| POST | `/uploads` | multipart `images` (tối đa 12 ảnh) → `[{ url, thumbUrl }]`, chuyển sang WebP |
| GET/POST/PUT | `/cars` | `GET` có thêm `visibility (all, visible, hidden)`; ảnh bị gỡ khỏi xe sẽ bị xóa khỏi database, trừ ảnh đơn hàng cũ còn dùng |
| PATCH | `/cars/:id/visibility` | `{ hidden }`: ẩn xe khỏi web khi ngừng bán / hiện lại. Không có API xóa xe: thông tin xe và đơn cũ luôn được giữ để tra cứu |
| GET | `/orders` | `status, customer, payment (none, pending, paid, failed), q (tên, số điện thoại, email hoặc mã đơn), page, limit` |
| PATCH | `/orders/:id/status` | `APPROVED` (xe đã giữ từ lúc đặt; đơn cũ thì trừ kho lúc này), `CANCELED` trả xe về kho |
| GET | `/customers` | `q, page, limit`; mỗi khách có `orderCount` và `totalSpent` |
| GET | `/customers/:id` | chi tiết khách hàng |
| PATCH | `/customers/:id/status` | `active` / `blocked` (khách bị khóa bị đăng xuất ngay) |
| POST | `/customers/:id/resend-activation` | gửi lại email kích hoạt |
| GET | `/contacts` | lời nhắn liên hệ: `status (new, done), page, limit` |
| PATCH | `/contacts/:id` | `{ status: 'new' \| 'done' }` đánh dấu đã gọi lại |
| GET | `/chats`, `/chats/:id/messages` | danh sách cuộc trò chuyện (kể cả khách vãng lai) / tin nhắn |
| POST | `/chats/with/:customerId` | mở (hoặc tạo) cuộc trò chuyện với một khách hàng |
| POST | `/chats/:id/messages`, `/chats/:id/read` | gửi tin / đánh dấu đã đọc |

### Thời gian thực (Socket.IO)

```js
const socket = io({ auth: { token, role: 'customer' } }); // hoặc role: 'admin'
// khách chưa đăng nhập: io({ auth: { visitor: token } }) để chat, io({ auth: {} }) chỉ để nhận tồn kho / theo dõi đơn
socket.emit('message:send', { text, car /* id xe, không bắt buộc */ }, (ack) => {});
// quản trị viên gửi thêm conversationId
socket.on('message:new', ({ conversationId, conversation, message }) => {}); // message.sender: customer | admin | bot
socket.emit('conversation:read', { conversationId /* chỉ quản trị viên */ });
socket.on('support:status', ({ online }) => {});   // có nhân viên online không (không có thì bot trả lời)
socket.on('chat:typing', ({ typing }) => {});       // trợ lý tự động đang trả lời
socket.emit('order:watch', [{ id, token }], (ack) => {}); // theo dõi đơn bằng mã theo dõi
socket.on('order:updated', (order) => {});          // đơn của mình đổi trạng thái
socket.on('car:stock', ({ car, stock, sold }) => {}); // mọi kết nối
// chỉ quản trị viên nhận
socket.on('order:new', (order) => {});
socket.on('order:paid', (order) => {});
socket.on('contact:new', (contact) => {});
```

## Bảo mật

- Mật khẩu được băm bằng bcrypt; link trong email dùng token ngẫu nhiên dùng một lần, lưu dưới dạng băm SHA-256.
- JWT có ghi vai trò, nên token khách hàng không gọi được API quản trị.
- Trang quản trị phân quyền theo vai trò (`src/permissions.js`): quản trị viên và nhân viên tư vấn. Mỗi route gắn `can('<quyền>')`, thiếu quyền trả 403; khóa tài khoản hoặc đổi mật khẩu có hiệu lực ngay, kể cả kết nối Socket.IO đang mở.
- Truy vết: đơn hàng có `approvedBy` / `canceledBy`, lời nhắn có `handledBy`, tin nhắn của nhân viên có `staffName`. Mã tài khoản nhân viên chỉ lưu trong database, API chỉ trả tên. Mọi thao tác quản trị (trừ chat) ghi vào `AuditLog` qua `src/services/audit.js`; danh sách hành động khai báo trong `src/constants.js` (`AUDIT_ACTIONS`).
- Mật khẩu nhân viên do quản trị viên đặt (tối thiểu 8 ký tự, giống `ADMIN_PASSWORD` của tài khoản chủ) và dùng được ngay, không bắt đổi ở lần đăng nhập đầu. Đặt lại mật khẩu thì các phiên cũ bị đăng xuất.
- Tổng tiền và tồn kho do server quyết định; xe được giữ lúc đặt bằng lệnh cập nhật có điều kiện nên tồn kho không bao giờ bị âm và hai người không thể cùng mua chiếc xe cuối.
- Dữ liệu đầu vào được kiểm tra bằng Zod; giới hạn số lần thử khi đăng nhập, đăng ký, đặt lại mật khẩu, đặt hàng không đăng nhập, liên hệ và chat; API có header bảo mật của Helmet.
- Mã theo dõi đơn và mã khách chat ký HMAC bằng `JWT_SECRET`, không lưu trong cơ sở dữ liệu và không đoán được.
- Kết quả thanh toán VNPay được kiểm tra chữ ký HMAC-SHA512 và số tiền trước khi ghi nhận.
