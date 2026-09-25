/**
 * Người xác nhận khoản doanh thu thuộc nhóm hoạt động nào — đọc yêu cầu và lập kế hoạch hoàn tác.
 * Hàm thuần; ghi CSDL nằm ở `to-khai/index.ts` (hành động `xac_nhan_hoat_dong`, `hoan_tac_hoat_dong`).
 *
 * Hai cách xác nhận, cả hai đều là NGƯỜI quyết:
 *   - từng khoản / một nhóm khoản (`ids`, tối đa 500 một lần);
 *   - "mọi khoản còn chưa rõ nhóm của năm này thuộc nhóm X" (`tat_ca_chua_ro`) — cho hộ chỉ làm một
 *     việc, bấm một lần thay vì 400 lần. Máy chủ tự lấy danh sách khoản chưa rõ lúc bấm, nên khoản về
 *     SAU lần bấm vẫn là chưa rõ — không có quy tắc ngầm nào tự gắn nhóm cho tiền tương lai.
 * Mỗi lần ghi một nhóm lịch sử (`nhom_hang_loat`) để hoàn tác cả lần bấm.
 */
import { HOAT_DONG, type HoatDong, type NguonDoanhThuKhoan } from './theo-hoat-dong.ts';

export const TOI_DA_MOT_LAN_HOAT_DONG = 500;

const NGUON: NguonDoanhThuKhoan[] = ['giao_dich', 'hoa_don', 'tu_nhap'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type YeuCauHoatDong =
  | { ok: true; nguon: NguonDoanhThuKhoan; hoat_dong: HoatDong; nam: number; ids: string[] | null; tat_ca_chua_ro: boolean }
  | { ok: false; cau: string };

// deno-lint-ignore no-explicit-any
export function docXacNhanHoatDong(body: Record<string, any>, namHienTai: number): YeuCauHoatDong {
  const nguon = body.nguon as NguonDoanhThuKhoan;
  if (!NGUON.includes(nguon)) return { ok: false, cau: 'Nguồn doanh thu không hợp lệ.' };
  const hoatDong = body.hoat_dong as HoatDong;
  if (!HOAT_DONG.includes(hoatDong)) return { ok: false, cau: 'Nhóm hoạt động không hợp lệ.' };
  const nam = Number(body.nam);
  if (!Number.isInteger(nam) || nam < 2020 || nam > namHienTai + 1) return { ok: false, cau: 'Năm không hợp lệ.' };

  const tatCa = body.tat_ca_chua_ro === true;
  if (tatCa) return { ok: true, nguon, hoat_dong: hoatDong, nam, ids: null, tat_ca_chua_ro: true };

  if (!Array.isArray(body.ids) || !body.ids.length) return { ok: false, cau: 'Chọn ít nhất một khoản.' };
  if (body.ids.length > TOI_DA_MOT_LAN_HOAT_DONG) return { ok: false, cau: `Mỗi lần tối đa ${TOI_DA_MOT_LAN_HOAT_DONG} khoản.` };
  const ids = [...new Set(body.ids.map(String))] as string[];
  const hopLe = nguon === 'tu_nhap'
    ? ids.every((id) => new RegExp(`^${nam}-q[1-4]$`).test(id))
    : ids.every((id) => UUID.test(id));
  if (!hopLe) return { ok: false, cau: 'Có mã khoản không hợp lệ.' };
  return { ok: true, nguon, hoat_dong: hoatDong, nam, ids, tat_ca_chua_ro: false };
}

export interface SuKienHoatDong {
  nguon: string;
  nguon_id: string;
  tu_hoat_dong: string | null;
  at: string;
}

/**
 * Hoàn tác một lần bấm: mỗi khoản quay về trạng thái TRƯỚC lần bấm đó. Một khoản có thể xuất hiện
 * nhiều lần trong cùng nhóm (ít gặp) — lấy sự kiện SỚM NHẤT, vì đó là trạng thái trước khi bấm.
 * `ve: null` = trước đó chưa có phân loại → xoá dòng.
 */
export function keHoachHoanTacHoatDong(ds: SuKienHoatDong[]): { nguon: string; nguon_id: string; ve: HoatDong | null }[] {
  const som = new Map<string, SuKienHoatDong>();
  for (const s of ds) {
    const k = `${s.nguon}:${s.nguon_id}`;
    const cu = som.get(k);
    if (!cu || s.at < cu.at) som.set(k, s);
  }
  return [...som.values()].map((s) => ({
    nguon: s.nguon,
    nguon_id: s.nguon_id,
    ve: HOAT_DONG.includes(s.tu_hoat_dong as HoatDong) ? (s.tu_hoat_dong as HoatDong) : null,
  }));
}
