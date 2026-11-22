import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';
import { LoiGoiHam } from '@/lib/loiGoiHam';
import type {
  AgentDangLam, DanhMucKhach, KhachVanPhong, LyDo, MaLyDo, MucKhach, TenAgentVP,
} from '../../supabase/functions/_shared/van-phong/danh-muc.ts';

import type { DeXuat } from '../../supabase/functions/_shared/van-phong/hang-duyet.ts';
import type { KhoaHien } from '../../supabase/functions/_shared/mcp/ban-ke-toan.ts';
import { goiToKhai } from '@/lib/goiToKhai';
import { nhomChapNhan } from '@/components/van-phong/hangDuyet';

export type { AgentDangLam, DanhMucKhach, DeXuat, KhachVanPhong, KhoaHien, LyDo, MaLyDo, MucKhach, TenAgentVP };

/**
 * CHẤP NHẬN đề xuất phân loại tiền vào — qua ĐÚNG đường ghi quyết định của người đã có: edge function `to-khai`, hành động
 * `xac_nhan_tien_vao`, với `company_id` của KHÁCH đó. Máy chủ kiểm người gọi là thành viên khách đó, có quyền
 * `sua_ho_so_thue`, không bị giới hạn một cơ sở; rồi ghi `revenue_classifications`, `revenue_classification_events`
 * (người, vai trò, lúc nào, từ loại nào sang loại nào) và nhật ký quyết định. Ở trình duyệt không ghi gì khác.
 *
 * Gom theo (khách, loại): mỗi nhóm một lần gọi. Trả khoá đã ghi xong và lỗi của nhóm hỏng (nhóm khác vẫn đi tiếp).
 */
export async function chapNhanDeXuat(ds: DeXuat[]): Promise<{ xong: string[]; loi: { khoa: string[]; cau: string }[] }> {
  const xong: string[] = [];
  const loi: { khoa: string[]; cau: string }[] = [];
  for (const g of nhomChapNhan(ds)) {
    try {
      await goiToKhai('xac_nhan_tien_vao', { company_id: g.company_id, transaction_ids: g.transaction_ids, loai: g.loai });
      xong.push(...g.khoa);
    } catch (e) {
      loi.push({ khoa: g.khoa, cau: e instanceof Error ? e.message : String(e) });
    }
  }
  return { xong, loi };
}

/**
 * Gọi edge function `van-phong` bằng phiên đăng nhập. Danh mục là của NGƯỜI GỌI (mọi công ty họ làm sổ), nên không gửi
 * `company_id`; máy chủ tự kiểm thành viên từng công ty. Mọi con số do máy chủ tính, giao diện chỉ hiện.
 */
export async function goiDanhMucKhach(o: { trang?: number; kich_thuoc?: number } = {}): Promise<DanhMucKhach> {
  return (await goiVanPhong('danh_muc_khach', o)) as unknown as DanhMucKhach;
}

async function goiVanPhong(hanhDong: string, o: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new LoiGoiHam('Phiên đăng nhập đã hết. Đăng nhập lại.', 401, {});
  const res = await fetch(`${SUPABASE_URL}/functions/v1/van-phong`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ hanh_dong: hanhDong, ...o }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || body?.error) {
    throw new LoiGoiHam(typeof body.error === 'string' ? body.error : `Lỗi ${res.status}`, res.status, body);
  }
  return body;
}

// ── Khoá MCP (22/11/2026): agent ngoài đọc văn phòng + gửi đề xuất; kế toán vẫn duyệt ──────────────────────────────

/** Địa chỉ MCP server của MIMI. */
export const DIA_CHI_MCP = `${SUPABASE_URL}/functions/v1/mcp`;

export const dsKhoaMcp = async (): Promise<KhoaHien[]> => ((await goiVanPhong('khoa_mcp_ds')).khoa ?? []) as KhoaHien[];

/** Trả khoá thô ĐÚNG MỘT LẦN — giao diện hiện cho người dùng chép, không lưu. */
export async function taoKhoaMcp(ten: string): Promise<{ khoa_moi: string; khoa: KhoaHien }> {
  return (await goiVanPhong('khoa_mcp_tao', { ten })) as unknown as { khoa_moi: string; khoa: KhoaHien };
}

export async function thuHoiKhoaMcp(id: string): Promise<void> {
  await goiVanPhong('khoa_mcp_thu_hoi', { id });
}
