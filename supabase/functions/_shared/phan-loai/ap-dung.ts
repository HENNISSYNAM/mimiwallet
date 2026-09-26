/**
 * Ghi các quyết định tự phân loại của MIMI (xem `tu-phan-loai.ts`). Chạy ở cron mỗi giờ và ngay khi Cas
 * kéo giao dịch mới về. Không bao giờ ghi đè: dòng đã có (của người dùng hay của lần chạy trước) được bỏ
 * qua bằng `ignoreDuplicates` — kể cả khi người dùng vừa bấm phân loại cùng lúc.
 */
import { docNguonTienVao } from '../doanh-thu/so-lieu.ts';
import { chieuTien } from '../tien/chieu-tien.ts';
import { canTuPhanLoai, MIMI_TU_DONG, tuPhanLoai, VAI_MIMI } from './tu-phan-loai.ts';

// deno-lint-ignore no-explicit-any
type Db = any;

const LO = 500;

export async function apDungTuPhanLoai(db: Db, companyId: string, nam: number, laDemo: boolean): Promise<{ da_phan_loai: number; loai_ra: number }> {
  const nguon = await docNguonTienVao(db, companyId, nam, laDemo, ', merchant_name, counter_account_name, payment_reference');
  const daCo = new Set((nguon.xac_nhan as { transaction_id: string }[]).map((r) => String(r.transaction_id)));
  const noiBo = new Set([...(nguon.noi_bo.internalIds ?? [])].map(String));
  // deno-lint-ignore no-explicit-any
  const can = canTuPhanLoai(nguon.giao_dich as any[], daCo, noiBo, (t) => chieuTien(t) === 'vao');
  let daPhanLoai = 0;
  let loaiRa = 0;
  for (let i = 0; i < can.length; i += LO) {
    const lo = can.slice(i, i + LO);
    const bayGio = new Date().toISOString();
    const quyet = lo.map((t) => ({ t, q: tuPhanLoai(t) }));
    const { data: ghi, error } = await db.from('revenue_classifications').upsert(quyet.map(({ t, q }) => ({
      company_id: companyId, transaction_id: t.id,
      suggested_type: q.loai, suggestion_source: 'rule', reason_code: q.nguon === 'noi_dung' ? 'tu_dong_noi_dung' : 'tu_dong_than_trong',
      reason_text: q.ly_do, confirmed_type: q.loai, revenue_effect: q.anh_huong, requires_review: false,
      confirmed_by: MIMI_TU_DONG, confirmed_role: VAI_MIMI, confirmed_at: bayGio, updated_at: bayGio,
    })), { onConflict: 'transaction_id', ignoreDuplicates: true }).select('transaction_id, confirmed_type, revenue_effect');
    if (error) throw new Error(`tự phân loại: ${error.message}`);
    const moi = (ghi ?? []) as { transaction_id: string; confirmed_type: string; revenue_effect: string }[];
    if (moi.length) {
      const { error: e2 } = await db.from('revenue_classification_events').insert(moi.map((r) => ({
        company_id: companyId, transaction_id: r.transaction_id, from_type: null, from_effect: null,
        to_type: r.confirmed_type, to_effect: r.revenue_effect, actor: MIMI_TU_DONG, actor_role: VAI_MIMI, at: bayGio,
      })));
      if (e2) throw new Error(`ghi sự kiện tự phân loại: ${e2.message}`);
    }
    daPhanLoai += moi.length;
    loaiRa += moi.filter((r) => r.revenue_effect === 'exclude').length;
  }
  return { da_phan_loai: daPhanLoai, loai_ra: loaiRa };
}
