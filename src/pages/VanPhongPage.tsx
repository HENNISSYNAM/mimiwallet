/**
 * VĂN PHÒNG KẾ TOÁN (/dashboard/van-phong, 11/11/2026).
 *
 * Kế toán dịch vụ làm sổ cho nhiều hộ kinh doanh. Trang này cho thấy cả văn phòng một lúc: mỗi khách một bàn có đèn
 * (đỏ / vàng / xanh, do máy chủ xét), các mèo agent của MIMI đứng ở bàn khách chúng đang làm, và một hàng chờ duyệt
 * gom mọi việc cần người quyết. Bấm bàn → bảng số của khách + nút mở đúng trang làm việc.
 *
 * Ba chế độ: 3D (tải lười, chỉ khi máy vẽ được WebGL và người dùng không xin giảm chuyển động), lưới 2D, danh sách.
 * Số liệu do edge function `van-phong` tính; ở đây chỉ hiện.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { goiDanhMucKhach, type DanhMucKhach } from '@/lib/goiVanPhong';
import { chonCongTy } from '@/lib/congTyDangDung';
import { AGENT, MAU_DEN, chu, ngonNguTu } from '@/components/van-phong/chu';
import { coWebGL, giamChuyenDong } from '@/components/van-phong/kiemMay';
import { BangKhach, DanhSach, HangDuyet, LuoiBan, MeoNho } from '@/components/van-phong/CacCheDo';
import { DUONG, type LoaiHanhDong } from '@/components/van-phong/hanhDong';

const VanPhong3D = lazy(() => import('@/components/van-phong/VanPhong3D'));

type CheDo = '3d' | 'luoi' | 'ds';
const KHOA_CHE_DO = 'mimi:van-phong:che-do';
const KICH_THUOC = 24;

export default function VanPhongPage() {
  const { i18n } = useTranslation();
  const n = ngonNguTu(i18n.language);
  const c = chu(n);
  const navigate = useNavigate();
  const [webgl] = useState(coWebGL);
  const [giam] = useState(giamChuyenDong);
  const [cheDo, setCheDo] = useState<CheDo>(() => {
    let luu: string | null = null;
    try { luu = localStorage.getItem(KHOA_CHE_DO); } catch { /* không lưu được: dùng mặc định */ }
    if (luu === 'ds' || luu === 'luoi') return luu;
    if (luu === '3d' && webgl) return '3d';
    return webgl && !giam ? '3d' : 'luoi';
  });
  const [trang, setTrang] = useState(1);
  const [du, setDu] = useState<DanhMucKhach | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangTai, setDangTai] = useState(true);
  const [chon, setChon] = useState<string | null>(null);

  const tai = useCallback(async (t: number) => {
    setDangTai(true); setLoi(null);
    try { setDu(await goiDanhMucKhach({ trang: t, kich_thuoc: KICH_THUOC })); }
    catch (e) { setLoi(e instanceof Error ? e.message : c.loi); }
    finally { setDangTai(false); }
  }, [c.loi]);
  useEffect(() => { void tai(trang); }, [tai, trang]);

  const doiCheDo = (m: CheDo) => {
    setCheDo(m);
    try { localStorage.setItem(KHOA_CHE_DO, m); } catch { /* bỏ qua */ }
  };
  const diToi = useCallback((khachId: string, viec: LoaiHanhDong) => {
    chonCongTy(khachId);
    navigate(DUONG[viec]);
  }, [navigate]);

  const khach = useMemo(() => du?.khach ?? [], [du]);
  const agent = useMemo(() => du?.agent ?? [], [du]);
  const kChon = khach.find((k) => k.id === chon) ?? null;
  const ten = (id: string | null) => khach.find((k) => k.id === id)?.ten ?? null;
  const hien3d = cheDo === '3d' && webgl;

  const NutCheDo = ({ m, nhan, tat }: { m: CheDo; nhan: string; tat?: boolean }) => (
    <button type="button" disabled={tat} aria-pressed={cheDo === m} onClick={() => doiCheDo(m)}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-40 ${cheDo === m ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
      {nhan}
    </button>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{c.tieuDe}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{c.moTa}</p>
        </div>
        <div role="group" aria-label={c.tieuDe} className="flex gap-1 rounded-xl bg-muted p-1">
          <NutCheDo m="3d" nhan={c.che3d} tat={!webgl} />
          <NutCheDo m="luoi" nhan={c.cheLuoi} />
          <NutCheDo m="ds" nhan={c.cheDs} />
        </div>
      </header>

      {du && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium text-foreground">{c.khachSo(du.tong)}</span>
          {(['do', 'vang', 'xanh'] as const).map((m) => (
            <span key={m} className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5" data-testid={`dem-${m}`}>
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: MAU_DEN[m] }} />{c.den[m]} · {du.dem[m]}
            </span>
          ))}
        </div>
      )}

      {!webgl && cheDo !== 'ds' && <p className="rounded-xl bg-muted px-4 py-2 text-sm text-muted-foreground" role="status">{c.khongWebgl}</p>}
      {webgl && giam && cheDo === 'luoi' && <p className="rounded-xl bg-muted px-4 py-2 text-sm text-muted-foreground" role="status">{c.giamChuyenDong}</p>}

      {dangTai && !du && <p className="text-sm text-muted-foreground" role="status">{c.dangTai}</p>}
      {loi && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm" role="alert">
          {loi} <button type="button" className="ml-2 font-medium underline" onClick={() => void tai(trang)}>{c.taiLai}</button>
        </div>
      )}
      {du && du.tong === 0 && <p className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">{c.rong}</p>}

      {du && khach.length > 0 && (
        <>
          {hien3d && (
            <div className="relative h-[520px] overflow-hidden rounded-2xl border bg-slate-100" role="img" aria-label={c.che3d}>
              <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">{c.dangTai}</p>}>
                <VanPhong3D khach={khach} agent={agent} chon={chon} onChon={setChon} />
              </Suspense>
            </div>
          )}
          {cheDo === 'luoi' || (cheDo === '3d' && !webgl) ? <LuoiBan khach={khach} agent={agent} n={n} chon={chon} onChon={setChon} /> : null}
          {cheDo === 'ds' && <DanhSach khach={khach} n={n} onChon={setChon} />}

          <section aria-label="agents" className="flex flex-wrap gap-x-5 gap-y-2 rounded-2xl border bg-card p-4 text-sm">
            {agent.map((a) => {
              const t = ten(a.company_id);
              return (
                <span key={a.agent} className="inline-flex flex-wrap items-center gap-2" data-testid={`agent-${a.agent}`}>
                  <MeoNho a={a} n={n} />
                  <span className="text-muted-foreground">
                    {a.company_id === null ? c.agentNghi
                      : `${a.ly_do === 'su_kien_24h' ? c.agentDangO : c.agentChoViec} ${t ?? ''}${t ? '' : c.agentTrangKhac}`}
                  </span>
                </span>
              );
            })}
            <span className="sr-only">{Object.values(AGENT).map((m) => m.viec[n]).join('; ')}</span>
          </section>

          <HangDuyet khach={khach} n={n} diToi={diToi} />

          {du.so_trang > 1 && (
            <nav className="flex items-center justify-center gap-3 text-sm" aria-label={c.trang(du.trang, du.so_trang)}>
              <button type="button" className="rounded-lg border px-3 py-1.5 disabled:opacity-40" disabled={du.trang <= 1} onClick={() => setTrang(du.trang - 1)}>{c.truoc}</button>
              <span>{c.trang(du.trang, du.so_trang)}</span>
              <button type="button" className="rounded-lg border px-3 py-1.5 disabled:opacity-40" disabled={du.trang >= du.so_trang} onClick={() => setTrang(du.trang + 1)}>{c.sau}</button>
            </nav>
          )}
        </>
      )}

      {du && du.loai_tru.gioi_han_co_so > 0 && <p className="text-xs text-muted-foreground">{c.loaiTruCoSo(du.loai_tru.gioi_han_co_so)}</p>}
      {du && du.loai_tru.vuot_tran > 0 && <p className="text-xs text-muted-foreground">{c.vuotTran(du.loai_tru.vuot_tran)}</p>}

      {kChon && <BangKhach k={kChon} agent={agent} n={n} onDong={() => setChon(null)} diToi={diToi} />}
    </div>
  );
}
