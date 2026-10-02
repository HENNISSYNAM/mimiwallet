import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Bot, CalendarClock, Check, ChevronRight, Copy, Gauge, Info, Layers, Loader2, Lock, ShieldAlert, Timer, UserCheck, UserPlus,
  Users, Wallet, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { nguoiDungHienTai } from '@/lib/nguoiDung';
import { idCongTyDangDung } from '@/lib/congTyDangDung';
import type { Database } from '@/integrations/supabase/types';
import { NHOM_CHI, TEN_NHOM_CHI } from '@/lib/tacTu';
import { docSoTienBangChu } from '@/lib/soTienBangChu';
import { goiTacTu } from '@/lib/goiTacTu';
import { dong, tomTatChinhSach, vanBanChinhSach, type ChinhSachDoc } from '@/lib/chinhSachVanBan';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

/**
 * Chính sách chi — màn cài đặt, học theo bố cục "Expense policy" của Ramp.
 *
 * Mỗi luật là một hàng: tên luật, CÂU HỎI mà luật đó trả lời, và giá trị đang
 * đặt. Người chủ doanh nghiệp không nghĩ bằng "nguong_can_duyet"; họ nghĩ "khoản
 * trên bao nhiêu thì phải hỏi tôi?". Bấm hàng mở một ngăn chỉ sửa đúng luật đó,
 * nên không ai phải đọc cả biểu mẫu tám ô để đổi một con số.
 *
 * Cột phải là văn bản chính sách viết lại từ luật đang chạy (`chinhSachVanBan.ts`),
 * không phải tệp tải lên như Ramp: tệp tải lên sẽ lệch khỏi luật thật vào đúng
 * ngày ai đó sửa hạn mức mà quên sửa tệp.
 *
 * Nhóm "Luôn bật" là luật an toàn không tắt được — hiện ra để người dùng biết
 * chúng tồn tại, không phải để chỉnh.
 */

type Bang<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
type TacTu = Bang<'tac_tu'>;
type ChinhSachRow = Bang<'chinh_sach_chi'>;
type NguoiNhan = Bang<'nguoi_nhan_duoc_phep'>;

type Khoa = 'duyet' | 'nguoi-la' | 'han-muc' | 'tan-suat' | 'het-han' | 'nhom-chi' | 'nguoi-nhan' | 'nguoi-nhan-moi' | 'doi-so-tk';

const NHOM_HANG: Array<{ tieuDe: string; hang: Array<{ khoa: Khoa; icon: LucideIcon; ten: string; hoi: string; coDinh?: boolean }> }> = [
  {
    tieuDe: 'Duyệt',
    hang: [
      { khoa: 'duyet', icon: UserCheck, ten: 'Ngưỡng cần duyệt', hoi: 'Khoản trên bao nhiêu thì phải có người duyệt?' },
      { khoa: 'nguoi-la', icon: UserPlus, ten: 'Người nhận ngoài danh sách', hoi: 'Agent xin chi cho tài khoản lạ thì xử lý thế nào?' },
    ],
  },
  {
    tieuDe: 'Hạn mức',
    hang: [
      { khoa: 'han-muc', icon: Wallet, ten: 'Hạn mức chi', hoi: 'Mỗi khoản, mỗi ngày, mỗi tháng được chi tối đa bao nhiêu?' },
      { khoa: 'tan-suat', icon: Gauge, ten: 'Tần suất yêu cầu', hoi: 'Agent được gửi bao nhiêu yêu cầu mỗi giờ?' },
      { khoa: 'het-han', icon: CalendarClock, ten: 'Thời hạn chính sách', hoi: 'Chính sách này có hiệu lực tới khi nào?' },
    ],
  },
  {
    tieuDe: 'Phạm vi chi',
    hang: [
      { khoa: 'nhom-chi', icon: Layers, ten: 'Nhóm chi được phép', hoi: 'Agent được chi cho những việc gì?' },
      { khoa: 'nguoi-nhan', icon: Users, ten: 'Người nhận được phép', hoi: 'Những tài khoản nào được trả? Dùng chung cho mọi agent.' },
    ],
  },
  {
    tieuDe: 'Luôn bật',
    hang: [
      { khoa: 'nguoi-nhan-moi', icon: Timer, ten: 'Giữ người nhận mới', hoi: 'Tài khoản vừa thêm có được tự duyệt ngay không?', coDinh: true },
      { khoa: 'doi-so-tk', icon: ShieldAlert, ten: 'Cảnh báo đổi số tài khoản', hoi: 'Cùng tên người nhận mà khác số tài khoản thì sao?', coDinh: true },
    ],
  },
];

