import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { goiTroLy } from '@/lib/goiTroLy';
import type { CanhBao } from '@/lib/batThuong';
import { duongDanGiayTo } from '@/lib/giayTo';
import { dinhDangTien } from '@/lib/tien';

/**
 * TCCN-01 — thẻ "Dấu hiệu bất thường" trên màn Tổng quan.
 *
 * Số liệu lấy từ action `bat_thuong` của `tro-ly`, tức CÙNG hàm quét mà MIMI Assistant dùng để
 * trả lời — hai nơi không thể báo hai kết quả khác nhau.
 *
 * Không có nút "bỏ qua cảnh báo": chưa có chỗ lưu lựa chọn đó ở máy chủ, và một nút chỉ đổi
 * giao diện rồi mất khi tải lại là nút nói dối. Cảnh báo tự rời thẻ khi khoản đó ra khỏi cửa sổ
 * 30 ngày.
 */

interface KetQua {
  tong: number;
  so_cao: number;
  canh_bao: CanhBao[];
  lich_su_du: boolean;
  so_khoan_da_xet: number;
}

const vnd = dinhDangTien;
const ngay = (ymd: string) => ymd.slice(0, 10).split('-').reverse().join('/');
export default function TheBatThuong() {
  const { t, i18n } = useTranslation();
  const CAU_HOI = t('ui2.canhBao.cauHoi');
  const navigate = useNavigate();
  const [kq, setKq] = useState<KetQua | null>(null);
  const [loi, setLoi] = useState(false);

  useEffect(() => {
    let huy = false;
    goiTroLy('bat_thuong')
      .then((r) => { if (!huy) setKq(r as unknown as KetQua); })
      .catch(() => { if (!huy) setLoi(true); });
    return () => { huy = true; };
  }, []);

  // Chưa có sao kê thì không có gì để quét — thẻ "chưa liên kết ngân hàng" ở trên đã nói việc đó.
  if (loi || !kq || kq.so_khoan_da_xet === 0) return null;

  const hoi = () => navigate(`/dashboard/tro-ly?hoi=${encodeURIComponent(CAU_HOI)}`);

  if (kq.tong === 0) {
    return (
      <section aria-label={t('ui2.canhBao.dauHieu')} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-mimi-green" aria-hidden />
        <div className="text-sm">
          <p className="font-semibold text-foreground">{t('ui2.canhBao.khongThay')}</p>
          <p className="mt-0.5 text-muted-foreground">
            {t('ui2.canhBao.daSo', { so: kq.so_khoan_da_xet.toLocaleString(i18n.language) })}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label={t('ui2.canhBao.dauHieu')}
      className={`rounded-2xl border p-4 ${kq.so_cao ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-card'}`}
    >
      <div className="flex items-start gap-3">
        <ShieldAlert size={18} className={`mt-0.5 shrink-0 ${kq.so_cao ? 'text-destructive' : 'text-foreground'}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {t('ui2.canhBao.coDauHieu', { so: kq.tong })}{kq.so_cao ? ` · ${t('ui2.canhBao.soCao', { so: kq.so_cao })}` : ''}
          </p>
          <ul className="mt-2 space-y-2">
            {kq.canh_bao.slice(0, 3).map((c) => (
              <li key={c.khoan.id} className="text-sm">
                <span className="font-medium text-foreground">
                  {ngay(c.khoan.ngay)} · {vnd(c.khoan.so_tien)} · {c.khoan.ten_nguoi_nhan ?? t('ui2.canhBao.khongRoNguoiNhan')}
                </span>
                <span className={`ml-2 rounded px-1.5 py-0.5 text-xs ${c.muc_do === 'cao' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground'}`}>
                  {c.muc_do === 'cao' ? t('ui2.canhBao.mucCao') : t('ui2.canhBao.canDeY')}
                </span>
                <p className="mt-0.5 text-muted-foreground">{c.dau_hieu[0]?.cau}</p>
                {/* TCCN-12: tiền đã đi rồi thì việc còn làm được là tra soát — càng sớm càng tốt. */}
                <button
                  onClick={() => navigate(duongDanGiayTo('don_tra_soat', c.khoan.id))}
                  className="mt-1 text-xs font-medium text-primary hover:underline"
                >
                  {t('ui2.canhBao.soanTraSoat')}
                </button>
              </li>
            ))}
          </ul>
          {!kq.lich_su_du && (
            <p className="mt-2 text-xs text-muted-foreground">{t('ui2.canhBao.motPhanNgan')}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {t('ui2.canhBao.chuaKetLuan')}
          </p>
          <button onClick={hoi} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            {t('ui2.canhBao.hoiChiTiet')} <ArrowRight size={10} />
          </button>
        </div>
      </div>
    </section>
  );
}
