import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, FileWarning, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ghepChungTu, type HoaDonVao, type KhoanChi } from '@/lib/khopChungTu';
import { ChonCachTinhThue } from '@/components/fintech/ChonCachTinhThue';
import { kyKeKhaiKeTiep } from '@/lib/hanKeKhai';

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

const dong = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}đ`;
const ngayVN = (s: string) => {
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};

export default function ChungTuPage() {
  const [chi, setChi] = useState<KhoanChi[]>([]);
  const [hoaDon, setHoaDon] = useState<HoaDonVao[]>([]);
  const [doanhThu, setDoanhThu] = useState(0);
  const [soDongThu, setSoDongThu] = useState(0);
  const [dangTai, setDangTai] = useState(true);

  const ky = useMemo(() => kyKeKhaiKeTiep(), []);

  /**
   * Đọc dữ liệu của **kỳ đang tới hạn**, không phải toàn bộ lịch sử.
   *
   * Chi phí chỉ được trừ trong đúng kỳ phát sinh. Gộp cả năm vào một bảng sẽ ra
   * một con số to hơn và vô dụng — người dùng không mang nó đi khai được.
   */
  const tai = useCallback(async () => {
    setDangTai(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: cty } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!cty) return;

      // Quý đang tới hạn: ba tháng kết thúc trước ngày hạn.
      const cuoiKy = new Date(ky.han.getFullYear(), ky.han.getMonth(), 0);
      const dauKy = new Date(cuoiKy.getFullYear(), cuoiKy.getMonth() - 2, 1);
      const iso = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const [gd, hd] = await Promise.all([
        supabase
          .from('transactions')
          .select(
            'id, amount, type, transaction_date, merchant_name, payment_reference, counter_account_name, is_synthetic',
          )
          .eq('company_id', cty.id)
          .gte('transaction_date', iso(dauKy))
          .lte('transaction_date', iso(cuoiKy)),
        supabase
          .from('gdt_invoices')
          .select('id, total_amount, issued_at, invoice_number, counterparty_name, counterparty_tax_code')
          .eq('company_id', cty.id)
          .eq('direction', 'received')
          .gte('issued_at', iso(dauKy))
          .lte('issued_at', `${iso(cuoiKy)}T23:59:59`),
      ]);

      // Không nuốt lỗi — bài học 08/09: truy vấn hỏng trông y hệt không có dữ liệu.
      if (gd.error) toast.error(`Không đọc được giao dịch: ${gd.error.message}`);
      if (hd.error) toast.error(`Không đọc được hoá đơn: ${hd.error.message}`);

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
      const rows = tatCa.filter((t) => !t.is_synthetic);
      setSoDongThu(tatCa.length - rows.length);

      setChi(
        rows
          .filter((t) => t.type === 'expense' || Number(t.amount) < 0)
          .map((t) => ({
            id: t.id as string,
            soTien: Math.abs(Number(t.amount)),
            ngay: t.transaction_date as string,
            noiDung: [t.merchant_name, t.payment_reference].filter(Boolean).join(' ') || null,
            tenNguoiNhan: (t.counter_account_name as string) ?? null,
          })),
      );

      setDoanhThu(
        rows
          .filter((t) => t.type === 'income' || Number(t.amount) > 0)
          .reduce((s, t) => s + Math.abs(Number(t.amount)), 0),
      );

      setHoaDon(
        (hd.data ?? []).map((h) => ({
          id: h.id as string,
          soTien: Number(h.total_amount),
          ngay: String(h.issued_at).slice(0, 10),
          soHoaDon: (h.invoice_number as string) ?? null,
          tenBenBan: (h.counterparty_name as string) ?? null,
          maSoThueBenBan: (h.counterparty_tax_code as string) ?? null,
        })),
      );
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
        <Loader2 size={15} className="animate-spin" /> Đang đọc giao dịch và hoá đơn…
      </p>
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
      <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
        <p className="text-xs text-muted-foreground">Chi phí chưa có giấy tờ trong quý này</p>
        <p className="mt-1 font-mono text-3xl font-bold text-foreground">
          {dong(kq.tongChuaCoGiay)}
        </p>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          Đã chi {dong(kq.tongDaChi)}, trong đó chứng minh được {dong(kq.tongCoGiay)} bằng hoá đơn
          đầu vào. Phần còn lại chưa có hoá đơn điện tử nào ứng với nó — có thể bạn đã có hoá đơn
          giấy mà chưa nhập.
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
            <p className="text-sm">
              Chưa có hoá đơn đầu vào nào.{' '}
              <Link to="/dashboard/fintech" className="font-medium text-primary underline">
                Bấm đồng bộ ở dòng Tổng Cục Thuế
              </Link>{' '}
              để tải hoá đơn điện tử của quý.
            </p>
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
          <ArrowRight size={13} /> Con số trên đưa thẳng vào phép so sánh dưới đây
        </p>
        <ChonCachTinhThue doanhThu={doanhThu} chiPhiCoChungTu={kq.tongCoGiay} />
      </div>
    </div>
  );
}
