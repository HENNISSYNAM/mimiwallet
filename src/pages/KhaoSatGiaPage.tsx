import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { supabase } from '@/integrations/supabase/client';
import { IconMeo } from '@/components/brand/IconMeo';

/**
 * KHẢO SÁT GIÁ (06/10/2026) — tìm điểm hộ kinh doanh chịu trả tiền, theo phương pháp Van Westendorp.
 *
 * Đội MIMI gửi đường dẫn này cho chủ hộ thật (Zalo, gặp trực tiếp). Ghi vào bảng `khao_sat_gia`; không ai đọc được
 * qua API. Câu hỏi bám ba mốc thị trường đã tra: phần mềm sổ sách miễn phí (KiotViet, MISA eShop cho hộ ≤ 1 tỷ),
 * dịch vụ kế toán 300.000–1.000.000 ₫/tháng, và tiền phạt khai trễ — xem docs/NGHIEN_CUU_CONG_NGHE_WTP_2026-10.md.
 *
 * Chỉ tiếng Việt: công cụ nghiên cứu cho hộ kinh doanh Việt Nam, không phải trang sản phẩm.
 */
/** `nhan`/`cau` dưới đây là khoá i18n (`ui2.ksg.*`), dịch lúc vẽ. */
type Chon = { gia: string; nhan: string };

const DOANH_THU: Chon[] = [
  { gia: 'duoi_500tr', nhan: 'ui2.ksg.duoi500' },
  { gia: '500tr_1ty', nhan: 'ui2.ksg.t500den1ty' },
  { gia: '1_3ty', nhan: 'ui2.ksg.t1den3ty' },
  { gia: 'tren_3ty', nhan: 'ui2.ksg.tren3ty' },
  { gia: 'chua_ro', nhan: 'ui2.ksg.chuaRo' },
];
const THU_TIEN: Chon[] = [
  { gia: 'chuyen_khoan', nhan: 'ui2.ksg.chuyenKhoan' },
  { gia: 'tien_mat', nhan: 'ui2.ksg.tienMat' },
  { gia: 'ca_hai', nhan: 'ui2.ksg.caHai' },
];
const GHI_SO: Chon[] = [
  { gia: 'so_tay_excel', nhan: 'ui2.ksg.soTay' },
  { gia: 'phan_mem_ban_hang', nhan: 'ui2.ksg.phanMem' },
  { gia: 'thue_ke_toan', nhan: 'ui2.ksg.thueKeToan' },
  { gia: 'chua_ghi', nhan: 'ui2.ksg.chuaGhi' },
];
const VIEC: Chon[] = [
  { gia: 'doi_chieu_sao_ke', nhan: 'ui2.ksg.docSaoKe' },
  { gia: 'thieu_chung_tu', nhan: 'ui2.ksg.thieuChungTu' },
  { gia: 'khong_tre_han', nhan: 'ui2.ksg.khongTreHan' },
  { gia: 'soan_to_khai', nhan: 'ui2.ksg.soanToKhai' },
  { gia: 'kiem_truoc_khi_chuyen', nhan: 'ui2.ksg.kiemTruoc' },
];
const CAU_GIA: { khoa: 'qua_re' | 'hoi' | 'dat' | 'qua_dat'; cau: string }[] = [
  { khoa: 'qua_re', cau: 'ui2.ksg.quaRe' },
  { khoa: 'hoi', cau: 'ui2.ksg.hoi' },
  { khoa: 'dat', cau: 'ui2.ksg.dat' },
  { khoa: 'qua_dat', cau: 'ui2.ksg.quaDat' },
];

const soTien = (s: string) => Number(s.replace(/\D/g, '')) || 0;
const hienTien = (s: string) => (s ? soTien(s).toLocaleString(i18n.language) : '');

