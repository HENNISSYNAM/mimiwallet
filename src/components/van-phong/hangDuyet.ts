/**
 * Phần thuần của hàng duyệt trên giao diện: còn lại gì, đèn bàn, mèo nào đứng ở bàn nào.
 * Đề xuất do máy chủ dựng (`van-phong` → `hang_duyet`); ở đây chỉ trừ những cái người vừa chấp nhận / bỏ qua.
 */
import type { AgentDangLam, DeXuat, KhachVanPhong, MucKhach, TenAgentVP } from '@/lib/goiVanPhong';

export const conLai = (hang: DeXuat[], daXong: ReadonlySet<string>) => hang.filter((d) => !daXong.has(d.khoa));

const HANG: Record<MucKhach, number> = { do: 0, vang: 1, xanh: 2 };
const nangHon = (a: MucKhach, b: MucKhach): MucKhach => (HANG[a] <= HANG[b] ? a : b);

/**
 * Đèn bàn: hàng duyệt của khách đã sạch → xanh. Còn việc → màu nặng nhất giữa đèn máy chủ và các việc còn lại.
 * Khách chưa có việc nào trong hàng (hàng chỉ giữ việc của khách đã tính) thì giữ đèn máy chủ.
 */
export function mauBan(k: KhachVanPhong, hangGoc: DeXuat[], hangConLai: DeXuat[]): MucKhach {
  const coTrongHang = hangGoc.some((d) => d.company_id === k.id);
  const con = hangConLai.filter((d) => d.company_id === k.id);
  if (coTrongHang && con.length === 0) return 'xanh';
  return con.reduce<MucKhach>((m, d) => nangHon(m, d.muc), k.muc);
}

/**
 * Mèo đi tới bàn có đề xuất CỦA NÓ đang chờ duyệt. Bàn máy chủ chọn (việc thật 24 giờ) được giữ nếu ở đó vẫn còn đề xuất
 * của mèo này; không thì tới đề xuất nặng nhất còn lại của nó; hết việc thì về góc nghỉ — trừ mèo bán hàng (không có đề
 * xuất, chỉ đi theo lần bán thật).
 */
export function viTriAgent(agent: AgentDangLam[], hangConLai: DeXuat[]): AgentDangLam[] {
  return agent.map((a) => {
    if (a.agent === 'ban_hang') return a;
    const cua = hangConLai.filter((d) => d.agent === a.agent);
    if (a.company_id && cua.some((d) => d.company_id === a.company_id)) return a;
    const dau = cua[0];
    return dau
      ? { ...a, company_id: dau.company_id, ly_do: 'viec_cho' as const, luc: null, so: cua.filter((d) => d.company_id === dau.company_id).length }
      : { ...a, company_id: null, ly_do: null, luc: null, so: 0 };
  });
}

export const AGENT_CUA: Record<DeXuat['loai'], TenAgentVP> = {
  phan_loai: 'phan_loai', nguong: 'phan_loai', han_thue: 'thue', to_khai_san_sang: 'thue', dong_tien: 'du_bao', viec: 'tai_lieu',
};

/** Gom các đề xuất phân loại được chấp nhận theo (khách, loại): mỗi nhóm một lần gọi máy chủ, một mã nhóm hoàn tác. */
export function nhomChapNhan(ds: DeXuat[]): { company_id: string; loai: string; transaction_ids: string[]; khoa: string[] }[] {
  const m = new Map<string, { company_id: string; loai: string; transaction_ids: string[]; khoa: string[] }>();
  for (const d of ds) {
    if (!d.phan_loai || !d.co_the_duyet) continue;
    const k = `${d.company_id}|${d.phan_loai.de_xuat}`;
    const g = m.get(k) ?? { company_id: d.company_id, loai: d.phan_loai.de_xuat, transaction_ids: [], khoa: [] };
    g.transaction_ids.push(d.phan_loai.transaction_id);
    g.khoa.push(d.khoa);
    m.set(k, g);
  }
  return [...m.values()];
}

/** Bỏ dấu, chữ thường: tìm "tiem an" ra "Tiệm An". */
export const boDau = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
