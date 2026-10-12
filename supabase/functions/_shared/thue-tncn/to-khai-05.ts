/**
 * Tờ khai thuế TNCN của tổ chức, cá nhân trả thu nhập từ tiền lương, tiền công — mẫu 05/KK-TNCN.
 *
 * ĐÚNG MẪU NÀO. Bản kèm Thông tư 89/2026/TT-BTC ngày 30/6/2026 (hiệu lực 01/07/2026, Điều 99 khoản 1).
 * Tên chỉ tiêu, mã chỉ tiêu [01]…[45], thứ tự dòng, công thức in trong ô và ba câu Ghi chú chép từ
 * ẢNH bản ký số trên vanban.chinhphu.vn (tệp 89-btc.signed.pdf, trang 307–309 của tệp), không viết
 * lại theo trí nhớ. Quyết định đính chính 2551/QĐ-BTC (15/9/2026) chỉ sửa khoản 5 Điều 99, không đụng
 * mẫu này.
 *
 * KHAI THEO QUÝ. Phụ lục I, mục 7.1 điểm a (trang 207 của tệp) chỉ liệt kê "a.1) Hồ sơ khai thuế theo
 * quý" cho tổ chức trả thu nhập: 05/KK-TNCN và phụ lục 05-1/PBT-KK-TNCN (phân bổ). Không có hồ sơ theo
 * tháng → MIMI chỉ soạn kỳ quý.
 *
 * KỲ TRƯỚC 01/07/2026 KHÔNG SOẠN. Điều 100 khoản 1: hồ sơ có kỳ tính thuế trước 01/07/2026 dùng mẫu
 * biểu áp dụng trước đó (mẫu 05/KK-TNCN theo Thông tư 80/2021/TT-BTC). MIMI không có mẫu cũ → từ chối
 * rõ ràng, không in mẫu mới cho kỳ cũ.
 *
 * AI DÙNG. Câu "(Áp dụng đối với tổ chức, cá nhân trả các khoản thu nhập từ tiền lương, tiền công)"
 * trên mẫu không phân biệt doanh nghiệp hay hộ kinh doanh — hộ kinh doanh thuê lao động cũng là cá
 * nhân trả thu nhập. Ghi chú mẫu: khai cả khi trong quý không khấu trừ đồng nào.
 *
 * CHỈ ĐIỀN Ô CÓ SỐ THẬT. Ô MIMI không biết (thu nhập được miễn, bảo hiểm của doanh nghiệp bảo hiểm
 * nước ngoài, số thuế được miễn) để trống — người dùng hoặc kế toán điền, không điền 0 cho đẹp.
 *
 * MIMI KHÔNG TỰ NỘP. Kết quả là bản nháp; nộp luôn do người bấm.
 *
 * Hàm thuần, test bằng vitest.
 */
import {
  GIAM_TRU_BAN_THAN_THANG_2026, GIAM_TRU_PHU_THUOC_THANG_2026, NAM_AP_DUNG_BIEU_2026, TEN_LOAI_NGUOI,
  tinhNguoi, type KetQuaNguoi, type NguoiLaoDong,
} from './khau-tru.ts';

export const MAU_05 = '05/KK-TNCN' as const;

export interface KyQuy {
  nam: number;
  quy: number;
}

export interface ChiTieuDau05 {
  ma: string;
  nhan: string;
  gia_tri: string | null;
}

export interface DongChiTieu05 {
  stt: string;
  ma: string;
  /** Nguyên văn cột "Chỉ tiêu", kể cả công thức in trong ô. */
  nhan: string;
  don_vi: 'Người' | 'VNĐ';
  /** Dòng in đậm trên mẫu. */
  dam: boolean;
  gia_tri: number | null;
}

export type MaVuong05 = 'THIEU_MST' | 'CAN_CU_CHUA_DOI_CHIEU' | 'NHAP_TAY';

export interface Vuong05 {
  ma: MaVuong05;
  /** true = chặn xuất; false = chỉ cần người xem lại. */
  chan: boolean;
  cau: string;
}

