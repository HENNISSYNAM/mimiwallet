/**
 * LỊCH THUẾ CỦA ĐÚNG DOANH NGHIỆP NÀY — một nguồn cho Tổng quan, Nhắc thuế, Tờ khai, trợ lý, thông báo.
 *
 * Vì sao có file này (25/09/2026): Nhắc thuế một chỗ nói "doanh thu dưới ngưỡng thì không khai quý",
 * chỗ khác vẫn hiện "Kỳ khai Quý 3/2026 — còn 36 ngày" như việc bắt buộc. Thẻ thứ hai đọc LỊCH CHUNG
 * cả nước (`thue/han-ke-khai.ts`), không hỏi doanh nghiệp này có phải khai quý không. Mọi màn hình giờ
 * đọc từ đây, và đây suy từ hệ luật (`he-luat.ts`) trên dữ liệu thật.
 *
 * Mỗi mốc nói rõ LOẠI việc (khai, nộp, tạm nộp, thông báo doanh thu, quyết toán) và TRẠNG THÁI:
 *   phai_lam      có căn cứ trên dữ liệu thật rằng việc này áp dụng;
 *   can_xac_minh  có thể áp dụng nhưng thiếu một dữ kiện — kèm ĐÚNG câu hỏi, không tự coi là bắt buộc;
 *   khong_ap_dung có căn cứ rằng không áp dụng (vẫn hiện, để người dùng biết vì sao).
 * "Chưa biết" KHÔNG bao giờ bị đổi thành "bắt buộc".
 *
 * Hàm thuần.
 */
import { hanNopQuy, type SuKienThue, type SuyLuan } from './he-luat.ts';
import type { TrangThaiDoanhNghiep } from '../doanh-nghiep/trang-thai.ts';

export type LoaiMoc = 'khai_va_nop' | 'tam_nop' | 'thong_bao_doanh_thu' | 'quyet_toan' | 'khai_thue' | 'thong_bao' | 'nop_bao_cao';
export type TrangThaiMoc = 'phai_lam' | 'can_xac_minh' | 'khong_ap_dung';

export interface MocThue {
  khoa: string;
  ten: string;
  loai: LoaiMoc;
  trang_thai: TrangThaiMoc;
  /** YYYY-MM-DD. null khi chưa tính được (thiếu dữ kiện) — không bao giờ là ngày giả. */
  han: string | null;
  con_lai: number | null;
  vi_sao: string;
  can_cu: string[];
  mau?: string;
  /** Khi `can_xac_minh`: đúng một câu hỏi để gỡ. */
  cau_hoi?: string;
  /**
   * Câu hỏi này trả lời được NGAY trên trang (12/10/2026): trường hồ sơ sẽ lưu câu trả lời. Không có
   * trường này nghĩa là câu hỏi cần người khác (kế toán, cơ quan thuế) — trang không hiện nút hứa suông.
   */
  tra_loi?: TruongTraLoi;
}

/**
 * Bốn câu hỏi "cần xác minh" của doanh nghiệp mà chỉ người dùng biết, lưu ở `ho_so_thue` (migration
 * 20261012100000) qua hành động `luu_tra_loi_nghia_vu` của edge function `to-khai`. Trước 12/10/2026
 * không có nơi lưu, nên lịch đứng mãi ở "cần xác minh" (lỗi L16, docs/DONG_BO_THONG_BAO_NHAC_THUE.md).
 */
export type TruongTraLoi = 'tra_luong' | 'ky_khai_gtgt' | 'sieu_nho' | 'phuong_phap_tndn';
export const TRUONG_TRA_LOI: readonly TruongTraLoi[] = ['tra_luong', 'ky_khai_gtgt', 'sieu_nho', 'phuong_phap_tndn'];

export interface TraLoiNghiaVu {
  tra_luong: boolean | null;
  ky_khai_gtgt: 'thang' | 'quy' | null;
  sieu_nho: boolean | null;
  phuong_phap_tndn: 'thu_nhap' | 'ty_le' | null;
}

export const TRA_LOI_TRONG: TraLoiNghiaVu = { tra_luong: null, ky_khai_gtgt: null, sieu_nho: null, phuong_phap_tndn: null };

