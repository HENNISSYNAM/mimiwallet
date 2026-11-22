/**
 * AGENTIC AI SPACE (22/11/2026) — bộ máy chạy việc. Người giao việc là con người; người nhận việc là agent.
 *
 * Mỗi việc có KẾ HOẠCH (danh sách bước), TRẠNG THÁI, và LUỒNG TIN (agent ↔ agent ↔ người). Một lần chạy đi tiếp từ bước
 * chưa xong tới khi: xong, cần người (`can_ban`), hoặc chờ agent khác (`cho_agent`). Agent GIAO VIỆC CON cho nhau:
 *   - Agent Thuế thấy còn tiền vào chưa phân loại → giao Agent Phân loại, rồi chờ;
 *   - Agent Phân loại xong → báo lại Agent Thuế (việc cha chạy tiếp), hoặc mở việc mới cho Agent Thuế.
 *
 * CÔNG CỤ THẬT, KHÔNG GIẢ: số liệu lấy từ đúng nguồn của Văn phòng (`docDanhMucKhach` → khách + hàng duyệt). Mô hình AI
 * (nếu có) chỉ đọc các khoản không có dấu hiệu rõ và ĐỀ XUẤT loại kèm lý do — ghi vào hàng duyệt, người duyệt.
 * Không bước nào ghi sổ, nộp tờ khai hay chuyển tiền.
 *
 * Hàm này thuần (trừ lời gọi AI được truyền vào) để test được trọn chuỗi.
 */
import type { DeXuat } from '../van-phong/hang-duyet.ts';
import type { KhachVanPhong } from '../van-phong/danh-muc.ts';
import type { LoaiPhanLoai } from '../doanh-thu/phan-loai.ts';

export const TEN_AGENT_SPACE = ['phan_loai', 'thue'] as const;
export type TenAgentSpace = (typeof TEN_AGENT_SPACE)[number];
export const laAgentSpace = (v: unknown): v is TenAgentSpace => (TEN_AGENT_SPACE as readonly string[]).includes(String(v));

export const TEN_HIEN_THI: Record<TenAgentSpace, string> = { phan_loai: 'Agent Phân loại', thue: 'Agent Thuế' };
export const TEN_AGENT_AI = 'Agent Phân loại (AI)';

export const TRANG_THAI_VIEC = ['cho', 'dang_lam', 'cho_agent', 'can_ban', 'xong', 'huy'] as const;
export type TrangThaiViec = (typeof TRANG_THAI_VIEC)[number];
export const DANG_MO: readonly TrangThaiViec[] = ['cho', 'dang_lam', 'cho_agent', 'can_ban'];

export interface Buoc { ten: string; xong: boolean }

export interface Viec {
  id: string;
  company_id: string;
  ten_khach: string;
  agent: TenAgentSpace;
  tieu_de: string;
  han: string | null;
  trang_thai: TrangThaiViec;
  ke_hoach: Buoc[];
  viec_cha_id: string | null;
  /** Bước đã hỏi người (để không hỏi lặp mỗi lần "Tiếp tục"). */
  ket_qua: { hoi_buoc?: number; [k: string]: unknown };
}

export type NoiNhan = TenAgentSpace | 'nguoi';
export type LoaiTin = 'giao_viec' | 'ke_hoach' | 'tien_do' | 'ban_giao' | 'hoi' | 'xong';
export interface Tin { tu: NoiNhan; den: NoiNhan | null; loai: LoaiTin; noi_dung: string; lien_ket?: string | null }

export interface ViecMoi { agent: TenAgentSpace; tieu_de: string; viec_cha_id: string | null; han: string | null; tin_mo: Tin }

export interface YKienAi { transaction_id: string; loai: LoaiPhanLoai; ly_do: string }

export interface DuLieuKhach { khach: KhachVanPhong | null; hang: DeXuat[] }

export interface CongCuAgent {
  /** Hỏi mô hình về các khoản không có dấu hiệu. Không có mô hình / hết xu → trả `ly_do_khong`. */
  aiPhanLoai?: (ds: DeXuat[]) => Promise<{ y: YKienAi[]; ly_do_khong?: string }>;
}

export interface KetQuaChay { viec: Viec; tin: Tin[]; tao: ViecMoi[]; y_kien: YKienAi[] }

export const TOI_DA_AI_MOI_LAN = 15;

// ── Kế hoạch ────────────────────────────────────────────────────────────────

export const KE_HOACH: Record<TenAgentSpace, string[]> = {
  phan_loai: [
    'Đọc các khoản tiền vào chưa ai quyết',
    'AI đọc các khoản không có dấu hiệu rõ, đề xuất loại kèm lý do',
    'Chờ kế toán duyệt ở hàng duyệt',
    'Báo kết quả cho Agent Thuế',
  ],
  thue: [
    'Đọc doanh thu và vị trí so với ngưỡng 1 tỷ / 3 tỷ',
    'Bảo đảm tiền vào đã được phân loại',
    'Kiểm lịch thuế và mức sẵn sàng của tờ khai',
    'Mời kế toán soạn và nộp tờ khai',
  ],
};

