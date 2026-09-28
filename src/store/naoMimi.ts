import { create } from 'zustand';
import i18n from 'i18next';
import { goiTroLy } from '@/lib/goiTroLy';
import { useAuthStore } from '@/store/useAuthStore';
import { idCongTyDangDung, SU_KIEN_DOI_CONG_TY } from '@/lib/congTyDangDung';
import type { NhomNangLuc, QuyTrinhAgent, TraLoiNao } from '@/lib/troLy';

/**
 * BỘ NÃO DÙNG CHUNG phía giao diện (28/09/2026).
 *
 * Trợ lý MIMI, Pet và khối điều phối trên Tổng quan đọc/ghi CÙNG một kho: cùng lịch sử câu hỏi, cùng kết
 * quả, cùng trạng thái đang chạy và lỗi. Mọi câu hỏi tài chính đi qua `tro-ly` (JWT thật qua `goiTroLy`) —
 * không nơi nào có planner nghiệp vụ riêng.
 *
 * Bốn điều kho này phải giữ:
 *   1. PHẠM VI = người dùng + công ty. Đổi tài khoản, đổi công ty, đăng xuất → xoá sạch, và phản hồi của
 *      phạm vi cũ đến muộn bị bỏ (so `theHe`), không bao giờ quay vào màn hình của phạm vi mới.
 *   2. KHÔNG LƯU XUỐNG ĐĨA. Sao kê, chứng từ, câu trả lời tài chính chỉ sống trong bộ nhớ của tab.
 *   3. MỘT VIỆC MỘT REQUEST. Cùng câu hỏi (cùng phạm vi nhóm) hay cùng quy trình đang chạy → trả lại đúng
 *      promise đang chạy, không gửi lần hai; bấm đúp không nhân đôi.
 *   4. NGỪNG CHỜ ≠ ĐÃ HUỶ. Huỷ phía máy khách chỉ thôi chờ; máy chủ có thể vẫn làm xong. Giao diện nói đúng
 *      như vậy, và kho không bao giờ tự gọi lại.
 */

export type NguonHoi = 'tro_ly' | 'pet' | 'trang_chu';

/**
 * Ngôn ngữ giao diện gửi kèm mỗi yêu cầu (`ngon_ngu`) — pet, Trợ lý, Tổng quan cùng một bộ não, trả lời theo
 * ngôn ngữ người dùng đang xem. Chỉ là mã ngôn ngữ; mã chứng từ, số tài khoản, tiền tệ, số tiền không bị dịch.
 * Không có mô hình thì bộ luật chỉ hiểu một số ý định tiếng Việt/Anh — giao diện không hứa hơn thế.
 */
export function ngonNguHienTai(): string {
  const l = (i18n.resolvedLanguage ?? i18n.language ?? 'vi').toLowerCase();
  return ['vi', 'en', 'ko', 'zh'].find((m) => l.startsWith(m)) ?? 'vi';
}

export interface LuotNao {
  id: number;
  loai: 'hoi' | 'dan_agent';
  cau: string;
  phamVi: NhomNangLuc | null;
  quyTrinh: QuyTrinhAgent | null;
  nguon: NguonHoi;
  trangThai: 'dang' | 'xong' | 'loi' | 'ngung_cho';
  traLoi: TraLoiNao | null;
  loi: string | null;
  luc: number;
  /** Hỏi bằng giọng (pet) → xong thì đọc to. */
  bangGiong: boolean;
  /** Pet: người dùng đã xem/gạt thông báo của lượt này. Chỉ là cờ giao diện. */
  daXem: boolean;
}

export const CAU_NGUNG_CHO =
  'Đã ngừng chờ trên máy này. Máy chủ có thể vẫn xử lý xong — MIMI không tự gửi lại; hỏi lại khi bạn cần.';

/** Giữ tối đa ngần này lượt trong bộ nhớ. */
const TOI_DA_LUOT = 30;

interface DangChay { id: number; promise: Promise<LuotNao>; ctrl: AbortController }
/** Ngoài state để không kích render: việc đang chạy theo khoá chống trùng. */
const dangChay = new Map<string, DangChay>();
/** Tăng mỗi lần đổi phạm vi — phản hồi mang thế hệ cũ bị bỏ. */
let theHe = 0;
let demId = 0;

