import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { ArrowRight, Check, FileSearch, Loader2, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import MimiCat from '@/components/brand/MimiCat';
import { useAuthStore } from '@/store/useAuthStore';
import { DEMO_EMAIL } from '@/lib/env';
import { daXemHuongDan, docDaDongY, ghiDaXemHuongDan, ghiDongY } from '@/lib/dongY';

/**
 * LẦN ĐẦU VÀO MIMI: đồng ý điều khoản → hướng dẫn nhanh → khảo sát (15/10/2026).
 *
 * Theo đúng cách ChatGPT/Claude đón người mới: MỘT việc mỗi màn, không phải đọc dài, mỗi bước có chỉ báo "bước mấy",
 * điều khoản chỉ là một nút đồng ý kèm liên kết (không bắt cuộn hết trang), hướng dẫn bỏ qua được, rồi tới câu hỏi
 * cá nhân hoá. Khảo sát chính là thẻ `KhaoSatThue` ở màn MIMI Assistant (bốn câu chạm-là-xong, lưu vào hồ sơ thuế) —
 * bước hướng dẫn cuối dẫn thẳng tới đó thay vì dựng hai bản khảo sát.
 *
 * Trạng thái lấy từ MÁY CHỦ (bảng `consents`), nên đổi máy hay xoá cache cũng không bị hỏi lại điều khoản; phần
 * hướng dẫn chỉ nhớ ở trình duyệt vì lỡ xem lại cũng vô hại. Không đọc được trạng thái (lỗi mạng) thì KHÔNG chặn
 * người dùng. Tài khoản demo dùng chung không qua luồng này.
 */

type Buoc = 'dangKiem' | 'dieuKhoan' | 'huongDan' | 'khong';

const THE = [
  { khoa: 't1', Icon: MessageCircle },
  { khoa: 't2', Icon: ShieldCheck },
  { khoa: 't3', Icon: FileSearch },
  { khoa: 't4', Icon: Sparkles },
] as const;

export function LuongNguoiMoi({ onXong }: { onXong: () => void }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [buoc, setBuoc] = useState<Buoc>('dangKiem');
  const [the, setThe] = useState(0);
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState(false);
  const nutChinh = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!user?.id || user.email === DEMO_EMAIL) { setBuoc('khong'); return; }
    let huy = false;
    void docDaDongY(user.id).then((da) => {
      if (huy) return;
      if (da === null) setBuoc('khong');
      else if (!da) setBuoc('dieuKhoan');
      else setBuoc(daXemHuongDan(user.id) ? 'khong' : 'huongDan');
    });
    return () => { huy = true; };
  }, [user?.id, user?.email]);

  // Đưa tiêu điểm bàn phím vào nút chính của mỗi bước, và khoá cuộn trang phía sau.
  useEffect(() => {
    if (buoc !== 'dieuKhoan' && buoc !== 'huongDan') return;
    nutChinh.current?.focus();
    const cu = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = cu; };
  }, [buoc, the]);

  if (buoc === 'dangKiem' || buoc === 'khong' || !user) return null;

  const dongY = async () => {
    setDangLuu(true);
    setLoi(false);
    try {
      await ghiDongY(user.id);
      setBuoc(daXemHuongDan(user.id) ? 'khong' : 'huongDan');
      if (daXemHuongDan(user.id)) onXong();
    } catch {
      setLoi(true);
    } finally {
      setDangLuu(false);
    }
  };

  const ketThuc = () => { ghiDaXemHuongDan(user.id); setBuoc('khong'); onXong(); };
  const tong = 3;
  const soBuoc = buoc === 'dieuKhoan' ? 1 : 2;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/90 px-4 py-6 backdrop-blur-sm" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="luong-moi-tieu-de"
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
        onKeyDown={(e) => { if (e.key === 'Escape' && buoc === 'huongDan') ketThuc(); }}
      >
        <ol className="mb-5 flex items-center justify-center gap-2 text-xs text-muted-foreground" aria-label={t('man.nguoiMoi.buocSo', { so: soBuoc, tong })}>
          {(['dieuKhoan', 'huongDan', 'khaoSat'] as const).map((k, i) => {
            const xong = i + 1 < soBuoc;
            const dang = i + 1 === soBuoc;
            return (
              <li key={k} className="flex items-center gap-2" aria-current={dang ? 'step' : undefined}>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${xong ? 'bg-primary text-primary-foreground' : dang ? 'bg-primary/15 text-primary ring-1 ring-primary' : 'bg-muted text-muted-foreground'}`}>
                  {xong ? <Check size={11} aria-hidden /> : i + 1}
                </span>
                <span className={dang ? 'font-medium text-foreground' : ''}>{t(`man.nguoiMoi.buoc.${k}`)}</span>
                {i < 2 && <span className="h-px w-4 bg-border" aria-hidden />}
              </li>
            );
          })}
        </ol>

        {buoc === 'dieuKhoan' && (
          <div>
            <div className="mx-auto h-16 w-16"><MimiCat variant="live" glow="none" className="w-full" /></div>
            <h2 id="luong-moi-tieu-de" className="mt-3 text-center font-display text-2xl font-semibold text-foreground">{t('man.nguoiMoi.chao')}</h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">{t('man.nguoiMoi.chaoMoTa')}</p>
            <ul className="mt-4 space-y-2.5 text-sm text-foreground">
              {(['y1', 'y2', 'y3'] as const).map((k) => (
                <li key={k} className="flex gap-2.5"><Check size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden /><span>{t(`man.nguoiMoi.${k}`)}</span></li>
              ))}
            </ul>
            {loi && <p role="alert" className="mt-3 text-sm text-destructive">{t('man.nguoiMoi.loiLuu')}</p>}
            <button
              ref={nutChinh}
              type="button"
              onClick={() => void dongY()}
              disabled={dangLuu}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60"
            >
              {dangLuu ? <><Loader2 size={16} className="animate-spin" /> {t('man.nguoiMoi.dangLuu')}</> : t('man.nguoiMoi.dongY')}
            </button>
            <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
              <Trans i18nKey="ui2.dangKy.dongY" components={{ dk: <Link to="/terms" target="_blank" className="underline underline-offset-2" />, bm: <Link to="/privacy" target="_blank" className="underline underline-offset-2" /> }} />
            </p>
          </div>
        )}

        {buoc === 'huongDan' && (() => {
          const { khoa, Icon } = THE[the];
          const cuoi = the === THE.length - 1;
          return (
            <div>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon size={26} aria-hidden /></div>
              <h2 id="luong-moi-tieu-de" className="mt-4 text-center font-display text-xl font-semibold text-foreground">{t(`man.nguoiMoi.${khoa}.tieuDe`)}</h2>
              <p className="mt-2 min-h-[5.5rem] text-center text-sm leading-relaxed text-muted-foreground">{t(`man.nguoiMoi.${khoa}.moTa`)}</p>
              <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
                {THE.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === the ? 'w-5 bg-primary' : 'w-1.5 bg-border'}`} />)}
              </div>
              <div className="mt-5 flex items-center gap-2">
                {the > 0 && (
                  <button type="button" onClick={() => setThe(the - 1)} className="h-11 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-accent">
                    {t('man.nguoiMoi.quayLai')}
                  </button>
                )}
                <button
                  ref={nutChinh}
                  type="button"
                  onClick={() => (cuoi ? ketThuc() : setThe(the + 1))}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:brightness-110"
                >
                  {cuoi ? t('man.nguoiMoi.batDau') : t('man.nguoiMoi.tiep')} <ArrowRight size={15} aria-hidden />
                </button>
              </div>
              {!cuoi && (
                <button type="button" onClick={ketThuc} className="mt-3 w-full text-center text-sm text-muted-foreground hover:text-foreground">
                  {t('man.nguoiMoi.boQua')}
                </button>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
