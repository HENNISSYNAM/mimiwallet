import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FileSpreadsheet, Folder, Lock, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * "Những hệ thống chưa từng nói chuyện với nhau" — vấn đề trước khi có MIMI.
 *
 * Một bức ghép các mảnh rời rạc mà một khoản chi ở doanh nghiệp nhỏ Việt Nam
 * thường phải đi qua: tin nhắn nhóm, file Excel theo dõi, hoá đơn giấy, mã OTP
 * ngân hàng, hộp thư, cổng tra cứu hoá đơn. Mọi mảnh đều vẽ bằng HTML, không
 * dùng logo hay giao diện thật của sản phẩm nào — đây là minh hoạ một tình trạng,
 * không phải ảnh chụp của ai.
 *
 * Bức ghép dựng trên khung cố định 1100×680 rồi thu nhỏ theo bề rộng thật, để bố
 * cục giữ nguyên trên điện thoại thay vì vỡ thành một cột thẻ rời.
 */

const RONG = 1100;
const CAO = 680;

function The({ trai, tren, rong, xoay = 0, children }: { trai: number; tren: number; rong: number; xoay?: number; children: ReactNode }) {
  return (
    <div
      className="absolute rounded-lg border border-border bg-card text-left shadow-[0_14px_40px_-20px_rgba(15,23,42,0.45)]"
      style={{ left: trai, top: tren, width: rong, transform: `rotate(${xoay}deg)` }}
    >
      {children}
    </div>
  );
}

function BongChat({ trai, tren, ten, loi }: { trai: number; tren: number; ten: string; loi: string }) {
  return (
    <div
      className="absolute flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.45)]"
      style={{ left: trai, top: tren, maxWidth: 260 }}
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
        {ten.charAt(0)}
      </span>
      <span>
        <span className="block text-[11px] text-muted-foreground">{ten}</span>
        <span className="block text-[13px] font-semibold leading-snug text-foreground">{loi}</span>
      </span>
    </div>
  );
}

function ThuMuc({ trai, tren, nhan }: { trai: number; tren: number; nhan: string }) {
  return (
    <div className="absolute flex w-36 flex-col items-center gap-1 text-center" style={{ left: trai, top: tren }}>
      <Folder size={44} className="fill-primary/25 text-primary" strokeWidth={1.2} />
      <span className="text-[12px] leading-tight text-muted-foreground">{nhan}</span>
    </div>
  );
}

const DUONG_NOI = [
  'M 330 150 C 380 210, 330 260, 250 300',
  'M 470 70 C 530 50, 560 70, 600 100',
  'M 850 140 C 890 170, 910 150, 900 110',
  'M 480 430 C 520 410, 540 395, 560 380',
  'M 660 380 C 660 360, 650 350, 640 345',
  'M 780 300 C 790 250, 760 220, 740 200',
  'M 960 420 C 1000 360, 1010 280, 990 200',
  'M 390 610 C 340 570, 300 540, 280 500',
  'M 800 600 C 780 550, 790 520, 790 480',
];

