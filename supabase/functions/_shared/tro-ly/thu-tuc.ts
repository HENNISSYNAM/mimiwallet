/**
 * Chọn thủ tục hành chính thuế khớp một câu hỏi — trong bảng `thu_tuc_thue` (cào công khai từ
 * dichvucong.gdt.gov.vn, xem migration 20260925110000). Hàm thuần.
 *
 * Hai cách khớp, theo độ chắc:
 *   1. Câu hỏi nhắc mã mẫu ("23/ĐK-TCT", "01/CNKD") → thủ tục có mẫu đó.
 *   2. Từ khoá có nghĩa trong câu hỏi trùng tên thủ tục (bỏ dấu, bỏ từ vô nghĩa).
 * Không khớp đủ thì trả rỗng — trợ lý nói "chưa tìm thấy", không đoán thủ tục.
 */
import { boDau } from './y-dinh.ts';

export interface ThuTucThue {
  ma: string;
  ten: string;
  doi_tuong: string | null;
  co_quan: string | null;
  cach_thuc: string | null;
  thanh_phan_ho_so: string | null;
  ket_qua: string | null;
  can_cu_phap_ly: string | null;
  mau_to_khai: string[];
  nguon: string;
  lay_luc: string;
}

/** Từ quá chung để phân biệt thủ tục — có trong hầu hết tên thủ tục thuế. */
const TU_CHUNG = new Set([
  'thue', 'doi', 'voi', 'cua', 'cho', 'va', 'cac', 'nhung', 'la', 'gi', 'nao', 'toi', 'minh', 'em', 'anh', 'chi',
  'can', 'phai', 'lam', 'the', 'sao', 'co', 'khong', 'duoc', 'ho', 'so', 'thu', 'tuc', 'nop', 'o', 'dau', 'khi',
  'muon', 'bao', 'nhieu', 'mot', 'trong', 'theo', 've', 'tu', 'den', 'hay', 'nguoi', 'ca', 'nhan', 'to', 'chuc',
  'giay', 'gom', 'nay', 'kia', 'do', 'thi', 'ma', 'da', 'se', 'dang', 'roi',
]);

/** Mã mẫu trong câu hỏi: "23/ĐK-TCT", "01/CNKD", "01-2/BK-HĐKD"… */
export function maMauTrongCau(cau: string): string[] {
  return [...new Set((cau.match(/\b\d{1,2}[A-Za-zĐđ]*(?:-\d+)?\/[A-Za-zĐđ0-9][A-Za-zĐđ0-9\-/.]*/g) ?? []).map((m) => m.replace(/[.,;]+$/, '').toUpperCase()))];
}

/**
 * Người dùng nói kiểu đời thường, văn bản nói kiểu hành chính. Chỉ vài cụm hay gặp — thêm khi thấy
 * câu hỏi thật trượt, không đoán trước cả từ điển.
 */
const DONG_NGHIA: [RegExp, string][] = [
  [/\bdong (ma so thue|mst)\b/, 'cham dut hieu luc ma so thue'],
  [/\bgiai the\b/, 'giai the cham dut hieu luc ma so thue'],
  [/\b(ngung|nghi) (kinh doanh|ban)\b/, 'tam ngung hoat dong kinh doanh'],
  [/\b(mo lai|kinh doanh lai)\b/, 'tiep tuc hoat dong kinh doanh'],
  [/\bsan (tmdt|thuong mai dien tu)\b|\bban (hang )?online\b/, 'nen tang thuong mai dien tu'],
];

export function chuanCau(cau: string): string {
  let s = boDau(cau).replace(/[^a-z0-9/ -]+/g, ' ');
  for (const [re, thay] of DONG_NGHIA) if (re.test(s)) s = `${s} ${thay}`;
  return s;
}

const tu = (s: string) => s.split(/[^a-z0-9]+/).filter(Boolean);

export function tuKhoa(cau: string): string[] {
  return [...new Set(tu(chuanCau(cau)).filter((w) => w.length >= 2 && !TU_CHUNG.has(w)))];
}

/** Cụm hai từ liền nhau trong câu hỏi (kể cả từ chung) — "thong tin dang ky" phân biệt tốt hơn từng từ. */
function cumHai(s: string): Set<string> {
  const w = tu(s);
  return new Set(w.slice(1).map((x, i) => `${w[i]} ${x}`));
}

/** Xếp thủ tục theo mức khớp; trả tối đa `toiDa`, chỉ những thủ tục khớp đủ. */
export function chonThuTuc(cau: string, ds: ThuTucThue[], toiDa = 3): ThuTucThue[] {
  const ma = maMauTrongCau(cau);
  const tk = tuKhoa(cau);
  if (!ma.length && !tk.length) return [];
  const cumCau = cumHai(chuanCau(cau));
  const diem = ds.map((t) => {
    const theoMa = ma.filter((m) => t.mau_to_khai.some((x) => x.toUpperCase() === m)).length;
    const tenBo = boDau(t.ten);
    const ten = new Set(tu(tenBo));
    const trung = tk.filter((w) => ten.has(w)).length;
    const cum = [...cumHai(tenBo)].filter((c) => cumCau.has(c)).length;
    return { t, d: theoMa * 10 + trung + cum * 1.5, trung, theoMa };
  });
  // Khớp đủ: có mã mẫu, hoặc ít nhất 2 từ khoá (1 từ khoá là quá dễ trùng nhầm).
  const du = diem.filter((x) => x.theoMa > 0 || x.trung >= Math.min(2, tk.length));
  return du.sort((a, b) => b.d - a.d || a.t.ten.length - b.t.ten.length).slice(0, toiDa).map((x) => x.t);
}

/** Cắt một mục dài (thành phần hồ sơ…) cho vừa thẻ trả lời, không cắt giữa dòng nếu được. */
export function cat(s: string | null, toiDa = 900): string | null {
  if (!s) return null;
  if (s.length <= toiDa) return s;
  const c = s.slice(0, toiDa);
  const i = c.lastIndexOf('\n');
  return `${(i > toiDa * 0.6 ? c.slice(0, i) : c).trim()} …`;
}
