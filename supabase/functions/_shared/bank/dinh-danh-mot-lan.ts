/**
 * Tóm tắt phản hồi `/identity` mà KHÔNG mang theo dữ liệu định danh nào.
 *
 * VÌ SAO CÓ. Case 18 của nghiệm thu Casso ("Thông tin tài khoản — KYC") đòi gọi
 * `/identity` bằng một grant có scope `identity`. Phản hồi đó chứa số CCCD, ngày
 * sinh, địa chỉ, số điện thoại của chủ tài khoản — những thứ MIMI không dùng.
 *
 * Từ 17/08/2026 MIMI cố ý không xin scope này. Ngày 14/09 chủ dự án quyết định
 * đóng case 18, nên luồng được làm theo cách giảm thiểu tối đa:
 *
 *   ĐỌC MỘT LẦN → TÓM TẮT Ở ĐÂY → THU HỒI GRANT NGAY → KHÔNG LƯU DÒNG LIÊN KẾT NÀO.
 *
 * Hàm này là ranh giới: thứ đi ra chỉ là requestId, số tài khoản, 4 số cuối và
 * TÊN các trường Cas trả về — đủ làm bằng chứng "gọi thành công, Cas trả những
 * trường này", không đủ để biết chủ tài khoản là ai.
 */

export interface TomTatDinhDanh {
  requestId: string | null;
  soTaiKhoan: number;
  /** 4 số cuối mỗi tài khoản — đủ để đối chiếu với liên kết, không đủ để dùng. */
  duoiTaiKhoan: string[];
  /** Tên trường, không kèm giá trị. Mảng con ghi dạng `accounts[].accountName`. */
  cacTruong: string[];
}

function laDoiTuong(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

export function tomTatDinhDanh(raw: unknown): TomTatDinhDanh {
  const o = laDoiTuong(raw) ? raw : {};
  const cacTruong = new Set<string>();

  for (const [k, v] of Object.entries(o)) {
    if (k === 'requestId') continue;
    cacTruong.add(k);
    if (laDoiTuong(v)) {
      for (const con of Object.keys(v)) cacTruong.add(`${k}.${con}`);
    } else if (Array.isArray(v)) {
      for (const phanTu of v) {
        if (laDoiTuong(phanTu)) for (const con of Object.keys(phanTu)) cacTruong.add(`${k}[].${con}`);
      }
    }
  }

  const taiKhoan = Array.isArray(o.accounts) ? o.accounts : [];
  const duoiTaiKhoan = taiKhoan
    .map((a) => (laDoiTuong(a) && typeof a.accountNumber === 'string' ? a.accountNumber.trim() : ''))
    .filter(Boolean)
    .map((so) => so.slice(-4));

  return {
    requestId: typeof o.requestId === 'string' && o.requestId ? o.requestId : null,
    soTaiKhoan: taiKhoan.length,
    duoiTaiKhoan,
    cacTruong: [...cacTruong].sort(),
  };
}
