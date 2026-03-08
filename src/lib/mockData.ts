export const companyProfile = {
  name: 'Công ty TNHH Đức Phát Foods',
  industry: 'F&B & Nhà hàng',
  province: 'TP. Hồ Chí Minh',
  yearsOperating: 4,
  employees: 45,
  monthlyRevenue: 8_320_000_000,
  creditScore: 782,
  creditLimit: 5_000_000_000,
  taxId: '0312345678',
  plan: 'Growth',
};

export const cashFlowData = [
  { month: 'T04', income: 7200, expense: 5800, net: 1400 },
  { month: 'T05', income: 6800, expense: 6200, net: 600 },
  { month: 'T06', income: 7500, expense: 5500, net: 2000 },
  { month: 'T07', income: 6200, expense: 5900, net: 300 },
  { month: 'T08', income: 7800, expense: 6100, net: 1700 },
  { month: 'T09', income: 8100, expense: 6500, net: 1600 },
  { month: 'T10', income: 9200, expense: 7100, net: 2100 },
  { month: 'T11', income: 8800, expense: 7500, net: 1300 },
  { month: 'T12', income: 11200, expense: 9800, net: 1400 },
  { month: 'T01', income: 5500, expense: 8200, net: -2700 },
  { month: 'T02', income: 7200, expense: 6100, net: 1100 },
  { month: 'T03', income: 8320, expense: 6400, net: 1920 },
].map(d => ({ ...d, income: d.income * 1_000_000, expense: d.expense * 1_000_000, net: d.net * 1_000_000 }));

export const miniChartData = [
  { d: 1, v: 2720 }, { d: 2, v: 2680 }, { d: 3, v: 2750 },
  { d: 4, v: 2790 }, { d: 5, v: 2848 },
];

type InvoiceStatus = 'pending' | 'overdue' | 'paid' | 'advanced';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  issuedDate: string;
  dueDate: string;
  amount: number;
  vatRate: number;
  total: number;
  status: InvoiceStatus;
  advancedAmount?: number;
}

export const invoices: Invoice[] = [
  { id: '1', invoiceNumber: 'INV-2847', clientName: 'Highlands Coffee', issuedDate: '2026-03-01', dueDate: '2026-03-15', amount: 43636364, vatRate: 10, total: 48_000_000, status: 'pending' },
  { id: '2', invoiceNumber: 'INV-2846', clientName: 'Vinmart B2B', issuedDate: '2026-02-25', dueDate: '2026-03-10', amount: 112727273, vatRate: 10, total: 124_000_000, status: 'overdue' },
  { id: '3', invoiceNumber: 'INV-2845', clientName: 'Lotteria Vietnam', issuedDate: '2026-02-20', dueDate: '2026-03-05', amount: 61363636, vatRate: 10, total: 67_500_000, status: 'advanced', advancedAmount: 54_000_000 },
  { id: '4', invoiceNumber: 'INV-2844', clientName: 'Circle K Vietnam', issuedDate: '2026-02-18', dueDate: '2026-03-18', amount: 81818182, vatRate: 10, total: 90_000_000, status: 'pending' },
  { id: '5', invoiceNumber: 'INV-2843', clientName: 'GS25 Franchise', issuedDate: '2026-02-15', dueDate: '2026-03-01', amount: 200000000, vatRate: 10, total: 220_000_000, status: 'paid' },
  { id: '6', invoiceNumber: 'INV-2842', clientName: 'Công ty XNK Hải Phong', issuedDate: '2026-02-10', dueDate: '2026-02-28', amount: 318181818, vatRate: 10, total: 350_000_000, status: 'overdue' },
  { id: '7', invoiceNumber: 'INV-2841', clientName: 'ABC Corp', issuedDate: '2026-02-05', dueDate: '2026-02-25', amount: 136363636, vatRate: 10, total: 150_000_000, status: 'overdue' },
  { id: '8', invoiceNumber: 'INV-2840', clientName: 'Phúc Long Coffee', issuedDate: '2026-02-01', dueDate: '2026-03-01', amount: 54545455, vatRate: 10, total: 60_000_000, status: 'paid' },
  { id: '9', invoiceNumber: 'INV-2839', clientName: 'Bách Hóa Xanh', issuedDate: '2026-01-28', dueDate: '2026-02-28', amount: 409090909, vatRate: 10, total: 450_000_000, status: 'advanced', advancedAmount: 360_000_000 },
  { id: '10', invoiceNumber: 'INV-2838', clientName: 'Trung Nguyên Legend', issuedDate: '2026-01-20', dueDate: '2026-02-20', amount: 227272727, vatRate: 10, total: 250_000_000, status: 'paid' },
];

export interface Loan {
  id: string;
  code: string;
  amount: number;
  type: string;
  disbursedDate: string;
  dueDate: string;
  amountRepaid: number;
  remaining: number;
  progress: number;
  status: 'on_track' | 'completed' | 'due_soon';
}

export const loans: Loan[] = [
  { id: '1', code: 'L-0034', amount: 500_000_000, type: 'Vốn lưu động', disbursedDate: '2026-03-01', dueDate: '2026-05-31', amountRepaid: 50_000_000, remaining: 450_000_000, progress: 10, status: 'on_track' },
  { id: '2', code: 'L-0031', amount: 200_000_000, type: 'Ứng hóa đơn', disbursedDate: '2026-02-15', dueDate: '2026-03-15', amountRepaid: 200_000_000, remaining: 0, progress: 100, status: 'completed' },
  { id: '3', code: 'L-0028', amount: 1_000_000_000, type: 'Mở rộng', disbursedDate: '2026-01-01', dueDate: '2026-07-01', amountRepaid: 400_000_000, remaining: 600_000_000, progress: 40, status: 'due_soon' },
];

