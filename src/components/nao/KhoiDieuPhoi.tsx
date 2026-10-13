import { Link } from 'react-router-dom';
import { ArrowRight, Bot, FileSpreadsheet, Landmark, Loader2, Plug, Receipt, ScanLine } from 'lucide-react';
import { useNaoMimi, type LuotNao } from '@/store/naoMimi';
import { DanAgentBaoCao } from './DanAgentBaoCao';
import { useTranslation } from 'react-i18next';

/**
 * Khối điều phối trên Tổng quan (28/09/2026) — một cửa của BỘ NÃO DÙNG CHUNG, cạnh Trợ lý MIMI và pet.
 *
 *   - Thu nạp dữ liệu: chỉ là lối vào các trang ĐANG CÓ (liên kết ngân hàng, chụp chứng từ…). Không có nút
 *     tải lên giả.
 *   - (12/10/2026) Nút ba quy trình đàn agent đã gỡ: bị đóng băng vĩnh viễn từ 29/09 (máy chủ chưa có
 *     `danh_sach_agent`/`chay_dan_agent`), không người dùng nào thấy. Có máy chủ thì dựng lại.
 *   - Báo cáo chung: lượt gần nhất trong kho — hỏi từ pet, từ Trợ lý hay từ đây đều hiện cùng một chỗ.
 * Không thăm dò định kỳ, không gọi mô hình theo khung hình. Việc làm thay đổi dữ liệu (duyệt chi, lưu chứng
 * từ…) KHÔNG chạy ở đây: dẫn sang Trợ lý MIMI, nơi có hộp xác nhận.
 */
/* `ten`/`mo` là khoá i18n (`ui2.dieuPhoi.loiVao.*`). */
const LOI_VAO = [
  { duong: '/dashboard/fintech', ten: 'ui2.dieuPhoi.loiVao.nganHang', mo: 'ui2.dieuPhoi.loiVao.nganHangMo', Icon: Landmark },
  { duong: '/dashboard/thu-vien', ten: 'ui2.dieuPhoi.loiVao.chup', mo: 'ui2.dieuPhoi.loiVao.chupMo', Icon: ScanLine },
  { duong: '/dashboard/invoices', ten: 'ui2.dieuPhoi.loiVao.hoaDon', mo: 'ui2.dieuPhoi.loiVao.hoaDonMo', Icon: Receipt },
  { duong: '/dashboard/doc-bao-cao', ten: 'ui2.dieuPhoi.loiVao.baoCao', mo: 'ui2.dieuPhoi.loiVao.baoCaoMo', Icon: FileSpreadsheet },
  { duong: '/dashboard/ket-noi', ten: 'ui2.dieuPhoi.loiVao.ketNoi', mo: 'ui2.dieuPhoi.loiVao.ketNoiMo', Icon: Plug },
];

function BaoCaoLuot({ l }: { l: LuotNao }) {
  const { t } = useTranslation();
  const ngungCho = useNaoMimi((s) => s.ngungCho);
  if (l.trangThai === 'dang') {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 size={15} className="animate-spin" /> {t('ui2.dieuPhoi.dangXuLy', { cau: l.cau })}
        <button type="button" onClick={() => ngungCho(l.id)} className="text-xs underline underline-offset-4 hover:text-foreground">{t('ui2.dieuPhoi.ngungCho')}</button>
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
        <p className="text-xs text-muted-foreground">{t('ui2.dieuPhoi.coDinh')}</p>
      )}
      {tl.do_day !== 'complete' && (
        <p className="text-xs text-mimi-amber">{t(`ui2.dieuPhoi.doDay.${tl.do_day}`, { defaultValue: '' })} {t('ui2.dieuPhoi.coTheThieu')}</p>
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
      {nguon.length > 0 && <p className="text-xs text-muted-foreground">{t('ui2.dieuPhoi.nguon')} {nguon.join(' · ')}</p>}
      {tl.dan_agent && <DanAgentBaoCao dan={tl.dan_agent} />}
      <Link
        to="/dashboard/tro-ly"
        state={{ luotId: l.id, luotPet: { cau: l.cau, traLoi: tl } }}
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        {coDeXuat ? t('ui2.dieuPhoi.xemXacNhan') : t('ui2.dieuPhoi.moAssistant')} <ArrowRight size={14} />
      </Link>
    </div>
  );
}

export function KhoiDieuPhoi() {
  const { t } = useTranslation();
  const luot = useNaoMimi((s) => s.luot);
  const moiNhat = luot[luot.length - 1] ?? null;

  return (
    <section aria-label={t('ui2.dieuPhoi.tieuDe')} className="rounded-2xl border border-border/60 bg-card/60 p-5">
      <div className="flex items-center gap-2">
        <Bot size={16} className="text-primary" />
        <h3 className="font-display font-semibold text-foreground">{t('ui2.dieuPhoi.tieuDe')}</h3>
      </div>

      <nav aria-label={t('ui2.dieuPhoi.thuNap')} className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {LOI_VAO.map(({ duong, ten, mo, Icon }) => (
          <Link key={duong} to={duong} className="flex items-start gap-2 rounded-xl border border-border px-3 py-2.5 hover:bg-accent">
            <Icon size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
            <span>
              <span className="block text-sm font-medium text-foreground">{t(ten)}</span>
              <span className="block text-xs text-muted-foreground">{t(mo)}</span>
            </span>
          </Link>
        ))}
      </nav>

      <div className="mt-5 border-t border-border/60 pt-4" aria-label={t('ui2.dieuPhoi.baoCaoChung')} aria-live="polite">
        {moiNhat ? <BaoCaoLuot l={moiNhat} /> : (
          <p className="text-sm text-muted-foreground">
            {t('ui2.dieuPhoi.chuaCoViec')}
          </p>
        )}
      </div>
    </section>
  );
}
