import { useEffect, useMemo, useState } from 'react';
import { DAN_AGENT_DONG_BANG } from '@/lib/dongBang';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, FileSpreadsheet, Landmark, Loader2, Plug, Receipt, ScanLine } from 'lucide-react';
import { goiTroLy } from '@/lib/goiTroLy';
import { QUY_TRINH_AGENT, type AgentMimi, type QuyTrinhAgent } from '@/lib/troLy';
import { TEN_QUY_TRINH, useNaoMimi, type LuotNao } from '@/store/naoMimi';
import { DanAgentBaoCao } from './DanAgentBaoCao';

/**
 * Khối điều phối trên Tổng quan (28/09/2026) — một cửa của BỘ NÃO DÙNG CHUNG, cạnh Trợ lý MIMI và pet.
 *
 *   - Thu nạp dữ liệu: chỉ là lối vào các trang ĐANG CÓ (liên kết ngân hàng, chụp chứng từ…). Không có nút
 *     tải lên giả.
 *   - Ba quy trình đàn agent (allowlist máy chủ). Bấm một lần → một request; đang chạy thì khoá nút.
 *   - Báo cáo chung: lượt gần nhất trong kho — hỏi từ pet, từ Trợ lý hay từ đây đều hiện cùng một chỗ.
 * Không thăm dò định kỳ, không gọi mô hình theo khung hình. Việc làm thay đổi dữ liệu (duyệt chi, lưu chứng
 * từ…) KHÔNG chạy ở đây: dẫn sang Trợ lý MIMI, nơi có hộp xác nhận.
 */
const LOI_VAO = [
  { duong: '/dashboard/fintech', ten: 'Liên kết ngân hàng', mo: 'Sao kê để đối soát', Icon: Landmark },
  { duong: '/dashboard/thu-vien', ten: 'Chụp chứng từ', mo: 'Hoá đơn, biên lai', Icon: ScanLine },
  { duong: '/dashboard/invoices', ten: 'Hoá đơn bán ra', mo: 'Công nợ phải thu', Icon: Receipt },
  { duong: '/dashboard/doc-bao-cao', ten: 'Đọc báo cáo tài chính', mo: 'Excel / CSV', Icon: FileSpreadsheet },
  { duong: '/dashboard/ket-noi', ten: 'Kết nối', mo: 'Trạng thái nguồn dữ liệu', Icon: Plug },
];

const MO_TA_QUY_TRINH: Record<QuyTrinhAgent, string> = {
  ke_toan_hang_ngay: 'Đọc giao dịch mới, xếp loại, chỉ ra khoản thiếu chứng từ.',
  thu_hoi_cong_no: 'Tìm khoản phải thu quá hạn, soạn bản nháp nhắc nợ để bạn duyệt — không tự gửi.',
  kiem_tra_so_sach: 'Đối chiếu sổ với sao kê, tìm khoản trùng, lệch, thiếu.',
};

const CAU_DO_DAY: Record<string, string> = {
  partial: 'Dữ liệu bị cắt bớt khi đọc.',
  stale: 'Lần đồng bộ gần nhất đã cũ.',
  unavailable: 'Chưa có kết nối cho nguồn này.',
};

function BaoCaoLuot({ l }: { l: LuotNao }) {
  const ngungCho = useNaoMimi((s) => s.ngungCho);
  if (l.trangThai === 'dang') {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 size={15} className="animate-spin" /> MIMI đang xử lý “{l.cau}”…
        <button type="button" onClick={() => ngungCho(l.id)} className="text-xs underline underline-offset-4 hover:text-foreground">Ngừng chờ</button>
      </p>
    );
  }
  if (l.trangThai === 'loi' || l.trangThai === 'ngung_cho') {
    return <p role="alert" className="text-sm text-destructive">{l.loi}</p>;
  }
  const tl = l.traLoi;
  if (!tl) return null;
  const coDeXuat = tl.ket_qua.some((r) => r.de_xuat.some((d) => d.loai !== 'mo_trang'));
  const nguon = [...new Set(tl.ket_qua.flatMap((r) => r.nguon.map((n) => n.ten)))];
  return (
    <div className="space-y-3">
      <p className="whitespace-pre-line text-sm text-foreground">{tl.cau}</p>
      {tl.che_do === 'co_dinh' && (
        <p className="text-xs text-muted-foreground">Chưa có mô hình ngôn ngữ: MIMI trả lời bằng bộ luật và số liệu đọc thẳng từ dữ liệu.</p>
      )}
      {tl.do_day !== 'complete' && (
        <p className="text-xs text-mimi-amber">{CAU_DO_DAY[tl.do_day]} Con số có thể thiếu — thiếu không phải bằng 0.</p>
      )}
      {tl.ket_qua.length > 0 && (
        <ul className="space-y-1.5">
          {tl.ket_qua.map((r) => (
            <li key={r.nang_luc} className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{r.nang_luc}</span> — {r.tom_tat}
            </li>
          ))}
        </ul>
      )}
      {nguon.length > 0 && <p className="text-xs text-muted-foreground">Nguồn: {nguon.join(' · ')}</p>}
      {tl.dan_agent && <DanAgentBaoCao dan={tl.dan_agent} />}
      <Link
        to="/dashboard/tro-ly"
        state={{ luotId: l.id, luotPet: { cau: l.cau, traLoi: tl } }}
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        {coDeXuat ? 'Xem và xác nhận việc cần làm ở MIMI Assistant' : 'Mở ở MIMI Assistant'} <ArrowRight size={14} />
      </Link>
    </div>
  );
}

