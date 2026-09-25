/**
 * Ngữ cảnh làm việc có cấu trúc — Prompt 4 mục 24. Hàm thuần.
 *
 * Thay cho việc dồn lịch sử hội thoại dài: gửi mô hình ĐÚNG những gì đang dở — việc đang mở, dữ kiện
 * người dùng đã xác nhận, câu còn thiếu, hạn thuế kế tiếp. Có trần độ dài; chữ trong đây là dữ liệu của
 * công ty, và lời dặn hệ thống đã nói mô hình không làm theo chỉ dẫn nằm trong dữ liệu.
 */
import type { HanhTrinhDay } from '../hanh-trinh/luu.ts';
import { DU_KIEN } from '../hanh-trinh/mau.ts';
import type { SanSangThue } from '../luat/san-sang-thue.ts';

export interface NguCanhLamViec {
  viec_dang_mo: { id: string; loai: string; tieu_de: string; trang_thai: string; cau_con_thieu: string | null; buoc_xong: number; tong_buoc: number }[];
  du_kien_da_biet: { khoa: string; cau: string; gia_tri: string }[];
  thue_ke_tiep: { viec: string | null; han: string | null; trang_thai: string } | null;
}

export const TRAN_NGU_CANH = 3000;

export function dungNguCanh(o: { hanhTrinh: HanhTrinhDay[]; sanSang?: SanSangThue | null }): NguCanhLamViec {
  const viec = o.hanhTrinh.slice(0, 5).map((h) => ({
    id: h.id, loai: h.loai, tieu_de: h.tieu_de, trang_thai: h.trang_thai, cau_con_thieu: h.cau_hoi?.cau ?? null,
    buoc_xong: h.buoc.filter((b) => b.trang_thai === 'completed' || b.trang_thai === 'skipped').length, tong_buoc: h.buoc.length,
  }));
  const daBiet = new Map<string, { khoa: string; cau: string; gia_tri: string }>();
  for (const h of o.hanhTrinh) {
    for (const [k, v] of Object.entries(h.du_kien)) {
      if (!daBiet.has(k)) daBiet.set(k, { khoa: k, cau: DU_KIEN[k]?.cau ?? k, gia_tri: String(v.gia_tri).slice(0, 200) });
    }
  }
  return {
    viec_dang_mo: viec,
    du_kien_da_biet: [...daBiet.values()].slice(0, 20),
    thue_ke_tiep: o.sanSang ? { viec: o.sanSang.ten_viec, han: o.sanSang.han, trang_thai: o.sanSang.trang_thai } : null,
  };
}

/** Bản chữ gửi mô hình, có trần. */
export function nguCanhChoMoHinh(n: NguCanhLamViec): string {
  const dong: string[] = [];
  for (const v of n.viec_dang_mo) dong.push(`- Việc đang mở: ${v.tieu_de} (${v.buoc_xong}/${v.tong_buoc} bước)${v.cau_con_thieu ? `; còn hỏi: ${v.cau_con_thieu}` : ''}`);
  for (const d of n.du_kien_da_biet) dong.push(`- Đã biết: ${d.cau} → ${d.gia_tri}`);
  if (n.thue_ke_tiep?.viec) dong.push(`- Việc thuế kế tiếp: ${n.thue_ke_tiep.viec}, hạn ${n.thue_ke_tiep.han ?? 'chưa xác định'} (${n.thue_ke_tiep.trang_thai})`);
  return dong.join('\n').slice(0, TRAN_NGU_CANH);
}
