/**
 * Nhận dạng tài liệu tải lên: loại báo cáo / tờ khai, chế độ kế toán (thông tư) ghi trên đó, năm của kỳ.
 * Hàm thuần. Chỉ đọc điều GHI TRÊN TỆP (tên báo cáo, mẫu số, số thông tư) — không suy ra từ nội dung số.
 *
 * Kiểm mẫu còn hiệu lực bằng căn cứ trích NGUYÊN VĂN từ kho văn bản của MIMI (doan_phap_luat), không viết
 * lại theo trí nhớ.
 */
import { boDau } from './doc-bang.ts';

export type LoaiTaiLieu =
  | 'can_doi_ke_toan' | 'ket_qua_kinh_doanh' | 'luu_chuyen_tien_te' | 'can_doi_tai_khoan'
  | 'to_khai_gtgt' | 'to_khai_quyet_toan_tndn' | 'to_khai_ho_kinh_doanh' | 'to_khai_quyet_toan_tncn'
  | 'khong_ro';

export const TEN_LOAI_TAI_LIEU: Record<LoaiTaiLieu, string> = {
  can_doi_ke_toan: 'Bảng cân đối kế toán / Báo cáo tình hình tài chính',
  ket_qua_kinh_doanh: 'Báo cáo kết quả hoạt động kinh doanh',
  luu_chuyen_tien_te: 'Báo cáo lưu chuyển tiền tệ',
  can_doi_tai_khoan: 'Bảng cân đối tài khoản / số phát sinh',
  to_khai_gtgt: 'Tờ khai thuế giá trị gia tăng',
  to_khai_quyet_toan_tndn: 'Tờ khai quyết toán thuế thu nhập doanh nghiệp',
  to_khai_ho_kinh_doanh: 'Tờ khai thuế của hộ, cá nhân kinh doanh',
  to_khai_quyet_toan_tncn: 'Tờ khai quyết toán thuế thu nhập cá nhân',
  khong_ro: 'Chưa nhận ra loại tài liệu',
};

/** Thứ tự quan trọng: tờ khai trước (tên tờ khai có thể chứa "doanh thu", "lợi nhuận"). */
const MAU_LOAI: ReadonlyArray<readonly [RegExp, LoaiTaiLieu]> = [
  [/\bto khai quyet toan thue thu nhap doanh nghiep\b|\b03\/tndn\b/, 'to_khai_quyet_toan_tndn'],
  [/\bquyet toan thue thu nhap ca nhan\b|\b05\/qtt-tncn\b|\b02\/qtt-tncn\b/, 'to_khai_quyet_toan_tncn'],
  [/\bto khai thue (doi voi|cua) ho kinh doanh\b|\bho kinh doanh, ca nhan kinh doanh\b|\b01\/cnkd\b|\b01\/tkn-cnkd\b/, 'to_khai_ho_kinh_doanh'],
  [/\bto khai thue gia tri gia tang\b|\bto khai thue gtgt\b|\b01\/gtgt\b|\b04\/gtgt\b/, 'to_khai_gtgt'],
  [/\bbao cao luu chuyen tien te\b|\bb03-dn/, 'luu_chuyen_tien_te'],
  [/\bbao cao ket qua (hoat dong )?kinh doanh\b|\bb02-dn/, 'ket_qua_kinh_doanh'],
  [/\bbang can doi (tai khoan|so phat sinh)\b|\bf01-dn/, 'can_doi_tai_khoan'],
  [/\bbang can doi ke toan\b|\bbao cao tinh hinh tai chinh\b|\bb01-dn|\bb01a-dnn|\bb01b-dnn/, 'can_doi_ke_toan'],
];

export type CheDo = 'tt200_2014' | 'tt99_2025' | 'tt133_2016' | 'tt132_2018' | 'tt88_2021' | 'tt152_2025';

export const TEN_CHE_DO: Record<CheDo, string> = {
  tt200_2014: 'Thông tư 200/2014/TT-BTC',
  tt99_2025: 'Thông tư 99/2025/TT-BTC',
  tt133_2016: 'Thông tư 133/2016/TT-BTC',
  tt132_2018: 'Thông tư 132/2018/TT-BTC',
  tt88_2021: 'Thông tư 88/2021/TT-BTC',
  tt152_2025: 'Thông tư 152/2025/TT-BTC',
};

const MAU_CHE_DO: ReadonlyArray<readonly [RegExp, CheDo]> = [
  [/\b200\/2014\/tt-btc\b/, 'tt200_2014'],
  [/\b99\/2025\/tt-btc\b/, 'tt99_2025'],
  [/\b133\/2016\/tt-btc\b/, 'tt133_2016'],
  [/\b132\/2018\/tt-btc\b/, 'tt132_2018'],
  [/\b88\/2021\/tt-btc\b/, 'tt88_2021'],
  [/\b152\/2025\/tt-btc\b/, 'tt152_2025'],
];

