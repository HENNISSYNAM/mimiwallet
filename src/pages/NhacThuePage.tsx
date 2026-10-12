import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, CalendarClock, ExternalLink, FileCheck2, HelpCircle, Loader2, ScrollText } from 'lucide-react';
import { DUONG_DAN_NOP_TO_KHAI } from '@/lib/goiToKhai';
import logoDichVuCong from '@/assets/logos/dich-vu-cong-tai-chinh.png';
import { mucKhan, type MucKhan } from '@/lib/hanKeKhai';
import { cauConLai, ngayMoc, TEN_LOAI_MOC, useLichThue, type MocThue } from '@/lib/lichThue';
import { dinhDang } from '@/lib/troLy';
import { duongDanGiayTo, MO_TA_GIAY_TO, type LoaiGiayTo } from '@/lib/giayTo';
import { CaiDatThongBao } from '@/components/thong-bao/CaiDatThongBao';
import { LichViec } from '@/components/viec/LichViec';
import { mucCanXem } from '../../supabase/functions/_shared/thong-bao/muc-nhac.ts';
import { nghiaVuTuLich, type NghiaVu, type TrangThaiMoc } from '../../supabase/functions/_shared/luat/lich-thue.ts';
import { nhanCanCu } from '../../supabase/functions/_shared/luat/he-luat.ts';
import type { HoSoMst } from '../../supabase/functions/_shared/mst/ho-so-mst.ts';

/**
 * Nhắc thuế — như "Scheduled" của ChatGPT, nhưng là các mốc nghĩa vụ thuế (15/09/2026).
 *
 * Một nguồn (02/10/2026): MỘT lần gọi `tax-summary` cho cả lịch, độ sẵn sàng (`sanSang`) và ngưỡng doanh thu —
 * trước đây gọi hai lần, hai bản có thể lệch nhau. Khi doanh thu còn cắt ngưỡng luật (`ket_luan_phu_thuoc`),
 * đầu trang hỏi ĐÚNG câu "cần xem" mà chuông, push và Việc cần làm cũng hỏi (`_shared/thong-bao/muc-nhac.ts`),
 * và phần ngưỡng không viết "Đã vượt / Còn" như chắc chắn.
 */

interface MocDoanhThu {
  key: 'tax_exemption' | 'profit_method_required';
  threshold: number;
  remaining: number;
  ratio: number;
  crossed: boolean;
}

interface TomTatThue {
  year: number;
  basis: 'gdt' | 'bank';
  revenue: number;
  milestones: MocDoanhThu[];
  hasBankConnection: boolean;
  disclaimer: string;
  /** Kết quả từng ngưỡng của máy chủ: `chua_chac` = khoảng doanh thu thật cắt ngưỡng. */
  revenueUncertainty?: { nguong?: { ma: string; phia: 'tren' | 'duoi' | 'chua_chac' }[] } | null;
}

const KHOA_MOC: Record<MocDoanhThu['key'], { i18n: 'moc1' | 'moc3'; ma: string }> = {
  tax_exemption: { i18n: 'moc1', ma: 'mien_thue_1_ty' },
  profit_method_required: { i18n: 'moc3', ma: 'phuong_phap_3_ty' },
};

const MAU_KHAN: Record<MucKhan, string> = {
  gap: 'bg-mimi-amber/15 text-mimi-amber',
  sap_toi: 'bg-primary/10 text-primary',
  con_xa: 'bg-accent text-muted-foreground',
};

/** Câu trả lời "cần xem" được ghi ở đâu — theo hành động máy chủ gắn với câu hỏi. */
const NOI_TRA_LOI: Record<string, string> = {
  xac_nhan_tien_vao: '/dashboard/cashflow',
  nhap_sao_ke: '/dashboard/ket-noi',
  ket_noi_ngan_hang: '/dashboard/ket-noi',
};

const laHoSoMst = (x: unknown): x is HoSoMst => !!x && typeof x === 'object' && Array.isArray((x as HoSoMst).dieu_suy);

const NHOM_NGHIA_VU: { trang_thai: TrangThaiMoc; mau: string }[] = [
  { trang_thai: 'phai_lam', mau: 'text-primary' },
  { trang_thai: 'can_xac_minh', mau: 'text-mimi-amber' },
  { trang_thai: 'khong_ap_dung', mau: 'text-muted-foreground' },
];

