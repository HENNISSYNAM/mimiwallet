import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, KeyRound, Lock, ShieldAlert } from 'lucide-react';
import { Chip, Khung, useCanh } from './DemoTuChay';

/**
 * "MIMI bảo vệ tiền của bạn thế nào" — hai khung tự chạy như một đoạn video ngắn.
 *
 * CHỈ DỰNG LẠI ĐIỀU ĐÃ CÓ TRONG MÃ, và nói đúng phạm vi của nó:
 *
 *   1. Dừng khoản đáng ngờ lúc bấm Duyệt — `tac-tu` trả 409 CAN_XAC_MINH khi khoản chi có dấu
 *      hiệu mức cao (`_shared/bat-thuong/phat-hien.ts`), giao diện mở hộp xác minh. Là bộ luật
 *      nói rõ từng lý do, không phải mô hình học máy, nên không gọi là "AI".
 *      MIMI KHÔNG chặn được lệnh chuyển trong app ngân hàng — câu dưới khung nói thẳng điều đó.
 *
 *   2. Mã hoá kháng lượng tử — `_shared/pqcCrypto.ts`: ML-KEM-768 (FIPS 203) đóng gói một khoá
 *      riêng cho từng bản ghi, HKDF-SHA256 dẫn ra khoá AES-256-GCM, AES-GCM mã hoá nội dung.
 *      Áp cho token ngân hàng và khoá quản trị AI — KHÔNG phải cho toàn bộ cơ sở dữ liệu, nên
 *      không được viết "mọi dữ liệu đều mã hoá lượng tử".
 *
 * Số tiền, tên công ty, số tài khoản, token đều là ví dụ; khung ghi "Minh hoạ".
 *
 * KHÔNG CÓ CON TRỎ MÈO. Người bấm Duyệt và "Chưa duyệt" ở đây là người dùng, và con trỏ mèo
 * MIMI không bao giờ bấm nút dính tới tiền — nên chỉ làm sáng nút đang được bấm.
 */

