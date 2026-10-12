/**
 * Ghi tệp PDF từ các trang ảnh JPEG — không cần thư viện.
 *
 * Vì sao không thêm jspdf/pdf-lib: tệp quét chỉ là "mỗi trang một ảnh". PDF nhúng thẳng JPEG
 * được (bộ lọc DCTDecode), nên ghi tay ~100 dòng là đủ, gói ứng dụng không nặng thêm vài trăm KB,
 * và chạy được trong vitest để kiểm cấu trúc tệp (bảng xref, độ dời từng đối tượng).
 *
 * Trang khổ A4 (595,28 × 841,89 pt); ảnh ngang thì trang A4 nằm ngang. Ảnh được co vừa trang,
 * giữ tỉ lệ, đặt giữa — không kéo méo chữ.
 */

export const A4 = { rong: 595.28, cao: 841.89 };

export interface ThongTinJpeg { rong: number; cao: number; soKenh: number }

/** Đọc kích thước và số kênh từ đoạn SOF của JPEG. Ném lỗi nếu không phải JPEG. */
export function docJpeg(b: Uint8Array): ThongTinJpeg {
  if (b[0] !== 0xff || b[1] !== 0xd8) throw new Error('Không phải ảnh JPEG.');
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const ma = b[i + 1];
    if (ma === 0xff) { i++; continue; }
    if (ma === 0xd8 || ma === 0x01 || (ma >= 0xd0 && ma <= 0xd7)) { i += 2; continue; }
    const dai = (b[i + 2] << 8) | b[i + 3];
    // SOF0–SOF15 trừ DHT (C4), JPG (C8), DAC (CC).
    if (ma >= 0xc0 && ma <= 0xcf && ma !== 0xc4 && ma !== 0xc8 && ma !== 0xcc) {
      return { cao: (b[i + 5] << 8) | b[i + 6], rong: (b[i + 7] << 8) | b[i + 8], soKenh: b[i + 9] };
    }
    i += 2 + dai;
  }
  throw new Error('Ảnh JPEG hỏng: không đọc được kích thước.');
}

/** Chuỗi PDF cho tiêu đề: ASCII thì để nguyên (thoát ngoặc), có dấu thì UTF-16BE dạng hex. */
export function chuoiPdf(s: string): string {
  if (/^[\x20-\x7e]*$/.test(s)) return `(${s.replace(/[\\()]/g, (c) => `\\${c}`)})`;
  let hex = 'FEFF';
  for (let i = 0; i < s.length; i++) hex += s.charCodeAt(i).toString(16).padStart(4, '0').toUpperCase();
  return `<${hex}>`;
}

const so = (n: number) => (Math.round(n * 100) / 100).toString();

/** Khung đặt ảnh trên trang A4: chọn chiều trang theo ảnh, co vừa, đặt giữa. */
export function datAnhTrenTrang(rongAnh: number, caoAnh: number): { trangRong: number; trangCao: number; x: number; y: number; w: number; h: number } {
  const ngang = rongAnh > caoAnh;
  const trangRong = ngang ? A4.cao : A4.rong;
  const trangCao = ngang ? A4.rong : A4.cao;
  const k = Math.min(trangRong / rongAnh, trangCao / caoAnh);
  const w = rongAnh * k;
  const h = caoAnh * k;
  return { trangRong, trangCao, x: (trangRong - w) / 2, y: (trangCao - h) / 2, w, h };
}

/** Tạo PDF: mỗi phần tử `trang` là byte của một ảnh JPEG. */
export function taoPdf(trang: Uint8Array[], tieuDe = 'MIMI scan'): Uint8Array {
  if (!trang.length) throw new Error('Chưa có trang nào.');
  const ma = new TextEncoder();
  const phan: Uint8Array[] = [];
  let doDai = 0;
  const viTri: number[] = [];
  const ghi = (x: string | Uint8Array) => {
    const b = typeof x === 'string' ? ma.encode(x) : x;
    phan.push(b);
    doDai += b.length;
  };
  const batDau = (so_: number) => { viTri[so_] = doDai; ghi(`${so_} 0 obj\n`); };

  // Đối tượng: 1 Catalog, 2 Pages, 3 Info, rồi mỗi trang 3 đối tượng (Page, Contents, Image).
  const soTrang = (k: number) => 4 + k * 3;
  // Dòng thứ hai có 4 byte > 127: báo cho công cụ truyền tệp rằng đây là tệp nhị phân.
  ghi('%PDF-1.4\n%');
  ghi(new Uint8Array([0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  batDau(1); ghi('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  batDau(2);
  ghi(`<< /Type /Pages /Count ${trang.length} /Kids [${trang.map((_, k) => `${soTrang(k)} 0 R`).join(' ')}] >>\nendobj\n`);
  batDau(3); ghi(`<< /Title ${chuoiPdf(tieuDe)} /Producer (MIMI) >>\nendobj\n`);

  trang.forEach((jpeg, k) => {
    const tt = docJpeg(jpeg);
    const d = datAnhTrenTrang(tt.rong, tt.cao);
    const p = soTrang(k);
    const noiDung = `q ${so(d.w)} 0 0 ${so(d.h)} ${so(d.x)} ${so(d.y)} cm /Im0 Do Q\n`;
    batDau(p);
    ghi(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${so(d.trangRong)} ${so(d.trangCao)}] /Resources << /XObject << /Im0 ${p + 2} 0 R >> >> /Contents ${p + 1} 0 R >>\nendobj\n`);
    batDau(p + 1);
    ghi(`<< /Length ${noiDung.length} >>\nstream\n${noiDung}endstream\nendobj\n`);
    batDau(p + 2);
    const mau = tt.soKenh === 1 ? '/DeviceGray' : tt.soKenh === 4 ? '/DeviceCMYK' : '/DeviceRGB';
    ghi(`<< /Type /XObject /Subtype /Image /Width ${tt.rong} /Height ${tt.cao} /ColorSpace ${mau} /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
    ghi(jpeg);
    ghi('\nendstream\nendobj\n');
  });

  const tong = soTrang(trang.length);
  const xref = doDai;
  let bang = `xref\n0 ${tong}\n0000000000 65535 f \n`;
  for (let i = 1; i < tong; i++) bang += `${String(viTri[i]).padStart(10, '0')} 00000 n \n`;
  ghi(bang);
  ghi(`trailer\n<< /Size ${tong} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const ra = new Uint8Array(doDai);
  let o = 0;
  for (const b of phan) { ra.set(b, o); o += b.length; }
  return ra;
}
