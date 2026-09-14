/**
 * Bộ luật quyết một khoản chi do agent xin: tự duyệt, chờ người duyệt, hay từ chối.
 *
 * VÌ SAO LÀ HÀM THUẦN. Đây là chỗ MIMI quyết tiền của một doanh nghiệp có được
 * đi hay không. Nó phải chạy giống hệt nhau mỗi lần, test được không cần
 * database, và mỗi quyết định phải nói được vì sao — bằng mã cho máy đọc (để
 * agent tự sửa yêu cầu) và bằng câu cho người đọc (để chủ doanh nghiệp duyệt).
 * Không có mô hình ngôn ngữ nào ở đây. Agent có thể là AI; luật chặn nó thì không.
 *
 * MIMI KHÔNG GIỮ TIỀN, KHÔNG CHUYỂN TIỀN. "Tự duyệt" nghĩa là không cần ai bấm
 * duyệt, rồi MIMI dựng lệnh trả (VietQR có mã tham chiếu) để người có quyền trả
 * bằng ứng dụng ngân hàng. Giữ hay chuyển tiền hộ khách cần giấy phép trung gian
 * thanh toán (Nghị định 52/2024/NĐ-CP) mà MIMI không có.
 *
 * GOM ĐỦ MỌI LÝ DO, KHÔNG DỪNG Ở LÝ DO ĐẦU. Agent sửa một lỗi, gửi lại, gặp lỗi
 * thứ hai, lại gửi — mỗi vòng là một lần gọi và một dòng nhật ký. Nói hết một lần.
 *
 * TỪ CHỐI THẮNG CHỜ DUYỆT. Hạn mức là trần chủ doanh nghiệp tự đặt. Một khoản
 * vượt trần không được đẩy sang người duyệt như thể duyệt tay là cách lách trần.
 */

export const NHOM_CHI = [
  'ha_tang_ai',
  'phan_mem',
  'quang_cao',
  'nha_cung_cap',
  'van_chuyen',
  'khac',
] as const;
export type NhomChi = (typeof NHOM_CHI)[number];

export const TEN_NHOM_CHI: Record<NhomChi, string> = {
  ha_tang_ai: 'Hạ tầng AI, API, máy chủ',
  phan_mem: 'Phần mềm, thuê bao',
  quang_cao: 'Quảng cáo',
  nha_cung_cap: 'Nhà cung cấp hàng hoá',
  van_chuyen: 'Vận chuyển',
  khac: 'Khác',
};

/**
 * Trạng thái của các yêu cầu KHÁC được tính vào phần hạn mức đã dùng.
 *
 * Tính cả `dang_xet` và `cho_duyet`, không chỉ khoản đã duyệt. Nếu chỉ đếm khoản
 * đã duyệt, agent gửi hai mươi yêu cầu cùng lúc thì cả hai mươi đều thấy hạn mức
 * còn nguyên. Mỗi yêu cầu được GHI trước rồi mới đọc tổng, nên trong hai yêu cầu
 * đồng thời, cái đọc sau luôn thấy cái kia — có thể từ chối nhầm cả hai, không
 * bao giờ duyệt lọt quá trần.
 */
export const TRANG_THAI_GIU_HAN_MUC = ['dang_xet', 'cho_duyet', 'da_duyet', 'da_chi'] as const;

export type TrangThaiTacTu = 'hoat_dong' | 'tam_dung' | 'thu_hoi';

export interface ChinhSach {
  /** Trần một khoản, đồng. */
  hanMucMoiLan: number;
  /** Trần tổng trong một ngày theo giờ Việt Nam, đồng. */
  hanMucNgay: number;
  /** Trần tổng trong một tháng theo giờ Việt Nam, đồng. */
  hanMucThang: number;
  /** Khoản TRÊN mức này phải có người duyệt. 0 = mọi khoản đều phải duyệt. */
  nguongCanDuyet: number;
  /** `null` = mọi nhóm. */
  nhomChiDuocPhep: string[] | null;
  /** `true`: người nhận lạ bị từ chối. `false`: người nhận lạ phải có người duyệt. */
  chiTraNguoiNhanDaDuyet: boolean;
  /** ISO. `null` = không hết hạn. */
  hetHan: string | null;
  /**
   * Trần số yêu cầu một agent được gửi trong 60 phút. `null` = không giới hạn.
   * Không bắt buộc để dòng chính sách cũ và test cũ vẫn hợp lệ.
   */
  soYeuCauMoiGio?: number | null;
}

