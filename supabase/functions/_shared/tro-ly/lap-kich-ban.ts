/**
 * TRỎ TỰ LẬP KẾ HOẠCH (12/10/2026, chủ sản phẩm: trỏ "học kỹ thuật của Claude mà chạy").
 *
 * Câu nhờ việc mà bộ nhận việc theo luật (`src/lib/mimiLamHo.ts` → `nhanViec`) không nhận ra thì mô hình được
 * hỏi để LẬP kịch bản — giống vòng lập kế hoạch → kiểm → làm của agent: mô hình chỉ ĐỀ XUẤT các bước, chọn
 * trong DANH MỤC trang và đích có sẵn dưới đây; file này KIỂM từng bước (hàm thuần, có test); trình duyệt kiểm
 * thêm lần nữa bằng `kiemKichBan` rồi mới cho trỏ chạy.
 *
 * Mô hình không bao giờ được: đi ra ngoài /dashboard, chạm đích không có trong danh mục, tự bấm nút chạm tiền /
 * khoá / duyệt (chỉ được "nhường" cho người bấm), gõ vào ô không được phép gõ. Kịch bản sai luật bị bỏ cả, không
 * sửa giùm — trợ lý quay về trả lời bằng chữ.
 */

export interface TrangDuocDi { duong: string; ten: string; mo_ta: string }

export const DANH_MUC_TRANG: readonly TrangDuocDi[] = [
  { duong: '/dashboard', ten: 'Tổng quan', mo_ta: 'Tổng quan doanh thu, việc cần chú ý' },
  { duong: '/dashboard/to-khai', ten: 'Tờ khai thuế', mo_ta: 'Soạn tờ khai hộ kinh doanh, tờ khai TNCN từ tiền lương (05/KK-TNCN), lưu nháp, in' },
  { duong: '/dashboard/nhac-thue', ten: 'Nhắc thuế', mo_ta: 'Hạn nộp, hồ sơ nghĩa vụ theo mã số thuế' },
  { duong: '/dashboard/chung-tu', ten: 'Chứng từ chi phí', mo_ta: 'Khoản chi đã/chưa có hoá đơn' },
  { duong: '/dashboard/thu-vien', ten: 'Thư viện chứng từ', mo_ta: 'Ảnh/PDF chứng từ đã chụp' },
  { duong: '/dashboard/giay-to', ten: 'Soạn giấy tờ', mo_ta: 'Đơn tra soát chuyển nhầm, công văn giải trình, in/tải PDF' },
  { duong: '/dashboard/tai-lieu', ten: 'Tài liệu', mo_ta: 'Báo cáo, gói bằng chứng MIMI soạn' },
  { duong: '/dashboard/viec-can-lam', ten: 'Việc cần làm', mo_ta: 'Việc nhiều bước: tạm ngừng, hoá đơn sai, giải trình' },
  { duong: '/dashboard/ket-noi', ten: 'Kết nối', mo_ta: 'Liên kết ngân hàng, tải sao kê' },
  { duong: '/dashboard/fintech', ten: 'Ngân hàng', mo_ta: 'Liên kết ngân hàng' },
  { duong: '/dashboard/kiem-truoc-khi-chuyen', ten: 'Kiểm trước khi chuyển', mo_ta: 'Kiểm một khoản sắp chuyển có dấu hiệu lừa đảo không' },
  { duong: '/dashboard/chi-ca-nhan', ten: 'Tách chi cá nhân', mo_ta: 'Tách chi cá nhân khỏi chi kinh doanh' },
  { duong: '/dashboard/doc-bao-cao', ten: 'Đọc báo cáo', mo_ta: 'Đọc báo cáo tài chính / tờ khai từ Excel' },
  { duong: '/dashboard/reports', ten: 'Dòng tiền', mo_ta: 'Tiền vào, tiền ra theo tháng' },
  { duong: '/dashboard/invoices', ten: 'Hoá đơn', mo_ta: 'Hoá đơn đầu ra, công nợ' },
  { duong: '/dashboard/tac-tu', ten: 'Kiểm soát agent', mo_ta: 'Agent AI, hạn mức, người nhận, duyệt khoản chi, tạo agent bằng hội thoại' },
  { duong: '/dashboard/chinh-sach', ten: 'Chính sách chi', mo_ta: 'Ngưỡng duyệt, hạn mức, nhóm chi của agent' },
  { duong: '/dashboard/settings', ten: 'Cài đặt', mo_ta: 'Thông tin doanh nghiệp, gói, năng lượng (xu), nạp xu' },
];

/**
 * Đích `data-mimi` trên giao diện mô hình được dùng. `bam`: trỏ được tự bấm (chỉ mở tab, không đổi dữ liệu).
 * `go`: trỏ được gõ chữ vào. Đích khác chỉ được `chi` (chỉ vào) hoặc `nhuong` (để người bấm).
 */