export default function HeThongRoiRac() {
  const { t } = useTranslation();
  const ngoai = useRef<HTMLDivElement>(null);
  const [tiLe, setTiLe] = useState(1);

  useEffect(() => {
    const el = ngoai.current;
    if (!el) return;
    const tinh = () => setTiLe(Math.min(1, el.clientWidth / RONG));
    tinh();
    const ro = new ResizeObserver(tinh);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <section className="py-24 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif font-normal text-foreground text-balance leading-[1.05] tracking-[-0.015em] text-[clamp(2rem,4.2vw,3.25rem)]">
            {t('app.heThongRoiRac.tieuDe')}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t('app.heThongRoiRac.moTa')}
          </p>
        </div>

        <div ref={ngoai} className="relative mx-auto mt-12 w-full max-w-[1100px]" style={{ height: CAO * tiLe }} aria-hidden>
          <div className="absolute left-0 top-0 origin-top-left" style={{ width: RONG, height: CAO, transform: `scale(${tiLe})` }}>
            <svg className="absolute inset-0 text-muted-foreground/60" width={RONG} height={CAO} fill="none" stroke="currentColor" strokeWidth={1.25}>
              {DUONG_NOI.map((d) => <path key={d} d={d} className="mimi-luong" />)}
            </svg>

            {/* Tin nhắn nhóm */}
            <The trai={40} tren={30} rong={290}>
              <div className="border-b border-border px-3 py-2 text-[12px] font-semibold text-foreground">{t('app.heThongRoiRac.nhom')}</div>
              <div className="grid gap-2 p-3 text-[12px]">
                <p className="max-w-[85%] rounded-md bg-muted px-2.5 py-1.5 text-foreground">{t('app.heThongRoiRac.c1')}</p>
                <p className="ml-auto max-w-[85%] rounded-md bg-primary/10 px-2.5 py-1.5 text-foreground">{t('app.heThongRoiRac.c2')}</p>
                <p className="max-w-[85%] rounded-md bg-muted px-2.5 py-1.5 text-foreground">{t('app.heThongRoiRac.c3')}</p>
              </div>
            </The>

            {/* Hoá đơn giấy */}
            <The trai={370} tren={10} rong={160} xoay={-4}>
              <div className="p-3 font-mono text-[9px] leading-relaxed text-foreground/80">
                <p className="text-center text-[11px] font-bold">{t('app.heThongRoiRac.hdBanLe')}</p>
                <p className="text-center">{t('app.heThongRoiRac.cuaHang')}</p>
                <div className="my-2 border-t border-dashed border-border" />
                <p className="flex justify-between"><span>{t('app.heThongRoiRac.giay')}</span><span>325.000</span></p>
                <p className="flex justify-between"><span>{t('app.heThongRoiRac.muc')}</span><span>480.000</span></p>
                <div className="my-2 border-t border-dashed border-border" />
                <p className="flex justify-between font-bold"><span>{t('app.heThongRoiRac.tong')}</span><span>805.000</span></p>
                <p className="mt-2 text-center text-muted-foreground">{t('app.heThongRoiRac.uot')}</p>
              </div>
            </The>

            {/* OTP ngân hàng */}
            <The trai={600} tren={60} rong={250}>
              <div className="p-4">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground"><Lock size={13} /> {t('app.heThongRoiRac.otp')}</p>
                <div className="mt-3 flex gap-1.5">
                  {[4, 8, 1, 0, '', ''].map((s, i) => (
                    <span key={i} className="grid h-8 w-8 place-items-center rounded-md border border-destructive/50 font-mono text-sm text-foreground">{s}</span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-destructive">{t('app.heThongRoiRac.otpHet')}</p>
              </div>
            </The>

            {/* Hộp thư */}
            <The trai={880} tren={20} rong={190}>
              <div className="p-3">
                <p className="flex items-center justify-between text-[12px] font-semibold text-foreground">
                  <span className="flex items-center gap-1.5"><Mail size={13} /> {t('app.heThongRoiRac.hopThu')}</span>
                  <span className="rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white">1.284</span>
                </p>
                <p className="mt-2 text-[11px] text-foreground">{t('app.heThongRoiRac.mail1')}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{t('app.heThongRoiRac.mail2')}</p>
              </div>
            </The>

            {/* Excel theo dõi chi */}
            <The trai={50} tren={300} rong={430} xoay={-1}>
              <div className="flex items-center gap-1.5 rounded-t-lg bg-emerald-700 px-3 py-1.5 text-[11px] font-semibold text-white">
                <FileSpreadsheet size={12} /> Theo_doi_chi_T9_ban_cuoi_v3.xlsx
              </div>
              <table className="w-full font-mono text-[10px] text-foreground">
                <thead>
                  <tr className="bg-muted text-muted-foreground">
                    {[0, 1, 2, 3, 4].map((h) => <th key={h} className="border border-border px-1.5 py-1 text-left font-medium">{t(`app.heThongRoiRac.cot.${h}`)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2, 3, 4].map((ri) => {
                    const r = [0, 1, 2, 3, 4].map((ci) => t(`app.heThongRoiRac.dong.${ri}.${ci}`));
                    return (
                    <tr key={ri}>
                      {r.map((c, i) => <td key={i} className={`border border-border px-1.5 py-1 ${c.includes('?') ? 'bg-amber-500/15' : ''}`}>{c}</td>)}
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </The>

            <ThuMuc trai={520} tren={330} nhan={t('app.heThongRoiRac.thuMuc')} />

            {/* Cổng tra cứu hoá đơn */}
            <The trai={640} tren={300} rong={270}>
              <div className="p-4 text-[12px]">
                <p className="font-semibold text-foreground">{t('app.heThongRoiRac.traCuu')}</p>
                <div className="mt-3 grid gap-2">
                  <span className="rounded-md border border-border px-2 py-1.5 text-muted-foreground">{t('app.heThongRoiRac.mst')}</span>
                  <span className="rounded-md border border-border px-2 py-1.5 text-muted-foreground">{t('app.heThongRoiRac.maTra')}</span>
                  <span className="flex items-center justify-between rounded-md border border-border px-2 py-1.5 text-muted-foreground">
                    {t('app.heThongRoiRac.maXn')} <span className="font-mono tracking-[0.3em] text-foreground line-through">x7Qk</span>
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-destructive">{t('app.heThongRoiRac.khongTim')}</p>
              </div>
            </The>

            <BongChat trai={900} tren={430} ten={t('app.heThongRoiRac.chiLan')} loi={t('app.heThongRoiRac.chiLanLoi')} />
            <ThuMuc trai={330} tren={570} nhan="Uy_nhiem_chi_scan.pdf" />
            <BongChat trai={660} tren={590} ten={t('app.heThongRoiRac.minh')} loi={t('app.heThongRoiRac.minhLoi')} />
          </div>
        </div>

        <p className="mx-auto mt-10 max-w-xl text-center text-muted-foreground">
          {t('app.heThongRoiRac.cuoi')}
        </p>
      </div>
    </section>
  );
}