interface NaoState {
  /** `${userId}:${companyId}`; null = chưa biết / đã đăng xuất. */
  phamVi: string | null;
  luot: LuotNao[];
  datPhamVi: (p: string | null) => void;
  hoi: (cau: string, tc?: { phamVi?: NhomNangLuc | null; nguon?: NguonHoi; lichSu?: unknown[]; bangGiong?: boolean }) => Promise<LuotNao>;
  chayQuyTrinh: (q: QuyTrinhAgent, tc?: { nguon?: NguonHoi }) => Promise<LuotNao>;
  ngungCho: (id: number) => void;
  /** Đưa vào kho một lượt đã có câu trả lời (vd. mở từ liên kết cũ) — không gọi máy chủ. */
  themLuotCoSan: (cau: string, traLoi: TraLoiNao, nguon: NguonHoi) => number;
  danhDauDaXem: (id: number) => void;
  boLuot: (id: number) => void;
  /** "Cuộc hỏi mới": bỏ các lượt đã xong; lượt đang chạy (vd. của pet) vẫn giữ. */
  xoaLuotDaXong: () => void;
}

const sua = (id: number, f: (l: LuotNao) => LuotNao) => (s: NaoState) => ({ luot: s.luot.map((l) => (l.id === id ? f(l) : l)) });

function huyTatCa() {
  for (const d of dangChay.values()) d.ctrl.abort();
  dangChay.clear();
}

export const useNaoMimi = create<NaoState>()((set, get) => {
  /** Chạy một việc với khoá chống trùng; mọi lần ghi kết quả đều kiểm thế hệ và sự tồn tại của lượt. */
  function chay(khoa: string, taoLuot: Omit<LuotNao, 'id' | 'trangThai' | 'traLoi' | 'loi' | 'luc' | 'daXem'>,
    goi: (signal: AbortSignal) => Promise<TraLoiNao>): Promise<LuotNao> {
    const dang = dangChay.get(khoa);
    if (dang) return dang.promise;

    const id = ++demId;
    const theHeLuc = theHe;
    const ctrl = new AbortController();
    const luot: LuotNao = { ...taoLuot, id, trangThai: 'dang', traLoi: null, loi: null, luc: Date.now(), daXem: false };
    set((s) => ({ luot: [...s.luot, luot].slice(-TOI_DA_LUOT) }));

    const conHieuLuc = () => theHeLuc === theHe && get().luot.some((l) => l.id === id);
    const promise = (async (): Promise<LuotNao> => {
      try {
        const traLoi = await goi(ctrl.signal);
        if (conHieuLuc() && !ctrl.signal.aborted) set(sua(id, (l) => ({ ...l, trangThai: 'xong', traLoi })));
      } catch (e) {
        if (conHieuLuc()) {
          const ngung = ctrl.signal.aborted;
          set(sua(id, (l) => ({ ...l, trangThai: ngung ? 'ngung_cho' : 'loi', loi: ngung ? CAU_NGUNG_CHO : (e instanceof Error ? e.message : 'Chưa hỏi được MIMI.') })));
        }
      } finally {
        if (dangChay.get(khoa)?.id === id) dangChay.delete(khoa);
      }
      return get().luot.find((l) => l.id === id) ?? { ...luot, trangThai: 'ngung_cho', loi: CAU_NGUNG_CHO };
    })();
    dangChay.set(khoa, { id, promise, ctrl });
    return promise;
  }

  return {
    phamVi: null,
    luot: [],

    datPhamVi: (p) => {
      if (p === get().phamVi) return;
      theHe++;
      huyTatCa();
      set({ phamVi: p, luot: [] });
    },

    hoi: (cauHoi, tc = {}) => {
      const cau = cauHoi.trim().slice(0, 1000);
      if (!cau) return Promise.reject(new Error('Câu hỏi trống.'));
      const pv = tc.phamVi ?? null;
      const khoa = `${get().phamVi ?? '-'}|hoi|${pv ?? ''}|${cau}`;
      return chay(khoa, { loai: 'hoi', cau, phamVi: pv, quyTrinh: null, nguon: tc.nguon ?? 'tro_ly', bangGiong: !!tc.bangGiong },
        // Gửi đúng như nơi gọi đưa (Trợ lý gửi cả `pham_vi: null` và lịch sử; pet chỉ gửi câu) — cùng hợp đồng `hoi` cũ.
        async (signal) => (await goiTroLy('hoi', { cau, ...(tc.phamVi !== undefined ? { pham_vi: tc.phamVi } : {}), ...(tc.lichSu ? { lich_su: tc.lichSu } : {}), ngon_ngu: ngonNguHienTai() }, { signal })) as TraLoiNao);
    },

    chayQuyTrinh: (q, tc = {}) => {
      const khoa = `${get().phamVi ?? '-'}|dan_agent|${q}`;
      return chay(khoa, { loai: 'dan_agent', cau: TEN_QUY_TRINH[q], phamVi: null, quyTrinh: q, nguon: tc.nguon ?? 'trang_chu', bangGiong: false },
        async (signal) => (await goiTroLy('chay_dan_agent', { quy_trinh: q, ngon_ngu: ngonNguHienTai() }, { signal })) as TraLoiNao);
    },

    ngungCho: (id) => {
      for (const [k, d] of dangChay) {
        if (d.id !== id) continue;
        d.ctrl.abort();
        dangChay.delete(k);
      }
      set(sua(id, (l) => (l.trangThai === 'dang' ? { ...l, trangThai: 'ngung_cho', loi: CAU_NGUNG_CHO } : l)));
    },

    themLuotCoSan: (cau, traLoi, nguon) => {
      const id = ++demId;
      set((s) => ({ luot: [...s.luot, { id, loai: 'hoi' as const, cau, phamVi: null, quyTrinh: null, nguon, trangThai: 'xong' as const, traLoi, loi: null, luc: Date.now(), bangGiong: false, daXem: true }].slice(-TOI_DA_LUOT) }));
      return id;
    },

    danhDauDaXem: (id) => set(sua(id, (l) => ({ ...l, daXem: true }))),
    boLuot: (id) => set((s) => ({ luot: s.luot.filter((l) => l.id !== id) })),
    xoaLuotDaXong: () => set((s) => ({ luot: s.luot.filter((l) => l.trangThai === 'dang') })),
  };
});

