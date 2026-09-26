/**
 * Dòng thời gian của một việc — SUY TỪ NHẬT KÝ THẬT (`nhat_ky_thay_doi`), không viết sẵn (Prompt 4B mục
 * 13). Mỗi dòng nói ai làm và mức chắc chắn: MIMI/hệ thống làm, bạn nói, hay bạn xác nhận mà MIMI chưa
 * kiểm được. Hàm thuần.
 */
import { DU_KIEN } from '../hanh-trinh/mau.ts';
import { TEN_LOAI_BANG_CHUNG, TEN_TRANG_THAI_VIEC, TEN_XAC_MINH, type LoaiBangChung, type TrangThaiViec, type XacMinh } from './trang-thai.ts';

export interface DongNhatKy {
  doi_tuong: string;
  doi_tuong_id: string;
  hanh_dong: string;
  luc: string;
  // deno-lint-ignore no-explicit-any
  truoc: any;
  // deno-lint-ignore no-explicit-any
  sau: any;
  nguon: string | null;
}

export type DoChac = 'mimi' | 'ban_noi' | 'ban_xac_nhan' | 'he_thong_xac_minh';
export interface DongThoiGian { luc: string; cau: string; do_chac: DoChac }

const TEN_BUOC_TT: Record<string, string> = {
  in_progress: 'đang làm', waiting_external: 'đã nộp, chờ phản hồi', completed: 'xong', skipped: 'không áp dụng',
};

const giaTriDe = (khoa: string, v: unknown): string => {
  const s = String(v ?? '');
  const lc = DU_KIEN[khoa]?.lua_chon?.find((x) => x.gia_tri === s);
  if (lc) return lc.nhan;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.split('-').reverse().join('/');
  return s.length > 80 ? `${s.slice(0, 79)}…` : s;
};

export function dongThoiGian(rows: readonly DongNhatKy[], tenBuoc: Record<string, string> = {}): DongThoiGian[] {
  const ra: DongThoiGian[] = [];
  for (const r of [...rows].sort((a, b) => a.luc.localeCompare(b.luc))) {
    const sau = r.sau ?? {};
    if (r.doi_tuong === 'ho_so_viec' && r.hanh_dong === 'mo') {
      ra.push({ luc: r.luc, cau: sau.tieu_de ? `MIMI mở việc "${sau.tieu_de}".` : 'MIMI mở việc này.', do_chac: 'mimi' });
    } else if (r.doi_tuong === 'hanh_trinh' && r.hanh_dong === 'mo') {
      const biet = Array.isArray(sau.du_kien_biet) && sau.du_kien_biet.length ? ` Đã biết sẵn từ hồ sơ: ${sau.du_kien_biet.map((k: string) => DU_KIEN[k]?.viec ?? k).join('; ')} — không hỏi lại.` : '';
      ra.push({ luc: r.luc, cau: `MIMI xác định thủ tục phù hợp và lập các bước.${biet}`, do_chac: 'mimi' });
    } else if (r.doi_tuong === 'hanh_trinh' && r.hanh_dong === 'tra_loi') {
      for (const [k, v] of Object.entries(sau)) {
        ra.push({ luc: r.luc, cau: `Bạn trả lời: ${(DU_KIEN[k]?.cau ?? k).replace(/\?$/, '')} — ${giaTriDe(k, v)}${r.nguon === 'tro_ly' ? ' (qua Trợ lý)' : ''}.`, do_chac: 'ban_noi' });
      }
    } else if (r.doi_tuong === 'buoc_hanh_trinh' && r.hanh_dong === 'danh_dau') {
      const khoa = String(r.doi_tuong_id).split(':').pop() ?? '';
      const tt = String(sau.trang_thai ?? '');
      const cau = khoa === 'nguoi_dung_nop' && tt === 'waiting_external' ? 'Bạn ghi nhận đã nộp hồ sơ.'
        : `Bạn đánh dấu "${tenBuoc[khoa] ?? khoa}": ${TEN_BUOC_TT[tt] ?? tt}.`;
      ra.push({ luc: r.luc, cau, do_chac: 'ban_xac_nhan' });
    } else if (r.doi_tuong === 'bang_chung_viec' && r.hanh_dong === 'them') {
      const loai = sau.loai as LoaiBangChung;
      const xm = sau.trang_thai_xac_minh as XacMinh;
      const gt = sau.gia_tri ? `: ${String(sau.gia_tri).slice(0, 120)}` : '';
      ra.push({ luc: r.luc, cau: `${TEN_LOAI_BANG_CHUNG[loai] ?? loai}${gt} — ${TEN_XAC_MINH[xm] ?? xm}.`, do_chac: xm === 'system_verified' ? 'he_thong_xac_minh' : 'ban_xac_nhan' });
    } else if (r.doi_tuong === 'ho_so_viec' && r.hanh_dong === 'chuyen_trang_thai') {
      const den = sau.trang_thai as TrangThaiViec;
      const cau = den === 'waiting_external' ? 'Đang chờ bằng chứng phản hồi của cơ quan.'
        : den === 'resolved_user_confirmed' ? 'Việc xong — theo xác nhận của bạn (MIMI chưa có xác nhận của cơ quan).'
          : den === 'resolved_system_verified' ? 'Việc xong — MIMI đã kiểm trên dữ liệu.'
            : den === 'ready_to_act' && r.truoc?.trang_thai === 'needs_information' ? 'Đã đủ thông tin cần thiết.'
              : `Trạng thái: ${TEN_TRANG_THAI_VIEC[den] ?? den}.`;
      ra.push({ luc: r.luc, cau, do_chac: den === 'resolved_system_verified' ? 'he_thong_xac_minh' : 'mimi' });
    } else if (r.doi_tuong === 'ho_so_viec' && r.hanh_dong === 'nhac_theo_doi') {
      ra.push({ luc: r.luc, cau: 'MIMI nhắc bạn kiểm xem đã có phản hồi chưa.', do_chac: 'mimi' });
    } else if (r.doi_tuong === 'ho_so_viec' && r.hanh_dong === 'cap_nhat') {
      ra.push({ luc: r.luc, cau: sau.tieu_de ? `Cập nhật: ${sau.tieu_de}.` : 'MIMI cập nhật việc theo dữ liệu mới.', do_chac: 'mimi' });
    } else if (r.doi_tuong === 'ho_so_viec' && r.hanh_dong === 'huy') {
      ra.push({ luc: r.luc, cau: 'Việc đã huỷ.', do_chac: 'ban_xac_nhan' });
    }
  }
  return ra;
}
