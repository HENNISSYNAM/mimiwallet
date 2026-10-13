import { useEffect, useMemo, useState } from 'react';
import { FileDown, Printer, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Trans, useTranslation } from 'react-i18next';
import ChonLoaiHinh from '@/components/dang-ky/ChonLoaiHinh';
import BangHoi from '@/components/dang-ky/BangHoi';
import GiayIn, { KieuInDangKy } from '@/components/dang-ky/GiayIn';
import NhanNguon from '@/components/dang-ky/NhanNguon';
import { inTaiLieu, LOP_VUNG_IN, ngayTep, tenTepAnToan } from '@/lib/inTaiLieu';
import {
  docHoSoDaLuu, goiYChuSoHuuHuongLoi, hoSoRong, kiemTraHoSo, luuHoSo, nguoiGopVonRong, xoaHoSoDaLuu,
  type HoSoDangKy,
} from '@/lib/dangKy/hoSo';
import { cacBuoc, hoSoCan, MO_TA, type LoaiHinh, type MaMau } from '@/lib/dangKy/loaiHinh';
import { boMau } from '@/lib/dangKy/mau';
import { CC } from '@/lib/dangKy/nguon';

/**
 * Đăng ký kinh doanh — hướng dẫn từng bước: chọn loại hình → hồ sơ và các bước nộp (kèm căn cứ)
 * → bộ soạn hồ sơ điền sẵn mẫu Nhà nước, xem trước, in/Tải PDF.
 *
 * Không gọi máy chủ. Bảng hỏi có số định danh cá nhân của nhiều người nên chỉ nằm trong
 * localStorage của trình duyệt này (nút "Xoá dữ liệu đã nhập"); MIMI không nộp thay.
 */

const MIN_THANH_VIEN: Partial<Record<LoaiHinh, number>> = { tnhh2: 2, ctcp: 3 };