export const DANH_MUC_DICH: Readonly<Record<string, { trang: string; mo_ta: string; bam?: true; go?: true }>> = {
  'tac-tu.danh-sach': { trang: '/dashboard/tac-tu', mo_ta: 'Danh sách agent' },
  'tac-tu.hoi-thoai': { trang: '/dashboard/tac-tu', mo_ta: 'Khung tạo agent bằng hội thoại (/taoagent)' },
  'tac-tu.kpi': { trang: '/dashboard/tac-tu', mo_ta: 'Chỉ số chi của agent' },
  'tac-tu.tab.agents': { trang: '/dashboard/tac-tu', mo_ta: 'Tab Agents', bam: true },
  'tac-tu.tab.yeu-cau': { trang: '/dashboard/tac-tu', mo_ta: 'Tab yêu cầu chi', bam: true },
  'tac-tu.tab.nguoi-nhan': { trang: '/dashboard/tac-tu', mo_ta: 'Tab người nhận', bam: true },
  'tac-tu.ten': { trang: '/dashboard/tac-tu', mo_ta: 'Ô tên agent mới', go: true },
  'tac-tu.them': { trang: '/dashboard/tac-tu', mo_ta: 'Nút Thêm agent (người dùng tự bấm)' },
  'tac-tu.cho-duyet': { trang: '/dashboard/tac-tu', mo_ta: 'Khoản đang chờ duyệt' },
  'tac-tu.duyet': { trang: '/dashboard/tac-tu', mo_ta: 'Nút duyệt khoản chi (người dùng tự bấm)' },
  'tac-tu.nguoi-nhan.ngan-hang': { trang: '/dashboard/tac-tu', mo_ta: 'Chọn ngân hàng người nhận' },
  'tac-tu.nguoi-nhan.stk': { trang: '/dashboard/tac-tu', mo_ta: 'Ô số tài khoản người nhận', go: true },
  'tac-tu.nguoi-nhan.ten': { trang: '/dashboard/tac-tu', mo_ta: 'Ô tên chủ tài khoản', go: true },
  'tac-tu.nguoi-nhan.them': { trang: '/dashboard/tac-tu', mo_ta: 'Nút thêm người nhận (người dùng tự bấm)' },
  'chinh-sach.han-muc': { trang: '/dashboard/chinh-sach', mo_ta: 'Hạn mức chi' },
  'chinh-sach.nguoi-nhan-moi': { trang: '/dashboard/chinh-sach', mo_ta: 'Luật người nhận mới' },
  'chung-tu.chua-co-giay': { trang: '/dashboard/chung-tu', mo_ta: 'Tổng khoản chi chưa có hoá đơn' },
  'fintech.ngan-hang': { trang: '/dashboard/fintech', mo_ta: 'Chỗ liên kết ngân hàng' },
  'to-khai.dien-ho': { trang: '/dashboard/to-khai', mo_ta: 'Khung điền hộ lên cổng (thử nghiệm)' },
  'to-khai.dien-ho.bat-dau': { trang: '/dashboard/to-khai', mo_ta: 'Nút bắt đầu điền (người dùng tự bấm)' },
};

export type BuocKeHoach =
  | { loai: 'di_toi'; duongDan: string; noi: string }
  | { loai: 'chi'; dich: string; noi: string; neuKhongThay?: string }
  | { loai: 'go'; dich: string; chu: string; noi: string }
  | { loai: 'bam'; dich: string; noi: string }
  | { loai: 'nhuong'; dich: string; noi: string };

export interface KeHoach { ten: string; moTa: string; buoc: BuocKeHoach[] }

export const SO_BUOC_KE_HOACH_TOI_DA = 8;
const TRANG = new Set(DANH_MUC_TRANG.map((t) => t.duong));
const chu = (v: unknown, max: number) => (typeof v === 'string' && v.trim().length > 0 && v.length <= max ? v.trim() : null);

/** Lời dặn cho mô hình. Chỉ có danh mục, luật, khuôn trả về — KHÔNG có số liệu công ty. */
export function loiDanLapKeHoach(): string {
  const trang = DANH_MUC_TRANG.map((t) => `- ${t.duong} — ${t.ten}: ${t.mo_ta}`).join('\n');
  const dich = Object.entries(DANH_MUC_DICH)
    .map(([k, d]) => `- ${k} (trang ${d.trang}${d.bam ? ', được bam' : ''}${d.go ? ', được go' : ''}): ${d.mo_ta}`).join('\n');
  return [
    'Bạn lập kịch bản để con trỏ MIMI dẫn người dùng làm việc trên giao diện MIMI Wallet. Bạn chỉ LẬP KẾ HOẠCH, không trả lời câu hỏi.',
    'Trả về DUY NHẤT một đối tượng JSON, không chữ nào khác:',
    '{"lam_duoc": true, "mo_ta": "<việc sẽ làm, ngắn>", "buoc": [ ... ]} hoặc {"lam_duoc": false, "ly_do": "<vì sao>"}.',
    'Mỗi bước là một trong:',
    '{"loai":"di_toi","duongDan":"<trang trong danh mục>","noi":"<câu ngắn>"}',
    '{"loai":"chi","dich":"<đích>","noi":"<câu ngắn>"}',
    '{"loai":"go","dich":"<đích được go>","chu":"<chữ, lấy từ câu người dùng>","noi":"<câu ngắn>"}',
    '{"loai":"bam","dich":"<đích được bam>","noi":"<câu ngắn>"}',
    '{"loai":"nhuong","dich":"<đích>","noi":"<dặn người dùng tự bấm>"}',
    `Luật: tối đa ${SO_BUOC_KE_HOACH_TOI_DA} bước; chỉ dùng trang và đích trong danh mục; bước đầu thường là di_toi; đích của một bước phải thuộc trang đang mở; nút chạm tiền, khoá, duyệt, thêm người nhận LUÔN là nhuong; không bịa số tài khoản hay số tiền không có trong câu người dùng; việc không làm được trên giao diện thì lam_duoc=false.`,
    'Trang:', trang, 'Đích:', dich,
  ].join('\n');
}

