import { useCallback, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';
import { toast } from 'sonner';

/**
 * Đăng ký tài khoản nhận thông báo SePay.
 *
 * VÌ SAO TỒN TẠI. `bank-webhook` tra `bank_connections` theo
 * `provider='sepay'` + `account_number` để biết khoản tiền vừa vào thuộc công
 * ty nào. Nhưng trước 07/09/2026 KHÔNG NƠI NÀO trong mã tạo ra dòng đó — nên
 * mọi webhook SePay đều bị bỏ với "unknown account", và người dùng chuyển tiền
 * thật rồi ngồi chờ một thứ không bao giờ tới.
 *
 * ĐÂY LÀ ĐƯỜNG THU TIỀN ĐỘC LẬP VỚI CAS. Cas hiện tắc ở hai chỗ ngoài tầm sửa
 * của mình: `/transactions` trả rỗng cho grant hợp lệ, và không có webhook khi
 * tiền thật về. SePay canh tài khoản và đẩy thông báo kèm nội dung chuyển
 * khoản — đúng cách đối soát của Việt Nam, và không đi qua Cas.
 *
 * KHÔNG CÓ QUYỀN NÀO ĐƯỢC CẤP Ở ĐÂY. SePay đẩy sang mình, mình không gọi ngược
 * lại. Dòng này chỉ mang số tài khoản và tên ngân hàng — không token, không mã
 * hoá, không quyền đọc gì của khách. Nói rõ vì người dùng vừa trải qua một
 * luồng Cas đòi OTP và cấp quyền, dễ tưởng đây cũng vậy.
 *
 * PLACEHOLDER KHÔNG ĐƯỢC TRÔNG GIỐNG DỮ LIỆU THẬT.
 *
 * Bản đầu để placeholder là "2431122002", "MB Bank", "DINH VAN NAM" — đúng số
 * tài khoản và tên của người đang dùng. Nhìn vào tưởng đã điền xong, chỉ có nút
 * mờ là dấu hiệu duy nhất cho thấy form vẫn trống, mà không ai đọc nút để biết
 * ô đã điền hay chưa.
 *
 * Người dùng hỏi thẳng "này đã hoạt động chưa" — đúng câu mà một form trống
 * trông như đã điền sẽ gây ra.
 */
export function DangKySePay({ onXong }: { onXong?: () => void }) {
  const { session } = useAuthStore();
  const [soTaiKhoan, setSoTaiKhoan] = useState('');
  const [tenNganHang, setTenNganHang] = useState('');
  const [tenChu, setTenChu] = useState('');
  const [dangGui, setDangGui] = useState(false);

  const hopLe = /^\d{6,20}$/.test(soTaiKhoan.replace(/\s/g, '')) && tenNganHang.trim().length > 0;

  const gui = useCallback(async () => {
    if (!session?.access_token || !hopLe) return;
    setDangGui(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/bank-link?action=dang-ky-sepay`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          apikey: SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          accountNumber: soTaiKhoan,
          bankName: tenNganHang,
          accountName: tenChu,
        }),
      });
      const kq = await res.json();
      if (!res.ok || kq?.error) throw new Error(kq?.error ?? `Lỗi ${res.status}`);
      toast.success('Đã đăng ký. Tiền vào tài khoản này sẽ tự khớp với mã QR đang chờ.');
      setSoTaiKhoan('');
      setTenChu('');
      onXong?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không đăng ký được');
    } finally {
      setDangGui(false);
    }
  }, [session, hopLe, soTaiKhoan, tenNganHang, tenChu, onXong]);

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
      <div className="flex items-start gap-3">
        <Bell size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Nhận thông báo tiền về qua SePay</p>
          <p className="mt-1 text-xs text-muted-foreground">
            SePay canh tài khoản ngân hàng và báo ngay khi có tiền vào. Khai số tài khoản ở
            đây để MIMI khớp khoản tiền đó với mã QR hoặc hoá đơn đang chờ.
          </p>
          {/* Nói rõ vì người dùng vừa qua luồng Cas đòi OTP và cấp quyền. */}
          <p className="mt-1.5 text-xs text-muted-foreground">
            Không cấp quyền gì cho MIMI ở bước này — chỉ khai số tài khoản để nhận diện.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Số tài khoản
              </span>
              <input
                inputMode="numeric"
                value={soTaiKhoan}
                onChange={(e) => setSoTaiKhoan(e.target.value)}
                placeholder="Nhập số tài khoản"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Ngân hàng
              </span>
              <input
                value={tenNganHang}
                onChange={(e) => setTenNganHang(e.target.value)}
                placeholder="Tên ngân hàng"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              />
            </label>
          </div>

          <label className="mt-3 block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Chủ tài khoản (không bắt buộc)
            </span>
            <input
              value={tenChu}
              onChange={(e) => setTenChu(e.target.value)}
              placeholder="Tên trên tài khoản"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            />
          </label>

          <button
            onClick={() => void gui()}
            disabled={!hopLe || dangGui}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            {dangGui && <Loader2 size={14} className="animate-spin" />}
            Đăng ký nhận thông báo
          </button>
        </div>
      </div>
    </div>
  );
}
