import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, CalendarDays, ChevronRight, Loader2, MapPin } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import NoiDungBai from '@/components/tai-nguyen/NoiDungBai';
import { ngayGio } from '@/components/tai-nguyen/TheBai';
import { CAU_HINH_LOAI, docBai, duongDanLoai, loaiTuDuong, type BaiTaiNguyen, type LoaiTaiNguyen } from '@/lib/taiNguyen';
import NotFound from './NotFound';

/* Nhãn nút theo loại bài — khoá i18n. Nội dung bài (tiêu đề, tóm tắt, thân bài) giữ nguyên ngôn ngữ gốc. */
const NHAN_NUT: Record<LoaiTaiNguyen, string> = {
  su_kien: 'ui2.taiNguyen.nut.dangKy',
  blog: 'ui2.taiNguyen.nut.docThem',
  goc_nhin: 'ui2.taiNguyen.nut.docThem',
  bao_cao: 'ui2.taiNguyen.nut.taiBaoCao',
  tin_tuc: 'ui2.taiNguyen.nut.docBaiGoc',
  tuyen_dung: 'ui2.taiNguyen.nut.ungTuyen',
};

/** Một bài tài nguyên (/tai-nguyen/:loai/:slug), hoặc một tin tuyển dụng (/tuyen-dung/:slug). */
export default function TaiNguyenBai({ loaiCoDinh }: { loaiCoDinh?: LoaiTaiNguyen }) {
  const { t } = useTranslation();
  const { loai: duong, slug = '' } = useParams();
  const loai = loaiCoDinh ?? loaiTuDuong(duong);
  const [bai, setBai] = useState<BaiTaiNguyen | null | undefined>(undefined);
  const [loi, setLoi] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!loai) return;
    let huy = false;
    setBai(undefined);
    docBai(loai, slug)
      .then((b) => { if (!huy) setBai(b); })
      .catch(() => { if (!huy) setLoi(true); });
    return () => { huy = true; };
  }, [loai, slug]);

  useEffect(() => {
    if (bai) document.title = `${bai.tieu_de} — MIMI WALLET`;
  }, [bai]);

  if (!loai || (!loaiCoDinh && loai === 'tuyen_dung') || bai === null) return <NotFound />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <article className="container mx-auto max-w-3xl px-4 pt-32 pb-20 lg:pt-40">
        <nav aria-label={t('ui2.taiNguyen.duongDan')} className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">{t('ui2.taiNguyen.trangChu')}</Link>
          <ChevronRight size={14} />
          <Link to={duongDanLoai(loai)} className="hover:text-foreground">{t(`ui2.taiNguyen.loai.${loai}.ten`, { defaultValue: CAU_HINH_LOAI[loai].ten })}</Link>
        </nav>

        {loi && <p className="mt-8 text-muted-foreground">{t('ui2.taiNguyen.loiBai')}</p>}
        {!loi && bai === undefined && (
          <p className="mt-8 flex items-center gap-2 text-muted-foreground"><Loader2 size={16} className="animate-spin" /> {t('ui2.chung.dangTai')}</p>
        )}

        {bai && (
          <>
            <h1 className="mimi-tieu-de-trang mt-5 text-foreground">{bai.tieu_de}</h1>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {bai.loai === 'su_kien' && bai.bat_dau && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={15} aria-hidden /> {ngayGio(bai.bat_dau, true)}
                  {bai.ket_thuc && ` – ${ngayGio(bai.ket_thuc, true)}`}
                </span>
              )}
              {bai.loai !== 'su_kien' && bai.xuat_ban_luc && <span>{t('ui2.taiNguyen.dang', { ngay: ngayGio(bai.xuat_ban_luc) })}</span>}
              {bai.dia_diem && <span className="inline-flex items-center gap-1.5"><MapPin size={15} aria-hidden /> {bai.dia_diem}</span>}
              {bai.hinh_thuc && <span className="rounded-full bg-muted px-2.5 py-0.5">{bai.hinh_thuc}</span>}
            </div>
            {bai.tom_tat && <p className="mimi-doan-dan mt-6 text-muted-foreground">{bai.tom_tat}</p>}
            {bai.duong_dan_ngoai && (
              <a
                href={bai.duong_dan_ngoai}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-[15px] font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {t(NHAN_NUT[bai.loai])} <ArrowUpRight size={16} />
              </a>
            )}
            {bai.anh_bia && (
              <img src={bai.anh_bia} alt="" referrerPolicy="no-referrer" className="mt-10 aspect-[16/9] w-full rounded-2xl border border-border object-cover" />
            )}
            <div className="mt-10">
              <NoiDungBai noiDung={bai.noi_dung} />
            </div>
          </>
        )}
      </article>
      <Footer />
    </div>
  );
}
