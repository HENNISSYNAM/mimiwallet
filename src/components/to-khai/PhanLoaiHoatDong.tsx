import { useCallback, useEffect, useState } from 'react';
import { Loader2, Tags } from 'lucide-react';
import { toast } from 'sonner';
import { goiToKhai } from '@/lib/goiToKhai';

/**
 * Doanh thu thuộc NHÓM HOẠT ĐỘNG nào — mỗi nhóm là một dòng và một tỷ lệ thuế trên tờ khai.
 *
 * Ngành đăng ký chỉ là gợi ý: MIMI không tự xếp. Hộ chỉ làm một việc thì bấm MỘT nút ("Tất cả là
 * …"); hộ làm nhiều việc thì chọn từng khoản. Mọi lần bấm hoàn tác được. Xem
 * `supabase/functions/_shared/doanh-thu/theo-hoat-dong.ts`.
 */

interface Khoan { id: string; ngay: string; so_tien: number; noi_dung: string }
interface DuLieu {
  nam: number;
  loai: string | null;
  nguon: 'giao_dich' | 'hoa_don' | 'tu_nhap' | null;
  tong: number;
  nhom: Record<string, { so_tien: number; so_khoan: number }> | null;
  chua_ro: { so_tien: number; so_khoan: number; khoan: Khoan[] };
  goi_y: string | null;
  cac_nhom: { ma: string; ten: string }[];
}

