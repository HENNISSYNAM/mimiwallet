/**
 * ĐỘ CHẮC CHẮN của một con số — thay cho quy tắc thô `chua_ro / tong <= 0.1 ? 'cao' : ...`.
 *
 * NGUYÊN TẮC (30/09/2026, chủ sản phẩm: "có thể đặt tiền và nghĩa vụ thật của khách hàng vào MIMI mà
 * không sợ hệ thống nói sai"):
 *
 *   MIMI không chắc → KHÔNG tự kết luận → Needs Review (`can_xem`) → hỏi đúng MỘT câu →
 *   bằng chứng của người dùng / hệ thống → Financial Truth cập nhật.
 *
 * Vì sao cách cũ sai. Tỷ lệ đếm KHOẢN (hay tỷ lệ tiền, nhưng không nhìn ngưỡng luật) trả "cao" cho
 * doanh thu 990 triệu có 5 triệu chưa rõ — mà 5 triệu đó quyết định có vượt 01 tỷ hay không. Và trả
 * "thấp" cho doanh thu 100 triệu có 60 triệu chưa rõ, dù đúng hay sai thì hộ vẫn dưới ngưỡng rất
 * xa. Độ tin cậy phải hỏi: KẾT LUẬN có phụ thuộc phần chưa rõ không?
 *
 * MÔ HÌNH. Một con số có ước tính điểm `gia_tri` và hai loại tiền chưa rõ:
 *   co_the_giam  đang NẰM TRONG ước tính nhưng chưa ai xác nhận (vd. tiền vào chưa phân loại,
 *                khoản số âm) — nếu hoá ra không phải doanh thu thì con số thật THẤP hơn;
 *   co_the_tang  đang BỊ LOẠI bằng suy đoán của máy, chưa ai xác nhận (vd. cặp "chuyển nội bộ" suy
 *                đoán từ cùng số tiền sát ngày) — nếu máy đoán sai thì con số thật CAO hơn;
 *   khoang_trong tháng giữa hai tháng có dữ liệu mà không có giao dịch nào (sao kê có thể thiếu).
 * Khoảng [can_duoi, can_tren] = [gia_tri − co_the_giam, gia_tri + co_the_tang + khoang_trong].
 * Sự thật NẰM TRONG khoảng này với mọi cách người dùng có thể trả lời. Mọi phép cộng trừ bằng BigInt
 * (đồng); số thực chỉ dùng cho TỶ LỆ hiển thị, không bao giờ cho quyết định ngưỡng.
 *
 * TRẠNG THÁI:
 *   chac              khoảng nằm trọn một phía của MỌI ngưỡng luật VÀ phần chưa rõ nhỏ (≤ 10% tổng);
 *   can_xem           khoảng CẮT một ngưỡng luật (kết luận phụ thuộc phần chưa rõ), hoặc phần chưa rõ
 *                     đáng kể. Kèm ĐÚNG MỘT câu hỏi;
 *   chua_du_du_lieu   chưa có dữ liệu nào (chưa nối ngân hàng, chưa nhập sao kê) hoặc số không đọc được.
 *
 * `ket_luan_phu_thuoc = true` là cờ cứng: nơi nào nói "vượt / không vượt ngưỡng", "phải khai theo quý"
 * PHẢI dừng lại và hiện câu hỏi thay vì kết luận (`luat/he-luat.ts` làm đúng điều này).
 *
 * Ngưỡng luật chỉ lấy từ hằng số đã có trong kho (`NGUONG_DOANH_THU`, `NGUONG_THU_NHAP` ở he-luat.ts).
 * Hai hằng số DUNG SAI ở đầu file KHÔNG phải luật — là tham số sản phẩm, có tên và có lý do.
 *
 * Hàm thuần; Deno và trình duyệt cùng đọc.
 */
import { NGUONG_DOANH_THU, NGUONG_KHAI_THANG, NGUONG_THU_NHAP } from '../luat/he-luat.ts';
import { TEN_PHAN_LOAI, type LoaiPhanLoai } from './phan-loai.ts';

