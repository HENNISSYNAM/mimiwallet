import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ExternalLink, Info, Loader2, Printer, Save, ScrollText } from 'lucide-react';

import { toast } from 'sonner';
import logoDichVuCong from '@/assets/logos/dich-vu-cong-tai-chinh.png';
import { DUONG_DAN_NOP_TO_KHAI, goiToKhai, type CongTyTheoMst, type KetQuaPhanTich } from '@/lib/goiToKhai';
import {
  KENH, NHOM_NGANH, TEN_KENH, TEN_NGUON_DOANH_THU, TEN_NHOM_NGANH,
  type CanCuDaKiem, type HoSoThue, type Kenh, type KyToKhai, type LoaiNguoiNop, type NhomNganh, type ToKhai,
} from '@/lib/heLuat';

/**
 * Tờ khai thuế — chỗ công nghệ lõi của MIMI hiện ra thành giấy tờ hành chính.
 *
 * Hai lớp, đọc từ trên xuống:
 *   1. Hồ sơ thuế — vài điều chỉ người dùng biết (nhóm ngành, bán ở đâu). Điều mã số thuế đã
 *      trả lời — tên đăng ký, hộ hay doanh nghiệp, cơ quan thuế — thì chỉ hiện, không hỏi lại.
 *   2. Bản nháp tờ khai — đúng mẫu 01/TKN-CNKD hoặc 01/CNKD kèm Thông tư 50/2026, in được.
 *
 * Chuỗi suy luận kèm căn cứ không bày ở đây nữa: người dùng hỏi MIMI Assistant thì MIMI trả lời
 * (năng lực nghia_vu_thue), để trang này chỉ còn việc cần làm.
 *
 * MIMI không nộp thay: nút cuối mở Cổng dịch vụ công của cơ quan thuế để người dùng tự nộp.
 */

const so = (n: number | null | undefined) => (n === null || n === undefined ? '' : new Intl.NumberFormat('vi-VN').format(n));
const ngay = (ymd: string) => ymd.slice(0, 10).split('-').reverse().join('/');
const nhanKy = (ky: KyToKhai) => (ky.loai === 'quy' ? `Quý ${ky.quy}/${ky.nam}` : ky.loai === '6_thang_dau' ? `6 tháng đầu ${ky.nam}` : `Năm ${ky.nam}`);
const cungKy = (a: KyToKhai, b: KyToKhai) => a.loai === b.loai && a.nam === b.nam && (a.loai !== 'quy' || b.loai !== 'quy' || a.quy === b.quy);

