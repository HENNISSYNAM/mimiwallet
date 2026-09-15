import { Cpu, Landmark, QrCode, Shuffle } from 'lucide-react';
import claudeLogo from '@/assets/logos/claude.webp';
import geminiLogo from '@/assets/logos/gemini.png';
import thueLogo from '@/assets/logos/tax-authority.png';

/**
 * Dấu nhận biết của một kết nối. Logo OpenAI chưa dùng (bản có sẵn mang watermark chưa trả
 * phí) nên OpenAI và OpenRouter hiện biểu tượng trung tính.
 */
export function DauKetNoi({ khoa, lon = false }: { khoa: string; lon?: boolean }) {
  const khung = `flex shrink-0 items-center justify-center rounded-lg border border-border bg-white ${lon ? 'h-11 w-11' : 'h-8 w-8'}`;
  if (khoa === 'anthropic') return <span className={khung}><img src={claudeLogo} alt="" className={lon ? 'h-6 w-auto' : 'h-4 w-auto'} /></span>;
  if (khoa === 'gemini') return <span className={khung}><img src={geminiLogo} alt="" className={lon ? 'h-10 w-auto' : 'h-7 w-auto'} /></span>;
  if (khoa === 'tong_cuc_thue') return <span className={khung}><img src={thueLogo} alt="" className={lon ? 'h-8 w-8 object-contain' : 'h-6 w-6 object-contain'} /></span>;
  const Icon = khoa === 'ngan_hang' ? Landmark : khoa === 'casso' ? QrCode : khoa === 'openrouter' ? Shuffle : Cpu;
  return <span className={`${khung} text-slate-800`}><Icon size={lon ? 20 : 16} aria-hidden /></span>;
}
