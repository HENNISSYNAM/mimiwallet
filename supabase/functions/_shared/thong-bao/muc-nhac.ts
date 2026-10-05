/**
 * MỘT MỤC NHẮC — cùng một hạn, cùng một trạng thái, cùng một câu chữ cho chuông, push, Việc cần làm,
 * "Việc cần chú ý hôm nay", việc ưu tiên của trợ lý và trang Nhắc thuế (02/10/2026).
 *
 * Trước đây mỗi nơi tự dựng câu từ `MocThue`: chuông "Còn N ngày: <tên>", Việc cần làm "Chuẩn bị: <tên>",
 * trợ lý "Xác minh: <tên> — <câu hỏi>"; còn khi doanh thu chưa chắc (`ket_luan_phu_thuoc`) thì chuông và
 * Việc cần làm không nói gì về câu hỏi cần xem. Hàm ở đây là nguồn duy nhất.
 *
 * QUY TẮC (không đổi kết luận thuế — chỉ đổi cách nói):
 *   - `khong_ap_dung`, mốc không có hạn và mốc đã qua hạn không bao giờ thành mục nhắc có hạn;
 *   - `can_xac_minh` luôn kèm ĐÚNG câu hỏi, và nói "nếu áp dụng", không nói như việc bắt buộc;
 *   - `ket_luan_phu_thuoc` (doanh thu còn cắt ngưỡng luật): thêm MỘT mục "cần xem" với đúng MỘT câu hỏi
 *     (`cau_hoi_can_xem` của `luat/san-sang-thue.ts`). Lịch (`lich-thue.ts`) đã tự bỏ mọi nghĩa vụ phụ thuộc
 *     ngưỡng trong trường hợp này, nên ở đây KHÔNG lọc thêm mốc nào — lọc thêm là tự đổi kết luận thuế.
 * Hàm thuần; Deno và trình duyệt cùng đọc.
 */
import type { MocThue } from '../luat/lich-thue.ts';
import type { SanSangThue } from '../luat/san-sang-thue.ts';

/** Lối vào chung của mọi nhắc thuế. */
export const DUONG_DAN_NHAC_THUE = '/dashboard/nhac-thue';
/** Mục "cần xem" mở thẳng khối câu hỏi trên trang Nhắc thuế (có nút đi trả lời). */
export const DUONG_DAN_CAN_XEM = `${DUONG_DAN_NHAC_THUE}#can-xem`;

/**
 * Báo trước hạn vào đúng các mốc này (số ngày còn lại). Có mốc 5 ngày theo yêu cầu người dùng
 * (25/09/2026: "thuế nhắc trước 5 ngày"), thêm mốc 10 ngày (26/09/2026: "nhắc sớm hơn 5 ngày ra").
 */
export const MOC_NHAC_HAN = [14, 10, 5, 1, 0];

/** Hạn trong bấy nhiêu ngày tới thì được xếp vào "Việc cần làm" / "cần chú ý hôm nay" — bằng mốc nhắc xa nhất. */
export const NGAY_BAO_TRUOC = MOC_NHAC_HAN[0];

export type TrangThaiMucNhac = 'phai_lam' | 'can_xac_minh' | 'can_xem';

/** Phần sẵn sàng khai thuế mà mục nhắc cần — chỉ đọc, không suy thêm. */
export type SanSangChoNhac = Pick<SanSangThue, 'ket_luan_phu_thuoc' | 'cau_hoi_can_xem'>;

export interface MucNhac {
  /** Danh tính ổn định của mục: `<khoá mốc>:<hạn>` hoặc `can_xem:<khoá câu hỏi>`. KHÔNG chứa số ngày còn lại. */
  khoa: string;
  ten: string;
  trang_thai: TrangThaiMucNhac;
  /** YYYY-MM-DD; null với mục "cần xem" (không có hạn). */
  han: string | null;
  con_lai: number | null;
  /** Một dòng: "Còn 5 ngày: <tên>", "Hôm nay là hạn: <tên>", hoặc lời mời xem câu hỏi. */
  tieu_de: string;
  /** Vài câu: hạn, vì sao, và việc làm tiếp (động từ đứng đầu). */
  noi_dung: string;
  /** Nút / việc tiếp theo, động từ đứng đầu: "Mở Tờ khai thuế", "Trả lời câu hỏi của MIMI"… */
  viec_tiep: string;
  /** Đúng một câu hỏi khi `can_xac_minh` / `can_xem`. */
  cau_hoi: string | null;
  muc_do: 'thong_tin' | 'can_chu_y' | 'gap';
  duong_dan: string;
}