/** Tiền đồng: number, hoặc chuỗi số nguyên khi vượt Number.MAX_SAFE_INTEGER (cùng hợp đồng `TienVND` của `src/lib/tien.ts`). */
export type TienDauVao = number | string;
export type TrangThaiDoChacChan = 'chac' | 'can_xem' | 'chua_du_du_lieu';

/**
 * THAM SỐ SẢN PHẨM, KHÔNG PHẢI LUẬT: phần chưa rõ tới mức này (theo TIỀN, không theo số khoản) so với
 * tổng thì còn coi là nhỏ. 10% là ngưỡng của quy tắc cũ (`do_tin_cay = 'cao'` khi ≤ 10%) — giữ nguyên
 * để test và người dùng cũ không thấy nhãn tự nhiên đổi.
 */
export const TY_LE_CHUA_RO_CHAP_NHAN = 0.1;

export interface NguongPhapLy {
  ma: string;
  ten: string;
  /** Đồng. "Vượt" là STRICTLY trên — đúng bằng vẫn là "từ ... trở xuống" (NĐ 68/2026 sửa bởi NĐ 141/2026). */
  gia_tri: number;
}

/** Ba ngưỡng doanh thu năm của hộ kinh doanh — lấy thẳng từ `luat/he-luat.ts`. */
export const NGUONG_HO_KINH_DOANH: readonly NguongPhapLy[] = [
  { ma: 'mien_thue_1_ty', ten: 'ngưỡng 01 tỷ đồng (miễn GTGT, TNCN; hoá đơn có mã)', gia_tri: NGUONG_DOANH_THU },
  { ma: 'phuong_phap_3_ty', ten: 'ngưỡng 03 tỷ đồng (bắt buộc tính TNCN trên thu nhập)', gia_tri: NGUONG_THU_NHAP },
  { ma: 'khai_thang_50_ty', ten: 'ngưỡng 50 tỷ đồng (khai GTGT theo tháng thay vì theo quý)', gia_tri: NGUONG_KHAI_THANG },
];

export type LoaiUngVien = 'khoan_tien_vao' | 'nhom_khoan' | 'noi_bo_suy_doan' | 'am_bat_thuong' | 'thang_thieu' | 'thieu_sao_ke' | 'tong_chua_ro';

/** Một thứ chưa rõ mà việc trả lời nó làm khoảng hẹp lại. */
export interface UngVienCauHoi {
  /** Khoá ỔN ĐỊNH: cùng một thứ chưa rõ → cùng khoá ở mọi lần tính (giao diện dùng để nhớ "đã hỏi"). */
  khoa: string;
  loai: LoaiUngVien;
  /** Số tiền chưa rõ của thứ này; null/thiếu = không biết (chỉ `thieu_sao_ke`). */
  so_tien: TienDauVao | null;
  so_khoan?: number;
  /** Cụm chữ tả thứ này, đã viết cho người đọc: "khoản 25.000.000đ ngày 12/03 từ NGUYEN VAN A". */
  mo_ta: string;
  transaction_ids?: string[];
  /** Loại MIMI đoán (`LoaiPhanLoai`) nếu có — chỉ để gợi ý nút, KHÔNG BAO GIỜ tự áp. */
  goi_y?: LoaiPhanLoai | null;
}

export interface LuaChon {
  /** `LoaiPhanLoai` gửi nguyên cho hành động `xac_nhan_tien_vao`; hoặc 'nhap_sao_ke' / 'ket_noi_ngan_hang'. */
  ma: string;
  nhan: string;
  /** Câu trả lời này làm khoản đó thành gì với doanh thu. null = không phải xác nhận phân loại. */
  hieu_luc: 'include' | 'exclude' | 'pending' | null;
}