/**
 * Căn cứ về mẫu hết hiệu lực — trích nguyên văn từ kho (doan_phap_luat), đối chiếu 26/09/2026:
 *   - 99/2025/TT-BTC, Điều 31 khoản 1 (đoạn thứ 44 trong kho);
 *   - 152/2025/TT-BTC, Điều 8 khoản 2 (đoạn thứ 11 trong kho).
 */
export const CAN_CU_MAU = {
  tt99_d31_k1: {
    van_ban: '99/2025/TT-BTC', dieu: 'Điều 31 khoản 1',
    trich: 'Thông tư này có hiệu lực thi hành kể từ ngày 01/01/2026 và áp dụng cho năm tài chính bắt đầu từ hoặc sau ngày 01/01/2026. Thông tư này thay thế cho các Thông tư số 200/2014/TT-BTC ngày 22/12/2014 của Bộ Tài chính hướng dẫn chế độ kế toán doanh nghiệp (trừ trường hợp quy định tại khoản 2 Điều này)',
  },
  tt152_d8_k2: {
    van_ban: '152/2025/TT-BTC', dieu: 'Điều 8 khoản 2',
    trich: 'Thông tư số 88/2021/TT-BTC ngày 11/10/2021 của Bộ trưởng Bộ Tài chính hướng dẫn chế độ kế toán cho các hộ kinh doanh, cá nhân kinh doanh hết hiệu lực kể từ ngày Thông tư này có hiệu lực thi hành.',
  },
} as const;

export interface NhanDang {
  loai: LoaiTaiLieu;
  che_do: CheDo | null;
  /** Năm của kỳ báo cáo / kỳ tính thuế đọc được trên tệp (năm lớn nhất ở phần đầu). */
  nam: number | null;
  /** Cảnh báo mẫu: chỉ khi CHẮC (tệp ghi rõ thông tư và năm). */
  canh_bao_mau: { cau: string; can_cu: (typeof CAN_CU_MAU)[keyof typeof CAN_CU_MAU] } | null;
}

export function nhanDang(dauTrang: string, tenSheet = ''): NhanDang {
  const s = ` ${boDau(`${tenSheet}\n${dauTrang}`).replace(/\s+/g, ' ')} `;
  const loai = MAU_LOAI.find(([re]) => re.test(s))?.[1] ?? 'khong_ro';
  const che_do = MAU_CHE_DO.find(([re]) => re.test(s))?.[1] ?? null;
  // Năm của kỳ: "năm 2026", "quý 3 năm 2026", "tại ngày 31 tháng 12 năm 2025", "kỳ tính thuế: 2026".
  // Bỏ số hiệu văn bản ("200/2014/TT-BTC", "ngày 22/12/2014") để năm ban hành không lẫn vào năm kỳ.
  const sachVanBan = s.replace(/\b\d{1,3}\/\d{4}\/(tt|nd|qd)-[a-z]+\b/g, ' ').replace(/\bngay \d{1,2}\/\d{1,2}\/\d{4}\b/g, ' ');
  const cacNam = [...sachVanBan.matchAll(/\b(?:nam|ky tinh thue|ky)\s*:?\s*(20\d{2})\b|\b(?:thang|quy)\s*\d{1,2}\s*(?:\/|nam)\s*(20\d{2})\b|\b\d{1,2}\/\d{1,2}\/(20\d{2})\b/g)]
    .map((m) => Number(m[1] ?? m[2] ?? m[3])).filter((n) => n >= 2000 && n <= 2100);
  const nam = cacNam.length ? Math.max(...cacNam) : null;

  let canh_bao_mau: NhanDang['canh_bao_mau'] = null;
  const laBaoCao = loai === 'can_doi_ke_toan' || loai === 'ket_qua_kinh_doanh' || loai === 'luu_chuyen_tien_te' || loai === 'can_doi_tai_khoan';
  if (laBaoCao && che_do === 'tt200_2014' && nam !== null && nam >= 2026) {
    canh_bao_mau = {
      cau: `Báo cáo năm ${nam} ghi lập theo Thông tư 200/2014 — từ năm tài chính bắt đầu từ 01/01/2026, Thông tư 99/2025 thay thế Thông tư 200. Kiểm lại mẫu trước khi nộp (có trường hợp ngoại lệ ở khoản 2 Điều 31).`,
      can_cu: CAN_CU_MAU.tt99_d31_k1,
    };
  } else if (che_do === 'tt88_2021' && nam !== null && nam >= 2026) {
    canh_bao_mau = {
      cau: `Tài liệu năm ${nam} ghi theo Thông tư 88/2021 (kế toán hộ kinh doanh) — thông tư này hết hiệu lực từ 01/01/2026, thay bằng Thông tư 152/2025.`,
      can_cu: CAN_CU_MAU.tt152_d8_k2,
    };
  }
  return { loai, che_do, nam, canh_bao_mau };
}
