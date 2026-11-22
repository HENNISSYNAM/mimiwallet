/**
 * AGENTIC AI SPACE (/dashboard/space, 22/11/2026) — nơi các WORKFLOW người + agent sống.
 * Học ClickUp Workflows: ô mô tả việc, hàng mẫu theo lĩnh vực ("blueprint"), bảng workflow. Bỏ cái dở: không menu 14 mục,
 * không mục "Coming soon", không khoá tín dụng. Gõ một câu → MIMI dựng workflow → mở khung vẽ + chat sửa ở cột phải.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Banknote, Briefcase, FileStack, Loader2, Orbit, ShieldAlert, Users, Calculator } from 'lucide-react';
import { ThanhTabHome } from '@/components/khong-gian/ThanhTabHome';
import { AvatarMeo, HINH_AGENT, netTuTrangThai } from '@/components/agent/AvatarMeo';
import { docBang, type BangViec } from '@/lib/goiSpace';
import { dsQuyTrinh, taoQuyTrinh, type DongQuyTrinh } from '@/lib/goiQuyTrinh';
import { idCongTyDangDung } from '@/lib/congTyDangDung';

export const MAU_LINH_VUC = [
  { lv: 'tai_chinh', ten: 'Tài chính & thuế', icon: Calculator, cau: 'Chốt quý 4 và chuẩn bị tờ khai cho công ty này' },
  { lv: 'thanh_toan', ten: 'Thanh toán qua agent', icon: Banknote, cau: 'Thanh toán các hoá đơn nhà cung cấp đến hạn tuần này' },
  { lv: 'bao_mat', ten: 'Bảo mật', icon: ShieldAlert, cau: 'Đối tác vừa báo đổi số tài khoản nhận tiền, xử lý an toàn' },
  { lv: 'ho_so', ten: 'Hồ sơ', icon: FileStack, cau: 'Chuẩn bị hồ sơ vay vốn ngân hàng' },
  { lv: 'nhan_su', ten: 'Nhân sự', icon: Users, cau: 'Đón nhân viên kế toán mới vào làm thứ Hai tuần sau' },
  { lv: 'cong_viec', ten: 'Công việc', icon: Briefcase, cau: 'Lên kế hoạch và theo dõi việc đóng sổ cuối năm' },
] as const;
const TEN_LV = Object.fromEntries(MAU_LINH_VUC.map((m) => [m.lv, m.ten])) as Record<string, string>;
const TEN_PA: Record<string, string> = { nguoi: 'Người làm', nguoi_ai: 'Người + AI', ai: 'AI tối đa' };
const TEN_TT: Record<string, string> = { nhap: 'Bản nháp', dang_chay: 'Đang chạy', xong: 'Xong', dung: 'Đã dừng' };

export default function AgenticSpacePage() {
  const navigate = useNavigate();
  const [ds, setDs] = useState<DongQuyTrinh[] | null>(null);
  const [bang, setBang] = useState<BangViec | null>(null);
  const [cau, setCau] = useState('');
  const [khach, setKhach] = useState('');
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  const tai = useCallback(async () => {
    try {
      const [q, b, id] = await Promise.all([dsQuyTrinh(), docBang().catch(() => null), idCongTyDangDung().catch(() => null)]);
      setDs(q); setBang(b);
      setKhach((k) => k || (b?.khach.some((x) => x.id === id) ? id! : b?.khach[0]?.id ?? ''));
    } catch (e) { setLoi(e instanceof Error ? e.message : 'Chưa đọc được Agentic AI Space.'); }
  }, []);
  useEffect(() => { void tai(); }, [tai]);

  const dung = async () => {
    const c = cau.trim();
    if (!c || !khach) return;
    setDang(true); setLoi(null);
    try { navigate(`/dashboard/space/${await taoQuyTrinh(khach, c)}`); }
    catch (e) { setLoi(e instanceof Error ? e.message : 'Chưa dựng được workflow.'); }
    finally { setDang(false); }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <ThanhTabHome />
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground"><Orbit className="text-primary" /> Agentic AI Space</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">Mô tả việc bằng một câu. MIMI dựng workflow người + agent, bạn sửa bằng chat, chốt rồi mới chạy. Bước chuyển tiền, nộp, gửi ra ngoài luôn có người duyệt.</p>
      </header>

      <form className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm" onSubmit={(e) => { e.preventDefault(); void dung(); }}>
        <textarea value={cau} onChange={(e) => setCau(e.target.value)} rows={2} maxLength={1000} aria-label="Mô tả việc"
          placeholder="Ví dụ: thanh toán hoá đơn nhà cung cấp đến hạn, kiểm người nhận trước khi trả"
          className="w-full resize-none bg-transparent text-base outline-none placeholder:text-muted-foreground" />
        <div className="flex flex-wrap items-center gap-2">
          <select value={khach} onChange={(e) => setKhach(e.target.value)} aria-label="Công ty" className="min-w-[200px] rounded-lg border bg-background px-2 py-1.5 text-sm">
            {(bang?.khach ?? []).map((k) => <option key={k.id} value={k.id}>{k.ten}</option>)}
          </select>
          <button type="submit" disabled={dang || !cau.trim() || !khach}
            className="ml-auto inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {dang ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />} {dang ? 'Đang dựng…' : 'Dựng workflow'}
          </button>
        </div>
      </form>
      {loi && <p role="alert" className="text-sm text-destructive">{loi}</p>}

      <section aria-label="Mẫu theo lĩnh vực" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MAU_LINH_VUC.map(({ lv, ten, icon: Icon, cau: vd }) => (
          <button key={lv} type="button" onClick={() => setCau(vd)} className="flex gap-3 rounded-2xl border bg-card p-4 text-left transition hover:shadow">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon size={18} /></span>
            <span><span className="block text-sm font-medium text-foreground">{ten}</span><span className="block text-xs text-muted-foreground">{vd}</span></span>
          </button>
        ))}
      </section>

      {bang && (
        <section aria-label="Đội agent" className="flex flex-wrap gap-3">
          {bang.agent.map((a) => (
            <span key={a.agent} className="inline-flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3 text-xs text-muted-foreground">
              <AvatarMeo mau={HINH_AGENT[a.agent].mau} kinh={HINH_AGENT[a.agent].kinh} net={netTuTrangThai(a)} co={28} ten={a.ten} />{a.ten}
            </span>
          ))}
        </section>
      )}

      <section aria-label="Workflow" className="rounded-2xl border bg-card">
        <h2 className="border-b px-4 py-3 text-sm font-semibold text-foreground">Workflow của bạn</h2>
        {ds === null ? <p className="p-4 text-sm text-muted-foreground">Đang đọc…</p> : ds.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Chưa có workflow nào. Mô tả một việc ở trên, hoặc bấm một mẫu.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium">Tên</th><th className="px-2 py-2 font-medium">Lĩnh vực</th>
              <th className="px-2 py-2 font-medium">Phương án</th><th className="px-2 py-2 font-medium">Bước</th><th className="px-4 py-2 font-medium">Trạng thái</th>
            </tr></thead>
            <tbody>
              {ds.map((q) => (
                <tr key={q.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-2"><Link to={`/dashboard/space/${q.id}`} className="font-medium text-foreground hover:underline">{q.tieu_de}</Link>
                    <span className="block text-xs text-muted-foreground">{q.ten_khach}</span></td>
                  <td className="px-2 py-2 text-xs">{TEN_LV[q.linh_vuc] ?? q.linh_vuc}</td>
                  <td className="px-2 py-2 text-xs">{TEN_PA[q.phuong_an]}</td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">{q.dem ? `agent ${q.dem.agent} · người ${q.dem.nguoi} · duyệt ${q.dem.duyet}` : '—'}</td>
                  <td className="px-4 py-2 text-xs">{TEN_TT[q.trang_thai]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