export interface CanCuTncn {
  id: string;
  van_ban: string;
  vi_tri: string;
  y: string;
  /** 'van_ban_goc': MIMI đã đọc trên bản ký số của văn bản. 'thu_cap': chỉ có từ nguồn thứ cấp. */
  nguon: 'van_ban_goc' | 'thu_cap';
}

export interface ToKhai05 {
  mau: typeof MAU_05;
  kem_theo: string;
  tieu_de: string;
  ap_dung: string;
  ky: KyQuy;
  ky_chu: string;
  han_nop: string;
  chi_tieu_dau: ChiTieuDau05[];
  /** [14] Phân bổ thuế do có đơn vị hạch toán phụ thuộc… — MIMI chưa lập phụ lục 05-1/PBT nên luôn không chọn. */
  phan_bo: boolean;
  don_vi_tien: string;
  dong: DongChiTieu05[];
  ghi_chu_mau: string[];
  cam_doan: string;
  cach_tinh: string[];
  canh_bao: string[];
  /** Căn cứ ngoài kho Công báo của MIMI (đọc trên văn bản gốc hoặc nguồn thứ cấp). */
  can_cu_tncn: CanCuTncn[];
  /** Mã căn cứ trong kho (`CAN_CU` của he-luat) — máy chủ đối chiếu bằng `kiemCanCu`. */
  can_cu: string[];
  san_sang: { trang_thai: 'san_sang' | 'can_xem' | 'bi_chan'; vuong: Vuong05[] };
}

export type KetQuaSoan05 =
  | { ok: true; to_khai: ToKhai05; nguoi: KetQuaNguoi[] }
  | { ok: false; ly_do: string };

const KEM_THEO_TT89 = 'Kèm theo Thông tư số 89/2026/TT-BTC ngày 30 tháng 6 năm 2026 của Bộ trưởng Bộ Tài chính';
const AP_DUNG_05 = '(Áp dụng đối với tổ chức, cá nhân trả các khoản thu nhập từ tiền lương, tiền công)';
const CAM_DOAN_05 = 'Tôi cam đoan số liệu khai trên là đúng và chịu trách nhiệm trước pháp luật về những số liệu đã khai./.';

/** Ba câu Ghi chú in cuối mẫu (trang 3 của mẫu), nguyên văn. */
export const GHI_CHU_MAU_05 = [
  'Tờ khai này chỉ áp dụng đối với tổ chức, cá nhân phát sinh trả thu nhập từ tiền lương, tiền công cho cá nhân trong quý, không phân biệt có phát sinh khấu trừ thuế hay không phát sinh khấu trừ thuế.',
  'Chỉ tiêu [28]: Thu nhập được miễn thuế khác là các khoản thu nhập được miễn thuế thu nhập cá nhân theo quy định của pháp luật và các quy định khác do cơ quan nhà nước có thẩm quyền ban hành.',
  'Chỉ tiêu [38], [40]: Số thuế được miễn đối với nhân lực công nghiệp công nghệ số chất lượng cao; công nghệ cao trong thời hạn 05 năm được xác định theo quy định tại Điều 41, Điều 42 Nghị định số 253/2026/NĐ-CP ngày 30/6/2026 của Chính phủ.',
];