export const TEN_QUY_TRINH: Record<QuyTrinhAgent, string> = {
  ke_toan_hang_ngay: 'Kế toán hằng ngày',
  thu_hoi_cong_no: 'Thu hồi công nợ',
  kiem_tra_so_sach: 'Kiểm tra sổ sách',
};

/**
 * Gắn phạm vi theo tài khoản + công ty. Gọi một lần (DashboardLayout); gọi lại không nhân đôi bộ nghe.
 * Đổi tài khoản / đăng xuất: xoá NGAY (đồng bộ) rồi mới đọc công ty mới — không có khe hở nào để màn hình
 * mới nhìn thấy câu trả lời của người trước.
 */
let daGan = false;
export function ganPhamViNao(): () => void {
  if (daGan) return () => {};
  daGan = true;
  let lanDoc = 0;
  const capNhat = async () => {
    const uid = useAuthStore.getState().user?.id ?? null;
    const lan = ++lanDoc;
    if (!uid) { useNaoMimi.getState().datPhamVi(null); return; }
    // Chưa biết công ty: về phạm vi tạm của người dùng này (đã xoá dữ liệu phạm vi cũ).
    const hienTai = useNaoMimi.getState().phamVi;
    if (!hienTai || !hienTai.startsWith(`${uid}:`)) useNaoMimi.getState().datPhamVi(`${uid}:?`);
    const cid = await idCongTyDangDung().catch(() => null);
    if (lan !== lanDoc) return;
    useNaoMimi.getState().datPhamVi(`${uid}:${cid ?? 'khong_co'}`);
  };
  let uidCu = useAuthStore.getState().user?.id ?? null;
  const huyAuth = useAuthStore.subscribe((s) => {
    const uid = s.user?.id ?? null;
    if (uid === uidCu) return;
    uidCu = uid;
    useNaoMimi.getState().datPhamVi(null);
    void capNhat();
  });
  const khiDoiCongTy = () => {
    const uid = useAuthStore.getState().user?.id ?? null;
    if (uid) useNaoMimi.getState().datPhamVi(`${uid}:?`);
    void capNhat();
  };
  window.addEventListener(SU_KIEN_DOI_CONG_TY, khiDoiCongTy);
  void capNhat();
  return () => { daGan = false; huyAuth(); window.removeEventListener(SU_KIEN_DOI_CONG_TY, khiDoiCongTy); };
}

/** Chỉ cho test: đưa kho về trạng thái đầu. */
export function datLaiNaoChoTest() {
  theHe++;
  huyTatCa();
  useNaoMimi.setState({ phamVi: null, luot: [] });
}
