import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { idCongTyDangDung, SU_KIEN_DOI_CONG_TY } from '@/lib/congTyDangDung';
import { useSubscriptionStore } from '@/store/useSubscriptionStore';
import { hanMucXuThang } from '../../../supabase/functions/_shared/billing/bang-gia.ts';
import {
  kyThangVN, mucNangLuong, phanTramNangLuong, soDuHienThi, type MucNangLuong,
} from '../../../supabase/functions/_shared/xu/xu.ts';

/**
 * THANH NĂNG LƯỢNG của mèo MIMI (11/10/2026): số dư XU hiển thị thành phần trăm so với hạn mức tháng của gói.
 *
 * Đọc sổ `so_xu` (RLS: thành viên công ty đọc được) — một dòng mới nhất, vì mỗi dòng mang sẵn số dư sau nó.
 * Ít hoạt ảnh: thanh chỉ đổi độ dài, không nhấp nháy. Có `role="meter"` và nhãn cho trình đọc màn hình.
 * Năng lượng thấp thì nói rõ: MIMI vẫn trả lời theo mẫu cố định, và năng lượng nạp lại thế nào.
 *
 * Bảng chưa có (migration chưa áp) hoặc chưa có công ty: KHÔNG hiện gì — không bịa ra một thanh đầy.
 */

