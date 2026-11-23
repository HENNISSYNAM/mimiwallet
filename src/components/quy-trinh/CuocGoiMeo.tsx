/**
 * GỌI THOẠI cho mèo agent (23/11/2026) — như gọi cho một đồng nghiệp: người nói, mèo nghe, nghĩ, rồi nói lại. Giống chat thoại của GPT.
 *
 * KHÔNG THÊM API NGOÀI. Nghe và đọc giọng đều là của TRÌNH DUYỆT (Web Speech API: `useNgheGiong`, `docGiong`); lời nói đổi thành chữ rồi đi
 * qua đúng đường nhắn tin với mèo (cùng một câu trả lời, cùng luật: dùng số liệu thật, không bịa, không chuyển tiền). Mỗi lượt nói
 * được lưu vào khung chat nên gọi xong còn xem lại. Giao diện chỉ đổi chữ trạng thái và viền, không nhấp nháy.
 */
import { useEffect, useRef, useState } from 'react';
import { Mic, PhoneOff } from 'lucide-react';
import { Meo } from '@/components/agent/AvatarMeo';
import { HopBatMic } from '@/components/giong/HopBatMic';
import { CAU_LOI_NGHE, useNgheGiong } from '@/hooks/useNgheGiong';
import { docGiong, dungDoc } from '@/lib/docGiong';

const DEM_TOI_DA_KHONG_NGHE = 3;
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function CuocGoiMeo({ meo, ten, guiTin, onDong }: {
  meo: string; ten: string; guiTin: (cau: string) => Promise<string>; onDong: () => void;
}) {
  const [tt, setTt] = useState<'cho' | 'nghi' | 'noi'>('cho');
  const [phuDe, setPhuDe] = useState<string | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [tuDong, setTuDong] = useState(true);
  const [giay, setGiay] = useState(0);
  const song = useRef(true);
  const khongNghe = useRef(0);

  const xuLy = async (cau: string) => {
    khongNghe.current = 0;
    setTt('nghi'); setLoi(null); setPhuDe(null);
    try {
      const tra = await guiTin(cau);
      if (!song.current) return;
      setPhuDe(tra); setTt('noi');
      await docGiong(tra);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Chưa gửi được.');
      setTuDong(false);
    } finally {
      if (song.current) setTt('cho');
    }
  };

  const nghe = useNgheGiong({
    onCau: (c) => void xuLy(c),
    onLoi: (l) => {
      if (!song.current) return;
      if (l === 'khong_nghe_thay') { khongNghe.current++; if (khongNghe.current >= DEM_TOI_DA_KHONG_NGHE) setTuDong(false); return; }
      setLoi(CAU_LOI_NGHE[l]); setTuDong(false);
    },
  });

  // Tự mở mic lại sau mỗi lượt mèo nói xong — như cuộc gọi thật; quá 3 lần im lặng thì dừng, chờ người bấm.
  useEffect(() => {
    if (tt !== 'cho' || !tuDong || !nghe.coHoTro || nghe.dangNghe || nghe.hoiQuyen) return;
    const h = setTimeout(() => { if (song.current) void nghe.batDau(); }, 500);
    return () => clearTimeout(h);
  }, [tt, tuDong, nghe.dangNghe, nghe.hoiQuyen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { const h = setInterval(() => setGiay((g) => g + 1), 1000); return () => clearInterval(h); }, []);
  useEffect(() => () => { song.current = false; dungDoc(); }, []);

  const cup = () => { song.current = false; dungDoc(); nghe.dung(); onDong(); };
  const noiLai = () => { khongNghe.current = 0; setLoi(null); setTuDong(true); if (!nghe.dangNghe) void nghe.batDau(); };

  const nhan = nghe.dangNghe ? 'Đang nghe…' : tt === 'nghi' ? `${ten} đang nghĩ…` : tt === 'noi' ? `${ten} đang nói` : tuDong ? 'Chuẩn bị nghe…' : 'Bấm để nói';
  const vien = nghe.dangNghe ? 'ring-blue-500' : tt === 'noi' ? 'ring-emerald-500' : 'ring-slate-300 dark:ring-neutral-700';

  return (
    <div role="dialog" aria-label={`Cuộc gọi với ${ten}`} className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-background px-6 py-12" data-testid="cuoc-goi">
      <div className="text-center">
        <p className="text-lg font-semibold text-foreground">{ten}</p>
        <p className="text-sm text-muted-foreground" aria-live="polite">{mmss(giay)} · {nhan}</p>
      </div>
      <div className="flex flex-col items-center gap-6">
        <span className={`rounded-full p-4 ring-4 transition-shadow duration-300 ${vien}`}><Meo khoa={meo} net={tt === 'noi' ? 'vui' : nghe.dangNghe ? 'hoi' : 'lam'} co={120} ten={ten} /></span>
        <p className="min-h-[3rem] max-w-md text-center text-sm text-muted-foreground" aria-live="polite">{loi ?? phuDe ?? (!nghe.coHoTro ? 'Trình duyệt này chưa hỗ trợ nghe giọng nói. Hãy mở bằng Chrome hoặc Safari, hoặc nhắn chữ cho mèo.' : 'Nói bình thường — mèo nghe xong sẽ trả lời bằng giọng nói.')}</p>
      </div>
      <div className="flex items-center gap-6">
        <button type="button" onClick={noiLai} disabled={nghe.dangNghe || tt !== 'cho'} aria-label="Bấm để nói"
          className="flex h-14 w-14 items-center justify-center rounded-full border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-40"><Mic size={22} /></button>
        <button type="button" onClick={cup} aria-label="Cúp máy"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white transition-colors hover:bg-red-700"><PhoneOff size={26} /></button>
      </div>
      <HopBatMic trangThai={nghe.hoiQuyen} onDongY={() => void nghe.dongY()} onDong={nghe.dongHop} />
    </div>
  );
}
