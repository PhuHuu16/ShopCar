// -- Trợ lý tự động (chatbot theo kịch bản) --
const config = require('../config');
const { Brand, Car, Contact, Message, Order, Conversation } = require('../models');
const { VISIBLE } = require('./cars');
const realtime = require('../realtime');
const chat = require('./chat');

const MAX_CARS = 3;
const INTRO_GAP_MS = 6 * 3600 * 1000;

const MENU = ['Tìm SUV dưới 1,5 tỷ', 'Giờ mở cửa & địa chỉ', 'Đặt lịch lái thử', 'Mua trả góp thế nào?', 'Gặp tư vấn viên'];

// -- Chuẩn hóa: chữ thường, bỏ dấu tiếng Việt --
function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9.,\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const has = (t, pattern) => new RegExp(`(?:^|[^a-z0-9])(?:${pattern})(?=$|[^a-z0-9])`).test(t);
const hasRaw = (raw, pattern) => new RegExp(`(?:^|[^\\p{L}\\d])(?:${pattern})(?=$|[^\\p{L}\\d])`, 'iu').test(String(raw).normalize('NFC'));

function priceText(vnd) {
  if (vnd >= 1e9) return `${(vnd / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ`;
  return `${Math.round(vnd / 1e6).toLocaleString('vi-VN')} triệu`;
}

// -- Đọc khoảng giá: "dưới 1 tỷ", "trên 800tr", "1-1,5 tỷ", "tầm 700 triệu" --
const NUM = '(\\d+(?:[.,]\\d+)?)';
const UNIT = '(ty|trieu|tr|cu)';
const toVnd = (num, unit) => Number(num.replace(',', '.')) * (unit === 'ty' ? 1e9 : 1e6);

