import { useState } from 'react';
import { Loader2, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { goiTroLy } from '@/lib/goiTroLy';
import { HOAN_CANH, type DauHieu, type MaHoanCanh, type MucDo } from '@/lib/batThuong';

/**
 * TCCN-02 — Kiểm tra trước khi chuyển tiền.
 *
 * Dùng được cho BẤT KỲ khoản nào sắp chuyển, kể cả khoản không đi qua MIMI: ai đó gọi điện giục
 * chuyển, nhà cung cấp nhắn tin báo đổi tài khoản. MIMI so với lịch sử chi của công ty và danh
 * sách người nhận được phép (action `kiem_truoc_khi_chuyen` của `tro-ly`), cộng với hoàn cảnh
 * người dùng tự khai.
 *
 * NÓI RÕ MIMI KHÔNG THẤY GÌ. MIMI không tra được tài khoản người nhận có bị báo lừa đảo hay
 * không, và không biết tên chủ tài khoản thật. Không có dấu hiệu KHÔNG có nghĩa là an toàn —
 * câu đó phải hiện ra ngay cả khi kết quả sạch.
 */

interface KetQua {
  muc_do: MucDo | null;
  dau_hieu: DauHieu[];
  lich_su_du: boolean;
  trong_danh_sach_tin_cay: boolean;
  lan_tra_truoc: number;
  lan_cuoi: string | null;
  lon_nhat_da_tra: number | null;
}

const vnd = (n: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(n))} ₫`;
const ngay = (ymd: string) => ymd.slice(0, 10).split('-').reverse().join('/');
const chiSo = (s: string) => s.replace(/\D/g, '');

const O_NHAP = 'w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10';

export default function KiemChuyenTienPage() {
  const [stk, setStk] = useState('');
  const [ten, setTen] = useState('');
  const [soTien, setSoTien] = useState('');
  const [noiDung, setNoiDung] = useState('');
  const [hoanCanh, setHoanCanh] = useState<MaHoanCanh[]>([]);
  const [dangKiem, setDangKiem] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [kq, setKq] = useState<KetQua | null>(null);

  const doiHoanCanh = (m: MaHoanCanh, co: boolean) =>
    setHoanCanh((ds) => (co ? [...ds, m] : ds.filter((x) => x !== m)));

  const kiem = async (e: React.FormEvent) => {
    e.preventDefault();
    const so = Number(chiSo(soTien));
    if (chiSo(stk).length < 6) { setLoi('Số tài khoản cần ít nhất 6 chữ số.'); return; }
    if (!so) { setLoi('Nhập số tiền sắp chuyển.'); return; }
    setLoi(null);
    setKq(null);
    setDangKiem(true);
    try {
      const r = await goiTroLy('kiem_truoc_khi_chuyen', {
        so_tai_khoan: chiSo(stk), ten_nguoi_nhan: ten.trim(), so_tien: so, noi_dung: noiDung.trim(), hoan_canh: hoanCanh,
      });
      setKq(r as unknown as KetQua);
    } catch (e2) {
      setLoi(e2 instanceof Error ? e2.message : 'Chưa kiểm được. Thử lại sau ít phút.');
    } finally {
      setDangKiem(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Kiểm tra trước khi chuyển tiền</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nhập khoản bạn sắp chuyển — kể cả khoản không đi qua MIMI. MIMI so với lịch sử chi 180 ngày của công ty và danh sách người nhận
          được phép. MIMI không chuyển tiền và không lưu thông tin bạn nhập ở đây.
        </p>
      </div>

      <form noValidate onSubmit={kiem} className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-foreground">Số tài khoản người nhận</span>
            <input value={stk} onChange={(e) => setStk(e.target.value)} inputMode="numeric" autoComplete="off" className={O_NHAP} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-foreground">Tên người nhận <span className="font-normal text-muted-foreground">(nếu biết)</span></span>
            <input value={ten} onChange={(e) => setTen(e.target.value)} autoComplete="off" className={O_NHAP} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-foreground">Số tiền (₫)</span>
            <input
              value={soTien}
              onChange={(e) => { const s = chiSo(e.target.value); setSoTien(s ? new Intl.NumberFormat('vi-VN').format(Number(s)) : ''); }}
              inputMode="numeric"
              autoComplete="off"
              className={O_NHAP}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-foreground">Nội dung chuyển khoản <span className="font-normal text-muted-foreground">(nếu có)</span></span>
            <input value={noiDung} onChange={(e) => setNoiDung(e.target.value)} autoComplete="off" className={O_NHAP} />
          </label>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-foreground">Khoản này có rơi vào tình huống nào dưới đây không?</legend>
          <div className="mt-2 space-y-2">
            {(Object.keys(HOAN_CANH) as MaHoanCanh[]).map((m) => (
              <label key={m} className="flex items-start gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={hoanCanh.includes(m)}
                  onChange={(e) => doiHoanCanh(m, e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border"
                />
                <span>{HOAN_CANH[m]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {loi && <p role="alert" className="text-sm text-destructive">{loi}</p>}
        <button
          type="submit"
          disabled={dangKiem}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {dangKiem && <Loader2 size={14} className="animate-spin" />} Kiểm tra
        </button>
      </form>

      {kq && <KetQuaKiem kq={kq} />}
    </div>
  );
}

function KetQuaKiem({ kq }: { kq: KetQua }) {
  const cao = kq.muc_do === 'cao';
  const Icon = cao ? ShieldAlert : kq.muc_do ? ShieldQuestion : ShieldCheck;
  const tieuDe = cao ? 'Dừng lại — chưa nên chuyển' : kq.muc_do ? 'Cần để ý trước khi chuyển' : 'Không thấy dấu hiệu trong dữ liệu của MIMI';

  return (
    <section
      aria-label="Kết quả kiểm tra"
      className={`rounded-2xl border p-5 ${cao ? 'border-destructive/40 bg-destructive/5' : kq.muc_do ? 'border-amber-500/40 bg-amber-500/5' : 'border-border bg-card'}`}
    >
      <p className="flex items-center gap-2 text-base font-semibold text-foreground">
        <Icon size={18} className={cao ? 'text-destructive' : kq.muc_do ? 'text-amber-600' : 'text-mimi-green'} aria-hidden />
        {tieuDe}
      </p>

      {kq.dau_hieu.length > 0 && (
        <ul className="mt-3 space-y-2" aria-label="Dấu hiệu">
          {kq.dau_hieu.map((d) => (
            <li key={d.ma} className="rounded-md border border-border bg-card p-3 text-sm text-foreground">
              <span className={`mr-2 rounded px-1.5 py-0.5 text-xs font-medium ${d.muc_do === 'cao' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground'}`}>
                {d.muc_do === 'cao' ? 'Mức cao' : 'Cần để ý'}
              </span>
              {d.cau}
            </li>
          ))}
        </ul>
      )}

      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
        {kq.trong_danh_sach_tin_cay && <li>Tài khoản này nằm trong danh sách người nhận được phép của công ty.</li>}
        {kq.lan_tra_truoc > 0 ? (
          <li>
            Công ty đã trả tài khoản này {kq.lan_tra_truoc} lần trong 180 ngày{kq.lan_cuoi ? `, lần gần nhất ${ngay(kq.lan_cuoi)}` : ''}
            {kq.lon_nhat_da_tra ? `, lớn nhất ${vnd(kq.lon_nhat_da_tra)}` : ''}.
          </li>
        ) : (
          <li>Công ty chưa từng trả tài khoản này trong 180 ngày qua.</li>
        )}
        {!kq.lich_su_du && <li>MIMI chỉ đọc được một phần lịch sử chi, nên có thể nói "chưa từng trả" với người bạn đã từng trả.</li>}
      </ul>

      {kq.muc_do && (
        <div className="mt-4 rounded-md border border-border bg-card p-3 text-sm text-foreground">
          <p className="font-medium">Việc nên làm</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Gọi lại người yêu cầu qua số điện thoại bạn đã có từ trước — không dùng số trong tin nhắn hay email vừa nhận.</li>
            <li>Không đưa mã OTP, không cài ứng dụng theo hướng dẫn của người lạ.</li>
            <li>Nếu đã lỡ chuyển: gọi ngay tổng đài ngân hàng của bạn để yêu cầu tra soát, và báo cơ quan công an nơi gần nhất.</li>
          </ul>
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        MIMI chỉ thấy lịch sử chi của công ty bạn. MIMI không tra được tài khoản người nhận có bị báo lừa đảo hay không, và không biết tên
        chủ tài khoản thật — không có dấu hiệu không có nghĩa là an toàn.
      </p>
    </section>
  );
}
