/**
 * Phân tích chênh lệch hai kỳ — Prompt 4 mục 7–12. Hàm thuần.
 *
 * KHUÔN CỦA CHUYÊN VIÊN PHÂN TÍCH, không phải văn xuôi chatbot: câu hỏi → dữ liệu dùng → số chính →
 * động lực → rủi ro → cần xem lại → việc tiếp → nguồn. Và KỶ LUẬT MÔ HÌNH (mục 9): đầu vào, giả định,
 * phương pháp, độ phủ, độ tin cậy luôn đi kèm — không bao giờ giấu giả định.
 *
 * MỖI ĐỘNG LỰC CÓ NHÃN (mục 12):
 *   su_that   — cộng trực tiếp từ bản ghi, kèm id từng bản ghi;
 *   suy_luan  — ghép từ sự thật, có thể sai; nói rõ vì sao nghĩ vậy;
 *   chua_biet — điều dữ liệu KHÔNG cho biết (tiền mặt, khoản chi ngoài ngân hàng…).
 *
 * KHÔNG phải báo cáo tài chính. "Doanh thu" ở đây là tổng hoá đơn bán ra lập trong MIMI; "dòng tiền"
 * là tiền qua ngân hàng đã kết nối. Hai thứ đó không phải sổ kế toán, và file này nói vậy trên kết quả.
 */
import { chieuTien, doLonTien } from '../tien/chieu-tien.ts';

export interface GiaoDichPT {
  id: string; amount: number; type: string | null; transaction_date: string;
  merchant_name: string | null; counter_account_name: string | null;
}
export interface HoaDonPT { id: string; invoice_number: string; client_name: string; total: number; issued_date: string; status: string }

export type NhanDongLuc = 'su_that' | 'suy_luan' | 'chua_biet';
export interface DongLuc { cau: string; nhan: NhanDongLuc; so_tien?: number; giao_dich?: string[]; hoa_don?: string[] }

export interface Ky { tu: string; den: string; nhan: string }
export interface SoKy { hoa_don: number; tien_vao: number; tien_ra: number; rong: number; chua_thu: number; so_giao_dich: number; so_hoa_don: number }

export interface PhanTichChenhLech {
  cau_hoi: string;
  ky_nay: Ky;
  ky_truoc: Ky;
  nay: SoKy;
  truoc: SoKy;
  dong_luc: DongLuc[];
  rui_ro: string[];
  can_xem_lai: string[];
  viec_tiep: string[];
  /** Mục 9: đầu vào, giả định, phương pháp, độ phủ, độ tin cậy. */
  dau_vao: string[];
  gia_dinh: string[];
  phuong_phap: string;
  do_phu: string;
  do_tin_cay: 'cao' | 'trung_binh' | 'thap';
  /** id bản ghi đứng sau từng số chính (truy ngược kiểu bảng tính, mục 10). */
  bang_chung: { giao_dich_nay: string[]; giao_dich_truoc: string[]; hoa_don_nay: string[]; hoa_don_truoc: string[] };
}

const pad = (n: number) => String(n).padStart(2, '0');
const cuoiThang = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Tháng này tới hôm nay, so với tháng trước tới CÙNG NGÀY — so cả tháng trước với nửa tháng này là sai. */
export function haiKy(homNay: string): { nay: Ky; truoc: Ky } {
  const [y, m, d] = homNay.split('-').map(Number);
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  const dd = Math.min(d, cuoiThang(py, pm));
  return {
    nay: { tu: `${y}-${pad(m)}-01`, den: homNay, nhan: `01–${pad(d)}/${pad(m)}/${y}` },
    truoc: { tu: `${py}-${pad(pm)}-01`, den: `${py}-${pad(pm)}-${pad(dd)}`, nhan: `01–${pad(dd)}/${pad(pm)}/${py}` },
  };
}

const trong = (ngay: string, k: Ky) => ngay.slice(0, 10) >= k.tu && ngay.slice(0, 10) <= k.den;
const ten = (t: GiaoDichPT) => (t.counter_account_name || t.merchant_name || '').trim() || 'Không rõ tên';