/** Thanh tiến độ như thanh thời gian của video: mỗi đoạn là một bước. */
function ThanhTienDo({ so, buoc }: { so: number; buoc: number }) {
  return (
    <div className="mt-3 flex gap-1" aria-hidden>
      {Array.from({ length: so }, (_, i) => (
        <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i <= buoc ? 'bg-primary' : 'bg-muted'}`} />
      ))}
    </div>
  );
}

/* ── 1. Dừng khoản đáng ngờ lúc bấm Duyệt ─────────────────────────────── */
const NHIP_DUNG = [2200, 1300, 3200, 3000] as const;

function CanhDungKhoan() {
  const { khung, buoc } = useCanh(NHIP_DUNG, 3);

  return (
    <figure className="m-0">
      <Khung khungRef={khung} nen="bg-destructive/5" nhan="Minh hoạ">
        <div className="w-full max-w-sm">
          {buoc < 2 && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">Yêu cầu chi · kế toán gửi</span>
                <Chip loai="cho">Chờ duyệt</Chip>
              </div>
              <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">42.000.000đ</p>
              <p className="mt-1 text-[13px] text-foreground">CÔNG TY BAO BÌ TÂN PHÚ <span className="text-muted-foreground">· ••••9999</span></p>
              <p className="mt-2 rounded-md bg-muted/60 px-2 py-1.5 text-[11px] italic text-muted-foreground">
                "Bên em vừa đổi tài khoản nhận tiền, anh chị chuyển gấp giúp em trong hôm nay nhé."
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <span className="grid h-9 place-items-center rounded-lg border border-border text-[13px] text-foreground">Từ chối</span>
                <span className={`grid h-9 place-items-center rounded-lg bg-primary text-[13px] font-semibold text-primary-foreground ${buoc === 1 ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''}`}>
                  Duyệt
                </span>
              </div>
            </motion.div>
          )}

          {buoc === 2 && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="rounded-lg border border-destructive/40 bg-card p-4 shadow-lg">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShieldAlert size={16} className="text-destructive" /> Dừng lại trước khi duyệt
              </p>
              <div className="mt-2 rounded-md border border-border p-2.5 text-[12px] leading-relaxed text-foreground">
                <span className="mr-1.5 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">Mức cao</span>
                Trước đây bạn trả Bao Bì Tân Phú vào ••••1111; lần này là ••••9999. Gọi lại nhà cung cấp qua số bạn đã có từ trước.
              </div>
              <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <span className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-sm border border-border" />
                Tôi đã gọi lại người nhận qua số điện thoại có từ trước…
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <span className="grid h-9 place-items-center rounded-lg bg-primary text-[13px] font-semibold text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-card">Chưa duyệt</span>
                <span className="grid h-9 place-items-center rounded-lg bg-muted text-[12px] text-muted-foreground">Đã xác minh, vẫn duyệt</span>
              </div>
            </motion.div>
          )}

          {buoc === 3 && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">Bao Bì Tân Phú · 42.000.000đ</span>
                <Chip loai="chan">Đã từ chối</Chip>
              </div>
              <p className="mt-2 text-[13px] text-foreground">Gọi số cũ: nhà cung cấp xác nhận <b>không</b> đổi tài khoản.</p>
              <p className="mt-1 text-[13px] font-semibold text-emerald-700 dark:text-emerald-400">Chưa có đồng nào rời tài khoản.</p>
            </motion.div>
          )}
          <ThanhTienDo so={NHIP_DUNG.length} buoc={buoc} />
        </div>
      </Khung>
      <figcaption className="mt-3 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">Cảnh báo bất thường.</span> Khoản chi xin qua MIMI có dấu hiệu mức cao — người nhận đổi số
        tài khoản, người nhận mới với số tiền lớn, nội dung giả danh cơ quan nhà nước — bị dừng ngay lúc bấm Duyệt, kèm lý do cụ thể. MIMI không
        chặn được lệnh chuyển trong app ngân hàng; sao kê được quét lại sau mỗi lần đồng bộ.
      </figcaption>
    </figure>
  );
}

/* ── 2. Mã hoá kháng lượng tử cho token ngân hàng ──────────────────────── */
const NHIP_MA_HOA = [1800, 1700, 1700, 3200] as const;

function Buoc({ hien, children }: { hien: boolean; children: ReactNode }) {
  return (
    <motion.div initial={false} animate={{ opacity: hien ? 1 : 0.25 }} transition={{ duration: 0.4 }}>
      {children}
    </motion.div>
  );
}

function CanhMaHoa() {
  const { khung, buoc } = useCanh(NHIP_MA_HOA, 3);
  return (
    <figure className="m-0">
      <Khung khungRef={khung} nen="bg-primary/5" nhan="Minh hoạ">
        <div className="w-full max-w-sm space-y-1.5 font-mono text-[11px]">
          <Buoc hien={buoc >= 0}>
            <div className="rounded-md border border-border bg-card p-2.5">
              <p className="flex items-center gap-1.5 font-sans text-[11px] text-muted-foreground"><KeyRound size={12} /> Token ngân hàng vừa nhận</p>
              <p className="mt-1 truncate text-foreground">access_token: eyJhbGciOiJIUzI1NiJ9.vi-du…</p>
            </div>
          </Buoc>
          <ArrowDown size={14} className="mx-auto text-muted-foreground" aria-hidden />
          <Buoc hien={buoc >= 1}>
            <div className="rounded-md border border-primary/30 bg-card p-2.5 font-sans">
              <p className="text-[12px] font-semibold text-foreground">ML-KEM-768 <span className="font-normal text-muted-foreground">· FIPS 203</span></p>
              <p className="text-[11px] text-muted-foreground">Đóng gói một khoá bí mật riêng cho từng bản ghi — kháng máy tính lượng tử.</p>
            </div>
          </Buoc>
          <ArrowDown size={14} className="mx-auto text-muted-foreground" aria-hidden />
          <Buoc hien={buoc >= 2}>
            <div className="rounded-md border border-primary/30 bg-card p-2.5 font-sans">
              <p className="text-[12px] font-semibold text-foreground">HKDF-SHA256 → AES-256-GCM</p>
              <p className="text-[11px] text-muted-foreground">Mã hoá nội dung token, có mã xác thực chống sửa.</p>
            </div>
          </Buoc>
          <ArrowDown size={14} className="mx-auto text-muted-foreground" aria-hidden />
          <Buoc hien={buoc >= 3}>
            <div className="rounded-md border border-border bg-card p-2.5">
              <p className="flex items-center gap-1.5 font-sans text-[11px] text-muted-foreground"><Lock size={12} /> Thứ được ghi vào cơ sở dữ liệu</p>
              <p className="mt-1 break-all text-foreground">{'{ v: 1, kemCipherText: "q8Zf…", iv: "3kPa…", aesCipherText: "Hn0x…" }'}</p>
            </div>
          </Buoc>
          <ThanhTienDo so={NHIP_MA_HOA.length} buoc={buoc} />
        </div>
      </Khung>
      <figcaption className="mt-3 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">Mã hoá kháng lượng tử.</span> Token ngân hàng và khoá quản trị AI được mã hoá lai ML-KEM-768
        + AES-256-GCM trước khi ghi xuống. Khoá giải mã nằm trong biến bí mật của máy chủ, không nằm trong mã nguồn.
      </figcaption>
    </figure>
  );
}

export default function VideoBaoMat() {
  return (
    <section id="bao-mat" aria-labelledby="bao-mat-tieu-de" className="bg-background py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Bảo mật</span>
          <h2 id="bao-mat-tieu-de" className="mt-4 font-display font-extrabold tracking-tight text-foreground" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.75rem)' }}>
            Xem MIMI giữ tiền của bạn lại
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Dừng khoản chi đáng ngờ trước khi tiền rời tài khoản, và khoá bí mật ngân hàng bằng mã hoá kháng lượng tử.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          <CanhDungKhoan />
          <CanhMaHoa />
        </div>
      </div>
    </section>
  );
}
