/**
 * Ghi thông báo cho từng người nhận, rồi đẩy lên web và điện thoại qua Web Push.
 *
 * Dùng chung cho cron quét ngầm (`thong-bao`) và cho các luồng cần báo ngay (tiền thanh toán về).
 *
 * KHÔNG CÓ KHOÁ VAPID THÌ VẪN CHẠY: thông báo vẫn lưu và hiện ở chuông trong app, chỉ là không đẩy
 * lên điện thoại. Thiếu cấu hình không được làm hỏng luồng thu tiền hay luồng quét.
 */
import type { BanNhapThongBao } from './sinh.ts';

// deno-lint-ignore no-explicit-any
type Db = any;

/** Thành viên công ty, cộng chủ công ty (dữ liệu cũ chưa có dòng thành viên). */
export async function nguoiNhan(db: Db, companyId: string): Promise<string[]> {
  const [{ data: tv }, { data: ct }] = await Promise.all([
    db.from('thanh_vien_cong_ty').select('user_id').eq('company_id', companyId),
    db.from('companies').select('user_id').eq('id', companyId).maybeSingle(),
  ]);
  return [...new Set([...(tv ?? []).map((r: { user_id: string }) => r.user_id), ...(ct?.user_id ? [ct.user_id] : [])])];
}

/** Ghi mỗi bản nháp cho mỗi người nhận. Khoá trùng thì bỏ qua — cron chạy lại không báo hai lần. */
export async function ghiThongBao(db: Db, companyId: string, nhap: BanNhapThongBao[], nguoi?: string[]): Promise<number> {
  if (!nhap.length) return 0;
  const ds = nguoi ?? await nguoiNhan(db, companyId);
  if (!ds.length) return 0;
  const dong = ds.flatMap((user_id) => nhap.map((n) => ({
    company_id: companyId, user_id, loai: n.loai, muc_do: n.muc_do, tieu_de: n.tieu_de, noi_dung: n.noi_dung,
    duong_dan: n.duong_dan, hanh_dong: n.hanh_dong, khoa: n.khoa,
  })));
  const { data, error } = await db.from('thong_bao')
    .upsert(dong, { onConflict: 'user_id,company_id,khoa', ignoreDuplicates: true })
    .select('id');
  if (error) throw new Error(`ghi thông báo: ${error.message}`);
  return (data ?? []).length;
}

export interface MayDay {
  /** Đẩy một chuỗi JSON tới một thiết bị. Ném lỗi có `isGone()` khi thiết bị đã huỷ đăng ký. */
  day(dk: { endpoint: string; p256dh: string; auth: string }, noiDung: string): Promise<void>;
}

/**
 * Đẩy mọi thông báo chưa đẩy trong 2 ngày gần đây. Người dùng đã tắt loại nào thì không đẩy loại
 * đó (vẫn hiện trong app). Thiết bị trả 410 thì gỡ đăng ký.
 */
export async function dayThongBao(db: Db, may: MayDay | null, bayGio: Date = new Date()): Promise<{ da_day: number; go_thiet_bi: number }> {
  const tu = new Date(bayGio.getTime() - 2 * 86_400_000).toISOString();
  const { data: cho, error } = await db.from('thong_bao')
    .select('id, user_id, loai, tieu_de, noi_dung, duong_dan, khoa')
    .is('da_day_luc', null).gte('tao_luc', tu).order('tao_luc', { ascending: true }).limit(500);
  if (error) throw new Error(`đọc thông báo chờ đẩy: ${error.message}`);
  if (!cho?.length) return { da_day: 0, go_thiet_bi: 0 };

  const nguoi = [...new Set(cho.map((t: { user_id: string }) => t.user_id))];
  const [{ data: dks }, { data: caiDat }] = await Promise.all([
    db.from('dang_ky_day').select('id, user_id, endpoint, p256dh, auth').in('user_id', nguoi),
    db.from('cai_dat_thong_bao').select('user_id, loai_tat').in('user_id', nguoi),
  ]);
  const tat = new Map<string, Set<string>>((caiDat ?? []).map((c: { user_id: string; loai_tat: string[] }) => [c.user_id, new Set(c.loai_tat)]));
  let daDay = 0;
  const goBo = new Set<string>();

  for (const t of cho) {
    if (!may || tat.get(t.user_id)?.has(t.loai)) continue;
    // Gom theo loại trên thông báo hệ thống: nhắc hạn quý 3 mới thay cái cũ, không chồng chất.
    const noiDung = JSON.stringify({ tieu_de: t.tieu_de, noi_dung: t.noi_dung, duong_dan: t.duong_dan ?? '/dashboard/nhac-thue', the: t.khoa.split(':')[0] });
    for (const dk of (dks ?? []).filter((d: { user_id: string; id: string }) => d.user_id === t.user_id && !goBo.has(d.id))) {
      try {
        await may.day(dk, noiDung);
        daDay += 1;
      } catch (e) {
        if ((e as { isGone?: () => boolean })?.isGone?.()) goBo.add(dk.id);
        else console.error('đẩy thông báo:', e instanceof Error ? e.message : String(e));
      }
    }
  }

  if (goBo.size) await db.from('dang_ky_day').delete().in('id', [...goBo]);
  // Đánh dấu cả thông báo không có thiết bị nào: không thử lại mãi.
  await db.from('thong_bao').update({ da_day_luc: bayGio.toISOString() }).in('id', cho.map((t: { id: string }) => t.id));
  return { da_day: daDay, go_thiet_bi: goBo.size };
}
