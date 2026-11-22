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
import { chapNhanDeXuat, goiDanhMucKhach, type DanhMucKhach, type DeXuat, type TenAgentVP } from '@/lib/goiVanPhong';
import { chonCongTy } from '@/lib/congTyDangDung';
import { AGENT, MAU_DEN, chu, ngonNguTu } from '@/components/van-phong/chu';
import { coWebGL, giamChuyenDong } from '@/components/van-phong/kiemMay';
import { BangKhach, DanhSach, LuoiBan, MeoNho } from '@/components/van-phong/CacCheDo';
import { DUONG, type LoaiHanhDong } from '@/components/van-phong/hanhDong';
import HangDuyetCursor from '@/components/van-phong/HangDuyetCursor';
import { useNangLuong } from '@/components/mimi/ThanhNangLuong';
import { AGENT_CUA, conLai, mauBan, viTriAgent } from '@/components/van-phong/hangDuyet';

/** Việc đã "bỏ qua" chỉ nhớ trong phiên trình duyệt này: bỏ qua không ghi gì lên máy chủ. */
const KHOA_BO_QUA = 'mimi:van-phong:bo-qua';
const docBoQua = (): string[] => {
  try { const v = JSON.parse(sessionStorage.getItem(KHOA_BO_QUA) ?? '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; }
  catch { return []; }
};

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

  const [daXong, setDaXong] = useState<Set<string>>(() => new Set(docBoQua()));
  const [dangGhi, setDangGhi] = useState<Set<string>>(() => new Set());
  const [loiDuyet, setLoiDuyet] = useState<Record<string, string>>({});
  // Mèo của việc vừa được duyệt nhảy mừng 1,6 giây trong cảnh 3D.
  const [vui, setVui] = useState<{ agent: TenAgentVP; den: number } | null>(null);
  // Hết xu tháng này → agent AI tạm nghỉ: mèo ngủ trong cảnh 3D. Chưa đọc được số dư thì KHÔNG coi là hết.
  const { nangLuong } = useNangLuong();
  const hetXu = nangLuong?.muc === 'het';

  const tai = useCallback(async (t: number, im = false) => {
    if (!im) { setDangTai(true); setLoi(null); }
    try { setDu(await goiDanhMucKhach({ trang: t, kich_thuoc: KICH_THUOC })); }
    catch (e) { if (!im) setLoi(e instanceof Error ? e.message : c.loi); }
    finally { if (!im) setDangTai(false); }
  }, [c.loi]);

  /** Chấp nhận: máy chủ ghi quyết định của người (xem `chapNhanDeXuat`), rồi đọc lại số thật. */
  const chapNhan = useCallback(async (ds: DeXuat[]) => {
    const khoa = ds.map((d) => d.khoa);
    setDangGhi((s) => new Set([...s, ...khoa]));
    const kq = await chapNhanDeXuat(ds);
    setDangGhi((s) => { const m = new Set(s); khoa.forEach((k) => m.delete(k)); return m; });
    setDaXong((s) => new Set([...s, ...kq.xong]));
    const xong = ds.find((d) => kq.xong.includes(d.khoa));
    if (xong) setVui({ agent: AGENT_CUA[xong.loai], den: Date.now() + 1600 });
    setLoiDuyet((l) => {
      const m = { ...l };
      kq.xong.forEach((k) => delete m[k]);
      kq.loi.forEach((e) => e.khoa.forEach((k) => { m[k] = e.cau; }));
      return m;
    });
    if (kq.xong.length) void tai(trang, true);
  }, [tai, trang]);

  const boQua = useCallback((d: DeXuat) => {
    setDaXong((s) => new Set([...s, d.khoa]));
    try { sessionStorage.setItem(KHOA_BO_QUA, JSON.stringify([...new Set([...docBoQua(), d.khoa])].slice(-500))); } catch { /* bỏ qua */ }
  }, []);
  useEffect(() => { void tai(trang); }, [tai, trang]);

  const doiCheDo = (m: CheDo) => {
    setCheDo(m);
    try { localStorage.setItem(KHOA_CHE_DO, m); } catch { /* bỏ qua */ }
  };
  const diToi = useCallback((khachId: string, viec: LoaiHanhDong) => {
    chonCongTy(khachId);
    navigate(DUONG[viec]);
  }, [navigate]);

  const hangGoc = useMemo(() => du?.hang_duyet ?? [], [du]);
  const hang = useMemo(() => conLai(hangGoc, daXong), [hangGoc, daXong]);
  // Đèn bàn theo hàng duyệt còn lại: hàng của khách sạch thì bàn xanh.
  const khach = useMemo(() => (du?.khach ?? []).map((k) => ({ ...k, muc: mauBan(k, hangGoc, hang) })), [du, hangGoc, hang]);
  // Mèo đứng ở bàn có đề xuất của nó đang chờ.
  // 21/11/2026: bỏ bán tại quầy → Mèo Bán hàng không còn việc; máy chủ vẫn trả về, ở đây lọc đi.
  const agent = useMemo(() => viTriAgent((du?.agent ?? []).filter((a) => a.agent !== 'ban_hang'), hang), [du, hang]);
  const dem = useMemo(() => {
    if (!du) return { do: 0, vang: 0, xanh: 0 };
    const d = { ...du.dem };
    for (const k of du.khach) { const m = khach.find((x) => x.id === k.id)!.muc; if (m !== k.muc) { d[k.muc]--; d[m]++; } }
    return d;
  }, [du, khach]);
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
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: MAU_DEN[m] }} />{c.den[m]} · {dem[m]}
            </span>
          ))}
        </div>
      )}

      {!webgl && cheDo !== 'ds' && <p className="rounded-xl bg-muted px-4 py-2 text-sm text-muted-foreground" role="status">{c.khongWebgl}</p>}
      {webgl && giam && cheDo === 'luoi' && <p className="rounded-xl bg-muted px-4 py-2 text-sm text-muted-foreground" role="status">{c.giamChuyenDong}</p>}

      {hetXu && (
        <p className="rounded-xl border border-border bg-muted px-4 py-2 text-sm text-foreground" role="status">
          {n === 'en'
            ? 'This month’s AI energy is used up, so the agents are asleep. Rule-based checks and the review queue keep working.'
            : 'Năng lượng AI tháng này đã hết nên các agent đang ngủ. Các kiểm tra theo luật và hàng chờ duyệt vẫn chạy.'}
        </p>
      )}
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
            <div className="relative h-[520px] overflow-hidden rounded-2xl border bg-[#efe7dd]" role="img" aria-label={c.che3d}>
              <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">{c.dangTai}</p>}>
                <VanPhong3D khach={khach} agent={agent} chon={chon} onChon={setChon} vui={vui} hetXu={hetXu} />
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

          <HangDuyetCursor hang={hang} khach={khach} n={n} dangGhi={dangGhi} loi={loiDuyet}
            onChapNhan={(ds) => void chapNhan(ds)} onBoQua={boQua} diToi={diToi} onChonKhach={setChon} />

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
