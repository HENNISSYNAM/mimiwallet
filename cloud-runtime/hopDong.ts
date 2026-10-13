import { z } from 'zod';

/**
 * Khuôn lệnh/kết quả của Cloud Agent Runtime — đúng `docs/CLOUD_AGENT_RUNTIME.md` (hợp đồng v1, 13/10/2026).
 *
 * Vì sao kiểm `.strict()` khắp nơi: chữ ký phủ MỌI trường, nhưng runtime chỉ hiểu các trường trong hợp đồng. Một trường
 * lạ (dù đã ký) là dấu hiệu hai bên lệch phiên bản — từ chối còn hơn lặng lẽ bỏ qua một ý định mà runtime không hiểu.
 */

export const SO_BUOC_TOI_DA = 30;
export const NGAN_SACH_TOI_DA_MS = 50_000;

/** Vai trò ARIA được nhận ở `tim_phan_tu` — danh sách đóng, vì getByRole chỉ hiểu vai trò chuẩn. */
export const VAI_TRO = [
  'button', 'link', 'textbox', 'searchbox', 'checkbox', 'radio', 'combobox', 'listbox', 'option', 'heading', 'table',
  'row', 'cell', 'columnheader', 'img', 'tab', 'tabpanel', 'menuitem', 'spinbutton', 'navigation', 'dialog', 'list',
  'listitem', 'form', 'region', 'article', 'main', 'paragraph', 'alert', 'status',
] as const;

const chuNgan = z.string().min(1).max(200);

export const BuocCongCuSchema = z.discriminatedUnion('cong_cu', [
  z.object({ cong_cu: z.literal('mo_trang'), url: z.string().min(1).max(2000) }).strict(),
  z.object({ cong_cu: z.literal('doc_noi_dung'), toi_da_ky_tu: z.number().int().min(1).max(20_000).optional() }).strict(),
  z.object({ cong_cu: z.literal('lay_url_tieu_de') }).strict(),
  z.object({ cong_cu: z.literal('chup_man_hinh') }).strict(),
  z
    .object({
      cong_cu: z.literal('tim_phan_tu'),
      vai_tro: z.enum(VAI_TRO).optional(),
      ten: chuNgan.optional(),
      nhan: chuNgan.optional(),
      chu: chuNgan.optional(),
    })
    .strict(),
  z.object({ cong_cu: z.literal('dien'), nhan: chuNgan, gia_tri: z.string().max(2000) }).strict(),
  z.object({ cong_cu: z.literal('nhan'), ten: chuNgan, tac_dong: z.enum(['doc', 'ngoai']) }).strict(),
]);
export type BuocCongCu = z.infer<typeof BuocCongCuSchema>;

const uuid = z.string().uuid();

export const LenhChaySchema = z
  .object({
    phien_ban: z.literal(1),
    nhiem_vu_id: uuid,
    cong_ty_id: uuid,
    nguoi_dung_id: uuid,
    agent: z.enum(['thue', 'tai_chinh', 'tai_lieu', 'trinh_duyet']),
    mien_cho_phep: z
      .array(z.string().min(1).max(253).regex(/^[a-z0-9.-]+$/i, 'tên miền chỉ gồm chữ, số, dấu chấm, gạch ngang'))
      .min(1)
      .max(20),
    url_bat_dau: z.string().min(1).max(2000).nullable(),
    tu_buoc: z.number().int().min(0).max(SO_BUOC_TOI_DA),
    buoc: z.array(BuocCongCuSchema).min(1).max(SO_BUOC_TOI_DA),
    da_duyet: z.array(z.number().int().min(0).max(SO_BUOC_TOI_DA - 1)).max(SO_BUOC_TOI_DA),
    ngan_sach_ms: z.number().int().min(1000).max(NGAN_SACH_TOI_DA_MS),
    het_han: z.string().datetime({ offset: true }),
    nonce: z.string().min(16).max(200),
    chu_ky: z.string().min(16).max(200),
  })
  .strict()
  .refine((l) => l.tu_buoc <= l.buoc.length, 'tu_buoc vượt số bước')
  // Kiểm ở cấp lệnh vì discriminatedUnion không nhận nhánh đã .refine.
  .refine(
    (l) => l.buoc.every((b) => b.cong_cu !== 'tim_phan_tu' || !!(b.vai_tro || b.ten || b.nhan || b.chu)),
    'tim_phan_tu cần ít nhất một tiêu chí',
  );
export type LenhChay = z.infer<typeof LenhChaySchema>;

export type TrangThaiLuot = 'xong' | 'tiep' | 'cho_duyet' | 'ban_giao' | 'loi';

export interface KetQuaBuoc {
  buoc: number;
  cong_cu: string;
  tac_dong: 'doc' | 'ngoai';
  ok: boolean;
  du_lieu?: unknown;
  loi?: string;
  ms: number;
}

export interface KetQuaLuot {
  nhiem_vu_id: string;
  trang_thai: TrangThaiLuot;
  buoc_tiep: number;
  url_hien_tai: string | null;
  ket_qua_buoc: KetQuaBuoc[];
  loi?: string;
}