export interface CauHoiCanXem {
  khoa: string;
  loai: LoaiUngVien;
  cau: string;
  vi_sao: string;
  so_tien: TienDauVao | null;
  so_khoan: number;
  transaction_ids: string[];
  lua_chon: LuaChon[];
  /** Hành động backend có thật để ghi câu trả lời. */
  hanh_dong: 'xac_nhan_tien_vao' | 'nhap_sao_ke' | 'ket_noi_ngan_hang';
  /** Còn bao nhiêu thứ chưa rõ khác sau câu này — để giao diện nói "còn N việc", KHÔNG hỏi dồn. */
  con_lai: number;
}

export interface KetQuaNguong {
  ma: string;
  ten: string;
  gia_tri: number;
  /** 'tren': chắc chắn vượt; 'duoi': chắc chắn không vượt (bằng vẫn là không vượt); 'chua_chac': khoảng cắt ngưỡng. */
  phia: 'tren' | 'duoi' | 'chua_chac';
  cach_can_duoi: TienDauVao;
  cach_can_tren: TienDauVao;
  /** Khoảng cách từ ước tính tới ngưỡng, ÂM khi ước tính đã vượt. */
  cach_gia_tri: TienDauVao;
}

export interface DauVaoDoChacChan {
  /** Ước tính điểm (đồng). */
  gia_tri: TienDauVao;
  co_the_giam?: TienDauVao;
  co_the_tang?: TienDauVao;
  /** Số tháng thiếu dữ liệu và mức tối đa mỗi tháng thiếu (đã suy từ dữ liệu, xem `so-lieu.ts`). */
  khoang_trong?: { so_thang: number; toi_da_moi_thang: TienDauVao; thang: string[] };
  /** Có ít nhất một giao dịch / dữ liệu nào để tính không. */
  co_du_lieu: boolean;
  /** Ngưỡng luật cần soi. Mặc định hai ngưỡng hộ kinh doanh. */
  nguong?: readonly NguongPhapLy[];
  /** Doanh thu cả năm — để nói con số này lớn cỡ nào so với doanh thu (khi con số không phải chính doanh thu). */
  doanh_thu_nam?: TienDauVao;
  /** Ngưỡng nào bị bỏ qua (vd. con số là doanh thu MỘT nhóm hoạt động — ngưỡng luật tính trên cả năm, không tính riêng nhóm). */
  bo_qua_nguong?: boolean;
  /** Theo quý, để biết QUÝ vượt ngưỡng 01 tỷ có chắc không. Bốn số mỗi mảng. */
  theo_quy?: { gia_tri: number[]; co_the_giam: number[]; co_the_tang: number[] };
  ung_vien?: UngVienCauHoi[];
  /** Tổng số thứ chưa rõ (kể cả phần bị cắt bớt khỏi `ung_vien`) — để nói "còn N việc". */
  tong_ung_vien?: number;
}

export interface KetQuaDoChacChan {
  trang_thai: TrangThaiDoChacChan;
  gia_tri: TienDauVao;
  can_duoi: TienDauVao;
  can_tren: TienDauVao;
  /** Tổng tiền chưa rõ = giảm + tăng + khoảng trống. */
  chua_ro: TienDauVao;
  vat_chat: {
    tuyet_doi: TienDauVao;
    /** chua_ro / (gia_tri + co_the_tang + khoang_trong) — theo TIỀN. null khi tổng không dương. */
    ti_le_tren_tong: number | null;
    ti_le_tren_doanh_thu_nam: number | null;
    la_vat_chat: boolean;
  };
  nguong: KetQuaNguong[];
  nguong_gan_nhat: KetQuaNguong | null;
  /** Kết luận về ngưỡng phụ thuộc phần chưa rõ: KHÔNG được nói vượt/không vượt. */
  ket_luan_phu_thuoc: boolean;
  nguong_chua_chac: string[];
  /** Quý vượt 01 tỷ: sớm nhất (nếu mọi khoản chưa rõ đều là doanh thu) và muộn nhất (nếu không khoản nào là). */
  quy_vuot: { som_nhat: number | null; muon_nhat: number | null; chac: boolean } | null;
  cau_hoi: CauHoiCanXem | null;
}

// ── Tiền chính xác ───────────────────────────────────────────────────────────

