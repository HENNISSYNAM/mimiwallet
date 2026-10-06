import { useEffect, useState } from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { idCongTyDangDung } from '@/lib/congTyDangDung';

/**
 * TRẠNG THÁI THẬT CỦA SEPAY (06/10/2026). Khai số tài khoản xong, máy chủ ghi `status='connected'` ngay — nhưng SePay
 * chỉ báo tiền về khi tài khoản đó đã liên kết trong SePay và webhook trỏ về MIMI. Trước đây màn hình nói "đã đăng ký,
 * tiền vào sẽ tự khớp" dù chưa có giao dịch nào tới (kiểm 06/10: không công ty nào từng nhận giao dịch SePay).
 * Đếm theo `reference_id` 'sepay:…' vì giao dịch SePay cũ có `source` rỗng.
 * Khối này nói đúng điều MIMI thấy: đã nhận bao nhiêu giao dịch qua SePay, lần cuối khi nào — hay chưa lần nào.
 */
interface TaiKhoan { so: string; nganHang: string | null }
interface TrangThai { taiKhoan: TaiKhoan[]; soGd: number; gdCuoi: string | null }

export function TrangThaiSePay({ lamMoi = 0 }: { lamMoi?: number }) {
  const [tt, setTt] = useState<TrangThai | null>(null);

  useEffect(() => {
    let huy = false;
    (async () => {
      const cid = await idCongTyDangDung().catch(() => null);
      if (!cid) return;
      const [{ data: kn }, { count, data: cuoi }] = await Promise.all([
        supabase.from('bank_connections').select('account_number, bank_name').eq('company_id', cid).eq('provider', 'sepay').eq('status', 'connected'),
        supabase.from('transactions').select('transaction_date', { count: 'exact' }).eq('company_id', cid).like('reference_id', 'sepay:%')
          .order('transaction_date', { ascending: false }).limit(1),
      ]);
      if (huy) return;
      setTt({
        taiKhoan: (kn ?? []).map((k) => ({ so: String(k.account_number ?? ''), nganHang: k.bank_name ?? null })),
        soGd: count ?? 0,
        gdCuoi: cuoi?.[0]?.transaction_date ?? null,
      });
    })();
    return () => { huy = true; };
  }, [lamMoi]);

  if (!tt || !tt.taiKhoan.length) return null;
  const duoi = (s: string) => `••••${s.slice(-4)}`;
  return (
    <div className="mt-4 rounded-xl border border-border/60 bg-background/60 p-3 text-xs">
      <p className="font-medium text-foreground">Tài khoản đã khai: {tt.taiKhoan.map((t) => `${t.nganHang ?? ''} ${duoi(t.so)}`.trim()).join(', ')}</p>
      {tt.soGd > 0 ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-mimi-green">
          <CheckCircle2 size={13} aria-hidden /> MIMI đã nhận {tt.soGd} giao dịch qua SePay, gần nhất ngày {String(tt.gdCuoi).slice(8, 10)}/{String(tt.gdCuoi).slice(5, 7)}.
        </p>
      ) : (
        <div className="mt-1.5 text-muted-foreground">
          <p className="flex items-center gap-1.5 text-mimi-amber"><Clock size={13} aria-hidden /> Chưa nhận giao dịch nào qua SePay.</p>
          <p className="mt-1">
            SePay chỉ báo khi tài khoản đã được liên kết trong SePay và gửi thông báo về MIMI. Liên hệ MIMI để bật cho tài
            khoản này. Trong lúc chờ, bạn tải sao kê ở mục "Tải sao kê lên" để MIMI vẫn có số liệu.
          </p>
        </div>
      )}
    </div>
  );
}
