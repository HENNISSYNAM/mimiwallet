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

export type LoaiMoc = 'khai_va_nop' | 'tam_nop' | 'thong_bao_doanh_thu' | 'quyet_toan' | 'khai_thue' | 'thong_bao';
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
}

export const TEN_LOAI_MOC: Record<LoaiMoc, string> = {
  khai_va_nop: 'Khai và nộp thuế',
  tam_nop: 'Tạm nộp thuế',
  thong_bao_doanh_thu: 'Thông báo doanh thu (không nộp tiền)',
  quyet_toan: 'Quyết toán năm',
  khai_thue: 'Khai thuế',
  thong_bao: 'Thông báo cho cơ quan thuế (không nộp tiền)',
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
      }));
    } else {
      const han = dk.kyKhaiGtgt === 'thang'
        ? (() => { const d = new Date(`${homNay.slice(0, 7)}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + 1); return `${d.toISOString().slice(0, 7)}-20`; })()
        : hanNopQuy(quy, nam);
      ra.push(moc({
        khoa: `gtgt:${han}`, ten: `Khai và nộp thuế GTGT (${dk.kyKhaiGtgt === 'thang' ? 'theo tháng' : 'theo quý'})`,
        loai: 'khai_va_nop', trang_thai: 'phai_lam', han, vi_sao: 'Kỳ khai GTGT bạn đã cho biết.',
        can_cu: [dk.kyKhaiGtgt === 'thang' ? 'nd252_d10_k2' : 'nd252_d10_k3'],
      }));
    }
    // TNCN: chỉ tổ chức trả lương mới khấu trừ và quyết toán thay.
    if (dk.soNguoi === '1') {
      ra.push(moc({
        khoa: 'tncn_khau_tru', ten: 'Khấu trừ, quyết toán thuế TNCN cho người lao động', loai: 'quyet_toan', trang_thai: 'khong_ap_dung', han: null,
        vi_sao: 'Bạn cho biết chỉ có mình bạn làm, không trả lương cho người lao động.', can_cu: [],
      }));
    } else {
      ra.push(moc({
        khoa: `tncn_quyet_toan:${nam - 1}`, ten: `Quyết toán thuế TNCN năm ${nam - 1} (tổ chức trả thu nhập)`,
        loai: 'quyet_toan', trang_thai: 'can_xac_minh', han: `${nam}-03-31`,
        vi_sao: 'Tổ chức trả tiền lương, tiền công phải khấu trừ và quyết toán TNCN; hạn cuối tháng thứ 3 sau năm.',
        can_cu: ['nd252_d10_k5a'],
        cau_hoi: 'Công ty có trả lương cho người lao động không?',
      }));
    }
  }

  // Tạm ngừng: không phải khai kỳ nằm trọn trong thời gian tạm ngừng — nhưng chưa biết có trọn kỳ
  // không, nên chuyển sang "cần xác minh", không xoá.
  if (tamNgung) {
    for (const m of ra) {
      if (m.trang_thai === 'phai_lam' && (m.loai === 'khai_va_nop' || m.loai === 'tam_nop' || m.loai === 'thong_bao_doanh_thu')) {
        m.trang_thai = 'can_xac_minh';
        m.vi_sao = `Cơ quan thuế ghi doanh nghiệp đang tạm ngừng. Kỳ nằm trọn trong thời gian tạm ngừng thì không phải khai; không trọn thì vẫn phải khai. ${m.vi_sao}`;
        m.can_cu = [...m.can_cu, 'nd252_d7_c1'];
        m.cau_hoi = 'Thời gian tạm ngừng có trọn kỳ này không?';
      }
    }
  }

  return ra.sort((a, b) => (a.han ?? '9999').localeCompare(b.han ?? '9999'));
}

/** Mốc kế tiếp còn phải để ý: chưa qua hạn, phải làm hoặc cần xác minh. */
export function mocKeTiep(lich: MocThue[]): MocThue | null {
  return lich.find((m) => m.trang_thai !== 'khong_ap_dung' && m.con_lai !== null && m.con_lai >= 0) ?? null;
}
