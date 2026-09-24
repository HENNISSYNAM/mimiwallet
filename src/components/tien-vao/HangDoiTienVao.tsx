import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { goiToKhai } from '@/lib/goiToKhai';
import {
  LOAI_KHONG_PHAI_DOANH_THU, TEN_PHAN_LOAI,
  type BangTienVao, type DongTienVao, type LoaiPhanLoai, type NhomGoiY,
} from '../../../supabase/functions/_shared/doanh-thu/phan-loai.ts';

/**
 * Hàng đợi tiền vào — nằm ngay trên Tổng quan, không phải một trang riêng.
 *
 * Bản chỉ đạo ra mắt: giá trị đầu tiên là "MIMI tìm ra điều bạn chưa biết". Nên màn đầu nói
 * "Đã đọc N khoản tiền vào · K khoản cần bạn xem", và bấm là xem ngay — không đi trang khác.
 *
 * GỌN (phản biện P-3): mỗi khoản 4 nút — gợi ý của MIMI đứng làm nút chính; "Không phải tiền bán
 * hàng" bấm mới hiện các loại. Nhóm khoản giống nhau áp một lần. Mỗi lần xác nhận có nút Hoàn tác.
 * Xác nhận miễn phí.
 */

const so = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n));
const ngay = (ymd: string) => ymd.split('-').reverse().join('/');

