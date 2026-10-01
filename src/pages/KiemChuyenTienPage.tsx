import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { goiTroLy } from '@/lib/goiTroLy';
import i18n from 'i18next';
import { useTranslation } from 'react-i18next';
import { track } from '@/lib/track';
import { HOAN_CANH, type DauHieu, type MaHoanCanh, type MucDo } from '@/lib/batThuong';
import { dinhDangTien } from '@/lib/tien';

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

/**
 * Việc cần làm theo TỪNG dấu hiệu (28/09/2026). Lời khuyên chung ("gọi lại người yêu cầu") vẫn giữ; đây là
 * bước cụ thể cho đúng khuôn mẫu bộ luật vừa thấy. Chỉ là hướng dẫn — MIMI không tự làm việc nào thay bạn.
 */
// Số bước theo từng dấu hiệu; chữ ở bộ dịch app.kiemChuyen.viec.<mã>.<chỉ số>.
const VIEC_THEO_DAU_HIEU: Partial<Record<DauHieu['ma'], number>> = {
  doi_so_tai_khoan: 3,
  nguoi_nhan_moi_so_lon: 2,
  vuot_muc_quen: 1,
  tach_nho: 1,
};

interface KetQua {
  muc_do: MucDo | null;
  dau_hieu: DauHieu[];
  lich_su_du: boolean;
  trong_danh_sach_tin_cay: boolean;
  lan_tra_truoc: number;
  lan_cuoi: string | null;
  lon_nhat_da_tra: number | null;
}

const vnd = dinhDangTien;
const ngay = (ymd: string) => ymd.slice(0, 10).split('-').reverse().join('/');
const chiSo = (s: string) => s.replace(/\D/g, '');

const O_NHAP = 'w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10';

/**
 * Điền sẵn từ ô "Sắp chuyển tiền?" ở Tổng quan. Đi qua STATE của điều hướng, không qua địa chỉ: số tài khoản
 * không được nằm trong URL, lịch sử trình duyệt hay log máy chủ.
 */
export interface DienSanKiem { stk?: string; ten?: string; soTien?: string; tuDong?: boolean }

