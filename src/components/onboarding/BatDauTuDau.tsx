import { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { kyKeKhaiKeTiep, mucKhan } from '@/lib/hanKeKhai';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { Check, ArrowRight, Lock, X } from 'lucide-react';
import { dungCacBuoc, soBuocXong, xongHet, type Buoc } from '@/lib/batDau';
import { track } from '@/lib/track';

/**
 * "Bắt đầu từ đâu" — chỉ người mới việc cần làm.
 *
 * Bổ sung cho `WelcomeCards`, không thay thế: `WelcomeCards` hỏi **về bạn**
 * (loại hình, ngành, quy mô) để phân luồng; thẻ này chỉ **làm gì tiếp theo**.
 *
 * Toàn bộ điều kiện hoàn thành nằm ở `src/lib/batDau.ts` (13 test) và được tính
 * từ ba con số đếm được trong cơ sở dữ liệu. Component này chỉ đi lấy ba con số
 * đó rồi vẽ. Không có nút nào ở đây làm một bước xanh lên — muốn bước xanh thì
 * phải làm việc thật.
 *
 * Ẩn hẳn khi xong hết. Đóng được, và ghi lại việc đóng vào `product_events` —
 * cùng lối `WelcomeCards` đang dùng: người đóng là một câu trả lời thật, không
 * phải lý do để hỏi lại vào lần đăng nhập sau.
 */

const KHOA_DA_DONG = 'mimi.batdau.daDong';

export default function BatDauTuDau() {
  const session = useAuthStore((s) => s.session);
  const navigate = useNavigate();
  const [buocs, setBuocs] = useState<Buoc[] | null>(null);
  const [daDong, setDaDong] = useState(() => {
    try {
      return localStorage.getItem(KHOA_DA_DONG) === '1';
    } catch {
      // Trình duyệt chặn lưu trữ (chế độ riêng tư). Coi như chưa đóng.
      return false;
    }
  });

  useEffect(() => {
    if (!session || daDong) return;
    let huy = false;

    (async () => {
      const { data: companies } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true })
        .limit(1);
      const companyId = companies?.[0]?.id;
      if (!companyId) return;

      /*
       * Ba phép đếm, chạy song song. Dùng `head: true` để chỉ lấy số lượng chứ
       * không kéo về cả bảng — thẻ này chạy trên mọi lần mở Tổng quan.
       *
       * Liên kết ngân hàng phải lọc `status != disconnected`: một liên kết đã
       * ngắt vẫn còn dòng trong bảng vì nó mang dấu vết kiểm toán, nhưng nó
       * không còn đưa dữ liệu về nữa nên không tính là đã xong.
       */
      const [lk, gd, kh] = await Promise.all([
        supabase.from('bank_connections').select('id', { count: 'exact', head: true })
          .eq('company_id', companyId).neq('status', 'disconnected'),
        supabase.from('transactions').select('id', { count: 'exact', head: true })
          .eq('company_id', companyId),
        supabase.from('clients').select('id', { count: 'exact', head: true })
          .eq('company_id', companyId),
      ]);

      if (huy) return;
      setBuocs(dungCacBuoc({
        soLienKet: lk.count ?? 0,
        soGiaoDich: gd.count ?? 0,
        soKhachHang: kh.count ?? 0,
      }));
    })();

    return () => { huy = true; };
  }, [session, daDong]);

  const dong = () => {
    setDaDong(true);
    try { localStorage.setItem(KHOA_DA_DONG, '1'); } catch { /* không sao */ }
    track('batdau_dismissed', { so_buoc_xong: buocs ? soBuocXong(buocs) : 0 });
  };

  // Chưa tải xong, đã đóng, hoặc đã xong hết → không dựng khung rỗng.
  if (daDong || !buocs || xongHet(buocs)) return null;

  const xong = soBuocXong(buocs);

  /*
   * Hạn kê khai là thứ duy nhất trong sản phẩm có đồng hồ đang chạy: mọi việc
   * khác làm hôm nay hay tuần sau cũng thế, riêng cái này trễ là bị phạt.
   * Tính một lần cho mỗi lần vẽ — không cần bộ đếm, vì đơn vị là ngày.
   */
  const ky = kyKeKhaiKeTiep();
  const khan = mucKhan(ky.conLai);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl border border-border bg-card p-5"
    >
      <button
        onClick={dong}
        aria-label="Đóng hướng dẫn"
        className="absolute top-3 right-3 tap-target flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="pr-10">
        <h3 className="font-semibold text-foreground">Bắt đầu từ đâu</h3>
        {/*
          NÓI VÌ SAO TRƯỚC KHI NÓI LÀM GÌ.
          Bản trước mở đầu bằng "2/3 bước" — đúng nhưng vô nghĩa với người vừa
          mở app lần đầu: họ chưa biết MIMI để làm gì, nên một thanh tiến độ chỉ
          là một việc vặt không rõ mục đích. Một câu về việc cần làm và một hạn
          có thật cho biết vì sao nên bấm tiếp.
        */}
        <p className="text-sm text-muted-foreground mt-0.5">
          Nối tài khoản ngân hàng, MIMI đọc sao kê và dựng sẵn bộ chi phí cho kỳ kê khai.
        </p>
        <p className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${
          khan === 'gap'
            ? 'bg-destructive/10 text-destructive'
            : khan === 'sap_toi'
              ? 'bg-mimi-amber/12 text-mimi-amber'
              : 'bg-muted text-muted-foreground'
        }`}>
          <CalendarClock size={13} /> {ky.cau}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {xong}/{buocs.length} bước — các bước tự đánh dấu khi bạn làm xong, không cần bấm.
        </p>
      </div>

      <div className="mt-4 space-y-2">
        {buocs.map((b) => (
          <button
            key={b.ma}
            onClick={() => b.moKhoa && !b.xong && navigate(b.duongDan)}
            disabled={!b.moKhoa || b.xong}
            className={`w-full text-left flex items-start gap-3 rounded-xl border p-3.5 transition-colors ${
              b.xong
                ? 'border-mimi-green/25 bg-mimi-green/[0.04]'
                : b.moKhoa
                  ? 'border-border hover:border-primary/40 hover:bg-muted/40 cursor-pointer'
                  : 'border-border/60 opacity-60 cursor-default'
            }`}
          >
            <span
              className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                b.xong
                  ? 'bg-mimi-green/15 text-mimi-green'
                  : b.moKhoa
                    ? 'border border-border'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {b.xong ? <Check size={12} /> : !b.moKhoa ? <Lock size={11} /> : null}
            </span>

            <span className="min-w-0 flex-1">
              <span className={`block text-sm font-medium ${b.xong ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                {b.tieuDe}
              </span>
              {!b.xong && (
                <span className="block text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {b.moTa}
                  {!b.moKhoa && ' — cần liên kết ngân hàng trước.'}
                </span>
              )}
            </span>

            {!b.xong && b.moKhoa && (
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