const HOP_LE = /^-?\d+$/;

/** Đồng → BigInt. Số thập phân làm tròn tới đồng (đồng là đơn vị nhỏ nhất). Không đọc được → null. */
export function sangBig(v: TienDauVao | null | undefined): bigint | null {
  if (typeof v === 'number') return Number.isFinite(v) ? BigInt(Math.round(v)) : null;
  if (typeof v === 'string' && HOP_LE.test(v)) return BigInt(v);
  return null;
}

const AN_TOAN_MAX = BigInt(Number.MAX_SAFE_INTEGER);
const AN_TOAN_MIN = BigInt(Number.MIN_SAFE_INTEGER);
/** BigInt → number khi còn an toàn, không thì chuỗi số nguyên. */
export function tuBig(b: bigint): TienDauVao {
  return b <= AN_TOAN_MAX && b >= AN_TOAN_MIN ? Number(b) : b.toString();
}

const khong = (b: bigint) => (b < 0n ? 0n : b);
const vnd = (b: bigint) => `${b.toLocaleString('vi-VN')}đ`;

function tyLe(tu: bigint, mau: bigint): number | null {
  if (mau <= 0n) return null;
  return Number((tu * 1_000_000n) / mau) / 1_000_000;
}

function pct(x: number | null): string {
  return x === null ? '—' : `${String(Math.round(x * 1000) / 10).replace('.', ',')}%`;
}

const sangBigMang = (a: number[] | undefined): bigint[] | null => {
  if (!a || a.length !== 4) return null;
  const r = a.map((x) => sangBig(x));
  return r.every((x): x is bigint => x !== null) ? r as bigint[] : null;
};

/** Quý đầu tiên mà lũy kế vượt ngưỡng, null nếu cả năm không vượt. */
function quyVuot(theoQuy: bigint[], nguong: bigint): number | null {
  let luyKe = 0n;
  for (let q = 0; q < 4; q++) {
    luyKe += theoQuy[q];
    if (luyKe > nguong) return q + 1;
  }
  return null;
}

// ── Câu hỏi: đúng MỘT, khoá ổn định ───────────────────────────────────────────

const NHAN_TIEN_BAN_HANG = TEN_PHAN_LOAI.business_revenue;

function luaChonPhanLoai(goiY: LoaiPhanLoai | null | undefined): LuaChon[] {
  const ra: LuaChon[] = [
    { ma: 'business_revenue', nhan: NHAN_TIEN_BAN_HANG, hieu_luc: 'include' },
    { ma: 'internal_transfer', nhan: TEN_PHAN_LOAI.internal_transfer, hieu_luc: 'exclude' },
  ];
  if (goiY && goiY !== 'business_revenue' && goiY !== 'internal_transfer' && goiY !== 'unknown') {
    ra.push({ ma: goiY, nhan: TEN_PHAN_LOAI[goiY], hieu_luc: 'exclude' });
  }
  ra.push({ ma: 'unknown', nhan: TEN_PHAN_LOAI.unknown, hieu_luc: 'pending' });
  return ra;
}

