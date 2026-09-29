import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, FileWarning, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { nguoiDungHienTai } from '@/lib/nguoiDung';
import { congTyDangDung } from '@/lib/congTyDangDung';
import { ghepChungTu, type HoaDonVao, type KhoanChi } from '@/lib/khopChungTu';
import { ChonCachTinhThue } from '@/components/fintech/ChonCachTinhThue';
import { kyKeKhaiKeTiep } from '@/lib/hanKeKhai';
import { chieuTien } from '@/lib/chieuTien';
import { docHet } from '../../supabase/functions/_shared/doc-het';
import { dinhDangTien } from '@/lib/tien';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';
import { useCoMoHinh } from '@/hooks/useTrangThaiTroLy';

/**
 * Chứng từ chi phí: khoản nào đã có giấy tờ, khoản nào chưa.
 *
 * ĐÂY LÀ MÀN HÌNH TRẢ LỜI NỖI ĐAU SỐ MỘT. Từ 2026 hộ kinh doanh được chọn tính
 * thuế theo lợi nhuận, nhưng chỉ khi chứng minh được chi phí. Màn hình này chỉ
 * ra chính xác còn thiếu bao nhiêu, và thiếu ở khoản nào.
 *
 * TRỐNG THÌ PHẢI NÓI VÌ SAO TRỐNG. Trang này đọc hai nguồn, và mỗi nguồn có thể
 * chưa có dữ liệu vì một lý do khác nhau. Một bảng trống không lời giải thích
 * là đúng loại lỗi đã gỡ nhiều lần tuần này — màn hình mô tả một trạng thái mà
 * người đọc không biết phải làm gì với nó. Nên mỗi trạng thái trống ở đây đều
 * kèm việc cần bấm và đường dẫn tới đó.
 */

const dong = dinhDangTien;
const ngayVN = (s: string) => {
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};

/**
 * Doanh thu năm theo đúng một định nghĩa với Đồng hồ ngưỡng và tờ khai nháp (`tax-summary` →
 * `_shared/doanh-thu/so-lieu.ts`): trừ tiền chuyển giữa tài khoản của mình và khoản người dùng đã xác nhận
 * không phải doanh thu (vay, vốn góp…); khoản chưa rõ vẫn tính là doanh thu.
 */
async function docDoanhThuNam(nam: number, congTy: string): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Phiên đăng nhập đã hết. Đăng nhập lại.');
  const res = await fetch(`${SUPABASE_URL}/functions/v1/tax-summary?year=${nam}&company_id=${encodeURIComponent(congTy)}`, {
    headers: { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_PUBLISHABLE_KEY },
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string; revenue?: unknown };
  if (!res.ok || body.error) throw new Error(body.error ?? `Lỗi ${res.status}`);
  if (typeof body.revenue !== 'number' || !Number.isFinite(body.revenue)) throw new Error('Máy chủ không trả doanh thu năm.');
  return body.revenue;
}