/** Giá trị hợp lệ của từng câu — máy chủ kiểm bằng đúng danh sách này, giao diện vẽ nút từ đây. */
export const LUA_CHON_TRA_LOI: { [K in TruongTraLoi]: readonly NonNullable<TraLoiNghiaVu[K]>[] } = {
  tra_luong: [true, false],
  ky_khai_gtgt: ['thang', 'quy'],
  sieu_nho: [true, false],
  phuong_phap_tndn: ['thu_nhap', 'ty_le'],
};

export const TEN_LOAI_MOC: Record<LoaiMoc, string> = {
  khai_va_nop: 'Khai và nộp thuế',
  tam_nop: 'Tạm nộp thuế',
  thong_bao_doanh_thu: 'Thông báo doanh thu (không nộp tiền)',
  quyet_toan: 'Quyết toán năm',
  khai_thue: 'Khai thuế',
  thong_bao: 'Thông báo cho cơ quan thuế (không nộp tiền)',
  nop_bao_cao: 'Nộp báo cáo tài chính (không nộp tiền)',
};

const soNgay = (tu: string, den: string) =>
  Math.round((Date.parse(`${den}T00:00:00Z`) - Date.parse(`${tu}T00:00:00Z`)) / 86_400_000);

const quyCua = (ymd: string) => Math.ceil(Number(ymd.slice(5, 7)) / 3);

export interface DuKienLich {
  sk: SuKienThue;
  sl: SuyLuan;
  homNay: string;
  trangThai?: TrangThaiDoanhNghiep | null;
  /** Doanh nghiệp: kỳ khai GTGT, TNCN khấu trừ người dùng đã cho biết. null = chưa biết → hỏi. */
  kyKhaiGtgt?: 'thang' | 'quy' | null;
  /** `companies.employee_count`: '1' = chỉ mình tôi. */
  soNguoi?: string | null;
  /** Doanh nghiệp siêu nhỏ hay không. null = chưa biết. */
  sieuNho?: boolean | null;
  /** Cách nộp TNDN: theo thu nhập tính thuế, hay theo tỷ lệ % trên doanh thu. null = chưa biết. */
  phuongPhapTndn?: 'thu_nhap' | 'ty_le' | null;
  /**
   * Doanh nghiệp: NGƯỜI DÙNG đã xác nhận công ty có trả tiền lương, tiền công hay không. null = chưa xác
   * nhận. `soNguoi` ('2-9'…) KHÔNG đủ: người làm cùng có thể là người nhà không nhận lương.
   */
  traLuong?: boolean | null;
  /** MST 13 số (10 số + "-xxx") — đơn vị trực thuộc. Xem `_shared/mst/ho-so-mst.ts`. */
  donViTrucThuoc?: boolean;
}

/** Ngày thứ 90 kể từ ngày kết thúc năm `nam` (31/12) — năm nhuận là 30/3, năm thường 31/3. */
export function han90NgaySauNam(nam: number): string {
  const d = new Date(Date.UTC(nam, 11, 31));
  d.setUTCDate(d.getUTCDate() + 90);
  return d.toISOString().slice(0, 10);
}

