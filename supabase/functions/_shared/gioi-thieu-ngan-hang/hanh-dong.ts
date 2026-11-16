/**
 * BƯỚC TIẾP THEO NÊN LÀM (next-best-acquisition action) — 16/11/2026, hàm thuần, tất định.
 *
 * Với mỗi nhu cầu đã khớp, chọn KÊNH và LÚC phù hợp nhất để chủ doanh nghiệp tìm hiểu thêm:
 *   - `van_phong_ke_toan` : qua văn phòng kế toán đang làm sổ cho bạn (chỉ khi công ty có thành viên kế toán);
 *   - `the_trong_ung_dung`: một thẻ trong MIMI, hiện sau hạn khai thuế quý kế tiếp (lúc số liệu vừa được rà) hoặc trước
 *                           tháng dự kiến vượt ngưỡng;
 *   - `gap_chuyen_vien`   : gặp chuyên viên ngân hàng — CHỈ KHI BẠN YÊU CẦU (không ai gọi cho bạn nếu bạn không bấm).
 *
 * Giá trị kỳ vọng = độ tin cậy dấu hiệu × độ mạnh nhu cầu × độ hợp kênh. ĐÂY LÀ QUY TẮC KINH NGHIỆM (heuristic), các hệ số
 * trong `HOP_KENH` chưa được hiệu chỉnh — sẽ thay bằng tỉ lệ chuyển đổi đo được khi có dữ liệu thí điểm.
 */
import { NHU_CAU_CO_GOI, type NhuCau, type NhuCauKhop } from './khop-goi.ts';
import type { KetQuaTinHieu, Ngon } from './tin-hieu.ts';

export const KENH = ['van_phong_ke_toan', 'the_trong_ung_dung', 'gap_chuyen_vien'] as const;
export type Kenh = (typeof KENH)[number];

export const HOP_KENH: Record<NhuCau, Record<Kenh, number>> = {
  von_luu_dong: { gap_chuyen_vien: 0.8, van_phong_ke_toan: 0.7, the_trong_ung_dung: 0.5 },
  tai_khoan_doanh_nghiep: { the_trong_ung_dung: 0.8, van_phong_ke_toan: 0.6, gap_chuyen_vien: 0.4 },
  ngoai_te: { gap_chuyen_vien: 0.7, the_trong_ung_dung: 0.6, van_phong_ke_toan: 0.4 },
  tien_gui: { the_trong_ung_dung: 0.7, gap_chuyen_vien: 0.6, van_phong_ke_toan: 0.3 },
  uu_tien_chu: { gap_chuyen_vien: 0.9, the_trong_ung_dung: 0.4, van_phong_ke_toan: 0.3 },
  bao_hiem: { van_phong_ke_toan: 0.5, the_trong_ung_dung: 0.5, gap_chuyen_vien: 0.4 },
};

export const NHAN_HEURISTIC: Record<Ngon, string> = {
  vi: 'Thứ tự gợi ý theo quy tắc kinh nghiệm (độ tin cậy × độ mạnh nhu cầu × độ hợp kênh), chưa hiệu chỉnh bằng dữ liệu thí điểm.',
  en: 'Ordering follows a heuristic (signal confidence × need strength × channel fit), not yet calibrated on pilot data.',
};

export const TEN_KENH: Record<Ngon, Record<Kenh, string>> = {
  vi: { van_phong_ke_toan: 'Qua văn phòng kế toán của bạn', the_trong_ung_dung: 'Thẻ nhắc trong MIMI', gap_chuyen_vien: 'Gặp chuyên viên ngân hàng khi bạn yêu cầu' },
  en: { van_phong_ke_toan: 'Through your accounting firm', the_trong_ung_dung: 'A reminder card in MIMI', gap_chuyen_vien: 'Meet a bank officer when you ask' },
};

export type LucNen = 'ngay' | 'sau_han_khai_thue' | 'truoc_thang_vuot_nguong';

export interface NguCanhHanhDong {
  hom_nay: string;
  /** Công ty có thành viên vai trò kế toán (văn phòng kế toán dịch vụ) hay không. */
  co_ke_toan: boolean;
  ngon: Ngon;
}

export interface HanhDongDeXuat {
  nhu_cau: NhuCau;
  kenh: Kenh;
  ten_kenh: string;
  luc: LucNen;
  ngay_goi_y: string | null;
  gia_tri_ky_vong: number;
  thanh_phan: { tin_cay: number; do_manh: number; hop_kenh: number };
  cau: string;
  kenh_khac: { kenh: Kenh; gia_tri_ky_vong: number }[];
  /** Gặp chuyên viên luôn chỉ xảy ra khi chủ bấm yêu cầu. */
  can_chu_yeu_cau: boolean;
}

const cuoiThang = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
const congNgay = (ymd: string, n: number) => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/**
 * Hạn khai thuế theo quý kế tiếp (hộ kinh doanh khai quý: ngày cuối của tháng đầu quý sau). Lịch đầy đủ của từng công ty
 * nằm ở `luat/lich-thue.ts`; ở đây chỉ cần mốc gần để hẹn thẻ nhắc.
 */