function parsePrice(t) {
  const between = t.match(new RegExp(`${NUM}\\s*${UNIT}?\\s*(?:-|den|toi|~)\\s*${NUM}\\s*${UNIT}`));
  if (between) {
    const unitB = between[4];
    const a = toVnd(between[1], between[2] || unitB);
    const b = toVnd(between[3], unitB);
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  const one = t.match(new RegExp(`${NUM}\\s*${UNIT}(?=$|[^a-z])`));
  if (!one) return null;
  const value = toVnd(one[1], one[2]);
  const before = t.slice(0, one.index);
  if (/(duoi|toi da|khong qua|it hon|nho hon|re hon|<)\s*$/.test(before)) return { max: value };
  if (/(tren|hon|lon hon|tu|>)\s*$/.test(before)) return { min: value };
  return { min: Math.round(value * 0.85), max: Math.round(value * 1.15) };
}

const BODY_WORDS = [
  ['ban tai|pickup|pick up', 'pickup'], ['suv|gam cao', 'suv'], ['crossover|cuv', 'crossover'], ['sedan|gam thap', 'sedan'],
  ['hatchback|hatch back', 'hatchback'], ['mpv|xe gia dinh', 'mpv'], ['coupe|the thao', 'coupe']
];
const FUEL_WORDS = [
  ['xe dien|o to dien|oto dien|chay dien|ev|dien(?! thoai)', 'electric'], ['hybrid|hev|lai dien', 'hybrid'],
  ['diesel|may dau|chay dau|xe dau', 'diesel'], ['may xang|chay xang|xang', 'gasoline']
];
const BODY_LABEL = { sedan: 'sedan', suv: 'SUV', crossover: 'crossover', hatchback: 'hatchback', mpv: 'MPV', pickup: 'bán tải', coupe: 'coupe' };
const FUEL_LABEL = { gasoline: 'máy xăng', diesel: 'máy dầu', hybrid: 'hybrid', electric: 'điện' };

// -- Danh mục để nhận ra tên hãng / dòng xe trong câu hỏi --
async function catalog() {
  const [brands, cars] = await Promise.all([
    Brand.find().select('name slug').lean(),
    Car.find(VISIBLE).select('name slug brand').lean()
  ]);
  const brandAliases = brands.map((b) => {
    const name = normalize(b.name);
    const aliases = new Set([name, b.slug.replace(/-/g, ' '), b.slug]);
    const first = name.split(/[\s-]/)[0];
    if (first.length >= 4) aliases.add(first);
    return { brand: b, aliases: [...aliases] };
  });
  const brandWords = new Map(brandAliases.map(({ brand, aliases }) => [String(brand._id), aliases.flatMap((a) => [a, ...a.split(/[\s-]/)])]));
  const models = new Map();
  for (const car of cars) {
    const skip = new Set(brandWords.get(String(car.brand)) || []);
    const tokens = normalize(car.name).split(' ').filter((w) => !skip.has(w));
    if (!tokens.length) continue;
    const key = tokens[0].length >= 3 || !tokens[1] ? tokens[0] : `${tokens[0]} ${tokens[1]}`;
    const variants = new Set([key, key.replace(/[\s-]/g, ''), key.replace(/-/g, ' ')]);
    for (const v of variants) if (v.length >= 2 && !/^\d+$/.test(v)) models.set(v, [...(models.get(v) || []), car._id]);
  }
  return { brandAliases, models };
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function parseCarQuery(t, { brandAliases, models }) {
  const q = {};
  const brands = brandAliases.filter(({ aliases }) => aliases.some((a) => has(t, escape(a)))).map(({ brand }) => brand);
  if (brands.length) q.brands = brands;
  const modelIds = [];
  for (const [key, ids] of models) if (has(t, escape(key))) modelIds.push(...ids);
  if (modelIds.length) q.modelIds = modelIds;
  for (const [words, value] of BODY_WORDS) if (!q.bodyType && has(t, words)) q.bodyType = value;
  for (const [words, value] of FUEL_WORDS) if (!q.fuel && has(t, words)) q.fuel = value;
  if (has(t, 'so san|so tay')) q.transmission = 'manual';
  else if (has(t, 'so tu dong|tu dong')) q.transmission = 'automatic';
  if (has(t, 'xe cu|da qua su dung|da su dung|second hand|secondhand|luot')) q.condition = 'used';
  else if (has(t, 'xe moi|moi 100|moi tinh')) q.condition = 'new';
  const seats = t.match(/(\d{1,2})\s*(?:cho|ghe)(?=$|[^a-z])/);
  if (seats) q.seats = Number(seats[1]);
  const price = parsePrice(t);
  if (price) q.price = price;
  if (has(t, 're nhat|gia re|gia thap|tiet kiem')) q.sort = 'price_asc';
  else if (has(t, 'dat nhat|cao cap|sang nhat|xin nhat')) q.sort = 'price_desc';
  else if (has(t, 'ban chay|pho bien|hot|nhieu nguoi mua')) q.sort = 'popular';
  else if (has(t, 'moi nhat|moi ve')) q.sort = 'newest';
  return q;
}

const SORTS = { price_asc: { price: 1 }, price_desc: { price: -1 }, popular: { sold: -1 }, newest: { createdAt: -1 } };

function describeQuery(q) {
  const parts = [];
  if (q.bodyType) parts.push(BODY_LABEL[q.bodyType]);
  if (q.brands) parts.push(q.brands.map((b) => b.name).join(', '));
  if (q.fuel) parts.push(FUEL_LABEL[q.fuel]);
  if (q.seats) parts.push(`${q.seats} chỗ`);
  if (q.condition) parts.push(q.condition === 'used' ? 'đã qua sử dụng' : 'mới');
  if (q.price?.min && q.price?.max) parts.push(`từ ${priceText(q.price.min)} đến ${priceText(q.price.max)}`);
  else if (q.price?.max) parts.push(`dưới ${priceText(q.price.max)}`);
  else if (q.price?.min) parts.push(`trên ${priceText(q.price.min)}`);
  return parts.join(' · ');
}

function carLine(car) {
  return `• ${car.name}: ${priceText(car.price)} (${car.stock > 0 ? `còn ${car.stock} xe` : 'tạm hết hàng'})`;
}

async function searchCars(q) {
  const filter = { ...VISIBLE };
  if (q.modelIds) filter._id = { $in: q.modelIds };
  if (q.brands) filter.brand = { $in: q.brands.map((b) => b._id) };
  for (const key of ['bodyType', 'fuel', 'transmission', 'condition']) if (q[key]) filter[key] = q[key];
  if (q.seats) filter.seats = q.seats >= 7 ? { $gte: q.seats } : q.seats;
  if (q.price) {
    filter.price = {};
    if (q.price.min) filter.price.$gte = q.price.min;
    if (q.price.max) filter.price.$lte = q.price.max;
  }
  const sort = SORTS[q.sort] || { sold: -1, createdAt: -1 };
  const [inStock, total] = await Promise.all([
    Car.find({ ...filter, stock: { $gt: 0 } }).sort(sort).limit(MAX_CARS),
    Car.countDocuments({ ...filter, stock: { $gt: 0 } })
  ]);
  if (inStock.length || !q.modelIds) return { cars: inStock, total };
  return { cars: await Car.find(filter).limit(MAX_CARS), total: 0 };
}

function searchLink(q) {
  const params = new URLSearchParams();
  if (q.brands?.length === 1) params.set('brand', q.brands[0].slug);
  for (const key of ['bodyType', 'fuel', 'transmission', 'condition']) if (q[key]) params.set(key, q[key]);
  if (q.price?.min) params.set('minPrice', String(q.price.min));
  if (q.price?.max) params.set('maxPrice', String(q.price.max));
  if (q.sort) params.set('sort', q.sort);
  params.set('inStock', 'true');
  return `/cars?${params}`;
}

// -- Số điện thoại / tên khách tự giới thiệu --
function findPhone(raw) {
  const m = String(raw).match(/(?:\+84|0)(?:[\s.-]?\d){8,10}/);
  return m ? m[0].replace(/[\s.-]/g, '') : null;
}

function findName(raw) {
  const m = String(raw).match(/(?:tên (?:tôi|mình|em|anh|chị|con) là|tôi tên|mình tên|em tên|tôi là|mình là|em là|anh là|chị là)\s+([^\d,.!?\n]{2,40})/i);
  if (!m) return null;
  const name = m[1].trim().replace(/\s+/g, ' ');
  return name.split(' ').length <= 4 ? name : null;
}

async function requestCallback(ctx, phone, name) {
  const { conversation = {}, customer } = ctx;
  if (conversation.visitorId) {
    const set = { 'visitor.phone': phone };
    if (name) set['visitor.name'] = name;
    await Conversation.updateOne({ _id: conversation._id }, set);
  }
  const who = name || conversation.visitor?.name || customer?.name || 'Khách chat';
  const recent = await Contact.exists({ phone, createdAt: { $gte: new Date(Date.now() - 3600 * 1000) } });
  let contact = null;
  if (!recent) {
    const asked = conversation._id
      ? await Message.find({ conversation: conversation._id, sender: 'customer' }).sort({ createdAt: -1 }).limit(4).lean()
      : [];
    const history = asked.reverse().map((m) => `- ${m.text}`).join('\n');
    contact = await Contact.create({
      name: who,
      phone,
      email: customer?.email || '',
      message: `Khách để lại số điện thoại qua trợ lý tự động (chat).\n${history}`.slice(0, 2000),
      customer: customer?._id
    });
  }
  return {
    contact,
    reply: {
      text: `Cảm ơn ${name || conversation.visitor?.name || customer?.name || 'bạn'}! Mình đã ghi lại số ${phone}. Tư vấn viên sẽ gọi lại cho bạn sớm nhất trong giờ làm việc (${config.showroom.hours}).`,
      quickReplies: ['Xem xe đang có', 'Giờ mở cửa & địa chỉ']
    }
  };
}

const ORDER_LABEL = { PENDING: 'chờ xác nhận', APPROVED: 'đã xác nhận', CANCELED: 'đã hủy' };

async function orderReply(customer) {
  if (!customer) {
    return {
      text: 'Bạn xem đơn đặt không cần đăng nhập ở mục "Đơn hàng của tôi" trên máy đã đặt, hoặc mở link theo dõi trong email xác nhận. Cần hỗ trợ thêm, bạn để lại số điện thoại để tư vấn viên gọi lại nhé.',
      link: { label: 'Đơn hàng của tôi', to: '/orders' }
    };
  }
  const orders = await Order.find({ customer: customer._id }).sort({ createdAt: -1 }).limit(3).lean();
  if (!orders.length) return { text: 'Tài khoản của bạn chưa có đơn hàng nào.', link: { label: 'Chọn xe', to: '/cars' } };
  const lines = orders.map((o) => {
    const code = `#${String(o._id).slice(-6).toUpperCase()}`;
    const hold = o.status === 'PENDING' && o.holdUntil && o.payment?.status !== 'paid'
      ? `, giữ xe đến ${new Date(o.holdUntil).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}`
      : '';
    return `• Đơn ${code} (${o.items.map((i) => i.name).join(', ')}): ${ORDER_LABEL[o.status]}${o.payment?.status === 'paid' ? ', đã đặt cọc' : ''}${hold}`;
  });
  return { text: `Đơn gần đây của bạn:\n${lines.join('\n')}`, link: { label: 'Xem chi tiết', to: '/orders' } };
}

function carInfo(car) {
  return {
    text: `${car.name} giá niêm yết ${priceText(car.price)}. ${car.stock > 0 ? `Showroom còn ${car.stock} xe, bạn có thể đặt online và được giữ xe ${config.payment.holdHours} giờ.` : 'Xe đang tạm hết hàng, bạn để lại số điện thoại để được báo khi có xe nhé.'}`,
    cars: [car._id],
    link: { label: 'Xem chi tiết xe', to: `/cars/${car.slug}` },
    quickReplies: ['Mua trả góp thế nào?', 'Đặt lịch lái thử', 'Gặp tư vấn viên']
  };
}

// -- Trả lời một tin nhắn. ctx: { conversation, customer, carId } --
async function answer(rawText, ctx = {}) {
  const t = normalize(rawText);
  const { showroom } = config;

  const phone = findPhone(rawText);
  const name = findName(rawText);
  if (phone) return requestCallback(ctx, phone, name);
  if (name && ctx.conversation?.visitorId) {
    await Conversation.updateOne({ _id: ctx.conversation._id }, { 'visitor.name': name });
    return { reply: { text: `Chào ${name}! Bạn cho mình xin số điện thoại để tư vấn viên gọi lại, hoặc cứ hỏi mình về xe nhé.`, quickReplies: MENU.slice(0, 3) } };
  }

  if (has(t, 'nhan vien|tu van vien|nguoi that|gap nguoi|gap ai|goi lai|goi cho|goi dien|hotline|sdt|so dien thoai|lien he|cskh|cham soc khach hang')) {
    return {
      reply: {
        text: `Hiện chưa có tư vấn viên trực tuyến. Bạn gửi số điện thoại ngay tại đây, tư vấn viên sẽ gọi lại cho bạn. Cần gấp, bạn gọi hotline ${showroom.hotline} (${showroom.hours}).`,
        quickReplies: ['Xem xe đang có', 'Giờ mở cửa & địa chỉ']
      }
    };
  }

  if (has(t, 'cam on|thank|thanks|tks|cam ta')) {
    return { reply: { text: 'Không có gì ạ! Bạn cần gì thêm cứ nhắn mình nhé 😊', quickReplies: MENU.slice(0, 3) } };
  }

  if (has(t, 'don hang|don cua|kiem tra don|trang thai don|ma don|don dat|da dat')) return { reply: await orderReply(ctx.customer) };

  if (has(t, 'gio mo cua|mo cua|dong cua|may gio|gio lam viec|lam viec|dia chi|o dau|cho nao|chi duong|ban do|showroom o|ghe tham|ghe showroom')) {
    return {
      reply: {
        text: `Showroom ShopCar:\n• Địa chỉ: ${showroom.address}\n• Giờ mở cửa: ${showroom.hours}\n• Hotline: ${showroom.hotline}`,
        link: { label: 'Xem bản đồ', to: '/contact' },
        quickReplies: ['Đặt lịch lái thử', 'Xem xe đang có']
      }
    };
  }

  if (has(t, 'lai thu|chay thu|test drive|thu xe')) {
    return {
      reply: {
        text: `Lái thử miễn phí tại showroom (${showroom.hours}). Bạn mang theo bằng lái hạng B, và gửi mình số điện thoại + mẫu xe muốn thử để tư vấn viên gọi hẹn giờ nhé.`,
        quickReplies: ['Xem xe đang có', 'Giờ mở cửa & địa chỉ']
      }
    };
  }

  const typedWithAccents = /[̀-ͯđĐ]/.test(String(rawText).normalize('NFD'));
  if (has(t, 'tra gop|mua gop|lai suat|tra truoc|ngan hang|vay von|cho vay|vay tien|vay mua|vay ngan hang')
    || hasRaw(rawText, 'góp') || (typedWithAccents && hasRaw(rawText, 'vay'))) {
    const car = ctx.carId ? await Car.findById(ctx.carId) : null;
    return {
      reply: {
        text: 'Showroom hỗ trợ trả góp qua ngân hàng đối tác: trả trước từ 20%, thời hạn 12 đến 96 tháng, lãi tính trên dư nợ giảm dần. Trên mỗi trang xe có công cụ tính số tiền trả mỗi tháng. Để có lãi suất chính xác, bạn để lại số điện thoại nhé.',
        link: car ? { label: `Tính trả góp ${car.name}`, to: `/cars/${car.slug}` } : { label: 'Chọn xe để tính trả góp', to: '/cars' },
        quickReplies: ['Gặp tư vấn viên', 'Tìm xe dưới 1 tỷ']
      }
    };
  }

  if (has(t, 'dat coc|tien coc|coc|thanh toan|vnpay|chuyen khoan|giu xe|dat xe|dat mua|mua online')) {
    return {
      reply: {
        text: `Bạn đặt xe ngay trên web, không cần tài khoản. Xe được giữ ${config.payment.holdHours} giờ; đặt cọc online qua VNPay ${priceText(config.payment.depositPerCar)} mỗi xe để giữ xe đến khi nhận (tiền cọc trừ vào giá xe). Phần còn lại thanh toán khi nhận xe tại showroom.`,
        link: { label: 'Xem xe đang có', to: '/cars?inStock=true' },
        quickReplies: ['Mua trả góp thế nào?', 'Gặp tư vấn viên']
      }
    };
  }

  const q = parseCarQuery(t, await catalog());
  const asksCar = Object.keys(q).length > 0;
  if (!asksCar && ctx.carId) {
    const car = await Car.findOne({ _id: ctx.carId, ...VISIBLE });
    if (car) return { reply: carInfo(car) };
  }
  if (asksCar || has(t, 'xe|mau xe|tim xe|goi y|tu van|con hang|co xe|gia')) {
    if (!asksCar && !has(t, 'xe|mau|con hang|co xe')) {
      return { reply: { text: 'Bạn muốn hỏi giá mẫu xe nào ạ? Ví dụ: "giá Vios", "SUV 7 chỗ dưới 1,5 tỷ".', quickReplies: ['Xem xe đang có', 'Tìm SUV dưới 1,5 tỷ'] } };
    }
    const { cars, total } = await searchCars(q);
    if (q.modelIds && cars.length === 1) return { reply: carInfo(cars[0]) };
    const what = describeQuery(q);
    if (!cars.length) {
      return {
        reply: {
          text: `Hiện showroom chưa có xe ${what || 'phù hợp'} còn hàng. Bạn thử nới khoảng giá, hoặc để lại số điện thoại để được báo khi có xe nhé.`,
          link: { label: 'Xem tất cả xe', to: '/cars' },
          quickReplies: ['Xem xe đang có', 'Gặp tư vấn viên']
        }
      };
    }
    const head = total > cars.length
      ? `Có ${total} xe ${what ? `${what} ` : ''}còn hàng, đây là ${cars.length} gợi ý:`
      : `Mình tìm thấy ${cars.length} xe ${what ? `${what} ` : ''}còn hàng:`;
    return {
      reply: {
        text: `${head}\n${cars.map(carLine).join('\n')}`,
        cars: cars.map((c) => c._id),
        link: { label: total > cars.length ? `Xem cả ${total} xe` : 'Xem trên trang mua xe', to: q.modelIds ? '/cars' : searchLink(q) },
        quickReplies: ['Mua trả góp thế nào?', 'Đặt lịch lái thử', 'Gặp tư vấn viên']
      }
    };
  }

  if (has(t, 'xin chao|chao|hello|hi|alo|hey|helo') || t.length <= 3) {
    return { reply: { text: 'Xin chào! Mình có thể giúp bạn tìm xe, báo giá, hẹn lái thử hoặc giải đáp về trả góp, đặt cọc.', quickReplies: MENU } };
  }

  return {
    reply: {
      text: 'Xin lỗi, mình chưa hiểu câu hỏi. Bạn có thể hỏi kiểu "SUV 7 chỗ dưới 1,5 tỷ", "giá Vios", "giờ mở cửa"... hoặc để lại số điện thoại để tư vấn viên gọi lại nhé.',
      quickReplies: MENU
    }
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// -- Gọi sau mỗi tin của khách: chỉ trả lời khi không có nhân viên online --
async function handle(io, conversation, message, { customer } = {}) {
  if (!config.bot.enabled || !io || realtime.supportOnline()) return null;
  const typing = (on) => chat.customerRooms(io, conversation).emit('chat:typing', { conversationId: String(conversation._id), typing: on });
  typing(true);
  try {
    if (config.bot.delayMs) await sleep(config.bot.delayMs);
    if (realtime.supportOnline()) return null;
    const fresh = (await Conversation.findById(conversation._id)) || conversation;
    const { reply, contact } = await answer(message.text, { conversation: fresh, customer, carId: message.car?._id || message.car });
    const introduced = await Message.exists({ conversation: conversation._id, sender: 'bot', createdAt: { $gte: new Date(Date.now() - INTRO_GAP_MS) } });
    if (!introduced) reply.text = `🤖 Hiện tư vấn viên đang offline, mình là trợ lý tự động của ShopCar.\n${reply.text}`;
    const result = await chat.saveBotMessage(fresh, reply);
    chat.broadcast(io, result.conversation, result.message);
    if (contact) {
      await contact.populate('car', 'name slug price images');
      realtime.toAdmins('contact:new', contact);
    }
    return result.message;
  } finally {
    typing(false);
  }
}

function respond(io, conversation, message, who) {
  return handle(io, conversation, message, who).catch((err) => {
    console.error('[bot]', err);
    return null;
  });
}

module.exports = { answer, respond, normalize, parsePrice, priceText, MENU };
