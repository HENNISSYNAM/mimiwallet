import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import type { DienSanKiem } from '@/pages/KiemChuyenTienPage';

/**
 * "Sắp chuyển tiền?" — lối vào chính của MIMI ngay trên Tổng quan (28/09/2026).
 *
 * Trọng tâm sản phẩm là kiểm một khoản TRƯỚC khi tiền rời tài khoản. Trước đây việc đó nằm sau một trang
 * riêng trong danh sách công cụ; giờ ba ô ở đầu Tổng quan. Bấm Kiểm → trang Kiểm trước khi chuyển nhận dữ
 * liệu qua state điều hướng (KHÔNG qua URL) và tự kiểm một lần. MIMI không chuyển tiền.
 */
const O = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10';
const chiSo = (s: string) => s.replace(/\D/g, '');

export function KiemNhanh() {
  const navigate = useNavigate();
  const [stk, setStk] = useState('');
  const [ten, setTen] = useState('');
  const [soTien, setSoTien] = useState('');

  const kiem = (e: React.FormEvent) => {
    e.preventDefault();
    const kiemData: DienSanKiem = { stk: chiSo(stk), ten: ten.trim(), soTien: chiSo(soTien), tuDong: true };
    navigate('/dashboard/kiem-truoc-khi-chuyen', { state: { kiem: kiemData } });
  };

  return (
    <form onSubmit={kiem} aria-label="Kiểm nhanh một khoản sắp chuyển" className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} className="text-primary" />
        <p className="font-display font-semibold text-foreground">Sắp chuyển tiền?</p>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        MIMI so với lịch sử trả tiền của công ty: đổi số tài khoản, người nhận lạ, số tiền bất thường. MIMI không chuyển tiền.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1.2fr_1.2fr_1fr_auto]">
        <input aria-label="Số tài khoản người nhận" value={stk} onChange={(e) => setStk(e.target.value)} inputMode="numeric" autoComplete="off" placeholder="Số tài khoản" className={O} />
        <input aria-label="Tên người nhận" value={ten} onChange={(e) => setTen(e.target.value)} autoComplete="off" placeholder="Tên người nhận" className={O} />
        <input
          aria-label="Số tiền sắp chuyển"
          value={soTien}
          onChange={(e) => { const s = chiSo(e.target.value); setSoTien(s ? new Intl.NumberFormat('vi-VN').format(Number(s)) : ''); }}
          inputMode="numeric"
          autoComplete="off"
          placeholder="Số tiền (₫)"
          className={O}
        />
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Kiểm</button>
      </div>
    </form>
  );
}