export const ngayVN = (ymd: string): string => ymd.slice(0, 10).split('-').reverse().join('/');

/** Khoá của một mốc hạn: ổn định theo mốc + hạn, không theo số ngày còn lại. */
export const khoaMocHan = (m: Pick<MocThue, 'khoa' | 'han'>): string => `${m.khoa}:${m.han}`;

/**
 * Mốc có hạn → mục nhắc. `null` khi không áp dụng, không có hạn, hoặc đã qua hạn (MIMI không biết bạn đã
 * nộp chưa, nên không gọi là "quá hạn").
 */
export function mucNhacTuMoc(m: MocThue): MucNhac | null {
  if (m.trang_thai === 'khong_ap_dung' || !m.han || m.con_lai === null || m.con_lai < 0) return null;
  const xacMinh = m.trang_thai === 'can_xac_minh';
  const han = ngayVN(m.han);
  const dau = m.con_lai === 0 ? `Hôm nay là hạn: ${m.ten}` : `Còn ${m.con_lai} ngày: ${m.ten}`;
  return {
    khoa: khoaMocHan(m),
    ten: m.ten,
    trang_thai: xacMinh ? 'can_xac_minh' : 'phai_lam',
    han: m.han,
    con_lai: m.con_lai,
    tieu_de: dau.slice(0, 200),
    noi_dung: (xacMinh
      ? `Hạn ${han}, nếu việc này áp dụng cho bạn. MIMI chưa chắc: ${m.cau_hoi ?? 'còn thiếu một dữ kiện.'} Trả lời để MIMI biết có phải làm không.`
      : `Hạn ${han}. ${m.vi_sao} Mở Tờ khai thuế để xem bản nháp MIMI đã soạn, kiểm lại rồi mới nộp.`).slice(0, 1000),
    viec_tiep: xacMinh ? 'Trả lời câu hỏi của MIMI' : 'Mở Tờ khai thuế, kiểm bản nháp',
    cau_hoi: xacMinh ? m.cau_hoi ?? null : null,
    muc_do: m.con_lai <= 1 ? 'gap' : 'can_chu_y',
    duong_dan: DUONG_DAN_NHAC_THUE,
  };
}

/**
 * Doanh thu còn cắt ngưỡng luật → MỘT mục "cần xem" với đúng một câu hỏi, thay cho mọi lời nói về nghĩa vụ.
 * `null` khi kết luận không phụ thuộc phần chưa rõ.
 */
export function mucCanXem(ss: SanSangChoNhac | null | undefined): MucNhac | null {
  if (!ss || !ss.ket_luan_phu_thuoc || !ss.cau_hoi_can_xem) return null;
  const cau = ss.cau_hoi_can_xem.cau;
  return {
    khoa: `can_xem:${ss.cau_hoi_can_xem.khoa}`,
    ten: 'Doanh thu năm nay còn khoản chưa rõ',
    trang_thai: 'can_xem',
    han: null,
    con_lai: null,
    tieu_de: 'MIMI cần bạn xem một khoản trước khi nói về nghĩa vụ thuế',
    noi_dung: `Khoản chưa rõ này có thể làm đổi việc bạn phải khai và khai từ khi nào, nên MIMI chưa kết luận. Trả lời một câu: ${cau}`.slice(0, 1000),
    viec_tiep: 'Trả lời câu hỏi của MIMI',
    cau_hoi: cau,
    muc_do: 'can_chu_y',
    duong_dan: DUONG_DAN_CAN_XEM,
  };
}