function soKy(gd: GiaoDichPT[], hd: HoaDonPT[], k: Ky): { so: SoKy; gd: GiaoDichPT[]; hd: HoaDonPT[] } {
  const g = gd.filter((t) => trong(t.transaction_date, k) && chieuTien(t));
  const h = hd.filter((x) => trong(x.issued_date, k) && x.status !== 'cancelled');
  const vao = g.filter((t) => chieuTien(t) === 'vao').reduce((s, t) => s + doLonTien(t), 0);
  const ra = g.filter((t) => chieuTien(t) === 'ra').reduce((s, t) => s + doLonTien(t), 0);
  return {
    so: {
      hoa_don: h.reduce((s, x) => s + Number(x.total), 0), tien_vao: vao, tien_ra: ra, rong: vao - ra,
      chua_thu: h.filter((x) => x.status === 'pending' || x.status === 'overdue').reduce((s, x) => s + Number(x.total), 0),
      so_giao_dich: g.length, so_hoa_don: h.length,
    },
    gd: g, hd: h,
  };
}

/** Thay đổi theo đối tác của một chiều tiền: ai đóng góp nhiều nhất vào phần tăng/giảm. */
function theoDoiTac(nay: GiaoDichPT[], truoc: GiaoDichPT[], chieu: 'vao' | 'ra') {
  const m = new Map<string, { nay: number; truoc: number; id: string[] }>();
  const cong = (ds: GiaoDichPT[], khoa: 'nay' | 'truoc') => {
    for (const t of ds) {
      if (chieuTien(t) !== chieu) continue;
      const c = m.get(ten(t)) ?? { nay: 0, truoc: 0, id: [] };
      c[khoa] += doLonTien(t);
      c.id.push(t.id);
      m.set(ten(t), c);
    }
  };
  cong(nay, 'nay');
  cong(truoc, 'truoc');
  return [...m.entries()].map(([doi_tac, v]) => ({ doi_tac, ...v, chenh: v.nay - v.truoc }))
    .sort((a, b) => Math.abs(b.chenh) - Math.abs(a.chenh));
}

