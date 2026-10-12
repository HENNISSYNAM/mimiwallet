/**
 * Loại hình kinh doanh: câu hỏi chọn, khác biệt chính, hồ sơ và các bước nộp — mỗi điều kèm căn cứ.
 *
 * Chỉ bốn loại hình chủ dự án cần (hộ kinh doanh, TNHH một thành viên, TNHH hai thành viên trở lên,
 * công ty cổ phần). Doanh nghiệp tư nhân, công ty hợp danh cố ý không có: không có mẫu đã đọc gốc
 * thì không gợi ý — trang nói rõ điều đó thay vì đoán.
 */

import { CC, type CanCu } from './nguon';

export type LoaiHinh = 'hkd' | 'tnhh1' | 'tnhh2' | 'ctcp';
export const LOAI_HINH: readonly LoaiHinh[] = ['hkd', 'tnhh1', 'tnhh2', 'ctcp'];

export const laLoaiHinh = (v: unknown): v is LoaiHinh => typeof v === 'string' && (LOAI_HINH as readonly string[]).includes(v);

export interface DiemKhac {
  chu: string;
  can_cu: CanCu;
}

export interface MoTaLoaiHinh {
  ten: string;
  ten_ngan: string;
  trach_nhiem: DiemKhac;
  so_thanh_vien: DiemKhac;
  thue: DiemKhac;
}

const LUAT = 'Luật Doanh nghiệp số 59/2020/QH14 (sửa đổi 2022, 2025)';
const chuaDoiChieuLuat = (dieu: string): CanCu => ({
  dieu, van_ban: LUAT, trang_thai: 'thu_cap', ghi_chu: 'Chưa mở bản gốc của Luật trong lúc dựng trang.',
});

export const MO_TA: Record<LoaiHinh, MoTaLoaiHinh> = {
  hkd: {
    ten: 'Hộ kinh doanh',
    ten_ngan: 'Hộ kinh doanh',
    trach_nhiem: {
      chu: 'Không phải pháp nhân; chủ hộ (hoặc các thành viên hộ gia đình) chịu trách nhiệm bằng toàn bộ tài sản của mình.',
      can_cu: { dieu: 'Quy định về hộ kinh doanh', van_ban: 'Nghị định 168/2025/NĐ-CP', trang_thai: 'thu_cap', ghi_chu: 'Chưa đối chiếu bản gốc.' },
    },
    so_thanh_vien: {
      chu: 'Một cá nhân, hoặc các thành viên hộ gia đình cùng đăng ký (mục 6, 7 của Giấy đề nghị). Người đã là chủ hộ/thành viên hộ khác hoặc chủ doanh nghiệp tư nhân thì không được đăng ký (cam kết trong mẫu).',
      can_cu: { ...CC.mauHkd, dieu: 'Mục 6, 7 và phần "Tôi xin cam kết" của Mẫu số 1 Phụ lục II' },
    },
    thue: {
      chu: 'Mẫu đăng ký cho chọn phương pháp tính thuế GTGT: kê khai hoặc khoán (mục 5.4). Phương pháp khoán bị bỏ từ 01/01/2026 theo Nghị quyết 198/2025/QH15.',
      can_cu: CC.boKhoan,
    },
  },
  tnhh1: {
    ten: 'Công ty trách nhiệm hữu hạn một thành viên',
    ten_ngan: 'TNHH một thành viên',
    trach_nhiem: {
      chu: 'Có tư cách pháp nhân; chủ sở hữu chịu trách nhiệm về nợ và nghĩa vụ tài sản của công ty trong phạm vi vốn điều lệ.',
      can_cu: chuaDoiChieuLuat('Điều 74 khoản 1'),
    },
    so_thanh_vien: {
      chu: 'Một tổ chức hoặc một cá nhân làm chủ sở hữu. Mô hình quản lý: Hội đồng thành viên hoặc Chủ tịch công ty, kèm Giám đốc/Tổng giám đốc (mục 5 Mẫu số 2).',
      can_cu: { ...CC.mau2, dieu: 'Mục 5 Mẫu số 2' },
    },
    thue: {
      chu: 'Chọn 1 trong 4 phương pháp tính thuế GTGT khi thành lập mới (chỉ tiêu 10.9): khấu trừ, trực tiếp trên GTGT, trực tiếp trên doanh số, không phải nộp thuế GTGT.',
      can_cu: { ...CC.mau2, dieu: 'Chỉ tiêu 10.9 và chú thích 12 Mẫu số 2' },
    },
  },
  tnhh2: {
    ten: 'Công ty trách nhiệm hữu hạn hai thành viên trở lên',
    ten_ngan: 'TNHH hai thành viên trở lên',
    trach_nhiem: {
      chu: 'Có tư cách pháp nhân; thành viên chịu trách nhiệm trong phạm vi số vốn đã cam kết góp.',
      can_cu: chuaDoiChieuLuat('Điều 46 khoản 1'),
    },
    so_thanh_vien: {
      chu: 'Từ 02 đến 50 thành viên là tổ chức, cá nhân; kê khai theo Danh sách thành viên (Mẫu số 6).',
      can_cu: chuaDoiChieuLuat('Điều 46 khoản 1'),
    },
    thue: {
      chu: 'Chọn 1 trong 4 phương pháp tính thuế GTGT khi thành lập mới (chỉ tiêu 9.9 Mẫu số 3).',
      can_cu: { ...CC.mau3, dieu: 'Chỉ tiêu 9.9 Mẫu số 3' },
    },
  },
  ctcp: {
    ten: 'Công ty cổ phần',
    ten_ngan: 'Công ty cổ phần',
    trach_nhiem: {
      chu: 'Có tư cách pháp nhân; cổ đông chịu trách nhiệm trong phạm vi số vốn đã góp. Vốn điều lệ chia thành cổ phần, được phát hành cổ phần để huy động vốn.',
      can_cu: chuaDoiChieuLuat('Điều 111'),
    },
    so_thanh_vien: {
      chu: 'Tối thiểu 03 cổ đông, không hạn chế tối đa; cổ đông sáng lập kê khai theo Mẫu số 7.',
      can_cu: chuaDoiChieuLuat('Điều 111 khoản 1'),
    },
    thue: {
      chu: 'Chọn 1 trong 4 phương pháp tính thuế GTGT khi thành lập mới (chỉ tiêu 11.9 Mẫu số 4).',
      can_cu: { ...CC.mau4, dieu: 'Chỉ tiêu 11.9 Mẫu số 4' },
    },
  },
};