const o = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm';
const nut = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50';
const soTu = (s: string) => Number(s.replace(/\D/g, '') || 0);
const luc = (s: string | null) =>
  s ? new Date(s).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

/** Toàn bộ trường mà `luu_chinh_sach` đòi — màn này chỉ đổi một phần, phần còn lại giữ nguyên. */
const thanGui = (cs: ChinhSachDoc): Record<string, unknown> => ({
  han_muc_moi_lan: cs.han_muc_moi_lan,
  han_muc_ngay: cs.han_muc_ngay,
  han_muc_thang: cs.han_muc_thang,
  nguong_can_duyet: cs.nguong_can_duyet,
  nhom_chi_duoc_phep: cs.nhom_chi_duoc_phep,
  chi_tra_nguoi_nhan_da_duyet: cs.chi_tra_nguoi_nhan_da_duyet,
  het_han: cs.het_han,
  so_yeu_cau_moi_gio: cs.so_yeu_cau_moi_gio,
});

export default function ChinhSachChiPage() {
  const [thamSo, datThamSo] = useSearchParams();
  const [dangTai, setDangTai] = useState(true);
  const [dsTacTu, setDsTacTu] = useState<TacTu[]>([]);
  const [chinhSach, setChinhSach] = useState<Record<string, ChinhSachRow>>({});
  const [nguoiNhan, setNguoiNhan] = useState<NguoiNhan[]>([]);
  const [dangMo, setDangMo] = useState<Khoa | null>(null);
  const [dangLuu, setDangLuu] = useState(false);

  const tai = useCallback(async () => {
    try {
      const user = await nguoiDungHienTai();
      if (!user) return;
      const id = await idCongTyDangDung();
      if (!id) return;
      const cty = { id };
      const [tt, cs, nn] = await Promise.all([
        supabase.from('tac_tu').select('*').eq('company_id', cty.id).neq('trang_thai', 'thu_hoi').order('created_at', { ascending: true }),
        supabase.from('chinh_sach_chi').select('*').eq('company_id', cty.id),
        supabase.from('nguoi_nhan_duoc_phep').select('*').eq('company_id', cty.id).order('created_at', { ascending: true }),
      ]);
      const loi = [tt, cs, nn].find((r) => r.error)?.error;
      if (loi) toast.error(`Không đọc được chính sách: ${loi.message}`);
      setDsTacTu(tt.data ?? []);
      setChinhSach(Object.fromEntries((cs.data ?? []).map((r) => [r.tac_tu_id, r])));
      setNguoiNhan(nn.data ?? []);
    } finally {
      setDangTai(false);
    }
  }, []);

  useEffect(() => { void tai(); }, [tai]);

  const tacTu = dsTacTu.find((t) => t.id === thamSo.get('agent')) ?? dsTacTu[0];
  const cs = tacTu ? chinhSach[tacTu.id] : undefined;

  const luu = async (doi: Partial<ChinhSachDoc>) => {
    if (!tacTu || !cs) return;
    setDangLuu(true);
    try {
      await goiTacTu('luu_chinh_sach', { tac_tu_id: tacTu.id, ...thanGui({ ...cs, ...doi }) });
      toast.success('Đã lưu. Luật mới áp dụng cho yêu cầu tiếp theo.');
      setDangMo(null);
      await tai();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không lưu được');
    } finally {
      setDangLuu(false);
    }
  };

  if (dangTai) {
    return (
      <p className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 size={15} className="animate-spin" /> Đang đọc chính sách chi…
      </p>
    );
  }

  if (!tacTu || !cs) {
    return (
      <div className="mx-auto max-w-2xl py-16">
        <h1 className="text-2xl font-semibold">Chính sách chi</h1>
        <p className="mt-2 text-muted-foreground">
          Chính sách gắn với từng agent. Chưa có agent nào, nên chưa có chính sách để đặt.
        </p>
        <Link to="/dashboard/tac-tu" className={`${nut} mt-5 bg-primary text-primary-foreground hover:bg-primary/90`}>
          <Bot size={15} /> Thêm agent đầu tiên
        </Link>
      </div>
    );
  }

  const tomTat = tomTatChinhSach(cs, nguoiNhan.length);
  const vanBan = vanBanChinhSach(cs);
  const hangDangMo = NHOM_HANG.flatMap((n) => n.hang).find((h) => h.khoa === dangMo);

  return (
    <div className="mx-auto max-w-6xl pb-16">
      <p className="text-sm text-muted-foreground">Kiểm soát agent</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Chính sách chi</h1>

      {dsTacTu.length > 1 && (
        <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Chọn agent">
          {dsTacTu.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={t.id === tacTu.id}
              onClick={() => datThamSo({ agent: t.id }, { replace: true })}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                t.id === tacTu.id ? 'border-primary bg-primary/10 font-medium text-primary' : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {t.ten}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-10 border-t border-border pt-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-9">
          {NHOM_HANG.map((nhom) => (
            <section key={nhom.tieuDe}>
              <h2 className="mb-3 text-base font-semibold">{nhom.tieuDe}</h2>
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                {nhom.hang.map((h) => (
                  <button
                    key={h.khoa}
                    data-mimi={`chinh-sach.${h.khoa}`}
                    onClick={() => setDangMo(h.khoa)}
                    className="flex w-full items-center gap-4 border-b border-border px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-muted/50"
                  >
                    <h.icon size={17} className="shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{h.ten}</span>
                      <span className="block text-[13px] text-muted-foreground">{h.hoi}</span>
                    </span>
                    <span className="hidden max-w-[40%] truncate text-right text-[13px] text-foreground sm:block">
                      {h.coDinh ? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground"><Lock size={12} /> Luôn bật</span>
                      ) : (
                        tomTat[h.khoa as keyof typeof tomTat]
                      )}
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="self-start lg:sticky lg:top-6">
          <h2 className="mb-3 text-base font-semibold">Văn bản chính sách</h2>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="max-h-[440px] overflow-y-auto bg-background px-6 py-6 text-[12px] leading-relaxed text-foreground">
              <p className="text-center text-[13px] font-semibold">Chính sách chi của agent “{tacTu.ten}”</p>
              <ol className="mt-4 list-decimal space-y-2 pl-4">
                {vanBan.map((dongVb) => <li key={dongVb}>{dongVb}</li>)}
              </ol>
            </div>
            <div className="space-y-3 border-t border-border p-4">
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info size={13} className="mt-0.5 shrink-0" />
                Viết lại từ luật đang chạy mỗi lần bạn lưu. Sửa lần cuối {luc(cs.updated_at)}.
              </p>
              <button
                onClick={() =>
                  navigator.clipboard
                    .writeText(`Chính sách chi của agent "${tacTu.ten}"\n\n${vanBan.map((d, i) => `${i + 1}. ${d}`).join('\n')}`)
                    .then(() => toast.success('Đã chép văn bản.'), () => toast.error('Không chép được — bôi đen rồi chép tay.'))
                }
                className={`${nut} w-full border border-border hover:bg-muted`}
              >
                <Copy size={14} /> Chép văn bản
              </button>
            </div>
          </div>
        </aside>
      </div>

      <Sheet open={dangMo !== null} onOpenChange={(mo) => { if (!mo) setDangMo(null); }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {hangDangMo && (
            <>
              <SheetHeader>
                <SheetTitle>{hangDangMo.ten}</SheetTitle>
                <SheetDescription>{hangDangMo.hoi} · Agent “{tacTu.ten}”</SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <SuaMuc key={`${tacTu.id}-${hangDangMo.khoa}`} khoa={hangDangMo.khoa} cs={cs} nguoiNhan={nguoiNhan} dangLuu={dangLuu} luu={luu} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function OTien({ nhan, gia, dat }: { nhan: string; gia: string; dat: (s: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">{nhan}</span>
      <input value={gia} onChange={(e) => dat(e.target.value)} inputMode="numeric" className={`${o} font-mono`} />
      <span className="mt-1 block text-[11px] text-muted-foreground">
        {dong(soTu(gia))} · {docSoTienBangChu(soTu(gia))}
      </span>
    </label>
  );
}

function NutLuu({ dangLuu, tat }: { dangLuu: boolean; tat?: boolean }) {
  return (
    <button type="submit" disabled={dangLuu || tat} className={`${nut} mt-6 w-full bg-primary text-primary-foreground hover:bg-primary/90`}>
      {dangLuu ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Lưu
    </button>
  );
}

function SuaMuc({
  khoa, cs, nguoiNhan, dangLuu, luu,
}: {
  khoa: Khoa;
  cs: ChinhSachDoc;
  nguoiNhan: NguoiNhan[];
  dangLuu: boolean;
  luu: (doi: Partial<ChinhSachDoc>) => void;
}) {
  const [nguong, setNguong] = useState(String(cs.nguong_can_duyet));
  const [moiLan, setMoiLan] = useState(String(cs.han_muc_moi_lan));
  const [ngay, setNgay] = useState(String(cs.han_muc_ngay));
  const [thang, setThang] = useState(String(cs.han_muc_thang));
  const [moiGio, setMoiGio] = useState(cs.so_yeu_cau_moi_gio == null ? '' : String(cs.so_yeu_cau_moi_gio));
  const [hetHan, setHetHan] = useState(cs.het_han ? cs.het_han.slice(0, 10) : '');
  const [chiDaDuyet, setChiDaDuyet] = useState(cs.chi_tra_nguoi_nhan_da_duyet);
  const [moiNhom, setMoiNhom] = useState(cs.nhom_chi_duoc_phep === null);
  const [nhom, setNhom] = useState<string[]>(cs.nhom_chi_duoc_phep ?? []);

  const gui = (doi: Partial<ChinhSachDoc>) => (e: React.FormEvent) => {
    e.preventDefault();
    luu(doi);
  };

  switch (khoa) {
    case 'duyet':
      return (
        <form onSubmit={gui({ nguong_can_duyet: soTu(nguong) })}>
          <OTien nhan="Trên mức này phải có người duyệt" gia={nguong} dat={setNguong} />
          <p className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            Đặt 0 thì mọi khoản đều phải duyệt — mặc định cho agent mới. Khoản bằng hoặc dưới mức này chỉ được tự duyệt khi
            đạt mọi luật khác: hạn mức, nhóm chi, người nhận.
          </p>
          <NutLuu dangLuu={dangLuu} />
        </form>
      );

    case 'nguoi-la':
      return (
        <form onSubmit={gui({ chi_tra_nguoi_nhan_da_duyet: chiDaDuyet })}>
          <fieldset className="space-y-2">
            {[
              { gia: true, ten: 'Từ chối', mo: 'Chỉ chi cho tài khoản trong danh sách người nhận được phép.' },
              { gia: false, ten: 'Hỏi tôi duyệt', mo: 'Tài khoản lạ vẫn xin được, nhưng luôn phải có người duyệt.' },
            ].map((l) => (
              <label key={l.ten} className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${chiDaDuyet === l.gia ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <input type="radio" name="nguoi-la" className="mt-1" checked={chiDaDuyet === l.gia} onChange={() => setChiDaDuyet(l.gia)} />
                <span>
                  <span className="block text-sm font-medium">{l.ten}</span>
                  <span className="block text-xs text-muted-foreground">{l.mo}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <NutLuu dangLuu={dangLuu} />
        </form>
      );

    case 'han-muc': {
      const saiThuTu = !(soTu(moiLan) <= soTu(ngay) && soTu(ngay) <= soTu(thang));
      return (
        <form onSubmit={gui({ han_muc_moi_lan: soTu(moiLan), han_muc_ngay: soTu(ngay), han_muc_thang: soTu(thang) })} className="space-y-4">
          <OTien nhan="Mỗi khoản tối đa" gia={moiLan} dat={setMoiLan} />
          <OTien nhan="Mỗi ngày tối đa" gia={ngay} dat={setNgay} />
          <OTien nhan="Mỗi tháng tối đa" gia={thang} dat={setThang} />
          {saiThuTu && <p className="text-xs text-destructive">Mỗi khoản ≤ mỗi ngày ≤ mỗi tháng.</p>}
          <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            Vượt bất kỳ hạn mức nào thì yêu cầu bị từ chối ngay, không tới tay bạn. Khoản đang chờ duyệt cũng được tính vào
            phần đã dùng.
          </p>
          <NutLuu dangLuu={dangLuu} tat={saiThuTu} />
        </form>
      );
    }

    case 'tan-suat': {
      const so = moiGio.trim() === '' ? null : soTu(moiGio);
      const sai = so !== null && (so < 1 || so > 1000);
      return (
        <form onSubmit={gui({ so_yeu_cau_moi_gio: so })}>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Tối đa yêu cầu mỗi giờ</span>
            <input value={moiGio} onChange={(e) => setMoiGio(e.target.value)} inputMode="numeric" placeholder="Không giới hạn" className={o} />
          </label>
          {sai && <p className="mt-2 text-xs text-destructive">Từ 1 đến 1000, hoặc để trống.</p>}
          <p className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            Chặn agent chạy vòng lặp gửi dồn dập. Để trống là không giới hạn.
          </p>
          <NutLuu dangLuu={dangLuu} tat={sai} />
        </form>
      );
    }

    case 'het-han':
      return (
        <form onSubmit={gui({ het_han: hetHan ? new Date(`${hetHan}T23:59:59+07:00`).toISOString() : null })}>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Hết hiệu lực sau ngày</span>
            <input type="date" value={hetHan} onChange={(e) => setHetHan(e.target.value)} className={o} />
          </label>
          {hetHan && (
            <button type="button" onClick={() => setHetHan('')} className="mt-2 text-xs text-primary hover:underline">Bỏ ngày hết hạn</button>
          )}
          <p className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            Hợp với agent chạy theo chiến dịch: hết ngày thì agent không xin chi được nữa cho tới khi bạn gia hạn.
          </p>
          <NutLuu dangLuu={dangLuu} />
        </form>
      );

    case 'nhom-chi':
      return (
        <form onSubmit={gui({ nhom_chi_duoc_phep: moiNhom ? null : nhom })}>
          <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm font-medium">
            <input type="checkbox" checked={moiNhom} onChange={(e) => setMoiNhom(e.target.checked)} /> Mọi nhóm chi
          </label>
          {!moiNhom && (
            <div className="mt-3 space-y-1.5">
              {NHOM_CHI.map((n) => (
                <label key={n} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={nhom.includes(n)}
                    onChange={(e) => setNhom((cu) => (e.target.checked ? [...cu, n] : cu.filter((x) => x !== n)))}
                  />
                  {TEN_NHOM_CHI[n]}
                </label>
              ))}
            </div>
          )}
          {!moiNhom && nhom.length === 0 && <p className="mt-2 text-xs text-destructive">Chọn ít nhất một nhóm.</p>}
          <NutLuu dangLuu={dangLuu} tat={!moiNhom && nhom.length === 0} />
        </form>
      );

    case 'nguoi-nhan':
      return (
        <div>
          {nguoiNhan.length === 0 ? (
            <p className="text-sm text-muted-foreground">Danh sách đang trống.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border text-sm">
              {nguoiNhan.map((n) => (
                <li key={n.id} className="px-3 py-2.5">
                  <span className="block font-medium">{n.ten_chu_tai_khoan}</span>
                  <span className="block font-mono text-xs text-muted-foreground">{n.so_tai_khoan}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            Danh sách dùng chung cho mọi agent. Thêm hoặc bỏ người nhận ở màn Kiểm soát agent — mỗi thay đổi được ghi vào nhật ký.
          </p>
          <Link to="/dashboard/tac-tu" className={`${nut} mt-4 w-full border border-border hover:bg-muted`}>Quản lý người nhận</Link>
        </div>
      );

    case 'nguoi-nhan-moi':
      return (
        <p className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed text-muted-foreground">
          Tài khoản vừa thêm vào danh sách vẫn chi được, nhưng trong 24 giờ đầu không được <strong className="text-foreground">tự</strong> duyệt —
          luôn phải có người bấm. Kẻ gian thường thắng bằng sự vội: thêm tài khoản rồi đòi chuyển ngay. Luật này không tắt được.
        </p>
      );

    case 'doi-so-tk':
      return (
        <p className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed text-muted-foreground">
          Nếu tên người nhận trùng với một lần trả trong 180 ngày qua nhưng số tài khoản khác, yêu cầu phải có người duyệt và
          hiện cảnh báo đỏ. Đây là kiểu lừa đảo giả danh nhà cung cấp hay gặp nhất. Luật này không tắt được.
        </p>
      );
  }
}
