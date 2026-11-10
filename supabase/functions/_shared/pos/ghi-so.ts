/**
 * POS → sổ sách. Quyết định nằm ở `ban-hang.ts` (hàm thuần, có test); file này chỉ đọc, ghi.
 *
 * Hai việc:
 *   1. `ghiSoBan`   — lần bán đã thu (tiền mặt, hoặc chủ xác nhận tay chưa có sao kê) thành một dòng
 *                     `transactions` (source 'pos') + phân loại "tiền bán hàng". Tiền mặt không đi qua
 *                     ngân hàng nên đây là chỗ DUY NHẤT nó vào sổ.
 *   2. `doiSoatBanHangPos` — sau mỗi lần ghi sao kê (gọi từ `tac-tu/doi-soat.ts`): lần bán chuyển khoản
 *                     nào đã có tiền về thì đánh dấu đã thu và gắn phân loại "tiền bán hàng" cho khoản tiền
 *                     đó. Không tạo dòng `transactions` mới: tiền đã nằm trong sổ qua sao kê.
 */
import { MIMI_TU_DONG, VAI_MIMI } from '../phan-loai/tu-phan-loai.ts';
import { khopBanHangPos, MA_LY_DO_POS, ngayVN, quyetDinhPhanLoaiPos, type BanChoKhop, type GiaoDichCoMa } from './ban-hang.ts';

// deno-lint-ignore no-explicit-any
type Db = any;

const SO_NGAY_NHIN_LAI = 14;

/** Gắn phân loại "tiền bán hàng" cho một giao dịch, theo `quyetDinhPhanLoaiPos`. Trả quyết định đã làm. */
export async function phanLoaiDoanhThuPos(
  db: Db,
  p: { companyId: string; transactionId: string; lyDo: string; nguoi: string; vai: string; maBan: string },
): Promise<'ghi_moi' | 'ghi_de' | 'giu_nguyen'> {
  const { data: cu, error: e0 } = await db
    .from('revenue_classifications')
    .select('confirmed_by, confirmed_type, revenue_effect')
    .eq('transaction_id', p.transactionId)
    .maybeSingle();
  if (e0) throw new Error(`đọc phân loại: ${e0.message}`);
  const qd = quyetDinhPhanLoaiPos(cu ?? null, MIMI_TU_DONG);
  if (qd === 'giu_nguyen') return qd;

  const bayGio = new Date().toISOString();
  const dong = {
    company_id: p.companyId,
    transaction_id: p.transactionId,
    suggested_type: 'business_revenue',
    suggestion_source: 'rule',
    reason_code: p.lyDo,
    reason_text: `Bán tại quầy, mã ${p.maBan}`,
    confirmed_type: 'business_revenue',
    revenue_effect: 'include',
    requires_review: false,
    confirmed_by: p.nguoi,
    confirmed_role: p.vai,
    confirmed_at: bayGio,
    updated_at: bayGio,
  };
  const { error } = qd === 'ghi_moi'
    ? await db.from('revenue_classifications').upsert(dong, { onConflict: 'transaction_id', ignoreDuplicates: true })
    // Ghi đè CHỈ dòng của máy: điều kiện `confirmed_by` chặn trường hợp người vừa bấm phân loại cùng lúc.
    : await db.from('revenue_classifications').update(dong).eq('transaction_id', p.transactionId).eq('confirmed_by', MIMI_TU_DONG);
  if (error) throw new Error(`ghi phân loại: ${error.message}`);

  await db.from('revenue_classification_events').insert({
    company_id: p.companyId,
    transaction_id: p.transactionId,
    from_type: cu?.confirmed_type ?? null,
    from_effect: cu?.revenue_effect ?? null,
    to_type: 'business_revenue',
    to_effect: 'include',
    actor: p.nguoi,
    actor_role: p.vai,
    at: bayGio,
  });
  return qd;
}

export interface BanDeGhiSo {
  id: string;
  company_id: string;
  amount: number;
  reference: string;
  note: string | null;
  sold_at: string;
  method: 'cash' | 'transfer';
  /** Công ty minh hoạ của tài khoản demo: dòng sổ đánh dấu is_synthetic như mọi dữ liệu demo. */
  la_demo?: boolean;
}

/**
 * Lần bán đã thu mà không có sao kê → một dòng `transactions`. Khoá trùng `reference_id = pos:<id>`:
 * gọi lại (mạng chập chờn, đồng bộ ngoại tuyến gửi lại) không sinh dòng thứ hai.
 */
export async function ghiSoBan(db: Db, b: BanDeGhiSo, nguoi: string, vai: string): Promise<string> {
  const referenceId = `pos:${b.id}`;
  const { error: e1 } = await db.from('transactions').upsert({
    company_id: b.company_id,
    amount: b.amount,
    type: 'income',
    category: null,
    merchant_name: (`Bán tại quầy${b.method === 'cash' ? ' (tiền mặt)' : ' (chuyển khoản, xác nhận tay)'}${b.note ? ` — ${b.note}` : ''}`).slice(0, 255),
    transaction_date: ngayVN(b.sold_at),
    source_bank: null,
    reference_id: referenceId,
    source: 'pos',
    is_synthetic: b.la_demo === true,
  }, { onConflict: 'company_id,reference_id', ignoreDuplicates: true });
  if (e1) throw new Error(`ghi sổ lần bán: ${e1.message}`);

  const { data: gd, error: e2 } = await db.from('transactions').select('id')
    .eq('company_id', b.company_id).eq('reference_id', referenceId).maybeSingle();
  if (e2 || !gd) throw new Error(`đọc lại dòng sổ: ${e2?.message ?? 'không thấy'}`);

  await phanLoaiDoanhThuPos(db, {
    companyId: b.company_id,
    transactionId: gd.id,
    lyDo: b.method === 'cash' ? MA_LY_DO_POS.tien_mat : `${MA_LY_DO_POS.chuyen_khoan}_tay`,
    nguoi,
    vai,
    maBan: b.reference,
  });
  return gd.id as string;
}