// ───────────────────────── Câu hỏi chọn loại hình ─────────────────────────

export interface TraLoiChon {
  /** Bao nhiêu người (tổ chức, cá nhân) cùng góp vốn — tính cả bạn. */
  so_nguoi: number | null;
  /** Một mình/gia đình, quy mô nhỏ, chấp nhận chịu trách nhiệm bằng toàn bộ tài sản để thủ tục gọn nhất. */
  nho_le_gia_dinh: boolean | null;
  /** Muốn chia vốn thành cổ phần, gọi vốn nhà đầu tư, chuyển nhượng dễ. */
  muon_co_phan: boolean | null;
}

export interface GoiY {
  loai: LoaiHinh | null;
  ly_do: string[];
}

/**
 * Hàm thuần: câu trả lời → loại hình gợi ý + lý do. Không trả lời đủ thì `loai = null`.
 * Vì sao không chỉ trả một nhãn: người dùng cần thấy điều kiện nào đẩy họ về loại hình nào,
 * để tự sửa câu trả lời nếu hiểu khác.
 */
export function goiYLoaiHinh(tl: TraLoiChon): GoiY {
  const ly_do: string[] = [];
  const n = tl.so_nguoi;
  if (n == null || !Number.isFinite(n) || n < 1) return { loai: null, ly_do: ['Cho MIMI biết có bao nhiêu người cùng góp vốn.'] };
  if (tl.nho_le_gia_dinh == null || tl.muon_co_phan == null) return { loai: null, ly_do: ['Trả lời đủ ba câu để MIMI gợi ý.'] };

  if (tl.nho_le_gia_dinh && !tl.muon_co_phan) {
    ly_do.push('Kinh doanh nhỏ, một mình hoặc cùng gia đình: hộ kinh doanh có thủ tục gọn nhất, nộp ở cấp xã.');
    ly_do.push('Đổi lại, hộ kinh doanh không có tư cách pháp nhân và chủ hộ chịu trách nhiệm bằng toàn bộ tài sản.');
    return { loai: 'hkd', ly_do };
  }
  if (tl.muon_co_phan) {
    if (n >= 3) {
      ly_do.push('Muốn chia vốn thành cổ phần, gọi vốn: chỉ công ty cổ phần được phát hành cổ phần.');
      return { loai: 'ctcp', ly_do };
    }
    ly_do.push('Công ty cổ phần cần tối thiểu 03 cổ đông — bạn mới có ' + n + ' người.');
    ly_do.push('Có thể lập công ty TNHH trước rồi chuyển đổi khi có đủ cổ đông.');
    return { loai: n === 1 ? 'tnhh1' : 'tnhh2', ly_do };
  }
  if (n === 1) {
    ly_do.push('Một chủ sở hữu, muốn trách nhiệm giới hạn trong vốn điều lệ: công ty TNHH một thành viên.');
    return { loai: 'tnhh1', ly_do };
  }
  if (n <= 50) {
    ly_do.push('Từ 2 đến 50 người góp vốn, không cần phát hành cổ phần: công ty TNHH hai thành viên trở lên.');
    return { loai: 'tnhh2', ly_do };
  }
  ly_do.push('Trên 50 người góp vốn vượt giới hạn của công ty TNHH: chọn công ty cổ phần.');
  return { loai: 'ctcp', ly_do };
}