/** Bảng chỉ tiêu [15]…[45] — nguyên văn cột STT, Chỉ tiêu, Mã chỉ tiêu, Đơn vị tính; `dam` theo chữ đậm trên mẫu. */
const KHUNG_05: Omit<DongChiTieu05, 'gia_tri'>[] = [
  { stt: '1', ma: '[15]', nhan: 'Tổng số người lao động:', don_vi: 'Người', dam: true },
  { stt: '', ma: '[16]', nhan: 'Trong đó: Cá nhân cư trú có hợp đồng lao động', don_vi: 'Người', dam: false },
  { stt: '2', ma: '[17]', nhan: 'Tổng số cá nhân đã khấu trừ thuế [17]=[18]+[19]', don_vi: 'Người', dam: true },
  { stt: '2.1', ma: '[18]', nhan: 'Cá nhân cư trú', don_vi: 'Người', dam: false },
  { stt: '2.2', ma: '[19]', nhan: 'Cá nhân không cư trú', don_vi: 'Người', dam: false },
  { stt: '3', ma: '[20]', nhan: 'Tổng thu nhập chịu thuế trả cho cá nhân [20]=[21]+[22]', don_vi: 'VNĐ', dam: true },
  { stt: '3.1', ma: '[21]', nhan: 'Cá nhân cư trú', don_vi: 'VNĐ', dam: false },
  { stt: '3.2', ma: '[22]', nhan: 'Cá nhân không cư trú', don_vi: 'VNĐ', dam: false },
  { stt: '3.3', ma: '[23]', nhan: 'Trong đó: Tổng thu nhập chịu thuế từ tiền phí mua bảo hiểm nhân thọ, bảo hiểm không bắt buộc khác của doanh nghiệp bảo hiểm không thành lập tại Việt Nam cho người lao động', don_vi: 'VNĐ', dam: false },
  { stt: '4', ma: '[24]', nhan: 'Tổng thu nhập được miễn trong kỳ [24]=[25]+[26]+[27]+[28]', don_vi: 'VNĐ', dam: true },
  { stt: '4.1', ma: '[25]', nhan: 'Theo quy định của Hợp đồng dầu khí', don_vi: 'VNĐ', dam: false },
  { stt: '4.2', ma: '[26]', nhan: 'Từ thực hiện nhiệm vụ khoa học, công nghệ và đổi mới sáng tạo.', don_vi: 'VNĐ', dam: false },
  { stt: '4.3', ma: '[27]', nhan: 'Thu nhập của chuyên gia hỗ trợ khởi nghiệp sáng tạo theo quy định', don_vi: 'VNĐ', dam: false },
  { stt: '4.4', ma: '[28]', nhan: 'Thu nhập được miễn khác', don_vi: 'VNĐ', dam: false },
  { stt: '5', ma: '[29]', nhan: 'Tổng thu nhập chịu thuế trả cho cá nhân thuộc diện phải khấu trừ thuế [29]=[30]+[31]', don_vi: 'VNĐ', dam: true },
  { stt: '5.1', ma: '[30]', nhan: 'Cá nhân cư trú', don_vi: 'VNĐ', dam: false },
  { stt: '5.2', ma: '[31]', nhan: 'Cá nhân không cư trú', don_vi: 'VNĐ', dam: false },
  { stt: '6', ma: '[32]', nhan: 'Thu nhập tính thuế [32]=[33]+[34]', don_vi: 'VNĐ', dam: true },
  { stt: '6.1', ma: '[33]', nhan: 'Cá nhân cư trú', don_vi: 'VNĐ', dam: false },
  { stt: '6.2', ma: '[34]', nhan: 'Cá nhân không cư trú', don_vi: 'VNĐ', dam: false },
  { stt: '7', ma: '[35]', nhan: 'Số thuế thu nhập cá nhân phải khấu trừ trong kỳ', don_vi: 'VNĐ', dam: true },
  { stt: '8', ma: '[36]', nhan: 'Số thuế được miễn trong kỳ', don_vi: 'VNĐ', dam: true },
  { stt: '8.1', ma: '[37]', nhan: 'Tổng thu nhập của cá nhân là nhân lực công nghiệp công nghệ số chất lượng cao thuộc trường hợp được miễn thuế', don_vi: 'VNĐ', dam: false },
  { stt: '8.2', ma: '[38]', nhan: 'Số thuế được miễn của cá nhân là nhân lực công nghiệp công nghệ số chất lượng cao', don_vi: 'VNĐ', dam: false },
  { stt: '8.3', ma: '[39]', nhan: 'Tổng thu nhập của cá nhân là nhân lực công nghệ cao thuộc trường hợp được miễn thuế', don_vi: 'VNĐ', dam: false },
  { stt: '8.4', ma: '[40]', nhan: 'Số thuế được miễn của cá nhân là nhân lực công nghệ cao thực hiện hoạt động nghiên cứu và phát triển công nghệ cao hoặc công nghệ chiến lược', don_vi: 'VNĐ', dam: false },
  { stt: '8.5', ma: '[41]', nhan: 'Số thuế được miễn khác theo quy định', don_vi: 'VNĐ', dam: false },
  { stt: '9', ma: '[42]', nhan: 'Tổng số thuế thu nhập cá nhân đã khấu trừ [42]=[43]+[44]', don_vi: 'VNĐ', dam: true },
  { stt: '9.1', ma: '[43]', nhan: 'Cá nhân cư trú', don_vi: 'VNĐ', dam: false },
  { stt: '9.2', ma: '[44]', nhan: 'Cá nhân không cư trú', don_vi: 'VNĐ', dam: false },
  { stt: '9.3', ma: '[45]', nhan: 'Trong đó: Tổng số thuế thu nhập cá nhân đã khấu trừ trên tiền phí mua bảo hiểm nhân thọ, bảo hiểm không bắt buộc khác của doanh nghiệp bảo hiểm không thành lập tại Việt Nam cho người lao động', don_vi: 'VNĐ', dam: false },
];

