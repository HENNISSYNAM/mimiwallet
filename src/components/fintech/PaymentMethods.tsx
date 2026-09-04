import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, CreditCard, QrCode } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import logoVnpay from '@/assets/logos/pay-vnpay.webp';
import logoZalopay from '@/assets/logos/pay-zalopay.png';
import logoMomo from '@/assets/logos/bank-momo.png';

/**
 * Phương thức thanh toán.
 *
 * VIẾT LẠI 04/09/2026. Bản trước là một trang bịa hoàn toàn, và bịa theo kiểu
 * khách hàng có thể tin rồi thiệt hại thật:
 *
 *   - Huy hiệu **"PCI DSS Level 1"** đóng cứng. MIMI không có chứng chỉ đó.
 *   - VNPay, MoMo, Stripe mang nhãn xanh **"Hoạt động"** kèm dấu tick, trong
 *     khi `status: 'active'` chỉ là chữ viết cứng trong `useState`. Không có
 *     một dòng tích hợp nào với VNPay, MoMo, ZaloPay hay PayPal.
 *   - Biểu phí **"1.1% + ₫1,650/GD · Giải ngân T+1"**, hạn mức **"₫50M/GD"**.
 *     Đây là con số một chủ doanh nghiệp dùng để tính giá bán.
 *   - Ba giao dịch **"Thành công"** ₫990,000 / ₫490,000 trình bày như lịch sử
 *     thanh toán thật của công ty đang đăng nhập.
 *
 * Cùng họ với phần eKYC diễn đã gỡ ngày 17/08 và với hai ngõ cụt tuần này: màn
 * hình nói một đằng, sự thật một nẻo. Khác ở chỗ trang này nguy hiểm hơn — hai
 * cái kia làm người dùng bấm nhầm nút, cái này làm họ tính sai giá.
 *
 * NAY CHỈ HAI THỨ CÓ THẬT ĐƯỢC GỌI LÀ CÓ THẬT:
 *
 *   QR Pay qua Cas — `bank-link?action=create-qr`, `QrPayDialog.tsx`. Trạng
 *                    thái đọc từ `bank_connections` chứ không viết cứng.
 *   Stripe         — `create-checkout` dùng SDK Stripe thật với
 *                    `STRIPE_SECRET_KEY`. Trạng thái đọc từ `subscriptions`.
 *
 * Ba cái còn lại giữ lại làm lộ trình, có logo thật, và nói thẳng là chưa tích
 * hợp. Giữ chúng hữu ích hơn xoá: đó là kế hoạch có thật. Nhưng nhãn phải đúng.
 */

interface TrangThai {
  qrSan: boolean;
  qrTen: string | null;
  goi: string | null;
  hetHan: string | null;
  dangTai: boolean;
}