// ───────────────────────── Hồ sơ cần có ─────────────────────────

export interface MucHoSo {
  ten: string;
  /** Mã mẫu MIMI soạn được (xem `mau.ts`), nếu có. */
  mau?: MaMau;
  khi_nao?: string;
  can_cu: CanCu;
}

export type MaMau = 'mau1_hkd' | 'mau2' | 'mau3' | 'mau4' | 'mau6' | 'mau7' | 'mau10' | 'dieu_le';

export function hoSoCan(loai: LoaiHinh): MucHoSo[] {
  const banSao: MucHoSo = {
    ten: 'Bản sao giấy tờ pháp lý của cá nhân (người đại diện theo pháp luật, thành viên/cổ đông, chủ sở hữu) — nếu Cơ quan đăng ký kinh doanh không khai thác được qua số định danh cá nhân; giấy tờ pháp lý của tổ chức nếu thành viên/cổ đông là tổ chức',
    can_cu: CC.dieu21_23,
  };
  const dieuLe: MucHoSo = { ten: 'Điều lệ công ty', mau: 'dieu_le', can_cu: CC.dieu24 };
  const cshhl: MucHoSo = { ten: 'Danh sách chủ sở hữu hưởng lợi của doanh nghiệp', mau: 'mau10', can_cu: CC.mau10 };
  const ndtnn: MucHoSo = {
    ten: 'Giấy chứng nhận đăng ký đầu tư và cam kết của nhà đầu tư nước ngoài (Phụ lục kèm Giấy đề nghị)',
    khi_nao: 'Chỉ khi có nhà đầu tư nước ngoài — MIMI chưa soạn phần này.',
    can_cu: { ...CC.mau4, dieu: 'Mục 9, mục 13 và Phụ lục Cam kết của Mẫu số 4' },
  };
  if (loai === 'hkd') {
    return [
      { ten: 'Giấy đề nghị đăng ký hộ kinh doanh', mau: 'mau1_hkd', can_cu: CC.mauHkd },
      {
        ten: 'Biên bản họp thành viên hộ gia đình về việc thành lập hộ kinh doanh',
        khi_nao: 'Khi các thành viên hộ gia đình cùng đăng ký.',
        can_cu: { dieu: 'Quy định về hồ sơ đăng ký hộ kinh doanh', van_ban: 'Nghị định 168/2025/NĐ-CP', trang_thai: 'thu_cap', ghi_chu: 'Chưa đối chiếu bản gốc.' },
      },
      {
        ten: 'Bản sao văn bản uỷ quyền của thành viên hộ gia đình cho một người làm chủ hộ',
        khi_nao: 'Khi các thành viên hộ gia đình cùng đăng ký.',
        can_cu: { dieu: 'Quy định về hồ sơ đăng ký hộ kinh doanh', van_ban: 'Nghị định 168/2025/NĐ-CP', trang_thai: 'thu_cap', ghi_chu: 'Chưa đối chiếu bản gốc.' },
      },
    ];
  }
  if (loai === 'tnhh1') {
    return [
      { ten: 'Giấy đề nghị đăng ký doanh nghiệp (công ty TNHH một thành viên)', mau: 'mau2', can_cu: CC.mau2 },
      dieuLe, cshhl, banSao, ndtnn,
    ];
  }
  if (loai === 'tnhh2') {
    return [
      { ten: 'Giấy đề nghị đăng ký doanh nghiệp (công ty TNHH hai thành viên trở lên)', mau: 'mau3', can_cu: CC.mau3 },
      dieuLe,
      { ten: 'Danh sách thành viên', mau: 'mau6', can_cu: CC.mau6 },
      cshhl, banSao, ndtnn,
    ];
  }
  return [
    { ten: 'Giấy đề nghị đăng ký doanh nghiệp (công ty cổ phần)', mau: 'mau4', can_cu: CC.mau4 },
    dieuLe,
    { ten: 'Danh sách cổ đông sáng lập', mau: 'mau7', can_cu: CC.mau7 },
    {
      ten: 'Danh sách cổ đông là nhà đầu tư nước ngoài (Mẫu số 8)',
      khi_nao: 'Chỉ khi có cổ đông là nhà đầu tư nước ngoài — MIMI chưa soạn mẫu này.',
      can_cu: { ...CC.mau4, dieu: 'Mục 9 Mẫu số 4' },
    },
    cshhl, banSao, ndtnn,
  ];
}