function dungCauHoi(
  u: UngVienCauHoi, conLai: number, chuaRoTong: bigint, nguongChuaChac: NguongPhapLy[], thang: string[],
): CauHoiCanXem {
  const tien = sangBig(u.so_tien);
  const phanTram = tien !== null && chuaRoTong > 0n ? pct(tyLe(tien, chuaRoTong)) : null;
  const viSaoNguong = nguongChuaChac.length
    ? `Doanh thu của bạn đang nằm ngay quanh ${nguongChuaChac.map((n) => n.ten).join(' và ')}; MIMI chưa biết bạn ở phía nào cho tới khi khoản này rõ.`
    : 'Khoản này lớn nhất trong phần MIMI chưa chắc, nên rõ nó là cách nhanh nhất để con số đáng tin hơn.';
  const viSao = `${viSaoNguong}${phanTram ? ` Khoản này là ${phanTram} phần chưa rõ.` : ''}`;
  const chung = { khoa: u.khoa, loai: u.loai, vi_sao: viSao, so_tien: u.so_tien, so_khoan: u.so_khoan ?? 1, transaction_ids: u.transaction_ids ?? [], con_lai: conLai };
  switch (u.loai) {
    case 'khoan_tien_vao':
    case 'nhom_khoan':
      return { ...chung, cau: `Có phải ${u.mo_ta} là tiền bán hàng của bạn không?`, lua_chon: luaChonPhanLoai(u.goi_y), hanh_dong: 'xac_nhan_tien_vao' };
    case 'noi_bo_suy_doan':
      return {
        ...chung,
        cau: `MIMI đoán ${u.mo_ta} là tiền bạn tự chuyển giữa hai tài khoản của mình (nên không tính là doanh thu). Đúng vậy không?`,
        lua_chon: [
          { ma: 'internal_transfer', nhan: TEN_PHAN_LOAI.internal_transfer, hieu_luc: 'exclude' },
          { ma: 'business_revenue', nhan: `Không, đây là ${NHAN_TIEN_BAN_HANG.toLowerCase()}`, hieu_luc: 'include' },
          { ma: 'unknown', nhan: TEN_PHAN_LOAI.unknown, hieu_luc: 'pending' },
        ],
        hanh_dong: 'xac_nhan_tien_vao',
      };
    case 'am_bat_thuong':
      return {
        ...chung,
        cau: `${u.mo_ta} được ghi là tiền vào nhưng số tiền âm. Đây là khoản hoàn / huỷ giao dịch?`,
        lua_chon: [
          { ma: 'refund', nhan: TEN_PHAN_LOAI.refund, hieu_luc: 'exclude' },
          { ma: 'unknown', nhan: TEN_PHAN_LOAI.unknown, hieu_luc: 'pending' },
        ],
        hanh_dong: 'xac_nhan_tien_vao',
      };
    case 'thang_thieu':
      return {
        ...chung,
        cau: `Sao kê chưa có giao dịch nào trong ${u.mo_ta}. Bạn nhập được sao kê của tháng đó không?`,
        vi_sao: `${thang.length > 1 ? `Còn ${thang.length} tháng` : 'Tháng này'} nằm giữa những tháng đã có dữ liệu mà không có giao dịch nào; nếu sao kê còn thiếu thì doanh thu thật cao hơn con số MIMI thấy.`,
        lua_chon: [{ ma: 'nhap_sao_ke', nhan: 'Nhập sao kê tháng này', hieu_luc: null }],
        hanh_dong: 'nhap_sao_ke',
      };
    case 'thieu_sao_ke':
      return {
        ...chung, cau: 'Bạn kết nối ngân hàng hoặc nhập file sao kê được không?',
        vi_sao: 'MIMI chưa có giao dịch nào của năm này nên chưa thể nói gì chắc chắn về doanh thu hay nghĩa vụ thuế.',
        lua_chon: [{ ma: 'ket_noi_ngan_hang', nhan: 'Kết nối ngân hàng', hieu_luc: null }, { ma: 'nhap_sao_ke', nhan: 'Nhập file sao kê', hieu_luc: null }],
        hanh_dong: 'ket_noi_ngan_hang',
      };
    case 'tong_chua_ro':
    default:
      return {
        ...chung,
        cau: `Còn ${u.so_khoan ?? 0} khoản tiền vào chưa rõ có phải tiền bán hàng không. Bạn xác nhận giúp, bắt đầu từ khoản lớn nhất?`,
        lua_chon: luaChonPhanLoai(u.goi_y), hanh_dong: 'xac_nhan_tien_vao',
      };
  }
}

/** Số tiền dùng để xếp hạng: thứ không biết số tiền (thiếu sao kê) xếp trên cùng. */
const HANG_VO_HAN = 1n << 200n;

