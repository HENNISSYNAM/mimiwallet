/**
 * Đọc nội dung chuyển khoản để chỉ ra khoản tiền VÀO nào có vẻ không phải doanh thu.
 *
 * VÌ SAO CẦN. Khi chưa nối Tổng cục Thuế, MIMI ước doanh thu năm bằng tiền vào tài
 * khoản — và con số đó quyết định mốc 1 tỷ (có phải nộp thuế không) và mốc 3 tỷ (còn
 * được chọn cách tính không). Chuyển giữa hai tài khoản của chính mình đã được loại ở
 * `ledger/internal-transfer.ts`. Còn lại thì cộng hết: tiền con gửi về cho ba mẹ,
 * ngân hàng giải ngân khoản vay, chủ hộ bơm vốn, nhà cung cấp hoàn tiền.
 *
 * Câu hỏi thật gom từ một người dùng ngày 24/09/2026 — hộ kinh doanh, ba mẹ lớn tuổi,
 * "giờ quy ra sao kê không biết sao kê thế nào, mới ước lượng thử thôi" — cho thấy đây
 * đúng là chỗ người ta hoang mang nhất: trên sao kê, tiền người nhà chuyển trông y hệt
 * tiền khách trả.
 *
 * CHỈ GỢI Ý, KHÔNG TỰ LOẠI. Cùng nguyên tắc với `ca-nhan.ts`. "Hoàn tiền" có thể là
 * khách trả nốt; "đặt cọc" có thể là tiền bán hàng trả trước. Và hai chiều sai không
 * cân nhau: loại nhầm một khoản bán hàng là KHAI THIẾU doanh thu — trái luật; giữ nhầm
 * một khoản vay chỉ làm con số cao hơn thật. Nên máy chỉ chỉ ra kèm lý do và nguyên văn
 * nội dung; loại hay không là người quyết.
 *
 * Từ khoá viết không dấu, so trên tên người chuyển + nội dung chuyển khoản đã bỏ dấu,
 * vì sao kê ngân hàng Việt Nam gần như luôn không dấu và viết hoa.
 */

export interface KhoanTienVao {
  merchant_name: string | null;
  counter_account_name: string | null;
  payment_reference: string | null;
}

export type LoaiTienVao = 'vay' | 'gop_von' | 'nguoi_nha' | 'hoan_tien' | 'dat_coc';

export interface GoiYTienVao {
  loai: LoaiTienVao;
  /** Nói cho người dùng, bằng lời thường. */
  ly_do: string;
}

const boDau = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/**
 * Thứ tự là thứ tự ưu tiên khi nhiều nhóm cùng khớp. Vay đứng đầu vì nội dung giải
 * ngân của ngân hàng rất đặc trưng, còn "gửi"/"chuyển" thì mơ hồ hơn nhiều.
 */
const NHOM: { loai: LoaiTienVao; mau: RegExp; ly_do: string }[] = [
  {
    loai: 'vay',
    mau: /\b(giai ngan|gn hdtd|hdtd|hop dong tin dung|khoan vay|vay von|vay tien|tien vay|cho vay|giai ngan vay)\b/,
    ly_do: 'Nội dung giống giải ngân khoản vay — tiền vay không phải doanh thu.',
  },
  {
    loai: 'gop_von',
    mau: /\b(gop von|von gop|bo sung von|tang von|nop von|them von)\b/,
    ly_do: 'Nội dung giống góp hoặc bổ sung vốn — tiền góp vốn không phải doanh thu.',
  },
  {
    loai: 'nguoi_nha',
    // KHÔNG có "tiền thuốc", "tiền học", "tiền ăn", "quà Tết": với nhà thuốc, trung
    // tâm dạy thêm, quán ăn, tiệm quà thì đó chính là tiền khách trả — gợi ý loại ra
    // sẽ xui người ta khai thiếu.
    mau: /\b(con (gui|chuyen|cho|bieu)|(me|bo|ba|cha|anh|chi|em|vo|chong|ong|ba noi|ba ngoai) (gui|chuyen|cho)( tien)?|gui (me|bo|ba me|bo me|cha me|ong ba)|chuyen (cho|ve cho) (me|bo|ba me|bo me|cha me)|bieu (ong ba|bo me|ba me|cha me)|phung duong|tien (tieu|sinh hoat)|li xi|mung tuoi)\b/,
    ly_do: 'Nội dung giống tiền người nhà chuyển cho — không phải tiền bán hàng.',
  },
  {
    loai: 'hoan_tien',
    mau: /\b(hoan tien|hoan tra|tra lai tien|refund|hoan phi)\b/,
    ly_do: 'Nội dung giống tiền được hoàn lại — thường không phải doanh thu, nhưng có thể là khách trả nốt.',
  },
  {
    loai: 'dat_coc',
    mau: /\b(dat coc|tien coc|coc hang|nhan coc)\b/,
    ly_do: 'Nội dung giống tiền đặt cọc — có thể chưa phải doanh thu cho tới khi giao hàng.',
  },
];

export function goiYTienVao(k: KhoanTienVao): GoiYTienVao | null {
  const chu = ` ${boDau([k.merchant_name, k.counter_account_name, k.payment_reference].filter(Boolean).join(' '))} `;
  for (const n of NHOM) if (n.mau.test(chu)) return { loai: n.loai, ly_do: n.ly_do };
  return null;
}

/** Tên ngắn cho từng loại, dùng làm tiêu đề cột. */
export const TEN_LOAI_TIEN_VAO: Record<LoaiTienVao, string> = {
  vay: 'Tiền vay',
  gop_von: 'Góp vốn',
  nguoi_nha: 'Người nhà chuyển',
  hoan_tien: 'Hoàn tiền',
  dat_coc: 'Đặt cọc',
};
