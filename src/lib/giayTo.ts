/**
 * Soạn nháp giấy tờ hành chính (TCCN-12 và công văn thuế) từ dữ liệu thật của công ty.
 *
 * Hàm thuần: nhận thông tin đã có + thông tin người dùng nhập, trả văn bản có cấu trúc. Chỗ nào
 * chưa có dữ liệu thì để `[Tên ô]` và liệt kê trong `con_thieu` — không đoán, không bỏ trống im
 * lặng. Không trích điều luật nào (xem `giay-to/loai.ts` để biết vì sao).
 */
import { docSoTienBangChu } from './soTienBangChu';
import { MO_TA_GIAY_TO, type LoaiGiayTo } from '../../supabase/functions/_shared/giay-to/loai.ts';

export { LOAI_GIAY_TO, MO_TA_GIAY_TO, duongDanGiayTo, type LoaiGiayTo } from '../../supabase/functions/_shared/giay-to/loai.ts';

export interface ThongTinDonVi {
  ten: string;
  ma_so_thue: string;
  dia_chi: string;
  nguoi_dai_dien: string;
  chuc_vu: string;
  dien_thoai: string;
  /** Tỉnh/thành để ghi "..., ngày ... tháng ... năm ...". */
  dia_danh: string;
}

export interface GiaoDichTraSoat {
  ngay: string;
  so_tien: number;
  tai_khoan_chuyen: string;
  ngan_hang: string;
  tai_khoan_nhan: string;
  ten_nguoi_nhan: string;
  noi_dung: string;
  ma_tham_chieu: string;
}

export interface VanBan {
  loai: LoaiGiayTo;
  /** Dòng số/ký hiệu và trích yếu — chỉ công văn có. */
  so_hieu?: string;
  trich_yeu?: string;
  kinh_gui: string;
  tieu_de: string;
  doan: string[];
  bang?: { cot: string[]; dong: string[][] };
  kem_theo: string[];
  ky: { chuc_danh: string; ghi_chu: string; ten: string };
  ngay_thang: string;
  /** Các ô còn trống — giao diện phải báo trước khi cho in. */
  con_thieu: string[];
}

/** `[Tên ô]` khi rỗng, và ghi tên ô vào danh sách thiếu. */
function oTrong(thieu: string[]) {
  return (gia: string | null | undefined, ten: string) => {
    const v = (gia ?? '').trim();
    if (v) return v;
    if (!thieu.includes(ten)) thieu.push(ten);
    return `[${ten}]`;
  };
}

