import { useEffect, useState } from 'react';
import { MessageCircleQuestion, X } from 'lucide-react';
import { idCongTyDangDung } from '@/lib/congTyDangDung';
import { daHoi, danhDauDaHoi, guiPhanHoi, soNgayDaDung, type CauHoi } from '@/lib/phanHoi';

export interface LuaChon {
  gia: string;
  nhan: string;
  /** Điểm 1–5 nếu câu hỏi là thang điểm. */
  diem?: number;
  /** Chọn cái này thì hỏi thêm "vướng ở đâu?" — câu trả lời chưa tốt mới là thứ cần nghe nhất. */
  hoiThem?: boolean;
}

/**
 * MỘT câu hỏi tại điểm chạm (29/09/2026, học Filum). Hiện một lần cho mỗi công ty; trả lời hoặc bỏ qua là
 * không hỏi lại. Không chặn việc đang làm: nằm gọn dưới kết quả, có nút đóng.
 */
export function CauHoiNhanh({ cauHoi, cau, luaChon, className }: {
  cauHoi: CauHoi;
  cau: string;
  luaChon: LuaChon[];
  className?: string;
}) {
  const [hien, setHien] = useState(false);
  const [cty, setCty] = useState<string | null>(null);
  const [chon, setChon] = useState<LuaChon | null>(null);
  const [ghiChu, setGhiChu] = useState('');
  const [xong, setXong] = useState(false);

  useEffect(() => {
    let huy = false;
    void idCongTyDangDung().catch(() => null).then((id) => {
      if (huy) return;
      setCty(id);
      setHien(!daHoi(cauHoi, id));
    });
    return () => { huy = true; };
  }, [cauHoi]);

  if (!hien) return null;

  const gui = (lc: LuaChon, note: string | null) => {
    danhDauDaHoi(cauHoi, cty, 'tra_loi');
    void guiPhanHoi(cauHoi, { tra_loi: lc.gia, diem: lc.diem ?? null, ghi_chu: note });
    setXong(true);
  };

  if (xong) {
    return (
      <p role="status" className={`rounded-xl border border-border/60 bg-card/40 px-3 py-2 text-xs text-muted-foreground ${className ?? ''}`}>
        Cảm ơn bạn — MIMI đọc từng phản hồi và báo lại khi đã sửa.
      </p>
    );
  }

  return (
    <div role="group" aria-label="Câu hỏi nhanh" className={`rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5 text-sm ${className ?? ''}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-start gap-1.5 text-foreground">
          <MessageCircleQuestion size={15} className="mt-0.5 shrink-0 text-primary" aria-hidden /> {cau}
        </p>
        <button type="button" aria-label="Bỏ qua câu hỏi" onClick={() => { danhDauDaHoi(cauHoi, cty, 'bo_qua'); setHien(false); }}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground"><X size={14} /></button>
      </div>
      {!chon ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {luaChon.map((lc) => (
            <button key={lc.gia} type="button" onClick={() => (lc.hoiThem ? setChon(lc) : gui(lc, null))}
              className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium hover:bg-accent">
              {lc.nhan}
            </button>
          ))}
        </div>
      ) : (
        <form className="mt-2 flex flex-col gap-1.5" onSubmit={(e) => { e.preventDefault(); gui(chon, ghiChu); }}>
          <label className="text-xs text-muted-foreground" htmlFor={`ghi-chu-${cauHoi}`}>Vướng ở đâu? (không bắt buộc)</label>
          <textarea id={`ghi-chu-${cauHoi}`} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} maxLength={500} rows={2}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm" />
          <button type="submit" className="self-end rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">Gửi</button>
        </form>
      )}
    </div>
  );
}

/**
 * Câu Sean Ellis — hỏi khi máy này đã thấy công ty ít nhất 14 ngày. Đạt khi ≥40% trả lời "rất thất vọng".
 * Đây là thước đo PMF duy nhất trong sổ điểm có thể lên bằng dữ liệu của chính người dùng.
 */
export function CauHoiSeanEllis({ className }: { className?: string }) {
  const [du, setDu] = useState(false);
  useEffect(() => {
    let huy = false;
    void idCongTyDangDung().catch(() => null).then((id) => { if (!huy) setDu(soNgayDaDung(id) >= 14); });
    return () => { huy = true; };
  }, []);
  if (!du) return null;
  return (
    <CauHoiNhanh
      cauHoi="sean_ellis"
      className={className}
      cau="Nếu từ mai không dùng MIMI được nữa, bạn thấy thế nào?"
      luaChon={[
        { gia: 'rat_that_vong', nhan: 'Rất thất vọng' },
        { gia: 'hoi_that_vong', nhan: 'Hơi thất vọng', hoiThem: true },
        { gia: 'khong_that_vong', nhan: 'Không thất vọng', hoiThem: true },
      ]}
    />
  );
}