function chonUngVien(ds: UngVienCauHoi[]): { u: UngVienCauHoi | null; conLai: number } {
  const hopLe = ds.filter((u) => u.so_tien === null || (sangBig(u.so_tien) ?? 0n) > 0n);
  if (!hopLe.length) return { u: null, conLai: 0 };
  const hang = (u: UngVienCauHoi) => (u.so_tien === null ? HANG_VO_HAN : (sangBig(u.so_tien) as bigint));
  // Lớn nhất trước; hoà thì theo khoá — kết quả không phụ thuộc thứ tự đầu vào.
  const xep = [...hopLe].sort((a, b) => (hang(b) > hang(a) ? 1 : hang(b) < hang(a) ? -1 : a.khoa < b.khoa ? -1 : a.khoa > b.khoa ? 1 : 0));
  return { u: xep[0], conLai: xep.length - 1 };
}

// ── Lõi ─────────────────────────────────────────────────────────────────────

export function tinhDoChacChan(dv: DauVaoDoChacChan): KetQuaDoChacChan {
  const giaTri = sangBig(dv.gia_tri);
  const giam = sangBig(dv.co_the_giam ?? 0);
  const tang = sangBig(dv.co_the_tang ?? 0);
  const moiThang = sangBig(dv.khoang_trong?.toi_da_moi_thang ?? 0);
  const soThangTrong = dv.khoang_trong?.so_thang ?? 0;
  const nguong = dv.bo_qua_nguong ? [] : [...(dv.nguong ?? NGUONG_HO_KINH_DOANH)];

  // Số không đọc được (NaN, chuỗi chữ…) thì KHÔNG đoán 0: không đủ dữ liệu để kết luận.
  const docDuoc = giaTri !== null && giam !== null && tang !== null && moiThang !== null
    && Number.isInteger(soThangTrong) && soThangTrong >= 0 && giam >= 0n && tang >= 0n && moiThang >= 0n;
  if (!dv.co_du_lieu || !docDuoc) {
    const { u } = chonUngVien(dv.ung_vien?.filter((x) => x.loai === 'thieu_sao_ke') ?? []);
    const mac: UngVienCauHoi = u ?? { khoa: 'thieu_sao_ke', loai: 'thieu_sao_ke', so_tien: null, mo_ta: 'năm này' };
    const g = giaTri ?? 0n;
    return {
      trang_thai: 'chua_du_du_lieu',
      gia_tri: tuBig(g), can_duoi: tuBig(g), can_tren: tuBig(g), chua_ro: 0,
      vat_chat: { tuyet_doi: 0, ti_le_tren_tong: null, ti_le_tren_doanh_thu_nam: null, la_vat_chat: false },
      nguong: [], nguong_gan_nhat: null, ket_luan_phu_thuoc: false, nguong_chua_chac: [], quy_vuot: null,
      cau_hoi: dungCauHoi(mac, 0, 0n, [], []),
    };
  }

  const gia = giaTri as bigint;
  const g = giam as bigint;
  const t = tang as bigint;
  const khoangTrong = (moiThang as bigint) * BigInt(soThangTrong);
  // Doanh thu năm không âm: cận dưới chạm 0 thì dừng ở 0 (vd. một khoản và số âm huỷ chính nó).
  const duoi = khong(gia - g);
  const tren = gia + t + khoangTrong;
  const chuaRo = g + t + khoangTrong;
  const tongXet = gia + t + khoangTrong;
  const tuongDoi = tyLe(chuaRo, tongXet);
  const dtNam = sangBig(dv.doanh_thu_nam ?? dv.gia_tri);
  const laVatChat = tuongDoi !== null && tuongDoi > TY_LE_CHUA_RO_CHAP_NHAN;

  const kqNguong: KetQuaNguong[] = nguong.map((n) => {
    const T = BigInt(n.gia_tri);
    // "Vượt" là strictly trên. duoi > T: chắc chắn vượt. tren <= T: chắc chắn chưa vượt. Còn lại: khoảng cắt.
    const phia: KetQuaNguong['phia'] = duoi > T ? 'tren' : tren <= T ? 'duoi' : 'chua_chac';
    return { ma: n.ma, ten: n.ten, gia_tri: n.gia_tri, phia, cach_can_duoi: tuBig(T - duoi), cach_can_tren: tuBig(T - tren), cach_gia_tri: tuBig(T - gia) };
  });
  const nguongChuaChac = kqNguong.filter((n) => n.phia === 'chua_chac');
  const gan = [...kqNguong].sort((a, b) => {
    const da = (sangBig(a.cach_gia_tri) as bigint); const db = (sangBig(b.cach_gia_tri) as bigint);
    const ka = da < 0n ? -da : da; const kb = db < 0n ? -db : db;
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  })[0] ?? null;

  // Quý vượt ngưỡng 01 tỷ: khai từ quý nào phụ thuộc phần chưa rõ nằm ở quý nào.
  let quy: KetQuaDoChacChan['quy_vuot'] = null;
  const nguong1ty = nguong.find((n) => n.ma === 'mien_thue_1_ty');
  const gq = sangBigMang(dv.theo_quy?.gia_tri);
  const dq = sangBigMang(dv.theo_quy?.co_the_giam);
  const tq = sangBigMang(dv.theo_quy?.co_the_tang);
  if (nguong1ty && gq && dq && tq) {
    const T = BigInt(nguong1ty.gia_tri);
    const som = quyVuot(gq.map((x, i) => x + tq[i]), T);
    const muon = quyVuot(gq.map((x, i) => x - dq[i]), T);
    quy = { som_nhat: som, muon_nhat: muon, chac: som !== null && som === muon };
  }
  // Cả hai kịch bản đều vượt nhưng ở quý khác nhau: ngưỡng chắc, quý chưa chắc.
  const quyChuaChac = !!quy && quy.som_nhat !== null && quy.muon_nhat !== null && quy.som_nhat !== quy.muon_nhat;
  const ketLuanPhuThuoc = nguongChuaChac.length > 0 || quyChuaChac;
  const maChuaChac = [...nguongChuaChac.map((n) => n.ma), ...(quyChuaChac ? ['quy_vuot_1_ty'] : [])];

  const trangThai: TrangThaiDoChacChan = ketLuanPhuThuoc || laVatChat ? 'can_xem' : 'chac';

  let cauHoi: CauHoiCanXem | null = null;
  if (trangThai === 'can_xem') {
    const ds = [...(dv.ung_vien ?? [])];
    const thang = dv.khoang_trong?.thang ?? [];
    // Đã có tiền chưa rõ mà không ai chỉ ra khoản nào: hỏi theo tổng, không bỏ trống câu hỏi.
    if (!ds.some((u) => u.loai !== 'thieu_sao_ke') && chuaRo > 0n) {
      ds.push({ khoa: 'tong_chua_ro', loai: 'tong_chua_ro', so_tien: tuBig(chuaRo), mo_ta: 'các khoản tiền vào chưa rõ' });
    }
    const { u, conLai: conLaiDs } = chonUngVien(ds);
    const conLai = Math.max(conLaiDs, (dv.tong_ung_vien ?? 0) - 1);
    if (u) cauHoi = dungCauHoi(u, conLai, chuaRo, nguongChuaChac.map((n) => nguong.find((x) => x.ma === n.ma) as NguongPhapLy), thang);
  }

  return {
    trang_thai: trangThai,
    gia_tri: tuBig(gia), can_duoi: tuBig(duoi), can_tren: tuBig(tren), chua_ro: tuBig(chuaRo),
    vat_chat: {
      tuyet_doi: tuBig(chuaRo),
      ti_le_tren_tong: tuongDoi,
      ti_le_tren_doanh_thu_nam: dtNam !== null ? tyLe(chuaRo, dtNam > 0n ? dtNam : tongXet) : null,
      la_vat_chat: laVatChat,
    },
    nguong: kqNguong, nguong_gan_nhat: gan,
    ket_luan_phu_thuoc: ketLuanPhuThuoc, nguong_chua_chac: maChuaChac, quy_vuot: quy,
    cau_hoi: cauHoi,
  };
}

