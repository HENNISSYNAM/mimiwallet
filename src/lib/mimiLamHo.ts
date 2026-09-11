/**
 * MIMI làm hộ — biến một câu nhờ việc thành các bước con trỏ mèo làm trên giao diện.
 *
 * GIỐNG "CO-WORK" CỦA CÁC TRỢ LÝ AI. Người dùng thấy con mèo đi tới đúng mục,
 * gõ vào đúng ô, dừng ở đúng nút — không phải đọc một đoạn "vào mục X, bấm nút
 * Y". Nhìn thấy làm thì học được, và thấy làm sai thì chặn được ngay.
 *
 * CON TRỎ CHỈ ĐIỀU KHIỂN GIAO DIỆN CỦA MIMI, không phải chuột thật của máy tính,
 * và không đi ra ngoài `/dashboard`.
 *
 * VÌ SAO LÀ LUẬT CỐ ĐỊNH, CHƯA PHẢI MÔ HÌNH. Function `chat` hiện chưa có khoá mô
 * hình — thử thật ngày 11/09/2026 nó trả lời bằng bộ nội bộ. Hiểu sai một câu
 * nhờ việc là con trỏ đi sai chỗ, nên ở đây chỉ nhận những việc nhận ra chắc
 * chắn; câu khác để chat trả lời như cũ. Khi có mô hình, nó sinh cùng dạng
 * `KichBan` và vẫn phải qua `kiemKichBan` trước khi chạy.
 *
 * RANH GIỚI KHÔNG VƯỢT. Con trỏ không bao giờ tự bấm nút làm đi tiền, cấp khoá
 * hay không hoàn tác được — duyệt, từ chối, trả, huỷ, thu hồi, thêm agent, thêm
 * người nhận. Nó đi tới đó, nói rõ bấm sẽ làm gì, rồi NHƯỜNG người dùng bấm.
 */

export type Buoc =
  | { loai: 'di_toi'; duongDan: string; noi: string }
  /** `neuKhongThay`: không có đích thì nói câu này và kết thúc; chuỗi rỗng = bỏ qua bước này. */
  | { loai: 'chi'; dich: string; noi: string; neuKhongThay?: string }
  | { loai: 'go'; dich: string; chu: string; noi: string }
  | { loai: 'bam'; dich: string; noi: string }
  | { loai: 'nhuong'; dich: string; noi: string };

export interface KichBan {
  ten: string;
  moTa: string;
  buoc: Buoc[];
}

/**
 * Đích con trỏ không bao giờ tự bấm. Giao diện còn đánh dấu
 * `data-mimi-khong-tu-bam` trên chính các nút đó — lớp chặn thứ hai lúc chạy.
 */
export const DICH_KHONG_TU_BAM: ReadonlySet<string> = new Set([
  'tac-tu.them',
  'tac-tu.duyet',
  'tac-tu.tu-choi',
  'tac-tu.tra-qr',
  'tac-tu.huy',
  'tac-tu.thu-hoi',
  'tac-tu.khoa-moi',
  'tac-tu.nguoi-nhan.them',
  'tac-tu.nguoi-nhan.xoa',
]);

export const SO_BUOC_TOI_DA = 12;

const DICH_HOP_LE = /^(nav:\/dashboard(\/[a-z0-9-]+)*|[a-z0-9-]+(\.[a-z0-9-]+)+)$/;
const DUONG_DAN_HOP_LE = /^\/dashboard(\/[a-z0-9-]+)*$/;

/** Trả về danh sách vi phạm. Rỗng thì được chạy. */
export function kiemKichBan(kb: KichBan): string[] {
  const loi: string[] = [];
  if (kb.buoc.length === 0 || kb.buoc.length > SO_BUOC_TOI_DA) {
    loi.push(`Kịch bản phải có 1–${SO_BUOC_TOI_DA} bước.`);
  }
  kb.buoc.forEach((b, i) => {
    const so = `Bước ${i + 1}`;
    if (b.loai === 'di_toi') {
      if (!DUONG_DAN_HOP_LE.test(b.duongDan)) loi.push(`${so}: chỉ được đi trong ứng dụng (${b.duongDan}).`);
      return;
    }
    if (!DICH_HOP_LE.test(b.dich)) loi.push(`${so}: đích "${b.dich}" sai khuôn.`);
    if (b.loai === 'bam' && DICH_KHONG_TU_BAM.has(b.dich)) loi.push(`${so}: không được tự bấm "${b.dich}".`);
    if (b.loai === 'go' && (b.chu.length === 0 || b.chu.length > 200)) loi.push(`${so}: chữ gõ phải dài 1–200 ký tự.`);
  });
  return loi;
}

const boDau = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/** Trỏ vào mục trên thanh điều hướng (nếu đang hiện) rồi mở trang. */
function moTrang(duongDan: string, ten: string): Buoc[] {
  return [
    { loai: 'chi', dich: `nav:${duongDan}`, noi: `Mục "${ten}" nằm ở đây.`, neuKhongThay: '' },
    { loai: 'di_toi', duongDan, noi: `Mở ${ten}.` },
  ];
}

/** Tên trong ngoặc kép, hoặc sau chữ "tên". Không đoán tên từ phần còn lại của câu. */
export function layTen(cau: string): string | null {
  const ngoac = cau.match(/["“”']([^"“”']{2,80})["“”']/);
  if (ngoac) return ngoac[1].trim();
  const sauTen = cau.match(/\btên\s*(?:là\s*)?[:\-]?\s*([^\n,.?!]{2,80})/i);
  if (sauTen) return sauTen[1].trim();
  return null;
}

