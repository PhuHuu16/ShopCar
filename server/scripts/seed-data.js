// Demo data for development and portfolio screenshots.
// Prices are rough Vietnamese market prices (VND) for illustration only.

const BRANDS = [
  { name: 'Toyota', color: '#b91c1c' },
  { name: 'Honda', color: '#1d4ed8' },
  { name: 'Mazda', color: '#475569' },
  { name: 'Hyundai', color: '#0f4c81' },
  { name: 'Kia', color: '#be123c' },
  { name: 'Ford', color: '#1e3a8a' },
  { name: 'VinFast', color: '#0e7490' },
  { name: 'Mercedes-Benz', color: '#334155' }
];

// [brand, name, year, price, fuel, transmission, bodyType, seats, color, condition, mileage, stock]
const CARS = [
  ['Toyota', 'Toyota Vios 1.5G CVT', 2024, 545000000, 'gasoline', 'automatic', 'sedan', 5, 'Trắng', 'new', 0, 4],
  ['Toyota', 'Toyota Camry 2.5HEV Top', 2024, 1530000000, 'hybrid', 'automatic', 'sedan', 5, 'Đen', 'new', 0, 2],
  ['Toyota', 'Toyota Fortuner 2.4AT 4x2', 2024, 1055000000, 'diesel', 'automatic', 'suv', 7, 'Bạc', 'new', 0, 3],
  ['Toyota', 'Toyota Innova 2.0E', 2019, 520000000, 'gasoline', 'manual', 'mpv', 8, 'Xám', 'used', 68000, 1],
  ['Honda', 'Honda City RS', 2024, 609000000, 'gasoline', 'automatic', 'sedan', 5, 'Đỏ', 'new', 0, 5],
  ['Honda', 'Honda CR-V e:HEV RS', 2024, 1259000000, 'hybrid', 'automatic', 'suv', 5, 'Trắng', 'new', 0, 2],
  ['Honda', 'Honda Civic RS', 2022, 760000000, 'gasoline', 'automatic', 'sedan', 5, 'Xanh dương', 'used', 32000, 1],
  ['Mazda', 'Mazda CX-5 2.0 Premium', 2024, 829000000, 'gasoline', 'automatic', 'crossover', 5, 'Đỏ', 'new', 0, 4],
  ['Mazda', 'Mazda3 1.5 Premium Sedan', 2024, 739000000, 'gasoline', 'automatic', 'sedan', 5, 'Xám', 'new', 0, 3],
  ['Hyundai', 'Hyundai Accent 1.5 AT Đặc biệt', 2024, 569000000, 'gasoline', 'automatic', 'sedan', 5, 'Trắng', 'new', 0, 6],
  ['Hyundai', 'Hyundai Santa Fe 2.5 Calligraphy', 2025, 1365000000, 'gasoline', 'automatic', 'suv', 7, 'Đen', 'new', 0, 2],
  ['Kia', 'Kia Seltos 1.5 Premium', 2024, 699000000, 'gasoline', 'automatic', 'crossover', 5, 'Cam', 'new', 0, 3],
  ['Kia', 'Kia Carnival 2.2D Signature', 2024, 1589000000, 'diesel', 'automatic', 'mpv', 7, 'Đen', 'new', 0, 1],
  ['Ford', 'Ford Ranger Wildtrak 2.0 4x4', 2024, 979000000, 'diesel', 'automatic', 'pickup', 5, 'Cam', 'new', 0, 3],
  ['Ford', 'Ford Everest Titanium+ 4x4', 2024, 1468000000, 'diesel', 'automatic', 'suv', 7, 'Bạc', 'new', 0, 2],
  ['VinFast', 'VinFast VF 5 Plus', 2024, 529000000, 'electric', 'automatic', 'crossover', 5, 'Xanh dương', 'new', 0, 5],
  ['VinFast', 'VinFast VF 8 Plus', 2024, 1199000000, 'electric', 'automatic', 'suv', 5, 'Trắng', 'new', 0, 2],
  ['Mercedes-Benz', 'Mercedes-Benz C 300 AMG', 2024, 2099000000, 'gasoline', 'automatic', 'sedan', 5, 'Đen', 'new', 0, 1]
];

const CUSTOMERS = [
  { username: 'demo', name: 'Nguyễn Văn An', phone: '0901234567', email: 'demo@shopcar.local' },
  { username: 'tranbinh', name: 'Trần Thị Bình', phone: '0912345678', email: 'binh@shopcar.local' },
  { username: 'lecuong', name: 'Lê Minh Cường', phone: '0923456789', email: 'cuong@shopcar.local' },
  { username: 'phamdung', name: 'Phạm Thu Dung', phone: '0934567890', email: 'dung@shopcar.local' },
  { username: 'hoangem', name: 'Hoàng Văn Em', phone: '0945678901', email: 'em@shopcar.local' },
  { username: 'vophuong', name: 'Võ Thị Phương', phone: '0956789012', email: 'phuong@shopcar.local' },
  { username: 'danggiang', name: 'Đặng Hữu Giang', phone: '0967890123', email: 'giang@shopcar.local' },
  { username: 'buihoa', name: 'Bùi Ngọc Hoa', phone: '0978901234', email: 'hoa@shopcar.local' }
];

const BODY_LABELS = { sedan: 'sedan', suv: 'SUV', crossover: 'crossover', hatchback: 'hatchback', mpv: 'MPV', pickup: 'bán tải', coupe: 'coupe' };
const FUEL_LABELS = { gasoline: 'máy xăng', diesel: 'máy dầu', hybrid: 'hybrid', electric: 'thuần điện' };

function describe(car) {
  const used = car.condition === 'used'
    ? ` Xe đã qua sử dụng, đi ${car.mileage.toLocaleString('vi-VN')} km, bảo dưỡng định kỳ đầy đủ tại hãng.`
    : ' Xe mới 100%, bảo hành chính hãng.';
  return `${car.name} đời ${car.year} là mẫu ${BODY_LABELS[car.bodyType]} ${car.seats} chỗ, ${FUEL_LABELS[car.fuel]}, `
    + `hộp số ${car.transmission === 'automatic' ? 'tự động' : 'sàn'}, màu ${car.color.toLowerCase()}.${used}\n\n`
    + 'Showroom hỗ trợ lái thử tận nơi, trả góp đến 80% giá trị xe và thủ tục đăng ký trọn gói. '
    + 'Nhắn tin trực tiếp cho chúng tôi để nhận báo giá lăn bánh mới nhất.';
}

module.exports = { BRANDS, CARS, CUSTOMERS, describe };
