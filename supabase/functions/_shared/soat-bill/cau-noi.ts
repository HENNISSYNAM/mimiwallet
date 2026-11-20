/**
 * QUẦY TIN — câu loa đọc tại quầy. Dùng chung máy chủ (trả kèm kết quả) và giao diện (đọc to).
 *
 * Số tiền đọc kiểu người bán nói: 150000 → "một trăm năm mươi nghìn", không "một trăm năm mươi nghìn đồng"
 * và không đọc từng chữ số. Câu ngắn, động từ trước: thu ngân nghe một lần là biết giao hay không giao.
 *
 * KHÔNG KẾT TỘI (N2): không câu nào nói "bill giả". MIMI chỉ nói điều nó thấy trong dữ liệu ngân hàng.
 */

const SO = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

/** Đọc một nhóm 0–999. `day` = nhóm không đứng đầu (đọc "linh" khi hàng chục bằng 0 sau hàng trăm). */
function docBaSo(n: number, coTram: boolean): string {
  const tram = Math.floor(n / 100);
  const chuc = Math.floor((n % 100) / 10);
  const dv = n % 10;
  const phan: string[] = [];
  if (tram > 0 || coTram) phan.push(`${SO[tram]} trăm`);
  if (chuc === 0) {
    if (dv > 0 && (tram > 0 || coTram)) phan.push('linh');
  } else if (chuc === 1) {
    phan.push('mười');
  } else {
    phan.push(`${SO[chuc]} mươi`);
  }
  if (dv > 0) {
    if (dv === 1 && chuc > 1) phan.push('mốt');
    else if (dv === 5 && chuc > 0) phan.push('lăm');
    else if (dv === 4 && chuc > 1) phan.push('tư');
    else phan.push(SO[dv]);
  }
  return phan.join(' ');
}

const DON_VI = ['', 'nghìn', 'triệu', 'tỷ'];

/**
 * Số tiền nguyên đồng → chữ nói. Nhóm bằng 0 ở giữa bỏ qua ("một triệu năm mươi nghìn"), nhóm có hàng trăm
 * bằng 0 không đọc "không trăm" — đây là câu nói ở quầy, không phải chữ ghi trên hoá đơn.
 */
export function docTien(soTien: number): string {
  const n = Math.round(Math.abs(Number(soTien) || 0));
  if (n === 0) return 'không đồng';
  const nhom: number[] = [];
  let x = n;
  while (x > 0) { nhom.push(x % 1000); x = Math.floor(x / 1000); }
  // Trên 999 tỷ: đọc phần tỷ như một số (hiếm ở quầy, nhưng không được sai).
  if (nhom.length > 4) {
    const ty = Math.floor(n / 1e9);
    const du = n % 1e9;
    return [`${docTien(ty)} tỷ`.replace(' đồng', ''), du ? docTien(du) : ''].filter(Boolean).join(' ');
  }
  const phan: string[] = [];
  for (let i = nhom.length - 1; i >= 0; i--) {
    if (nhom[i] === 0) continue;
    phan.push([docBaSo(nhom[i], false), DON_VI[i]].filter(Boolean).join(' '));
  }
  return phan.join(' ');
}

const gio = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 7 * 3_600_000);
  return `${d.getUTCHours()} giờ ${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

export type Den = 'xanh' | 'vang' | 'lech' | 'do' | 'khong_doc_duoc';

export type LyDo =
  | 'khop_ma' | 'khop_so_tien'
  | 'thieu_tien' | 'du_tien'
  | 'dang_cho'
  | 'sai_tai_khoan' | 'chua_thay_tien' | 'bill_cu'
  | 'khong_doc_duoc';

export interface ThamSoCau {
  so_tien?: number | null;
  thuc_te?: number | null;
  ngan_hang?: string | null;
  luc?: string | null;
}

/** Câu loa cho một kết quả. Mỗi câu ≤ 2 mệnh đề, câu đầu là điều cần làm hoặc điều đã chắc. */
export function cauNoi(lyDo: LyDo, t: ThamSoCau = {}): string {
  const tien = t.so_tien ? docTien(t.so_tien) : 'khoản này';
  switch (lyDo) {
    case 'khop_ma':
    case 'khop_so_tien': {
      const o = t.ngan_hang ? ` về ${t.ngan_hang}` : '';
      const l = t.luc ? ` lúc ${gio(t.luc)}` : '';
      return `Đã nhận ${tien}${o}${l}.`;
    }
    case 'thieu_tien': {
      const thieu = (t.so_tien ?? 0) - (t.thuc_te ?? 0);
      return `Mới nhận ${docTien(t.thuc_te ?? 0)}. Còn thiếu ${docTien(thieu)}.`;
    }
    case 'du_tien': {
      const du = (t.thuc_te ?? 0) - (t.so_tien ?? 0);
      return `Nhận ${docTien(t.thuc_te ?? 0)}, dư ${docTien(du)}. Đừng trả lại bằng tiền mặt, hoàn qua ngân hàng.`;
    }
    case 'dang_cho':
      return `Đang chờ ngân hàng báo ${tien}. Chưa giao hàng.`;
    case 'sai_tai_khoan':
      return 'Bill này chuyển cho tài khoản khác, không phải của quán. Đừng giao hàng.';
    case 'chua_thay_tien':
      return `Chưa thấy ${tien} về tài khoản nào của quán. Đừng giao hàng.`;
    case 'bill_cu':
      return 'Bill này đã cũ. Chưa thấy tiền mới về. Đừng giao hàng.';
    case 'khong_doc_duoc':
      return 'Không đọc được bill. Mở app ngân hàng để kiểm.';
  }
}
