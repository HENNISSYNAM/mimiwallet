/**
 * Vòng đời hoá đơn chung — Prompt 4 mục 16. Hàm thuần.
 *
 * Hai nguồn ghi trạng thái khác nhau: `invoices` (hoá đơn lập trong MIMI: pending/paid/overdue/advanced/
 * cancelled) và `gdt_invoices` (của cơ quan thuế: `invoice_status` là số). Nguồn cơ quan thuế thắng khi có.
 *
 * GIỚI HẠN ĐÃ BIẾT: MIMI mới chắc một mã GDT — `1` là hoá đơn đang có hiệu lực (xem
 * `tax/gdt-invoice-map.ts`). Các mã khác là "bị thay / điều chỉnh / huỷ" nhưng CHƯA đối chiếu mã nào
 * là gì, nên ra `unknown` kèm lý do — không đoán thành `replaced` hay `cancelled`.
 */

export const VONG_DOI = ['draft', 'issued', 'sent', 'partially_paid', 'paid', 'overdue', 'adjusted', 'replaced', 'cancelled', 'unknown'] as const;
export type VongDoi = (typeof VONG_DOI)[number];

export const TEN_VONG_DOI: Record<VongDoi, string> = {
  draft: 'Nháp', issued: 'Đã lập', sent: 'Đã gửi người mua', partially_paid: 'Đã thu một phần', paid: 'Đã thu đủ',
  overdue: 'Quá hạn thanh toán', adjusted: 'Đã điều chỉnh', replaced: 'Đã bị thay thế', cancelled: 'Đã huỷ', unknown: 'Chưa rõ',
};

export interface KetQuaVongDoi { trang_thai: VongDoi; nguon: 'gdt' | 'mimi' | 'khong_ro'; ly_do: string }

export function vongDoiHoaDon(o: {
  mimi?: { status: string | null; due_date?: string | null; advanced_amount?: number | null; total?: number | null } | null;
  gdt?: { invoice_status: number | null } | null;
  homNay: string;
}): KetQuaVongDoi {
  const g = o.gdt?.invoice_status;
  if (g !== undefined && g !== null) {
    if (g !== 1) {
      return { trang_thai: 'unknown', nguon: 'gdt', ly_do: `Cơ quan thuế ghi trạng thái ${g}: hoá đơn không còn hiệu lực đầy đủ (bị thay, điều chỉnh hoặc huỷ). MIMI chưa đối chiếu mã này là trường hợp nào.` };
    }
    // Có hiệu lực ở cơ quan thuế; phần thanh toán thì chỉ MIMI biết.
  }
  const m = o.mimi;
  if (!m?.status) {
    return g === 1
      ? { trang_thai: 'issued', nguon: 'gdt', ly_do: 'Cơ quan thuế ghi hoá đơn đang có hiệu lực.' }
      : { trang_thai: 'unknown', nguon: 'khong_ro', ly_do: 'Không có trạng thái từ nguồn nào.' };
  }
  const nguon = g === 1 ? 'gdt' as const : 'mimi' as const;
  switch (m.status) {
    case 'draft': return { trang_thai: 'draft', nguon: 'mimi', ly_do: 'Hoá đơn còn là bản nháp trong MIMI.' };
    case 'paid': return { trang_thai: 'paid', nguon, ly_do: 'Đã ghi nhận tiền về đủ.' };
    case 'cancelled': return { trang_thai: 'cancelled', nguon: 'mimi', ly_do: 'Đã huỷ trong MIMI.' };
    case 'advanced': {
      const mot_phan = (m.advanced_amount ?? 0) > 0 && (m.advanced_amount ?? 0) < (m.total ?? 0);
      return mot_phan
        ? { trang_thai: 'partially_paid', nguon, ly_do: 'Đã thu một phần.' }
        : { trang_thai: 'issued', nguon, ly_do: 'Đã ứng trước theo hoá đơn; chưa ghi nhận tiền khách trả.' };
    }
    case 'overdue': return { trang_thai: 'overdue', nguon, ly_do: 'Quá hạn thanh toán, chưa thu.' };
    case 'pending':
      if (m.due_date && m.due_date < o.homNay) return { trang_thai: 'overdue', nguon, ly_do: `Quá hạn từ ${m.due_date.split('-').reverse().join('/')}, chưa thu.` };
      return { trang_thai: 'issued', nguon, ly_do: 'Đã lập, chưa tới hạn thanh toán.' };
    default: return { trang_thai: 'unknown', nguon: 'mimi', ly_do: `Trạng thái "${m.status}" MIMI chưa biết.` };
  }
}
