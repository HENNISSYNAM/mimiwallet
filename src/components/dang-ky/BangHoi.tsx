import { useId, type ReactNode } from 'react';
import {
  goiYChuSoHuuHuongLoi, nguoiGopVonRong, soBangChu, soCoDau,
  type CaNhan, type ChuSoHuuHuongLoi, type DiaChi, type HoSoDangKy, type NguoiGopVon,
} from '@/lib/dangKy/hoSo';
import { useTranslation } from 'react-i18next';

/**
 * Bảng hỏi của bộ soạn hồ sơ. Chỉ hỏi những ô mẫu cần; mỗi nhóm ứng với một mục của Giấy đề nghị.
 * Nhãn dùng đúng tên chỉ tiêu trong mẫu để người dùng đối chiếu với giấy in ra.
 */

const O = 'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10';

export function Truong({ nhan, gia, doi, goiY, kieu, ghi }: { nhan: string; gia: string; doi: (v: string) => void; goiY?: string; kieu?: string; ghi?: string }) {
  // Ghi chú nối bằng aria-describedby, không nằm trong <label>: tên ô cho trình đọc màn hình chỉ là nhãn.
  const id = useId();
  return (
    <div className="text-sm">
      <label htmlFor={id} className="mb-1 block font-medium text-foreground">{nhan}</label>
      <input id={id} type={kieu ?? 'text'} value={gia} onChange={(e) => doi(e.target.value)} placeholder={goiY} className={O} aria-describedby={ghi ? `${id}-ghi` : undefined} />
      {ghi ? <span id={`${id}-ghi`} className="mt-0.5 block text-xs text-muted-foreground">{ghi}</span> : null}
    </div>
  );
}

function Nhom({ tieuDe, children }: { tieuDe: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-border p-4">
      <legend className="px-1 text-sm font-semibold text-foreground">{tieuDe}</legend>
      {children}
    </fieldset>
  );
}

const soTien = (v: string) => Number(v.replace(/\D/g, '')) || 0;

function NhapDiaChi({ d, doi, tien }: { d: DiaChi; doi: (d: DiaChi) => void; tien: string }) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Truong nhan={t('ui1.dkh.soNha', { tien })} gia={d.so_nha} doi={(v) => doi({ ...d, so_nha: v })} />
      <Truong nhan={t('ui1.dkh.xa')} gia={d.xa} doi={(v) => doi({ ...d, xa: v })} />
      <Truong nhan={t('ui1.dkh.tinh')} gia={d.tinh} doi={(v) => doi({ ...d, tinh: v })} />
    </div>
  );
}

function NhapCaNhan<T extends CaNhan>({ c, doi, ten }: { c: T; doi: (c: T) => void; ten: string }) {
  const { t } = useTranslation();
  const s = (k: keyof CaNhan) => (v: string) => doi({ ...c, [k]: v });
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Truong nhan={t('ui1.dkh.hoTen', { ten })} gia={c.ho_ten} doi={s('ho_ten')} />
        <Truong nhan={t('ui1.dkh.ngaySinh')} kieu="date" gia={c.ngay_sinh} doi={s('ngay_sinh')} />
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-foreground">{t('ui1.dkh.gioiTinh')}</span>
          <select value={c.gioi_tinh} onChange={(e) => s('gioi_tinh')(e.target.value)} className={O}>
            <option value="">—</option><option value="Nam">{t('ui1.dkh.nam')}</option><option value="Nữ">{t('ui1.dkh.nu')}</option>
          </select>
        </label>
        <Truong nhan={t('ui1.dkh.soDinhDanh')} gia={c.so_dinh_danh} doi={(v) => s('so_dinh_danh')(v.replace(/\D/g, '').slice(0, 12))} ghi={t('ui1.dkh.ghiDinhDanh')} />
        <Truong nhan={t('ui1.dkh.quocTich')} gia={c.quoc_tich} doi={s('quoc_tich')} />
        <Truong nhan={t('ui1.dkh.danToc')} gia={c.dan_toc} doi={s('dan_toc')} />
        <Truong nhan={t('ui1.dkh.dienThoai')} gia={c.dien_thoai} doi={s('dien_thoai')} />
        <Truong nhan={t('ui1.dkh.email')} gia={c.email} doi={s('email')} />
      </div>
      <NhapDiaChi d={c.dia_chi} doi={(d) => doi({ ...c, dia_chi: d })} tien={t('ui1.dkh.diaChiLienLac')} />
    </div>
  );
}