export const MA_CHI_TIEU_05 = KHUNG_05.map((d) => d.ma);

export const CAN_CU_TNCN: Record<string, CanCuTncn> = {
  tt89_d99_k1: { id: 'tt89_d99_k1', van_ban: '89/2026/TT-BTC', vi_tri: 'Điều 99 khoản 1', y: 'Thông tư có hiệu lực từ 01/07/2026.', nguon: 'van_ban_goc' },
  tt89_d100_k1: { id: 'tt89_d100_k1', van_ban: '89/2026/TT-BTC', vi_tri: 'Điều 100 khoản 1', y: 'Hồ sơ khai thuế có kỳ tính thuế trước 01/07/2026 dùng mẫu biểu áp dụng trước đó.', nguon: 'van_ban_goc' },
  tt89_pl1_m7_1a1: { id: 'tt89_pl1_m7_1a1', van_ban: '89/2026/TT-BTC', vi_tri: 'Phụ lục I, mục 7.1 điểm a.1', y: 'Tổ chức, cá nhân trả thu nhập từ tiền lương, tiền công: hồ sơ khai thuế theo quý gồm tờ khai 05/KK-TNCN.', nguon: 'van_ban_goc' },
  tt89_mau_05kk: { id: 'tt89_mau_05kk', van_ban: '89/2026/TT-BTC', vi_tri: 'Mẫu số 05/KK-TNCN, Ghi chú', y: 'Khai cả khi trong quý không phát sinh khấu trừ thuế.', nguon: 'van_ban_goc' },
  luat109_bieu_luy_tien: { id: 'luat109_bieu_luy_tien', van_ban: '109/2025/QH15', vi_tri: 'Điều 9 — biểu thuế lũy tiến từng phần (vị trí theo nguồn thứ cấp)', y: 'Thu nhập tính thuế tháng: đến 10 triệu 5%; trên 10–30 triệu 10%; trên 30–60 triệu 20%; trên 60–100 triệu 30%; trên 100 triệu 35%.', nguon: 'thu_cap' },
  nq110_giam_tru: { id: 'nq110_giam_tru', van_ban: '110/2025/UBTVQH15', vi_tri: 'Mức giảm trừ gia cảnh (điều khoản cụ thể chưa xác minh)', y: 'Giảm trừ gia cảnh từ kỳ tính thuế 2026: bản thân 15,5 triệu đồng/tháng; mỗi người phụ thuộc 6,2 triệu đồng/tháng.', nguon: 'thu_cap' },
};

const tienVN = (n: number) => `${new Intl.NumberFormat('vi-VN').format(n)} đồng`;

