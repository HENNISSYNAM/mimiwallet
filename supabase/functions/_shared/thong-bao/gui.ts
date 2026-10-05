/**
 * Ghi thông báo cho từng người nhận, rồi đẩy lên web và điện thoại qua Web Push.
 *
 * Dùng chung cho cron quét ngầm (`thong-bao`) và cho các luồng cần báo ngay (tiền thanh toán về).
 *
 * KHÔNG CÓ KHOÁ VAPID THÌ VẪN CHẠY: thông báo vẫn lưu và hiện ở chuông trong app, chỉ là không đẩy
 * lên điện thoại. Thiếu cấu hình không được làm hỏng luồng thu tiền hay luồng quét.
 */
import type { BanNhapThongBao } from './sinh.ts';
import type { MocThue } from '../luat/lich-thue.ts';
import { thongBaoNhacLoiThoi, trangThaiTuNoiDung, type SanSangChoNhac } from './muc-nhac.ts';

// deno-lint-ignore no-explicit-any
type Db = any;

/**
 * Thành viên HIỆN TẠI của công ty. Không cộng `companies.user_id`: đó là người tạo, và nếu họ đã bị
 * gỡ hay đã rời thì không được nhận thông báo có số liệu công ty nữa (30/09/2026).
 */
export async function nguoiNhan(db: Db, companyId: string): Promise<string[]> {
  const { data: tv } = await db.from('thanh_vien_cong_ty').select('user_id').eq('company_id', companyId);
  return [...new Set((tv ?? []).map((r: { user_id: string }) => r.user_id))] as string[];
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

/**
 * `tag` của thông báo đẩy. Hạn thuế (`han:<mốc>:<hạn>:<số ngày>`): bỏ số ngày còn lại. Trước 02/10/2026 mọi hạn
 * đều là `han` nên hai hạn cùng lúc thay nhau trên màn hình khoá và người dùng chỉ thấy cái sau.
 */
export function theThongBao(khoa: string): string {
  if (khoa.startsWith('han:')) return khoa.replace(/:\d+$/, '');
  if (khoa.startsWith('can_xem:')) return khoa;
  return khoa.split(':')[0];
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
    .select('id, user_id, company_id, loai, tieu_de, noi_dung, duong_dan, khoa')
    .is('da_day_luc', null).is('loi_thoi_luc', null).gte('tao_luc', tu).order('tao_luc', { ascending: true }).limit(500);
  if (error) throw new Error(`đọc thông báo chờ đẩy: ${error.message}`);
  if (!cho?.length) return { da_day: 0, go_thiet_bi: 0 };

  const nguoi = [...new Set(cho.map((t: { user_id: string }) => t.user_id))];
  const [{ data: dks }, { data: caiDat }, { data: tv }] = await Promise.all([
    db.from('dang_ky_day').select('id, user_id, endpoint, p256dh, auth').in('user_id', nguoi),
    db.from('cai_dat_thong_bao').select('user_id, loai_tat').in('user_id', nguoi),
    db.from('thanh_vien_cong_ty').select('user_id, company_id').in('user_id', nguoi),
  ]);
  // Người đã bị gỡ khỏi công ty không được nhận push có số liệu công ty (dòng có thể đã ghi trước khi bị gỡ).
  const conLaThanhVien = new Set<string>((tv ?? []).map((r: { user_id: string; company_id: string }) => `${r.user_id}:${r.company_id}`));
  const tat = new Map<string, Set<string>>((caiDat ?? []).map((c: { user_id: string; loai_tat: string[] }) => [c.user_id, new Set(c.loai_tat)]));
  let daDay = 0;
  const goBo = new Set<string>();

  for (const t of cho) {
    if (!may || tat.get(t.user_id)?.has(t.loai) || !conLaThanhVien.has(`${t.user_id}:${t.company_id}`)) continue;
    // Gom theo mốc: nhắc 14 -> 10 -> 5 ngày của CÙNG một hạn thay nhau, còn hai hạn khác nhau thì cùng hiện.
    const noiDung = JSON.stringify({ tieu_de: t.tieu_de, noi_dung: t.noi_dung, duong_dan: t.duong_dan ?? '/dashboard/nhac-thue', the: theThongBao(t.khoa) });
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

/**
 * Đánh dấu LỖI THỜI (đặt `loi_thoi_luc`, KHÔNG xoá) các thông báo không còn đúng, để chuông không hiện lại
 * một điều đã khác:
 *   - hạn thuế: đã qua, mốc đã "không áp dụng"/biến mất khỏi lịch (ví dụ kết luận lại phụ thuộc phần chưa rõ),
 *     hoặc đổi giữa "phải làm" và "cần xác minh";
 *   - "cần xem": câu hỏi đó không còn được hỏi;
 *   - theo dõi phản hồi: việc đã xong/huỷ, không còn chờ phản hồi, hoặc đã có lời nhắc mới hơn cho cùng việc.
 * Chỉ gọi khi lịch đã đọc THÀNH CÔNG (đọc hỏng thì không được coi mọi mốc là biến mất). Thông báo người dùng
 * đã xử lý giữ nguyên. Trả số dòng đã đánh dấu.
 */
export async function danhDauNhacLoiThoi(
  db: Db, companyId: string, o: { lich: readonly MocThue[]; sanSang: SanSangChoNhac | null; homNay: string; bayGio?: Date },
): Promise<number> {
  const { data, error } = await db.from('thong_bao').select('id, khoa, loai, noi_dung')
    .eq('company_id', companyId).is('loi_thoi_luc', null).is('da_xu_ly_luc', null).in('loai', ['han_thue', 'viec']).limit(1000);
  if (error) throw new Error(`đọc thông báo nhắc: ${error.message}`);
  const dong = (data ?? []) as { id: string; khoa: string; loai: string; noi_dung: string | null }[];
  const ids = new Set<string>();
  for (const t of dong) {
    if (t.loai === 'han_thue' && thongBaoNhacLoiThoi(t.khoa, o.lich, o.sanSang, o.homNay, trangThaiTuNoiDung(t.noi_dung))) ids.add(t.id);
  }

  const theoDoi = dong.filter((t) => t.loai === 'viec' && t.khoa.startsWith('theo_doi:'));
  if (theoDoi.length) {
    const vid = [...new Set(theoDoi.map((t) => t.khoa.split(':')[1]))];
    const { data: cho, error: e2 } = await db.from('ho_so_viec').select('id').eq('company_id', companyId).eq('trang_thai', 'waiting_external').in('id', vid);
    if (e2) throw new Error(`đọc việc chờ phản hồi: ${e2.message}`);
    const conCho = new Set<string>((cho ?? []).map((r: { id: string }) => r.id));
    // Ngày hẹn mới nhất của mỗi việc: lời nhắc của ngày hẹn cũ hơn đã được thay.
    const moiNhat = new Map<string, string>();
    for (const t of theoDoi) {
      const [, v, hen = ''] = t.khoa.split(':');
      if (hen > (moiNhat.get(v) ?? '')) moiNhat.set(v, hen);
    }
    for (const t of theoDoi) {
      const [, v, hen = ''] = t.khoa.split(':');
      if (!conCho.has(v) || hen < (moiNhat.get(v) ?? '')) ids.add(t.id);
    }
  }
  if (!ids.size) return 0;
  const { error: e3 } = await db.from('thong_bao').update({ loi_thoi_luc: (o.bayGio ?? new Date()).toISOString() }).in('id', [...ids]);
  if (e3) throw new Error(`đánh dấu thông báo lỗi thời: ${e3.message}`);
  return ids.size;
}
