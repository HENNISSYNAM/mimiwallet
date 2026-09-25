/**
 * Trình dựng tài liệu ở MÁY CHỦ — Prompt 4 mục 21. Hàm thuần: dữ liệu vào, một trang HTML khổ A4 ra.
 *
 * Vì sao HTML chứ chưa PDF: trình dựng PDF trong Deno cần nhúng phông tiếng Việt (vài MB) mỗi lần chạy
 * edge function. Trang HTML này là BẢN IN: `@page A4`, lề cố định, phông serif; người dùng "In → Lưu PDF"
 * ra đúng khổ. Nội dung đã băm SHA-256 và lưu bất biến, nên bản in nào cũng đối chiếu được.
 *
 * LỀ VÀ PHÔNG: theo thể thức văn bản hành chính thường dùng (lề trên/dưới 20 mm, trái 30 mm, phải 15 mm;
 * cỡ chữ 13). CHƯA đối chiếu với văn bản quy định trong kho của MIMI — vì vậy tài liệu MIMI dựng không
 * bao giờ mang nhãn "mẫu chính thức" trừ khi đến từ sổ mẫu đã `verified`.
 *
 * AN TOÀN: mọi chuỗi đi qua `thoat()`; trang có CSP chặn mọi script và tài nguyên ngoài. Tài liệu được mở
 * bằng URL ký tạm từ kho riêng tư — một ô "tên khách" chứa `<script>` không được thành mã chạy.
 */

export type NhanTaiLieu = 'official_template_filled' | 'mimi_generated' | 'draft_for_review' | 'reference_only';

export const CHU_NHAN: Record<NhanTaiLieu, string> = {
  official_template_filled: 'MẪU CHÍNH THỨC — MIMI ĐIỀN SẴN',
  mimi_generated: 'TÀI LIỆU DO MIMI SOẠN',
  draft_for_review: 'BẢN NHÁP ĐỂ XEM LẠI',
  reference_only: 'CHỈ ĐỂ THAM KHẢO',
};

export type KhoiNoiDung =
  | { loai: 'doan'; chu: string }
  | { loai: 'muc'; tieu_de: string }
  | { loai: 'danh_sach'; muc: string[] }
  | { loai: 'bang'; cot: string[]; dong: (string | number | null)[][]; can_phai?: number[] }
  | { loai: 'ghi_chu'; chu: string };

export interface DuLieuTaiLieu {
  nhan: NhanTaiLieu;
  tieu_de: string;
  cong_ty: { ten: string | null; mst?: string | null; dia_chi?: string | null };
  ngay: string; // YYYY-MM-DD
  so_tham_chieu?: string | null;
  kinh_gui?: string | null;
  noi_dung: KhoiNoiDung[];
  /** Nguồn và bằng chứng in cuối trang: người đọc bản in vẫn biết số lấy từ đâu. */
  nguon?: string[];
  co_cho_ky?: boolean;
}

export function thoat(s: unknown): string {
  return String(s ?? '').replace(/[&<>"'`]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c] as string));
}

const so = (v: string | number | null) => (typeof v === 'number' ? new Intl.NumberFormat('vi-VN').format(Math.round(v)) : v ?? '—');
const ngayVN = (ymd: string) => ymd.split('-').reverse().join('/');

function khoi(k: KhoiNoiDung): string {
  switch (k.loai) {
    case 'doan': return `<p>${thoat(k.chu)}</p>`;
    case 'muc': return `<h2>${thoat(k.tieu_de)}</h2>`;
    case 'danh_sach': return `<ul>${k.muc.map((m) => `<li>${thoat(m)}</li>`).join('')}</ul>`;
    case 'ghi_chu': return `<p class="ghi-chu">${thoat(k.chu)}</p>`;
    case 'bang': {
      const phai = new Set(k.can_phai ?? []);
      return `<table><thead><tr>${k.cot.map((c, i) => `<th${phai.has(i) ? ' class="so"' : ''}>${thoat(c)}</th>`).join('')}</tr></thead><tbody>${
        k.dong.map((d) => `<tr>${d.map((v, i) => `<td${phai.has(i) ? ' class="so"' : ''}>${thoat(so(v))}</td>`).join('')}</tr>`).join('')
      }</tbody></table>`;
    }
  }
}

export function dungHtml(d: DuLieuTaiLieu): string {
  const nhan = CHU_NHAN[d.nhan];
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">
<meta name="robots" content="noindex">
<title>${thoat(d.tieu_de)}</title>
<style>
@page { size: A4; margin: 20mm 15mm 20mm 30mm; }
body { font-family: "Times New Roman", Times, serif; font-size: 13pt; line-height: 1.45; color: #000; margin: 0; }
.nhan { border: 1.5pt solid #000; padding: 2mm 3mm; font: bold 9pt Arial, sans-serif; letter-spacing: .04em; display: inline-block; }
.dau { display: flex; justify-content: space-between; gap: 8mm; font-size: 11pt; margin: 4mm 0 6mm; }
h1 { font-size: 15pt; text-align: center; text-transform: uppercase; margin: 6mm 0 2mm; }
h2 { font-size: 13pt; margin: 5mm 0 2mm; }
table { width: 100%; border-collapse: collapse; font-size: 11pt; margin: 2mm 0; }
th, td { border: .6pt solid #000; padding: 1.2mm 2mm; text-align: left; vertical-align: top; }
td.so, th.so { text-align: right; white-space: nowrap; }
.ghi-chu { font-size: 11pt; font-style: italic; }
.nguon { margin-top: 8mm; font-size: 9.5pt; border-top: .6pt solid #000; padding-top: 2mm; }
.ky { margin-top: 10mm; display: flex; justify-content: flex-end; text-align: center; }
.ky div { width: 70mm; } .ky .cho { height: 25mm; }
</style></head><body>
<div class="nhan">${thoat(nhan)}</div>
<div class="dau"><div>${thoat(d.cong_ty.ten ?? '')}${d.cong_ty.mst ? `<br>MST: ${thoat(d.cong_ty.mst)}` : ''}${d.cong_ty.dia_chi ? `<br>${thoat(d.cong_ty.dia_chi)}` : ''}</div>
<div style="text-align:right">Ngày ${thoat(ngayVN(d.ngay))}${d.so_tham_chieu ? `<br>Số tham chiếu: ${thoat(d.so_tham_chieu)}` : ''}</div></div>
<h1>${thoat(d.tieu_de)}</h1>
${d.kinh_gui ? `<p style="text-align:center">Kính gửi: ${thoat(d.kinh_gui)}</p>` : ''}
${d.noi_dung.map(khoi).join('\n')}
${d.co_cho_ky ? `<div class="ky"><div>NGƯỜI ĐẠI DIỆN<br><i>(Ký, ghi rõ họ tên)</i><div class="cho"></div></div></div>` : ''}
${d.nguon?.length ? `<div class="nguon"><b>Nguồn và bằng chứng</b><ul>${d.nguon.map((n) => `<li>${thoat(n)}</li>`).join('')}</ul></div>` : ''}
<p class="ghi-chu">${thoat(nhan)}. MIMI soạn; người đứng tên kiểm, ký và tự gửi. MIMI không ký, không nộp thay.</p>
</body></html>`;
}

/** SHA-256 hex của nội dung — lưu cùng phiên bản để đối chiếu bản in. */
export async function bam(noiDung: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(noiDung));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