export default function DangKyKinhDoanhPage() {
  const { t } = useTranslation();
  const [hs, setHs] = useState<HoSoDangKy>(() => docHoSoDaLuu() ?? hoSoRong('ctcp'));
  const [dangXem, setDangXem] = useState<MaMau | 'ca_bo'>('ca_bo');

  // Ghi mỗi lần sửa: đóng tab giữa chừng không mất bảng hỏi. Lỗi bộ nhớ (riêng tư, đầy) thì bỏ qua.
  useEffect(() => { luuHoSo(hs); }, [hs]);

  const doi = (f: (h: HoSoDangKy) => HoSoDangKy) => setHs(f);
  const chonLoai = (loai: LoaiHinh) => {
    setHs((h) => {
      const can = MIN_THANH_VIEN[loai] ?? 0;
      const tv = [...h.thanh_vien];
      while (tv.length < can) tv.push(nguoiGopVonRong());
      return { ...h, loai, thanh_vien: tv, chu_so_huu_huong_loi: [] };
    });
    setDangXem('ca_bo');
  };

  // Danh sách chủ sở hữu hưởng lợi chưa tự sửa → in theo gợi ý ≥25% (xem goiYChuSoHuuHuongLoi).
  const hsIn = useMemo<HoSoDangKy>(
    () => (hs.chu_so_huu_huong_loi.length ? hs : { ...hs, chu_so_huu_huong_loi: goiYChuSoHuuHuongLoi(hs) }),
    [hs],
  );
  const bo = useMemo(() => boMau(hsIn), [hsIn]);
  const loi = useMemo(() => kiemTraHoSo(hs), [hs]);
  const hoSo = hoSoCan(hs.loai);
  const buoc = cacBuoc(hs.loai);
  const xem = dangXem === 'ca_bo' ? bo : bo.filter((v) => v.ma === dangXem);
  const cacXem = xem.length ? xem : bo;

  const tenTep = `${tenTepAnToan(`ho-so-dang-ky ${MO_TA[hs.loai].ten_ngan} ${hs.ten_vi}`)}-${ngayTep()}`;
  const inRa = (pdf: boolean) => {
    if (loi.length) toast.info(t('ui1.dkkd.conThieuIn', { n: loi.length }));
    if (pdf) toast.info(t('ui1.dkkd.huongDanPdf'));
    inTaiLieu(tenTep);
  };
  const xoa = () => {
    xoaHoSoDaLuu();
    setHs(hoSoRong(hs.loai));
    toast.success(t('ui1.dkkd.daXoa'));
  };

  return (
    <div className="space-y-6 pb-10">
      <KieuInDangKy />
      <header className="no-print space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('ui1.dkkd.tieuDe')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('ui1.dkkd.moTa')}
        </p>
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-foreground">
          <p>
            {t('ui1.dkkd.mauMoi')}
          </p>
          <NhanNguon cc={CC.hieuLucMau} />
          <p className="mt-2">{t('ui1.dkkd.luuCucBo')}</p>
        </div>
      </header>

      <div className="no-print">
        <ChonLoaiHinh loai={hs.loai} chon={chonLoai} />
      </div>

      <section aria-labelledby="dkkd-buoc-2" className="no-print space-y-4 rounded-xl border border-border p-4">
        <h2 id="dkkd-buoc-2" className="text-lg font-semibold text-foreground">{t('ui1.dkkd.buoc2', { ten: MO_TA[hs.loai].ten })}</h2>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t('ui1.dkkd.hoSoCan')}</h3>
          <ul className="mt-2 space-y-2" aria-label={t('ui1.dkkd.hoSoCan')}>
            {hoSo.map((m) => (
              <li key={m.ten} className="text-sm">
                <span className="text-foreground">{m.ten}</span>
                {m.mau ? <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">{t('ui1.dkkd.mimiSoan')}</span> : null}
                {m.khi_nao ? <span className="block text-xs text-muted-foreground">{m.khi_nao}</span> : null}
                <NhanNguon cc={m.can_cu} />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t('ui1.dkkd.cacBuoc')}</h3>
          <ol className="mt-2 space-y-3" aria-label={t('ui1.dkkd.cacBuoc')}>
            {buoc.map((b, i) => (
              <li key={b.tieu_de} className="text-sm">
                <p className="font-medium text-foreground">{t('ui1.dkkd.buocN', { n: i + 1 })} {b.tieu_de}</p>
                <p className="text-muted-foreground">{b.chi_tiet}</p>
                {b.can_cu.map((c) => <NhanNguon key={`${c.dieu}${c.van_ban}`} cc={c} />)}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="dkkd-buoc-3" className="space-y-4">
        <div className="no-print flex flex-wrap items-center justify-between gap-2">
          <h2 id="dkkd-buoc-3" className="text-lg font-semibold text-foreground">{t('ui1.dkkd.buoc3')}</h2>
          <button type="button" onClick={xoa} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-destructive">
            <Trash2 className="h-4 w-4" aria-hidden /> {t('ui1.dkkd.xoaDuLieu')}
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="no-print">
            <BangHoi hs={hs} doi={doi} />
          </div>

          <div className="space-y-3">
            <div className="no-print space-y-3">
              <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('ui1.dkkd.xemTruoc')}>
                {([['ca_bo', t('ui1.dkkd.caBo')] as const, ...bo.map((v) => [v.ma, v.ten] as const)]).map(([ma, ten]) => (
                  <button
                    key={ma} type="button" role="tab" aria-selected={dangXem === ma}
                    onClick={() => setDangXem(ma)}
                    className={`rounded-full border px-3 py-1 text-xs ${dangXem === ma ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground'}`}
                  >
                    {ten}
                  </button>
                ))}
              </div>
              {loi.length > 0 ? (
                <div role="status" className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
                  <p className="font-medium text-foreground">{t('ui1.dkkd.conSua', { n: loi.length })}</p>
                  <ul className="mt-1 list-disc pl-5 text-muted-foreground">{loi.slice(0, 8).map((l, i) => <li key={i}>{l.thong_bao}</li>)}</ul>
                </div>
              ) : (
                <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{t('ui1.dkkd.du')}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => inRa(false)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
                  <Printer className="h-4 w-4" aria-hidden /> {t('ui1.dkkd.in')}
                </button>
                <button type="button" onClick={() => inRa(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-foreground">
                  <FileDown className="h-4 w-4" aria-hidden /> {t('ui1.quet.taiPdf')}
                </button>
              </div>
              {cacXem.some((v) => v.tham_khao) && (
                <p className="rounded-lg bg-muted/40 p-2 text-xs text-muted-foreground">
                  {t('ui1.dkkd.dieuLe')}
                </p>
              )}
            </div>

            <div className={`${LOP_VUNG_IN} overflow-x-auto rounded-xl border border-border`}>
              {cacXem.map((v, i) => <GiayIn key={v.ma} vanBan={v} ngatTruoc={i > 0} />)}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
