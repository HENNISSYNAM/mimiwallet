import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, BellRing, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { goiToKhai } from '@/lib/goiToKhai';
import { LoiGoiHam } from '@/lib/loiGoiHam';
import { danhDauThongBao, type HanhDongThongBao, type ThongBao } from '@/lib/thongBao';
import { LoiTaiLai } from '@/components/chung/LoiTaiLai';

/**
 * Danh sách thông báo — dùng ở chuông đầu trang và trong Nhắc thuế.
 *
 * Mỗi thông báo nói một việc và có sẵn nút làm việc đó. Khoản tiền vào đáng ngờ: "Đúng, không
 * tính" / "Là tiền bán hàng" — một chạm, không mở trang nào. Máy chủ kiểm quyền và gói ở mỗi lần
 * bấm; hết gói thì nói thẳng, kèm lối sang chỗ trả tiền.
 */

const tuongDoi = (iso: string) => {
  const phut = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (phut < 1) return i18n.t('ui2.tb.vuaXong');
  if (phut < 60) return i18n.t('ui2.tb.phutTruoc', { so: phut });
  const gio = Math.round(phut / 60);
  if (gio < 24) return i18n.t('ui2.tb.gioTruoc', { so: gio });
  return new Date(iso).toLocaleDateString(i18n.language);
};

export function DanhSachThongBao({ ds, onDoi, gon, loi }: { ds: ThongBao[]; onDoi: () => void; gon?: boolean; loi?: boolean }) {
  const { t: dich } = useTranslation();
  const navigate = useNavigate();
  const [dang, setDang] = useState<string | null>(null);

  const bam = async (t: ThongBao, h: HanhDongThongBao) => {
    setDang(t.id);
    try {
      await goiToKhai(h.goi, h.tham_so);
      await danhDauThongBao([t.id], true);
      toast.success(h.tham_so.loai === 'business_revenue' ? dich('ui2.tb.daGhiBanHang') : dich('ui2.tb.daGhiKhongTinh'));
      onDoi();
    } catch (e) {
      if (e instanceof LoiGoiHam && e.status === 402) {
        toast.error(e.message, { action: { label: dich('ui2.tb.xemGoi'), onClick: () => navigate('/dashboard/settings') } });
      } else toast.error(e instanceof Error ? e.message : dich('ui2.tb.chuaGhi'));
    } finally {
      setDang(null);
    }
  };

  const mo = async (t: ThongBao) => {
    if (!t.da_doc_luc) await danhDauThongBao([t.id]);
    if (t.duong_dan) navigate(t.duong_dan);
    onDoi();
  };

  // Đọc lỗi thì không được nói "Chưa có thông báo nào" — thông báo có thể là hạn nộp thuế.
  if (!ds.length && loi) {
    return <div className="p-3"><LoiTaiLai cau={dich('ui2.tb.loiTai')} thuLai={onDoi} /></div>;
  }

  if (!ds.length) {
    return <p className="p-4 text-sm text-muted-foreground">{dich('ui2.tb.rong')}</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {ds.map((t) => {
        const conViec = t.hanh_dong.length > 0 && !t.da_xu_ly_luc;
        return (
          <li key={t.id} className={`p-3 ${t.da_doc_luc ? '' : 'bg-primary/[0.04]'}`}>
            <button type="button" onClick={() => void mo(t)} className="flex w-full items-start gap-2 text-left">
              {t.muc_do === 'gap'
                ? <AlertTriangle size={16} className="mt-0.5 shrink-0 text-mimi-amber" aria-hidden />
                : <BellRing size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />}
              <span className="min-w-0 flex-1">
                <span className={`block text-sm ${t.da_doc_luc ? 'text-foreground' : 'font-medium text-foreground'}`}>{t.tieu_de}</span>
                {!gon && <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{t.noi_dung}</span>}
                <span className="mt-0.5 block text-[11px] text-muted-foreground">{tuongDoi(t.tao_luc)}</span>
              </span>
            </button>
            {conViec && (
              <div className="mt-2 flex flex-wrap gap-1.5 pl-6">
                {dang === t.id && <Loader2 size={15} className="mt-1.5 animate-spin text-muted-foreground" />}
                {t.hanh_dong.map((h) => (
                  <button key={h.nhan} type="button" disabled={dang !== null} onClick={() => void bam(t, h)}
                    className={`h-8 rounded-lg px-3 text-xs font-medium disabled:opacity-40 ${h.chinh ? 'bg-primary text-primary-foreground hover:brightness-110' : 'border border-border text-foreground hover:bg-accent'}`}>
                    {h.nhan}
                  </button>
                ))}
              </div>
            )}
            {t.hanh_dong.length > 0 && t.da_xu_ly_luc && (
              <p className="mt-1 flex items-center gap-1 pl-6 text-xs text-muted-foreground"><Check size={12} className="text-mimi-green" /> {dich('ui2.tb.daXuLy')}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