export interface NguoiNhan {
  nganHangBin: string;
  soTaiKhoan: string;
  /** ISO — lúc được thêm vào danh sách. Dùng cho luật giữ 24 giờ. */
  themLuc?: string | null;
}

/** Một tài khoản MIMI đã biết gắn với một tên: trong danh sách, hoặc từng được duyệt trả. */
export interface TaiKhoanDaBiet {
  nganHangBin: string;
  soTaiKhoan: string;
  ten: string | null;
}

/** Người nhận vừa thêm vào danh sách chưa được tự duyệt trong khoảng này. */
export const GIU_NGUOI_NHAN_MOI_MS = 24 * 3_600_000;

/**
 * Chuẩn hoá tên để so: bỏ dấu, đổi đ → D, viết hoa, gom ký tự lạ thành một dấu cách.
 * "Công ty TNHH ABC" và "CONG TY TNHH  ABC." thành cùng một chuỗi.
 */
export function chuanHoaTen(ten: string | null | undefined): string {
  if (!ten) return '';
  return ten
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

/**
 * Các tài khoản KHÁC từng gắn với cùng tên người nhận.
 *
 * Kiểu lừa đảo chuyển khoản phổ biến: giả làm nhà cung cấp quen, báo "đã đổi số
 * tài khoản". Tên giữ nguyên, số tài khoản đổi. Tên quá ngắn (dưới 4 ký tự sau
 * chuẩn hoá) không so, vì dễ trùng nhầm.
 */
export function timTaiKhoanKhacCungTen(
  ten: string | null | undefined,
  yc: Pick<YeuCau, 'nganHangBin' | 'soTaiKhoan'>,
  daBiet: TaiKhoanDaBiet[],
): TaiKhoanDaBiet[] {
  const t = chuanHoaTen(ten);
  if (t.length < 4) return [];
  const thay = new Set<string>();
  return daBiet.filter((d) => {
    if (chuanHoaTen(d.ten) !== t) return false;
    if (d.nganHangBin === yc.nganHangBin && d.soTaiKhoan === yc.soTaiKhoan) return false;
    const khoa = `${d.nganHangBin}:${d.soTaiKhoan}`;
    if (thay.has(khoa)) return false;
    thay.add(khoa);
    return true;
  });
}

export interface YeuCau {
  soTien: number;
  nganHangBin: string;
  soTaiKhoan: string;
  nhomChi: string;
  mucDich: string;
}

export interface BoiCanh {
  trangThaiTacTu: TrangThaiTacTu;
  /** Tổng các yêu cầu khác đang giữ hạn mức trong ngày (giờ VN). */
  daGiuNgay: number;
  /** Tổng các yêu cầu khác đang giữ hạn mức trong tháng (giờ VN). */
  daGiuThang: number;
  nguoiNhanDaDuyet: NguoiNhan[];
  /** Mã BIN có trong danh sách ngân hàng MIMI biết. Bên gọi tra, hàm này không tra. */
  nganHangHopLe: boolean;
  luc: Date;
  /** Số yêu cầu KHÁC của agent này trong 60 phút qua. */
  soYeuCauGioQua?: number;
  /** Tên người nhận của yêu cầu này — tên trong danh sách đã duyệt thắng tên agent khai. */
  tenNguoiNhan?: string | null;
  /** Tài khoản đã biết của công ty (danh sách + lần đã duyệt/đã chi), để phát hiện đổi số tài khoản. */
  taiKhoanDaBiet?: TaiKhoanDaBiet[];
}

/**
 * Mọi mã lý do bộ luật có thể trả. Là mảng chạy được (không chỉ kiểu) để bộ case
 * vàng kiểm độ phủ: mã nào không có case nào chạm tới thì test đỏ.
 */
export const MA_LY_DO = [
  'TAC_TU_TAM_DUNG',
  'TAC_TU_DA_THU_HOI',
  'CHINH_SACH_HET_HAN',
  'SO_TIEN_KHONG_HOP_LE',
  'NGAN_HANG_KHONG_RO',
  'SO_TAI_KHOAN_KHONG_HOP_LE',
  'THIEU_MUC_DICH',
  'MUC_DICH_LOI_MA_HOA',
  'NHOM_CHI_KHONG_RO',
  'NHOM_CHI_KHONG_DUOC_PHEP',
  'VUOT_HAN_MUC_MOI_LAN',
  'VUOT_HAN_MUC_NGAY',
  'VUOT_HAN_MUC_THANG',
  'VUOT_TAN_SUAT',
  'NGUOI_NHAN_CHUA_DUYET',
  'NGUOI_NHAN_MOI',
  'NGUOI_NHAN_MOI_THEM',
  'DOI_SO_TAI_KHOAN',
  'TREN_NGUONG_DUYET',
  'TRONG_CHINH_SACH',
] as const;
export type MaLyDo = (typeof MA_LY_DO)[number];

export interface LyDo {
  ma: MaLyDo;
  cau: string;
}

export type KetQuaXet = 'tu_choi' | 'cho_duyet' | 'tu_dong_duyet';

export interface QuyetDinh {
  ketQua: KetQuaXet;
  lyDo: LyDo[];
}

const dong = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}đ`;

export function xetYeuCau(yc: YeuCau, cs: ChinhSach, bc: BoiCanh): QuyetDinh {
  const chan: LyDo[] = [];
  const hoi: LyDo[] = [];

  if (bc.trangThaiTacTu === 'tam_dung') {
    chan.push({ ma: 'TAC_TU_TAM_DUNG', cau: 'Agent đang bị tạm dừng. Chủ doanh nghiệp bật lại thì mới xin chi được.' });
  }
  if (bc.trangThaiTacTu === 'thu_hoi') {
    chan.push({ ma: 'TAC_TU_DA_THU_HOI', cau: 'Khoá của agent này đã bị thu hồi.' });
  }
  if (cs.hetHan && new Date(cs.hetHan).getTime() <= bc.luc.getTime()) {
    chan.push({ ma: 'CHINH_SACH_HET_HAN', cau: 'Chính sách chi của agent này đã hết hạn. Chủ doanh nghiệp cần gia hạn.' });
  }

  const soTienHopLe = Number.isInteger(yc.soTien) && yc.soTien > 0;
  if (!soTienHopLe) {
    chan.push({ ma: 'SO_TIEN_KHONG_HOP_LE', cau: 'Số tiền phải là số nguyên đồng, lớn hơn 0.' });
  }
  if (!bc.nganHangHopLe) {
    chan.push({ ma: 'NGAN_HANG_KHONG_RO', cau: 'Không nhận ra ngân hàng người nhận. Gửi mã BIN 6 số, ví dụ 970422.' });
  }
  if (!/^\d{6,19}$/.test(yc.soTaiKhoan)) {
    chan.push({ ma: 'SO_TAI_KHOAN_KHONG_HOP_LE', cau: 'Số tài khoản chỉ gồm chữ số, dài 6 đến 19 số.' });
  }
  if (yc.mucDich.trim().length < 5) {
    chan.push({
      ma: 'THIEU_MUC_DICH',
      cau: 'Phải nói rõ mục đích chi, ít nhất 5 ký tự. Đây là dòng sẽ nằm trong sổ và trên chứng từ.',
    });
  } else if (yc.mucDich.includes('�')) {
    /*
     * Ký tự thay thế U+FFFD là dấu vết chữ đã hỏng trên đường đi: agent gửi
     * tiếng Việt bằng bảng mã không phải UTF-8 (thường gặp khi gọi từ dòng lệnh
     * Windows). Tìm ra ngày 10/09/2026 khi "Thử vòng kiểm soát" về tới sổ thành
     * "Th? v�ng ki?m so�t". Mục đích là dòng nằm trên chứng từ — không nhận nó
     * ở dạng không ai đọc được.
     */
    chan.push({
      ma: 'MUC_DICH_LOI_MA_HOA',
      cau: 'Mục đích có ký tự lỗi mã hoá. Gửi lại bằng UTF-8, hoặc viết tiếng Việt dạng \\uXXXX trong JSON.',
    });
  }
  if (!(NHOM_CHI as readonly string[]).includes(yc.nhomChi)) {
    chan.push({ ma: 'NHOM_CHI_KHONG_RO', cau: `Nhóm chi phải là một trong: ${NHOM_CHI.join(', ')}.` });
  } else if (cs.nhomChiDuocPhep && !cs.nhomChiDuocPhep.includes(yc.nhomChi)) {
    chan.push({
      ma: 'NHOM_CHI_KHONG_DUOC_PHEP',
      cau: `Agent này không được chi cho nhóm "${TEN_NHOM_CHI[yc.nhomChi as NhomChi]}".`,
    });
  }

  /*
   * TRẦN TẦN SUẤT. Agent hỏng thường hỏng theo vòng lặp: gửi đi gửi lại hàng
   * trăm yêu cầu nhỏ, mỗi cái đều dưới trần tiền. Đếm theo số lần, không theo
   * số tiền, nên bắt được đúng kiểu hỏng mà hạn mức tiền bỏ lọt.
   */
  if (cs.soYeuCauMoiGio != null) {
    const daGui = bc.soYeuCauGioQua ?? 0;
    if (daGui + 1 > cs.soYeuCauMoiGio) {
      chan.push({
        ma: 'VUOT_TAN_SUAT',
        cau: `Agent đã gửi ${daGui} yêu cầu trong 60 phút qua; trần là ${cs.soYeuCauMoiGio} mỗi giờ. Nếu agent đang chạy vòng lặp, hãy dừng nó trước khi gửi tiếp.`,
      });
    }
  }

  if (soTienHopLe) {
    if (yc.soTien > cs.hanMucMoiLan) {
      chan.push({ ma: 'VUOT_HAN_MUC_MOI_LAN', cau: `Mỗi khoản tối đa ${dong(cs.hanMucMoiLan)}.` });
    }
    if (bc.daGiuNgay + yc.soTien > cs.hanMucNgay) {
      chan.push({
        ma: 'VUOT_HAN_MUC_NGAY',
        cau: `Hôm nay còn ${dong(Math.max(0, cs.hanMucNgay - bc.daGiuNgay))} trong hạn mức ngày ${dong(cs.hanMucNgay)}.`,
      });
    }
    if (bc.daGiuThang + yc.soTien > cs.hanMucThang) {
      chan.push({
        ma: 'VUOT_HAN_MUC_THANG',
        cau: `Tháng này còn ${dong(Math.max(0, cs.hanMucThang - bc.daGiuThang))} trong hạn mức tháng ${dong(cs.hanMucThang)}.`,
      });
    }
  }

  const nhan = bc.nguoiNhanDaDuyet.find(
    (n) => n.nganHangBin === yc.nganHangBin && n.soTaiKhoan === yc.soTaiKhoan,
  );
  const vuaThem = Boolean(
    nhan?.themLuc && bc.luc.getTime() - new Date(nhan.themLuc).getTime() < GIU_NGUOI_NHAN_MOI_MS,
  );
  if (!nhan) {
    if (cs.chiTraNguoiNhanDaDuyet) {
      chan.push({
        ma: 'NGUOI_NHAN_CHUA_DUYET',
        cau: 'Người nhận chưa có trong danh sách được phép. Chủ doanh nghiệp thêm vào thì agent mới chi được.',
      });
    } else {
      hoi.push({ ma: 'NGUOI_NHAN_MOI', cau: 'Lần đầu chi cho người nhận này — cần người xác nhận đúng tài khoản.' });
    }
  } else if (vuaThem) {
    /*
     * GIỮ 24 GIỜ. Hai phần ba vụ lừa đảo diễn ra trong 24 giờ kể từ lần liên
     * lạc đầu (GASA 2025): kẻ gian thắng bằng sự vội. Người nhận vừa được thêm
     * vẫn chi được, nhưng chưa được TỰ duyệt cho tới khi qua một ngày.
     */
    hoi.push({
      ma: 'NGUOI_NHAN_MOI_THEM',
      cau: 'Người nhận này được thêm vào danh sách chưa đủ 24 giờ — trong thời gian đó mọi khoản phải có người duyệt.',
    });
  }

  /*
   * ĐỔI SỐ TÀI KHOẢN. Chỉ bỏ qua khi tài khoản này đã nằm trong danh sách được
   * phép từ hơn 24 giờ — tức chủ doanh nghiệp đã tự kiểm và đã qua thời gian giữ.
   */
  if (!nhan || vuaThem) {
    const khac = timTaiKhoanKhacCungTen(bc.tenNguoiNhan, yc, bc.taiKhoanDaBiet ?? []);
    if (khac.length) {
      const cu = khac[0];
      hoi.push({
        ma: 'DOI_SO_TAI_KHOAN',
        cau: `"${bc.tenNguoiNhan}" từng nhận tiền ở tài khoản ••••${cu.soTaiKhoan.slice(-4)} (mã ngân hàng ${cu.nganHangBin}). Lần này là tài khoản khác — gọi xác nhận qua số điện thoại đã lưu từ trước rồi mới duyệt.`,
      });
    }
  }

  if (soTienHopLe && yc.soTien > cs.nguongCanDuyet) {
    hoi.push({
      ma: 'TREN_NGUONG_DUYET',
      cau:
        cs.nguongCanDuyet === 0
          ? 'Chính sách yêu cầu người duyệt mọi khoản chi.'
          : `Khoản trên ${dong(cs.nguongCanDuyet)} phải có người duyệt.`,
    });
  }

  if (chan.length) return { ketQua: 'tu_choi', lyDo: chan };
  if (hoi.length) return { ketQua: 'cho_duyet', lyDo: hoi };
  return {
    ketQua: 'tu_dong_duyet',
    lyDo: [{ ma: 'TRONG_CHINH_SACH', cau: 'Trong hạn mức, đúng nhóm chi, người nhận đã được phép, dưới ngưỡng cần duyệt.' }],
  };
}

/** Hạn mức còn lại, để agent hỏi trước thay vì thử rồi bị từ chối. */
export function hanMucConLai(cs: ChinhSach, daGiuNgay: number, daGiuThang: number) {
  const ngay = Math.max(0, cs.hanMucNgay - daGiuNgay);
  const thang = Math.max(0, cs.hanMucThang - daGiuThang);
  return { moiLan: Math.min(cs.hanMucMoiLan, ngay, thang), ngay, thang };
}

/*
 * Ngày và tháng tính theo giờ Việt Nam (UTC+7, không đổi giờ mùa hè).
 *
 * Tính theo UTC thì "hôm nay" của một doanh nghiệp ở Hà Nội bắt đầu lúc 7 giờ
 * sáng — mọi khoản chi từ nửa đêm tới 7 giờ bị cộng vào hạn mức của hôm qua.
 */
const LECH_VN_MS = 7 * 3_600_000;
const NGAY_MS = 86_400_000;

export function dauNgayVN(luc: Date): Date {
  const t = luc.getTime() + LECH_VN_MS;
  return new Date(Math.floor(t / NGAY_MS) * NGAY_MS - LECH_VN_MS);
}

export function dauThangVN(luc: Date): Date {
  const vn = new Date(luc.getTime() + LECH_VN_MS);
  return new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), 1) - LECH_VN_MS);
}
