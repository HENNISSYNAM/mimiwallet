/**
 * Quét tiền vào của MỘT công ty rồi ghi thông báo cho khoản chưa ai giải thích.
 *
 * Tách ra khỏi `thong-bao/index.ts` để chạy được ở hai nơi, cùng một cách:
 *   - cron mỗi giờ, cho mọi công ty;
 *   - ngay sau khi webhook Cas kéo về giao dịch mới (`cas-webhook`).
 *
 * Vì sao cần chạy ngay: trước 25/09/2026 một khoản 200 triệu về tài khoản lúc 8h05 phải chờ tới
 * lượt quét 9h07 mới được hỏi. Với người đang đứng bán hàng, một tiếng im lặng là một tiếng họ
 * tưởng MIMI không thấy gì.
 *
 * Khoá chống trùng của `thong_bao` lo phần còn lại: chạy hai lần không sinh hai thông báo.
 */
import { thongBaoTienVao, type BanNhapThongBao, type TienVaoGanDay } from './sinh.ts';
import { ghiThongBao } from './gui.ts';
import { locMinhHoa } from '../minh-hoa.ts';
import { chieuTien } from '../tien/chieu-tien.ts';
import { docHet } from '../doc-het.ts';
import { apDungTuPhanLoai } from '../phan-loai/ap-dung.ts';

// deno-lint-ignore no-explicit-any
type Db = any;

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Năm nay, và năm trước khi còn trong quý 1 (còn quyết toán). */
export async function tuPhanLoaiNamNay(db: Db, companyId: string, lucVN: Date, laDemo: boolean): Promise<void> {
  const nam = lucVN.getFullYear();
  for (const n of lucVN.getMonth() < 3 ? [nam - 1, nam] : [nam]) {
    try {
      await apDungTuPhanLoai(db, companyId, n, laDemo);
    } catch (e) {
      console.error('tự phân loại:', e instanceof Error ? e.message : e);
    }
  }
}

/** Tiền vào 30 ngày gần nhất chưa ai phân loại → bản nháp thông báo. */
export async function nhapTienVaoGanDay(db: Db, companyId: string, lucVN: Date, laDemo: boolean): Promise<BanNhapThongBao[]> {
  const tu30 = iso(new Date(lucVN.getTime() - 30 * 86_400_000));
  const [gd, daQuyet] = await Promise.all([
    locMinhHoa(db.from('transactions')
      .select('id, reference_id, amount, type, transaction_date, merchant_name, counter_account_name, payment_reference, is_synthetic')
      .eq('company_id', companyId), laDemo)
      // Mới nhất trước: PostgREST trả tối đa 1000 dòng, nên nếu phải bỏ bớt thì bỏ khoản cũ.
      .gte('transaction_date', tu30).order('transaction_date', { ascending: false }).limit(1000),
    // Đọc HẾT khoản đã quyết: sót một dòng là hỏi lại người dùng về khoản họ đã trả lời rồi.
    docHet((a, b) => db.from('revenue_classifications').select('transaction_id').eq('company_id', companyId)
      .order('transaction_id', { ascending: true }).range(a, b), 'phân loại tiền vào'),
  ]);
  const vao = ((gd.data ?? []) as (TienVaoGanDay & { type: string })[]).filter((t) => chieuTien(t) === 'vao');
  return thongBaoTienVao(vao, new Set(daQuyet.map((r) => String(r.transaction_id))));
}

/**
 * Quét và ghi luôn. Trả về số thông báo mới.
 * Lỗi ở đây KHÔNG được làm hỏng việc chính (ghi giao dịch) — nơi gọi bắt lỗi.
 */
export async function quetVaGhiTienVao(db: Db, companyId: string, lucVN: Date, laDemo: boolean): Promise<number> {
  // 26/09/2026: MIMI tự phân loại trước (người dùng chọn "tự quyết hết, không hỏi") — khoản đã phân
  // loại thì không còn thông báo hỏi. Lỗi tự phân loại không chặn việc chính.
  await tuPhanLoaiNamNay(db, companyId, lucVN, laDemo);
  return await ghiThongBao(db, companyId, await nhapTienVaoGanDay(db, companyId, lucVN, laDemo));
}