// ───────────────────────── Các bước nộp ─────────────────────────

export interface Buoc {
  tieu_de: string;
  chi_tiet: string;
  can_cu: CanCu[];
}

export const CONG_DKDN = 'https://dangkykinhdoanh.gov.vn';

export function cacBuoc(loai: LoaiHinh): Buoc[] {
  if (loai === 'hkd') {
    return [
      {
        tieu_de: 'Chuẩn bị thông tin',
        chi_tiet: 'Tên hộ kinh doanh, trụ sở (hoặc đánh dấu "Không kinh doanh tại trụ sở"), ngành nghề — ngành chính ghi tên và mã cấp bốn VSIC, ngành khác ghi tự do; vốn kinh doanh; số định danh cá nhân của chủ hộ và thành viên hộ gia đình (nếu cùng đăng ký).',
        can_cu: [{ ...CC.mauHkd, dieu: 'Mục 1–7 và chú thích 2 Mẫu số 1 Phụ lục II' }],
      },
      {
        tieu_de: 'Soạn và ký Giấy đề nghị đăng ký hộ kinh doanh',
        chi_tiet: 'Dùng bộ soạn bên dưới; chủ hộ ký trực tiếp.',
        can_cu: [{ ...CC.mauHkd, dieu: 'Chú thích 6 Mẫu số 1 Phụ lục II' }],
      },
      {
        tieu_de: 'Nộp tại Cơ quan đăng ký kinh doanh cấp xã',
        chi_tiet: `Nộp trực tiếp tại cơ quan đăng ký kinh doanh cấp xã nơi đặt trụ sở, hoặc nộp qua mạng nếu địa phương đã mở (Cổng ${CONG_DKDN}).`,
        can_cu: [CC.noiNhanHkd],
      },
      {
        tieu_de: 'Chờ kết quả và nộp lệ phí',
        chi_tiet: 'Thời hạn thường được nêu là 03 ngày làm việc kể từ khi nhận hồ sơ hợp lệ. Lệ phí do Hội đồng nhân dân cấp tỉnh quy định.',
        can_cu: [CC.thoiHan, CC.lePhi],
      },
    ];
  }
  const mau = loai === 'tnhh1' ? CC.mau2 : loai === 'tnhh2' ? CC.mau3 : CC.mau4;
  return [
    {
      tieu_de: 'Chọn tên, trụ sở, ngành nghề',
      chi_tiet: 'Tên tiếng Việt viết in hoa, tên nước ngoài và viết tắt (nếu có); trụ sở ghi đến xã/phường/đặc khu và tỉnh/thành phố; ngành nghề ghi tên và mã ngành cấp bốn trong Hệ thống ngành kinh tế Việt Nam, đánh dấu một ngành chính. Nên tra tên trùng trên Cổng trước.',
      can_cu: [{ ...mau, dieu: `Mục 2, 3, 4 ${mau.dieu}` }],
    },
    {
      tieu_de: 'Soạn bộ hồ sơ',
      chi_tiet: 'Giấy đề nghị, Điều lệ, danh sách thành viên/cổ đông sáng lập (nếu có), danh sách chủ sở hữu hưởng lợi. Người đại diện theo pháp luật ký Giấy đề nghị; từng thành viên/cổ đông sáng lập ký danh sách.',
      can_cu: [mau, CC.mau10, CC.dieu24, CC.dieu21_23],
    },
    {
      tieu_de: 'Nộp hồ sơ',
      chi_tiet: `Nộp qua mạng tại Cổng thông tin quốc gia về đăng ký doanh nghiệp (${CONG_DKDN}) hoặc nộp tại Cơ quan đăng ký kinh doanh cấp tỉnh (Phòng Đăng ký kinh doanh) nơi đặt trụ sở chính.`,
      can_cu: [CC.noiNhanDn],
    },
    {
      tieu_de: 'Chờ kết quả, nộp lệ phí và phí công bố',
      chi_tiet: 'Thời hạn thường được nêu là 03 ngày làm việc kể từ khi nhận hồ sơ hợp lệ. Nội dung đăng ký được công bố trên Cổng thông tin quốc gia về đăng ký doanh nghiệp.',
      can_cu: [CC.thoiHan, CC.lePhi, CC.congBo],
    },
    {
      tieu_de: 'Sau khi có Giấy chứng nhận',
      chi_tiet: 'Góp đủ vốn trong thời hạn 90 ngày kể từ ngày được cấp Giấy chứng nhận đăng ký doanh nghiệp; mở tài khoản ngân hàng, đăng ký chữ ký số và hoá đơn điện tử với cơ quan thuế.',
      can_cu: [CC.gopVon90],
    },
  ];
}