/**
 * Bỏ các ngưỡng hộ kinh doanh khỏi một kết quả đã tính — dùng cho DOANH NGHIỆP: ngưỡng 01 / 03 / 50 tỷ
 * trên doanh thu năm nay là luật của hộ kinh doanh, không phải của doanh nghiệp (miễn TNDN xét trên
 * doanh thu năm TRƯỚC). Vẫn giữ phần "chưa rõ đáng kể".
 */
export function khongXetNguong(dc: KetQuaDoChacChan): KetQuaDoChacChan {
  if (dc.trang_thai === 'chua_du_du_lieu') return dc;
  const trangThai: TrangThaiDoChacChan = dc.vat_chat.la_vat_chat ? 'can_xem' : 'chac';
  return {
    ...dc, trang_thai: trangThai, nguong: [], nguong_gan_nhat: null, ket_luan_phu_thuoc: false, nguong_chua_chac: [], quy_vuot: null,
    cau_hoi: trangThai === 'can_xem' ? dc.cau_hoi : null,
  };
}

// ── Ánh xạ về nhãn cũ (tương thích ngược) ─────────────────────────────────────

/** `chac → cao`, `can_xem → trung_binh`, `chua_du_du_lieu → thap`. */
export function nhanDoTinCay(t: TrangThaiDoChacChan): 'cao' | 'trung_binh' | 'thap' {
  return t === 'chac' ? 'cao' : t === 'can_xem' ? 'trung_binh' : 'thap';
}

