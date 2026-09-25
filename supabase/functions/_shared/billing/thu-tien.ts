/**
 * Tiền về tài khoản MIMI → tự duyệt gói, hoặc tự cộng lượt xuất tờ khai.
 *
 * HAI ĐƯỜNG GỌI, MỘT HÀM. `bank-webhook` gọi ngay khi SePay báo tiền về tài khoản MIMI — khách
 * vừa chuyển xong, vài giây sau gói đã chạy. Cron 10 phút gọi lại làm lưới đỡ, phòng webhook rơi.
 *
 * CHỈ ĐỌC `tien_ve_mimi`. Không bao giờ đọc `transactions`: bảng đó là sổ của khách, và khách tự
 * chèn được dòng vào đó — xem migration 20260924140000 về lỗ hổng đã vá.
 *
 * Ba quy tắc giữ nguyên từ `subscription.ts`: chỉ tiền vào; sai số tiền thì không tự kích hoạt;
 * một khoản tiền chỉ trả một hoá đơn. Thêm một: mọi bước ghi đều chỉ thắng một lần (`status =
 * 'pending'`, `hoa_don_id` duy nhất) — webhook và cron chạy trùng nhau cũng không cộng hai lần.
 */
import { doiSoatThueBao, ketThucKy, type SubscriptionInvoice } from './subscription.ts';
import { ghiThongBao } from '../thong-bao/gui.ts';
import { thongBaoThanhToan } from '../thong-bao/sinh.ts';
import { ghiSuKien } from '../do-luong/su-kien.ts';

// deno-lint-ignore no-explicit-any
type Db = any;

// Giá đọc từ MỘT bảng giá chung với Cài đặt và trang chủ — xem `bang-gia.ts`.
import { GIA_MOT_TO_KHAI, GOI_THANG } from './bang-gia.ts';
export { GIA_MOT_TO_KHAI };
/** Mua tối đa bao nhiêu lượt một lần — chặn hoá đơn gõ nhầm 1000 lượt. */
export const TOI_DA_LUOT_MOT_LAN = 20;

/**
 * Bảng giá gói tháng. Nguồn sự thật ở MÁY CHỦ — giá do trình duyệt gửi thì sửa được thành 1.000đ.
 * Khoá phải khớp `TIERS` trong `src/store/useSubscriptionStore.ts`.
 */
export const GOI: Record<string, { amount: number; ten: string }> = GOI_THANG;

/** Chỉ giữ chữ số: "0123 456 789" và "0123456789" là một tài khoản. */
const chuSo = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '');

/** Số tài khoản trong webhook có phải tài khoản nhận tiền của MIMI không. */
export function laTaiKhoanMimi(soTaiKhoan: string | null | undefined, taiKhoanMimi: string | null | undefined): boolean {
  const a = chuSo(soTaiKhoan);
  const b = chuSo(taiKhoanMimi);
  return a.length >= 6 && a === b;
}

export interface KetQuaThuTien {
  da_kich_hoat: number;
  lech_so_tien: number;
  chua_khop: number;
}

/**
 * Khớp mọi khoản tiền về MIMI chưa khớp với mọi hoá đơn đang chờ, rồi áp dụng.
 * `bayGio` truyền vào để test cố định được ngày.
 */