type BangTho = { from: (bang: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface DongSoXu {
  id: string;
  thay_doi: number;
  so_du_sau: number;
  ly_do: string;
  ky_thang: string | null;
  chi_tiet: Record<string, unknown> | null;
  tao_luc: string;
}

export interface NangLuong {
  soDu: number;
  hanMuc: number;
  phanTram: number;
  muc: MucNangLuong;
  lichSu: DongSoXu[];
}

/** Nơi nào biết xu vừa đổi (vd. nhận trả lời có trường `xu` từ `tro-ly`) thì phát sự kiện này để thanh đọc lại ngay. */
export const SU_KIEN_XU_DOI = 'mimi:xu-doi';
const CHU_KY_MS = 2 * 60_000;

export function useNangLuong(soDongLichSu = 1): { nangLuong: NangLuong | null; taiLai: () => Promise<void> } {
  const plan = useSubscriptionStore((s) => s.plan);
  const [nangLuong, setNangLuong] = useState<NangLuong | null>(null);

  const taiLai = useCallback(async () => {
    try {
      const id = await idCongTyDangDung();
      if (!id) { setNangLuong(null); return; }
      const ky = kyThangVN();
      const bang = supabase as unknown as BangTho;
      const [moi, nap] = await Promise.all([
        bang.from('so_xu').select('id, thay_doi, so_du_sau, ly_do, ky_thang, chi_tiet, tao_luc')
          .eq('company_id', id).order('thu_tu', { ascending: false }).limit(Math.max(1, soDongLichSu)),
        bang.from('so_xu').select('id').eq('company_id', id).eq('ly_do', 'tang_thang').eq('ky_thang', ky).limit(1),
      ]);
      if (moi.error || nap.error) { setNangLuong(null); return; }
      const ds = (moi.data ?? []) as DongSoXu[];
      const hanMuc = hanMucXuThang(plan);
      const soDu = soDuHienThi(ds[0]?.so_du_sau ?? null, (nap.data ?? []).length > 0, hanMuc);
      const phanTram = phanTramNangLuong(soDu, hanMuc);
      setNangLuong({ soDu, hanMuc, phanTram, muc: mucNangLuong(phanTram, soDu), lichSu: ds });
    } catch {
      setNangLuong(null);
    }
  }, [plan, soDongLichSu]);

  useEffect(() => {
    void taiLai();
    const lai = () => { if (document.visibilityState !== 'hidden') void taiLai(); };
    const hen = window.setInterval(lai, CHU_KY_MS);
    window.addEventListener(SU_KIEN_XU_DOI, lai);
    window.addEventListener(SU_KIEN_DOI_CONG_TY, lai);
    window.addEventListener('focus', lai);
    return () => {
      window.clearInterval(hen);
      window.removeEventListener(SU_KIEN_XU_DOI, lai);
      window.removeEventListener(SU_KIEN_DOI_CONG_TY, lai);
      window.removeEventListener('focus', lai);
    };
  }, [taiLai]);

  return { nangLuong, taiLai };
}

const soVN = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

const MAU: Record<MucNangLuong, string> = {
  day: 'bg-emerald-500',
  vua: 'bg-primary',
  thap: 'bg-amber-500',
  het: 'bg-destructive',
};

/** Câu nói rõ khi năng lượng thấp: chuyện gì xảy ra, và nạp lại bằng cách nào. Không hứa bán xu (chưa bán). */
export function cauNangLuongThap(muc: MucNangLuong): string | null {
  if (muc === 'het') {
    return 'MIMI hết năng lượng: vẫn trả lời theo mẫu cố định và mọi việc thuế vẫn làm được, chỉ chưa dùng mô hình AI. Năng lượng nạp đầy vào ngày 1 hằng tháng; gói tháng có hạn mức lớn hơn.';
  }
  if (muc === 'thap') {
    return 'Năng lượng sắp hết. Hết thì MIMI trả lời theo mẫu cố định cho tới ngày 1 tháng sau; gói tháng có hạn mức lớn hơn.';
  }
  return null;
}

export function moTaNangLuong(n: NangLuong): string {
  return `Năng lượng MIMI ${n.phanTram}%, còn ${soVN(n.soDu)} trên ${soVN(n.hanMuc)} xu tháng này`;
}

/** Thanh nhỏ dưới mèo: một dòng, không đẩy bố cục pet. Năng lượng thấp thì kèm lối "cách nạp" ngay cạnh. */
export function ThanhNangLuongGon() {
  const { nangLuong } = useNangLuong();
  if (!nangLuong) return null;
  const cau = cauNangLuongThap(nangLuong.muc);
  return (
    <div className="flex w-full items-center justify-center gap-1.5" data-mimi-nang-luong={nangLuong.muc}>
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={nangLuong.phanTram}
        aria-label={moTaNangLuong(nangLuong)}
        title={moTaNangLuong(nangLuong)}
        className="h-1.5 w-14 overflow-hidden rounded-full bg-muted ring-1 ring-border"
      >
        <div className={`h-full ${MAU[nangLuong.muc]} transition-[width] duration-500 motion-reduce:transition-none`} style={{ width: `${nangLuong.phanTram}%` }} />
      </div>
      {cau && (
        <Link
          to="/dashboard/settings#nang-luong"
          title={cau}
          aria-label={`${nangLuong.muc === 'het' ? 'Hết năng lượng' : 'Năng lượng thấp'}. ${cau} Mở Cài đặt để xem chi tiết.`}
          className="whitespace-nowrap rounded-full bg-card/90 px-1.5 text-[10px] leading-4 text-foreground shadow-sm ring-1 ring-border hover:underline"
        >
          {nangLuong.muc === 'het' ? 'Hết năng lượng · cách nạp' : 'Sắp hết · cách nạp'}
        </Link>
      )}
    </div>
  );
}

const TEN_LY_DO: Record<string, string> = {
  tang_thang: 'Nạp đầy đầu tháng',
  dung_ai: 'Hỏi MIMI (dùng mô hình AI)',
  mua: 'Mua thêm',
  dieu_chinh: 'Điều chỉnh',
};

/** Khối đầy đủ ở Cài đặt: số xu chính xác, giải thích, lịch sử. */
export function NangLuongChiTiet() {
  const { nangLuong } = useNangLuong(30);
  if (!nangLuong) {
    return <p className="text-sm text-muted-foreground">Chưa đọc được năng lượng của công ty này.</p>;
  }
  const cau = cauNangLuongThap(nangLuong.muc);
  return (
    <div id="nang-luong" className="space-y-4 text-sm">
      <div>
        <div className="flex items-baseline justify-between">
          <span className="font-semibold text-foreground">{soVN(nangLuong.soDu)} xu</span>
          <span className="text-muted-foreground">{nangLuong.phanTram}% của {soVN(nangLuong.hanMuc)} xu/tháng</span>
        </div>
        <div
          role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={nangLuong.phanTram}
          aria-label={moTaNangLuong(nangLuong)}
          className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted"
        >
          <div className={`h-full ${MAU[nangLuong.muc]} transition-[width] duration-500 motion-reduce:transition-none`} style={{ width: `${nangLuong.phanTram}%` }} />
        </div>
      </div>
      {cau && <p role="note" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-foreground">{cau}</p>}
      <p className="text-muted-foreground">
        Mỗi câu hỏi MIMI trả lời bằng mô hình AI tốn xu theo chi phí thật của câu đó; câu trả lời theo mẫu cố định không tốn xu.
        Xu chỉ dùng trong MIMI — không đổi ra tiền, không chuyển cho người khác.
      </p>
      {nangLuong.lichSu.length > 0 && (
        <div>
          <h4 className="mb-1 font-semibold text-foreground">Lịch sử gần đây</h4>
          <ul className="divide-y divide-border/50">
            {nangLuong.lichSu.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-1.5">
                <span className="min-w-0 truncate">
                  {TEN_LY_DO[d.ly_do] ?? d.ly_do}
                  <span className="ml-2 text-xs text-muted-foreground">{new Date(d.tao_luc).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</span>
                </span>
                <span className={`shrink-0 tabular-nums ${d.thay_doi < 0 ? 'text-foreground' : 'text-emerald-600'}`}>
                  {d.thay_doi > 0 ? '+' : ''}{soVN(d.thay_doi)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