/** Đọc và KIỂM kế hoạch mô hình trả về. Sai một bước là bỏ cả kế hoạch. */
export function docKeHoach(van: string | null | undefined): { ok: true; keHoach: KeHoach } | { ok: false; ly_do: string } {
  if (!van) return { ok: false, ly_do: 'Mô hình không trả kế hoạch.' };
  const m = van.match(/\{[\s\S]*\}/);
  let j: Record<string, unknown>;
  try {
    j = JSON.parse(m ? m[0] : van);
  } catch {
    return { ok: false, ly_do: 'Kế hoạch không đúng khuôn JSON.' };
  }
  if (j.lam_duoc !== true) return { ok: false, ly_do: chu(j.ly_do, 300) ?? 'Việc này không làm được trên giao diện.' };
  const moTa = chu(j.mo_ta, 120);
  if (!moTa) return { ok: false, ly_do: 'Kế hoạch thiếu mô tả.' };
  if (!Array.isArray(j.buoc) || j.buoc.length === 0 || j.buoc.length > SO_BUOC_KE_HOACH_TOI_DA) {
    return { ok: false, ly_do: `Kế hoạch phải có 1–${SO_BUOC_KE_HOACH_TOI_DA} bước.` };
  }
  const buoc: BuocKeHoach[] = [];
  let trangDangMo: string | null = null;
  for (const [i, b0] of (j.buoc as unknown[]).entries()) {
    const b = (b0 ?? {}) as Record<string, unknown>;
    const so = `Bước ${i + 1}`;
    const noi = chu(b.noi, 200);
    if (!noi) return { ok: false, ly_do: `${so}: thiếu lời nói.` };
    if (b.loai === 'di_toi') {
      const d = chu(b.duongDan, 80);
      if (!d || !TRANG.has(d)) return { ok: false, ly_do: `${so}: trang không có trong danh mục.` };
      trangDangMo = d;
      buoc.push({ loai: 'di_toi', duongDan: d, noi });
      continue;
    }
    const dich = chu(b.dich, 80);
    const d = dich ? DANH_MUC_DICH[dich] : undefined;
    if (!dich || !d) return { ok: false, ly_do: `${so}: đích không có trong danh mục.` };
    if (trangDangMo !== null && d.trang !== trangDangMo) return { ok: false, ly_do: `${so}: đích không thuộc trang đang mở.` };
    if (b.loai === 'chi') buoc.push({ loai: 'chi', dich, noi, neuKhongThay: 'Mình chưa thấy chỗ đó trên trang này.' });
    else if (b.loai === 'nhuong') buoc.push({ loai: 'nhuong', dich, noi });
    else if (b.loai === 'bam') {
      if (!d.bam) return { ok: false, ly_do: `${so}: không được tự bấm "${dich}".` };
      buoc.push({ loai: 'bam', dich, noi });
    } else if (b.loai === 'go') {
      const c = chu(b.chu, 200);
      if (!d.go || !c) return { ok: false, ly_do: `${so}: không được gõ vào "${dich}".` };
      buoc.push({ loai: 'go', dich, chu: c, noi });
    } else return { ok: false, ly_do: `${so}: loại bước không được phép.` };
  }
  return { ok: true, keHoach: { ten: 'ke_hoach_ai', moTa, buoc } };
}

/** Câu có dáng nhờ làm việc trên giao diện (để chỉ hỏi mô hình lập kế hoạch khi đáng). Bỏ dấu, chữ thường. */
export function laCauNhoViec(cau: string): boolean {
  const s = ` ${cau.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()} `;
  return /\b(lam ho|giup (toi|minh|em)|chi (cho )?(toi|minh)|dan (toi|minh)|huong dan (toi|minh)|mo (trang|muc)|vao (trang|muc)|di toi|tao|them|cai dat|thiet lap|nap)\b/.test(s);
}