export function lichThue(dk: DuKienLich): MocThue[] {
  const { sk, sl, homNay } = dk;
  const moc = (m: Omit<MocThue, 'con_lai'>): MocThue => ({ ...m, con_lai: m.han ? soNgay(homNay, m.han) : null });
  const ra: MocThue[] = [];
  const tamNgung = dk.trangThai === 'tam_ngung';

  if (sk.loai === 'ho_kinh_doanh') {
    if (sl.doanh_thu_nam === null) {
      ra.push(moc({
        khoa: 'hkd_chua_ro_doanh_thu', ten: 'Chưa biết phải khai theo quý hay chỉ thông báo doanh thu năm',
        loai: 'khai_thue', trang_thai: 'can_xac_minh', han: null,
        vi_sao: 'Doanh thu năm quyết định: từ 01 tỷ đồng trở xuống thì thông báo doanh thu năm; trên 01 tỷ thì khai, nộp theo quý.',
        can_cu: ['nd68_d8_k1a', 'nd141_d1_k1'],
        cau_hoi: 'Kết nối ngân hàng, hoá đơn điện tử, hoặc nhập doanh thu từng quý để MIMI biết bạn thuộc nhóm nào.',
      }));
    }
    // Doanh thu ước tính còn cắt một ngưỡng luật (hệ luật đã dừng, không kết luận): một mốc "cần xác minh"
    // với ĐÚNG MỘT câu hỏi — không hiện mốc khai quý hay thông báo doanh thu như thể đã biết.
    const cc = sk.doanhThuChuaChac;
    if (cc && sl.doanh_thu_nam !== null && (cc.nguong_1_ty || cc.quy_vuot || cc.nguong_50_ty)) {
      ra.push(moc({
        khoa: 'hkd_doanh_thu_chua_chac',
        ten: cc.nguong_1_ty ? 'Chưa chắc phải khai theo quý hay chỉ thông báo doanh thu năm' : 'Chưa chắc khai thuế từ quý nào',
        loai: 'khai_thue', trang_thai: 'can_xac_minh', han: null, vi_sao: cc.cau_hoi.vi_sao,
        can_cu: ['nd68_d8_k1a', 'nd141_d1_k1'], cau_hoi: cc.cau_hoi.cau,
      }));
    }
    // Mọi nghĩa vụ có hạn của hệ luật — nguồn duy nhất về "có phải làm không".
    for (const k of sl.ket_luan) {
      if (k.loai !== 'nghia_vu' || !k.han?.length) continue;
      // Phân loại theo id kết luận, không đoán theo chữ. Id lạ → "thông báo", KHÔNG mặc định thành
      // "khai và nộp thuế" (đó chính là kiểu lỗi làm màn hình nói một việc không bắt buộc là bắt buộc).
      const loai: LoaiMoc = k.id === 'thong_bao_doanh_thu' ? 'thong_bao_doanh_thu'
        : k.id === 'tam_nop_va_quyet_toan' ? 'quyet_toan'
          : k.id === 'khai_tu_quy_vuot' || k.id === 'khai_theo_quy' || k.id === 'chiu_gtgt' || k.id === 'nop_tncn' ? 'khai_va_nop'
            : 'thong_bao';
      for (const han of k.han) {
        ra.push(moc({
          khoa: `${k.id}:${han}`, ten: k.mau ? `${TEN_LOAI_MOC[loai]} — mẫu ${k.mau}` : TEN_LOAI_MOC[loai],
          loai, trang_thai: 'phai_lam', han, vi_sao: k.cau, can_cu: k.can_cu, mau: k.mau,
        }));
      }
    }
  }

  if (sk.loai === 'doanh_nghiep') {
    const nam = Number(homNay.slice(0, 4));
    const quy = quyCua(homNay);
    // Kỳ đang chạy và kỳ vừa hết: hạn của quý vừa hết có thể chưa qua.
    const cacQuy: [number, number][] = [quy === 1 ? [4, nam - 1] : [quy - 1, nam], [quy, nam]];
    for (const [q, n] of cacQuy) {
      ra.push(moc({
        khoa: `tndn_tam_nop:${n}-q${q}`, ten: `Tạm nộp thuế thu nhập doanh nghiệp quý ${q}/${n}`,
        loai: 'tam_nop', trang_thai: 'phai_lam', han: hanNopQuy(q, n),
        vi_sao: 'Doanh nghiệp tạm nộp thuế TNDN theo quý; tổng 4 quý không thấp hơn 80% số quyết toán năm.',
        can_cu: ['nd252_d24_k2'],
      }));
    }
    ra.push(moc({
      khoa: `tndn_quyet_toan:${nam - 1}`, ten: `Quyết toán thuế TNDN năm ${nam - 1}`,
      loai: 'quyet_toan', trang_thai: 'phai_lam', han: `${nam}-03-31`,
      vi_sao: 'Hạn là ngày cuối tháng thứ 3 sau khi kết thúc năm tính thuế (giả định năm tài chính theo năm dương lịch).',
      can_cu: ['nd252_d10_k5a'],
    }));
    ra.push(moc({
      khoa: `tndn_quyet_toan:${nam}`, ten: `Quyết toán thuế TNDN năm ${nam}`,
      loai: 'quyet_toan', trang_thai: 'phai_lam', han: `${nam + 1}-03-31`,
      vi_sao: 'Hạn là ngày cuối tháng thứ 3 sau khi kết thúc năm tính thuế (giả định năm tài chính theo năm dương lịch).',
      can_cu: ['nd252_d10_k5a'],
    }));
    // GTGT: kỳ tháng hay quý do quy mô — chưa biết thì HỎI, không đoán.
    if (!dk.kyKhaiGtgt) {
      ra.push(moc({
        khoa: 'gtgt_ky_khai', ten: 'Khai thuế giá trị gia tăng', loai: 'khai_va_nop', trang_thai: 'can_xac_minh', han: null,
        vi_sao: 'Hạn khai GTGT phụ thuộc công ty khai theo tháng (ngày 20 tháng sau) hay theo quý (cuối tháng đầu quý sau).',
        can_cu: ['nd252_d10_k2', 'nd252_d10_k3'],
        cau_hoi: 'Công ty đang khai thuế GTGT theo tháng hay theo quý?',
        tra_loi: 'ky_khai_gtgt',
      }));
    } else {
      /*
       * Kỳ vừa hết VÀ kỳ đang chạy (12/10/2026), như tạm nộp TNDN: ngày 12/10 hạn GTGT tháng 9 (20/10) còn
       * chưa qua. Trước đây chỉ sinh kỳ đang chạy → nhắc 20/11 trong khi hạn gần nhất là 20/10.
       */
      const thangNay = Number(homNay.slice(5, 7));
      const cacThang: [number, number][] = [thangNay === 1 ? [12, nam - 1] : [thangNay - 1, nam], [thangNay, nam]];
      const cacKy: { ten: string; han: string }[] = dk.kyKhaiGtgt === 'thang'
        ? cacThang.map(([t, n]) => ({ ten: `tháng ${t}/${n}`, han: `${t === 12 ? n + 1 : n}-${String(t === 12 ? 1 : t + 1).padStart(2, '0')}-20` }))
        : cacQuy.map(([q, n]) => ({ ten: `quý ${q}/${n}`, han: hanNopQuy(q, n) }));
      for (const k of cacKy) {
        ra.push(moc({
          khoa: `gtgt:${k.han}`, ten: `Khai và nộp thuế GTGT ${k.ten} (${dk.kyKhaiGtgt === 'thang' ? 'theo tháng' : 'theo quý'})`,
          loai: 'khai_va_nop', trang_thai: 'phai_lam', han: k.han, vi_sao: 'Kỳ khai GTGT bạn đã cho biết.',
          can_cu: [dk.kyKhaiGtgt === 'thang' ? 'nd252_d10_k2' : 'nd252_d10_k3'],
        }));
      }
    }
    /*
     * Báo cáo tài chính năm (26/09/2026, người dùng: "cuối năm còn báo cáo tài chính").
     * Căn cứ đã đối chiếu: TT 58/2026 Điều 10 — CHỈ cho doanh nghiệp siêu nhỏ. Doanh nghiệp khác: kho
     * chưa có văn bản đã đối chiếu → "cần xác minh", không khẳng định hạn.
     */
    for (const namBc of [nam - 1, nam]) {
      const han = han90NgaySauNam(namBc);
      const ten = `Nộp báo cáo tài chính năm ${namBc}`;
      if (dk.sieuNho && dk.phuongPhapTndn === 'ty_le') {
        ra.push(moc({ khoa: `bctc:${namBc}`, ten, loai: 'nop_bao_cao', trang_thai: 'khong_ap_dung', han, vi_sao: 'Doanh nghiệp siêu nhỏ nộp TNDN theo tỷ lệ % trên doanh thu không bắt buộc nộp báo cáo tài chính.', can_cu: ['tt58_d10_k1b'] }));
      } else if (dk.sieuNho && dk.phuongPhapTndn === 'thu_nhap') {
        ra.push(moc({ khoa: `bctc:${namBc}`, ten, loai: 'nop_bao_cao', trang_thai: 'phai_lam', han, vi_sao: 'Doanh nghiệp siêu nhỏ nộp TNDN theo thu nhập tính thuế: nộp báo cáo tài chính năm trong 90 ngày sau khi hết năm.', can_cu: ['tt58_d10_k1a'] }));
      } else {
        /*
         * Hỏi đúng câu còn thiếu (12/10/2026): đã biết phương pháp TNDN mà chưa biết có siêu nhỏ không thì
         * hỏi "siêu nhỏ" — trước đây vẫn hỏi lại câu phương pháp vừa trả lời. Không phải siêu nhỏ: câu hỏi
         * dành cho kế toán, không có nút trả lời nhanh (MIMI chưa có căn cứ để tự kết luận).
         */
        const hoiSieuNho = dk.sieuNho == null && dk.phuongPhapTndn != null;
        ra.push(moc({
          khoa: `bctc:${namBc}`, ten, loai: 'nop_bao_cao', trang_thai: 'can_xac_minh', han,
          vi_sao: dk.sieuNho === false
            ? 'Doanh nghiệp không phải siêu nhỏ: MIMI chưa đối chiếu được văn bản quy định hạn nộp báo cáo tài chính cho nhóm này — hỏi kế toán. Mốc hiển thị là hạn 90 ngày của doanh nghiệp siêu nhỏ để tham khảo.'
            : 'Doanh nghiệp siêu nhỏ nộp TNDN theo thu nhập tính thuế phải nộp báo cáo tài chính năm trong 90 ngày; nộp theo tỷ lệ % trên doanh thu thì không bắt buộc.',
          can_cu: ['tt58_d10_k1a', 'tt58_d10_k1b'],
          cau_hoi: dk.sieuNho === false ? 'Kế toán của công ty có nắm hạn nộp báo cáo tài chính không?'
            : hoiSieuNho ? CAU_HOI_SIEU_NHO : 'Công ty nộp thuế TNDN theo thu nhập tính thuế hay theo tỷ lệ % trên doanh thu?',
          ...(dk.sieuNho === false ? {} : { tra_loi: hoiSieuNho ? 'sieu_nho' as const : 'phuong_phap_tndn' as const }),
        }));
      }
    }
    // TNCN: chỉ tổ chức trả lương mới khấu trừ và quyết toán thay.
    // Câu người dùng xác nhận thắng số người khai lúc đăng ký: đăng ký "chỉ mình tôi" rồi sau đó xác nhận có
    // trả lương (đã thuê người) thì theo câu xác nhận.
    const khongTraLuong = dk.traLuong === false || (dk.traLuong !== true && dk.soNguoi === '1');
    if (khongTraLuong) {
      ra.push(moc({
        khoa: 'tncn_khau_tru', ten: 'Khấu trừ, quyết toán thuế TNCN cho người lao động', loai: 'quyet_toan', trang_thai: 'khong_ap_dung', han: null,
        vi_sao: dk.traLuong === false ? 'Bạn xác nhận công ty không trả tiền lương, tiền công.' : 'Bạn cho biết chỉ có mình bạn làm, không trả lương cho người lao động.',
        can_cu: [],
      }));
    } else {
      const coLuong = dk.traLuong === true;
      ra.push(moc({
        khoa: `tncn_quyet_toan:${nam - 1}`, ten: `Quyết toán thuế TNCN năm ${nam - 1} (tổ chức trả thu nhập)`,
        loai: 'quyet_toan', trang_thai: coLuong ? 'phai_lam' : 'can_xac_minh', han: `${nam}-03-31`,
        vi_sao: 'Tổ chức trả tiền lương, tiền công phải khấu trừ và quyết toán TNCN; hạn cuối tháng thứ 3 sau năm.',
        can_cu: ['nd252_d10_k5a'],
        ...(coLuong ? {} : { cau_hoi: CAU_HOI_TRA_LUONG, tra_loi: 'tra_luong' as const }),
      }));
      /*
       * Khai TNCN đã khấu trừ THEO QUÝ — mẫu 05/KK-TNCN (11/10/2026).
       * Nguồn thứ cấp: Thông tư 89/2026/TT-BTC bỏ kỳ khai tháng, áp dụng từ kỳ quý 3/2026 → chỉ sinh mốc từ
       * quý 3/2026, không sinh quý 2/2026 trở về trước (kỳ đó theo quy định cũ, MIMI không suy).
       * Hạn: quy tắc chung cho "loại thuế khai theo quý" — NĐ 252 Điều 10 khoản 3, đã đối chiếu, đúng
       * `hanNopQuy`. Phần "TNCN khấu trừ khai theo quý" là TT 89 — CHƯA đối chiếu Công báo, nhãn ghi rõ.
       * Chưa biết công ty có trả lương → "cần xác minh" với đúng một câu hỏi, không bao giờ "phải làm".
       * Mốc NHẮC thôi; tờ khai 05/KK-TNCN do `to-khai.ts` soạn.
       */
      for (const [q, n] of cacQuy) {
        if (n < 2026 || (n === 2026 && q < 3)) continue;
        ra.push(moc({
          khoa: `tncn_khai_quy:${n}-q${q}`, ten: `Khai thuế TNCN đã khấu trừ quý ${q}/${n} — mẫu 05/KK-TNCN`,
          loai: 'khai_va_nop', trang_thai: coLuong ? 'phai_lam' : 'can_xac_minh', han: hanNopQuy(q, n),
          vi_sao: coLuong
            ? 'Công ty trả tiền lương, tiền công: khai số thuế TNCN đã khấu trừ theo quý (từ kỳ quý 3/2026 không còn khai tháng); hạn ngày cuối tháng đầu của quý sau.'
            : 'Chỉ tổ chức trả tiền lương, tiền công mới phải khai TNCN đã khấu trừ theo quý (từ kỳ quý 3/2026). MIMI chưa biết công ty có trả lương không.',
          can_cu: ['nd252_d10_k3', 'tt89_tncn_khai_quy'], mau: '05/KK-TNCN',
          ...(coLuong ? {} : { cau_hoi: CAU_HOI_TRA_LUONG, tra_loi: 'tra_luong' as const }),
        }));
      }
    }
    /*
     * Đơn vị trực thuộc (MST 13 số). Kho chưa có căn cứ đã đối chiếu nói đơn vị trực thuộc tự khai hay đơn
     * vị chủ quản khai thay từng loại thuế → không khẳng định; một mốc "cần xác minh" với đúng một câu hỏi.
     */
    if (dk.donViTrucThuoc) {
      ra.push(moc({
        khoa: 'don_vi_truc_thuoc', ten: 'Đơn vị trực thuộc: tự khai hay đơn vị chủ quản khai thay', loai: 'khai_thue', trang_thai: 'can_xac_minh', han: null,
        vi_sao: 'Mã số thuế có đuôi "-xxx" là của đơn vị trực thuộc. Tuỳ loại thuế, đơn vị trực thuộc tự khai với cơ quan thuế quản lý mình hoặc đơn vị chủ quản khai thay — MIMI chưa có căn cứ đã đối chiếu để nói thay bạn. Các mốc bên trên là của một doanh nghiệp tự khai.',
        can_cu: [],
        cau_hoi: 'Đơn vị này tự nộp tờ khai thuế, hay đơn vị chủ quản khai thay?',
      }));
    }
  }

  // Tạm ngừng: không phải khai kỳ nằm trọn trong thời gian tạm ngừng — nhưng chưa biết có trọn kỳ
  // không, nên chuyển sang "cần xác minh", không xoá.
  /*
   * Ngừng hoạt động / đã đóng MST / không ở địa chỉ đăng ký (11/10/2026). Kho chưa có căn cứ đã đối chiếu
   * nói kỳ nào còn phải khai trong các trạng thái này → không xoá mốc, không giữ "phải làm": chuyển sang
   * "cần xác minh" và nói rõ cơ quan thuế ghi gì. Trước đây các trạng thái này vẫn hiện "phải làm" như
   * doanh nghiệp đang hoạt động.
   */
  const ngung = dk.trangThai === 'ngung_chua_dong_mst' || dk.trangThai === 'da_dong_mst' || dk.trangThai === 'khong_o_dia_chi';
  if (ngung) {
    const ghi = dk.trangThai === 'da_dong_mst' ? 'mã số thuế đã chấm dứt hiệu lực'
      : dk.trangThai === 'ngung_chua_dong_mst' ? 'đã ngừng hoạt động, chưa đóng mã số thuế' : 'không hoạt động tại địa chỉ đăng ký';
    for (const m of ra) {
      if (m.trang_thai !== 'phai_lam') continue;
      m.trang_thai = 'can_xac_minh';
      m.vi_sao = `Cơ quan thuế ghi ${ghi}. MIMI không tự coi kỳ này là bắt buộc hay miễn. ${m.vi_sao}`;
      m.cau_hoi = 'Cơ quan thuế ghi trạng thái này có đúng với tình hình hiện tại của bạn không?';
      delete m.tra_loi;
    }
  }

  if (tamNgung) {
    for (const m of ra) {
      if (m.trang_thai === 'phai_lam' && (m.loai === 'khai_va_nop' || m.loai === 'tam_nop' || m.loai === 'thong_bao_doanh_thu')) {
        m.trang_thai = 'can_xac_minh';
        m.vi_sao = `Cơ quan thuế ghi doanh nghiệp đang tạm ngừng. Kỳ nằm trọn trong thời gian tạm ngừng thì không phải khai; không trọn thì vẫn phải khai. ${m.vi_sao}`;
        m.can_cu = [...m.can_cu, 'nd252_d7_c1'];
        m.cau_hoi = 'Thời gian tạm ngừng có trọn kỳ này không?';
        delete m.tra_loi;
      }
    }
  }

  return ra.sort((a, b) => (a.han ?? '9999').localeCompare(b.han ?? '9999'));
}