const tien = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}đ`;
const TEN_NGUON: Record<string, string> = { giao_dich: 'tiền về ngân hàng', hoa_don: 'hoá đơn điện tử', tu_nhap: 'số bạn tự nhập' };
const HIEN_TRUOC = 8;

export function PhanLoaiHoatDong({ nam, onDaDoi, anKhiXong = false }: { nam: number; onDaDoi?: () => void; anKhiXong?: boolean }) {
  const [dl, setDl] = useState<DuLieu | null>(null);
  const [dang, setDang] = useState<string | null>(null);
  const [nhomChon, setNhomChon] = useState<string>('');
  const [chonKhoan, setChonKhoan] = useState<Record<string, string>>({});
  const [xemHet, setXemHet] = useState(false);

  const tai = useCallback(async () => {
    try {
      const r = (await goiToKhai('hoat_dong', { nam })) as unknown as DuLieu;
      setDl(r);
      setNhomChon((c) => c || r.goi_y || '');
    } catch {
      setDl(null);
    }
  }, [nam]);

  useEffect(() => { void tai(); }, [tai]);

  const xacNhan = async (khoa: string, du: Record<string, unknown>, moTa: string) => {
    if (!dl?.nguon) return;
    setDang(khoa);
    try {
      const r = await goiToKhai('xac_nhan_hoat_dong', { nguon: dl.nguon, nam: dl.nam, ...du });
      toast.success(moTa.replace('{so}', String(r.so)), {
        action: {
          label: 'Hoàn tác',
          onClick: () => {
            void goiToKhai('hoan_tac_hoat_dong', { nhom_hang_loat: r.nhom_hang_loat })
              .then(() => { toast.success('Đã hoàn tác.'); void tai(); onDaDoi?.(); })
              .catch((e) => toast.error(e instanceof Error ? e.message : 'Chưa hoàn tác được.'));
          },
        },
      });
      await tai();
      onDaDoi?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chưa lưu được.');
    } finally {
      setDang(null);
    }
  };

  // Chỉ hộ kinh doanh cần: nhóm hoạt động quyết định dòng trên mẫu 01/CNKD, 01/TKN-CNKD.
  if (!dl || dl.loai !== 'ho_kinh_doanh' || !dl.nguon || dl.tong <= 0) return null;
  if (anKhiXong && dl.chua_ro.so_tien <= 0) return null;

  const ten = (ma: string | null) => dl.cac_nhom.find((n) => n.ma === ma)?.ten ?? '';
  const daXep = Object.entries(dl.nhom ?? {}).filter(([k, o]) => k !== 'chua_ro' && o.so_tien > 0);
  const cr = dl.chua_ro;
  const khoanHien = xemHet ? cr.khoan : cr.khoan.slice(0, HIEN_TRUOC);

  return (
    <section aria-labelledby="nhom-hoat-dong" className="rounded-2xl border border-border bg-card p-5">
      <h3 id="nhom-hoat-dong" className="flex items-center gap-2 text-base font-semibold text-foreground">
        <Tags size={16} aria-hidden /> Doanh thu năm {dl.nam} thuộc nhóm nào
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Theo {TEN_NGUON[dl.nguon]}: {tien(dl.tong)}. Mỗi nhóm là một dòng và một tỷ lệ thuế riêng trên tờ khai.
      </p>

      {!!daXep.length && (
        <ul className="mt-3 space-y-1 text-sm">
          {daXep.map(([k, o]) => (
            <li key={k} className="flex justify-between gap-3">
              <span className="text-foreground">{ten(k)} <span className="text-muted-foreground">· {o.so_khoan} khoản</span></span>
              <span className="tabular-nums text-foreground">{tien(o.so_tien)}</span>
            </li>
          ))}
        </ul>
      )}

      {cr.so_tien > 0 ? (
        <div className="mt-4 rounded-xl border border-mimi-amber/40 bg-mimi-amber/5 p-4">
          <p className="text-sm font-medium text-foreground">
            {tien(cr.so_tien)} ({cr.so_khoan} khoản) chưa xác định nhóm hoạt động.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            MIMI không tự xếp{dl.goi_y ? ` — hồ sơ thuế của bạn đăng ký ${ten(dl.goi_y)}, nhưng đăng ký là việc được phép làm, chưa chắc là việc tạo ra từng khoản tiền` : ''}.
            Chưa xếp xong thì chưa xuất được tờ khai.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {dl.goi_y && (
              <button
                type="button"
                disabled={!!dang}
                onClick={() => void xacNhan('tat_ca_goi_y', { tat_ca_chua_ro: true, hoat_dong: dl.goi_y }, `Đã xếp {so} khoản vào ${ten(dl.goi_y)}.`)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-50"
              >
                {dang === 'tat_ca_goi_y' && <Loader2 size={14} className="animate-spin" />} Tất cả là {ten(dl.goi_y)}
              </button>
            )}
            <label className="sr-only" htmlFor="nhom-tat-ca">Nhóm cho mọi khoản còn lại</label>
            <select
              id="nhom-tat-ca"
              value={nhomChon}
              onChange={(e) => setNhomChon(e.target.value)}
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
            >
              <option value="">Chọn nhóm…</option>
              {dl.cac_nhom.map((n) => <option key={n.ma} value={n.ma}>{n.ten}</option>)}
            </select>
            <button
              type="button"
              disabled={!nhomChon || !!dang}
              onClick={() => void xacNhan('tat_ca_chon', { tat_ca_chua_ro: true, hoat_dong: nhomChon }, `Đã xếp {so} khoản vào ${ten(nhomChon)}.`)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
            >
              {dang === 'tat_ca_chon' && <Loader2 size={14} className="animate-spin" />} Áp cho mọi khoản còn lại
            </button>
          </div>

          {!!cr.khoan.length && (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground">Hoặc xếp từng khoản (lớn nhất trước):</p>
              <ul className="mt-2 divide-y divide-border">
                {khoanHien.map((k) => (
                  <li key={k.id} className="flex flex-wrap items-center gap-2 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">{k.noi_dung}</p>
                      <p className="text-xs text-muted-foreground">{k.ngay}</p>
                    </div>
                    <span className="tabular-nums text-sm text-foreground">{tien(k.so_tien)}</span>
                    <label className="sr-only" htmlFor={`nhom-${k.id}`}>Nhóm của khoản {tien(k.so_tien)}</label>
                    <select
                      id={`nhom-${k.id}`}
                      value={chonKhoan[k.id] ?? dl.goi_y ?? ''}
                      onChange={(e) => setChonKhoan((c) => ({ ...c, [k.id]: e.target.value }))}
                      className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                    >
                      <option value="">Chọn nhóm…</option>
                      {dl.cac_nhom.map((n) => <option key={n.ma} value={n.ma}>{n.ten}</option>)}
                    </select>
                    <button
                      type="button"
                      disabled={!(chonKhoan[k.id] ?? dl.goi_y) || !!dang}
                      onClick={() => {
                        const n = chonKhoan[k.id] ?? dl.goi_y ?? '';
                        void xacNhan(k.id, { ids: [k.id], hoat_dong: n }, `Đã xếp khoản ${tien(k.so_tien)} vào ${ten(n)}.`);
                      }}
                      className="h-9 rounded-lg border border-border px-3 text-sm text-foreground hover:bg-accent disabled:opacity-50"
                    >
                      Xác nhận
                    </button>
                  </li>
                ))}
              </ul>
              {cr.khoan.length > HIEN_TRUOC && !xemHet && (
                <button type="button" onClick={() => setXemHet(true)} className="mt-2 text-sm text-primary hover:underline">
                  Xem thêm {cr.khoan.length - HIEN_TRUOC} khoản
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-foreground">Mọi khoản doanh thu đã có nhóm hoạt động.</p>
      )}
    </section>
  );
}