/**
 * Hồ sơ nghĩa vụ (11/10/2026): đầu trang nói MIMI biết gì nhờ mã số thuế và vì sao từng nghĩa vụ áp dụng,
 * cần xác minh hay không áp dụng. Gom từ CÙNG `lich` của `tax-summary` (`nghiaVuTuLich`) — không lịch thứ hai.
 * Không có nút trả lời nhanh: câu hỏi "cần xác minh" ở đây (kỳ khai GTGT, có trả lương…) chưa có đường lưu
 * câu trả lời mà lịch thuế đọc lại; nút mà không lưu được là nút hứa suông.
 */
function HoSoNghiaVu({ hoSo, lich }: { hoSo: HoSoMst | null; lich: MocThue[] }) {
  const { t } = useTranslation();
  const nhom = nghiaVuTuLich(lich);
  return (
    <section aria-labelledby="ho-so-nghia-vu" className="rounded-2xl border border-border bg-card p-5">
      <h2 id="ho-so-nghia-vu" className="text-lg font-semibold text-foreground">
        {hoSo?.ten ? t('tb.hoSo.tieuDe', { ten: hoSo.ten }) : t('tb.hoSo.tieuDeChung')}
      </h2>
      {hoSo && hoSo.dieu_suy.length > 0 ? (
        <div className="mt-3 rounded-xl bg-accent/50 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground"><BadgeCheck size={16} className="text-primary" aria-hidden /> {t('tb.hoSo.nhoMst')}</p>
          <dl className="mt-2 space-y-2">
            {hoSo.dieu_suy.map((d) => (
              <div key={d.truong} className="text-sm">
                <dt className="inline font-medium text-foreground">{d.nhan}: </dt>
                <dd className="inline text-foreground">{d.gia_tri}</dd>
                <p className="text-xs text-muted-foreground">{d.vi_sao} <span className="italic">({t(d.nguon === 'hinh_ma_so' ? 'tb.hoSo.nguonHinh' : 'tb.hoSo.nguonTct')})</span></p>
              </div>
            ))}
          </dl>
          {!hoSo.da_tra && <p className="mt-2 text-xs text-mimi-amber">{t('tb.hoSo.chuaTra')}</p>}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          {t('tb.hoSo.chuaCoMst')} <Link to="/dashboard/settings" className="font-medium text-primary hover:underline">{t('tb.hoSo.moCaiDat')}</Link>
        </p>
      )}
      {NHOM_NGHIA_VU.map(({ trang_thai, mau }) => nhom[trang_thai].length > 0 && (
        <div key={trang_thai} className="mt-4">
          <h3 className={`text-sm font-semibold ${mau}`}>{t(`tb.hoSo.nhom.${trang_thai}`)}</h3>
          <ul className="mt-2 divide-y divide-border">
            {nhom[trang_thai].map((n: NghiaVu) => (
              <li key={n.khoa} className="py-2">
                <p className="text-sm font-medium text-foreground">{n.ten}{n.so_ky > 1 ? ` ${t('tb.hoSo.soKy', { n: n.so_ky })}` : ''}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground"><span className="font-medium">{t('tb.hoSo.viSao')}</span> {n.vi_sao}</p>
                {n.cau_hoi && <p className="mt-0.5 text-xs font-medium text-mimi-amber">{n.cau_hoi}</p>}
                {n.can_cu.length > 0 && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <span className="font-medium">{t('tb.hoSo.canCu')}</span>{' '}
                    {n.can_cu.map((c) => nhanCanCu(c)?.nhan ?? c).join('; ')}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

const laTomTat = (x: Record<string, unknown> | undefined): x is Record<string, unknown> & TomTatThue =>
  !!x && Array.isArray(x.milestones) && typeof x.revenue === 'number';

export default function NhacThuePage() {
  const { t } = useTranslation();
  /*
   * Lịch CỦA công ty này (25/09/2026), từ `tax-summary` → `_shared/luat/lich-thue.ts`. Cùng phản hồi mang
   * `sanSang` và ngưỡng doanh thu.
   */
  const { du: lichThue, loi: loiLich } = useLichThue();
  const moc = lichThue?.mocKeTiep ?? null;
  const thue = laTomTat(lichThue?.tomTat) ? lichThue.tomTat : null;
  const canXem = mucCanXem(lichThue?.sanSang);
  const cauHoi = lichThue?.sanSang?.cau_hoi_can_xem ?? null;
  const chuaChac = (ma: string) =>
    !!lichThue?.sanSang?.ket_luan_phu_thuoc && (thue?.revenueUncertainty?.nguong ?? []).some((n) => n.ma === ma && n.phia === 'chua_chac');

  const khan = mucKhan(moc?.con_lai ?? 999);
  const hoSoMst = laHoSoMst(lichThue?.tomTat?.hoSoMst) ? lichThue.tomTat.hoSoMst as HoSoMst : null;

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('tb.trang.tieuDe')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('tb.trang.moTa')}</p>
      </header>

      {lichThue && <HoSoNghiaVu hoSo={hoSoMst} lich={lichThue.lich} />}

      {canXem && (
        <section id="can-xem" aria-labelledby="can-xem-tieu-de" className="scroll-mt-20 rounded-2xl border border-mimi-amber/40 bg-mimi-amber/5 p-5">
          <div className="flex gap-3">
            <HelpCircle size={22} className="mt-0.5 shrink-0 text-mimi-amber" aria-hidden />
            <div className="min-w-0">
              <h2 id="can-xem-tieu-de" className="text-lg font-semibold text-foreground">{t('tb.canXem.tieuDe')}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t('tb.canXem.moTa')}</p>
              <p className="mt-2 text-sm font-medium text-foreground">{canXem.cau_hoi}</p>
              {!!cauHoi?.con_lai && <p className="mt-1 text-xs text-muted-foreground">{t('tb.canXem.conLai', { n: cauHoi.con_lai })}</p>}
              <Link
                to={NOI_TRA_LOI[cauHoi?.hanh_dong ?? ''] ?? '/dashboard/cashflow'}
                className="mt-3 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:brightness-110"
              >
                {t('tb.canXem.traLoi')}
              </Link>
              <p className="mt-2 text-xs text-muted-foreground">{t('tb.canXem.hanPhuThuoc')}</p>
            </div>
          </div>
        </section>
      )}

      <section aria-labelledby="sap-toi-han" className="rounded-2xl border border-border bg-card p-5">
        {!lichThue && !loiLich && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> {t('tb.lich.dangTinh')}</p>}
        {loiLich && <p className="text-sm text-destructive">{t('tb.lich.loi')}</p>}
        {lichThue && !moc && !canXem && <p className="text-sm text-muted-foreground">{t('tb.lich.khongCoHan')}</p>}
        {moc && (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <CalendarClock size={22} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                <div>
                  <h2 id="sap-toi-han" className="text-lg font-semibold text-foreground">{moc.ten}</h2>
                  <p className="text-sm text-muted-foreground">{t('tb.lich.han', { ngay: ngayMoc(moc.han) })} · {TEN_LOAI_MOC[moc.loai]}</p>
                </div>
              </div>
              <span className={`self-start rounded-full px-3 py-1 text-sm font-medium ${MAU_KHAN[khan]}`}>{cauConLai(moc)}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{moc.vi_sao}</p>
            {moc.cau_hoi && <p className="mt-2 text-sm font-medium text-mimi-amber">{moc.cau_hoi}</p>}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link to="/dashboard/to-khai" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:brightness-110">
                <ScrollText size={16} /> {t('tb.lich.moToKhai')}
              </Link>
              <a
                href={DUONG_DAN_NOP_TO_KHAI}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-accent"
              >
                <img src={logoDichVuCong} alt="" className="h-4 w-4 object-contain" /> {t('tb.lich.nopCong')} <ExternalLink size={14} />
              </a>
              <Link to="/dashboard/chung-tu" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-accent">
                <FileCheck2 size={16} /> {t('tb.lich.kiemChungTu')}
              </Link>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t('tb.lich.ghiChu')}</p>
          </>
        )}
      </section>

      {/* Bật thông báo ở đây: người dùng tới trang này để không lỡ hạn. */}
      <CaiDatThongBao />

      <section aria-labelledby="lich-ke-khai" className="rounded-2xl border border-border bg-card">
        <h2 id="lich-ke-khai" className="border-b border-border px-5 py-3 text-sm font-semibold text-foreground">{t('tb.lich.tieuDe')}</h2>
        <ol className="divide-y divide-border">
          {(lichThue?.lich ?? []).map((k: MocThue) => (
            <li key={k.khoa} className={`flex items-center justify-between gap-3 px-5 py-3 ${k.trang_thai === 'khong_ap_dung' ? 'opacity-60' : ''}`}>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{k.ten}</p>
                <p className="text-xs text-muted-foreground">
                  {k.han ? t('tb.lich.han', { ngay: ngayMoc(k.han) }) : t('tb.lich.chuaXacDinhHan')} · {TEN_LOAI_MOC[k.loai]}
                </p>
                {k.cau_hoi && <p className="mt-0.5 text-xs text-mimi-amber">{k.cau_hoi}</p>}
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${k.con_lai !== null && k.trang_thai !== 'khong_ap_dung' ? MAU_KHAN[mucKhan(k.con_lai)] : 'bg-accent text-muted-foreground'}`}>{cauConLai(k)}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Prompt 4B: ngày của các việc đang làm — cùng nguồn với Việc cần làm, không giữ ngày riêng. */}
      <LichViec />

      <section aria-labelledby="nguong-doanh-thu" className="rounded-2xl border border-border bg-card p-5">
        <h2 id="nguong-doanh-thu" className="text-lg font-semibold text-foreground">{thue ? t('tb.nguong.tieuDe', { nam: thue.year }) : t('tb.nguong.tieuDeChung')}</h2>
        {!lichThue && !loiLich && <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> {t('tb.nguong.dangDoc')}</p>}
        {loiLich && <p className="mt-2 text-sm text-destructive">{t('tb.nguong.loi')}</p>}
        {thue && (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('tb.nguong.doanhThu')} <span className="font-semibold tabular-nums text-foreground">{dinhDang(thue.revenue, 'vnd')}</span>{' '}
              {t('tb.nguong.uocTinh')}
            </p>
            {thue.basis === 'bank' && !thue.hasBankConnection && (
              <p className="mt-1 text-sm text-mimi-amber">{t('tb.nguong.chuaLienKet')}</p>
            )}
            <ul className="mt-4 space-y-4">
              {thue.milestones.map((m) => {
                const km = KHOA_MOC[m.key];
                if (!km) return null;
                const mt = { ten: t(`tb.nguong.${km.i18n}.ten`), y: t(`tb.nguong.${km.i18n}.y`), nguon: t(`tb.nguong.${km.i18n}.nguon`) };
                const khongChac = chuaChac(km.ma);
                return (
                  <li key={m.key}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{mt.ten}</p>
                      <p className={`text-sm tabular-nums ${m.crossed || khongChac ? 'font-medium text-mimi-amber' : 'text-muted-foreground'}`}>
                        {khongChac ? t('tb.nguong.chuaChac') : m.crossed ? t('tb.nguong.daVuot', { tien: dinhDang(-m.remaining, 'vnd') }) : t('tb.nguong.con', { tien: dinhDang(m.remaining, 'vnd') })}
                      </p>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-accent" role="progressbar" aria-label={mt.ten} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(1, m.ratio) * 100)}>
                      <div className={`h-full rounded-full ${m.crossed ? 'bg-mimi-amber' : 'bg-primary'}`} style={{ width: `${Math.min(100, Math.max(0, m.ratio * 100))}%` }} />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{mt.y} <span className="italic">{t('tb.nguong.nguon', { nguon: mt.nguon })}</span></p>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">{thue.disclaimer}</p>
          </>
        )}
      </section>

      {/* Giấy tờ hay cần quanh kỳ kê khai. Bản nháp soạn ở trang Soạn giấy tờ; không trích điều luật. */}
      <section aria-labelledby="giay-to-thue" className="rounded-2xl border border-border bg-card p-5">
        <h2 id="giay-to-thue" className="text-base font-semibold text-foreground">{t('tb.giayTo.tieuDe')}</h2>
        <ul className="mt-3 space-y-3">
          {(['cong_van_giai_trinh', 'cong_van_huy_to_khai'] as LoaiGiayTo[]).map((l) => (
            <li key={l} className="text-sm">
              <Link to={duongDanGiayTo(l)} className="font-medium text-primary hover:underline">{MO_TA_GIAY_TO[l].ten}</Link>
              <p className="mt-0.5 text-muted-foreground">{MO_TA_GIAY_TO[l].khi_nao}</p>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-muted-foreground">{t('tb.cuoi')}</p>
    </div>
  );
}