/** Câu hỏi gỡ mọi mốc TNCN của tổ chức trả thu nhập — một câu, dùng chung để không hỏi hai lần hai kiểu. */
export const CAU_HOI_TRA_LUONG = 'Công ty có trả lương cho người lao động không?';
/** Câu hỏi khi đã biết phương pháp TNDN mà chưa biết quy mô — TT 58/2026 Điều 10 chỉ nói về doanh nghiệp siêu nhỏ. */
export const CAU_HOI_SIEU_NHO = 'Công ty có phải doanh nghiệp siêu nhỏ không?';

export interface NghiaVu {
  /** Phần khoá trước dấu ":" — một nghĩa vụ, nhiều kỳ. */
  khoa: string;
  ten: string;
  loai: LoaiMoc;
  trang_thai: TrangThaiMoc;
  vi_sao: string;
  can_cu: string[];
  mau?: string;
  cau_hoi?: string;
  tra_loi?: TruongTraLoi;
  /** Hạn gần nhất chưa qua (hoặc hạn muộn nhất nếu mọi kỳ đã qua). null khi chưa tính được. */
  han: string | null;
  so_ky: number;
}

/**
 * Hồ sơ nghĩa vụ: gom các mốc của CÙNG lịch theo nghĩa vụ (phần khoá trước ":") và trạng thái — đầu trang
 * Nhắc thuế đọc từ đây, không dựng lịch thứ hai. Nghĩa vụ có kỳ ở hai trạng thái (ví dụ tạm ngừng chỉ
 * với một kỳ) hiện ở cả hai nhóm.
 */
