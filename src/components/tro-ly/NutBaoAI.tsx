import { useState } from 'react';
import { Flag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { guiPhanHoi } from '@/lib/phanHoi';

/**
 * BÁO CÂU TRẢ LỜI AI (06/10/2026). Chính sách "Nội dung do AI tạo" của Google Play: app có chatbot là tính năng chính
 * phải cho người dùng báo/gắn cờ câu trả lời ngay trong app. Ghi vào `phan_hoi_khach` (cau_hoi = 'bao_tra_loi_ai'),
 * kèm 500 ký tự đầu của câu trả lời để đội xem lại — đội đóng vòng theo docs/DONG_VONG_PHAN_HOI.md.
 */
const CHU: Record<string, { nut: string; hoi: string; sai: string; khongHop: string; khac: string; daGui: string; loi: string }> = {
  vi: { nut: 'Báo câu trả lời này', hoi: 'Câu trả lời có vấn đề gì?', sai: 'Sai số liệu hoặc sai thông tin', khongHop: 'Không phù hợp, xúc phạm', khac: 'Vấn đề khác', daGui: 'Đã gửi. Đội MIMI sẽ xem lại câu trả lời này.', loi: 'Chưa gửi được. Bạn thử lại sau nhé.' },
  en: { nut: 'Report this answer', hoi: 'What is wrong with this answer?', sai: 'Wrong numbers or information', khongHop: 'Inappropriate or offensive', khac: 'Something else', daGui: 'Sent. The MIMI team will review this answer.', loi: 'Could not send. Please try again later.' },
  ko: { nut: '이 답변 신고', hoi: '이 답변에 어떤 문제가 있나요?', sai: '숫자나 정보가 틀림', khongHop: '부적절하거나 불쾌함', khac: '기타 문제', daGui: '보냈습니다. MIMI 팀이 이 답변을 검토합니다.', loi: '보내지 못했습니다. 잠시 후 다시 시도해 주세요.' },
  zh: { nut: '举报此回答', hoi: '这个回答有什么问题？', sai: '数字或信息错误', khongHop: '不当或冒犯', khac: '其他问题', daGui: '已提交，MIMI 团队会复查此回答。', loi: '提交失败，请稍后再试。' },
};

export function NutBaoAI({ cauTraLoi }: { cauTraLoi: string }) {
  const { i18n } = useTranslation();
  const c = CHU[(i18n.resolvedLanguage ?? 'vi').slice(0, 2)] ?? CHU.vi;
  const [mo, setMo] = useState(false);
  const [daBao, setDaBao] = useState(false);

  const gui = async (lyDo: 'sai' | 'khong_phu_hop' | 'khac') => {
    setMo(false);
    const ok = await guiPhanHoi('bao_tra_loi_ai', { tra_loi: lyDo, ghi_chu: cauTraLoi });
    if (ok) { setDaBao(true); toast.success(c.daGui); } else toast.error(c.loi);
  };

  return (
    <Popover open={mo} onOpenChange={setMo}>
      <PopoverTrigger asChild>
        <button
          type="button" aria-label={c.nut} title={c.nut} disabled={daBao}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-accent disabled:cursor-default ${daBao ? 'text-mimi-amber' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Flag size={14} fill={daBao ? 'currentColor' : 'none'} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <p className="px-2 py-1.5 text-sm font-medium text-foreground">{c.hoi}</p>
        {([['sai', c.sai], ['khong_phu_hop', c.khongHop], ['khac', c.khac]] as const).map(([k, nhan]) => (
          <button key={k} type="button" onClick={() => void gui(k)}
            className="block w-full rounded-lg px-2 py-2 text-left text-sm text-foreground hover:bg-accent">
            {nhan}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