function NhomChon({ ten, ds, gia, dat }: { ten: string; ds: Chon[]; gia: string; dat: (v: string) => void }) {
  const { t } = useTranslation();
  return (
    <fieldset className="mt-6">
      <legend className="text-base font-semibold text-foreground">{ten}</legend>
      <div className="mt-3 flex flex-col gap-2">
        {ds.map((c) => (
          <button key={c.gia} type="button" onClick={() => dat(c.gia)} aria-pressed={gia === c.gia}
            className={`min-h-12 rounded-xl border px-4 py-3 text-left text-[15px] ${gia === c.gia ? 'border-primary bg-primary/10 font-medium text-foreground' : 'border-border bg-card text-foreground hover:bg-accent'}`}>
            {t(c.nhan)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function KhaoSatGiaPage() {
  const { t } = useTranslation();
  const [doanhThu, setDoanhThu] = useState('');
  const [thuTien, setThuTien] = useState('');
  const [ghiSo, setGhiSo] = useState('');
  const [traKeToan, setTraKeToan] = useState('');
  const [viec, setViec] = useState('');
  const [gia, setGia] = useState<Record<string, string>>({ qua_re: '', hoi: '', dat: '', qua_dat: '' });
  const [lienHe, setLienHe] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const [daGui, setDaGui] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  const gui = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doanhThu || !thuTien || !ghiSo || !viec) { setLoi(t('ui2.ksg.loi4Cau')); return; }
    const [a, b, c, d] = (['qua_re', 'hoi', 'dat', 'qua_dat'] as const).map((k) => soTien(gia[k]));
    if (!gia.qua_re || !gia.hoi || !gia.dat || !gia.qua_dat) { setLoi(t('ui2.ksg.loi4Gia')); return; }
    if (!(a <= b && b <= c && c <= d)) { setLoi(t('ui2.ksg.loiTangDan')); return; }
    setLoi(null);
    setDangGui(true);
    const nguon = new URLSearchParams(window.location.search).get('nguon');
    const bang = (supabase as unknown as { from: (b: string) => { insert: (d: unknown) => PromiseLike<{ error: { message: string } | null }> } }).from('khao_sat_gia');
    const { error } = await bang.insert({
      nhom_doanh_thu: doanhThu, cach_thu_tien: thuTien, dang_ghi_so: ghiSo,
      tra_ke_toan_thang: ghiSo === 'thue_ke_toan' && traKeToan ? soTien(traKeToan) : null,
      viec_dang_tien: viec, gia_qua_re: a, gia_hoi: b, gia_bat_dau_dat: c, gia_qua_dat: d,
      lien_he: lienHe.trim().slice(0, 200) || null, nguon: nguon ? nguon.slice(0, 60) : null,
    });
    setDangGui(false);
    if (error) { setLoi(t('ui2.ksg.loiGui', { zalo: '0984988359' })); return; }
    setDaGui(true);
  };

  if (daGui) {
    return (
      <main className="min-h-screen bg-background px-4 py-16">
        <div className="mx-auto max-w-xl text-center">
          <div className="flex justify-center"><IconMeo size={56} /></div>
          <h1 className="mt-4 font-serif text-3xl text-foreground">{t('ui2.ksg.camOn')}</h1>
          <p className="mt-3 text-muted-foreground">{t('ui2.ksg.camOnMo')}</p>
          <Link to="/register" className="mt-6 inline-flex h-12 items-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground">{t('ui2.ksg.xemDemo')}</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <form noValidate onSubmit={gui} className="mx-auto max-w-xl">
        <Link to="/" className="inline-flex items-center gap-2 font-display text-lg font-bold text-foreground"><IconMeo size={28} /> MIMI</Link>
        <h1 className="mt-6 font-serif text-3xl text-foreground">{t('ui2.ksg.tieuDe')}</h1>
        <p className="mt-2 text-muted-foreground">{t('ui2.ksg.moTa')}</p>

        <NhomChon ten={t('ui2.ksg.c1')} ds={DOANH_THU} gia={doanhThu} dat={setDoanhThu} />
        <NhomChon ten={t('ui2.ksg.c2')} ds={THU_TIEN} gia={thuTien} dat={setThuTien} />
        <NhomChon ten={t('ui2.ksg.c3')} ds={GHI_SO} gia={ghiSo} dat={setGhiSo} />
        {ghiSo === 'thue_ke_toan' && (
          <label className="mt-4 block text-[15px] text-foreground">{t('ui2.ksg.traKeToan')}
            <input inputMode="numeric" value={hienTien(traKeToan)} onChange={(e) => setTraKeToan(e.target.value)} placeholder={t('ui2.ksg.viDu', { so: '500.000' })}
              className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-base" />
          </label>
        )}
        <NhomChon ten={t('ui2.ksg.c4')} ds={VIEC} gia={viec} dat={setViec} />

        <fieldset className="mt-8">
          <legend className="text-base font-semibold text-foreground">{t('ui2.ksg.c5')}</legend>
          <div className="mt-3 flex flex-col gap-3">
            {CAU_GIA.map((c) => (
              <label key={c.khoa} className="block text-[15px] text-foreground">{t(c.cau)}
                <div className="mt-2 flex items-center gap-2">
                  <input inputMode="numeric" value={hienTien(gia[c.khoa])} onChange={(e) => setGia((g) => ({ ...g, [c.khoa]: e.target.value }))}
                    placeholder={t('ui2.ksg.viDu', { so: '100.000' })} className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base" />
                  <span className="text-muted-foreground">{t('ui2.ksg.dongThang')}</span>
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="mt-8 block text-[15px] text-foreground">{t('ui2.ksg.lienHe')}
          <input value={lienHe} onChange={(e) => setLienHe(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-base" />
        </label>

        {loi && <p role="alert" className="mt-4 text-sm text-destructive">{loi}</p>}
        <button type="submit" disabled={dangGui} className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-60">
          {dangGui && <Loader2 size={16} className="animate-spin" />} {t('ui2.ksg.gui')}
        </button>
      </form>
    </main>
  );
}