const KB_TAC_TU = '/dashboard/tac-tu';
const KB_CHUNG_TU = '/dashboard/chung-tu';
const KB_FINTECH = '/dashboard/fintech';

/** Nhận việc từ một câu. `null` khi không chắc — để chat trả lời như cũ. */
export function nhanViec(cau: string): KichBan | null {
  const s = ` ${boDau(cau).replace(/\s+/g, ' ').trim()} `;

  if (/ (tao|them|lap) (mot |1 )?(agent|tac tu|bot) /.test(s) || / (tao|them|lap) (mot |1 )?(agent|tac tu|bot)$/.test(s.trimEnd())) {
    const ten = layTen(cau) ?? 'Trợ lý MIMI';
    return {
      ten: 'tao_agent',
      moTa: `tạo agent "${ten}"`,
      buoc: [
        ...moTrang(KB_TAC_TU, 'Kiểm soát agent'),
        { loai: 'go', dich: 'tac-tu.ten', chu: ten, noi: 'Gõ tên agent vào đây.' },
        {
          loai: 'nhuong',
          dich: 'tac-tu.them',
          noi: 'Kiểm lại tên rồi bấm "Thêm agent". Khoá của agent chỉ hiện đúng một lần — chép ngay khi nó hiện ra.',
        },
      ],
    };
  }

  if (/ (them|khai) (mot |1 )?(nguoi nhan|tai khoan nhan) /.test(s)) {
    const stk = cau.match(/\b\d{6,19}\b/)?.[0];
    const ten = layTen(cau);
    const buoc: Buoc[] = [
      ...moTrang(KB_TAC_TU, 'Kiểm soát agent'),
      { loai: 'chi', dich: 'tac-tu.nguoi-nhan.ngan-hang', noi: 'Chọn đúng ngân hàng của người nhận ở ô này.' },
    ];
    if (stk) buoc.push({ loai: 'go', dich: 'tac-tu.nguoi-nhan.stk', chu: stk, noi: 'Gõ số tài khoản.' });
    else buoc.push({ loai: 'chi', dich: 'tac-tu.nguoi-nhan.stk', noi: 'Gõ số tài khoản người nhận vào đây.' });
    if (ten) buoc.push({ loai: 'go', dich: 'tac-tu.nguoi-nhan.ten', chu: ten, noi: 'Gõ tên chủ tài khoản.' });
    else buoc.push({ loai: 'chi', dich: 'tac-tu.nguoi-nhan.ten', noi: 'Gõ tên chủ tài khoản đúng như app ngân hàng hiện.' });
    buoc.push({
      loai: 'nhuong',
      dich: 'tac-tu.nguoi-nhan.them',
      noi: 'Kiểm ngân hàng, số tài khoản và tên rồi bấm "Thêm". Agent sẽ được phép chi cho tài khoản này.',
    });
    return { ten: 'them_nguoi_nhan', moTa: 'thêm người nhận được phép', buoc };
  }

  if (/ (cho (toi |minh )?duyet|can duyet|duyet (khoan|yeu cau)|khoan (chi )?(nao )?(dang )?cho) /.test(s)) {
    return {
      ten: 'xem_cho_duyet',
      moTa: 'mở các khoản đang chờ bạn duyệt',
      buoc: [
        ...moTrang(KB_TAC_TU, 'Kiểm soát agent'),
        {
          loai: 'chi',
          dich: 'tac-tu.cho-duyet',
          noi: 'Đây là các khoản agent đang chờ bạn duyệt. Duyệt hay từ chối là bạn bấm — mình không bấm hộ.',
          neuKhongThay: 'Hiện không có khoản nào chờ bạn duyệt.',
        },
      ],
    };
  }

  if (/ (khoan|chi) .*(chua|thieu) (co )?(chung tu|hoa don)| (xem|mo) (trang |muc )?chung tu /.test(s)) {
    return {
      ten: 'xem_chung_tu',
      moTa: 'mở các khoản chi chưa có chứng từ',
      buoc: [
        ...moTrang(KB_CHUNG_TU, 'Chứng từ chi phí'),
        {
          loai: 'chi',
          dich: 'chung-tu.chua-co-giay',
          noi: 'Đây là tổng các khoản chi chưa có hoá đơn trong kỳ này. Danh sách từng khoản nằm ngay bên dưới.',
          neuKhongThay: 'Trang chứng từ chưa có số liệu — cần liên kết ngân hàng trước.',
        },
      ],
    };
  }

  if (/ (lien ket|ket noi|noi) (tai khoan )?ngan hang | sepay /.test(s)) {
    return {
      ten: 'lien_ket_ngan_hang',
      moTa: 'mở chỗ liên kết ngân hàng',
      buoc: [
        ...moTrang(KB_FINTECH, 'Fintech Hub'),
        { loai: 'chi', dich: 'fintech.ngan-hang', noi: 'Liên kết ngân hàng và khai tài khoản SePay ở trang này.' },
      ],
    };
  }

  if (/ (mo|xem|vao) (trang |muc )?(kiem soat )?agent /.test(s)) {
    return {
      ten: 'mo_kiem_soat_agent',
      moTa: 'mở Kiểm soát agent',
      buoc: [
        ...moTrang(KB_TAC_TU, 'Kiểm soát agent'),
        { loai: 'chi', dich: 'tac-tu.danh-sach', noi: 'Các agent của bạn, hạn mức và chính sách của từng agent ở đây.' },
      ],
    };
  }

  return null;
}