export default function BangHoi({ hs, doi }: { hs: HoSoDangKy; doi: (f: (h: HoSoDangKy) => HoSoDangKy) => void }) {
  const { t } = useTranslation();
  const dat = <K extends keyof HoSoDangKy>(k: K) => (v: HoSoDangKy[K]) => doi((h) => ({ ...h, [k]: v }));
  const laDn = hs.loai !== 'hkd';
  const coThanhVien = hs.loai === 'tnhh2' || hs.loai === 'ctcp';
  const tenTv = hs.loai === 'ctcp' ? t('ui1.dkh.coDong') : hs.loai === 'tnhh2' ? t('ui1.dkh.thanhVien') : t('ui1.dkh.tvHo');
  const doiTv = (i: number, tv: NguoiGopVon) => doi((h) => ({ ...h, thanh_vien: h.thanh_vien.map((x, j) => (j === i ? tv : x)) }));
  const tongVon = hs.thanh_vien.reduce((s, tv) => s + (tv.von || 0), 0);
  const cshhlTuDong = hs.chu_so_huu_huong_loi.length === 0;
  const dsCshhl = cshhlTuDong ? goiYChuSoHuuHuongLoi(hs) : hs.chu_so_huu_huong_loi;
  const doiCshhl = (i: number, k: keyof ChuSoHuuHuongLoi, v: string) =>
    doi((h) => ({ ...h, chu_so_huu_huong_loi: (h.chu_so_huu_huong_loi.length ? h.chu_so_huu_huong_loi : goiYChuSoHuuHuongLoi(h)).map((x, j) => (j === i ? { ...x, [k]: v } : x)) }));

  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()} aria-label={t('ui1.dkh.bangHoi')}>
      <Nhom tieuDe={t('ui1.dkh.noiNop')}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Truong nhan={t('ui1.dkh.kinhGui')} gia={hs.co_quan} doi={dat('co_quan')} goiY={laDn ? t('ui1.dkh.goiYPhong') : t('ui1.dkh.goiYXa')} />
          <Truong nhan={t('ui1.dkh.diaDanh')} gia={hs.dia_danh} doi={dat('dia_danh')} goiY={t('ui1.dkh.goiYDiaDanh')} />
          <Truong nhan={t('ui1.dkh.ngayKy')} kieu="date" gia={hs.ngay_ky} doi={dat('ngay_ky')} />
        </div>
      </Nhom>

      <Nhom tieuDe={laDn ? t('ui1.dkh.tenCty') : t('ui1.dkh.tenHo')}>
        <Truong nhan={t('ui1.dkh.tenVi')} gia={hs.ten_vi} doi={dat('ten_vi')} ghi={t('ui1.dkh.inHoa')} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Truong nhan={t('ui1.dkh.tenNn')} gia={hs.ten_nuoc_ngoai} doi={dat('ten_nuoc_ngoai')} />
          <Truong nhan={t('ui1.dkh.tenVt')} gia={hs.ten_viet_tat} doi={dat('ten_viet_tat')} />
        </div>
      </Nhom>

      <Nhom tieuDe={laDn ? t('ui1.dkh.truSoCty') : t('ui1.dkh.truSoHo')}>
        <NhapDiaChi d={hs.tru_so} doi={(d) => doi((h) => ({ ...h, tru_so: { ...h.tru_so, ...d } }))} tien={t('ui1.dkh.truSo')} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Truong nhan={t('ui1.dkh.dienThoai')} gia={hs.tru_so.dien_thoai} doi={(v) => doi((h) => ({ ...h, tru_so: { ...h.tru_so, dien_thoai: v } }))} />
          <Truong nhan={t('ui1.dkh.emailNeuCo')} gia={hs.tru_so.email} doi={(v) => doi((h) => ({ ...h, tru_so: { ...h.tru_so, email: v } }))} />
        </div>
        {!laDn && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={hs.hkd_khong_tai_tru_so} onChange={(e) => dat('hkd_khong_tai_tru_so')(e.target.checked)} />
            {t('ui1.dkh.khongTaiTruSo')}
          </label>
        )}
      </Nhom>

      <Nhom tieuDe={t('ui1.dkh.nganh', { so: laDn ? '4' : '3' })}>
        <p className="text-xs text-muted-foreground">
          {t('ui1.dkh.nhapVsic')}
          {!laDn && ` ${t('ui1.dkh.hoChiNganhChinh')}`}
        </p>
        {hs.nganh.map((n, i) => (
          <div key={i} className="grid items-end gap-2 sm:grid-cols-[110px_minmax(0,1fr)_auto_auto]">
            <Truong nhan={t('ui1.dkh.maNganh', { n: i + 1 })} gia={n.ma} doi={(v) => doi((h) => ({ ...h, nganh: h.nganh.map((x, j) => (j === i ? { ...x, ma: v.replace(/\D/g, '').slice(0, 4) } : x)) }))} />
            <Truong nhan={t('ui1.dkh.tenNganh')} gia={n.ten} doi={(v) => doi((h) => ({ ...h, nganh: h.nganh.map((x, j) => (j === i ? { ...x, ten: v } : x)) }))} />
            <label className="flex items-center gap-1.5 pb-2 text-sm">
              <input type="radio" name="nganh-chinh" checked={hs.nganh_chinh === i} onChange={() => dat('nganh_chinh')(i)} /> {t('ui1.dkh.nganhChinh')}
            </label>
            <button
              type="button" disabled={hs.nganh.length === 1}
              onClick={() => doi((h) => ({ ...h, nganh: h.nganh.filter((_, j) => j !== i), nganh_chinh: h.nganh_chinh > i ? h.nganh_chinh - 1 : h.nganh_chinh === i ? 0 : h.nganh_chinh }))}
              className="pb-2 text-sm text-destructive disabled:opacity-40"
            >
              {t('ui1.dkh.bo')}
            </button>
          </div>
        ))}
        <button type="button" onClick={() => doi((h) => ({ ...h, nganh: [...h.nganh, { ma: '', ten: '' }] }))} className="text-sm text-primary">+ {t('ui1.dkh.themNganh')}</button>
      </Nhom>

      <Nhom tieuDe={laDn ? t('ui1.dkh.vonDieuLe') : t('ui1.dkh.vonKd4')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Truong nhan={laDn ? t('ui1.dkh.vonDieuLeDong') : t('ui1.dkh.vonKdDong')} gia={hs.von ? soCoDau(hs.von) : ''} doi={(v) => dat('von')(soTien(v))} ghi={hs.von > 0 ? soBangChu(hs.von) : undefined} />
          {hs.loai === 'ctcp' && (
            <Truong nhan={t('ui1.dkh.menhGia')} gia={hs.menh_gia ? soCoDau(hs.menh_gia) : ''} doi={(v) => dat('menh_gia')(soTien(v))} ghi={hs.menh_gia > 0 && hs.von > 0 ? t('ui1.dkh.coPhanPhoThong', { n: soCoDau(Math.floor(hs.von / hs.menh_gia)) }) : undefined} />
          )}
        </div>
        {laDn && <p className="text-xs text-muted-foreground">{t('ui1.dkh.nguonVon')}</p>}
      </Nhom>

      <Nhom tieuDe={laDn ? t('ui1.dkh.daiDien') : t('ui1.dkh.chuHo')}>
        <NhapCaNhan c={hs.dai_dien} doi={dat('dai_dien')} ten={laDn ? t('ui1.dkh.nguoiDaiDien') : t('ui1.dkh.chuHoThuong')} />
        {laDn && <Truong nhan={t('ui1.dkh.chucDanh')} gia={hs.chuc_danh} doi={dat('chuc_danh')} goiY={t('ui1.dkh.goiYChucDanh')} />}
        {hs.loai === 'tnhh1' && (
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">{t('ui1.dkh.moHinh1tv')}</p>
            {([['chu_tich', t('ui1.dkh.mhChuTich')], ['hdtv', t('ui1.dkh.mhHdtv')]] as const).map(([k, ten]) => (
              <label key={k} className="flex items-center gap-2"><input type="radio" name="mo-hinh" checked={hs.mo_hinh_1tv === k} onChange={() => dat('mo_hinh_1tv')(k)} /> {ten}</label>
            ))}
          </div>
        )}
      </Nhom>

      {(coThanhVien || hs.loai === 'hkd') && (
        <Nhom tieuDe={hs.loai === 'hkd' ? t('ui1.dkh.tvHoTieuDe') : t('ui1.dkh.dsTv', { ten: tenTv })}>
          {hs.thanh_vien.map((tv, i) => (
            <div key={i} className="space-y-3 rounded-lg border border-border/70 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{tenTv.charAt(0).toUpperCase() + tenTv.slice(1)} {i + 1}</p>
                <button type="button" onClick={() => doi((h) => ({ ...h, thanh_vien: h.thanh_vien.filter((_, j) => j !== i) }))} className="text-sm text-destructive">{t('ui1.dkh.bo')}</button>
              </div>
              <NhapCaNhan c={tv} doi={(c) => doiTv(i, c)} ten={tenTv} />
              {coThanhVien && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Truong nhan={t('ui1.dkh.giaTriVon')} gia={tv.von ? soCoDau(tv.von) : ''} doi={(v) => doiTv(i, { ...tv, von: soTien(v) })} ghi={tongVon > 0 && tv.von > 0 ? t('ui1.dkh.tyLeVon', { pt: Math.round((tv.von / tongVon) * 10000) / 100 }) : undefined} />
                  <Truong nhan={t('ui1.dkh.ngayCap')} kieu="date" gia={tv.ngay_cap} doi={(v) => doiTv(i, { ...tv, ngay_cap: v })} />
                  <Truong nhan={t('ui1.dkh.noiCap')} gia={tv.noi_cap} doi={(v) => doiTv(i, { ...tv, noi_cap: v })} />
                </div>
              )}
            </div>
          ))}
          <button type="button" onClick={() => doi((h) => ({ ...h, thanh_vien: [...h.thanh_vien, nguoiGopVonRong()] }))} className="text-sm text-primary">+ {t('ui1.dkh.them', { ten: tenTv })}</button>
          {coThanhVien && (
            <>
              <Truong nhan={t('ui1.dkh.thoiHanGop')} gia={hs.thoi_han_gop} doi={dat('thoi_han_gop')} />
              <p className="text-xs text-muted-foreground">{t('ui1.dkh.toChuc')}</p>
            </>
          )}
        </Nhom>
      )}

      <Nhom tieuDe={laDn ? t('ui1.dkh.dkThue') : t('ui1.dkh.dkThue5')}>
        {laDn && (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hs.giam_doc_la_dai_dien} onChange={(e) => dat('giam_doc_la_dai_dien')(e.target.checked)} />
              {t('ui1.dkh.gdLaDaiDien')}
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <Truong nhan={t('ui1.dkh.keToan')} gia={hs.ke_toan.ho_ten} doi={(v) => doi((h) => ({ ...h, ke_toan: { ...h.ke_toan, ho_ten: v } }))} />
              <Truong nhan={t('ui1.dkh.soDdKeToan')} gia={hs.ke_toan.so_dinh_danh} doi={(v) => doi((h) => ({ ...h, ke_toan: { ...h.ke_toan, so_dinh_danh: v.replace(/\D/g, '').slice(0, 12) } }))} />
              <Truong nhan={t('ui1.dkh.dtKeToan')} gia={hs.ke_toan.dien_thoai} doi={(v) => doi((h) => ({ ...h, ke_toan: { ...h.ke_toan, dien_thoai: v } }))} />
            </div>
          </>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <Truong nhan={t('ui1.dkh.ngayBatDau')} kieu="date" gia={hs.ngay_bat_dau} doi={dat('ngay_bat_dau')} />
          <Truong nhan={t('ui1.dkh.soLaoDong')} gia={hs.so_lao_dong} doi={(v) => dat('so_lao_dong')(v.replace(/\D/g, ''))} />
          {laDn && <Truong nhan={t('ui1.dkh.namTaiChinh')} gia={`${hs.nam_tai_chinh_tu} - ${hs.nam_tai_chinh_den}`} doi={(v) => { const [a = '', b = ''] = v.split('-').map((x) => x.trim()); doi((h) => ({ ...h, nam_tai_chinh_tu: a, nam_tai_chinh_den: b })); }} ghi={t('ui1.dkh.namDuongLich')} />}
        </div>
        {laDn ? (
          <>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground">{t('ui1.dkh.ppGtgt')}</span>
              <select value={hs.gtgt} onChange={(e) => dat('gtgt')(e.target.value as HoSoDangKy['gtgt'])} className={O}>
                <option value="khau_tru">{t('ui1.dkh.o_khau_tru')}</option>
                <option value="truc_tiep_gtgt">{t('ui1.dkh.o_truc_tiep_gtgt')}</option>
                <option value="truc_tiep_doanh_so">{t('ui1.dkh.o_truc_tiep_doanh_so')}</option>
                <option value="khong_nop">{t('ui1.dkh.o_khong_nop')}</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground">{t('ui1.dkh.ptBhxh')}</span>
              <select value={hs.bhxh} onChange={(e) => dat('bhxh')(e.target.value as HoSoDangKy['bhxh'])} className={O}>
                <option value="hang_thang">{t('ui1.dkh.o_hang_thang')}</option>
                <option value="ba_thang">{t('ui1.dkh.o_ba_thang')}</option>
                <option value="sau_thang">{t('ui1.dkh.o_sau_thang')}</option>
              </select>
              <span className="mt-0.5 block text-xs text-muted-foreground">{t('ui1.dkh.bhxhGhi')}</span>
            </label>
          </>
        ) : (
          <div className="flex flex-wrap gap-4 text-sm" role="radiogroup" aria-label={t('ui1.dkh.ppGtgt')}>
            {([['ke_khai', t('ui1.dkh.ppKeKhai')], ['khoan', t('ui1.dkh.ppKhoan')]] as const).map(([k, ten]) => (
              <label key={k} className="flex items-center gap-2"><input type="radio" name="hkd-gtgt" checked={hs.hkd_gtgt === k} onChange={() => dat('hkd_gtgt')(k)} /> {ten}</label>
            ))}
            {hs.hkd_gtgt === 'khoan' && <p role="alert" className="w-full text-amber-700 dark:text-amber-400">{t('ui1.dkh.khoanBo')}</p>}
          </div>
        )}
      </Nhom>

      {laDn && (
        <Nhom tieuDe={t('ui1.dkh.cshhl')}>
          <p className="text-xs text-muted-foreground">
            {cshhlTuDong
              ? t('ui1.dkh.cshhlGoiY')
              : t('ui1.dkh.cshhlTuQuanLy')}
          </p>
          {dsCshhl.length === 0 && <p className="text-sm text-muted-foreground">{t('ui1.dkh.chuaAi25')}</p>}
          {dsCshhl.map((c, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-border/70 p-3 sm:grid-cols-4">
              <p className="text-sm font-medium text-foreground sm:col-span-4">{c.ho_ten || t('ui1.dkh.nguoiN', { n: i + 1 })} — {t('ui1.dkh.trucTiep', { pt: c.ty_le_von_truc_tiep || c.ty_le_cp_truc_tiep })}</p>
              <Truong nhan={t('ui1.dkh.tyLeGianTiep')} gia={hs.loai === 'ctcp' ? c.ty_le_cp_gian_tiep : c.ty_le_von_gian_tiep} doi={(v) => doiCshhl(i, hs.loai === 'ctcp' ? 'ty_le_cp_gian_tiep' : 'ty_le_von_gian_tiep', v)} />
              <Truong nhan={t('ui1.dkh.kiemSoat')} gia={c.kiem_soat} doi={(v) => doiCshhl(i, 'kiem_soat', v)} />
              <Truong nhan={t('ui1.dkh.nguoiQuanLy')} gia={c.nguoi_quan_ly} doi={(v) => doiCshhl(i, 'nguoi_quan_ly', v)} />
            </div>
          ))}
          {!cshhlTuDong && (
            <button type="button" onClick={() => dat('chu_so_huu_huong_loi')([])} className="text-sm text-primary">{t('ui1.dkh.troLaiGoiY')}</button>
          )}
        </Nhom>
      )}
    </form>
  );
}