const vnd = (n: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(n))} đồng`;
const ngayVN = (ymd: string) => (/^\d{4}-\d{2}-\d{2}/.test(ymd) ? ymd.slice(0, 10).split('-').reverse().join('/') : ymd);

export function ngayThang(diaDanh: string, homNay: Date): string {
  const d = homNay;
  return `${diaDanh}, ngày ${String(d.getDate()).padStart(2, '0')} tháng ${String(d.getMonth() + 1).padStart(2, '0')} năm ${d.getFullYear()}`;
}

function dauDonVi(dv: ThongTinDonVi, o: ReturnType<typeof oTrong>): string[] {
  return [
    `Tên đơn vị: ${o(dv.ten, 'Tên đơn vị')}`,
    `Mã số thuế: ${o(dv.ma_so_thue, 'Mã số thuế')}`,
    `Địa chỉ: ${o(dv.dia_chi, 'Địa chỉ trụ sở')}`,
    `Người đại diện: ${o(dv.nguoi_dai_dien, 'Người đại diện')} — Chức vụ: ${o(dv.chuc_vu, 'Chức vụ')} — Điện thoại: ${o(dv.dien_thoai, 'Số điện thoại')}`,
  ];
}

/* ── Đơn đề nghị tra soát ─────────────────────────────────────────────── */

export type LyDoTraSoat = 'chuyen_nham' | 'nghi_lua_dao';

export function soanDonTraSoat(p: {
  donVi: ThongTinDonVi;
  giaoDich: GiaoDichTraSoat;
  lyDo: LyDoTraSoat;
  moTa: string;
  homNay: Date;
}): VanBan {
  const thieu: string[] = [];
  const o = oTrong(thieu);
  const g = p.giaoDich;
  const soTien = g.so_tien > 0 ? `${vnd(g.so_tien)} (bằng chữ: ${docSoTienBangChu(g.so_tien)})` : o('', 'Số tiền');

  const lyDo = p.lyDo === 'chuyen_nham'
    ? `Giao dịch trên được chuyển nhầm: ${o(p.moTa, 'Mô tả chuyển nhầm (sai số tài khoản, sai số tiền, chuyển trùng…)')}.`
    : `Chúng tôi nghi ngờ giao dịch trên liên quan đến hành vi lừa đảo: ${o(p.moTa, 'Mô tả sự việc (ai yêu cầu chuyển, qua kênh nào, lúc nào)')}. Chúng tôi đã hoặc sẽ trình báo cơ quan công an.`;

  const deNghi = p.lyDo === 'chuyen_nham'
    ? `Đề nghị Quý Ngân hàng tra soát giao dịch nêu trên và liên hệ ngân hàng của bên nhận để đề nghị hoàn trả số tiền ${soTien} về tài khoản của chúng tôi.`
    : `Đề nghị Quý Ngân hàng khẩn trương tra soát giao dịch nêu trên, liên hệ ngân hàng của bên nhận để đề nghị hoàn trả số tiền ${soTien} về tài khoản của chúng tôi, và phối hợp với ngân hàng bên nhận xử lý tài khoản nhận theo quy định.`;

  return {
    loai: 'don_tra_soat',
    kinh_gui: `Ngân hàng ${o(g.ngan_hang, 'Tên ngân hàng và chi nhánh')}`,
    tieu_de: 'ĐƠN ĐỀ NGHỊ TRA SOÁT GIAO DỊCH CHUYỂN TIỀN',
    doan: [
      ...dauDonVi(p.donVi, o),
      `Ngày ${o(ngayVN(g.ngay), 'Ngày giao dịch')}, chúng tôi đã chuyển tiền từ tài khoản số ${o(g.tai_khoan_chuyen, 'Số tài khoản chuyển')} tại Quý Ngân hàng, thông tin giao dịch như bảng dưới đây.`,
      lyDo,
      deNghi,
      'Chúng tôi cam kết thông tin nêu trên là đúng sự thật và chịu trách nhiệm về đề nghị này.',
    ],
    bang: {
      cot: ['Nội dung', 'Thông tin'],
      dong: [
        ['Ngày giao dịch', o(ngayVN(g.ngay), 'Ngày giao dịch')],
        ['Số tiền', g.so_tien > 0 ? vnd(g.so_tien) : o('', 'Số tiền')],
        ['Tài khoản nhận', o(g.tai_khoan_nhan, 'Số tài khoản nhận')],
        ['Tên người nhận', o(g.ten_nguoi_nhan, 'Tên người nhận')],
        ['Nội dung chuyển khoản', g.noi_dung.trim() || '(không có)'],
        ['Mã giao dịch / mã tham chiếu', o(g.ma_tham_chieu, 'Mã giao dịch')],
      ],
    },
    kem_theo: ['Ảnh chụp hoặc sao kê thể hiện giao dịch', ...(p.lyDo === 'nghi_lua_dao' ? ['Tin nhắn, email hoặc ghi âm yêu cầu chuyển tiền (nếu có)'] : [])],
    ky: { chuc_danh: 'KHÁCH HÀNG', ghi_chu: '(Ký, ghi rõ họ tên, đóng dấu nếu có)', ten: o(p.donVi.nguoi_dai_dien, 'Người đại diện') },
    ngay_thang: ngayThang(o(p.donVi.dia_danh, 'Địa danh'), p.homNay),
    con_thieu: thieu,
  };
}

/* ── Công văn giải trình ──────────────────────────────────────────────── */

export function soanCongVanGiaiTrinh(p: {
  donVi: ThongTinDonVi;
  coQuanThue: string;
  soThongBao: string;
  ngayThongBao: string;
  noiDungYeuCau: string;
  giaiTrinh: string;
  soLieu: { noi_dung: string; gia_tri: string }[];
  homNay: Date;
}): VanBan {
  const thieu: string[] = [];
  const o = oTrong(thieu);
  const noiDung = o(p.noiDungYeuCau, 'Nội dung cơ quan thuế yêu cầu giải trình');
  const soLieu = p.soLieu.filter((r) => r.noi_dung.trim() || r.gia_tri.trim());
  return {
    loai: 'cong_van_giai_trinh',
    so_hieu: 'Số: ..../CV',
    trich_yeu: `V/v giải trình ${noiDung}`,
    kinh_gui: o(p.coQuanThue, 'Cơ quan thuế quản lý'),
    tieu_de: 'CÔNG VĂN',
    doan: [
      ...dauDonVi(p.donVi, o),
      `Ngày ${o(ngayVN(p.ngayThongBao), 'Ngày của thông báo')}, chúng tôi nhận được văn bản số ${o(p.soThongBao, 'Số thông báo của cơ quan thuế')} của ${o(p.coQuanThue, 'Cơ quan thuế quản lý')} đề nghị giải trình về ${noiDung}.`,
      `Chúng tôi xin giải trình như sau: ${o(p.giaiTrinh, 'Nội dung giải trình')}`,
      ...(soLieu.length ? ['Số liệu kèm theo lời giải trình được nêu tại bảng dưới đây và khớp với chứng từ gửi kèm.'] : []),
      'Chúng tôi cam kết nội dung giải trình và số liệu nêu trên là đúng sự thật, và sẵn sàng cung cấp thêm hồ sơ, chứng từ khi cơ quan thuế yêu cầu.',
    ],
    ...(soLieu.length ? { bang: { cot: ['Nội dung', 'Số liệu'], dong: soLieu.map((r) => [r.noi_dung.trim(), r.gia_tri.trim()]) } } : {}),
    kem_theo: ['Bản sao chứng từ liên quan đến nội dung giải trình'],
    ky: { chuc_danh: 'NGƯỜI ĐẠI DIỆN THEO PHÁP LUẬT', ghi_chu: '(Ký, ghi rõ họ tên, đóng dấu)', ten: o(p.donVi.nguoi_dai_dien, 'Người đại diện') },
    ngay_thang: ngayThang(o(p.donVi.dia_danh, 'Địa danh'), p.homNay),
    con_thieu: thieu,
  };
}

/* ── Công văn đề nghị huỷ tờ khai ─────────────────────────────────────── */

export const LY_DO_HUY = {
  nham_mau: 'nộp nhầm mẫu tờ khai',
  nham_ky: 'nộp nhầm kỳ tính thuế',
  nop_trung: 'nộp trùng tờ khai đã nộp trước đó',
  khong_phat_sinh: 'nộp tờ khai cho nghĩa vụ thuế không phát sinh',
} as const;
export type LyDoHuy = keyof typeof LY_DO_HUY;

export function soanCongVanHuyToKhai(p: {
  donVi: ThongTinDonVi;
  coQuanThue: string;
  mauToKhai: string;
  kyTinhThue: string;
  ngayNop: string;
  maGiaoDich: string;
  lyDo: LyDoHuy;
  moTa: string;
  homNay: Date;
}): VanBan {
  const thieu: string[] = [];
  const o = oTrong(thieu);
  const mau = o(p.mauToKhai, 'Mẫu tờ khai');
  const ky = o(p.kyTinhThue, 'Kỳ tính thuế');
  return {
    loai: 'cong_van_huy_to_khai',
    so_hieu: 'Số: ..../CV',
    trich_yeu: `V/v đề nghị huỷ tờ khai ${mau} kỳ ${ky}`,
    kinh_gui: o(p.coQuanThue, 'Cơ quan thuế quản lý'),
    tieu_de: 'CÔNG VĂN',
    doan: [
      ...dauDonVi(p.donVi, o),
      `Ngày ${o(ngayVN(p.ngayNop), 'Ngày nộp tờ khai')}, chúng tôi đã nộp tờ khai ${mau} kỳ tính thuế ${ky} qua cổng thuế điện tử, mã giao dịch điện tử ${o(p.maGiaoDich, 'Mã giao dịch điện tử')}.`,
      `Tờ khai nêu trên được nộp do ${LY_DO_HUY[p.lyDo]}${p.moTa.trim() ? `: ${p.moTa.trim()}` : ''}.`,
      'Chúng tôi đề nghị cơ quan thuế xem xét huỷ tờ khai nêu trên. Trường hợp tờ khai không thuộc trường hợp được huỷ, đề nghị cơ quan thuế hướng dẫn chúng tôi thực hiện điều chỉnh theo quy định.',
      'Chúng tôi cam kết thông tin nêu trên là đúng sự thật.',
    ],
    kem_theo: ['Thông báo tiếp nhận tờ khai của cổng thuế điện tử (bản in)'],
    ky: { chuc_danh: 'NGƯỜI ĐẠI DIỆN THEO PHÁP LUẬT', ghi_chu: '(Ký, ghi rõ họ tên, đóng dấu)', ten: o(p.donVi.nguoi_dai_dien, 'Người đại diện') },
    ngay_thang: ngayThang(o(p.donVi.dia_danh, 'Địa danh'), p.homNay),
    con_thieu: thieu,
  };
}

/** Văn bản thuần chữ để sao chép sang Word hoặc email. */
export function vanBanThanhChu(v: VanBan): string {
  const dong: string[] = [
    'CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM',
    'Độc lập - Tự do - Hạnh phúc',
    '',
    v.ngay_thang,
    '',
    ...(v.so_hieu ? [v.so_hieu] : []),
    ...(v.trich_yeu ? [v.trich_yeu] : []),
    v.tieu_de,
    '',
    `Kính gửi: ${v.kinh_gui}`,
    '',
    ...v.doan,
    ...(v.bang ? ['', ...v.bang.dong.map((r) => r.join(': '))] : []),
    '',
    'Tài liệu kèm theo:',
    ...v.kem_theo.map((k) => `- ${k}`),
    '',
    v.ky.chuc_danh,
    v.ky.ghi_chu,
    '',
    v.ky.ten,
  ];
  return dong.join('\n');
}

export const TEN_LOAI = (l: LoaiGiayTo) => MO_TA_GIAY_TO[l].ten;