export function hanKhaiQuyKeTiep(homNay: string): string {
  const y = Number(homNay.slice(0, 4));
  const m = Number(homNay.slice(5, 7));
  const thangDauQuy = Math.floor((m - 1) / 3) * 3 + 1;
  const hanQuyTruoc = cuoiThang(y, thangDauQuy);
  if (homNay <= hanQuyTruoc) return hanQuyTruoc;
  const t = thangDauQuy + 3;
  return t > 12 ? cuoiThang(y + 1, t - 12) : cuoiThang(y, t);
}

const CAU: Record<Ngon, Record<Kenh, (n: string, ngay: string | null) => string>> = {
  vi: {
    van_phong_ke_toan: (n) => `Nhờ văn phòng kế toán xem cùng bạn nhu cầu "${n}" ở lần rà sổ tới.`,
    the_trong_ung_dung: (n, ngay) => `MIMI nhắc lại nhu cầu "${n}" ${ngay ? `vào ngày ${ngay.split('-').reverse().join('/')}` : 'khi bạn mở MIMI lần tới'}, kèm số liệu mới nhất.`,
    gap_chuyen_vien: (n) => `Nếu bạn muốn, bấm "Muốn ngân hàng liên hệ" để chuyên viên gọi lại về "${n}". Không bấm thì không ai gọi.`,
  },
  en: {
    van_phong_ke_toan: (n) => `Ask your accounting firm to review "${n}" with you at the next bookkeeping review.`,
    the_trong_ung_dung: (n, ngay) => `MIMI will remind you about "${n}" ${ngay ? `on ${ngay}` : 'next time you open MIMI'}, with the latest figures.`,
    gap_chuyen_vien: (n) => `If you wish, press "I want the bank to contact me" and an officer will call about "${n}". Nobody calls unless you do.`,
  },
};

export function deXuatHanhDong(nhuCau: readonly NhuCauKhop[], th: KetQuaTinHieu, ng: NguCanhHanhDong): HanhDongDeXuat[] {
  const han = hanKhaiQuyKeTiep(ng.hom_nay);
  const sap = th.tin_hieu.find((t) => t.ma === 'sap_vuot_nguong');
  const thangVuot = sap ? String(sap.bang_chung.so.thang_du_kien ?? '') : '';
  const ra: HanhDongDeXuat[] = [];
  for (const n of nhuCau) {
    const kenhCo = KENH.filter((k) => k !== 'van_phong_ke_toan' || ng.co_ke_toan);
    const diem = kenhCo
      .map((k) => ({ kenh: k, gia_tri_ky_vong: Math.round(n.tin_cay * n.do_manh * HOP_KENH[n.nhu_cau][k] * 1000) / 1000 }))
      .sort((a, b) => b.gia_tri_ky_vong - a.gia_tri_ky_vong || KENH.indexOf(a.kenh) - KENH.indexOf(b.kenh));
    const tot = diem[0];
    let luc: LucNen = 'ngay';
    let ngay: string | null = null;
    if (n.tu_dau_hieu.includes('sap_vuot_nguong') && /^\d{4}-\d{2}$/.test(thangVuot)) {
      luc = 'truoc_thang_vuot_nguong';
      // Nhắc một tháng trước tháng dự kiến vượt (không sớm hơn hôm nay).
      const [y, m] = thangVuot.split('-').map(Number);
      const truoc = m === 1 ? `${y - 1}-12-01` : `${y}-${String(m - 1).padStart(2, '0')}-01`;
      ngay = truoc > ng.hom_nay ? truoc : ng.hom_nay;
    } else if (tot.kenh === 'the_trong_ung_dung') {
      luc = 'sau_han_khai_thue';
      ngay = congNgay(han, 1);
    }
    ra.push({
      nhu_cau: n.nhu_cau, kenh: tot.kenh, ten_kenh: TEN_KENH[ng.ngon][tot.kenh], luc, ngay_goi_y: ngay,
      gia_tri_ky_vong: tot.gia_tri_ky_vong,
      thanh_phan: { tin_cay: n.tin_cay, do_manh: n.do_manh, hop_kenh: HOP_KENH[n.nhu_cau][tot.kenh] },
      cau: CAU[ng.ngon][tot.kenh](n.ten, ngay),
      kenh_khac: diem.slice(1),
      can_chu_yeu_cau: tot.kenh === 'gap_chuyen_vien',
    });
  }
  // Nhu cầu không có gói (bảo hiểm) vẫn hiện, nhưng xếp sau.
  return ra.sort((a, b) => Number((NHU_CAU_CO_GOI as readonly string[]).includes(b.nhu_cau)) - Number((NHU_CAU_CO_GOI as readonly string[]).includes(a.nhu_cau))
    || b.gia_tri_ky_vong - a.gia_tri_ky_vong);
}
