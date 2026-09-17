/**
 * MIMI-P0-002 — độ đầy đủ của dữ liệu đứng sau mỗi con số.
 *
 * Trước đây `tro-ly` đọc tối đa 10.000 giao dịch, 5.000 hoá đơn… rồi cộng, và không ai biết
 * tổng đó có bị cắt hay không. Module này là hợp đồng dùng chung: mỗi nguồn đọc được đi kèm
 * `DoDayNguon`; kết quả nào dựa trên nguồn thiếu thì câu trả lời PHẢI nói ra, ngay cạnh con số.
 *
 * Hàm thuần, không import gì ngoài kiểu — trình duyệt và Deno cùng dùng được.
 */
import type { DoDayNguon, KetQuaNangLuc, TrangThaiDoDay } from './kieu.ts';

/** Quá ngưỡng này kể từ lần đồng bộ gần nhất thì số liệu của nguồn coi là cũ. */
export const NGUONG_CU_GIO: Record<string, number> = {
  giao_dich: 72,
  chi_phi_ai: 48,
  token_ai: 48,
};

export function danhGiaDoDay(o: {
  nguon: string;
  ten: string;
  /** Số dòng thực sự đã đọc về. */
  daDoc: number;
  /** Tổng số dòng khớp điều kiện trong CSDL (count exact); null khi không đếm được. */
  tong: number | null;
  /** Giới hạn đọc của truy vấn. Không đếm được tổng mà đã đọc chạm giới hạn thì coi là bị cắt. */
  gioiHan?: number;
  tu?: string | null;
  den?: string | null;
  /** Lần đồng bộ gần nhất của nguồn nối ngoài; null khi nguồn không có đồng bộ. */
  dongBoLuc?: string | null;
  /** Nguồn này cần một kết nối (ngân hàng, API) mới có dữ liệu. */
  canKetNoi?: boolean;
  coKetNoi?: boolean;
  bayGio?: Date;
}): DoDayNguon {
  // Không đếm được tổng: chỉ biết chắc là đủ khi chưa chạm giới hạn đọc.
  const truncated = o.tong === null
    ? o.gioiHan !== undefined && o.daDoc >= o.gioiHan
    : o.tong > o.daDoc;
  let coverage_status: TrangThaiDoDay = 'complete';
  if (o.canKetNoi && !o.coKetNoi && o.daDoc === 0) coverage_status = 'unavailable';
  else if (truncated) coverage_status = 'partial';
  else if (o.dongBoLuc) {
    const gio = ((o.bayGio ?? new Date()).getTime() - Date.parse(o.dongBoLuc)) / 3_600_000;
    const nguong = NGUONG_CU_GIO[o.nguon];
    if (nguong !== undefined && gio > nguong) coverage_status = 'stale';
  }
  return {
    nguon: o.nguon,
    ten: o.ten,
    row_count: o.daDoc,
    total_available: o.tong,
    truncated,
    period_from: o.tu ?? null,
    period_to: o.den ?? null,
    last_synced_at: o.dongBoLuc ?? null,
    coverage_status,
  };
}

const THU_TU: Record<TrangThaiDoDay, number> = { complete: 0, stale: 1, partial: 2, unavailable: 3 };

/** Trạng thái xấu nhất trong các nguồn — một nguồn thiếu là cả câu trả lời thiếu. */
export function trangThaiChung(ds: DoDayNguon[]): TrangThaiDoDay {
  return ds.reduce<TrangThaiDoDay>((xau, d) => (THU_TU[d.coverage_status] > THU_TU[xau] ? d.coverage_status : xau), 'complete');
}

const soVN = (n: number) => new Intl.NumberFormat('vi-VN').format(n);
const gioVN = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');

/** Một câu cảnh báo cho người dùng; null khi mọi nguồn đều đủ. */
export function cauCanhBao(ds: DoDayNguon[]): string | null {
  const cau: string[] = [];
  for (const d of ds) {
    if (d.coverage_status === 'partial') {
      cau.push(`${d.ten}: mới đọc ${soVN(d.row_count)}/${soVN(d.total_available ?? d.row_count)} dòng, các tổng dưới đây CHƯA phải tổng đầy đủ.`);
    } else if (d.coverage_status === 'stale' && d.last_synced_at) {
      cau.push(`${d.ten}: lần đồng bộ gần nhất ${gioVN(d.last_synced_at)}, số liệu có thể đã cũ.`);
    } else if (d.coverage_status === 'unavailable') {
      cau.push(`${d.ten}: chưa có kết nối nên chưa có dữ liệu — không phải bằng 0.`);
    }
  }
  return cau.length ? `Lưu ý độ đầy đủ — ${cau.join(' ')}` : null;
}

/**
 * Gắn độ đầy đủ vào một kết quả năng lực. Nguồn thiếu thì:
 *   - câu tóm tắt mở đầu bằng cảnh báo (kể cả khi mô hình viết lời, `dungTraLoi` cũng chèn);
 *   - thẻ cảnh báo đứng đầu danh sách thẻ;
 *   - mỗi ô số liệu trong thẻ `so_lieu` ghi rõ tính trên bao nhiêu dòng.
 */
export function apDoDay(r: KetQuaNangLuc, ds: DoDayNguon[]): KetQuaNangLuc {
  const canhBao = cauCanhBao(ds);
  if (!canhBao) return { ...r, do_day: ds };
  const catNgan = ds.filter((d) => d.truncated);
  const ghiChuSo = catNgan.length
    ? `Tính trên ${catNgan.map((d) => `${soVN(d.row_count)}/${soVN(d.total_available ?? d.row_count)} dòng ${d.ten.toLowerCase()}`).join(', ')}`
    : null;
  return {
    ...r,
    do_day: ds,
    tom_tat: `${canhBao}\n\n${r.tom_tat}`,
    the: [
      { loai: 'ghi_chu', muc_do: 'can_chu_y', cau: canhBao },
      ...r.the.map((t) => (t.loai === 'so_lieu' && ghiChuSo
        ? { ...t, muc: t.muc.map((m) => (typeof m.gia_tri === 'number' ? { ...m, ghi_chu: m.ghi_chu ? `${m.ghi_chu} · ${ghiChuSo}` : ghiChuSo, can_chu_y: true } : m)) }
        : t)),
    ],
  };
}