/**
 * Mọi mục nhắc của một công ty, theo thứ tự: "cần xem" trước (nó quyết định các hạn bên dưới có thật hay
 * không), rồi các hạn từ gần tới xa. `trongNgay`: chỉ lấy hạn còn tối đa chừng này ngày.
 */
export function mucNhacTuLich(
  lich: readonly MocThue[], sanSang?: SanSangChoNhac | null, o: { trongNgay?: number } = {},
): MucNhac[] {
  const ra: MucNhac[] = [];
  const canXem = mucCanXem(sanSang);
  if (canXem) ra.push(canXem);
  const han: MucNhac[] = [];
  for (const m of lich) {
    const muc = mucNhacTuMoc(m);
    if (!muc) continue;
    if (o.trongNgay !== undefined && (muc.con_lai ?? 0) > o.trongNgay) continue;
    han.push(muc);
  }
  han.sort((a, b) => (a.con_lai ?? 0) - (b.con_lai ?? 0));
  return [...ra, ...han];
}

/**
 * Khoá của dòng `thong_bao` cho một mục nhắc.
 *   - Hạn: `han:<khoá mốc>:<hạn>:<số ngày còn>` — mỗi mốc 14/10/5/1/0 là một thông báo, chạy lại không trùng.
 *   - Cần xem: `can_xem:<năm>:<khoá câu hỏi>` — một lần mỗi câu hỏi mỗi năm (năm sau hỏi lại được).
 */
export function khoaThongBaoMuc(m: MucNhac, homNay: string): string {
  return m.trang_thai === 'can_xem' ? `can_xem:${homNay.slice(0, 4)}:${m.khoa.slice('can_xem:'.length)}` : `han:${m.khoa}:${m.con_lai}`;
}

/**
 * Dòng `thong_bao` loại `han_thue` có khoá này còn đúng không? Dùng để đánh dấu lỗi thời (không xoá).
 *
 * Lỗi thời khi: hạn đã qua; mốc không còn trong lịch (ví dụ kết luận lại phụ thuộc phần chưa rõ — lịch bỏ
 * nghĩa vụ đó) hoặc đã thành "không áp dụng"; hoặc mốc đổi trạng thái giữa "phải làm" và "cần xác minh" (câu
 * chữ cũ đã sai). Mục "cần xem" lỗi thời khi câu hỏi đó không còn được hỏi.
 * Khoá lạ (lịch chung cả nước trước 25/09/2026 — migration đã đánh dấu) thì giữ nguyên.
 */
export function thongBaoNhacLoiThoi(
  khoa: string, lich: readonly MocThue[], sanSang: SanSangChoNhac | null | undefined, homNay: string,
  /** Trạng thái lúc ghi thông báo, đọc từ câu chữ đã lưu (`noi_dung`) — không có thì bỏ qua phép so này. */
  trangThaiLucGhi?: 'phai_lam' | 'can_xac_minh' | null,
): boolean {
  if (khoa.startsWith('can_xem:')) {
    const c = mucCanXem(sanSang);
    return !c || khoaThongBaoMuc(c, homNay) !== khoa;
  }
  const p = /^han:(.+):(\d{4}-\d{2}-\d{2}):(\d+)$/.exec(khoa);
  if (!p) return false;
  const [, khoaMoc, han] = p;
  if (han < homNay) return true;
  const m = lich.find((x) => x.khoa === khoaMoc && x.han === han);
  if (!m || m.trang_thai === 'khong_ap_dung') return true;
  return !!trangThaiLucGhi && trangThaiLucGhi !== m.trang_thai;
}

/** Câu chữ đã lưu của một thông báo hạn → trạng thái lúc ghi (câu "nếu việc này áp dụng" chỉ có ở cần xác minh). */
export const trangThaiTuNoiDung = (noiDung: string | null | undefined): 'phai_lam' | 'can_xac_minh' | null =>
  !noiDung ? null : noiDung.includes('nếu việc này áp dụng cho bạn') ? 'can_xac_minh' : 'phai_lam';