const vnd = (n: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(n))} ₫`;
const huong = (n: number) => (n > 0 ? 'tăng' : n < 0 ? 'giảm' : 'không đổi');

export function phanTichChenhLech(o: { cauHoi: string; homNay: string; giaoDich: GiaoDichPT[]; hoaDonBan: HoaDonPT[] }): PhanTichChenhLech {
  const { nay: kNay, truoc: kTruoc } = haiKy(o.homNay);
  const a = soKy(o.giaoDich, o.hoaDonBan, kNay);
  const b = soKy(o.giaoDich, o.hoaDonBan, kTruoc);
  const dong_luc: DongLuc[] = [];

  const dHoaDon = a.so.hoa_don - b.so.hoa_don;
  const dRong = a.so.rong - b.so.rong;
  dong_luc.push({ cau: `Hoá đơn bán ra ${huong(dHoaDon)} ${vnd(Math.abs(dHoaDon))} (${vnd(b.so.hoa_don)} → ${vnd(a.so.hoa_don)}).`, nhan: 'su_that', so_tien: dHoaDon, hoa_don: a.hd.map((x) => x.id) });
  dong_luc.push({ cau: `Dòng tiền ròng qua ngân hàng ${huong(dRong)} ${vnd(Math.abs(dRong))} (${vnd(b.so.rong)} → ${vnd(a.so.rong)}).`, nhan: 'su_that', so_tien: dRong });

  const ra = theoDoiTac(a.gd, b.gd, 'ra').filter((x) => x.chenh > 0).slice(0, 3);
  for (const x of ra) {
    dong_luc.push({ cau: `Tiền ra cho ${x.doi_tac} tăng ${vnd(x.chenh)} (${vnd(x.truoc)} → ${vnd(x.nay)}).`, nhan: 'su_that', so_tien: -x.chenh, giao_dich: x.id });
  }
  const vao = theoDoiTac(a.gd, b.gd, 'vao').filter((x) => x.chenh < 0).slice(0, 2);
  for (const x of vao) {
    dong_luc.push({ cau: `Tiền vào từ ${x.doi_tac} giảm ${vnd(-x.chenh)} (${vnd(x.truoc)} → ${vnd(x.nay)}).`, nhan: 'su_that', so_tien: x.chenh, giao_dich: x.id });
  }
  const chuaThu = a.hd.filter((x) => x.status === 'pending' || x.status === 'overdue');
  if (dHoaDon > 0 && dRong < 0 && a.so.chua_thu > 0) {
    dong_luc.push({
      cau: `Một phần hoá đơn kỳ này chưa thành tiền: ${chuaThu.length} hoá đơn, ${vnd(a.so.chua_thu)} chưa thu. Hoá đơn tăng nhưng tiền chưa về thì dòng tiền giảm dù "doanh thu" tăng.`,
      nhan: 'suy_luan', so_tien: -a.so.chua_thu, hoa_don: chuaThu.map((x) => x.id),
    });
  }
  if (ra.length && dRong < 0) {
    const tongTang = ra.reduce((s, x) => s + x.chenh, 0);
    dong_luc.push({ cau: `Tiền ra tăng chủ yếu ở ${ra.map((x) => x.doi_tac).join(', ')} (cộng ${vnd(tongTang)}). Đây là khoản chi mới hay trả trước cho kỳ sau thì MIMI không biết từ sao kê.`, nhan: 'suy_luan', so_tien: -tongTang });
  }
  dong_luc.push({ cau: 'Tiền mặt thu chi ngoài ngân hàng và khoản chi chưa qua tài khoản đã kết nối không có trong phân tích này.', nhan: 'chua_biet' });

  const rui_ro: string[] = [];
  const quaHan = a.hd.filter((x) => x.status === 'overdue');
  if (quaHan.length) rui_ro.push(`${quaHan.length} hoá đơn kỳ này đã quá hạn thanh toán.`);
  if (a.so.rong < 0) rui_ro.push(`Kỳ này tiền ra nhiều hơn tiền vào ${vnd(-a.so.rong)}.`);

  const can_xem_lai: string[] = [];
  if (a.so.so_giao_dich < 5 || b.so.so_giao_dich < 5) can_xem_lai.push('Ít giao dịch trong một hoặc cả hai kỳ — chênh lệch có thể chỉ do một vài khoản.');
  if (!a.so.so_hoa_don && !b.so.so_hoa_don) can_xem_lai.push('Không có hoá đơn bán ra nào lập trong MIMI ở cả hai kỳ — "doanh thu theo hoá đơn" bằng 0 không có nghĩa là không bán được.');

  const viec_tiep: string[] = [];
  if (chuaThu.length) viec_tiep.push(`Nhắc thu ${chuaThu.length} hoá đơn chưa thanh toán (Hoá đơn → lọc "Chờ thanh toán").`);
  if (ra.length) viec_tiep.push(`Kiểm các khoản chi tăng cho ${ra[0].doi_tac}: có hoá đơn đầu vào chưa, có phải trả trước không.`);
  if (!viec_tiep.length) viec_tiep.push('Không có việc gấp từ phân tích này.');

  const do_tin_cay = a.so.so_giao_dich >= 5 && b.so.so_giao_dich >= 5 ? 'cao' : a.so.so_giao_dich || b.so.so_giao_dich ? 'trung_binh' : 'thap';

  return {
    cau_hoi: o.cauHoi.slice(0, 300), ky_nay: kNay, ky_truoc: kTruoc, nay: a.so, truoc: b.so,
    dong_luc, rui_ro, can_xem_lai, viec_tiep,
    dau_vao: [
      `${a.so.so_giao_dich + b.so.so_giao_dich} giao dịch ngân hàng đã kết nối (${a.so.so_giao_dich} kỳ này, ${b.so.so_giao_dich} kỳ trước), đã bỏ dữ liệu thử`,
      `${a.so.so_hoa_don + b.so.so_hoa_don} hoá đơn bán ra lập trong MIMI (không tính hoá đơn đã huỷ)`,
    ],
    gia_dinh: [
      '"Doanh thu" ở đây = tổng hoá đơn bán ra theo ngày lập, không phải doanh thu kế toán hay doanh thu tính thuế.',
      '"Dòng tiền" = tiền vào trừ tiền ra qua các tài khoản đã kết nối; không gồm tiền mặt.',
      'So tháng này tới hôm nay với tháng trước tới cùng ngày.',
    ],
    phuong_phap: 'Cộng theo kỳ; chênh lệch theo từng đối tác; chỉ gọi là suy luận khi ghép hai sự thật lại.',
    do_phu: `Kỳ này ${a.so.so_giao_dich} giao dịch, ${a.so.so_hoa_don} hoá đơn; kỳ trước ${b.so.so_giao_dich} giao dịch, ${b.so.so_hoa_don} hoá đơn.`,
    do_tin_cay,
    bang_chung: { giao_dich_nay: a.gd.map((t) => t.id), giao_dich_truoc: b.gd.map((t) => t.id), hoa_don_nay: a.hd.map((x) => x.id), hoa_don_truoc: b.hd.map((x) => x.id) },
  };
}