export interface Transaction {
  id: string;
  merchantName: string;
  category: string;
  amount: number;
  type: 'income' | 'expense' | 'loan';
  date: string;
  status: string;
}

export const transactions: Transaction[] = [
  { id: '1', merchantName: 'Highlands Coffee', category: 'Đại lý', amount: 48_000_000, type: 'income', date: '2026-03-03', status: 'Đã thu' },
  { id: '2', merchantName: 'Công ty ABC', category: 'Nhập hàng', amount: -125_000_000, type: 'expense', date: '2026-03-03', status: 'Đã chi' },
  { id: '3', merchantName: 'KAPIVA', category: 'Giải ngân', amount: 500_000_000, type: 'loan', date: '2026-03-02', status: 'Đã nhận' },
  { id: '4', merchantName: 'EVN', category: 'Tiện ích', amount: -8_500_000, type: 'expense', date: '2026-03-01', status: 'Đã chi' },
  { id: '5', merchantName: 'Lotteria Vietnam', category: 'Đại lý', amount: 67_500_000, type: 'income', date: '2026-02-28', status: 'Đã thu' },
  { id: '6', merchantName: 'Nhân viên', category: 'Lương', amount: -180_000_000, type: 'expense', date: '2026-02-28', status: 'Đã chi' },
  { id: '7', merchantName: 'Vinmart B2B', category: 'Đại lý', amount: 124_000_000, type: 'income', date: '2026-02-27', status: 'Đã thu' },
  { id: '8', merchantName: 'Thuê mặt bằng', category: 'Vận hành', amount: -45_000_000, type: 'expense', date: '2026-02-25', status: 'Đã chi' },
  { id: '9', merchantName: 'Circle K', category: 'Đại lý', amount: 90_000_000, type: 'income', date: '2026-02-24', status: 'Đã thu' },
  { id: '10', merchantName: 'Nguyên liệu Miền Tây', category: 'Nhập hàng', amount: -95_000_000, type: 'expense', date: '2026-02-22', status: 'Đã chi' },
];

export const revenueExpenseData = [
  { month: 'T10', revenue: 9200, expense: 7100, profit: 2100 },
  { month: 'T11', revenue: 8800, expense: 7500, profit: 1300 },
  { month: 'T12', revenue: 11200, expense: 9800, profit: 1400 },
  { month: 'T01', revenue: 5500, expense: 8200, profit: -2700 },
  { month: 'T02', revenue: 7200, expense: 6100, profit: 1100 },
  { month: 'T03', revenue: 8320, expense: 6400, profit: 1920 },
].map(d => ({ ...d, revenue: d.revenue * 1e6, expense: d.expense * 1e6, profit: d.profit * 1e6 }));

export const invoiceAgingData = [
  { range: '0-30 ngày', amount: 800_000_000, color: 'hsl(158, 100%, 43%)' },
  { range: '31-60 ngày', amount: 420_000_000, color: 'hsl(38, 92%, 50%)' },
  { range: '61-90 ngày', amount: 180_000_000, color: 'hsl(25, 95%, 53%)' },
  { range: '90+ ngày', amount: 240_000_000, color: 'hsl(0, 84%, 60%)' },
];

export const expenseBreakdown = [
  { name: 'Nhập hàng', value: 45, fill: 'hsl(225, 100%, 57%)' },
  { name: 'Nhân sự', value: 22, fill: 'hsl(158, 100%, 43%)' },
  { name: 'Marketing', value: 15, fill: 'hsl(38, 92%, 50%)' },
  { name: 'Vận hành', value: 12, fill: 'hsl(270, 70%, 60%)' },
  { name: 'Khác', value: 6, fill: 'hsl(215, 19%, 45%)' },
];

export const provinces = [
  'TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ',
  'An Giang', 'Bà Rịa - Vũng Tàu', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu',
  'Bắc Ninh', 'Bến Tre', 'Bình Định', 'Bình Dương', 'Bình Phước',
  'Bình Thuận', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Đắk Nông',
  'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Giang',
  'Hà Nam', 'Hà Tĩnh', 'Hải Dương', 'Hậu Giang', 'Hòa Bình',
  'Hưng Yên', 'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu',
  'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định',
  'Nghệ An', 'Ninh Bình', 'Ninh Thuận', 'Phú Thọ', 'Phú Yên',
  'Quảng Bình', 'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị',
  'Sóc Trăng', 'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên',
  'Thanh Hóa', 'Thừa Thiên Huế', 'Tiền Giang', 'Trà Vinh', 'Tuyên Quang',
  'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái',
];

export const industries = [
  { icon: '🍜', label: 'F&B & Nhà hàng' },
  { icon: '🛍️', label: 'Bán lẻ & Thương mại' },
  { icon: '🏭', label: 'Sản xuất & Chế biến' },
  { icon: '🚚', label: 'Logistics & Vận tải' },
  { icon: '💊', label: 'Dược phẩm & Y tế' },
  { icon: '🏗️', label: 'Xây dựng & Vật liệu' },
  { icon: '📱', label: 'Công nghệ & Phần mềm' },
  { icon: '📦', label: 'Xuất nhập khẩu' },
  { icon: '🌾', label: 'Nông nghiệp' },
  { icon: '⚙️', label: 'Khác' },
];
