/**
 * Bộ thực thi công cụ của agent trong workflow (22/11/2026). Chỉ công cụ ở `CONG_CU_CO_SAN`; số liệu lấy từ đúng nguồn
 * của Văn phòng (`docDanhMucKhach`) — không tính lại kiểu khác, không bịa. Không ghi sổ: bước "ghi" chỉ báo phần đang chờ
 * người duyệt ở hàng duyệt (sổ đổi khi người bấm duyệt ở đó).
 */
import { docDanhMucKhach, type KhachVanPhong } from '../van-phong/danh-muc.ts';
import type { DeXuat } from '../van-phong/hang-duyet.ts';
import type { NutHien } from './do-thi.ts';
import type { ThucThi } from './chay.ts';
import { goiKetNoi, type KetNoi } from './ket-noi.ts';

// deno-lint-ignore no-explicit-any
type Db = any;
export type HoiMoHinh = (heThong: string, nguoiDung: string) => Promise<{ text: string | null; cong: string }>;

const tien = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} ₫`;
const SAN_SANG: Record<string, string> = {
  san_sang: 'đủ dữ liệu để soạn', bi_chan: 'đang bị chặn', thieu_du_lieu: 'còn thiếu dữ liệu',
  can_xac_minh: 'cần xác minh nghĩa vụ', khong_co_viec: 'chưa có kỳ phải khai',
};

export function taoThucThi(db: Db, userId: string, companyId: string, cauGoc: string, hoi?: HoiMoHinh,
  ketNoi: Map<string, KetNoi> = new Map(), khoaRieng?: string): ThucThi {
  let du: Promise<{ k: KhachVanPhong | null; hang: DeXuat[] }> | null = null;
  const doc = () => (du ??= (async () => {
    const dm = await docDanhMucKhach(db, userId, { kichThuoc: 50 });
    return { k: dm.khach.find((x) => x.id === companyId) ?? null, hang: dm.hang_duyet.filter((d) => d.company_id === companyId) };
  })());

  return async (n: NutHien) => {
    switch (n.cong_cu) {
      case 'doc_sao_ke': {
        const { k } = await doc();
        const d = k?.dong_tien_30_ngay;
        if (!d) throw new Error('chưa có giao dịch ngân hàng — liên kết ngân hàng trước');
        return `30 ngày gần nhất: vào ${tien(d.tien_vao)}, ra ${tien(d.tien_ra)}, chênh ${tien(d.rong)}.`;
      }
      case 'phan_loai_tien_vao': {
        const { hang } = await doc();
        const pl = hang.filter((d) => d.loai === 'phan_loai');
        const quyTac = pl.filter((d) => d.bang_chung.nguon === 'quy_tac_noi_dung').length;
        const ai = pl.filter((d) => d.bang_chung.nguon === 'agent_ngoai').length;
        return pl.length
          ? `${pl.length} khoản tiền vào chưa ai quyết đã có đề xuất kèm bằng chứng (${quyTac} theo nội dung chuyển khoản, ${ai} do agent đọc, còn lại theo nguyên tắc thận trọng).`
          : 'Không còn khoản tiền vào nào chờ phân loại.';
      }
      case 'hang_duyet': {
        const { hang } = await doc();
        const pl = hang.filter((d) => d.loai === 'phan_loai').length;
        return pl ? `${pl} khoản đang chờ người duyệt ở hàng duyệt — sổ chỉ đổi khi người bấm duyệt.` : 'Hàng duyệt trống: mọi khoản đã có người quyết.';
      }
      case 'lich_thue':
      case 'kiem_to_khai': {
        const { k } = await doc();
        const t = k?.thue;
        if (!t) throw new Error('chưa đọc được lịch thuế của công ty');
        const m = t.moc_ke_tiep;
        return `Tờ khai ${t.ten_viec ?? 'kỳ tới'}: ${SAN_SANG[t.trang_thai] ?? t.trang_thai}${m ? `; mốc "${m.ten}" hạn ${m.han} (còn ${m.con_lai} ngày)` : ''}.`;
      }
      case 'soan_van_ban': {
        if (!hoi) throw new Error('chưa có mô hình AI');
        const r = await hoi(
          'Bạn soạn văn bản ngắn (tối đa 8 dòng, tiếng Việt) cho một bước trong quy trình công việc. Chỉ dùng thông tin được cho; chỗ thiếu thì để [cần điền]. Không bịa số liệu.',
          `Yêu cầu gốc: ${cauGoc.slice(0, 300)}\nBước: ${n.ten} — ${n.mo_ta}`,
        );
        if (!r.text) throw new Error('mô hình không trả lời');
        return `${r.text.trim().slice(0, 520)}\n(Soạn bởi ${r.cong})`;
      }
      default: {
        // Công cụ người dùng đã dán endpoint / API key / MCP ngay tại bước → gọi thật.
        const k = n.cong_cu ? ketNoi.get(n.cong_cu) : undefined;
        if (k) return await goiKetNoi(k, n, cauGoc, khoaRieng);
        throw new Error(`công cụ "${n.cong_cu}" chưa kết nối`);
      }
    }
  };
}