export function HangDoiTienVao() {
  const [bang, setBang] = useState<BangTienVao | null>(null);
  const [mo, setMo] = useState(false);
  const [dang, setDang] = useState<string | null>(null);
  const [moLoai, setMoLoai] = useState<string | null>(null);

  const tai = useCallback(async () => {
    try {
      setBang(await goiToKhai('tien_vao', { nam: new Date().getFullYear() }) as unknown as BangTienVao);
    } catch {
      setBang(null);
    }
  }, []);

  useEffect(() => { void tai(); }, [tai]);

  const xacNhan = async (khoa: string, ids: string[], loai: LoaiPhanLoai) => {
    setDang(khoa);
    setMoLoai(null);
    try {
      const r = await goiToKhai('xac_nhan_tien_vao', { transaction_ids: ids, loai });
      const nhom = typeof r.bulk_group_id === 'string' ? r.bulk_group_id : null;
      toast.success(`${ids.length > 1 ? `${ids.length} khoản: ` : ''}${TEN_PHAN_LOAI[loai]}`, {
        action: {
          label: 'Hoàn tác',
          onClick: () => void goiToKhai('hoan_tac_tien_vao', nhom ? { bulk_group_id: nhom } : { transaction_id: ids[0] }).then(tai),
        },
      });
      await tai();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chưa ghi được.');
    } finally {
      setDang(null);
    }
  };

  if (!bang) return null;
  if (!bang.so_giao_dich) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
        Chưa có giao dịch để MIMI kiểm tra. <Link to="/dashboard/ket-noi" className="font-medium text-primary hover:underline">Tải sao kê lên</Link> hoặc kết nối ngân hàng để bắt đầu.
      </section>
    );
  }

  const canXem = bang.dong.filter((d) => !d.noi_bo && d.goi_y && !d.xac_nhan);

  const nut = (khoa: string, ids: string[], goiY: LoaiPhanLoai | null) => (
    <div className="flex flex-wrap items-center gap-1.5">
      {dang === khoa && <Loader2 size={15} className="animate-spin text-muted-foreground" />}
      {goiY && goiY !== 'business_revenue' && (
        <button type="button" disabled={dang !== null} onClick={() => void xacNhan(khoa, ids, goiY)}
          className="h-8 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:brightness-110 disabled:opacity-40">
          Đúng, là {TEN_PHAN_LOAI[goiY].toLowerCase()}
        </button>
      )}
      <button type="button" disabled={dang !== null} onClick={() => void xacNhan(khoa, ids, 'business_revenue')}
        className={`h-8 rounded-lg px-3 text-xs font-medium disabled:opacity-40 ${goiY && goiY !== 'business_revenue' ? 'border border-border text-foreground hover:bg-accent' : 'bg-primary text-primary-foreground hover:brightness-110'}`}>
        Tiền bán hàng
      </button>
      <button type="button" disabled={dang !== null} onClick={() => void xacNhan(khoa, ids, 'internal_transfer')}
        className="h-8 rounded-lg border border-border px-3 text-xs text-foreground hover:bg-accent disabled:opacity-40">
        Chuyển giữa tài khoản của tôi
      </button>
      <div className="relative">
        <button type="button" disabled={dang !== null} onClick={() => setMoLoai(moLoai === khoa ? null : khoa)} aria-expanded={moLoai === khoa}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-3 text-xs text-foreground hover:bg-accent disabled:opacity-40">
          Không phải tiền bán hàng <ChevronDown size={12} />
        </button>
        {moLoai === khoa && (
          <div className="absolute left-0 top-9 z-20 w-56 rounded-xl border border-border bg-popover p-1 shadow-lg">
            {LOAI_KHONG_PHAI_DOANH_THU.filter((l) => l !== 'other').map((l) => (
              <button key={l} type="button" onClick={() => void xacNhan(khoa, ids, l)} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-foreground hover:bg-accent">
                {TEN_PHAN_LOAI[l]}
              </button>
            ))}
          </div>
        )}
      </div>
      <button type="button" disabled={dang !== null} onClick={() => void xacNhan(khoa, ids, 'unknown')}
        className="h-8 rounded-lg px-2 text-xs text-muted-foreground hover:bg-accent disabled:opacity-40">
        Tôi chưa chắc
      </button>
    </div>
  );

  const dongNhom = (g: NhomGoiY) => (
    <li key={g.khoa} className="space-y-2 p-3">
      <p className="text-sm text-foreground"><span className="font-medium">{g.mo_ta}</span> · {so(g.tong)}đ</p>
      <p className="text-xs text-muted-foreground">Áp dụng cùng một cách cho cả {g.so} khoản — hoàn tác được.</p>
      {nut(`nhom:${g.khoa}`, g.transaction_ids, g.goi_y)}
    </li>
  );

  const dongKhoan = (d: DongTienVao) => (
    <li key={d.id} className="space-y-2 p-3">
      <p className="text-sm text-foreground"><span className="font-medium tabular-nums">{so(d.so_tien)}đ</span> <span className="text-muted-foreground">· {ngay(d.ngay)}</span></p>
      <p className="break-words font-mono text-xs text-muted-foreground">{d.noi_dung}</p>
      {d.goi_y && <p className="text-xs text-mimi-amber">Trông giống {TEN_PHAN_LOAI[d.goi_y.loai].toLowerCase()}: {d.goi_y.ly_do}</p>}
      {nut(d.id, [d.id], d.goi_y?.loai ?? null)}
    </li>
  );

  return (
    <section aria-labelledby="tien-vao" className="rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div>
          <h2 id="tien-vao" className="text-base font-semibold text-foreground">Tiền vào năm {bang.nam}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Đã đọc {so(bang.so_giao_dich)} khoản tiền vào · {so(bang.tong_vao)}đ.
            {' '}Bạn đã xác nhận {so(bang.doanh_thu_da_xac_nhan)}đ là tiền bán hàng, {so(bang.khong_phai_doanh_thu)}đ không phải.
            {' '}<span className="text-foreground">{so(bang.chua_ro)}đ chưa ai xác nhận</span> — MIMI đang tạm tính là doanh thu.
          </p>
        </div>
        {(canXem.length > 0 || bang.nhom.length > 0) && (
          <button type="button" onClick={() => setMo(!mo)} aria-expanded={mo}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:brightness-110">
            <Sparkles size={15} /> {mo ? 'Thu gọn' : `Xem ${canXem.length || bang.nhom.length} ${canXem.length ? 'khoản cần xem' : 'nhóm'}`}
          </button>
        )}
      </div>
      {canXem.length === 0 && bang.nhom.length === 0 && (
        <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">Hiện MIMI chưa thấy khoản tiền vào nào đáng ngờ trong dữ liệu đã kết nối.</p>
      )}
      {mo && (
        <ul className="divide-y divide-border border-t border-border">
          {canXem.slice(0, 20).map(dongKhoan)}
          {bang.nhom.slice(0, 10).map(dongNhom)}
        </ul>
      )}
    </section>
  );
}