export default function KiemChuyenTienPage() {
  const { t } = useTranslation();
  const viTri = useLocation();
  const navigate = useNavigate();
  const dienSan = (viTri.state as { kiem?: DienSanKiem } | null)?.kiem ?? null;
  const [stk, setStk] = useState(dienSan?.stk ?? '');
  const [ten, setTen] = useState(dienSan?.ten ?? '');
  const [soTien, setSoTien] = useState(() => { const s = chiSo(dienSan?.soTien ?? ''); return s ? new Intl.NumberFormat('vi-VN').format(Number(s)) : ''; });
  const [noiDung, setNoiDung] = useState('');
  const [hoanCanh, setHoanCanh] = useState<MaHoanCanh[]>([]);
  const [dangKiem, setDangKiem] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [kq, setKq] = useState<KetQua | null>(null);

  const doiHoanCanh = (m: MaHoanCanh, co: boolean) =>
    setHoanCanh((ds) => (co ? [...ds, m] : ds.filter((x) => x !== m)));

  const kiem = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const so = Number(chiSo(soTien));
    if (chiSo(stk).length < 6) { setLoi(t('app.kiemChuyen.loiStk')); return; }
    if (!so) { setLoi(t('app.kiemChuyen.loiTien')); return; }
    setLoi(null);
    setKq(null);
    setDangKiem(true);
    try {
      const r = await goiTroLy('kiem_truoc_khi_chuyen', {
        so_tai_khoan: chiSo(stk), ten_nguoi_nhan: ten.trim(), so_tien: so, noi_dung: noiDung.trim(), hoan_canh: hoanCanh,
      });
      setKq(r as unknown as KetQua);
      track('payment_check_run', { muc_do: String((r as { muc_do?: unknown }).muc_do ?? 'khong'), tu: dienSan?.tuDong ? 'kiem_nhanh' : 'trang' });
    } catch (e2) {
      setLoi(e2 instanceof Error ? e2.message : t('app.kiemChuyen.loiKiem'));
    } finally {
      setDangKiem(false);
    }
  };

  // Đến từ ô kiểm nhanh: kiểm ngay một lần (việc chỉ đọc), rồi xoá state để tải lại trang không kiểm lặp
  // và số tài khoản không còn nằm trong lịch sử điều hướng.
  const daTuKiem = useRef(false);
  useEffect(() => {
    if (!dienSan?.tuDong || daTuKiem.current) return;
    daTuKiem.current = true;
    navigate(viTri.pathname, { replace: true, state: null });
    void kiem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('app.kiemChuyen.tieuDe')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('app.kiemChuyen.moTa')}
        </p>
      </div>

      <form noValidate onSubmit={kiem} className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-foreground">{t('app.kiemChuyen.stk')}</span>
            <input value={stk} onChange={(e) => setStk(e.target.value)} inputMode="numeric" autoComplete="off" className={O_NHAP} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-foreground">{t('app.kiemChuyen.ten')} <span className="font-normal text-muted-foreground">{t('app.kiemChuyen.nuBiet')}</span></span>
            <input value={ten} onChange={(e) => setTen(e.target.value)} autoComplete="off" className={O_NHAP} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-foreground">{t('app.kiemChuyen.soTien')}</span>
            <input
              value={soTien}
              onChange={(e) => { const s = chiSo(e.target.value); setSoTien(s ? new Intl.NumberFormat('vi-VN').format(Number(s)) : ''); }}
              inputMode="numeric"
              autoComplete="off"
              className={O_NHAP}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-foreground">{t('app.kiemChuyen.noiDung')} <span className="font-normal text-muted-foreground">{t('app.kiemChuyen.nuCo')}</span></span>
            <input value={noiDung} onChange={(e) => setNoiDung(e.target.value)} autoComplete="off" className={O_NHAP} />
          </label>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-foreground">{t('app.kiemChuyen.tinhHuong')}</legend>
          <div className="mt-2 space-y-2">
            {(Object.keys(HOAN_CANH) as MaHoanCanh[]).map((m) => (
              <label key={m} className="flex items-start gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={hoanCanh.includes(m)}
                  onChange={(e) => doiHoanCanh(m, e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border"
                />
                <span>{t(`app.kiemChuyen.hoanCanh.${m}`)}</span>
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
          {dangKiem && <Loader2 size={14} className="animate-spin" />} {t('app.kiemChuyen.kiem')}
        </button>
      </form>

      {kq && <KetQuaKiem kq={kq} />}
    </div>
  );
}

function KetQuaKiem({ kq }: { kq: KetQua }) {
  const { t } = useTranslation();
  const cao = kq.muc_do === 'cao';
  const Icon = cao ? ShieldAlert : kq.muc_do ? ShieldQuestion : ShieldCheck;
  const tieuDe = cao ? t('app.kiemChuyen.dung') : kq.muc_do ? t('app.kiemChuyen.canYTruoc') : t('app.kiemChuyen.khongThay');

  return (
    <section
      aria-label={t('app.kiemChuyen.ketQua')}
      className={`rounded-2xl border p-5 ${cao ? 'border-destructive/40 bg-destructive/5' : kq.muc_do ? 'border-amber-500/40 bg-amber-500/5' : 'border-border bg-card'}`}
    >
      <p className="flex items-center gap-2 text-base font-semibold text-foreground">
        <Icon size={18} className={cao ? 'text-destructive' : kq.muc_do ? 'text-amber-600' : 'text-mimi-green'} aria-hidden />
        {tieuDe}
      </p>

      {kq.dau_hieu.length > 0 && (
        <ul className="mt-3 space-y-2" aria-label={t('app.kiemChuyen.dauHieu')}>
          {kq.dau_hieu.map((d) => (
            <li key={d.ma} className="rounded-md border border-border bg-card p-3 text-sm text-foreground">
              <span className={`mr-2 rounded px-1.5 py-0.5 text-xs font-medium ${d.muc_do === 'cao' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground'}`}>
                {d.muc_do === 'cao' ? t('app.kiemChuyen.mucCao') : t('app.kiemChuyen.canY')}
              </span>
              {d.cau}
            </li>
          ))}
        </ul>
      )}

      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
        {kq.trong_danh_sach_tin_cay && <li>{t('app.kiemChuyen.trongDs')}</li>}
        {kq.lan_tra_truoc > 0 ? (
          <li>
            {t('app.kiemChuyen.daTra', { n: kq.lan_tra_truoc })}{kq.lan_cuoi ? t('app.kiemChuyen.lanCuoi', { ngay: ngay(kq.lan_cuoi) }) : ''}
            {kq.lon_nhat_da_tra ? t('app.kiemChuyen.lonNhat', { tien: vnd(kq.lon_nhat_da_tra) }) : ''}.
          </li>
        ) : (
          <li>{t('app.kiemChuyen.chuaTra')}</li>
        )}
        {!kq.lich_su_du && <li>{t('app.kiemChuyen.motPhan')}</li>}
      </ul>

      {kq.muc_do && (
        <div className="mt-4 rounded-md border border-border bg-card p-3 text-sm text-foreground">
          <p className="font-medium">{t('app.kiemChuyen.viecNen')}</p>
          <ul className="mt-1 list-disc space-y-1 pl-5" aria-label={t('app.kiemChuyen.viecNen')}>
            {[...new Set(kq.dau_hieu.flatMap((d) => Array.from({ length: VIEC_THEO_DAU_HIEU[d.ma] ?? 0 }, (_, i) => `app.kiemChuyen.viec.${d.ma}.${i}`)))].map((k) => <li key={k}>{t(k)}</li>)}
            <li>{t('app.kiemChuyen.goiLai')}</li>
            <li>{t('app.kiemChuyen.khongOtp')}</li>
            <li>{t('app.kiemChuyen.daLoChuyen')}</li>
          </ul>
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        {t('app.kiemChuyen.gioiHan')}
      </p>
    </section>
  );
}
