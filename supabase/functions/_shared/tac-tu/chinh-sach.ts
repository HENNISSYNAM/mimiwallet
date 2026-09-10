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
}

export interface NguoiNhan {
  nganHangBin: string;
  soTaiKhoan: string;
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
}

export type MaLyDo =
  | 'TAC_TU_TAM_DUNG'
  | 'TAC_TU_DA_THU_HOI'
  | 'CHINH_SACH_HET_HAN'
  | 'SO_TIEN_KHONG_HOP_LE'
  | 'NGAN_HANG_KHONG_RO'
  | 'SO_TAI_KHOAN_KHONG_HOP_LE'
  | 'THIEU_MUC_DICH'
  | 'MUC_DICH_LOI_MA_HOA'
  | 'NHOM_CHI_KHONG_RO'
  | 'NHOM_CHI_KHONG_DUOC_PHEP'
  | 'VUOT_HAN_MUC_MOI_LAN'
  | 'VUOT_HAN_MUC_NGAY'
  | 'VUOT_HAN_MUC_THANG'
  | 'NGUOI_NHAN_CHUA_DUYET'
  | 'NGUOI_NHAN_MOI'
  | 'TREN_NGUONG_DUYET'
  | 'TRONG_CHINH_SACH';

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

  const daBiet = bc.nguoiNhanDaDuyet.some(
    (n) => n.nganHangBin === yc.nganHangBin && n.soTaiKhoan === yc.soTaiKhoan,
  );
  if (!daBiet) {
    if (cs.chiTraNguoiNhanDaDuyet) {
      chan.push({
        ma: 'NGUOI_NHAN_CHUA_DUYET',
        cau: 'Người nhận chưa có trong danh sách được phép. Chủ doanh nghiệp thêm vào thì agent mới chi được.',
      });
    } else {
      hoi.push({ ma: 'NGUOI_NHAN_MOI', cau: 'Lần đầu chi cho người nhận này — cần người xác nhận đúng tài khoản.' });
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
