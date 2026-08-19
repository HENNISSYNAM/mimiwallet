import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';

/**
 * Xoá tài khoản — bắt buộc theo App Store Guideline 5.1.1(v).
 *
 * Điều khoản đó nói: ứng dụng nào cho người dùng tạo tài khoản thì phải cho họ
 * xoá tài khoản ngay trong ứng dụng. Không được chỉ dẫn ra email, không được
 * chôn trong một trang web riêng. Đây là một trong những lý do bị từ chối phổ
 * biến nhất, và nó thuộc loại kiểm tra được trong ba mươi giây nên người duyệt
 * gần như luôn kiểm.
 *
 * Hai lựa chọn thiết kế đáng nói:
 *
 * 1. **Gõ lại câu xác nhận, không phải hộp thoại "Bạn chắc chứ?".** Hộp thoại
 *    xác nhận bị bấm Đồng ý theo phản xạ; gõ một câu thì buộc phải đọc. Thao
 *    tác này không hoàn tác được nên ma sát ở đây là có chủ ý.
 *
 * 2. **Nói trước cái gì sẽ mất, kể tên cụ thể.** "Toàn bộ dữ liệu của bạn" là
 *    một câu không ai hình dung ra được. Liệt kê giao dịch, hoá đơn, danh bạ
 *    khách hàng thì người ta mới biết mình sắp mất gì và tự đi trích xuất trước.
 */

/** Phải khớp chính xác `CAU_XAC_NHAN` trong `supabase/functions/delete-account`. */
const CAU_XAC_NHAN = 'XOA TAI KHOAN CUA TOI';

export function DeleteAccountSection() {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [moRong, setMoRong] = useState(false);
  const [nhap, setNhap] = useState('');
  const [dangXoa, setDangXoa] = useState(false);

  const khop = nhap.trim().toUpperCase() === CAU_XAC_NHAN;

  const xoa = async () => {
    if (!khop) return;
    setDangXoa(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { confirm: CAU_XAC_NHAN },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      /*
       * Nói thật khi thu hồi uỷ quyền ngân hàng chưa xong.
       *
       * Tài khoản đã xoá, nhưng nếu ngân hàng đòi OTP thì uỷ quyền đọc sao kê
       * vẫn còn hiệu lực ở phía họ. Báo "đã xoá" rồi im lặng về chuyện đó là
       * để người dùng tin sai về một quyền truy cập tài khoản ngân hàng.
       */
      const conLai = data?.bank_grants_not_revoked ?? [];
      if (conLai.length) {
        toast.warning(
          `Tài khoản đã xoá. Còn ${conLai.length} liên kết ngân hàng chưa thu hồi được — ` +
            'vui lòng vào ứng dụng ngân hàng huỷ quyền chia sẻ dữ liệu.',
          { duration: 15000 },
        );
      } else {
        toast.success('Tài khoản và toàn bộ dữ liệu đã được xoá.');
      }
      logout();
      navigate('/');
    } catch (e) {
      toast.error('Không xoá được: ' + ((e as Error)?.message ?? 'lỗi không xác định'));
    } finally {
      setDangXoa(false);
    }
  };

  return (
    <div className="rounded-2xl border border-destructive/25 bg-destructive/[0.03] p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Xoá tài khoản</p>
          <p className="text-sm text-muted-foreground mt-1">
            Xoá vĩnh viễn tài khoản và toàn bộ dữ liệu: giao dịch đã đồng bộ, hoá đơn,
            danh bạ khách hàng, liên kết ngân hàng và hồ sơ doanh nghiệp.
            Thao tác này <strong className="text-foreground">không hoàn tác được</strong>.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Nếu bạn cần giữ chứng từ cho nghĩa vụ kế toán và thuế, hãy xuất dữ liệu ra
            file trước khi xoá.
          </p>

          {!moRong ? (
            <button
              onClick={() => setMoRong(true)}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-destructive hover:underline tap-target"
            >
              <Trash2 className="w-3.5 h-3.5" /> Tôi muốn xoá tài khoản
            </button>
          ) : (
            <div className="mt-4 space-y-3">
              <label className="block text-sm text-muted-foreground">
                Để xác nhận, gõ lại:{' '}
                <span className="font-mono font-semibold text-foreground">{CAU_XAC_NHAN}</span>
              </label>
              <input
                value={nhap}
                onChange={(e) => setNhap(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder={CAU_XAC_NHAN}
                className="w-full h-11 px-3 rounded-xl bg-background border border-border font-mono text-sm outline-none focus:ring-2 focus:ring-destructive/30"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => void xoa()}
                  disabled={!khop || dangXoa}
                  className="h-11 px-4 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium disabled:opacity-40 inline-flex items-center gap-2 tap-target"
                >
                  {dangXoa && <Loader2 className="w-4 h-4 animate-spin" />}
                  Xoá vĩnh viễn
                </button>
                <button
                  onClick={() => { setMoRong(false); setNhap(''); }}
                  disabled={dangXoa}
                  className="h-11 px-4 rounded-xl border border-border text-sm tap-target"
                >
                  Huỷ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
