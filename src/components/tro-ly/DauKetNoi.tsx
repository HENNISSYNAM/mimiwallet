import { Cpu, Landmark, QrCode, Shuffle } from 'lucide-react';
import claudeLogo from '@/assets/logos/claude.webp';
import geminiLogo from '@/assets/logos/gemini.png';
import openaiLogo from '@/assets/logos/openai.webp';
import thueLogo from '@/assets/logos/tax-authority.png';

const ANH: Record<string, string> = { anthropic: claudeLogo, gemini: geminiLogo, openai: openaiLogo, tong_cuc_thue: thueLogo };

/**
 * Dấu nhận biết của một kết nối — logo Claude, Gemini, OpenAI bản người dùng cập nhật
 * 15/09/2026. OpenRouter, ngân hàng, Casso hiện biểu tượng trung tính.
 * `tron`: chỉ logo, không khung — dùng trong cụm logo chồng nhau.
 */
export function DauKetNoi({ khoa, lon = false, tron = false }: { khoa: string; lon?: boolean; tron?: boolean }) {
  if (tron) {
    if (ANH[khoa]) return <img src={ANH[khoa]} alt="" className="h-3.5 w-3.5 object-contain" />;
    const I = khoa === 'ngan_hang' ? Landmark : khoa === 'casso' ? QrCode : khoa === 'openrouter' ? Shuffle : Cpu;
    return <I size={12} className="text-slate-800" aria-hidden />;
  }
  const khung = `flex shrink-0 items-center justify-center rounded-lg border border-border bg-white ${lon ? 'h-11 w-11' : 'h-8 w-8'}`;
  if (khoa === 'openai') return <span className={khung}><img src={openaiLogo} alt="" className={lon ? 'h-6 w-6 object-contain' : 'h-4 w-4 object-contain'} /></span>;
  if (khoa === 'anthropic') return <span className={khung}><img src={claudeLogo} alt="" className={lon ? 'h-6 w-6 object-contain' : 'h-4 w-4 object-contain'} /></span>;
  if (khoa === 'gemini') return <span className={khung}><img src={geminiLogo} alt="" className={lon ? 'h-6 w-6 object-contain' : 'h-4 w-4 object-contain'} /></span>;
  if (khoa === 'tong_cuc_thue') return <span className={khung}><img src={thueLogo} alt="" className={lon ? 'h-8 w-8 object-contain' : 'h-6 w-6 object-contain'} /></span>;
  const Icon = khoa === 'ngan_hang' ? Landmark : khoa === 'casso' ? QrCode : khoa === 'openrouter' ? Shuffle : Cpu;
  return <span className={`${khung} text-slate-800`}><Icon size={lon ? 20 : 16} aria-hidden /></span>;
}