export default function ChungTuPage() {
  const [chi, setChi] = useState<KhoanChi[]>([]);
  const [hoaDon, setHoaDon] = useState<HoaDonVao[]>([]);
  /*
   * DOANH THU NĂM, KHÔNG PHẢI QUÝ. Bảng chứng từ bên dưới đọc theo quý, nhưng
   * khối "chọn cách tính thuế" so với ngưỡng NĂM (01 tỷ, 3 tỷ). Bản trước đưa
   * doanh thu một quý vào đó — hộ bán 2 tỷ một năm, 500 triệu một quý, bị báo
   * "chưa phải nộp". Hai kỳ, hai bộ số, không trộn.
   *
   * KHÔNG CỘNG MỌI TIỀN VÀO (29/09/2026). Bản trước cộng mọi khoản tiền vào từ đầu năm và gọi là doanh thu —
   * một khoản giải ngân vay 100 tỷ biến thành 100 tỷ doanh thu, và lời khuyên cách tính thuế đổi theo.
   * `null` = chưa tính được (đọc lỗi): khi đó KHÔNG đưa lời khuyên, thay vì khuyên trên số 0.
   */
  const [doanhThuNam, setDoanhThuNam] = useState<number | null>(null);
  const [chiPhiCoChungTuNam, setChiPhiCoChungTuNam] = useState<number | null>(null);
  const [loiNam, setLoiNam] = useState<string | null>(null);
  /** Đọc giao dịch/hoá đơn của quý hỏng → không hiện "chi phí chưa có giấy tờ" (số đó sẽ sai). */
  const [loiKy, setLoiKy] = useState<string | null>(null);
  const [soDongThu, setSoDongThu] = useState(0);
  const [dangTai, setDangTai] = useState(true);

  const ky = useMemo(() => kyKeKhaiKeTiep(), []);
  /** Máy chủ đã bật đọc ảnh chứng từ chưa. Chưa bật thì nút chụp bị khoá — không được hứa "MIMI đọc". */
  const coMoHinh = useCoMoHinh();

  /**
   * Đọc dữ liệu của **kỳ đang tới hạn**, không phải toàn bộ lịch sử.
   *
   * Chi phí chỉ được trừ trong đúng kỳ phát sinh. Gộp cả năm vào một bảng sẽ ra
   * một con số to hơn và vô dụng — người dùng không mang nó đi khai được.
   */
  const tai = useCallback(async () => {
    setDangTai(true);
    try {
      const user = await nguoiDungHienTai();
      if (!user) return;

      const dang = await congTyDangDung();
      const id = dang?.id ?? null;
      // Công ty minh hoạ: cả sổ là dữ liệu mẫu, hiện hết (xem `_shared/minh-hoa.ts`).
      const laDemo = dang?.la_demo === true;
      if (!id) return;
      const cty = { id };

      // Quý đang tới hạn: ba tháng kết thúc trước ngày hạn.
      const cuoiKy = new Date(ky.han.getFullYear(), ky.han.getMonth(), 0);
      const dauKy = new Date(cuoiKy.getFullYear(), cuoiKy.getMonth() - 2, 1);
      const iso = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      // Từ đầu năm của quý đang tới hạn tới cuối quý đó.
      const dauNam = `${cuoiKy.getFullYear()}-01-01`;

      // Đọc HẾT theo trang (PostgREST cắt ở 1000 dòng): doanh thu năm ở đây được so với ngưỡng thuế,
      // cộng thiếu là con số sai mà trông như đủ. Giữ dạng { data, error } để phần báo lỗi bên dưới như cũ.
      const het = <T,>(tao: (a: number, b: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>, ten: string) =>
        docHet(tao, ten).then(
          (data) => ({ data: data as T[], error: null as { message: string } | null }),
          (e: unknown) => ({ data: null as T[] | null, error: { message: e instanceof Error ? e.message : String(e) } }),
        );
      type GdKy = { id: string; amount: number; type: string; transaction_date: string; merchant_name: string | null; payment_reference: string | null; counter_account_name: string | null; is_synthetic: boolean };
      /*
       * NGUỒN GIẤY TỜ: chứng từ người dùng tự chụp (`chung_tu_quet`, Thư viện chứng từ).
       * 29/09/2026: gỡ hoá đơn điện tử (GDT) — Casso chưa bật sản phẩm đó cho app production nên MIMI không đọc được hoá đơn nào từ cơ quan thuế; trước đó trang còn đọc bảng `gdt_invoices`, luôn trống.
       */
      type ChungTuKy = { id: string; tong_tien: number; ngay: string | null; so_hoa_don: string | null; ben_ban: string | null; ma_so_thue_ben_ban: string | null };
      const [gd, thuNam, quetKy, quetNam] = await Promise.all([
        het<GdKy>((a, b) => supabase
          .from('transactions')
          .select(
            'id, amount, type, transaction_date, merchant_name, payment_reference, counter_account_name, is_synthetic',
          )
          .eq('company_id', cty.id)
          .gte('transaction_date', iso(dauKy))
          .lte('transaction_date', iso(cuoiKy))
          .order('id').range(a, b), 'giao dịch trong kỳ'),
        docDoanhThuNam(cuoiKy.getFullYear(), cty.id).then(
          (data) => ({ data, error: null as { message: string } | null }),
          (e: unknown) => ({ data: null as number | null, error: { message: e instanceof Error ? e.message : String(e) } }),
        ),
        het<ChungTuKy>((a, b) => supabase
          .from('chung_tu_quet')
          .select('id, tong_tien, ngay, so_hoa_don, ben_ban, ma_so_thue_ben_ban')
          .eq('company_id', cty.id)
          .gte('ngay', iso(dauKy))
          .lte('ngay', iso(cuoiKy))
          .order('id').range(a, b), 'chứng từ chụp trong kỳ'),
        het<ChungTuKy>((a, b) => supabase
          .from('chung_tu_quet')
          .select('id, tong_tien, ngay, so_hoa_don, ben_ban, ma_so_thue_ben_ban')
          .eq('company_id', cty.id)
          .gte('ngay', dauNam)
          .lte('ngay', iso(cuoiKy))
          .order('id').range(a, b), 'chứng từ chụp từ đầu năm'),
      ]);

      // Không nuốt lỗi — bài học 08/09: truy vấn hỏng trông y hệt không có dữ liệu. Báo NGAY TRÊN khối
      // bị ảnh hưởng (không chỉ một thông báo thoáng qua), và không tính khối đó từ dữ liệu thiếu.
      const loiQuy = gd.error ?? quetKy.error;
      setLoiKy(loiQuy ? loiQuy.message : null);
      const loiCaNam = thuNam.error ?? quetNam.error;
      setLoiNam(loiCaNam ? loiCaNam.message : null);
      if (loiQuy) toast.error(`Không đọc được số liệu quý: ${loiQuy.message}`);

      setDoanhThuNam(thuNam.data);
      // Cùng định nghĩa với `tongCoGiay` của bảng quý: tổng mọi chứng từ đầu vào.
      setChiPhiCoChungTuNam(quetNam.error ? null :
        (quetNam.data ?? []).reduce((s, c) => s + (Number(c.tong_tien) || 0), 0));

      /*
       * BỎ DÒNG DỮ LIỆU THỬ.
       *
       * `is_synthetic` đánh dấu giao dịch do sandbox sinh ra — `open-banking`
       * và `ingest.ts` đều gắn cờ đó. `DashboardOverview` và `tax-summary` đã
       * lọc từ lâu; bản đầu của trang này thì không, nên nó hiện 5,8 tỷ chi phí
       * và những cái tên như "NCC Vật tư XYZ" như thể đó là tiền thật của khách.
       *
       * Đây đúng loại lỗi đã gỡ bốn lần tuần này — màn hình trình bày dữ liệu
       * bịa như dữ liệu của chính người dùng. Con số ở đây còn đi thẳng vào tờ
       * khai thuế, nên hậu quả nặng hơn hẳn.
       */
      const tatCa = gd.data ?? [];
      const rows = tatCa.filter((t) => laDemo || !t.is_synthetic);
      setSoDongThu(tatCa.length - rows.length);

      setChi(
        rows
          .filter((t) => chieuTien(t) === 'ra')
          .map((t) => ({
            id: t.id as string,
            soTien: Math.abs(Number(t.amount)),
            ngay: t.transaction_date as string,
            noiDung: [t.merchant_name, t.payment_reference].filter(Boolean).join(' ') || null,
            tenNguoiNhan: (t.counter_account_name as string) ?? null,
          })),
      );

      const tuChup = (quetKy.data ?? [])
        .map((c) => ({
          id: `quet:${c.id}`,
          soTien: Number(c.tong_tien),
          ngay: String(c.ngay).slice(0, 10),
          soHoaDon: c.so_hoa_don,
          tenBenBan: c.ben_ban,
          maSoThueBenBan: c.ma_so_thue_ben_ban,
        }));
      setHoaDon(tuChup);
    } finally {
      setDangTai(false);
    }
  }, [ky.han]);

  useEffect(() => { void tai(); }, [tai]);

  const kq = useMemo(() => ghepChungTu(chi, hoaDon), [chi, hoaDon]);

  const tenHoaDon = useMemo(() => {
    const m = new Map<string, HoaDonVao>();
    for (const h of hoaDon) m.set(h.id, h);
    return m;
  }, [hoaDon]);

  if (dangTai) {
    return (
      <p className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 size={15} className="animate-spin" /> Đang đọc giao dịch và chứng từ…
      </p>
    );
  }

  if (loiKy) {
    return (
      <div className="max-w-3xl space-y-4">
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground">Chứng từ chi phí</h2>
        <div role="alert" className="rounded-2xl border border-destructive/40 bg-card/50 p-5">
          <p className="text-sm font-semibold text-foreground">Chưa đọc được giao dịch hoặc chứng từ của quý này.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Đây là lỗi đọc dữ liệu, không phải bạn không có khoản chi nào. Chi tiết: {loiKy}
          </p>
          <button
            onClick={() => void tai()}
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium"
          >
            <RefreshCw size={14} /> Thử lại
          </button>
        </div>
      </div>
    );
  }

  const chuaNoiNganHang = chi.length === 0;
  const chuaCoHoaDon = hoaDon.length === 0;
  // Có dòng nhưng toàn dữ liệu thử là một trạng thái RIÊNG. Nói "chưa có giao
  // dịch nào" khi thật ra có 215 dòng sandbox cũng là một câu sai.
  const chiToanDuLieuThu = chi.length === 0 && soDongThu > 0;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
            Chứng từ chi phí
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Quý {ky.quy}/{ky.nam} · hạn nộp {ky.han.getDate()}/{ky.han.getMonth() + 1} · {ky.cau}
          </p>
        </div>
        <button
          onClick={() => void tai()}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium"
        >
          <RefreshCw size={14} /> Đọc lại
        </button>
      </div>

      {/* ── Con số duy nhất đáng nhớ ──────────────────────────────────── */}
      <div data-mimi="chung-tu.chua-co-giay" className="rounded-2xl border border-border/60 bg-card/50 p-5">
        <p className="text-xs text-muted-foreground">Chi phí chưa có giấy tờ trong quý này</p>
        <p className="mt-1 font-mono text-3xl font-bold text-foreground">
          {dong(kq.tongChuaCoGiay)}
        </p>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          Đã chi {dong(kq.tongDaChi)}, trong đó chứng minh được {dong(kq.tongCoGiay)} bằng chứng từ
          bạn đã chụp. Phần còn lại chưa có chứng từ nào ứng với nó — có thể bạn đã có hoá đơn mà
          chưa chụp lên Thư viện chứng từ.
        </p>
        {soDongThu > 0 && (
          // Nói ra chứ không lặng lẽ bỏ: người dùng thấy số nhỏ hơn họ tưởng
          // thì phải biết vì sao.
          <p className="mt-2 text-xs text-muted-foreground">
            Đã bỏ {soDongThu} giao dịch là dữ liệu thử của sandbox, không tính vào các con số trên.
          </p>
        )}
      </div>

      {/* ── Trống thì nói vì sao trống ─────────────────────────────────── */}
      {(chuaNoiNganHang || chuaCoHoaDon || chiToanDuLieuThu) && (
        <div className="space-y-3 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-500">
            <AlertTriangle size={15} /> Còn thiếu nguồn dữ liệu
          </p>
          {chiToanDuLieuThu && (
            <p className="text-sm">
              Quý này có {soDongThu} giao dịch nhưng tất cả đều là <strong>dữ liệu thử</strong> do
              môi trường sandbox sinh ra, nên không được tính vào chi phí. Nối tài khoản thật để
              thấy số của bạn.
            </p>
          )}
          {chuaNoiNganHang && !chiToanDuLieuThu && (
            <p className="text-sm">
              Chưa thấy khoản chi nào trong quý. MIMI đọc tiền ra vào từ sao kê —{' '}
              <Link to="/dashboard/fintech" className="font-medium text-primary underline">
                khai tài khoản nhận thông báo trong Fintech Hub
              </Link>{' '}
              rồi quay lại.
            </p>
          )}
          {chuaCoHoaDon && (
            coMoHinh === false ? (
              // 29/09/2026: câu cũ hứa "MIMI đọc số tiền, ngày, bên bán" trong khi đọc ảnh chưa bật và nút chụp bị khoá.
              <p className="text-sm">
                Chưa có chứng từ nào trong quý. MIMI <strong>chưa bật đọc ảnh chứng từ</strong>, nên hiện chưa thêm
                được chứng từ — mọi khoản chi dưới đây sẽ nằm ở nhóm chưa có giấy tờ. Hãy giữ hoá đơn gốc cho kế toán.
              </p>
            ) : (
              <p className="text-sm">
                Chưa có chứng từ nào trong quý.{' '}
                <Link to="/dashboard/thu-vien" className="font-medium text-primary underline">
                  Chụp hoá đơn trong Thư viện chứng từ
                </Link>{' '}
                — MIMI đọc số tiền, ngày, bên bán rồi tự ghép với khoản chi.
              </p>
            )
          )}
        </div>
      )}

      {/* ── Danh sách đi đòi chứng từ ──────────────────────────────────── */}
      {kq.chuaCoGiay.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
          <div className="flex items-center gap-2">
            <FileWarning size={15} className="text-muted-foreground" />
            <p className="text-sm font-semibold">
              {kq.chuaCoGiay.length} khoản cần đòi hoá đơn
            </p>
          </div>
          {/* Khoản to nhất đứng đầu — nó ảnh hưởng tiền thuế nhiều nhất. */}
          <p className="mt-1 text-xs text-muted-foreground">
            Xếp từ lớn tới nhỏ. Đòi được khoản đầu tiên là giảm nhiều thuế nhất.
          </p>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[460px] text-sm">
              <thead>
                <tr className="border-b border-border/40 text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Ngày</th>
                  <th className="pb-2 font-medium">Nội dung</th>
                  <th className="pb-2 text-right font-medium">Số tiền</th>
                </tr>
              </thead>
              <tbody>
                {kq.chuaCoGiay.slice(0, 20).map((c) => (
                  <tr key={c.id} className="border-b border-border/20 last:border-0">
                    <td className="whitespace-nowrap py-2.5 font-mono text-xs">{ngayVN(c.ngay)}</td>
                    <td className="py-2.5">
                      {c.tenNguoiNhan || c.noiDung || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-mono font-medium">{dong(c.soTien)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {kq.chuaCoGiay.length > 20 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Còn {kq.chuaCoGiay.length - 20} khoản nữa, tổng {dong(
                kq.chuaCoGiay.slice(20).reduce((s, c) => s + c.soTien, 0),
              )}.
            </p>
          )}
        </div>
      )}

      {/* ── Cần người xem ─────────────────────────────────────────────── */}
      {kq.canXem.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
          <p className="text-sm font-semibold">{kq.canXem.length} khoản khớp nhiều hoá đơn</p>
          {/*
            Máy không chọn hộ. Chọn đại thì tổng vẫn đúng nên lỗi không lộ ở con
            số — nó lộ khi người dùng mở ra xem và thấy một cặp ghép sai.
          */}
          <p className="mt-1 text-xs text-muted-foreground">
            Cùng số tiền, cùng khoảng ngày. MIMI không tự chọn — bạn xem rồi quyết.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {kq.canXem.map((x) => (
              <li key={x.khoanChiId} className="flex flex-wrap items-baseline gap-2">
                <span className="font-mono font-medium">{dong(x.soTien)}</span>
                <span className="text-muted-foreground">
                  khớp {x.hoaDonId.length} hoá đơn:{' '}
                  {x.hoaDonId
                    .map((id) => tenHoaDon.get(id)?.tenBenBan ?? tenHoaDon.get(id)?.soHoaDon ?? id)
                    .join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Hoá đơn chưa thấy đường tiền ───────────────────────────────── */}
      {kq.hoaDonChuaThayTien.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
          <p className="text-sm font-semibold">
            {kq.hoaDonChuaThayTien.length} hoá đơn chưa thấy khoản chi tương ứng
          </p>
          {/* Không phải lỗi. Trả tiền mặt thì sao kê không có gì để đối chiếu. */}
          <p className="mt-1 text-xs text-muted-foreground">
            Không sao — có thể bạn trả bằng tiền mặt. Hoá đơn vẫn được tính vào chi phí chứng
            minh được.
          </p>
        </div>
      )}

      {/* ── Nối thẳng sang câu hỏi tiền ────────────────────────────────── */}
      <div>
        <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <ArrowRight size={13} /> Ngưỡng thuế tính theo năm, nên phép so sánh dưới đây dùng doanh thu cả năm
          (cùng số với Đồng hồ ngưỡng — đã trừ tiền chuyển nội bộ và khoản bạn xác nhận không phải doanh thu)
        </p>
        {loiNam || doanhThuNam === null || chiPhiCoChungTuNam === null ? (
          <p role="alert" className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm text-foreground">
            Chưa tính được doanh thu hoặc chi phí có chứng từ cả năm{loiNam ? ` (${loiNam})` : ''}, nên chưa so sánh
            cách tính thuế — so trên số thiếu là lời khuyên sai.
          </p>
        ) : (
          <ChonCachTinhThue doanhThu={doanhThuNam} chiPhiCoChungTu={chiPhiCoChungTuNam} />
        )}
      </div>
    </div>
  );
}