export function nghiaVuTuLich(lich: MocThue[]): Record<TrangThaiMoc, NghiaVu[]> {
  const ra: Record<TrangThaiMoc, NghiaVu[]> = { phai_lam: [], can_xac_minh: [], khong_ap_dung: [] };
  const theoKhoa = new Map<string, MocThue[]>();
  for (const m of lich) {
    const k = `${m.trang_thai}|${m.khoa.split(':')[0]}`;
    theoKhoa.set(k, [...(theoKhoa.get(k) ?? []), m]);
  }
  for (const ds of theoKhoa.values()) {
    const sapToi = ds.find((m) => m.con_lai !== null && m.con_lai >= 0) ?? ds[ds.length - 1];
    ra[sapToi.trang_thai].push({
      khoa: sapToi.khoa.split(':')[0], ten: sapToi.ten, loai: sapToi.loai, trang_thai: sapToi.trang_thai,
      vi_sao: sapToi.vi_sao, can_cu: sapToi.can_cu, mau: sapToi.mau, cau_hoi: sapToi.cau_hoi, tra_loi: sapToi.tra_loi, han: sapToi.han, so_ky: ds.length,
    });
  }
  return ra;
}

/** Mốc kế tiếp còn phải để ý: chưa qua hạn, phải làm hoặc cần xác minh. */
export function mocKeTiep(lich: MocThue[]): MocThue | null {
  return lich.find((m) => m.trang_thai !== 'khong_ap_dung' && m.con_lai !== null && m.con_lai >= 0) ?? null;
}