/**
 * Đối soát lần bán chuyển khoản với sao kê vừa ghi. Gọi sau MỖI lần ghi giao dịch ngân hàng
 * (cas-webhook, bank-link sync, sao-ke) qua `doiSoatSauKhiGhi`, và khi máy POS hỏi trạng thái.
 * `chiBan`: chỉ xét một lần bán (máy POS hỏi) — nhẹ hơn quét cả công ty.
 */
export async function doiSoatBanHangPos(db: Db, companyId: string, chiBan?: string): Promise<{ khop: number; lech: number }> {
  let q = db.from('ban_hang_pos')
    .select('id, reference, amount, status, method, matched_transaction_id')
    .eq('company_id', companyId)
    .eq('method', 'transfer')
    .is('matched_transaction_id', null)
    .in('status', ['pending', 'paid'])
    .gte('created_at', new Date(Date.now() - SO_NGAY_NHIN_LAI * 86_400_000).toISOString());
  if (chiBan) q = q.eq('id', chiBan);
  const { data: ban, error: e1 } = await q.limit(500);
  if (e1) { console.error(`pos đối soát: không đọc được lần bán của ${companyId}`, e1.message); return { khop: 0, lech: 0 }; }
  if (!ban?.length) return { khop: 0, lech: 0 };

  const tu = new Date(Date.now() - (SO_NGAY_NHIN_LAI + 1) * 86_400_000).toISOString().slice(0, 10);
  const [{ data: gd, error: e2 }, { data: daGan, error: e3 }] = await Promise.all([
    db.from('transactions')
      .select('id, amount, type, payment_reference, merchant_name')
      .eq('company_id', companyId)
      .eq('type', 'income')
      .gte('transaction_date', tu)
      .or('payment_reference.ilike.MIMI%,merchant_name.ilike.%MIMI%')
      .limit(2000),
    db.from('ban_hang_pos').select('matched_transaction_id').eq('company_id', companyId).not('matched_transaction_id', 'is', null)
      .gte('created_at', new Date(Date.now() - 2 * SO_NGAY_NHIN_LAI * 86_400_000).toISOString()),
  ]);
  if (e2 || e3) { console.error(`pos đối soát: lỗi đọc cho ${companyId}`, e2?.message ?? e3?.message); return { khop: 0, lech: 0 }; }

  const kq = khopBanHangPos(ban as BanChoKhop[], (gd ?? []) as GiaoDichCoMa[], new Set((daGan ?? []).map((r: { matched_transaction_id: string }) => r.matched_transaction_id)));
  const theoId = new Map((ban as BanChoKhop[]).map((b) => [b.id, b]));
  let soKhop = 0;
  for (const k of kq.khop) {
    const bayGio = new Date().toISOString();
    // Chặn theo trạng thái + chưa gắn giao dịch: webhook và lần hỏi của máy POS chạy đè nhau chỉ một bên thắng.
    const { data: nhan } = await db.from('ban_hang_pos')
      .update({ status: 'paid', matched_transaction_id: k.giaoDichId, paid_basis: k.daXacNhanTay ? 'manual_then_bank' : 'bank_match', paid_at: k.daXacNhanTay ? undefined : bayGio, updated_at: bayGio })
      .eq('id', k.banId)
      .is('matched_transaction_id', null)
      .in('status', ['pending', 'paid'])
      .select('id, book_transaction_id')
      .maybeSingle();
    if (!nhan) continue;
    soKhop++;
    const b = theoId.get(k.banId)!;
    try {
      await phanLoaiDoanhThuPos(db, { companyId, transactionId: k.giaoDichId, lyDo: MA_LY_DO_POS.chuyen_khoan, nguoi: MIMI_TU_DONG, vai: VAI_MIMI, maBan: b.reference });
      // Chủ đã bấm "Đã nhận tiền" tay trước đó → đã có dòng sổ tạm `pos:<id>`. Tiền thật về rồi thì gỡ dòng
      // tạm khỏi doanh thu, không thì một lần bán bị cộng hai lần.
      if (nhan.book_transaction_id) {
        await db.from('revenue_classifications').update({ confirmed_type: 'other', revenue_effect: 'exclude', ghi_chu: `Trùng với tiền về qua ngân hàng (lần bán ${b.reference})`, reason_code: 'pos_trung_sao_ke', confirmed_by: MIMI_TU_DONG, confirmed_role: VAI_MIMI, updated_at: bayGio })
          .eq('transaction_id', nhan.book_transaction_id);
      }
    } catch (e) {
      console.error(`pos ${k.banId}: khớp xong nhưng chưa ghi phân loại`, e instanceof Error ? e.message : e);
    }
  }
  for (const x of kq.lech) console.warn(`pos ${x.banId}: giao dịch ${x.giaoDichId} ${x.thucTe}đ, lần bán ${x.mongDoi}đ — chờ chủ quyết`);
  return { khop: soKhop, lech: kq.lech.length };
}