const cuoiThang = (nam: number, thang: number) => {
  const d = new Date(Date.UTC(nam, thang, 0));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

/** Hạn nộp hồ sơ khai quý: ngày cuối cùng của tháng đầu quý sau (NĐ 252/2026 Điều 10 khoản 3, có trong kho). */
export function hanNop05(ky: KyQuy): string {
  return ky.quy === 4 ? cuoiThang(ky.nam + 1, 1) : cuoiThang(ky.nam, ky.quy * 3 + 1);
}

/** Kỳ quý soạn được trên mẫu kèm TT 89: từ quý 3/2026. */
export function kyHopLe05(ky: KyQuy): { ok: true } | { ok: false; ly_do: string } {
  if (!Number.isInteger(ky.quy) || ky.quy < 1 || ky.quy > 4) return { ok: false, ly_do: 'Quý phải từ 1 đến 4.' };
  if (!Number.isInteger(ky.nam)) return { ok: false, ly_do: 'Năm tính thuế không hợp lệ.' };
  if (ky.nam < 2026 || (ky.nam === 2026 && ky.quy < 3)) {
    return {
      ok: false,
      ly_do: `Quý ${ky.quy}/${ky.nam} là kỳ tính thuế trước 01/07/2026: khai trên mẫu 05/KK-TNCN theo Thông tư 80/2021/TT-BTC (Điều 100 khoản 1 Thông tư 89/2026/TT-BTC). MIMI chỉ soạn mẫu mới từ quý 3/2026 — kỳ này lập bằng HTKK hoặc phần mềm kế toán.`,
    };
  }
  if (ky.nam < NAM_AP_DUNG_BIEU_2026) return { ok: false, ly_do: 'Biểu thuế MIMI có chỉ áp dụng từ kỳ tính thuế 2026.' };
  return { ok: true };
}

export function soanToKhai05(
  ds: NguoiLaoDong[],
  hoSo: { ten: string | null; mst: string | null; dia_chi?: string | null },
  ky: KyQuy,
  homNay: string,
): KetQuaSoan05 {
  const hl = kyHopLe05(ky);
  if (hl.ok === false) return { ok: false, ly_do: hl.ly_do };
  if (!ds.length) return { ok: false, ly_do: 'Bảng lương chưa có ai.' };

  const nguoi = ds.map((n, i) => tinhNguoi(n, i + 1));
  const cuTru = nguoi.filter((n) => n.loai !== 'khong_cu_tru');
  const khongCuTru = nguoi.filter((n) => n.loai === 'khong_cu_tru');
  const cong = (xs: KetQuaNguoi[], f: (n: KetQuaNguoi) => number) => xs.reduce((s, n) => s + f(n), 0);
  const tnct = (n: KetQuaNguoi) => n.thu_nhap_chiu_thue_quy;
  const coThue = (n: KetQuaNguoi) => n.thue_quy > 0;

  const v: Record<string, number | null> = Object.fromEntries(MA_CHI_TIEU_05.map((m) => [m, null]));
  v['[15]'] = nguoi.length;
  v['[16]'] = nguoi.filter((n) => n.loai === 'cu_tru_hdld').length;
  v['[18]'] = cuTru.filter(coThue).length;
  v['[19]'] = khongCuTru.filter(coThue).length;
  v['[17]'] = (v['[18]'] as number) + (v['[19]'] as number);
  v['[21]'] = cong(cuTru, tnct);
  v['[22]'] = cong(khongCuTru, tnct);
  v['[20]'] = (v['[21]'] as number) + (v['[22]'] as number);
  v['[30]'] = cong(cuTru.filter(coThue), tnct);
  v['[31]'] = cong(khongCuTru.filter(coThue), tnct);
  v['[29]'] = (v['[30]'] as number) + (v['[31]'] as number);

  // Thu nhập tính thuế: chỉ có số cho người MIMI tự tính. Có người nhập tay mà có thu nhập → ô của
  // nhóm đó để trống (MIMI không biết cách xác định thu nhập tính thuế của họ theo văn bản đã đối chiếu).
  const tayCuTru = cuTru.filter((n) => !n.mimi_tinh && n.thu_nhap_chiu_thue_quy > 0);
  const tayKhongCuTru = khongCuTru.filter((n) => n.thu_nhap_chiu_thue_quy > 0);
  v['[33]'] = tayCuTru.length ? null : cong(cuTru, (n) => n.thu_nhap_tinh_thue_quy ?? 0);
  v['[34]'] = tayKhongCuTru.length ? null : 0;
  v['[32]'] = v['[33]'] === null || v['[34]'] === null ? null : v['[33]'] + v['[34]'];

  v['[43]'] = cong(cuTru, (n) => n.thue_quy);
  v['[44]'] = cong(khongCuTru, (n) => n.thue_quy);
  v['[42]'] = (v['[43]'] as number) + (v['[44]'] as number);
  v['[35]'] = v['[42]'];

  const dong: DongChiTieu05[] = KHUNG_05.map((d) => ({ ...d, gia_tri: v[d.ma] }));

  const soMimiTinh = nguoi.filter((n) => n.mimi_tinh).length;
  const cachTinh: string[] = [
    `[15] ${nguoi.length} người trong bảng lương quý ${ky.quy}/${ky.nam}; [16] ${v['[16]']} người cư trú có hợp đồng lao động từ 03 tháng trở lên.`,
    `[17]–[19]: người có số thuế khấu trừ trong quý lớn hơn 0 (cư trú ${v['[18]']}, không cư trú ${v['[19]']}).`,
    `[20]–[22]: cộng thu nhập chịu thuế 3 tháng của từng người theo bảng lương bạn nhập.`,
    `[29]–[31]: thu nhập chịu thuế của những người có phát sinh khấu trừ trong quý. Mẫu không có ghi chú định nghĩa chỉ tiêu này; đây là cách MIMI hiểu — kế toán kiểm lại.`,
  ];
  if (soMimiTinh) {
    cachTinh.push(
      `Thuế từng tháng của người cư trú có HĐLĐ = biểu lũy tiến 5 bậc trên (thu nhập chịu thuế − bảo hiểm bắt buộc − ${tienVN(GIAM_TRU_BAN_THAN_THANG_2026)} giảm trừ bản thân − ${tienVN(GIAM_TRU_PHU_THUOC_THANG_2026)} × số người phụ thuộc), không âm. Làm tròn đến đồng, nửa đồng làm tròn lên — văn bản không quy định cách làm tròn, đây là quy tắc MIMI chọn.`,
      `[33] = tổng thu nhập tính thuế 3 tháng của ${soMimiTinh} người MIMI tự tính.`,
    );
  }
  if (v['[33]'] === null || v['[34]'] === null) {
    cachTinh.push('[32]–[34]: để trống ở nhóm có người bạn tự nhập số thuế — MIMI không tự xác định thu nhập tính thuế của người không có HĐLĐ từ 03 tháng hoặc không cư trú.');
  }
  cachTinh.push(
    `[42]–[44]: cộng số thuế MIMI tính và số thuế bạn nhập cho từng người. [35] lấy bằng [42] — giả định đơn vị đã khấu trừ đủ số phải khấu trừ; nếu khấu trừ thiếu hoặc thừa, sửa lại trước khi nộp.`,
    '[23], [24]–[28], [36]–[41], [45] để trống: MIMI không biết thu nhập được miễn, số thuế được miễn và khoản bảo hiểm của doanh nghiệp bảo hiểm nước ngoài của đơn vị bạn.',
  );

  const canhBao: string[] = [];
  const cuoiQuyNay = cuoiThang(ky.nam, ky.quy * 3);
  if (homNay <= cuoiQuyNay) canhBao.push(`Quý ${ky.quy}/${ky.nam} chưa kết thúc (hết ngày ${cuoiQuyNay.split('-').reverse().join('/')}): soạn lại sau khi chốt lương tháng cuối quý.`);
  canhBao.push('MIMI chưa lập phụ lục 05-1/PBT-KK-TNCN: nếu đơn vị có đơn vị hạch toán phụ thuộc ở tỉnh khác nơi có trụ sở chính (ô [14]), không dùng bản này.');

  const vuong: Vuong05[] = [];
  if (!hoSo.mst) vuong.push({ ma: 'THIEU_MST', chan: true, cau: 'Hồ sơ chưa có mã số thuế — tờ khai thiếu mã số thuế thì không nộp được.' });
  if (soMimiTinh) {
    vuong.push({
      ma: 'CAN_CU_CHUA_DOI_CHIEU',
      chan: false,
      cau: 'Biểu thuế lũy tiến (Luật 109/2025/QH15) và mức giảm trừ gia cảnh 15,5 triệu/6,2 triệu đồng (Nghị quyết 110/2025/UBTVQH15) MIMI lấy từ nguồn thứ cấp, chưa đối chiếu với văn bản đăng Công báo. Kế toán kiểm số thuế từng người trước khi nộp.',
    });
  }
  if (nguoi.some((n) => !n.mimi_tinh)) {
    vuong.push({ ma: 'NHAP_TAY', chan: false, cau: 'Có người MIMI không tự tính thuế (không có HĐLĐ từ 03 tháng hoặc không cư trú): số thuế của họ là số bạn nhập.' });
  }

  const chiTieuDau: ChiTieuDau05[] = [
    { ma: '[01]', nhan: 'Kỳ tính thuế', gia_tri: `Quý ${ky.quy} năm ${ky.nam}` },
    { ma: '[02]', nhan: 'Lần đầu', gia_tri: '✔' },
    { ma: '[03]', nhan: 'Bổ sung lần thứ', gia_tri: null },
    { ma: '[04]', nhan: 'Tên người nộp thuế', gia_tri: hoSo.ten },
    { ma: '[05]', nhan: 'Mã số thuế', gia_tri: hoSo.mst },
    { ma: '[06]', nhan: 'Địa chỉ', gia_tri: hoSo.dia_chi ?? null },
    { ma: '[07]', nhan: 'Xã/Phường/Đặc khu', gia_tri: null },
    { ma: '[08]', nhan: 'Tỉnh/thành phố', gia_tri: null },
    { ma: '[09]', nhan: 'Điện thoại', gia_tri: null },
    { ma: '[10]', nhan: 'Email', gia_tri: null },
    { ma: '[11]', nhan: 'Mã số thuế', gia_tri: null },
    { ma: '[12]', nhan: 'Tên tổ chức, cá nhân cung cấp dịch vụ làm thủ tục về thuế (nếu có)', gia_tri: null },
    { ma: '[13]', nhan: 'Hợp đồng dịch vụ làm thủ tục về thuế: Số', gia_tri: null },
  ];

  const canCuTncn = [CAN_CU_TNCN.tt89_d99_k1, CAN_CU_TNCN.tt89_d100_k1, CAN_CU_TNCN.tt89_pl1_m7_1a1, CAN_CU_TNCN.tt89_mau_05kk];
  if (soMimiTinh) canCuTncn.push(CAN_CU_TNCN.luat109_bieu_luy_tien, CAN_CU_TNCN.nq110_giam_tru);

  return {
    ok: true,
    nguoi,
    to_khai: {
      mau: MAU_05,
      kem_theo: KEM_THEO_TT89,
      tieu_de: 'TỜ KHAI THUẾ THU NHẬP CÁ NHÂN',
      ap_dung: AP_DUNG_05,
      ky,
      ky_chu: `Quý ${ky.quy} năm ${ky.nam}`,
      han_nop: hanNop05(ky),
      chi_tieu_dau: chiTieuDau,
      phan_bo: false,
      don_vi_tien: 'Đơn vị tiền: Đồng Việt Nam',
      dong,
      ghi_chu_mau: GHI_CHU_MAU_05,
      cam_doan: CAM_DOAN_05,
      cach_tinh: cachTinh,
      canh_bao: canhBao,
      can_cu_tncn: canCuTncn,
      can_cu: ['nd252_d10_k3'],
      san_sang: { trang_thai: vuong.some((x) => x.chan) ? 'bi_chan' : vuong.length ? 'can_xem' : 'san_sang', vuong },
    },
  };
}

/** Tên loại người lao động — giao diện dùng lại cho bảng nhập. */
export { TEN_LOAI_NGUOI };
