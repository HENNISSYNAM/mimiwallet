/**
 * MIMI Assistant phía giao diện: kiểu dữ liệu (dùng chung với edge function `tro-ly`),
 * định dạng số, câu hỏi gợi ý, và chạy một đề xuất sau khi người dùng xác nhận.
 */
import type { DeXuat, DonVi, NhomNangLuc, O } from '../../supabase/functions/_shared/tro-ly/kieu.ts';
import { ngayHienThi } from '../../supabase/functions/_shared/ngay.ts';

export * from '../../supabase/functions/_shared/tro-ly/kieu.ts';
export { TEN_NHOM } from '../../supabase/functions/_shared/tro-ly/tra-loi.ts';

export function dinhDang(v: O | undefined, donVi: DonVi): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'string') {
    // Ngày giữ chỗ (01/01/1900), chuỗi rỗng, ngày sai → "Chưa xác định", không in một ngày bịa.
    if (donVi === 'ngay') return ngayHienThi(v);
    return v;
  }
  switch (donVi) {
    case 'vnd': return `${new Intl.NumberFormat('vi-VN').format(Math.round(v))} ₫`;
    case 'usd': return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'phan_tram': return `${v}%`;
    default: return new Intl.NumberFormat('vi-VN').format(v);
  }
}

/** Cột số căn phải để các chữ số thẳng hàng. */
export const laCotSo = (d: DonVi) => d !== 'chu' && d !== 'ngay';

/** Câu hỏi gợi ý cho từng nhóm — mỗi câu đều được bộ nhận ý định hiểu mà không cần mô hình. */
export const GOI_Y_THEO_NHOM: Record<NhomNangLuc, string[]> = {
  tro_ly: ['Khoản nào đang chờ tôi duyệt?', 'Agent nào sắp hết hạn mức tháng?'],
  chi_phi: ['Chi phí tháng này tăng hay giảm?', 'Tháng này tôi chi tiêu nhiều nhất cho ai?'],
  chung_tu: ['Khoản chi nào chưa có chứng từ?', 'Năm nay tôi có phải nộp thuế không?'],
  ngan_hang: ['Dòng tiền 6 tháng qua thế nào?', 'Tiền về tháng này khớp hoá đơn nào?', 'Kết nối ngân hàng đang thế nào?'],
  ai_token: ['Tìm các khoản chi AI vượt ngân sách và đề xuất model rẻ hơn.', 'Token dùng theo model 30 ngày qua?'],
  bao_cao: ['Báo cáo thu chi 6 tháng', 'Có khoản nào bị trả trùng không?'],
  ket_noi: ['Kết nối nào đang cần xử lý?'],
};

export type GoiHam = (hanhDong: string, du?: Record<string, unknown>) => Promise<Record<string, unknown>>;

export interface BoGoi {
  goiTacTu: GoiHam;
  goiChiPhiAi: GoiHam;
  goiTroLy: GoiHam;
  dongBoSaoKe: () => Promise<Record<string, unknown>>;
}

/** Việc không đổi dữ liệu nào (mở trang) thì không cần hộp xác nhận. */
export const canXacNhan = (dx: DeXuat) => dx.loai !== 'mo_trang';

/** Việc có dính tới tiền: nút xác nhận đổi chữ và màu để không bấm nhầm theo thói quen. */
export const dinhTien = (dx: DeXuat) => dx.loai === 'duyet_yeu_cau' || dx.loai === 'tu_choi_yeu_cau';

type Row = Record<string, unknown>;

/**
 * Chạy đề xuất bằng đúng backend đã có. Trả câu báo kết quả; lỗi thì ném, câu lỗi là câu
 * máy chủ viết cho người dùng đọc.
 */
export async function thucHienDeXuat(dx: DeXuat, g: BoGoi, tc: { daXacMinh?: boolean } = {}): Promise<string> {
  const t = dx.tham_so;
  switch (dx.loai) {
    case 'duyet_yeu_cau':
      // TCCN-01: `da_xac_minh` chỉ gửi sau khi người dùng đã đọc hộp dấu hiệu bất thường và tích ô xác minh.
      await g.goiTacTu('duyet', { yeu_cau_id: t.yeu_cau_id, ...(tc.daXacMinh ? { da_xac_minh: true } : {}) });
      return 'Đã duyệt. Lệnh trả VietQR nằm ở Kiểm soát agent — người có quyền trả vẫn trả bằng app ngân hàng.';
    case 'tu_choi_yeu_cau':
      await g.goiTacTu('tu_choi', { yeu_cau_id: t.yeu_cau_id, ghi_chu: t.ghi_chu });
      return 'Đã từ chối khoản chi.';
    case 'tam_dung_agent':
      await g.goiTacTu('doi_trang_thai', { tac_tu_id: t.tac_tu_id, trang_thai: 'tam_dung' });
      return 'Đã tạm dừng agent. Bật lại ở Kiểm soát agent khi bạn muốn.';
    case 'dong_bo_chi_phi_ai': {
      const kq = await g.goiChiPhiAi('dong_bo');
      const ds = (Array.isArray(kq.ket_qua) ? kq.ket_qua : []) as Row[];
      const loi = ds.filter((r) => typeof r.loi === 'string' && !r.bo_qua).map((r) => String(r.loi));
      if (ds.length && loi.length === ds.length) throw new Error(loi.join(' '));
      return loi.length ? `Đã lấy số liệu mới, riêng một nguồn báo: ${loi.join(' ')}` : 'Đã lấy số liệu AI mới nhất.';
    }
    case 'cap_nhat_bang_gia': {
      const kq = await g.goiChiPhiAi('cap_nhat_bang_gia');
      if (kq.bo_qua) return 'Bảng giá vừa được cập nhật trong vòng một giờ — dùng bảng hiện có.';
      return `Đã cập nhật giá của ${Number(kq.so_model ?? 0).toLocaleString('vi-VN')} model.`;
    }
    case 'dong_bo_ngan_hang': {
      const kq = await g.dongBoSaoKe();
      const ds = (Array.isArray(kq.synced) ? kq.synced : []) as Row[];
      const moi = ds.reduce((s, r) => s + (Number(r.inserted) || 0), 0);
      const loi = ds.filter((r) => typeof r.error === 'string').map((r) => String(r.remedy ?? r.error));
      return `Đã đồng bộ sao kê: ${moi.toLocaleString('vi-VN')} giao dịch mới.${loi.length ? ` Cần xử lý: ${loi.join(' ')}` : ''}`;
    }
    case 'luu_chung_tu_quet':
      await g.goiTroLy('luu_chung_tu', t);
      return 'Đã lưu chứng từ.';
    case 'mo_trang':
      return '';
  }
}

/**
 * MIMI-P0-001: lịch sử gửi kèm câu hỏi — một cách dựng duy nhất cho trang Trợ lý và widget,
 * để cùng câu hỏi, cùng lịch sử thì máy chủ nhận đúng cùng một yêu cầu.
 */
export function dungLichSu(luot: { cau: string; traLoi?: { cau: string } | null }[]) {
  return luot
    .filter((l): l is { cau: string; traLoi: { cau: string } } => !!l.traLoi)
    .slice(-3)
    .flatMap((l) => [{ vai: 'nguoi_dung' as const, noi_dung: l.cau }, { vai: 'tro_ly' as const, noi_dung: l.traLoi.cau }]);
}