export function KhoiDieuPhoi({ moDanAgent = !DAN_AGENT_DONG_BANG }: { moDanAgent?: boolean } = {}) {
  const luot = useNaoMimi((s) => s.luot);
  const chayQuyTrinh = useNaoMimi((s) => s.chayQuyTrinh);
  const [agent, setAgent] = useState<AgentMimi[] | null>(null);
  /** Câu lỗi NGUYÊN VĂN của máy chủ khi chưa đọc được danh mục (vd. action chưa triển khai). */
  const [loiDanhMuc, setLoiDanhMuc] = useState<string | null>(null);

  // Danh sách agent: đọc một lần khi mở trang (máy chủ cũ không gửi → không hiện gì). Không thăm dò.
  useEffect(() => {
    // Đóng băng (`lib/dongBang.ts`): không gọi hành động máy chủ chưa có — tránh lỗi hiện cho mọi người dùng.
    if (!moDanAgent) return;
    const ctrl = new AbortController();
    // Action nhẹ `danh_sach_agent`: máy chủ chỉ kiểm JWT, quyền công ty, giới hạn gọi — không đọc sao kê,
    // chứng từ, không gọi mô hình. Đây là DANH MỤC năng lực, không phải trạng thái việc đang chạy.
    goiTroLy('danh_sach_agent', {}, { signal: ctrl.signal })
      .then((kq) => {
        if (ctrl.signal.aborted) return;
        const ds = (kq as { danh_sach_agent?: unknown }).danh_sach_agent;
        if (Array.isArray(ds)) { setAgent(ds as AgentMimi[]); setLoiDanhMuc(null); }
      })
      .catch((e: unknown) => { if (!ctrl.signal.aborted) setLoiDanhMuc(e instanceof Error ? e.message : String(e)); });
    return () => ctrl.abort();
  }, [moDanAgent]);

  const coDanAgent = agent !== null;
  const moiNhat = luot[luot.length - 1] ?? null;
  const dangChay = useMemo(() => new Set(luot.filter((l) => l.trangThai === 'dang' && l.quyTrinh).map((l) => l.quyTrinh)), [luot]);

  return (
    <section aria-label="Điều phối MIMI" className="rounded-2xl border border-border/60 bg-card/60 p-5">
      <div className="flex items-center gap-2">
        <Bot size={16} className="text-primary" />
        <h3 className="font-display font-semibold text-foreground">Điều phối MIMI</h3>
      </div>

      <nav aria-label="Thu nạp dữ liệu" className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {LOI_VAO.map(({ duong, ten, mo, Icon }) => (
          <Link key={duong} to={duong} className="flex items-start gap-2 rounded-xl border border-border px-3 py-2.5 hover:bg-accent">
            <Icon size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
            <span>
              <span className="block text-sm font-medium text-foreground">{ten}</span>
              <span className="block text-xs text-muted-foreground">{mo}</span>
            </span>
          </Link>
        ))}
      </nav>

      {/*
        Nút quy trình CHỈ hiện khi máy chủ trả được danh mục agent (`danh_sach_agent`).
        Máy chủ cũ chưa có `chay_dan_agent`: hiện ba nút bấm vào chỉ ra lỗi là hứa điều không làm được.
      */}
      {coDanAgent && (
      <div className="mt-5 grid gap-2 sm:grid-cols-3" role="group" aria-label="Quy trình">
        {QUY_TRINH_AGENT.map((q) => (
          <button
            key={q}
            type="button"
            disabled={dangChay.has(q)}
            onClick={() => void chayQuyTrinh(q, { nguon: 'trang_chu' })}
            className="rounded-xl border border-border px-3 py-2.5 text-left hover:bg-accent disabled:opacity-60"
          >
            <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              {dangChay.has(q) && <Loader2 size={13} className="animate-spin" />} {TEN_QUY_TRINH[q]}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{MO_TA_QUY_TRINH[q]}</span>
          </button>
        ))}
      </div>
      )}

      {loiDanhMuc && (
        <p className="mt-4 text-xs text-muted-foreground">Chưa chạy được đàn agent — máy chủ báo: {loiDanhMuc}</p>
      )}

      {agent && agent.length > 0 && (
        <ul aria-label="Agent của MIMI" className="mt-4 flex flex-wrap gap-2">
          {agent.map((a) => (
            <li key={a.id} title={a.mo_ta} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
              {a.ten} · {a.trang_thai === 'san_sang' ? 'sẵn sàng' : 'cần kết nối'} · chỉ đọc và soạn nháp
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 border-t border-border/60 pt-4" aria-label="Báo cáo chung" aria-live="polite">
        {moiNhat ? <BaoCaoLuot l={moiNhat} /> : (
          <p className="text-sm text-muted-foreground">
            Chưa có việc nào. {coDanAgent ? 'Chạy một quy trình ở trên, hỏi' : 'Hỏi'} MIMI Assistant hoặc hỏi pet — kết quả hiện ở đây.
          </p>
        )}
      </div>
    </section>
  );
}