function GiayToKhai({ tk, canCu }: { tk: ToKhai; canCu: CanCuDaKiem[] }) {
  const oCot = (khoa: string) => tk.cot.find((c) => c.khoa === khoa);
  return (
    <div className="to-khai-giay rounded-2xl border border-border bg-white p-5 text-[13px] text-slate-900 shadow-sm sm:p-8">
      <div className="mb-4 text-right text-[11px] leading-snug text-slate-600">
        <p className="font-semibold text-slate-900">Mẫu số: {tk.mau}</p>
        <p>({tk.kem_theo})</p>
      </div>
      <div className="text-center">
        <p className="font-semibold uppercase">Cộng hoà xã hội chủ nghĩa Việt Nam</p>
        <p className="font-semibold">Độc lập - Tự do - Hạnh phúc</p>
        <h2 className="mt-4 text-base font-bold uppercase">{tk.tieu_de}</h2>
        <p className="mx-auto mt-1 max-w-2xl text-[11px] italic text-slate-600">{tk.ap_dung}</p>
      </div>

      <ul className="mt-4 space-y-1">
        {tk.danh_dau.map((d) => (
          <li key={d.nhan} className="flex gap-2">
            <span aria-hidden>{d.chon ? '☑' : '☐'}</span>
            <span className="flex-1">{d.nhan}</span>
            <span className="sr-only">{d.chon ? 'đã chọn' : 'không chọn'}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 grid gap-x-4 gap-y-1 sm:grid-cols-2">
        {tk.chi_tieu.map((c) => (
          <div key={c.ma} className="flex gap-2">
            <dt className="text-slate-600">{c.ma} {c.nhan}:</dt>
            <dd className="font-medium">{c.gia_tri ?? '……'}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-5 font-semibold">{tk.phan_a}</p>
      <p className="text-[11px] italic text-slate-600">{tk.don_vi_tien}</p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-[12px]">
          <caption className="sr-only">{tk.phan_a} — {tk.ky_chu}</caption>
          <thead>
            <tr className="bg-slate-50">
              <th scope="col" className="border border-slate-300 px-2 py-1 text-left">STT</th>
              <th scope="col" className="border border-slate-300 px-2 py-1 text-left">Chỉ tiêu</th>
              <th scope="col" className="border border-slate-300 px-2 py-1 text-left">Mã chỉ tiêu</th>
              <th scope="col" className="border border-slate-300 px-2 py-1 text-center" colSpan={4}>Thuế GTGT</th>
              <th scope="col" className="border border-slate-300 px-2 py-1 text-center" colSpan={3}>Thuế TNCN</th>
            </tr>
            <tr className="bg-slate-50">
              <th scope="col" className="border border-slate-300 px-2 py-1" />
              <th scope="col" className="border border-slate-300 px-2 py-1" />
              <th scope="col" className="border border-slate-300 px-2 py-1" />
              {tk.cot.map((c) => (
                <th key={c.khoa} scope="col" className="border border-slate-300 px-2 py-1 text-left font-medium">
                  {c.ma ? `${c.ma} ` : ''}{c.nhan}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tk.dong.map((d, i) => (
              <tr key={`${d.ma ?? 'x'}-${i}`} className={d.la_tong ? 'font-semibold' : ''}>
                <td className="border border-slate-300 px-2 py-1 align-top">{d.stt}</td>
                <td className={`border border-slate-300 px-2 py-1 align-top ${d.cap === 1 ? 'pl-4' : ''}`}>{d.nhan}</td>
                <td className="border border-slate-300 px-2 py-1 align-top whitespace-nowrap">{d.ma ?? ''}</td>
                {tk.cot.map((c) => (
                  <td key={c.khoa} className="border border-slate-300 px-2 py-1 text-right tabular-nums">{so(d.o[c.khoa])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!!tk.ghi_chu_mau.length && (
        <div className="mt-3 text-[11px] leading-relaxed text-slate-600">
          <p className="font-semibold">Ghi chú:</p>
          {tk.ghi_chu_mau.map((g) => <p key={g}>- {g}</p>)}
        </div>
      )}

      <p className="mt-5 text-[12px] italic">Tôi cam đoan những nội dung kê khai trên là đúng và chịu trách nhiệm trước pháp luật về những nội dung đã khai./.</p>
      <div className="mt-6 flex flex-col items-end text-center text-[12px]">
        <div>
          <p>....., ngày ..... tháng ....... năm ......</p>
          <p className="font-semibold uppercase">Người nộp thuế hoặc</p>
          <p className="font-semibold uppercase">Đại diện hợp pháp của người nộp thuế</p>
          <p className="italic">(Ký, ghi rõ họ tên/ Ký điện tử)</p>
        </div>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-3 text-[11px] text-slate-600">
        <p className="font-semibold text-slate-900">Căn cứ MIMI dùng cho tờ khai này</p>
        <ul className="mt-1 space-y-0.5">
          {canCu.filter((c) => tk.can_cu.includes(c.id)).map((c) => (
            <li key={c.id}>
              {c.van_ban} · {c.vi_tri} — {c.y}{c.da_doi_chieu ? '' : ' (chưa đối chiếu được với kho)'}
              {c.hieu_luc?.trang_thai !== 'chua_ghi_nhan_bai_bo' && <strong> — {c.nhan_hieu_luc}</strong>}
            </li>
          ))}
        </ul>
        <p className="mt-2">Đơn vị tiền ở bảng trên: {oCot('tong_dt') ? 'đồng Việt Nam' : 'đồng'}. Bản nháp do MIMI soạn, không thay trách nhiệm khai thuế của người nộp thuế.</p>
      </div>
    </div>
  );
}

const TEN_LOAI: Record<LoaiNguoiNop, string> = { ho_kinh_doanh: 'Hộ kinh doanh', doanh_nghiep: 'Doanh nghiệp' };

/**
 * Điều Tổng cục Thuế ghi cho mã số thuế — hiện ra để người dùng thấy MIMI đã biết, thay vì hỏi.
 * Mã không còn hoạt động thì nói thẳng: khai bằng một mã đã đóng là khai cho người không tồn tại.
 */
function TheoDangKyThue({ ct }: { ct: CongTyTheoMst }) {
  const t = ct.theo_mst;
  if (!ct.mst) return <p className="mt-1 text-sm text-muted-foreground">Chưa có mã số thuế — <Link to="/dashboard/settings" className="font-medium text-primary hover:underline">thêm trong Cài đặt</Link> để MIMI tự điền tên và loại hình.</p>;
  return (
    <div className="mt-1 space-y-1 text-sm">
      <p className="text-muted-foreground">
        {ct.ten ?? 'Công ty của bạn'} · MST {ct.mst}
        {ct.loai_theo_mst ? ` · ${TEN_LOAI[ct.loai_theo_mst]}` : ''}
        {t?.co_quan_thue ? ` · ${t.co_quan_thue}` : ''}
      </p>
      {t?.dia_chi && <p className="text-xs text-muted-foreground">{t.dia_chi}</p>}
      <p className="text-xs text-muted-foreground/80">
        {t ? 'Theo dữ liệu đăng ký thuế của Tổng cục Thuế.' : ct.loai_theo_mst ? 'Mã 12 số là số định danh cá nhân — dành cho hộ kinh doanh, cá nhân.' : ''}
      </p>
      {t && !t.con_hoat_dong && (
        <p className="flex gap-2 text-sm text-destructive"><AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden /> Tổng cục Thuế ghi mã này: “{t.trang_thai ?? 'không rõ trạng thái'}”. Kiểm lại mã số thuế trong Cài đặt trước khi khai.</p>
      )}
    </div>
  );
}

function FormHoSo({ hoSo, onLuu, dangLuu, loaiTheoMst }: { hoSo: HoSoThue; onLuu: (h: HoSoThue) => void; dangLuu: boolean; loaiTheoMst: LoaiNguoiNop | null }) {
  const [v, setV] = useState<HoSoThue>(hoSo);
  useEffect(() => setV(hoSo), [hoSo]);
  const doi = (p: Partial<HoSoThue>) => setV((x) => ({ ...x, ...p }));
  const doiNganh = (n: NhomNganh) =>
    doi({ nhom_nganh: v.nhom_nganh.includes(n) ? v.nhom_nganh.filter((x) => x !== n) : [...v.nhom_nganh, n] });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => { e.preventDefault(); onLuu(v); }}
    >
      {/* Mã số thuế đã trả lời câu này thì không hỏi lại. */}
      {!loaiTheoMst && <fieldset>
        <legend className="text-sm font-medium text-foreground">Bạn nộp thuế với tư cách</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {([['ho_kinh_doanh', 'Hộ kinh doanh / cá nhân kinh doanh'], ['doanh_nghiep', 'Doanh nghiệp']] as const).map(([k, ten]) => (
            <label key={k} className={`cursor-pointer rounded-xl border px-3 py-2 text-sm ${v.loai_nguoi_nop === k ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground'}`}>
              <input type="radio" name="loai" className="sr-only" checked={v.loai_nguoi_nop === k} onChange={() => doi({ loai_nguoi_nop: k })} />
              {ten}
            </label>
          ))}
        </div>
      </fieldset>}

      {v.loai_nguoi_nop !== 'doanh_nghiep' && (
        <>
          <fieldset>
            <legend className="text-sm font-medium text-foreground">Nhóm ngành kinh doanh</legend>
            <p className="text-xs text-muted-foreground">Tỷ lệ thuế và dòng trên tờ khai theo nhóm ngành. Chọn đúng nhóm bạn có doanh thu.</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {NHOM_NGANH.map((n) => (
                <label key={n} className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-sm ${v.nhom_nganh.includes(n) ? 'border-primary bg-primary/10' : 'border-border'}`}>
                  <input type="checkbox" checked={v.nhom_nganh.includes(n)} onChange={() => doiNganh(n)} className="mt-0.5" />
                  <span className="leading-snug">{TEN_NHOM_NGANH[n]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-foreground">Bạn bán ở đâu</legend>
            <div className="mt-2 space-y-2">
              {KENH.map((k: Kenh) => (
                <label key={k} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${v.kenh === k ? 'border-primary bg-primary/10' : 'border-border'}`}>
                  <input type="radio" name="kenh" checked={v.kenh === k} onChange={() => doi({ kenh: k })} />
                  <span>{TEN_KENH[k]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-foreground">Cách tính thuế thu nhập cá nhân</legend>
            <p className="text-xs text-muted-foreground">Chỉ cần chọn khi doanh thu năm trên 01 tỷ đến 03 tỷ đồng; trên 03 tỷ thì luật buộc tính trên thu nhập.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {([['doanh_thu', 'Theo tỷ lệ trên doanh thu'], ['thu_nhap', 'Theo thu nhập (doanh thu trừ chi phí)']] as const).map(([k, ten]) => (
                <label key={k} className={`cursor-pointer rounded-xl border px-3 py-2 text-sm ${v.phuong_phap_tncn === k ? 'border-primary bg-primary/10' : 'border-border text-muted-foreground'}`}>
                  <input type="radio" name="pp" className="sr-only" checked={v.phuong_phap_tncn === k} onChange={() => doi({ phuong_phap_tncn: k })} />
                  {ten}
                </label>
              ))}
              <button type="button" onClick={() => doi({ phuong_phap_tncn: null })} className="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent">
                Chưa chọn
              </button>
            </div>
          </fieldset>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={!!v.da_nop_thue_trong_nam} onChange={(e) => doi({ da_nop_thue_trong_nam: e.target.checked })} />
            Trong năm tôi đã nộp thuế GTGT hoặc TNCN (hoặc bị khấu trừ, nộp thay)
          </label>
        </>
      )}

      {v.loai_nguoi_nop === 'doanh_nghiep' && (
        <>
          <label className="block text-sm">
            <span className="font-medium text-foreground">Tổng doanh thu năm trước (theo quyết toán thuế TNDN)</span>
            <input
              type="number"
              min={0}
              step={1}
              value={v.doanh_thu_nam_truoc ?? ''}
              onChange={(e) => doi({ doanh_thu_nam_truoc: e.target.value === '' ? null : Math.max(0, Math.floor(Number(e.target.value))) })}
              className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 text-sm tabular-nums"
              aria-label="Tổng doanh thu năm trước"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={!!v.co_quan_he_lien_ket} onChange={(e) => doi({ co_quan_he_lien_ket: e.target.checked })} />
            Công ty là công ty con hoặc có quan hệ liên kết với doanh nghiệp khác
          </label>
        </>
      )}

      <label className="block text-sm">
        <span className="font-medium text-foreground">Ngày bắt đầu kinh doanh (nếu mới ra kinh doanh)</span>
        <input
          type="date"
          value={v.bat_dau_kinh_doanh ?? ''}
          onChange={(e) => doi({ bat_dau_kinh_doanh: e.target.value || null })}
          className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 text-sm sm:w-56"
          aria-label="Ngày bắt đầu kinh doanh"
        />
      </label>

      <button
        type="submit"
        disabled={dangLuu}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-50"
      >
        {dangLuu ? <Loader2 size={15} className="animate-spin" /> : null} Lưu hồ sơ thuế
      </button>
    </form>
  );
}

export default function ToKhaiPage() {
  const [kq, setKq] = useState<KetQuaPhanTich | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangTai, setDangTai] = useState(true);
  const [dangLuuHoSo, setDangLuuHoSo] = useState(false);
  const [dangLuuNhap, setDangLuuNhap] = useState(false);
  const [suaDoanhThu, setSuaDoanhThu] = useState<string[] | null>(null);

  const tai = useCallback(async (du: Record<string, unknown> = {}) => {
    setDangTai(true);
    try {
      setKq(await goiToKhai('phan_tich', du) as unknown as KetQuaPhanTich);
      setLoi(null);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Chưa đọc được dữ liệu thuế.');
    } finally {
      setDangTai(false);
    }
  }, []);

  useEffect(() => { void tai(); }, [tai]);

  const luuHoSo = async (ho_so: HoSoThue) => {
    setDangLuuHoSo(true);
    try {
      await goiToKhai('luu_ho_so', { ho_so });
      toast.success('Đã lưu hồ sơ thuế.');
      await tai(kq ? { nam: kq.nam, ky: kq.ky } : {});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chưa lưu được hồ sơ thuế.');
    } finally {
      setDangLuuHoSo(false);
    }
  };

  const doiKy = (ky: KyToKhai) => void tai({ nam: ky.nam, ky, ...(suaDoanhThu ? { doanh_thu_quy: suaDoanhThu.map((x) => Math.max(0, Math.floor(Number(x) || 0))) } : {}) });

  const luuNhap = async () => {
    if (!kq) return;
    setDangLuuNhap(true);
    try {
      const r = await goiToKhai('luu_nhap', {
        nam: kq.nam,
        ky: kq.ky,
        ...(kq.doanh_thu.nguon === 'tu_khai' && suaDoanhThu ? { doanh_thu_quy: suaDoanhThu.map((x) => Math.max(0, Math.floor(Number(x) || 0))) } : {}),
      });
      toast.success(`Đã lưu bản nháp (mã ${String(r.ma_bam).slice(0, 8)}…).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chưa lưu được bản nháp.');
    } finally {
      setDangLuuNhap(false);
    }
  };

  const kyDs: KyToKhai[] = kq
    ? [{ loai: 'nam', nam: kq.nam }, ...[1, 2, 3, 4].map((q) => ({ loai: 'quy' as const, nam: kq.nam, quy: q }))]
    : [];

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-12">
      <header className="no-print">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tờ khai thuế</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          MIMI đọc hoá đơn điện tử và sao kê của bạn, áp quy định trong kho văn bản Công báo, rồi điền đúng mẫu tờ khai.
          Bạn kiểm lại và tự nộp trên Cổng dịch vụ công — MIMI không nộp thay bạn.
        </p>
      </header>

      {dangTai && !kq && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={15} className="animate-spin" /> Đang đọc dữ liệu thuế…</p>
      )}
      {loi && <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{loi}</p>}

      {kq && (
        <>
          <section aria-labelledby="ho-so-thue" className="no-print rounded-2xl border border-border bg-card p-5">
            <h2 id="ho-so-thue" className="text-lg font-semibold text-foreground">Hồ sơ thuế</h2>
            <TheoDangKyThue ct={kq.cong_ty} />
            {!!kq.suy_luan.thieu.length && (
              <ul className="mt-3 space-y-1">
                {kq.suy_luan.thieu.map((t) => (
                  <li key={t.truong} className="flex gap-2 text-sm text-mimi-amber"><Info size={15} className="mt-0.5 shrink-0" aria-hidden /> {t.cau}</li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <FormHoSo hoSo={kq.ho_so} onLuu={luuHoSo} dangLuu={dangLuuHoSo} loaiTheoMst={kq.cong_ty.loai_theo_mst} />
            </div>
          </section>

          <section aria-labelledby="doanh-thu" className="no-print rounded-2xl border border-border bg-card p-5">
            <h2 id="doanh-thu" className="text-lg font-semibold text-foreground">Doanh thu năm {kq.nam}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {kq.suy_luan.doanh_thu_nam === null
                ? 'Chưa có doanh thu nào đọc được.'
                : `${so(kq.suy_luan.doanh_thu_nam)} đồng${kq.doanh_thu.nguon ? ` — ${TEN_NGUON_DOANH_THU[kq.doanh_thu.nguon]}` : ''}${kq.suy_luan.tam_tinh ? `, lũy kế tới ${ngay(kq.hom_nay)}` : ''}.`}
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <caption className="sr-only">Doanh thu từng quý theo từng nguồn</caption>
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="py-1 font-medium">Nguồn</th>
                    {[1, 2, 3, 4].map((q) => <th key={q} scope="col" className="py-1 text-right font-medium">Quý {q}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <th scope="row" className="py-2 text-left font-normal text-muted-foreground">Hoá đơn điện tử ({kq.doanh_thu.so_hoa_don})</th>
                    {[0, 1, 2, 3].map((i) => <td key={i} className="py-2 text-right tabular-nums">{kq.doanh_thu.hoa_don ? so(kq.doanh_thu.hoa_don[i]) : '—'}</td>)}
                  </tr>
                  <tr>
                    <th scope="row" className="py-2 text-left font-normal text-muted-foreground">Tiền về ngân hàng</th>
                    {[0, 1, 2, 3].map((i) => <td key={i} className="py-2 text-right tabular-nums">{kq.doanh_thu.ngan_hang ? so(kq.doanh_thu.ngan_hang[i]) : '—'}</td>)}
                  </tr>
                  <tr className="font-medium">
                    <th scope="row" className="py-2 text-left">MIMI dùng để khai</th>
                    {[0, 1, 2, 3].map((i) => <td key={i} className="py-2 text-right tabular-nums">{kq.doanh_thu.quy ? so(kq.doanh_thu.quy[i]) : '—'}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>

            {kq.canh_bao.map((c) => (
              <p key={c} className="mt-2 flex gap-2 text-sm text-mimi-amber"><AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden /> {c}</p>
            ))}

            {suaDoanhThu === null ? (
              <button
                type="button"
                onClick={() => setSuaDoanhThu((kq.doanh_thu.quy ?? [0, 0, 0, 0]).map(String))}
                className="mt-3 text-sm font-medium text-primary hover:underline"
              >
                Sửa doanh thu từng quý
              </button>
            ) : (
              <form
                className="mt-3 space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void tai({ nam: kq.nam, ky: kq.ky, doanh_thu_quy: suaDoanhThu.map((x) => Math.max(0, Math.floor(Number(x) || 0))) });
                }}
              >
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {suaDoanhThu.map((v, i) => (
                    <label key={i} className="block text-xs text-muted-foreground">
                      Quý {i + 1}
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={v}
                        aria-label={`Doanh thu quý ${i + 1}`}
                        onChange={(e) => setSuaDoanhThu((ds) => (ds ?? []).map((x, j) => (j === i ? e.target.value : x)))}
                        className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-2 text-sm tabular-nums"
                      />
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="h-10 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:brightness-110">Dùng số này</button>
                  <button type="button" onClick={() => { setSuaDoanhThu(null); void tai({ nam: kq.nam, ky: kq.ky }); }} className="h-10 rounded-xl border border-border px-4 text-sm text-foreground hover:bg-accent">
                    Bỏ, dùng số MIMI đọc được
                  </button>
                </div>
              </form>
            )}
          </section>

          <section aria-labelledby="ban-nhap" className="space-y-3">
            <div className="no-print flex flex-wrap items-center justify-between gap-2">
              <h2 id="ban-nhap" className="text-lg font-semibold text-foreground">Bản nháp tờ khai</h2>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Kỳ tính thuế">
                {kyDs.map((k) => (
                  <button
                    key={nhanKy(k)}
                    type="button"
                    aria-pressed={cungKy(k, kq.ky)}
                    onClick={() => doiKy(k)}
                    className={`h-9 rounded-xl px-3 text-sm ${cungKy(k, kq.ky) ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground hover:bg-accent'}`}
                  >
                    {nhanKy(k)}
                  </button>
                ))}
              </div>
            </div>

            {kq.to_khai
              ? (
                <>
                  <GiayToKhai tk={kq.to_khai} canCu={kq.can_cu} />
                  <div className="no-print rounded-2xl border border-border bg-card p-5">
                    <h3 className="text-sm font-semibold text-foreground">MIMI tính từng số thế nào</h3>
                    <ul className="mt-2 space-y-1.5">
                      {kq.to_khai.cach_tinh.map((c) => (
                        <li key={c} className="flex gap-2 text-sm leading-relaxed text-muted-foreground"><ScrollText size={14} className="mt-1 shrink-0" aria-hidden /> {c}</li>
                      ))}
                    </ul>
                    {!!kq.to_khai.canh_bao.length && (
                      <ul className="mt-3 space-y-1.5">
                        {kq.to_khai.canh_bao.map((c) => (
                          <li key={c} className="flex gap-2 text-sm leading-relaxed text-mimi-amber"><AlertTriangle size={14} className="mt-1 shrink-0" aria-hidden /> {c}</li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-accent">
                        <Printer size={15} /> In / lưu PDF
                      </button>
                      <button type="button" onClick={() => void luuNhap()} disabled={dangLuuNhap} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50">
                        {dangLuuNhap ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Lưu bản nháp
                      </button>
                      <a
                        href={DUONG_DAN_NOP_TO_KHAI}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:brightness-110"
                      >
                        <img src={logoDichVuCong} alt="" className="h-4 w-4 object-contain" /> Nộp trên Cổng dịch vụ công <ExternalLink size={14} />
                      </a>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Hạn nộp kỳ này: {ngay(kq.to_khai.han_nop)}. MIMI không nộp và không ký thay bạn.
                    </p>
                  </div>
                </>
              )
              : (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="flex gap-2 text-sm leading-relaxed text-foreground"><Info size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden /> {kq.ly_do_khong_soan ?? 'Chưa soạn được tờ khai cho kỳ này.'}</p>
                  {!cungKy(kq.ky, kq.ky_goi_y) && (
                    <button type="button" onClick={() => doiKy(kq.ky_goi_y)} className="mt-3 text-sm font-medium text-primary hover:underline">
                      Soạn cho {nhanKy(kq.ky_goi_y)}
                    </button>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">
                    Cần xem các mốc hạn? <Link to="/dashboard/nhac-thue" className="font-medium text-primary hover:underline">Mở Nhắc thuế</Link>.
                  </p>
                </div>
              )}
          </section>
        </>
      )}
    </div>
  );
}
