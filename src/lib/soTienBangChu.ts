/**
 * Đọc số tiền đồng thành chữ tiếng Việt: 4500000 → "Bốn triệu năm trăm nghìn đồng".
 *
 * VÌ SAO CÓ. Tiền Việt có nhiều số 0, và một số 0 thừa là chuyển gấp mười lần.
 * Chứng từ thanh toán ở Việt Nam quen ghi thêm số tiền bằng chữ đúng vì lý do đó.
 * Màn duyệt khoản chi hiện dòng này để người duyệt đọc lại bằng tai, không chỉ
 * bằng mắt — đặc biệt khi duyệt vội trên điện thoại.
 *
 * Quy ước đọc: "lẻ" khi hàng chục bằng 0 (một trăm lẻ năm), "mốt" sau hàng chục
 * từ 20 (hai mươi mốt), "lăm" sau hàng chục từ 10 (mười lăm), "tư" sau hàng chục
 * từ 20 (hai mươi tư), và nhóm không đứng đầu luôn đọc đủ "không trăm" (một triệu
 * không trăm năm mươi nghìn).
 */

const SO = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

/** Đọc một nhóm ba chữ số. `day` = nhóm này không đứng đầu, phải đọc đủ hàng trăm. */
function docBaSo(n: number, day: boolean): string {
  const tram = Math.floor(n / 100);
  const chuc = Math.floor(n / 10) % 10;
  const dv = n % 10;
  const tu: string[] = [];

  if (day || tram > 0) tu.push(SO[tram], 'trăm');

  if (chuc === 0) {
    if (dv > 0 && (day || tram > 0)) tu.push('lẻ');
  } else if (chuc === 1) {
    tu.push('mười');
  } else {
    tu.push(SO[chuc], 'mươi');
  }

  if (dv > 0) {
    if (dv === 1 && chuc >= 2) tu.push('mốt');
    else if (dv === 5 && chuc >= 1) tu.push('lăm');
    else if (dv === 4 && chuc >= 2) tu.push('tư');
    else tu.push(SO[dv]);
  }
  return tu.join(' ');
}

/** Số dưới một tỷ. */
function docDuoiTy(n: number, day: boolean): string {
  const trieu = Math.floor(n / 1_000_000);
  const nghin = Math.floor(n / 1_000) % 1_000;
  const donVi = n % 1_000;
  const tu: string[] = [];
  let daCo = day;

  if (trieu > 0) {
    tu.push(docBaSo(trieu, daCo), 'triệu');
    daCo = true;
  }
  if (nghin > 0) {
    tu.push(docBaSo(nghin, daCo), 'nghìn');
    daCo = true;
  }
  if (donVi > 0) tu.push(docBaSo(donVi, daCo));
  return tu.join(' ');
}

function docSo(n: number, day: boolean): string {
  if (n < 1_000_000_000) return docDuoiTy(n, day);
  const ty = Math.floor(n / 1_000_000_000);
  const duoi = n % 1_000_000_000;
  const tu = [docSo(ty, day), 'tỷ'];
  if (duoi > 0) tu.push(docDuoiTy(duoi, true));
  return tu.join(' ');
}

/** Trả chuỗi rỗng cho số âm, số lẻ thập phân hoặc không phải số — không đoán. */
export function docSoTienBangChu(soTien: number): string {
  if (!Number.isSafeInteger(soTien) || soTien < 0) return '';
  if (soTien === 0) return 'Không đồng';
  const chu = docSo(soTien, false);
  return `${chu.charAt(0).toUpperCase()}${chu.slice(1)} đồng`;
}
