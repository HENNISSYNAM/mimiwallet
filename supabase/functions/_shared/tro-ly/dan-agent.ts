/**
 * ĐÀN AGENT CỦA MIMI (29/09/2026) — nhiều agent chuyên môn, MỘT bộ não.
 *
 * Mỗi agent chỉ là một nhóm năng lực CÓ SẴN trong `NANG_LUC` (tinh-toan.ts): không planner thứ hai, không
 * mô hình riêng, không quyền riêng. Một lần chạy:
 *   1. gom mọi nguồn dữ liệu các tác vụ cần → đọc MỘT lần (đó là "tài nguyên dùng chung");
 *   2. chạy các tác vụ song song, tối đa `GIOI_HAN_SONG_SONG`;
 *   3. năng lực trùng giữa hai agent → tác vụ sau DÙNG LẠI kết quả, không tính lại;
 *   4. một tác vụ lỗi không kéo đổ tác vụ khác — nó mang trạng thái "lỗi" và câu lỗi thật.
 * Không gọi mô hình ngôn ngữ (`so_luot_mo_hinh = 0`), nên cùng dữ liệu luôn ra cùng kết quả.
 *
 * QUYỀN: chỉ đọc và soạn nháp. Đề xuất (duyệt chi, lưu chứng từ…) vẫn đi qua `xac_nhan` như mọi câu trả
 * lời khác; nhắc nợ là bản nháp; không gửi tin, không ghi sổ, không chuyển tiền.
 *
 * Hàm thuần: đọc dữ liệu, chạy năng lực, đồng hồ, sinh id đều được tiêm vào — test chạy được không cần DB.
 */
import { QUY_TRINH_DAN_AGENT, type AgentMimi, type DanAgent, type DoDayNguon, type KetQuaNangLuc, type QuyTrinhDanAgent, type TacVuAgent } from './kieu.ts';

export const GIOI_HAN_SONG_SONG = 3;

interface DinhNghiaAgent { id: string; ten: string; mo_ta: string; nang_luc: string[] }

/** Năm agent. Năng lực là khoá thật trong `NANG_LUC` — test kiểm từng khoá có tồn tại. */
export const DAN_AGENT: readonly DinhNghiaAgent[] = [
  { id: 'ke_toan', ten: 'Kế toán', mo_ta: 'Đọc sao kê: chi phí tháng, dòng tiền, khoản chi còn thiếu chứng từ.', nang_luc: ['chi_phi_thang', 'dong_tien', 'thieu_chung_tu'] },
  { id: 'doi_soat', ten: 'Đối soát', mo_ta: 'Khớp tiền về với hoá đơn bán ra đang chờ thu.', nang_luc: ['doi_soat'] },
  { id: 'cong_no', ten: 'Công nợ', mo_ta: 'Hoá đơn bán ra quá hạn; nhắc nợ chỉ là bản nháp để bạn duyệt.', nang_luc: ['hoa_don_qua_han'] },
  { id: 'kiem_soat_chi', ten: 'Kiểm soát chi', mo_ta: 'Khoản chi bất thường, khoản đang chờ bạn duyệt.', nang_luc: ['giao_dich_bat_thuong', 'yeu_cau_cho_duyet'] },
  { id: 'thue', ten: 'Thuế', mo_ta: 'Hạn thuế kế tiếp của công ty và việc cần chuẩn bị.', nang_luc: ['chuan_bi_han_thue'] },
];

/** Nhãn đọc được cho từng năng lực trong tác vụ (giao diện không hiện mã). */
export const NHAN_NANG_LUC: Record<string, string> = {
  chi_phi_thang: 'Chi phí tháng này',
  dong_tien: 'Dòng tiền 6 tháng',
  thieu_chung_tu: 'Khoản chi thiếu chứng từ',
  doi_soat: 'Khớp tiền về với hoá đơn',
  hoa_don_qua_han: 'Hoá đơn quá hạn thanh toán',
  giao_dich_bat_thuong: 'Khoản chi bất thường',
  yeu_cau_cho_duyet: 'Khoản đang chờ duyệt',
  chuan_bi_han_thue: 'Hạn thuế kế tiếp',
};