export const keHoachMoi = (a: TenAgentSpace): Buoc[] => KE_HOACH[a].map((ten) => ({ ten, xong: false }));

const boDau = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/** Một câu giao việc → agent nhận. "Chốt quý" mặc định giao Agent Thuế (Thuế tự giao tiếp phần phân loại nếu cần). */
export function chonAgentTuCau(cau: string): TenAgentSpace {
  const c = boDau(cau);
  if (/phan loai|tien vao|sao ke|tach tien|doanh thu that|khoan la/.test(c)) return 'phan_loai';
  return 'thue';
}

// ── Chữ ─────────────────────────────────────────────────────────────────────

export const tien = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} ₫`;
const trieu = (n: number) => `${(Math.round(n / 100_000) / 10).toLocaleString('vi-VN')} triệu`;

const SAN_SANG: Record<string, string> = {
  san_sang: 'đủ dữ liệu để soạn', bi_chan: 'đang bị chặn', thieu_du_lieu: 'còn thiếu dữ liệu',
  can_xac_minh: 'cần xác minh nghĩa vụ', khong_co_viec: 'chưa có kỳ phải khai',
};
const PHIA: Record<string, string> = { tren: 'trên', duoi: 'dưới', chua_chac: 'chưa chắc trên hay dưới' };

function khoangDoanhThu(k: KhachVanPhong | null): string {
  const d = k?.doanh_thu;
  if (!d) return 'chưa đọc được doanh thu';
  const ng = d.nguong.filter((n) => n.ma === 'mien_thue_1_ty' || n.ma === 'phuong_phap_3_ty')
    .map((n) => `${PHIA[n.phia] ?? n.phia} ngưỡng ${n.gia_tri >= 3e9 ? '3 tỷ' : '1 tỷ'}`).join(', ');
  return `doanh thu năm ${d.nam} khoảng ${trieu(d.can_duoi)} – ${trieu(d.can_tren)}${ng ? ` (${ng})` : ''}`;
}

// ── Chạy một việc ───────────────────────────────────────────────────────────

/**
 * Đi tiếp từ bước chưa xong. `conDangMo`: việc này đang có việc con chưa xong (thì đứng chờ, không giao trùng).
 */
export async function chayViec(v0: Viec, du: DuLieuKhach, cc: CongCuAgent, conDangMo: boolean): Promise<KetQuaChay> {
  const viec: Viec = { ...v0, ke_hoach: v0.ke_hoach.map((b) => ({ ...b })), ket_qua: { ...v0.ket_qua } };
  const tin: Tin[] = [];
  const tao: ViecMoi[] = [];
  const yKien: YKienAi[] = [];
  const kq = () => ({ viec, tin, tao, y_kien: yKien });
  const xongBuoc = (i: number) => { viec.ke_hoach[i].xong = true; };
  const hoi = (i: number, t: Tin) => {
    viec.trang_thai = 'can_ban';
    if (viec.ket_qua.hoi_buoc !== i) { tin.push(t); viec.ket_qua.hoi_buoc = i; }
    return kq();
  };

  if (viec.trang_thai === 'xong' || viec.trang_thai === 'huy') return kq();
  viec.trang_thai = 'dang_lam';
  const a = viec.agent;
  const pl = du.hang.filter((d) => d.loai === 'phan_loai' && d.phan_loai);

  if (a === 'phan_loai') {
    if (!viec.ke_hoach[0].xong) {
      const tong = pl.reduce((s, d) => s + (d.so ?? 0), 0);
      tin.push({ tu: a, den: null, loai: 'tien_do', noi_dung: pl.length
        ? `Có ${pl.length} khoản tiền vào chưa ai quyết, tổng ${tien(tong)}.`
        : 'Không còn khoản tiền vào nào chờ phân loại.' });
      xongBuoc(0);
    }
    if (!viec.ke_hoach[1].xong) {
      const can = pl.filter((d) => d.bang_chung.nguon === 'than_trong').slice(0, TOI_DA_AI_MOI_LAN);
      if (!can.length) {
        tin.push({ tu: a, den: null, loai: 'tien_do', noi_dung: 'Mọi khoản đều đã có dấu hiệu trong nội dung chuyển khoản; không cần gọi AI.' });
      } else if (!cc.aiPhanLoai) {
        tin.push({ tu: a, den: null, loai: 'tien_do', noi_dung: `${can.length} khoản không có dấu hiệu rõ; chưa có mô hình AI nên giữ đề xuất thận trọng "tính là doanh thu".` });
      } else {
        const r = await cc.aiPhanLoai(can);
        const hopLe = new Set(can.map((d) => d.phan_loai!.transaction_id));
        const y = r.y.filter((x) => hopLe.has(x.transaction_id));
        yKien.push(...y);
        tin.push({ tu: a, den: null, loai: 'tien_do', noi_dung: r.ly_do_khong
          ? `Chưa gọi được AI (${r.ly_do_khong}); ${can.length} khoản giữ đề xuất thận trọng "tính là doanh thu".`
          : `AI đã đọc ${can.length} khoản không có dấu hiệu rõ và đề xuất loại cho ${y.length} khoản, kèm lý do. Đề xuất nằm trong hàng duyệt.` });
      }
      xongBuoc(1);
    }
    if (!viec.ke_hoach[2].xong) {
      if (pl.length) {
        const loaiRa = pl.filter((d) => d.phan_loai!.anh_huong === 'exclude').length
          + yKien.filter((y) => y.loai !== 'business_revenue').length;
        return hoi(2, { tu: a, den: 'nguoi', loai: 'hoi', lien_ket: '/dashboard/van-phong',
          noi_dung: `Cần anh/chị duyệt ${pl.length} khoản ở hàng duyệt${loaiRa ? ` (có khoản đề xuất loại khỏi doanh thu — phải duyệt từng cái)` : ''}. Duyệt xong bấm "Tiếp tục".` });
      }
      xongBuoc(2);
    }
    if (!viec.ke_hoach[3].xong) {
      const bao = `Đã phân loại xong tiền vào của ${viec.ten_khach}; ${khoangDoanhThu(du.khach)}.`;
      if (viec.viec_cha_id) tin.push({ tu: a, den: 'thue', loai: 'ban_giao', noi_dung: `${bao} Anh Thuế chốt tiếp nhé.` });
      else {
        tin.push({ tu: a, den: 'thue', loai: 'ban_giao', noi_dung: `${bao} Em mở việc cho Agent Thuế kiểm tờ khai.` });
        tao.push({ agent: 'thue', tieu_de: `Kiểm tờ khai sau phân loại — ${viec.ten_khach}`, viec_cha_id: null, han: viec.han,
          tin_mo: { tu: a, den: 'thue', loai: 'giao_viec', noi_dung: bao } });
      }
      xongBuoc(3);
    }
    viec.trang_thai = 'xong';
    tin.push({ tu: a, den: null, loai: 'xong', noi_dung: 'Xong việc.' });
    return kq();
  }

  // ── Agent Thuế ──
  if (!viec.ke_hoach[0].xong) {
    tin.push({ tu: a, den: null, loai: 'tien_do', noi_dung: `${viec.ten_khach}: ${khoangDoanhThu(du.khach)}.` });
    xongBuoc(0);
  }
  if (!viec.ke_hoach[1].xong) {
    if (pl.length) {
      viec.trang_thai = 'cho_agent';
      if (!conDangMo) {
        const giao = `Còn ${pl.length} khoản tiền vào chưa phân loại ở ${viec.ten_khach}. Nhờ Agent Phân loại xử lý trước khi em chốt.`;
        tin.push({ tu: a, den: 'phan_loai', loai: 'giao_viec', noi_dung: giao });
        tao.push({ agent: 'phan_loai', tieu_de: `Phân loại tiền vào — ${viec.ten_khach}`, viec_cha_id: viec.id, han: viec.han,
          tin_mo: { tu: a, den: 'phan_loai', loai: 'giao_viec', noi_dung: giao } });
      }
      return kq();
    }
    xongBuoc(1);
  }
  if (!viec.ke_hoach[2].xong) {
    const t = du.khach?.thue;
    const moc = t?.moc_ke_tiep;
    tin.push({ tu: a, den: null, loai: 'tien_do', noi_dung: t
      ? `Tờ khai ${t.ten_viec ?? 'kỳ tới'}: ${SAN_SANG[t.trang_thai] ?? t.trang_thai}${moc ? `; mốc kế tiếp "${moc.ten}" hạn ${moc.han} (còn ${moc.con_lai} ngày)` : ''}.`
      : 'Chưa đọc được lịch thuế của khách này.' });
    if (du.khach?.doanh_thu?.can_xem) {
      tin.push({ tu: a, den: 'nguoi', loai: 'tien_do', noi_dung: 'Lưu ý: doanh thu vẫn có thể ở hai phía ngưỡng — nên xem lại các khoản lớn trước khi khai.' });
    }
    xongBuoc(2);
  }
  // Bước cuối luôn là việc của NGƯỜI: MIMI không tự nộp.
  return hoi(3, { tu: a, den: 'nguoi', loai: 'hoi', lien_ket: '/dashboard/to-khai',
    noi_dung: 'Số liệu đã sẵn. Mời anh/chị mở Tờ khai để soạn và nộp — MIMI không tự nộp. Nộp xong bấm "Đánh dấu xong".' });
}