export default function PaymentMethods() {
  const [tt, setTt] = useState<TrangThai>({
    qrSan: false, qrTen: null, goi: null, hetHan: null, dangTai: true,
  });

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setTt((p) => ({ ...p, dangTai: false }));

      const { data: cty } = await supabase
        .from('companies').select('id').eq('user_id', user.id)
        .order('created_at', { ascending: true }).limit(1);
      const cid = cty?.[0]?.id;
      if (!cid) return setTt((p) => ({ ...p, dangTai: false }));

      // Liên kết QR đang sống. Đây là nguồn sự thật duy nhất cho "nhận được
      // tiền QR hay chưa" — không phải một cờ trong mã.
      const { data: qr } = await supabase
        .from('bank_connections')
        .select('account_name, bank_name')
        .eq('company_id', cid).eq('scopes', 'qrpay').eq('status', 'connected')
        .limit(1);

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan, current_period_end')
        .eq('company_id', cid).limit(1);

      setTt({
        qrSan: !!qr?.length,
        qrTen: qr?.[0] ? `${qr[0].bank_name ?? ''} · ${qr[0].account_name ?? ''}`.trim() : null,
        goi: sub?.[0]?.plan ?? null,
        hetHan: sub?.[0]?.current_period_end ?? null,
        dangTai: false,
      });
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display font-bold text-foreground text-lg">Phương thức thanh toán</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Cách MIMI nhận tiền từ khách của bạn, và cách bạn trả phí dịch vụ
        </p>
      </div>

      {/* ── Đang dùng được ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          Đang dùng được
        </p>

        <ThePhuongThuc
          bieuTuong={<QrCode size={20} className="text-primary" />}
          ten="Nhận tiền bằng mã QR"
          mo="Khách quét mã, tiền vào thẳng tài khoản ngân hàng của bạn. MIMI không giữ tiền."
          sanSang={tt.qrSan}
          dangTai={tt.dangTai}
          chuThich={
            tt.qrSan
              ? tt.qrTen
              : 'Chưa liên kết tài khoản nhận tiền QR — làm ở tab Open Banking'
          }
        />

        <ThePhuongThuc
          bieuTuong={<CreditCard size={20} className="text-primary" />}
          ten="Thẻ quốc tế (Stripe)"
          mo="Dùng để bạn trả phí thuê bao MIMI. Visa, Mastercard."
          sanSang={!!tt.goi}
          dangTai={tt.dangTai}
          chuThich={
            tt.goi
              ? `Gói ${tt.goi}${tt.hetHan ? ` · đến ${new Date(tt.hetHan).toLocaleDateString('vi-VN')}` : ''}`
              : 'Chưa có gói thuê bao nào đang chạy'
          }
        />
      </div>

      {/* ── Lộ trình ───────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          Chưa tích hợp
        </p>
        {[
          { logo: logoVnpay, ten: 'VNPay', mo: 'Cổng thanh toán nội địa' },
          { logo: logoMomo, ten: 'MoMo', mo: 'Ví điện tử' },
          { logo: logoZalopay, ten: 'ZaloPay', mo: 'Ví điện tử' },
        ].map((m) => (
          <div
            key={m.ten}
            className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/40 p-5"
          >
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-border/60">
                <img src={m.logo} alt="" className="h-8 w-8 object-contain" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{m.ten}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{m.mo}</p>
              </div>
            </div>
            {/* Không có nút "Kích hoạt". Bản trước có, và nó chỉ lật một biến
                trong bộ nhớ trình duyệt rồi hiện nhãn xanh — tức là bịa thêm
                một lần nữa, lần này do chính người dùng bấm ra. */}
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Chưa tích hợp
            </span>
          </div>
        ))}
      </div>

      {/*
        Không có mục "Giao dịch thanh toán gần đây".

        Bản trước liệt kê ba giao dịch thành công viết cứng trong JSX. Không có
        bảng nào trong CSDL chứa lịch sử thanh toán thuê bao, nên viết lại mục
        này bằng dữ liệu thật là chưa làm được — và một danh sách rỗng còn thật
        hơn ba dòng bịa. Khi có bảng, thêm lại ở đây.
      */}
    </div>
  );
}

function ThePhuongThuc({
  bieuTuong, ten, mo, sanSang, dangTai, chuThich,
}: {
  bieuTuong: React.ReactNode;
  ten: string;
  mo: string;
  sanSang: boolean;
  dangTai: boolean;
  chuThich: string | null;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`rounded-2xl border p-5 transition-colors ${
        sanSang ? 'border-mimi-green/25 bg-card/60' : 'border-border/60 bg-card/40'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent">
            {bieuTuong}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{ten}</p>
              {/* Nhãn chỉ hiện khi dữ liệu đã về. Trong lúc tải mà hiện "chưa
                  bật" thì nó nhấp nháy sang "đang chạy" — người dùng đọc được
                  cái sai trước cái đúng. */}
              {!dangTai && sanSang && (
                <span className="rounded-full bg-mimi-green/10 px-2 py-0.5 text-[10px] font-medium text-mimi-green">
                  Đang chạy
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{mo}</p>
            {!dangTai && chuThich && (
              <p className="mt-1.5 truncate text-xs text-foreground/70">{chuThich}</p>
            )}
          </div>
        </div>
        {!dangTai &&
          (sanSang ? (
            <Check size={18} className="shrink-0 text-mimi-green" />
          ) : (
            <ArrowRight size={16} className="shrink-0 text-muted-foreground" />
          ))}
      </div>
    </motion.div>
  );
}