export async function doiSoatTienVeMimi(db: Db, bayGio: Date = new Date()): Promise<KetQuaThuTien> {
  const { data: hoaDon, error: e1 } = await db.from('subscription_invoices')
    .select('id, company_id, reference_code, amount, status, plan, so_luot')
    .eq('status', 'pending');
  if (e1) throw new Error(`đọc hoá đơn: ${e1.message}`);
  if (!hoaDon?.length) return { da_kich_hoat: 0, lech_so_tien: 0, chua_khop: 0 };

  const tu = new Date(bayGio.getTime() - 60 * 86400_000).toISOString().slice(0, 10);
  const { data: tienVe, error: e2 } = await db.from('tien_ve_mimi')
    .select('id, so_tien, noi_dung')
    .is('hoa_don_id', null)
    .gte('ngay_giao_dich', tu);
  if (e2) throw new Error(`đọc tiền về: ${e2.message}`);

  const kq = doiSoatThueBao(
    hoaDon as SubscriptionInvoice[],
    (tienVe ?? []).map((t: { id: string; so_tien: number; noi_dung: string | null }) => ({
      id: t.id, amount: Number(t.so_tien), description: t.noi_dung,
    })),
  );
  const theoId = new Map((hoaDon as Row[]).map((h) => [h.id, h]));
  let daKichHoat = 0;

  for (const m of kq.matched) {
    const h = theoId.get(m.invoice_id);
    if (!h) continue;
    // Chỉ một lượt ghi thắng: hoá đơn còn `pending` thì mới chuyển sang `paid`.
    const { data: thang } = await db.from('subscription_invoices').update({
      status: 'paid',
      paid_at: bayGio.toISOString(),
      tien_ve_id: m.transaction_id,
      received_amount: m.amount,
      updated_at: bayGio.toISOString(),
    }).eq('id', h.id).eq('status', 'pending').select('id');
    if (!thang?.length) continue;
    await db.from('tien_ve_mimi').update({ hoa_don_id: h.id }).eq('id', m.transaction_id).is('hoa_don_id', null);
    await apDung(db, h, bayGio);
    daKichHoat += 1;
    await ghiSuKien(db, h.company_id, null, 'first_paid_action', { loai: h.so_luot ? 'luot_to_khai' : 'goi' });
    // Báo trong app (và lên điện thoại ở lần quét kế tiếp). Lỗi ở đây không được làm hỏng việc thu tiền.
    try {
      await ghiThongBao(db, h.company_id, [thongBaoThanhToan({ id: h.id, amount: Number(h.amount), so_luot: h.so_luot ?? null, plan: h.plan })]);
    } catch (e) {
      console.error('thông báo thanh toán:', e instanceof Error ? e.message : e);
    }
  }

  // Sai số tiền: ghi lại để người xem và liên hệ khách — KHÔNG kích hoạt.
  for (const m of kq.mismatched) {
    const { data: thang } = await db.from('subscription_invoices').update({
      status: m.delta > 0 ? 'overpaid' : 'underpaid',
      received_amount: m.amount,
      tien_ve_id: m.transaction_id,
      updated_at: bayGio.toISOString(),
    }).eq('id', m.invoice_id).eq('status', 'pending').select('id');
    if (thang?.length) {
      await db.from('tien_ve_mimi').update({ hoa_don_id: m.invoice_id }).eq('id', m.transaction_id).is('hoa_don_id', null);
    }
  }

  return { da_kich_hoat: daKichHoat, lech_so_tien: kq.mismatched.length, chua_khop: kq.unmatched.length };
}

// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

/** Hoá đơn đã trả: cộng lượt, hoặc gia hạn gói. */
async function apDung(db: Db, h: Row, bayGio: Date): Promise<void> {
  if (h.so_luot) {
    // `hoa_don_id` duy nhất: chạy trùng thì lần sau lỗi khoá trùng và không cộng thêm.
    const { error } = await db.from('luot_to_khai').insert({
      company_id: h.company_id, thay_doi: Number(h.so_luot), ly_do: 'mua', hoa_don_id: h.id,
    });
    if (error && !/duplicate|unique/i.test(error.message)) throw new Error(`cộng lượt: ${error.message}`);
    return;
  }
  /*
   * Gia hạn cộng dồn từ ngày hết hạn CŨ nếu gói còn hiệu lực. Trả sớm mà bị cắt những ngày còn
   * lại thì lần sau khách đợi sát hạn mới trả — tự tạo ra rủi ro gián đoạn.
   */
  const { data: dangCo } = await db.from('subscriptions')
    .select('current_period_end').eq('company_id', h.company_id).maybeSingle();
  const moc = dangCo?.current_period_end && new Date(dangCo.current_period_end) > bayGio
    ? new Date(dangCo.current_period_end)
    : bayGio;
  const ketThuc = ketThucKy(moc).toISOString().slice(0, 10);
  await db.from('subscription_invoices').update({
    period_start: moc.toISOString().slice(0, 10), period_end: ketThuc,
  }).eq('id', h.id);
  await db.from('subscriptions').upsert({
    company_id: h.company_id,
    plan: h.plan,
    current_period_end: ketThuc,
    last_invoice_id: h.id,
    updated_at: bayGio.toISOString(),
  }, { onConflict: 'company_id' });
}

// ── Quyền lợi: công ty này đang được xuất tờ khai bằng gì ─────────────────────

export interface QuyenLoi {
  /** Gói còn hạn: xuất không giới hạn. */
  goi: { plan: string; het_han: string } | null;
  con_luot: number;
  gia_mot_to: number;
}

export async function docQuyenLoi(db: Db, companyId: string, homNay: string): Promise<QuyenLoi> {
  const [{ data: goi }, { data: luot }] = await Promise.all([
    db.from('subscriptions').select('plan, current_period_end').eq('company_id', companyId).maybeSingle(),
    db.from('luot_to_khai').select('thay_doi').eq('company_id', companyId),
  ]);
  const conHan = goi && String(goi.current_period_end) >= homNay;
  return {
    goi: conHan ? { plan: goi.plan, het_han: String(goi.current_period_end) } : null,
    con_luot: (luot ?? []).reduce((s: number, r: { thay_doi: number }) => s + Number(r.thay_doi), 0),
    gia_mot_to: GIA_MOT_TO_KHAI,
  };
}

/** Khoá một kỳ khai: cùng mẫu, cùng kỳ thì chỉ tính tiền một lần. */
export function khoaKy(mau: string, ky: { loai: string; nam: number; quy?: number }): string {
  return `${mau}|${ky.nam}|${ky.loai}|${ky.loai === 'quy' ? ky.quy : ''}`;
}