/** Ba quy trình: [agent, năng lực] theo thứ tự hiện ra. Cùng năng lực xuất hiện hai lần → lần sau dùng lại. */
export const QUY_TRINH: Record<QuyTrinhDanAgent, { ten: string; tac_vu: ReadonlyArray<readonly [string, string]>; gioi_han: string[] }> = {
  ke_toan_hang_ngay: {
    ten: 'Kế toán hằng ngày',
    tac_vu: [['ke_toan', 'chi_phi_thang'], ['ke_toan', 'thieu_chung_tu'], ['kiem_soat_chi', 'giao_dich_bat_thuong'], ['kiem_soat_chi', 'yeu_cau_cho_duyet'], ['thue', 'chuan_bi_han_thue']],
    gioi_han: [],
  },
  thu_hoi_cong_no: {
    ten: 'Thu hồi công nợ',
    tac_vu: [['cong_no', 'hoa_don_qua_han'], ['doi_soat', 'doi_soat']],
    gioi_han: ['Nhắc nợ chỉ là bản nháp — MIMI không tự gửi email, SMS hay tin nhắn cho khách.', 'MIMI không ghi nhận "đã thu" khi sao kê chưa xác nhận tiền về.'],
  },
  kiem_tra_so_sach: {
    ten: 'Kiểm tra sổ sách',
    tac_vu: [['doi_soat', 'doi_soat'], ['ke_toan', 'thieu_chung_tu'], ['kiem_soat_chi', 'giao_dich_bat_thuong'], ['ke_toan', 'dong_tien']],
    gioi_han: ['Đây là đối chiếu sổ với sao kê, không phải kiểm toán độc lập.'],
  },
};

const GIOI_HAN_CHUNG = [
  'Chỉ đọc và soạn nháp: không duyệt chi, không ghi sổ chính thức, không chuyển tiền.',
  'Số liệu là bản nháp trung gian — kế toán xác nhận tài khoản và chứng từ trước khi dùng.',
];

/**
 * Allowlist theo DANH SÁCH, không dùng `q in QUY_TRINH`: `in` đi theo chuỗi prototype nên '__proto__',
 * 'constructor', 'toString' lọt qua (test bắt được).
 */
export const laQuyTrinh = (q: unknown): q is QuyTrinhDanAgent => typeof q === 'string' && (QUY_TRINH_DAN_AGENT as readonly string[]).includes(q);

export interface PhuThuocChay<D> {
  /** Đọc dữ liệu cho tập nguồn. Gọi đúng một lần mỗi lần chạy. */
  docNguon: (can: Set<string>) => Promise<D>;
  /** Chạy một năng lực trên dữ liệu đã đọc. */
  chayNangLuc: (id: string, d: D) => Promise<KetQuaNangLuc>;
  /** Nguồn mà một năng lực cần (từ `NANG_LUC[id].can`). */
  nguonCua: (id: string) => readonly string[];
  congTyId: string;
  now?: () => number;
  taoId?: () => string;
  gioiHanSongSong?: number;
}

const cat = (s: string, n = 220) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** Thiếu hẳn nguồn (chưa kết nối) → tác vụ "cần bổ sung", không phải "hoàn tất" với số 0. */
const thieuNguon = (kq: KetQuaNangLuc) => (kq.do_day ?? []).some((d: DoDayNguon) => d.coverage_status === 'unavailable');

