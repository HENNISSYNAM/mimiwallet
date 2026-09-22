/**
 * MIMI-P1-006 — chi phí AI theo quy trình và chi phí cho mỗi việc thành công.
 *
 * Nhà cung cấp báo tiền theo project/workspace (`du_an`). Người dùng gán project vào quy trình và
 * nhập số việc làm xong mỗi tháng. Từ đó:
 *
 *   chi phí quy trình       = tổng chi phí các project của nó trong tháng
 *   chi phí / việc thành công = chi phí quy trình ÷ số việc thành công   (null khi chưa có số việc)
 *   tỷ lệ thành công         = thành công ÷ (thành công + thất bại)
 *
 * Tiền của project chưa gán quy trình nào được báo riêng ("chưa gán"), không chia đều cho ai.
 * Đầu vào phải là dòng chi phí ĐÃ chống trùng nguồn (`locTrungNguon`) — hàm này không tự lọc.
 */

export interface DongChiQt {
  ngay: string;
  du_an: string;
  so_tien_usd: number;
}

export interface QuyTrinh {
  id: string;
  ten: string;
  don_vi_ket_qua: string;
  khop_du_an: string[];
}

export interface KetQuaQt {
  quy_trinh_id: string;
  ky: string;
  so_thanh_cong: number;
  so_that_bai: number;
}

export interface DongQuyTrinh {
  quy_trinh: QuyTrinh;
  chi_phi_usd: number;
  /** null = chưa nhập số việc cho tháng này. */
  so_thanh_cong: number | null;
  so_that_bai: number | null;
  moi_viec_usd: number | null;
  ty_le_thanh_cong: number | null;
}

export interface BangQuyTrinh {
  ky: string;
  dong: DongQuyTrinh[];
  chua_gan: { chi_phi_usd: number; du_an: string[] };
  tong_usd: number;
}

const tron = (n: number) => Math.round(n * 10_000) / 10_000;

export function tinhTheoQuyTrinh(chi: readonly DongChiQt[], qt: readonly QuyTrinh[], kq: readonly KetQuaQt[], ky: string): BangQuyTrinh {
  // Mỗi project thuộc đúng một quy trình — quy trình tạo trước giữ project nếu dữ liệu cũ bị trùng.
  const chu = new Map<string, string>();
  for (const q of qt) for (const d of q.khop_du_an) if (!chu.has(d)) chu.set(d, q.id);

  const theoQt = new Map<string, number>();
  let chuaGan = 0;
  const duAnChuaGan = new Set<string>();
  let tong = 0;
  for (const r of chi) {
    if (!r.ngay.startsWith(ky)) continue;
    const tien = Number(r.so_tien_usd) || 0;
    tong += tien;
    const id = chu.get(r.du_an);
    if (id) theoQt.set(id, (theoQt.get(id) ?? 0) + tien);
    else { chuaGan += tien; duAnChuaGan.add(r.du_an); }
  }

  const dong = qt.map((q): DongQuyTrinh => {
    const cp = tron(theoQt.get(q.id) ?? 0);
    const k = kq.find((x) => x.quy_trinh_id === q.id && x.ky === ky) ?? null;
    const tc = k ? k.so_thanh_cong : null;
    const tb = k ? k.so_that_bai : null;
    return {
      quy_trinh: q,
      chi_phi_usd: cp,
      so_thanh_cong: tc,
      so_that_bai: tb,
      moi_viec_usd: tc ? tron(cp / tc) : null,
      ty_le_thanh_cong: k && tc! + tb! > 0 ? tron(tc! / (tc! + tb!)) : null,
    };
  });

  return { ky, dong, chua_gan: { chi_phi_usd: tron(chuaGan), du_an: [...duAnChuaGan].sort() }, tong_usd: tron(tong) };
}

/** Project nào đã thuộc quy trình KHÁC — không cho gán lần hai, để một đồng không bị tính hai lần. */
export function duAnDaGan(khopMoi: readonly string[], cacQuyTrinhKhac: readonly QuyTrinh[]): string[] {
  const da = new Set(cacQuyTrinhKhac.flatMap((q) => q.khop_du_an));
  return khopMoi.filter((d) => da.has(d));
}

export const laKy = (s: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