// ── Doanh thu theo nhóm hoạt động ───────────────────────────────────────────

/**
 * Doanh thu MỘT nhóm hoạt động: phần chưa ai xếp nhóm có thể thuộc nhóm này (mỗi nhóm một tỷ lệ thuế,
 * nên xếp sai là khai sai). Không soi ngưỡng — ngưỡng luật tính trên cả năm, không tính riêng nhóm.
 */
export function doChacChanNhom(
  nhomTien: TienDauVao, chuaXepNhom: TienDauVao, doanhThuNam: TienDauVao,
  khoanChuaXep: { id: string; so_tien: TienDauVao; ngay?: string }[] = [],
): KetQuaDoChacChan {
  const top = [...khoanChuaXep].sort((a, b) => {
    const x = sangBig(a.so_tien) ?? 0n; const y = sangBig(b.so_tien) ?? 0n;
    return x > y ? -1 : x < y ? 1 : a.id < b.id ? -1 : 1;
  }).slice(0, 50);
  return tinhDoChacChan({
    gia_tri: nhomTien, co_the_tang: chuaXepNhom, co_du_lieu: true, bo_qua_nguong: true, doanh_thu_nam: doanhThuNam,
    ung_vien: top.map((k) => ({
      khoa: `hoat_dong:${k.id}`, loai: 'khoan_tien_vao' as const, so_tien: k.so_tien,
      mo_ta: `khoản ${vnd(sangBig(k.so_tien) ?? 0n)}${k.ngay ? ` ngày ${k.ngay.slice(0, 10).split('-').reverse().join('/')}` : ''} thuộc nhóm hoạt động nào`,
      transaction_ids: [k.id],
    })),
  });
}

/** Chuỗi tháng "YYYY-MM" nằm giữa tháng đầu và tháng cuối có dữ liệu mà không có giao dịch nào. */
export function thangThieuDuLieu(ngays: string[]): string[] {
  const co = new Set<string>();
  for (const n of ngays) if (/^\d{4}-\d{2}/.test(n)) co.add(n.slice(0, 7));
  if (co.size < 2) return [];
  const ds = [...co].sort();
  const ra: string[] = [];
  let [y, m] = ds[0].split('-').map(Number);
  const [yc, mc] = ds[ds.length - 1].split('-').map(Number);
  while (y < yc || (y === yc && m < mc)) {
    const k = `${y}-${String(m).padStart(2, '0')}`;
    if (!co.has(k)) ra.push(k);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return ra;
}