export async function chayDanAgent<D>(q: QuyTrinhDanAgent, p: PhuThuocChay<D>): Promise<{ ket_qua: KetQuaNangLuc[]; dan_agent: DanAgent; ten: string }> {
  const now = p.now ?? Date.now;
  const qt = QUY_TRINH[q];
  const batDau = now();
  const gioiHan = Math.max(1, p.gioiHanSongSong ?? GIOI_HAN_SONG_SONG);
  const tenAgent = new Map(DAN_AGENT.map((a) => [a.id, a.ten]));

  const can = new Set(qt.tac_vu.flatMap(([, nl]) => p.nguonCua(nl)));
  let d: D | null = null;
  let loiDoc: string | null = null;
  try {
    d = await p.docNguon(can);
  } catch (e) {
    loiDoc = e instanceof Error ? e.message : 'Không đọc được dữ liệu.';
  }

  /*
   * TÁI SỬ DỤNG, tính theo thứ tự tác vụ (không phụ thuộc thứ tự chạy song song): tác vụ không cần đọc thêm
   * nguồn nào vì các tác vụ trước đã cần đủ — nó chạy trên dữ liệu đã đọc sẵn; hoặc cùng năng lực đã chạy.
   */
  const taiSuDungTruoc: boolean[] = [];
  {
    const nguonTruoc = new Set<string>();
    const nlTruoc = new Set<string>();
    for (const [, nl] of qt.tac_vu) {
      const nguon = p.nguonCua(nl);
      taiSuDungTruoc.push(nlTruoc.has(nl) || (nguon.length > 0 && nguon.every((n) => nguonTruoc.has(n))));
      nguon.forEach((n) => nguonTruoc.add(n));
      nlTruoc.add(nl);
    }
  }

  const tacVu: TacVuAgent[] = new Array(qt.tac_vu.length);
  const ketQua = new Map<string, KetQuaNangLuc>();
  /** Lần chạy đầu của mỗi năng lực — tác vụ trùng chờ đúng promise đó (dùng lại, không tính lại). */
  const dangChay = new Map<string, Promise<KetQuaNangLuc>>();

  const lamMot = async (i: number) => {
    const [agentId, nl] = qt.tac_vu[i];
    const ten = `${tenAgent.get(agentId) ?? agentId} · ${NHAN_NANG_LUC[nl] ?? nl}`;
    const t0 = now();
    if (loiDoc || d === null) {
      tacVu[i] = { agent_id: agentId, nang_luc: nl, ten, trang_thai: 'loi', thoi_gian_ms: 0, tai_su_dung: false, cau: `Không đọc được dữ liệu: ${cat(loiDoc ?? '')}` };
      return;
    }
    const taiSuDung = taiSuDungTruoc[i];
    if (!dangChay.has(nl)) dangChay.set(nl, p.chayNangLuc(nl, d));
    try {
      const kq = await (dangChay.get(nl) as Promise<KetQuaNangLuc>);
      ketQua.set(nl, kq);
      tacVu[i] = {
        agent_id: agentId, nang_luc: nl, ten, trang_thai: thieuNguon(kq) ? 'can_bo_sung' : 'hoan_tat',
        thoi_gian_ms: Math.max(0, now() - t0), tai_su_dung: taiSuDung, cau: cat(kq.tom_tat),
      };
    } catch (e) {
      tacVu[i] = {
        agent_id: agentId, nang_luc: nl, ten, trang_thai: 'loi', thoi_gian_ms: Math.max(0, now() - t0), tai_su_dung: taiSuDung,
        cau: cat(`Không chạy được: ${e instanceof Error ? e.message : String(e)}`),
      };
    }
  };

  // Hàng đợi với giới hạn song song: `gioiHan` "công nhân" cùng rút việc theo thứ tự.
  let ke = 0;
  const congNhan = async () => { while (ke < qt.tac_vu.length) { const i = ke++; await lamMot(i); } };
  await Promise.all(Array.from({ length: Math.min(gioiHan, qt.tac_vu.length) }, congNhan));

  const xong = tacVu.filter((t) => t.trang_thai === 'hoan_tat').length;
  const trangThai: DanAgent['trang_thai'] = xong === tacVu.length ? 'hoan_tat' : xong === 0 ? 'can_bo_sung' : 'mot_phan';
  const thongBaoThieu = tacVu.some((t) => t.trang_thai === 'can_bo_sung') ? ['Có nguồn chưa kết nối — phần đó chưa có số, không phải bằng 0.'] : [];

  const dan: DanAgent = {
    lan_chay_id: (p.taoId ?? (() => crypto.randomUUID()))(),
    cong_ty_id: p.congTyId,
    bat_dau: new Date(batDau).toISOString(),
    ket_thuc: new Date(now()).toISOString(),
    trang_thai: trangThai,
    tac_vu: tacVu,
    tai_nguyen: {
      so_agent: new Set(qt.tac_vu.map(([a]) => a)).size,
      so_tac_vu: tacVu.length,
      so_nguon_doc: loiDoc ? 0 : can.size,
      so_luot_mo_hinh: 0,
      so_luot_tai_su_dung: tacVu.filter((t) => t.tai_su_dung).length,
      gioi_han_song_song: gioiHan,
    },
    gioi_han: [...GIOI_HAN_CHUNG, ...qt.gioi_han, ...thongBaoThieu],
  };
  // Kết quả theo thứ tự tác vụ, mỗi năng lực một lần.
  const thuTu = [...new Set(qt.tac_vu.map(([, nl]) => nl))].filter((nl) => ketQua.has(nl)).map((nl) => ketQua.get(nl) as KetQuaNangLuc);
  return { ket_qua: thuTu, dan_agent: dan, ten: qt.ten };
}

/** Danh sách agent cho màn đầu: agent cần nguồn chưa kết nối → "cần kết nối". */
export function danhSachAgent(nguonCua: (id: string) => readonly string[], nguonChuaCo: ReadonlySet<string>): AgentMimi[] {
  return DAN_AGENT.map((a) => ({
    id: a.id, ten: a.ten, mo_ta: a.mo_ta, nang_luc: [...a.nang_luc],
    trang_thai: a.nang_luc.some((nl) => nguonCua(nl).some((n) => nguonChuaCo.has(n))) ? 'can_ket_noi' : 'san_sang',
    quyen: 'chi_doc_va_soan_nhap',
  }));
}
