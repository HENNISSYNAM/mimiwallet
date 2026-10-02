import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { NhapSaoKe } from '@/components/sao-ke/NhapSaoKe';
import { ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { goiTroLy } from '@/lib/goiTroLy';
import type { KetNoiHienThi } from '@/lib/troLy';
import { DauKetNoi } from '@/components/tro-ly/DauKetNoi';

/**
 * Kết nối — như "Plugins" của ChatGPT: nối các công cụ công ty đang dùng để MIMI đọc số liệu
 * thật (15/09/2026). Trạng thái lấy từ `boi_canh` của edge function `tro-ly` — cùng nguồn
 * với hàng kết nối ở MIMI Assistant, nên hai nơi không nói khác nhau. Bấm vào mở đúng trang
 * cài đặt kết nối đã có (Kết nối ngân hàng & thuế, Chi phí AI).
 */

const MO_TA: Record<string, string> = {
  ngan_hang: 'Đọc sao kê để MIMI biết tiền đã vào, ra ở đâu — nền của mọi báo cáo và đối soát.',
  casso: 'Nhận tiền bằng mã QR VietQR; tiền về thì hoá đơn tương ứng tự khớp.',
  tong_cuc_thue: 'Lấy hoá đơn điện tử đầu vào, đầu ra từ cổng thuế vào Thư viện chứng từ.',
  openai: 'Chi phí và số token OpenAI, để so với ngân sách AI.',
  anthropic: 'Chi phí và số token Claude, để so với ngân sách AI.',
  gemini: 'Chi phí Gemini qua file xuất từ Google Cloud.',
  openrouter: 'Chi phí và token khi gọi model qua OpenRouter; kèm bảng giá để tìm model rẻ hơn.',
};

const NHOM: { loai: KetNoiHienThi['loai']; ten: string }[] = [
  { loai: 'ngan_hang', ten: 'Ngân hàng & thanh toán' },
  { loai: 'thue', ten: 'Thuế' },
  { loai: 'ai', ten: 'Nhà cung cấp AI' },
];

const TRANG_THAI: Record<KetNoiHienThi['trang_thai'], { nhan: string; lop: string }> = {
  dang_chay: { nhan: 'Đang chạy', lop: 'bg-mimi-green/10 text-mimi-green' },
  can_xu_ly: { nhan: 'Cần xử lý', lop: 'bg-mimi-amber/15 text-mimi-amber' },
  chua_ket_noi: { nhan: 'Chưa kết nối', lop: 'bg-accent text-muted-foreground' },
  chi_nhap_file: { nhan: 'Nhập file', lop: 'bg-primary/10 text-primary' },
};

export default function KetNoiPage() {
  const [ds, setDs] = useState<KetNoiHienThi[] | null>(null);
  const [loi, setLoi] = useState<string | null>(null);

  const tai = useCallback(async () => {
    try {
      const kq = await goiTroLy('boi_canh');
      setDs((kq.ket_noi ?? []) as KetNoiHienThi[]);
      setLoi(null);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Chưa đọc được trạng thái kết nối.');
    }
  }, []);

  useEffect(() => { void tai(); }, [tai]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Kết nối</h1>
        <p className="mt-1 text-sm text-muted-foreground">Nối các công cụ công ty đang dùng để MIMI đọc số liệu thật. MIMI không chuyển tiền của bạn.</p>
      </header>

      {/* Đường vào dữ liệu không cần liên kết ngân hàng — đứng đầu vì đa số người mới bắt đầu từ đây. */}
      <NhapSaoKe />

      {loi && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <span>{loi}</span>
          <button type="button" onClick={() => void tai()} className="inline-flex items-center gap-1 font-medium underline underline-offset-4"><RefreshCw size={14} /> Thử lại</button>
        </div>
      )}
      {!ds && !loi && <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground" role="status"><Loader2 size={15} className="animate-spin" /> Đang đọc kết nối…</p>}

      {ds && NHOM.map((n) => {
        const cua = ds.filter((k) => k.loai === n.loai);
        if (!cua.length) return null;
        return (
          <section key={n.loai} aria-labelledby={`nhom-${n.loai}`}>
            <h2 id={`nhom-${n.loai}`} className="mb-3 text-sm font-semibold text-foreground">{n.ten}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cua.map((k) => {
                const tt = TRANG_THAI[k.trang_thai];
                return (
                  <li key={k.khoa} className="flex flex-col rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-start gap-3">
                      <DauKetNoi khoa={k.khoa} lon />
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold text-foreground">{k.ten}</p>
                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tt.lop}`}>{tt.nhan}</span>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{MO_TA[k.khoa] ?? ''}</p>
                    <p className="mt-1 text-sm text-foreground">{k.cau}</p>
                    <Link
                      to={k.duong_dan}
                      className={`mt-auto inline-flex h-11 items-center justify-center gap-1.5 rounded-lg pt-0 text-sm font-medium ${
                        k.trang_thai === 'chua_ket_noi' ? 'mt-4 bg-primary text-primary-foreground hover:brightness-110' : 'mt-4 border border-border text-foreground hover:bg-accent'
                      }`}
                    >
                      {k.trang_thai === 'chua_ket_noi' ? 'Kết nối' : k.trang_thai === 'can_xu_ly' ? 'Xử lý' : 'Quản lý'} <ArrowRight size={14} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
