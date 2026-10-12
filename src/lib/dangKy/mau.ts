/**
 * Điền mẫu đăng ký kinh doanh — hàm thuần: bảng hỏi → danh sách khối văn bản để in.
 *
 * CHÉP ĐÚNG MẪU GỐC. Thứ tự mục, nhãn chỉ tiêu, ô đánh dấu và chú thích chép từ bản ký số:
 *   - Mẫu số 2, 3, 4, 10: Thông tư 121/2026/TT-BTC (thay mẫu cùng số của Thông tư 68/2025/TT-BTC từ 21/8/2026);
 *   - Mẫu số 6, 7 Phụ lục I và Mẫu số 1 Phụ lục II: Thông tư 68/2025/TT-BTC (chưa bị thay).
 * Vì sao không dùng bộ hồ sơ CTCP chủ dự án đã nộp (12/2025) làm khuôn: bộ đó theo Mẫu số 4 cũ —
 * mục 8 còn bảng cổ đông, mục 13 còn ô "Có/Không" chủ sở hữu hưởng lợi; Mẫu số 10 cũ thiếu các cột
 * trực tiếp/gián tiếp, nhóm, kiểm soát, người quản lý. Nộp mẫu cũ sau 21/8/2026 là bị trả.
 *
 * Phần MIMI chưa hỗ trợ (thành lập do chia/tách/hợp nhất/chuyển đổi, thành viên/cổ đông là tổ
 * chức, nhà đầu tư nước ngoài) vẫn in đủ nhãn với dòng chấm để trống — mẫu là của Nhà nước, MIMI
 * không được bỏ bớt chỉ tiêu.
 */

import {
  diaChiMotDong, ngayViet, soBangChu, soCoDau, tyLe,
  type CaNhan, type DiaChi, type HoSoDangKy, type NguoiGopVon,
} from './hoSo';
import { CC, type CanCu } from './nguon';
import type { LoaiHinh, MaMau } from './loaiHinh';

// ───────────────────────── Mô hình khối ─────────────────────────

export interface O {
  chu: string;
  /** Ô gộp: số cột, số hàng. */
  cot?: number;
  hang?: number;
}

export type Khoi =
  | { k: 'so_mau'; chu: string }
  | { k: 'quoc_hieu' }
  | { k: 'ngay'; chu: string }
  | { k: 'tieu_de'; dong: string[] }
  | { k: 'can_giua'; chu: string; nghieng?: boolean }
  /** Tiêu đề mục in đậm; `nghieng` là phần trong ngoặc in nghiêng. */
  | { k: 'muc'; chu: string; nghieng?: string; cc?: number; sau?: string }
  /** "Nhãn (ghi chú nghiêng): giá trị". Giá trị rỗng → dòng chấm. */
  | { k: 'dong'; nhan: string; nghieng?: string; gia: string; cc?: number; thut?: boolean }
  | { k: 'doan'; chu: string; nghieng?: boolean; dam?: boolean; cc?: number }
  | { k: 'o'; muc: { nhan: string; chon: boolean; cc?: number }[]; ngang?: boolean }
  | { k: 'khung'; khoi: Khoi[] }
  | { k: 'bang'; dau: O[][]; so_cot?: string[]; dong: O[][]; nho?: boolean }
  | { k: 'ky'; chuc_danh: string[]; cc?: number; ngay?: string; ten: string }
  | { k: 'chu_thich'; dong: string[] };

export interface VanBanMau {
  ma: MaMau;
  ten: string;
  can_cu: CanCu;
  /** Danh sách nhiều cột in khổ ngang. */
  ngang: boolean;
  /** Mẫu chỉ là khung tham khảo (điều lệ), không phải biểu mẫu Nhà nước ban hành. */
  tham_khao?: boolean;
  khoi: Khoi[];
}

// ───────────────────────── Tiện ích chung ─────────────────────────

const inHoa = (s: string) => s.trim().toLocaleUpperCase('vi-VN');

const SO_MU = '⁰¹²³⁴⁵⁶⁷⁸⁹';
/** 12 → "¹²" — số chú thích viết ngay trong chuỗi (ô bảng chỉ chứa chữ thuần). */
export const sup = (n: number) => String(n).split('').map((c) => SO_MU[Number(c)]).join('');

/** "TP. Hồ Chí Minh, ngày 03 tháng 12 năm 2025" — thiếu phần nào để dòng chấm phần đó. */
export function dongNgay(diaDanh: string, iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  const [d, t, n] = m ? [m[3], m[2], m[1]] : ['……', '……', '……'];
  return `${diaDanh.trim() || '……'}, ngày ${d} tháng ${t} năm ${n}`;
}

const TEN_LOAI: Record<Exclude<LoaiHinh, 'hkd'>, string> = {
  tnhh1: 'công ty TNHH một thành viên',
  tnhh2: 'công ty TNHH hai thành viên trở lên',
  ctcp: 'công ty cổ phần',
};

function diaChiDong(d: DiaChi, thut = true, coQuocGia = true): Khoi[] {
  const ra: Khoi[] = [
    { k: 'dong', nhan: 'Số nhà/phòng, ngách/hẻm, ngõ/kiệt, đường/phố/đại lộ, tổ/xóm/ấp/thôn', gia: d.so_nha, thut },
    { k: 'dong', nhan: 'Xã/Phường/Đặc khu', gia: d.xa, thut },
    { k: 'dong', nhan: 'Tỉnh/Thành phố trực thuộc trung ương', gia: d.tinh, thut },
  ];
  if (coQuocGia) ra.push({ k: 'dong', nhan: 'Quốc gia', gia: d.quoc_gia, thut });
  return ra;
}

const DIA_CHI_TRONG: DiaChi = { so_nha: '', xa: '', tinh: '', quoc_gia: '' };

/**
 * Khung "Trường hợp không có số định danh cá nhân…". Đã có số định danh thì để trống khung
 * (đúng hướng dẫn của mẫu); chưa có thì in dân tộc, quốc tịch người dùng đã nhập.
 */
function khungKhongDinhDanh(c: CaNhan | null): Khoi[] {
  const coDinhDanh = !!c?.so_dinh_danh.trim();
  return [
    { k: 'doan', nghieng: true, chu: 'Trường hợp không có số định danh cá nhân hoặc việc kết nối giữa Cơ sở dữ liệu quốc gia về đăng ký doanh nghiệp với Cơ sở dữ liệu quốc gia về dân cư bị gián đoạn thì đề nghị kê khai các thông tin cá nhân dưới đây:' },
    {
      k: 'khung',
      khoi: [
        { k: 'dong', nhan: 'Dân tộc', gia: coDinhDanh || !c ? '' : c.dan_toc },
        { k: 'dong', nhan: 'Quốc tịch', gia: coDinhDanh || !c ? '' : c.quoc_tich },
        { k: 'dong', nhan: 'Số Hộ chiếu', nghieng: 'đối với cá nhân Việt Nam không có số định danh cá nhân)/Số Hộ chiếu nước ngoài hoặc giấy tờ có giá trị thay thế hộ chiếu nước ngoài (đối với cá nhân là người nước ngoài', gia: '' },
        { k: 'dong', nhan: 'Ngày cấp', gia: '' },
        { k: 'dong', nhan: 'Nơi cấp', gia: '' },
        { k: 'doan', chu: 'Nơi thường trú:' },
        ...diaChiDong(DIA_CHI_TRONG),
      ],
    },
  ];
}

/** Khối thông tin cá nhân lặp ở "Tôi là", "Người đại diện theo pháp luật", "Chủ sở hữu". */
function khoiCaNhan(c: CaNhan, opt: { nhanTen: string; nghiengTen?: string; ccTen?: number; chucDanh?: string; ghiDiaChi?: string }): Khoi[] {
  return [
    { k: 'dong', nhan: opt.nhanTen, nghieng: opt.nghiengTen, cc: opt.ccTen, gia: inHoa(c.ho_ten) },
    { k: 'dong', nhan: 'Ngày, tháng, năm sinh', gia: ngayViet(c.ngay_sinh) },
    { k: 'dong', nhan: 'Giới tính', gia: c.gioi_tinh },
    { k: 'dong', nhan: 'Số định danh cá nhân', gia: c.so_dinh_danh },
    ...(opt.chucDanh != null ? [{ k: 'dong', nhan: 'Chức danh', gia: opt.chucDanh } as Khoi] : []),
    { k: 'doan', chu: `Địa chỉ liên lạc${opt.ghiDiaChi ? ` (${opt.ghiDiaChi})` : ''}:` },
    ...diaChiDong(c.dia_chi),
    { k: 'dong', nhan: 'Điện thoại', nghieng: 'nếu có', gia: c.dien_thoai },
    { k: 'dong', nhan: 'Thư điện tử', nghieng: 'nếu có', gia: c.email },
    ...khungKhongDinhDanh(c),
  ];
}

function phanTinhTrang(loai: Exclude<LoaiHinh, 'hkd'>): Khoi[] {
  const giayTo = (doiTuong: string): Khoi[] => [
    { k: 'doan', chu: `Loại giấy tờ pháp lý của cá nhân (kê khai theo giấy tờ pháp lý của cá nhân được ghi trên Giấy chứng nhận đăng ký thuế của ${doiTuong}):`, nghieng: false },
    { k: 'o', ngang: true, muc: ['Chứng minh nhân dân', 'Căn cước công dân', 'Hộ chiếu', 'Loại khác (ghi rõ):…………'].map((nhan) => ({ nhan, chon: false })) },
    { k: 'dong', nhan: `Số giấy tờ pháp lý của cá nhân`, nghieng: `kê khai theo giấy tờ pháp lý của cá nhân được ghi trên Giấy chứng nhận đăng ký thuế của ${doiTuong}`, gia: '' },
    { k: 'doan', chu: 'Ngày cấp: …./…./….Nơi cấp: ………..Ngày hết hạn (nếu có): …/…/…' },
  ];
  return [
    { k: 'muc', chu: '1. Tình trạng thành lập', nghieng: 'đánh dấu X vào ô thích hợp' },
    {
      k: 'o',
      muc: [
        { nhan: 'Thành lập mới', chon: true },
        { nhan: 'Thành lập trên cơ sở tách doanh nghiệp', chon: false },
        { nhan: 'Thành lập trên cơ sở chia doanh nghiệp', chon: false },
        { nhan: 'Thành lập trên cơ sở hợp nhất doanh nghiệp', chon: false },
        { nhan: 'Thành lập trên cơ sở chuyển đổi loại hình doanh nghiệp', chon: false },
        { nhan: 'Thành lập trên cơ sở chuyển đổi từ hộ kinh doanh', chon: false },
        { nhan: 'Thành lập trên cơ sở chuyển đổi từ cơ sở bảo trợ xã hội/quỹ xã hội/quỹ từ thiện', chon: false, cc: 3 },
      ],
    },
    { k: 'dong', nhan: '- Lý do chuyển đổi loại hình doanh nghiệp', nghieng: 'Quyết định của …/Thành viên không góp vốn/Tiếp nhận thành viên/cổ đông mới/…', gia: '' },
    { k: 'doan', dam: true, chu: '- Thông tin về các doanh nghiệp bị chia, bị tách, bị hợp nhất, được chuyển đổi (phải kê khai trong trường hợp thành lập công ty trên cơ sở chia, tách, hợp nhất, chuyển đổi loại hình doanh nghiệp):' },
    { k: 'dong', nhan: 'Tên doanh nghiệp', nghieng: 'ghi bằng chữ in hoa', gia: '' },
    { k: 'dong', nhan: 'Mã số doanh nghiệp/Mã số thuế', gia: '' },
    { k: 'doan', chu: 'Đề nghị Quý Cơ quan thực hiện chấm dứt tồn tại đối với doanh nghiệp bị chia, bị hợp nhất và các chi nhánh/văn phòng đại diện/địa điểm kinh doanh của doanh nghiệp bị chia, bị hợp nhất.' },
    { k: 'doan', dam: true, chu: `- Thông tin về hộ kinh doanh được chuyển đổi (phải kê khai trong trường hợp thành lập ${loai === 'tnhh1' ? 'doanh nghiệp' : 'công ty'} trên cơ sở chuyển đổi từ hộ kinh doanh):` },
    { k: 'dong', nhan: 'Tên hộ kinh doanh (ghi bằng chữ in hoa)', gia: '' },
    { k: 'dong', nhan: 'Mã số hộ kinh doanh/Mã số đăng ký hộ kinh doanh/Mã số thuế', gia: '' },
    { k: 'doan', nghieng: true, chu: 'Trường hợp không khai thác được thông tin về hộ kinh doanh được chuyển đổi từ Cơ sở dữ liệu về đăng ký hộ kinh doanh hoặc thông tin khai thác được về hộ kinh doanh được chuyển đổi từ Cơ sở dữ liệu về đăng ký hộ kinh doanh không đầy đủ, không chính xác thì kê khai thêm các nội dung sau:' },
    {
      k: 'khung',
      khoi: [
        { k: 'dong', nhan: 'Địa chỉ trụ sở hộ kinh doanh', gia: '' },
        { k: 'dong', nhan: 'Tên chủ hộ kinh doanh', gia: '' },
        ...giayTo('hộ kinh doanh'),
      ],
    },
    { k: 'doan', dam: true, chu: '- Thông tin về cơ sở bảo trợ xã hội/quỹ xã hội/quỹ từ thiện được chuyển đổi (phải kê khai trong trường hợp thành lập doanh nghiệp xã hội trên cơ sở chuyển đổi từ cơ sở bảo trợ xã hội/quỹ xã hội/quỹ từ thiện):' },
    { k: 'dong', nhan: 'Tên cơ sở bảo trợ xã hội/quỹ xã hội/quỹ từ thiện', nghieng: 'ghi bằng chữ in hoa', gia: '' },
    { k: 'dong', nhan: 'Số Giấy chứng nhận đăng ký thành lập (Đối với cơ sở bảo trợ xã hội)/Số Giấy phép thành lập và công nhận điều lệ quỹ (Đối với quỹ xã hội/quỹ từ thiện)', gia: '' },
    { k: 'doan', chu: 'Ngày cấp: … /… /…… Nơi cấp: ……………………' },
    { k: 'dong', nhan: 'Mã số thuế của cơ sở bảo trợ xã hội/quỹ xã hội/quỹ từ thiện', nghieng: 'chỉ kê khai mã số thuế 10 số', gia: '' },
    { k: 'dong', nhan: 'Địa chỉ trụ sở chính', gia: '' },
    { k: 'dong', nhan: 'Tên người đại diện cơ sở bảo trợ xã hội/quỹ xã hội/quỹ từ thiện', gia: '' },
    ...giayTo('cơ sở bảo trợ xã hội/quỹ xã hội/quỹ từ thiện'),
    { k: 'o', muc: [{ nhan: '- Doanh nghiệp thực hiện dự án đầu tư được đăng ký đầu tư theo thủ tục đầu tư đặc biệt', chon: false }] },
    { k: 'o', muc: [{ nhan: 'Doanh nghiệp xã hội (Đánh dấu X vào ô vuông nếu là doanh nghiệp xã hội và kèm theo hồ sơ phải có Cam kết thực hiện mục tiêu xã hội, môi trường)', chon: false }] },
    { k: 'o', muc: [{ nhan: 'Công ty chứng khoán/Công ty quản lý quỹ đầu tư chứng khoán/Công ty đầu tư chứng khoán: (Đánh dấu X nếu là Công ty chứng khoán/Công ty quản lý quỹ đầu tư chứng khoán/Công ty đầu tư chứng khoán và kê khai thêm các thông tin sau đây)', chon: false }] },
    { k: 'doan', chu: 'Giấy phép thành lập và hoạt động số: … do Uỷ ban Chứng khoán Nhà nước cấp ngày: …./…./….. (nếu có)' },
  ];
}

function phanTenTruSoNganh(hs: HoSoDangKy): Khoi[] {
  const nganh = hs.nganh.filter((n) => n.ma.trim() || n.ten.trim());
  return [
    { k: 'muc', chu: '2. Tên công ty:' },
    { k: 'dong', nhan: 'Tên công ty viết bằng tiếng Việt', nghieng: 'ghi bằng chữ in hoa', gia: inHoa(hs.ten_vi) },
    { k: 'dong', nhan: 'Tên công ty viết bằng tiếng nước ngoài', nghieng: 'nếu có', gia: hs.ten_nuoc_ngoai.trim() },
    { k: 'dong', nhan: 'Tên công ty viết tắt', nghieng: 'nếu có', gia: hs.ten_viet_tat.trim() },
    { k: 'muc', chu: '3. Địa chỉ trụ sở chính:' },
    ...diaChiDong(hs.tru_so, false, false),
    { k: 'dong', nhan: 'Điện thoại', gia: hs.tru_so.dien_thoai },
    { k: 'dong', nhan: 'Số fax', nghieng: 'nếu có', gia: hs.tru_so.fax },
    { k: 'dong', nhan: 'Thư điện tử', nghieng: 'nếu có', gia: hs.tru_so.email },
    { k: 'dong', nhan: 'Website', nghieng: 'nếu có', gia: hs.tru_so.website },
    { k: 'doan', chu: '- Doanh nghiệp nằm trong (Doanh nghiệp phải đánh dấu X vào ô vuông tương ứng với khu công nghệ cao nếu nộp hồ sơ tới Ban quản lý khu công nghệ cao):' },
    { k: 'o', muc: ['Khu công nghiệp', 'Khu chế xuất', 'Khu kinh tế', 'Khu công nghệ cao'].map((nhan) => ({ nhan, chon: false })) },
    { k: 'doan', chu: '- Doanh nghiệp có Giấy chứng nhận quyền sử dụng đất tại đảo và xã, phường biên giới; xã, phường ven biển; khu vực khác có ảnh hưởng đến quốc phòng, an ninh⁴:' },
    // Chú thích 4: chỉ kê khai khi có nhà đầu tư nước ngoài — MIMI không đánh dấu thay người dùng.
    { k: 'o', ngang: true, muc: [{ nhan: 'Có', chon: false }, { nhan: 'Không', chon: false }] },
    { k: 'muc', chu: '4. Ngành, nghề kinh doanh', nghieng: 'ghi tên và mã theo ngành cấp 4 trong Hệ thống ngành kinh tế của Việt Nam' },
    {
      k: 'bang',
      dau: [[{ chu: 'STT' }, { chu: 'Tên ngành' }, { chu: 'Mã ngành' }, { chu: 'Ngành, nghề kinh doanh chính (đánh dấu X để chọn một trong các ngành, nghề đã kê khai)' }]],
      dong: (nganh.length ? nganh : [{ ma: '', ten: '' }]).map((n, i) => [
        { chu: nganh.length ? String(i + 1) : '' }, { chu: n.ten.trim() }, { chu: n.ma.trim() },
        { chu: nganh.length && hs.nganh[hs.nganh_chinh] === n ? 'X' : '' },
      ]),
    },
  ];
}

function phanVon(hs: HoSoDangKy, so: number): Khoi[] {
  return [
    { k: 'muc', chu: `${so}. Vốn điều lệ:` },
    { k: 'dong', nhan: 'Vốn điều lệ', nghieng: 'bằng số; VNĐ', gia: soCoDau(hs.von) },
    { k: 'dong', nhan: 'Vốn điều lệ', nghieng: 'bằng chữ; VNĐ', gia: hs.von > 0 ? soBangChu(hs.von) : '' },
    { k: 'dong', nhan: 'Giá trị tương đương theo đơn vị tiền nước ngoài', nghieng: 'nếu có, bằng số, loại ngoại tệ', gia: '' },
    { k: 'doan', chu: 'Có hiển thị thông tin về giá trị tương đương theo đơn vị tiền tệ nước ngoài trên Giấy chứng nhận đăng ký doanh nghiệp hay không?' },
    // Không kê khai ngoại tệ thì không có gì để hiển thị — đánh "Không", như bộ hồ sơ đã nộp thành công.
    { k: 'o', ngang: true, muc: [{ nhan: 'Có', chon: false }, { nhan: 'Không', chon: true }] },
  ];
}

function phanNguonVon(hs: HoSoDangKy, so: number): Khoi[] {
  const tien = soCoDau(hs.von);
  return [
    { k: 'muc', chu: `${so}. Nguồn vốn điều lệ:` },
    {
      k: 'bang',
      dau: [[{ chu: 'Loại nguồn vốn' }, { chu: 'Số tiền (bằng số; VNĐ và giá trị tương đương theo đơn vị tiền nước ngoài, nếu có)' }, { chu: 'Tỷ lệ (%)' }]],
      // MIMI chỉ soạn cho thành viên/cổ đông là cá nhân Việt Nam góp vốn riêng → toàn bộ là vốn tư nhân.
      dong: [
        [{ chu: 'Vốn ngân sách nhà nước' }, { chu: '' }, { chu: '' }],
        [{ chu: 'Vốn tư nhân' }, { chu: tien }, { chu: tien ? '100' : '' }],
        [{ chu: 'Vốn nước ngoài' }, { chu: '' }, { chu: '' }],
        [{ chu: 'Vốn khác' }, { chu: '' }, { chu: '' }],
        [{ chu: 'Tổng cộng' }, { chu: tien }, { chu: tien ? '100' : '' }],
      ],
    },
  ];
}

function phanGcnDauTu(doiTuong: string): Khoi[] {
  return [
    { k: 'doan', chu: `- Thông tin về Giấy chứng nhận đăng ký đầu tư (chỉ kê khai nếu ${doiTuong} là nhà đầu tư nước ngoài được cấp Giấy chứng nhận đăng ký đầu tư theo quy định của pháp luật – nếu có):` },
    { k: 'dong', nhan: 'Mã số dự án', gia: '' },
    { k: 'doan', chu: 'Ngày cấp: ……../……/……. Cơ quan cấp: ……………………' },
  ];
}

function phanDaiDien(hs: HoSoDangKy, so: number, cc: number): Khoi[] {
  return [
    { k: 'muc', chu: `${so}. Người đại diện theo pháp luật`, cc, sau: ':' },
    ...khoiCaNhan(hs.dai_dien, { nhanTen: 'Họ, chữ đệm và tên', nghiengTen: 'ghi bằng chữ in hoa', chucDanh: hs.chuc_danh }),
  ];
}

function phanThue(hs: HoSoDangKy, so: number, cc: { ngay: number; nien: number; gtgt: number }): Khoi[] {
  const gd = hs.giam_doc_la_dai_dien ? hs.dai_dien : null;
  const kt = hs.ke_toan;
  const s = (n: number) => `${so}.${n}`;
  const o = (chon: boolean) => (chon ? '☒' : '☐');
  const dongBang = (ma: string, noiDung: string): O[] => [{ chu: ma }, { chu: noiDung }];
  const ten = (v: string) => v.trim() || '……………………';
  return [
    { k: 'muc', chu: `${so}. Thông tin đăng ký thuế:` },
    {
      k: 'bang',
      dau: [[{ chu: 'STT' }, { chu: 'Các chỉ tiêu thông tin đăng ký thuế' }]],
      dong: [
        dongBang(s(1), [
          'Thông tin về Giám đốc/Tổng giám đốc (nếu có):',
          `Họ, chữ đệm và tên Giám đốc/Tổng giám đốc: ${ten(gd?.ho_ten ?? '')}`,
          `Ngày, tháng, năm sinh: ${ten(gd ? ngayViet(gd.ngay_sinh) : '')}`,
          `Giới tính: ${ten(gd?.gioi_tinh ?? '')}`,
          `Số định danh cá nhân: ${ten(gd?.so_dinh_danh ?? '')}`,
          `Điện thoại: ${ten(gd?.dien_thoai ?? '')}`,
        ].join('\n')),
        dongBang(s(2), [
          'Thông tin về Kế toán trưởng/Phụ trách kế toán (nếu có):',
          `Họ, chữ đệm và tên Kế toán trưởng/Phụ trách kế toán: ${ten(kt.ho_ten)}`,
          `Ngày, tháng, năm sinh: ${ten(ngayViet(kt.ngay_sinh))}`,
          `Giới tính: ${ten(kt.gioi_tinh)}`,
          `Số định danh cá nhân: ${ten(kt.so_dinh_danh)}`,
          `Điện thoại: ${ten(kt.dien_thoai)}`,
        ].join('\n')),
        dongBang(s(3), [
          'Địa chỉ nhận thông báo thuế (chỉ kê khai nếu địa chỉ nhận thông báo thuế khác địa chỉ trụ sở chính):',
          'Số nhà/phòng, ngách/hẻm, ngõ/kiệt, đường/phố/đại lộ, tổ/xóm/ấp/thôn: ……………………',
          'Xã/Phường/Đặc khu: ……………………',
          'Tỉnh/Thành phố trực thuộc trung ương: ……………………',
          'Điện thoại (nếu có): …………… Số fax (nếu có): ……………',
          'Thư điện tử (nếu có): ……………………',
        ].join('\n')),
        dongBang(s(4), `Ngày bắt đầu hoạt động${sup(cc.ngay)} (trường hợp doanh nghiệp dự kiến bắt đầu hoạt động kể từ ngày được cấp Giấy chứng nhận đăng ký doanh nghiệp thì không cần kê khai nội dung này): ${hs.ngay_bat_dau ? ngayViet(hs.ngay_bat_dau) : '…../…../…….'}`),
        dongBang(s(5), `Hình thức hạch toán (Đánh dấu X vào một trong hai ô "Hạch toán độc lập" hoặc "Hạch toán phụ thuộc". Trường hợp chọn ô "Hạch toán độc lập" mà thuộc đối tượng phải lập và gửi báo cáo tài chính hợp nhất cho cơ quan có thẩm quyền theo quy định thì chọn thêm ô "Có báo cáo tài chính hợp nhất"):\nHạch toán độc lập [X]    Có báo cáo tài chính hợp nhất [ ]\nHạch toán phụ thuộc [ ]`),
        dongBang(s(6), `Năm tài chính:\nÁp dụng từ ngày ${hs.nam_tai_chinh_tu || '…../…..'} đến ngày ${hs.nam_tai_chinh_den || '…../…..'}${sup(cc.nien)}\n(ghi ngày, tháng bắt đầu và kết thúc niên độ kế toán)`),
        dongBang(s(7), `Tổng số lao động (dự kiến): ${ten(hs.so_lao_dong)}`),
        dongBang(s(8), 'Hoạt động theo dự án BOT/BTO/BT/BOO, BLT, BTL, O&M:\nCó ☐    Không ☒'),
        dongBang(s(9), `Phương pháp tính thuế GTGT (chọn 1 trong 4 phương pháp)${sup(cc.gtgt)}:\nKhấu trừ ${o(hs.gtgt === 'khau_tru')}\nTrực tiếp trên GTGT ${o(hs.gtgt === 'truc_tiep_gtgt')}\nTrực tiếp trên doanh số ${o(hs.gtgt === 'truc_tiep_doanh_so')}\nKhông phải nộp thuế GTGT ${o(hs.gtgt === 'khong_nop')}`),
      ],
    },
  ];
}

function phanBhxh(hs: HoSoDangKy, so: number, cc: number): Khoi[] {
  return [
    { k: 'muc', chu: `${so}. Thông tin về việc đóng bảo hiểm xã hội`, cc, sau: ':' },
    { k: 'doan', chu: 'Phương thức đóng bảo hiểm xã hội (chọn 1 trong 3 phương thức):' },
    { k: 'o', ngang: true, muc: [
      { nhan: 'Hàng tháng', chon: hs.bhxh === 'hang_thang' },
      { nhan: '03 tháng một lần', chon: hs.bhxh === 'ba_thang' },
      { nhan: '06 tháng một lần', chon: hs.bhxh === 'sau_thang' },
    ] },
    { k: 'doan', dam: true, nghieng: true, chu: 'Lưu ý:' },
    { k: 'doan', chu: '- Doanh nghiệp đăng ký ngành, nghề kinh doanh chính là nông nghiệp, lâm nghiệp, ngư nghiệp, diêm nghiệp và trả lương theo sản phẩm, theo khoán: có thể lựa chọn 1 trong 3 phương thức đóng bảo hiểm xã hội: hàng tháng, 03 tháng một lần, 06 tháng một lần.' },
    { k: 'doan', chu: '- Doanh nghiệp đăng ký ngành, nghề kinh doanh chính khác: đánh dấu vào phương thức đóng bảo hiểm xã hội hàng tháng.' },
  ];
}

function phanCshhlVaCamKet(so: number): Khoi[] {
  return [
    { k: 'muc', chu: `${so}. Thông tin về chủ sở hữu hưởng lợi của doanh nghiệp:` },
    { k: 'doan', chu: 'Doanh nghiệp kê khai thông tin về chủ sở hữu hưởng lợi của doanh nghiệp theo Mẫu số 10 ban hành kèm theo Thông tư này.' },
    { k: 'doan', chu: 'Trường hợp hồ sơ đăng ký doanh nghiệp hợp lệ, đề nghị Quý Cơ quan đăng công bố nội dung đăng ký doanh nghiệp trên Cổng thông tin quốc gia về đăng ký doanh nghiệp.' },
    // Câu "Xin gửi kèm cam kết của nhà đầu tư nước ngoài…" chỉ ghi khi doanh nghiệp là tổ chức kinh tế
    // thực hiện dự án do nhà đầu tư nước ngoài thành lập (chú thích của chính mẫu) — MIMI không soạn ca đó.
    { k: 'doan', chu: 'Tôi cam kết:' },
    { k: 'doan', chu: '- Là người có đầy đủ quyền và nghĩa vụ thực hiện thủ tục đăng ký doanh nghiệp theo quy định của pháp luật và Điều lệ công ty;' },
    { k: 'doan', chu: '- Trụ sở chính thuộc quyền sử dụng hợp pháp của công ty và được sử dụng đúng mục đích theo quy định của pháp luật;' },
    { k: 'doan', chu: '- Chịu trách nhiệm trước pháp luật về tính hợp pháp, chính xác và trung thực của nội dung đăng ký doanh nghiệp trên.' },
  ];
}

const CT_TOA_AN = 'Trường hợp Tòa án hoặc Trọng tài chỉ định người thực hiện thủ tục đăng ký doanh nghiệp thì người được chỉ định kê khai thông tin vào phần này.';
const ctBaoTro = (tenLoai: string) => `Trường hợp đăng ký thành lập ${tenLoai} trên cơ sở chuyển đổi từ cơ sở bảo trợ xã hội/quỹ xã hội/quỹ từ thiện qua mạng thông tin điện tử thì người nộp hồ sơ scan Giấy chứng nhận đăng ký thành lập (đối với cơ sở bảo trợ xã hội)/Giấy phép thành lập và công nhận điều lệ quỹ (đối với quỹ xã hội/quỹ từ thiện) trong hồ sơ đăng ký doanh nghiệp qua mạng thông tin điện tử và nộp bản chính Giấy này tới Cơ quan đăng ký kinh doanh cấp tỉnh để được cấp Giấy chứng nhận đăng ký doanh nghiệp theo quy định tại khoản 7 Điều 28 Nghị định số 168/2025/NĐ-CP ngày 30/6/2025 của Chính phủ về đăng ký doanh nghiệp.`;
const CT_NDTNN = 'Kê khai trong trường hợp có nhà đầu tư nước ngoài góp vốn, mua cổ phần, phần vốn góp vào doanh nghiệp dẫn đến thay đổi nội dung đăng ký doanh nghiệp.';
const CT_NHIEU_DAI_DIEN = 'Ghi thông tin của tất cả người đại diện theo pháp luật trong trường hợp công ty có nhiều hơn 01 người đại diện theo pháp luật.';
const CT_NGAY_BAT_DAU = 'Trường hợp doanh nghiệp được cấp Giấy chứng nhận đăng ký doanh nghiệp sau ngày bắt đầu hoạt động đã kê khai thì ngày bắt đầu hoạt động là ngày doanh nghiệp được cấp Giấy chứng nhận đăng ký doanh nghiệp.';
const ctNienDo = (du12Thang: boolean) => [
  '- Trường hợp niên độ kế toán theo năm dương lịch thì ghi từ ngày 01/01 đến ngày 31/12.',
  '- Trường hợp niên độ kế toán theo năm tài chính khác năm dương lịch thì ghi ngày, tháng bắt đầu niên độ kế toán là ngày đầu tiên của quý; ngày, tháng kết thúc niên độ kế toán là ngày cuối cùng của quý.',
  ...(du12Thang ? ['- Tổng thời gian từ ngày bắt đầu đến ngày kết thúc niên độ kế toán phải đủ 12 tháng hoặc 4 quý liên tiếp.'] : []),
].join(' ');
const CT_GTGT = 'Chỉ kê khai trong trường hợp thành lập mới. Doanh nghiệp căn cứ vào quy định của pháp luật về thuế giá trị gia tăng và dự kiến hoạt động kinh doanh của doanh nghiệp để xác định 01 trong 04 phương pháp tính thuế giá trị gia tăng tại chỉ tiêu này, trừ trường hợp doanh nghiệp mua bán, chế tác vàng, bạc, đá quý có thể chọn thêm phương pháp trực tiếp trên GTGT ngoài các phương pháp khác (nếu có).';
const CT_BHXH = 'Không kê khai trong trường hợp thành lập doanh nghiệp trên cơ sở chuyển đổi loại hình doanh nghiệp.';
const CT_CAM_KET_NDTNN = 'Doanh nghiệp chỉ ghi nội dung này và gửi phụ lục kèm theo trong trường hợp doanh nghiệp là tổ chức kinh tế thực hiện dự án do nhà đầu tư nước ngoài thành lập trước khi thực hiện thủ tục cấp, điều chỉnh Giấy chứng nhận đăng ký đầu tư theo quy định của pháp luật về đầu tư.';

const ky = (hs: HoSoDangKy, chucDanh: string[], cc: number, coNgay = false): Khoi => ({
  k: 'ky', chuc_danh: chucDanh, cc, ten: hs.dai_dien.ho_ten.trim(), ngay: coNgay ? dongNgay(hs.dia_danh, hs.ngay_ky) : undefined,
});

function dauGiay(hs: HoSoDangKy, soMau: string, dong2: string, cauDangKy: string): Khoi[] {
  return [
    { k: 'so_mau', chu: soMau },
    { k: 'quoc_hieu' },
    { k: 'ngay', chu: dongNgay(hs.dia_danh, hs.ngay_ky) },
    { k: 'tieu_de', dong: ['GIẤY ĐỀ NGHỊ ĐĂNG KÝ DOANH NGHIỆP', dong2] },
    { k: 'can_giua', chu: `Kính gửi: ${hs.co_quan.trim() || '(Cơ quan đăng ký kinh doanh cấp tỉnh) ……………………'}` },
    ...khoiCaNhan(hs.dai_dien, {
      nhanTen: 'Tôi là', nghiengTen: 'ghi họ tên bằng chữ in hoa', ccTen: 1,
      ghiDiaChi: 'chỉ kê khai nếu người đăng ký doanh nghiệp là người đại diện theo pháp luật',
    }),
    { k: 'can_giua', chu: cauDangKy },
  ];
}

// ───────────────────────── Mẫu số 4 — CTCP ─────────────────────────

export function mau4(hs: HoSoDangKy): VanBanMau {
  const soCp = hs.menh_gia > 0 ? Math.floor(hs.von / hs.menh_gia) : 0;
  const coCp = soCp > 0;
  const loaiCp = ['Cổ phần phổ thông', 'Cổ phần ưu đãi biểu quyết', 'Cổ phần ưu đãi cổ tức', 'Cổ phần ưu đãi hoàn lại'];
  return {
    ma: 'mau4', ten: 'Giấy đề nghị đăng ký doanh nghiệp — công ty cổ phần (Mẫu số 4)', can_cu: CC.mau4, ngang: false,
    khoi: [
      ...dauGiay(hs, 'Mẫu số 4', 'CÔNG TY CỔ PHẦN', 'Đăng ký công ty cổ phần do tôi là người đại diện theo pháp luật/Chủ tịch Hội đồng quản trị với các nội dung sau²:'),
      ...phanTinhTrang('ctcp'),
      ...phanTenTruSoNganh(hs),
      ...phanVon(hs, 5),
      ...phanNguonVon(hs, 6),
      { k: 'muc', chu: '7. Thông tin về cổ phần:' },
      { k: 'dong', nhan: 'Mệnh giá cổ phần', nghieng: 'VNĐ', gia: soCoDau(hs.menh_gia) },
      {
        k: 'bang',
        dau: [[{ chu: 'STT' }, { chu: 'Loại cổ phần' }, { chu: 'Số lượng' }, { chu: 'Giá trị (bằng số, VNĐ)' }, { chu: 'Tỉ lệ so với vốn điều lệ (%)' }]],
        dong: [
          ...[...loaiCp, 'Các cổ phần ưu đãi khác'].map((ten, i): O[] => [
            { chu: String(i + 1) }, { chu: ten },
            { chu: i === 0 && coCp ? soCoDau(soCp) : '' },
            { chu: i === 0 && coCp ? soCoDau(soCp * hs.menh_gia) : '' },
            { chu: i === 0 && coCp ? '100' : '' },
          ]),
          [{ chu: 'Tổng số', cot: 2 }, { chu: coCp ? soCoDau(soCp) : '' }, { chu: coCp ? soCoDau(soCp * hs.menh_gia) : '' }, { chu: coCp ? '100' : '' }],
        ],
      },
      { k: 'doan', chu: 'Thông tin về cổ phần được quyền chào bán:' },
      {
        k: 'bang',
        dau: [[{ chu: 'STT' }, { chu: 'Loại cổ phần được quyền chào bán' }, { chu: 'Số lượng' }]],
        dong: [
          ...[...loaiCp, 'Cổ phần ưu đãi khác'].map((ten, i): O[] => [{ chu: String(i + 1) }, { chu: ten }, { chu: '' }]),
          [{ chu: 'Tổng số', cot: 2 }, { chu: '' }],
        ],
      },
      { k: 'doan', chu: `8. Cổ đông sáng lập (kê khai theo Mẫu số 7 Phụ lục I ban hành kèm theo Thông tư này): Gửi kèm${hs.thanh_vien.length ? '.' : ' (nếu có).'}` },
      { k: 'doan', chu: '9. Cổ đông là nhà đầu tư nước ngoài (kê khai theo Mẫu số 8 Phụ lục I ban hành kèm theo Thông tư này): Gửi kèm (nếu có).' },
      ...phanGcnDauTu('cổ đông'),
      ...phanDaiDien(hs, 10, 5),
      ...phanThue(hs, 11, { ngay: 6, nien: 7, gtgt: 8 }),
      ...phanBhxh(hs, 12, 9),
      ...phanCshhlVaCamKet(13),
      ky(hs, ['NGƯỜI ĐẠI DIỆN THEO PHÁP LUẬT/', 'CHỦ TỊCH HỘI ĐỒNG QUẢN TRỊ CỦA CÔNG TY'], 11),
      {
        k: 'chu_thich',
        dong: [
          `1 ${CT_TOA_AN}`,
          '2 Trường hợp đăng ký chuyển đổi loại hình doanh nghiệp đồng thời đăng ký thay đổi người đại diện theo pháp luật thì Chủ tịch Hội đồng quản trị của công ty sau chuyển đổi kê khai thông tin vào phần này.',
          `3 ${ctBaoTro('công ty cổ phần')}`,
          `4 ${CT_NDTNN}`,
          `5 ${CT_NHIEU_DAI_DIEN}`,
          `6 ${CT_NGAY_BAT_DAU}`,
          `7 ${ctNienDo(false)}`,
          `8 ${CT_GTGT}`,
          `9 ${CT_BHXH}`,
          `10 ${CT_CAM_KET_NDTNN}`,
          '11 - Người đại diện theo pháp luật của doanh nghiệp ký trực tiếp vào phần này. - Trường hợp đăng ký chuyển đổi loại hình doanh nghiệp đồng thời đăng ký thay đổi người đại diện theo pháp luật thì Chủ tịch Hội đồng quản trị của công ty sau chuyển đổi ký trực tiếp vào phần này. - Trường hợp Tòa án hoặc Trọng tài chỉ định người thực hiện thủ tục đăng ký doanh nghiệp thì người được chỉ định ký trực tiếp vào phần này.',
        ],
      },
    ],
  };
}

// ───────────────────────── Mẫu số 2 — TNHH 1TV ─────────────────────────

export function mau2(hs: HoSoDangKy): VanBanMau {
  const chu = hs.dai_dien;
  const tien = soCoDau(hs.von);
  return {
    ma: 'mau2', ten: 'Giấy đề nghị đăng ký doanh nghiệp — công ty TNHH một thành viên (Mẫu số 2)', can_cu: CC.mau2, ngang: false,
    khoi: [
      ...dauGiay(hs, 'Mẫu số 2', 'CÔNG TY TRÁCH NHIỆM HỮU HẠN MỘT THÀNH VIÊN', 'Đăng ký công ty trách nhiệm hữu hạn một thành viên do tôi là người đại diện theo pháp luật/Chủ tịch công ty/Chủ tịch Hội đồng thành viên² với các nội dung sau:'),
      ...phanTinhTrang('tnhh1'),
      ...phanTenTruSoNganh(hs),
      { k: 'muc', chu: '5. Chủ sở hữu:' },
      { k: 'doan', dam: true, nghieng: true, chu: 'a) Đối với chủ sở hữu là cá nhân:' },
      { k: 'doan', chu: '- Thông tin về chủ sở hữu:' },
      // MIMI chỉ soạn ca chủ sở hữu cá nhân đồng thời là người đại diện theo pháp luật (ca phổ biến của doanh nghiệp nhỏ).
      ...khoiCaNhan(chu, { nhanTen: 'Họ, chữ đệm và tên chủ sở hữu', nghiengTen: 'ghi bằng chữ in hoa' }),
      ...phanGcnDauTu('chủ sở hữu'),
      { k: 'doan', dam: true, nghieng: true, chu: 'b) Đối với chủ sở hữu là tổ chức:' },
      { k: 'doan', chu: '- Thông tin về chủ sở hữu:' },
      { k: 'dong', nhan: 'Tên tổ chức', nghieng: 'ghi bằng chữ in hoa', gia: '' },
      { k: 'dong', nhan: 'Mã số doanh nghiệp/Số Quyết định thành lập', gia: '' },
      { k: 'doan', chu: 'Ngày cấp: ……../……/……. Nơi cấp: ……………………' },
      { k: 'doan', chu: 'Địa chỉ trụ sở chính:' },
      ...diaChiDong(DIA_CHI_TRONG),
      { k: 'dong', nhan: 'Điện thoại', nghieng: 'nếu có', gia: '' },
      { k: 'dong', nhan: 'Số fax', nghieng: 'nếu có', gia: '' },
      { k: 'dong', nhan: 'Thư điện tử', nghieng: 'nếu có', gia: '' },
      { k: 'dong', nhan: 'Website', nghieng: 'nếu có', gia: '' },
      { k: 'doan', chu: '- Thông tin về người đại diện theo pháp luật/người đại diện theo uỷ quyền của chủ sở hữu:' },
      {
        k: 'bang', nho: true,
        dau: [
          [{ chu: 'STT', hang: 2 }, { chu: 'Tên người đại diện theo pháp luật/người đại diện theo uỷ quyền', hang: 2 }, { chu: 'Ngày, tháng, năm sinh', hang: 2 }, { chu: 'Giới tính', hang: 2 }, { chu: 'Số, ngày cấp, cơ quan cấp Giấy tờ pháp lý của cá nhân⁵', hang: 2 }, { chu: 'Quốc tịch', hang: 2 }, { chu: 'Dân tộc', hang: 2 }, { chu: 'Địa chỉ liên lạc', hang: 2 }, { chu: 'Vốn được uỷ quyền⁶', cot: 3 }, { chu: 'Chữ ký của người đại diện theo pháp luật/người đại diện theo uỷ quyền⁸', hang: 2 }, { chu: 'Ghi chú (nếu có)', hang: 2 }],
          [{ chu: 'Tổng giá trị vốn được đại diện (bằng số; VNĐ và giá trị tương đương theo đơn vị tiền nước ngoài, nếu có)' }, { chu: 'Tỷ lệ⁷ (%)' }, { chu: 'Thời điểm đại diện phần vốn' }],
        ],
        so_cot: Array.from({ length: 13 }, (_, i) => String(i + 1)),
        dong: [Array.from({ length: 13 }, () => ({ chu: '' }))],
      },
      ...phanGcnDauTu('chủ sở hữu'),
      { k: 'doan', chu: '- Mô hình tổ chức công ty:' },
      { k: 'o', muc: [
        { nhan: 'Hội đồng thành viên, Giám đốc hoặc Tổng Giám đốc', chon: hs.mo_hinh_1tv === 'hdtv' },
        { nhan: 'Chủ tịch công ty, Giám đốc hoặc Tổng Giám đốc', chon: hs.mo_hinh_1tv === 'chu_tich' },
      ] },
      ...phanVon(hs, 6),
      ...phanNguonVon(hs, 7),
      { k: 'muc', chu: '8. Tài sản góp vốn:' },
      {
        k: 'bang',
        dau: [[{ chu: 'STT' }, { chu: 'Tài sản góp vốn' }, { chu: 'Giá trị vốn của từng tài sản trong vốn điều lệ (bằng số, VNĐ)' }, { chu: 'Tỷ lệ (%)' }]],
        dong: [
          [{ chu: '1' }, { chu: 'Đồng Việt Nam' }, { chu: tien }, { chu: tien ? '100' : '' }],
          [{ chu: '2' }, { chu: 'Ngoại tệ tự do chuyển đổi (ghi rõ loại ngoại tệ, số tiền được góp bằng mỗi loại ngoại tệ)' }, { chu: '' }, { chu: '' }],
          [{ chu: '3' }, { chu: 'Vàng' }, { chu: '' }, { chu: '' }],
          [{ chu: '4' }, { chu: 'Quyền sử dụng đất' }, { chu: '' }, { chu: '' }],
          [{ chu: '5' }, { chu: 'Quyền sở hữu trí tuệ' }, { chu: '' }, { chu: '' }],
          [{ chu: '6' }, { chu: 'Các tài sản khác (ghi rõ loại tài sản, số lượng và giá trị còn lại của mỗi loại tài sản, có thể lập thành danh mục riêng kèm theo hồ sơ đăng ký doanh nghiệp)' }, { chu: '' }, { chu: '' }],
          [{ chu: 'Tổng số', cot: 2 }, { chu: tien }, { chu: tien ? '100' : '' }],
        ],
      },
      ...phanDaiDien(hs, 9, 9),
      ...phanThue(hs, 10, { ngay: 10, nien: 11, gtgt: 12 }),
      ...phanBhxh(hs, 11, 13),
      ...phanCshhlVaCamKet(12),
      ky(hs, ['NGƯỜI ĐẠI DIỆN THEO PHÁP LUẬT/', 'CHỦ TỊCH CÔNG TY/CHỦ TỊCH HỘI ĐỒNG', 'THÀNH VIÊN CỦA CÔNG TY'], 15),
      {
        k: 'chu_thich',
        dong: [
          `1 ${CT_TOA_AN}`,
          '2 Trường hợp đăng ký chuyển đổi loại hình doanh nghiệp đồng thời đăng ký thay đổi người đại diện theo pháp luật thì Chủ tịch công ty/Chủ tịch Hội đồng thành viên của công ty sau chuyển đổi kê khai thông tin vào phần này.',
          `3 ${ctBaoTro('công ty TNHH một thành viên')}`,
          `4 ${CT_NDTNN}`,
          '5 Nếu cột số 5 kê khai Số định danh cá nhân thì không phải kê khai các cột số 6, 7.',
          '6 Không phải kê khai phần này đối với trường hợp kê khai người đại diện theo pháp luật.',
          '7 Tỷ lệ % của phần vốn góp được uỷ quyền đại diện trên tổng số vốn góp của thành viên đó tại doanh nghiệp.',
          '8 Người được kê khai thông tin ký trực tiếp vào phần này.',
          `9 ${CT_NHIEU_DAI_DIEN}`,
          `10 ${CT_NGAY_BAT_DAU}`,
          `11 ${ctNienDo(true)}`,
          `12 ${CT_GTGT}`,
          `13 ${CT_BHXH}`,
          `14 ${CT_CAM_KET_NDTNN}`,
          '15 - Người đại diện theo pháp luật của doanh nghiệp ký trực tiếp vào phần này. - Trường hợp đăng ký chuyển đổi loại hình doanh nghiệp đồng thời đăng ký thay đổi người đại diện theo pháp luật thì Chủ tịch công ty/Chủ tịch Hội đồng thành viên của công ty sau chuyển đổi ký trực tiếp vào phần này.',
        ],
      },
    ],
  };
}

// ───────────────────────── Mẫu số 3 — TNHH 2TV ─────────────────────────

export function mau3(hs: HoSoDangKy): VanBanMau {
  return {
    ma: 'mau3', ten: 'Giấy đề nghị đăng ký doanh nghiệp — công ty TNHH hai thành viên trở lên (Mẫu số 3)', can_cu: CC.mau3, ngang: false,
    khoi: [
      ...dauGiay(hs, 'Mẫu số 3', 'CÔNG TY TRÁCH NHIỆM HỮU HẠN HAI THÀNH VIÊN TRỞ LÊN', 'Đăng ký công ty trách nhiệm hữu hạn hai thành viên do tôi là người đại diện theo pháp luật/Chủ tịch Hội đồng thành viên² với nội dung sau:'),
      ...phanTinhTrang('tnhh2'),
      ...phanTenTruSoNganh(hs),
      ...phanVon(hs, 5),
      ...phanNguonVon(hs, 6),
      { k: 'doan', chu: '7. Thành viên công ty: (kê khai theo Mẫu số 6 Phụ lục I ban hành kèm theo Thông tư này) Gửi kèm.' },
      ...phanGcnDauTu('thành viên'),
      ...phanDaiDien(hs, 8, 5),
      ...phanThue(hs, 9, { ngay: 6, nien: 7, gtgt: 8 }),
      ...phanBhxh(hs, 10, 9),
      ...phanCshhlVaCamKet(11),
      ky(hs, ['NGƯỜI ĐẠI DIỆN THEO PHÁP LUẬT/', 'CHỦ TỊCH HỘI ĐỒNG THÀNH VIÊN CỦA CÔNG TY'], 11),
      {
        k: 'chu_thich',
        dong: [
          `1 ${CT_TOA_AN}`,
          '2 Trường hợp đăng ký chuyển đổi loại hình doanh nghiệp đồng thời đăng ký thay đổi người đại diện theo pháp luật thì Chủ tịch Hội đồng thành viên của công ty sau chuyển đổi kê khai thông tin vào phần này.',
          `3 ${ctBaoTro('công ty TNHH hai thành viên trở lên')}`,
          `4 ${CT_NDTNN}`,
          `5 ${CT_NHIEU_DAI_DIEN}`,
          `6 ${CT_NGAY_BAT_DAU}`,
          `7 ${ctNienDo(true)}`,
          `8 ${CT_GTGT}`,
          `9 ${CT_BHXH}`,
          `10 ${CT_CAM_KET_NDTNN}`,
          '11 - Người đại diện theo pháp luật của doanh nghiệp ký trực tiếp vào phần này. - Trường hợp đăng ký chuyển đổi loại hình doanh nghiệp đồng thời đăng ký thay đổi người đại diện theo pháp luật thì Chủ tịch Hội đồng thành viên của công ty sau chuyển đổi ký trực tiếp vào phần này.',
        ],
      },
    ],
  };
}

// ───────────────────────── Mẫu số 6, 7 — danh sách thành viên, cổ đông sáng lập ─────────────────────────

const giayToCot = (t: NguoiGopVon) => [t.so_dinh_danh.trim(), t.ngay_cap && `Cấp ngày ${ngayViet(t.ngay_cap)}`, t.noi_cap.trim()].filter(Boolean).join('\n');
/** Cột 6, 7 (quốc tịch, dân tộc): chú thích 1 — đã kê khai số định danh thì không phải kê khai. */
const quocTichDanToc = (t: NguoiGopVon): [string, string] => (t.so_dinh_danh.trim() ? ['', ''] : [t.quoc_tich, t.dan_toc]);

export function mau6(hs: HoSoDangKy): VanBanMau {
  const tong = hs.thanh_vien.reduce((s, t) => s + (t.von || 0), 0);
  const dong: O[][] = hs.thanh_vien.map((t, i) => {
    const [qt, dt] = quocTichDanToc(t);
    return [
      { chu: String(i + 1) }, { chu: t.ho_ten.trim() }, { chu: ngayViet(t.ngay_sinh) }, { chu: t.gioi_tinh }, { chu: giayToCot(t) },
      { chu: qt }, { chu: dt }, { chu: diaChiMotDong(t.dia_chi) },
      { chu: soCoDau(t.von) }, { chu: tyLe(t.von, tong) }, { chu: t.von > 0 ? `Đồng Việt Nam: ${soCoDau(t.von)}` : '' },
      { chu: hs.thoi_han_gop }, { chu: '' }, { chu: '' },
    ];
  });
  return {
    ma: 'mau6', ten: 'Danh sách thành viên công ty TNHH hai thành viên trở lên (Mẫu số 6)', can_cu: CC.mau6, ngang: true,
    khoi: [
      { k: 'so_mau', chu: 'Mẫu số 6' },
      { k: 'tieu_de', dong: ['DANH SÁCH THÀNH VIÊN CÔNG TY TRÁCH NHIỆM HỮU HẠN HAI THÀNH VIÊN TRỞ LÊN'] },
      { k: 'muc', chu: 'I. Thành viên là cá nhân' },
      {
        k: 'bang', nho: true,
        dau: [
          [{ chu: 'STT', hang: 2 }, { chu: 'Tên thành viên', hang: 2 }, { chu: 'Ngày, tháng, năm sinh đối với thành viên là cá nhân', hang: 2 }, { chu: 'Giới tính', hang: 2 }, { chu: 'Loại giấy tờ, số, ngày cấp, cơ quan cấp Giấy tờ pháp lý của cá nhân¹', hang: 2 }, { chu: 'Quốc tịch', hang: 2 }, { chu: 'Dân tộc', hang: 2 }, { chu: 'Địa chỉ liên lạc', hang: 2 }, { chu: 'Vốn góp', cot: 3 }, { chu: 'Thời hạn góp vốn⁴', hang: 2 }, { chu: 'Chữ ký của thành viên⁵', hang: 2 }, { chu: 'Ghi chú (nếu có)', hang: 2 }],
          [{ chu: 'Phần vốn góp² (bằng số; VNĐ và giá trị tương đương theo đơn vị tiền nước ngoài: bằng số, loại ngoại tệ, nếu có)' }, { chu: 'Tỷ lệ (%)' }, { chu: 'Loại tài sản, số lượng, giá trị tài sản góp vốn³' }],
        ],
        so_cot: Array.from({ length: 14 }, (_, i) => String(i + 1)),
        dong: dong.length ? dong : [Array.from({ length: 14 }, () => ({ chu: '' }))],
      },
      { k: 'muc', chu: 'II. Thành viên là tổ chức' },
      { k: 'muc', chu: '1. Thông tin thành viên' },
      {
        k: 'bang', nho: true,
        dau: [
          [{ chu: 'STT', hang: 2 }, { chu: 'Tên thành viên', hang: 2 }, { chu: 'Số, ngày cấp, nơi cấp Giấy chứng nhận đăng ký doanh nghiệp; Quyết định thành lập hoặc giấy tờ có giá trị pháp lý tương đương', hang: 2 }, { chu: 'Địa chỉ trụ sở chính', hang: 2 }, { chu: 'Vốn góp', cot: 3 }, { chu: 'Thời hạn góp vốn⁸', hang: 2 }, { chu: 'Ghi chú (nếu có)', hang: 2 }],
          [{ chu: 'Phần vốn góp⁶ (bằng số; VNĐ và giá trị tương đương theo đơn vị tiền nước ngoài: bằng số, loại ngoại tệ, nếu có)' }, { chu: 'Tỷ lệ (%)' }, { chu: 'Loại tài sản, số lượng, giá trị tài sản góp vốn⁷' }],
        ],
        so_cot: Array.from({ length: 9 }, (_, i) => String(i + 1)),
        dong: [Array.from({ length: 9 }, () => ({ chu: '' }))],
      },
      { k: 'muc', chu: '2. Thông tin người đại diện theo pháp luật/ủy quyền của thành viên' },
      bangDaiDienToChuc('Tên thành viên'),
      ky(hs, ['NGƯỜI ĐẠI DIỆN THEO PHÁP LUẬT/CHỦ TỊCH HỘI ĐỒNG THÀNH VIÊN CỦA CÔNG TY'], 13, true),
      {
        k: 'chu_thich',
        dong: [
          '1 Nếu cột số 5 kê khai Số định danh cá nhân thì không phải kê khai các cột số 6, 7.',
          '2 Ghi phần vốn góp của từng thành viên. Giá trị ghi bằng số theo đơn vị VNĐ và giá trị tương đương theo đơn vị tiền nước ngoài, ghi bằng số, loại ngoại tệ (nếu có).',
          '3 Loại tài sản góp vốn bao gồm: Đồng Việt Nam; Ngoại tệ tự do chuyển đổi (ghi rõ loại ngoại tệ, số tiền được góp bằng mỗi loại ngoại tệ); Vàng; Quyền sử dụng đất, quyền sở hữu trí tuệ, công nghệ, bí quyết kỹ thuật; Tài sản khác (ghi rõ loại tài sản, số lượng và giá trị còn lại của mỗi loại tài sản). Có thể lập thành danh mục riêng kèm theo hồ sơ đăng ký doanh nghiệp.',
          '4 - Trường hợp đăng ký thành lập doanh nghiệp, thời hạn góp vốn là thời hạn thành viên dự kiến hoàn thành việc góp vốn. - Trường hợp đăng ký tăng vốn điều lệ, thời hạn góp vốn là thời điểm thành viên hoàn thành việc góp vốn. - Các trường hợp khác ngoài các trường hợp nêu trên, thành viên không kê khai thời hạn góp vốn.',
          '5 - Trường hợp thay đổi nội dung đăng ký doanh nghiệp, thành viên có phần vốn góp không thay đổi không bắt buộc phải ký vào phần này. - Trường hợp đăng ký/thông báo thay đổi nội dung đăng ký doanh nghiệp theo quyết định của Tòa án hoặc Trọng tài thì không cần chữ ký tại phần này.',
          '6, 7, 8 Kê khai tương tự thành viên là cá nhân.',
          '9 Nếu cột số 6 kê khai Số định danh cá nhân thì không phải kê khai các cột số 7, 8.',
          '10 Không phải kê khai phần này đối với trường hợp kê khai người đại diện theo pháp luật.',
          '11 Tỷ lệ % của phần vốn góp được ủy quyền đại diện trên tổng số vốn góp của thành viên đó tại doanh nghiệp.',
          '12 Người được kê khai thông tin ký trực tiếp vào phần này.',
          '13 - Người đại diện theo pháp luật của doanh nghiệp ký trực tiếp vào phần này. - Trường hợp đăng ký chuyển đổi loại hình doanh nghiệp đồng thời đăng ký thay đổi người đại diện theo pháp luật thì Chủ tịch Hội đồng thành viên của công ty sau chuyển đổi ký trực tiếp vào phần này. - Trường hợp Tòa án hoặc Trọng tài chỉ định người thực hiện thủ tục đăng ký doanh nghiệp thì người được chỉ định ký trực tiếp vào phần này.',
        ],
      },
    ],
  };
}

function bangDaiDienToChuc(tenCot2: string): Khoi {
  return {
    k: 'bang', nho: true,
    dau: [
      [{ chu: 'STT', hang: 2 }, { chu: tenCot2, hang: 2 }, { chu: 'Tên người đại diện theo pháp luật/người đại diện theo uỷ quyền', hang: 2 }, { chu: 'Ngày, tháng, năm sinh', hang: 2 }, { chu: 'Giới tính', hang: 2 }, { chu: 'Số, ngày cấp, cơ quan cấp Giấy tờ pháp lý của cá nhân⁹', hang: 2 }, { chu: 'Quốc tịch', hang: 2 }, { chu: 'Dân tộc', hang: 2 }, { chu: 'Địa chỉ liên lạc', hang: 2 }, { chu: 'Vốn được uỷ quyền¹⁰', cot: 3 }, { chu: 'Chữ ký của người đại diện theo pháp luật/người đại diện theo uỷ quyền¹²', hang: 2 }, { chu: 'Ghi chú (nếu có)', hang: 2 }],
      [{ chu: 'Tổng giá trị vốn được đại diện (bằng số; VNĐ và giá trị tương đương theo đơn vị tiền nước ngoài, nếu có)' }, { chu: 'Tỷ lệ¹¹ (%)' }, { chu: 'Thời điểm đại diện phần vốn' }],
    ],
    so_cot: Array.from({ length: 14 }, (_, i) => String(i + 1)),
    dong: [Array.from({ length: 14 }, () => ({ chu: '' }))],
  };
}

const dauVonGopCp = (cc: [string, string]): O[][] => [
  [{ chu: 'Tổng số cổ phần', cot: 2 }, { chu: 'Tỷ lệ (%)', hang: 3 }, { chu: 'Loại cổ phần', cot: 4 }, { chu: `Loại tài sản, số lượng, giá trị tài sản góp vốn${cc[1]}`, hang: 3 }],
  [{ chu: 'Số lượng', hang: 2 }, { chu: 'Giá trị', hang: 2 }, { chu: 'Phổ thông', cot: 2 }, { chu: '……..', cot: 2 }],
  [{ chu: 'Số lượng' }, { chu: 'Giá trị' }, { chu: 'Số lượng' }, { chu: 'Giá trị' }],
];

export function mau7(hs: HoSoDangKy): VanBanMau {
  const tong = hs.thanh_vien.reduce((s, t) => s + (t.von || 0), 0);
  const mg = hs.menh_gia > 0 ? hs.menh_gia : 0;
  const dong: O[][] = hs.thanh_vien.map((t, i) => {
    const sl = mg ? Math.floor(t.von / mg) : 0;
    const [qt, dt] = quocTichDanToc(t);
    return [
      { chu: String(i + 1) }, { chu: t.ho_ten.trim() }, { chu: ngayViet(t.ngay_sinh) }, { chu: t.gioi_tinh }, { chu: giayToCot(t) },
      { chu: qt }, { chu: dt }, { chu: diaChiMotDong(t.dia_chi) },
      { chu: sl ? soCoDau(sl) : '' }, { chu: soCoDau(t.von) }, { chu: tyLe(t.von, tong) },
      { chu: sl ? soCoDau(sl) : '' }, { chu: soCoDau(t.von) }, { chu: '' }, { chu: '' },
      { chu: t.von > 0 ? `Đồng Việt Nam: ${soCoDau(t.von)}` : '' },
      { chu: hs.thoi_han_gop }, { chu: '' }, { chu: '' },
    ];
  });
  const [r1, r2, r3] = dauVonGopCp(['²', '³']);
  const [s1, s2, s3] = dauVonGopCp(['⁶', '⁷']);
  return {
    ma: 'mau7', ten: 'Danh sách cổ đông sáng lập công ty cổ phần (Mẫu số 7)', can_cu: CC.mau7, ngang: true,
    khoi: [
      { k: 'so_mau', chu: 'Mẫu số 7' },
      { k: 'tieu_de', dong: ['DANH SÁCH CỔ ĐÔNG SÁNG LẬP CÔNG TY CỔ PHẦN'] },
      { k: 'muc', chu: 'I. Cổ đông sáng lập là cá nhân' },
      {
        k: 'bang', nho: true,
        dau: [
          [{ chu: 'STT', hang: 4 }, { chu: 'Tên cổ đông sáng lập', hang: 4 }, { chu: 'Ngày, tháng, năm sinh', hang: 4 }, { chu: 'Giới tính', hang: 4 }, { chu: 'Loại giấy tờ, số, ngày cấp, cơ quan cấp Giấy tờ pháp lý của cá nhân¹', hang: 4 }, { chu: 'Quốc tịch', hang: 4 }, { chu: 'Dân tộc', hang: 4 }, { chu: 'Địa chỉ liên lạc', hang: 4 }, { chu: 'Vốn góp²', cot: 8 }, { chu: 'Thời hạn góp vốn⁴', hang: 4 }, { chu: 'Chữ ký của cổ đông sáng lập⁵', hang: 4 }, { chu: 'Ghi chú (nếu có)', hang: 4 }],
          r1, r2, r3,
        ],
        so_cot: Array.from({ length: 19 }, (_, i) => String(i + 1)),
        dong: dong.length ? dong : [Array.from({ length: 19 }, () => ({ chu: '' }))],
      },
      { k: 'muc', chu: 'II. Cổ đông sáng lập là tổ chức' },
      { k: 'muc', chu: '1. Thông tin cổ đông' },
      {
        k: 'bang', nho: true,
        dau: [
          [{ chu: 'STT', hang: 4 }, { chu: 'Tên cổ đông sáng lập', hang: 4 }, { chu: 'Địa chỉ trụ sở chính', hang: 4 }, { chu: 'Số, ngày cấp, nơi cấp Giấy chứng nhận đăng ký doanh nghiệp; Quyết định thành lập hoặc giấy tờ có giá trị pháp lý tương đương', hang: 4 }, { chu: 'Vốn góp⁶', cot: 8 }, { chu: 'Thời hạn góp vốn⁸', hang: 4 }, { chu: 'Ghi chú (nếu có)', hang: 4 }],
          s1, s2, s3,
        ],
        so_cot: Array.from({ length: 14 }, (_, i) => String(i + 1)),
        dong: [Array.from({ length: 14 }, () => ({ chu: '' }))],
      },
      { k: 'muc', chu: '2. Thông tin người đại diện theo pháp luật/ủy quyền của cổ đông' },
      bangDaiDienToChuc('Tên cổ đông sáng lập'),
      ky(hs, ['NGƯỜI ĐẠI DIỆN THEO PHÁP LUẬT/CHỦ TỊCH HỘI ĐỒNG QUẢN TRỊ CỦA CÔNG TY'], 13, true),
      {
        k: 'chu_thich',
        dong: [
          '1 Nếu cột số 5 kê khai Số định danh cá nhân thì không phải kê khai các cột số 6, 7.',
          '2 Ghi giá trị vốn cổ phần của từng cổ đông sáng lập. Tài sản hình thành giá trị vốn cổ phần của từng cổ đông sáng lập cần được liệt kê cụ thể: tên loại tài sản góp vốn cổ phần; số lượng từng loại tài sản góp vốn cổ phần; giá trị còn lại của từng loại tài sản góp vốn cổ phần; thời điểm góp vốn cổ phần của từng loại tài sản. Giá trị ghi bằng số theo đơn vị VNĐ và giá trị tương đương theo đơn vị tiền nước ngoài (ghi bằng số, loại ngoại tệ), nếu có.',
          '3 Loại tài sản góp vốn bao gồm: Đồng Việt Nam; Ngoại tệ tự do chuyển đổi (ghi rõ loại ngoại tệ, số tiền được góp bằng mỗi loại ngoại tệ); Vàng; Quyền sử dụng đất, quyền sở hữu trí tuệ, công nghệ, bí quyết kỹ thuật; Tài sản khác (ghi rõ loại tài sản, số lượng và giá trị còn lại của mỗi loại tài sản). Có thể lập thành danh mục riêng kèm theo hồ sơ đăng ký doanh nghiệp.',
          '4 Khi đăng ký thành lập doanh nghiệp, thời hạn góp vốn là thời hạn cổ đông sáng lập dự kiến hoàn thành việc góp vốn. Các trường hợp khác không kê khai thời hạn góp vốn.',
          '5 Trường hợp đăng ký/thông báo thay đổi nội dung đăng ký doanh nghiệp theo quyết định của Tòa án hoặc Trọng tài thì không cần chữ ký tại phần này.',
          '6, 7, 8 Kê khai tương tự các cổ đông sáng lập là cá nhân.',
          '9 Nếu cột số 6 kê khai Số định danh cá nhân thì không phải kê khai các cột số 7, 8.',
          '10 Không phải kê khai phần này đối với trường hợp kê khai người đại diện theo pháp luật.',
          '11 Tỷ lệ % của phần vốn góp được ủy quyền đại diện trên tổng số vốn góp của cổ đông đó tại doanh nghiệp.',
          '12 Người được kê khai thông tin ký trực tiếp vào phần này.',
          '13 - Người đại diện theo pháp luật của doanh nghiệp ký trực tiếp vào phần này. - Trường hợp đăng ký chuyển đổi loại hình doanh nghiệp đồng thời đăng ký thay đổi người đại diện theo pháp luật thì Chủ tịch Hội đồng quản trị của công ty sau chuyển đổi ký trực tiếp vào phần này. - Trường hợp Tòa án hoặc Trọng tài chỉ định người thực hiện thủ tục đăng ký doanh nghiệp thì người được chỉ định ký trực tiếp vào phần này.',
        ],
      },
    ],
  };
}

// ───────────────────────── Mẫu số 10 — chủ sở hữu hưởng lợi ─────────────────────────

const congTyLe = (a: string, b: string): string => {
  const so = (s: string) => Number(s.replace(',', '.'));
  if (!a.trim() && !b.trim()) return '';
  const t = (so(a) || 0) + (so(b) || 0);
  return String(Math.round(t * 100) / 100).replace('.', ',');
};

export function mau10(hs: HoSoDangKy): VanBanMau {
  const ds = hs.chu_so_huu_huong_loi;
  const dong: O[][] = ds.map((c, i) => [
    { chu: String(i + 1) }, { chu: c.ho_ten.trim() }, { chu: ngayViet(c.ngay_sinh) }, { chu: c.gioi_tinh }, { chu: c.so_giay_to },
    // Chú thích 1: đã kê khai số định danh ở cột 5 thì không kê khai cột 6, 7.
    { chu: c.so_giay_to.trim() ? '' : c.quoc_tich }, { chu: c.so_giay_to.trim() ? '' : c.dan_toc }, { chu: c.dia_chi },
    { chu: c.ty_le_von_truc_tiep }, { chu: c.ty_le_von_gian_tiep }, { chu: congTyLe(c.ty_le_von_truc_tiep, c.ty_le_von_gian_tiep) },
    { chu: c.ty_le_cp_truc_tiep }, { chu: c.ty_le_cp_gian_tiep }, { chu: congTyLe(c.ty_le_cp_truc_tiep, c.ty_le_cp_gian_tiep) },
    { chu: '' }, { chu: '' }, { chu: c.kiem_soat }, { chu: c.nguoi_quan_ly },
  ]);
  return {
    ma: 'mau10', ten: 'Danh sách chủ sở hữu hưởng lợi của doanh nghiệp (Mẫu số 10)', can_cu: CC.mau10, ngang: true,
    khoi: [
      { k: 'so_mau', chu: 'Mẫu số 10' },
      { k: 'tieu_de', dong: ['DANH SÁCH CHỦ SỞ HỮU HƯỞNG LỢI CỦA DOANH NGHIỆP'] },
      {
        k: 'bang', nho: true,
        dau: [
          [{ chu: 'STT', hang: 3 }, { chu: 'Họ và tên', hang: 3 }, { chu: 'Ngày, tháng, năm sinh', hang: 3 }, { chu: 'Giới tính', hang: 3 }, { chu: 'Số, ngày cấp, cơ quan cấp Giấy tờ pháp lý của cá nhân¹', hang: 3 }, { chu: 'Quốc tịch', hang: 3 }, { chu: 'Dân tộc', hang: 3 }, { chu: 'Địa chỉ liên lạc', hang: 3 }, { chu: 'Chủ sở hữu hưởng lợi của doanh nghiệp²', cot: 9 }, { chu: 'Người quản lý doanh nghiệp³', hang: 3 }],
          [{ chu: 'Tỷ lệ sở hữu vốn điều lệ⁴', cot: 3 }, { chu: 'Tỷ lệ sở hữu cổ phần có quyền biểu quyết⁵', cot: 3 }, { chu: 'Thành viên hợp danh⁶', hang: 2 }, { chu: 'Nhóm cá nhân có quan hệ gia đình/hợp đồng⁷', hang: 2 }, { chu: 'Kiểm soát doanh nghiệp⁸', hang: 2 }],
          [{ chu: 'Trực tiếp' }, { chu: 'Gián tiếp' }, { chu: 'Tổng' }, { chu: 'Trực tiếp' }, { chu: 'Gián tiếp' }, { chu: 'Tổng' }],
        ],
        so_cot: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11=9+10', '12', '13', '14=12+13', '15', '16', '17', '18'],
        dong: dong.length ? dong : [Array.from({ length: 18 }, () => ({ chu: '' }))],
      },
      ky(hs, ['NGƯỜI ĐẠI DIỆN THEO PHÁP LUẬT/ CHỦ TỊCH', 'CÔNG TY/CHỦ TỊCH HỘI ĐỒNG THÀNH VIÊN/', 'CHỦ TỊCH HỘI ĐỒNG QUẢN TRỊ CỦA CÔNG TY'], 9, true),
      {
        k: 'chu_thich',
        dong: [
          '1 Nếu cột số 5 kê khai Số định danh cá nhân thì không phải kê khai các cột số 6, 7.',
          '2 Chủ sở hữu hưởng lợi của doanh nghiệp được xác định theo quy định tại Điều 3 Nghị định số 296/2026/NĐ-CP.',
          '3 Trường hợp không có cá nhân đáp ứng tiêu chí tại khoản 1, khoản 2 Điều 17 Nghị định số 168/2025/NĐ-CP được sửa đổi, bổ sung tại Điều 3 Nghị định số 296/2026/NĐ-CP, doanh nghiệp xác định một cá nhân là người quản lý doanh nghiệp có quyền hạn lớn nhất để hành động thay mặt cho doanh nghiệp. Doanh nghiệp kê khai người quản lý doanh nghiệp thì doanh nghiệp ghi rõ chức danh quản lý tại doanh nghiệp tương ứng tại cột này.',
          '4 Cá nhân trực tiếp hoặc gián tiếp hoặc vừa trực tiếp và gián tiếp sở hữu từ 25% vốn điều lệ trở lên của doanh nghiệp. Nhóm cá nhân có mối quan hệ gia đình theo quy định tại khoản 22 Điều 4 Luật Doanh nghiệp hoặc hợp đồng cùng nhau sở hữu trực tiếp hoặc gián tiếp hoặc vừa trực tiếp và gián tiếp từ 25% trở lên vốn điều lệ của doanh nghiệp, nhóm cá nhân kê khai tỷ lệ sở hữu tại công ty. Cột này áp dụng đối với cá nhân/nhóm cá nhân kê khai tỷ lệ sở hữu vốn điều lệ tại công ty TNHH một thành viên, công ty TNHH 2 thành viên trở lên và công ty hợp danh.',
          '5 Tỷ lệ sở hữu cổ phần có quyền biểu quyết = Số cổ phần có quyền biểu quyết/tổng số cổ phần có quyền biểu quyết của công ty cổ phần. Cá nhân trực tiếp hoặc gián tiếp hoặc vừa trực tiếp và gián tiếp sở hữu từ 25% tổng số cổ phần có quyền biểu quyết trở lên của doanh nghiệp. Nhóm cá nhân có mối quan hệ gia đình theo quy định tại khoản 22 Điều 4 Luật Doanh nghiệp hoặc hợp đồng cùng nhau sở hữu trực tiếp hoặc gián tiếp hoặc vừa trực tiếp và gián tiếp từ 25% trở lên tổng số cổ phần có quyền biểu quyết của doanh nghiệp, nhóm cá nhân kê khai tỷ lệ sở hữu tại công ty. Cột này áp dụng đối với cá nhân/nhóm cá nhân kê khai tỷ lệ sở hữu cổ phần có quyền biểu quyết tại công ty cổ phần.',
          '6 Tích dấu X nếu chủ sở hữu hưởng lợi là thành viên hợp danh.',
          '7 Nhóm cá nhân có mối quan hệ gia đình theo quy định tại khoản 22 Điều 4 Luật Doanh nghiệp hoặc hợp đồng cùng nhau sở hữu trực tiếp hoặc gián tiếp hoặc vừa trực tiếp và gián tiếp từ 25% vốn điều lệ hoặc từ 25% trở lên tổng số cổ phần có quyền biểu quyết của doanh nghiệp. Doanh nghiệp ghi rõ mối quan hệ thuộc nhóm cá nhân có quan hệ gia đình hoặc nhóm cá nhân có quan hệ hợp đồng tại cột số 16 và kê khai tỷ lệ sở hữu tại công ty tại cột 9, 10, 11 hoặc 12, 13, 14.',
          '8 Cá nhân kiểm soát ghi một hoặc nhiều các quyền sau: Quyền bổ nhiệm, miễn nhiệm hoặc bãi nhiệm đa số hoặc tất cả thành viên hoặc chủ tịch hội đồng quản trị, đa số hoặc tất cả thành viên hoặc chủ tịch hội đồng thành viên, Giám đốc, Tổng giám đốc; sửa đổi, bổ sung điều lệ của doanh nghiệp; thay đổi cơ cấu tổ chức; quyết định chính sách tài chính, đầu tư và hoạt động của doanh nghiệp; tổ chức lại, giải thể doanh nghiệp.',
          '9 - Người đại diện theo pháp luật của doanh nghiệp/Chủ tịch công ty/Chủ tịch Hội đồng thành viên của công ty/Chủ tịch Hội đồng quản trị ký trực tiếp và ghi rõ họ tên theo quy định. - Trường hợp Tòa án hoặc Trọng tài chỉ định người thực hiện thủ tục đăng ký doanh nghiệp thì người được chỉ định ký trực tiếp vào phần này.',
        ],
      },
    ],
  };
}

// ───────────────────────── Mẫu số 1 Phụ lục II — hộ kinh doanh ─────────────────────────

export function mau1Hkd(hs: HoSoDangKy): VanBanMau {
  const c = hs.dai_dien;
  const nganh = hs.nganh.filter((n) => n.ma.trim() || n.ten.trim());
  const coDinhDanh = !!c.so_dinh_danh.trim();
  return {
    ma: 'mau1_hkd', ten: 'Giấy đề nghị đăng ký hộ kinh doanh (Mẫu số 1 Phụ lục II)', can_cu: CC.mauHkd, ngang: false,
    khoi: [
      { k: 'so_mau', chu: 'Mẫu số 1' },
      { k: 'quoc_hieu' },
      { k: 'ngay', chu: dongNgay(hs.dia_danh, hs.ngay_ky) },
      { k: 'tieu_de', dong: ['GIẤY ĐỀ NGHỊ ĐĂNG KÝ HỘ KINH DOANH'] },
      { k: 'can_giua', chu: `Kính gửi: ${hs.co_quan.trim() || '(Cơ quan đăng ký kinh doanh cấp xã) ……………………'}` },
      { k: 'dong', nhan: 'Tôi là', nghieng: 'ghi họ tên bằng chữ in hoa', gia: inHoa(c.ho_ten) },
      { k: 'dong', nhan: 'Sinh ngày', gia: ngayViet(c.ngay_sinh) },
      { k: 'dong', nhan: 'Giới tính', gia: c.gioi_tinh },
      { k: 'dong', nhan: 'Số định danh cá nhân', gia: c.so_dinh_danh },
      { k: 'dong', nhan: 'Điện thoại', nghieng: 'nếu có', gia: c.dien_thoai },
      { k: 'dong', nhan: 'Thư điện tử', nghieng: 'nếu có', gia: c.email },
      { k: 'doan', nghieng: true, chu: 'Trường hợp việc kết nối giữa Cơ sở dữ liệu về đăng ký hộ kinh doanh với Cơ sở dữ liệu quốc gia về dân cư bị gián đoạn thì đề nghị kê khai thêm các thông tin cá nhân dưới đây:' },
      {
        k: 'khung',
        // Khung này chỉ kê khai khi kết nối gián đoạn — để trống nếu đã có số định danh.
        khoi: [
          { k: 'dong', nhan: 'Dân tộc', gia: coDinhDanh ? '' : c.dan_toc },
          { k: 'dong', nhan: 'Quốc tịch', gia: coDinhDanh ? '' : c.quoc_tich },
          { k: 'doan', chu: 'Nơi thường trú:' },
          ...diaChiDong(coDinhDanh ? DIA_CHI_TRONG : c.dia_chi, true, false),
          { k: 'doan', chu: 'Nơi ở hiện tại:' },
          ...diaChiDong(coDinhDanh ? DIA_CHI_TRONG : hs.noi_o_hien_tai, true, false),
        ],
      },
      { k: 'can_giua', chu: 'Đăng ký hộ kinh doanh do tôi là chủ hộ với các nội dung sau:' },
      { k: 'muc', chu: '1. Tên hộ kinh doanh:' },
      { k: 'dong', nhan: 'Tên hộ kinh doanh viết bằng tiếng Việt', nghieng: 'ghi bằng chữ in hoa', gia: inHoa(hs.ten_vi) },
      { k: 'dong', nhan: 'Tên hộ kinh doanh viết bằng tiếng nước ngoài', nghieng: 'nếu có', gia: hs.ten_nuoc_ngoai.trim() },
      { k: 'dong', nhan: 'Tên hộ kinh doanh viết tắt', nghieng: 'nếu có', gia: hs.ten_viet_tat.trim() },
      { k: 'muc', chu: '2. Trụ sở của hộ kinh doanh:' },
      ...diaChiDong(hs.tru_so, false, false),
      { k: 'dong', nhan: 'Điện thoại', gia: hs.tru_so.dien_thoai },
      { k: 'dong', nhan: 'Fax', nghieng: 'nếu có', gia: hs.tru_so.fax },
      { k: 'dong', nhan: 'Thư điện tử', nghieng: 'nếu có', gia: hs.tru_so.email },
      { k: 'dong', nhan: 'Website', nghieng: 'nếu có', gia: hs.tru_so.website },
      { k: 'o', muc: [{ nhan: 'Không kinh doanh tại trụ sở (đánh dấu X vào ô này nếu hộ kinh doanh không có địa điểm kinh doanh cố định)', chon: hs.hkd_khong_tai_tru_so }] },
      { k: 'muc', chu: '3. Ngành, nghề kinh doanh', cc: 1, sau: ':' },
      {
        k: 'bang',
        dau: [[{ chu: 'STT' }, { chu: 'Tên ngành' }, { chu: 'Mã ngành²' }, { chu: 'Ngành, nghề kinh doanh chính³' }]],
        dong: (nganh.length ? nganh : [{ ma: '', ten: '' }]).map((n, i) => [
          { chu: nganh.length ? String(i + 1) : '' }, { chu: n.ten.trim() }, { chu: n.ma.trim() },
          { chu: nganh.length && hs.nganh[hs.nganh_chinh] === n ? 'X' : '' },
        ]),
      },
      { k: 'muc', chu: '4. Vốn kinh doanh:' },
      { k: 'dong', nhan: 'Tổng số', nghieng: 'bằng số, bằng chữ, VNĐ', gia: hs.von > 0 ? `${soCoDau(hs.von)} (${soBangChu(hs.von)})` : '' },
      { k: 'muc', chu: '5. Thông tin đăng ký thuế:' },
      { k: 'doan', chu: '5.1. Địa chỉ nhận thông báo thuế (chỉ kê khai nếu địa chỉ nhận thông báo thuế khác địa chỉ trụ sở):' },
      ...diaChiDong(DIA_CHI_TRONG, true, false),
      { k: 'doan', chu: 'Điện thoại (nếu có): …………… Thư điện tử (nếu có): ……………' },
      { k: 'dong', nhan: '5.2. Ngày bắt đầu hoạt động⁴', nghieng: 'trường hợp hộ kinh doanh dự kiến bắt đầu hoạt động kể từ ngày được cấp Giấy chứng nhận đăng ký hộ kinh doanh thì không cần kê khai nội dung này', gia: hs.ngay_bat_dau ? ngayViet(hs.ngay_bat_dau) : '' },
      { k: 'dong', nhan: '5.3. Tổng số lao động', nghieng: 'dự kiến', gia: hs.so_lao_dong },
      { k: 'doan', chu: '5.4. Phương pháp tính thuế GTGT (chọn 1 trong 2 phương pháp):' },
      { k: 'o', ngang: true, muc: [{ nhan: 'Phương pháp kê khai', chon: hs.hkd_gtgt === 'ke_khai' }, { nhan: 'Phương pháp khoán', chon: hs.hkd_gtgt === 'khoan' }] },
      { k: 'muc', chu: '6. Chủ thể thành lập hộ kinh doanh:', nghieng: 'đánh dấu X vào ô thích hợp' },
      { k: 'o', ngang: true, muc: [{ nhan: 'Cá nhân', chon: hs.thanh_vien.length === 0 }, { nhan: 'Các thành viên hộ gia đình', chon: hs.thanh_vien.length > 0 }] },
      { k: 'muc', chu: '7. Thông tin về các thành viên hộ gia đình đăng ký hộ kinh doanh', cc: 5, sau: ':' },
      {
        k: 'bang', nho: true,
        dau: [[{ chu: 'STT' }, { chu: 'Họ tên' }, { chu: 'Ngày, tháng, năm sinh' }, { chu: 'Số định danh cá nhân' }, { chu: 'Giới tính' }, { chu: 'Quốc tịch' }, { chu: 'Dân tộc' }, { chu: 'Nơi thường trú' }, { chu: 'Nơi ở hiện tại' }, { chu: 'Chữ ký' }]],
        so_cot: Array.from({ length: 10 }, (_, i) => String(i + 1)),
        // Chú thích 5: chỉ kê khai khi các thành viên hộ gia đình cùng thành lập, kể cả chủ hộ; có số
        // định danh thì chỉ kê khai cột 1, 2, 3, 4, 5, 10.
        dong: hs.thanh_vien.length
          ? [c, ...hs.thanh_vien].map((t, i) => [
            { chu: String(i + 1) }, { chu: t.ho_ten.trim() }, { chu: ngayViet(t.ngay_sinh) }, { chu: t.so_dinh_danh }, { chu: t.gioi_tinh },
            { chu: '' }, { chu: '' }, { chu: '' }, { chu: '' }, { chu: '' },
          ])
          : [Array.from({ length: 10 }, () => ({ chu: '' }))],
      },
      { k: 'doan', chu: 'Tôi xin cam kết:' },
      { k: 'doan', chu: '- Bản thân (trường hợp hộ kinh doanh do một cá nhân đăng ký thành lập)/Bản thân và các thành viên hộ gia đình đăng ký hộ kinh doanh (trường hợp hộ kinh doanh do các thành viên hộ gia đình đăng ký thành lập) đồng ý chia sẻ thông tin cá nhân được lưu giữ tại Cơ sở dữ liệu quốc gia về dân cư cho Cơ quan đăng ký kinh doanh cấp xã, Cơ quan quản lý nhà nước về đăng ký kinh doanh để phục vụ công tác quản lý nhà nước về đăng ký hộ kinh doanh theo quy định;' },
      { k: 'doan', chu: '- Bản thân (trường hợp hộ kinh doanh do một cá nhân đăng ký thành lập)/Bản thân và các thành viên hộ gia đình đăng ký hộ kinh doanh (trường hợp hộ kinh doanh do các thành viên hộ gia đình đăng ký thành lập) không thuộc diện pháp luật cấm kinh doanh; không đồng thời là chủ hộ kinh doanh, thành viên hộ gia đình đăng ký hộ kinh doanh khác; không là chủ doanh nghiệp tư nhân;' },
      { k: 'doan', chu: '- Trụ sở thuộc quyền sử dụng hợp pháp của hộ kinh doanh và được sử dụng đúng mục đích theo quy định của pháp luật (hộ kinh doanh chỉ cam kết trong trường hợp kinh doanh tại trụ sở);' },
      { k: 'doan', chu: '- Hoàn toàn chịu trách nhiệm trước pháp luật về tính hợp pháp, chính xác và trung thực của nội dung đăng ký trên.' },
      { k: 'ky', chuc_danh: ['CHỦ HỘ KINH DOANH'], cc: 6, ten: c.ho_ten.trim() },
      {
        k: 'chu_thich',
        dong: [
          '1 - Hộ kinh doanh có quyền tự do kinh doanh trong những ngành, nghề mà luật không cấm; - Các ngành, nghề cấm đầu tư kinh doanh quy định tại Điều 6 Luật Đầu tư; - Đối với những ngành, nghề đầu tư kinh doanh có điều kiện được quy định tại các văn bản quy phạm pháp luật khác, ngành, nghề kinh doanh được ghi theo ngành, nghề quy định tại các văn bản quy phạm pháp luật đó. Hộ kinh doanh chỉ được kinh doanh khi có đủ điều kiện theo quy định.',
          '2 Ghi tên ngành và mã ngành cấp bốn trong Hệ thống ngành kinh tế Việt Nam đối với ngành, nghề kinh doanh chính. Đối với các ngành, nghề kinh doanh khác, hộ kinh doanh được ghi tự do và không cần ghi mã ngành cấp bốn.',
          '3 Đánh dấu X để chọn một trong các ngành, nghề đã kê khai làm ngành, nghề kinh doanh chính.',
          '4 Trường hợp hộ kinh doanh được cấp Giấy chứng nhận đăng ký hộ kinh doanh sau ngày bắt đầu hoạt động đã kê khai thì ngày bắt đầu hoạt động là ngày hộ kinh doanh được cấp Giấy chứng nhận đăng ký hộ kinh doanh.',
          '5 - Chỉ kê khai trong trường hợp chủ thể thành lập hộ kinh doanh là các thành viên hộ gia đình và kê khai cả thông tin của chủ hộ tại Bảng này; - Trường hợp chủ hộ kinh doanh và các thành viên hộ gia đình đăng ký hộ kinh doanh kê khai số định danh cá nhân thì chỉ kê khai các cột số 1, 2, 3, 4, 5, 10, không phải kê khai các cột số 6, 7, 8, 9 của Bảng này, trừ trường hợp việc kết nối giữa Cơ sở dữ liệu về đăng ký hộ kinh doanh với Cơ sở dữ liệu quốc gia về dân cư bị gián đoạn.',
          '6 Chủ hộ kinh doanh ký trực tiếp vào phần này.',
        ],
      },
    ],
  };
}

// ───────────────────────── Khung điều lệ ─────────────────────────

/**
 * Khung điều lệ TỐI THIỂU: mỗi điều ứng với một nội dung bắt buộc của Điều lệ theo Điều 24 Luật
 * Doanh nghiệp (thứ tự điểm a → n), cộng điều khoản thi hành. Phần MIMI điền được (tên, trụ sở,
 * ngành, vốn, thành viên/cổ đông, người đại diện) lấy từ bảng hỏi; phần còn lại là chỗ trống có
 * chú dẫn — đây là văn bản do người sáng lập tự quyết, MIMI không viết thay nội dung quản trị.
 *
 * Điều 24 chưa đối chiếu bản gốc trong lúc dựng trang (xem `CC.dieu24`) — giao diện ghi rõ.
 */
export function dieuLe(hs: HoSoDangKy): VanBanMau {
  const ten = inHoa(hs.ten_vi) || '……………………';
  const laCp = hs.loai === 'ctcp';
  const nganh = hs.nganh.filter((n) => n.ma.trim() || n.ten.trim());
  const tong = hs.thanh_vien.reduce((s, t) => s + (t.von || 0), 0);
  const nguoi = hs.loai === 'tnhh1' ? [{ ...hs.dai_dien, von: hs.von }] : hs.thanh_vien;
  const deTrong = (huongDan: string): Khoi => ({ k: 'doan', nghieng: true, chu: `[${huongDan}]` });
  const dieu = (so: number, tieuDe: string, diem: string): Khoi => ({ k: 'muc', chu: `Điều ${so}. ${tieuDe}`, sau: ` — Điều 24, điểm ${diem}` });
  const coQuan = hs.loai === 'ctcp' ? 'Đại hội đồng cổ đông' : hs.loai === 'tnhh2' ? 'Hội đồng thành viên' : 'chủ sở hữu công ty';
  return {
    ma: 'dieu_le', ten: 'Điều lệ công ty — khung tối thiểu (tham khảo)', can_cu: CC.dieu24, ngang: false, tham_khao: true,
    khoi: [
      { k: 'quoc_hieu' },
      { k: 'tieu_de', dong: ['ĐIỀU LỆ', ten] },
      { k: 'can_giua', nghieng: true, chu: 'KHUNG THAM KHẢO do MIMI tạo từ danh mục nội dung bắt buộc của Điều lệ — cần người sáng lập/luật sư hoàn thiện các phần trong ngoặc vuông trước khi ký.' },
      { k: 'doan', chu: 'Căn cứ Luật Doanh nghiệp số 59/2020/QH14 được sửa đổi, bổ sung bởi Luật số 03/2022/QH15 và Luật số 76/2025/QH15;' },
      { k: 'doan', chu: `Điều lệ này được ${hs.loai === 'ctcp' ? 'các cổ đông sáng lập' : hs.loai === 'tnhh2' ? 'các thành viên' : 'chủ sở hữu'} thông qua ngày ${hs.ngay_ky ? ngayViet(hs.ngay_ky) : '……/……/……'}.` },

      dieu(1, 'Tên, địa chỉ trụ sở chính; chi nhánh, văn phòng đại diện', 'a'),
      { k: 'dong', nhan: 'Tên công ty viết bằng tiếng Việt', gia: ten === '……………………' ? '' : ten },
      { k: 'dong', nhan: 'Tên công ty viết bằng tiếng nước ngoài', gia: hs.ten_nuoc_ngoai.trim() },
      { k: 'dong', nhan: 'Tên công ty viết tắt', gia: hs.ten_viet_tat.trim() },
      { k: 'dong', nhan: 'Địa chỉ trụ sở chính', gia: diaChiMotDong({ ...hs.tru_so, quoc_gia: '' }) },
      deTrong('Tên, địa chỉ chi nhánh và văn phòng đại diện (nếu có)'),

      dieu(2, 'Ngành, nghề kinh doanh', 'b'),
      {
        k: 'bang',
        dau: [[{ chu: 'STT' }, { chu: 'Tên ngành' }, { chu: 'Mã ngành' }]],
        dong: (nganh.length ? nganh : [{ ma: '', ten: '' }]).map((n, i) => [{ chu: nganh.length ? String(i + 1) : '' }, { chu: n.ten.trim() }, { chu: n.ma.trim() }]),
      },

      dieu(3, laCp ? 'Vốn điều lệ; tổng số cổ phần, loại cổ phần và mệnh giá' : 'Vốn điều lệ', 'c'),
      { k: 'dong', nhan: 'Vốn điều lệ', gia: hs.von > 0 ? `${soCoDau(hs.von)} đồng (${soBangChu(hs.von)})` : '' },
      ...(laCp ? [
        { k: 'dong', nhan: 'Mệnh giá cổ phần', gia: hs.menh_gia > 0 ? `${soCoDau(hs.menh_gia)} đồng` : '' } as Khoi,
        { k: 'dong', nhan: 'Tổng số cổ phần (cổ phần phổ thông)', gia: hs.menh_gia > 0 && hs.von > 0 ? soCoDau(Math.floor(hs.von / hs.menh_gia)) : '' } as Khoi,
      ] : []),

      dieu(4, hs.loai === 'ctcp' ? 'Cổ đông sáng lập' : hs.loai === 'tnhh2' ? 'Thành viên' : 'Chủ sở hữu', 'd'),
      {
        k: 'bang',
        dau: [[{ chu: 'STT' }, { chu: 'Họ, tên' }, { chu: 'Địa chỉ liên lạc' }, { chu: 'Quốc tịch' }, { chu: laCp ? 'Số cổ phần, loại cổ phần, mệnh giá' : 'Phần vốn góp, giá trị vốn góp' }, { chu: 'Tỷ lệ (%)' }]],
        dong: nguoi.map((t, i) => [
          { chu: String(i + 1) }, { chu: t.ho_ten.trim() }, { chu: diaChiMotDong(t.dia_chi) }, { chu: t.quoc_tich },
          { chu: laCp ? (hs.menh_gia > 0 && t.von > 0 ? `${soCoDau(Math.floor(t.von / hs.menh_gia))} cổ phần phổ thông, mệnh giá ${soCoDau(hs.menh_gia)} đồng` : '') : (t.von > 0 ? `${soCoDau(t.von)} đồng` : '') },
          { chu: hs.loai === 'tnhh1' ? '100' : tyLe(t.von, tong) },
        ]),
      },

      dieu(5, laCp ? 'Quyền và nghĩa vụ của cổ đông' : 'Quyền và nghĩa vụ của thành viên/chủ sở hữu', 'đ'),
      deTrong('Ghi quyền, nghĩa vụ theo Luật Doanh nghiệp và thoả thuận riêng (nếu có)'),
      dieu(6, 'Cơ cấu tổ chức quản lý', 'e'),
      deTrong(hs.loai === 'ctcp' ? 'Chọn mô hình theo Luật Doanh nghiệp (Đại hội đồng cổ đông, Hội đồng quản trị, Ban kiểm soát, Giám đốc/Tổng giám đốc — hoặc mô hình không có Ban kiểm soát)' : hs.loai === 'tnhh2' ? 'Hội đồng thành viên, Chủ tịch Hội đồng thành viên, Giám đốc/Tổng giám đốc (và Ban kiểm soát nếu thuộc trường hợp phải có)' : (hs.mo_hinh_1tv === 'hdtv' ? 'Hội đồng thành viên, Giám đốc hoặc Tổng Giám đốc' : 'Chủ tịch công ty, Giám đốc hoặc Tổng Giám đốc') + ' — quyền hạn từng chức danh'),
      dieu(7, 'Người đại diện theo pháp luật', 'g'),
      { k: 'dong', nhan: 'Số lượng, chức danh', gia: hs.dai_dien.ho_ten.trim() ? `01 người — ${hs.chuc_danh.trim() || '……'} (${inHoa(hs.dai_dien.ho_ten)})` : '' },
      deTrong('Quyền, nghĩa vụ của người đại diện; phân chia quyền nếu có nhiều người đại diện'),
      dieu(8, 'Thể thức thông qua quyết định; nguyên tắc giải quyết tranh chấp nội bộ', 'h'),
      deTrong(`Tỷ lệ biểu quyết, hình thức họp/lấy ý kiến của ${coQuan}; cách giải quyết tranh chấp nội bộ`),
      dieu(9, 'Căn cứ và phương pháp xác định tiền lương, thù lao, thưởng của người quản lý và Kiểm soát viên', 'i'),
      deTrong('Căn cứ, phương pháp xác định'),
      dieu(10, laCp ? 'Trường hợp cổ đông có quyền yêu cầu công ty mua lại cổ phần' : 'Trường hợp thành viên có quyền yêu cầu công ty mua lại phần vốn góp', 'k'),
      deTrong('Các trường hợp, giá mua lại, thời hạn'),
      dieu(11, 'Nguyên tắc phân chia lợi nhuận sau thuế và xử lý lỗ trong kinh doanh', 'l'),
      deTrong('Nguyên tắc chia lợi nhuận, trích lập quỹ, xử lý lỗ'),
      dieu(12, 'Trường hợp giải thể, trình tự giải thể và thủ tục thanh lý tài sản công ty', 'm'),
      deTrong('Các trường hợp, trình tự giải thể và thanh lý'),
      dieu(13, 'Thể thức sửa đổi, bổ sung Điều lệ công ty', 'n'),
      deTrong(`Ví dụ: Điều lệ được sửa đổi, bổ sung theo quyết định của ${coQuan}`),
      { k: 'muc', chu: 'Điều 14. Điều khoản thi hành' },
      deTrong('Số bản, hiệu lực của Điều lệ'),
      { k: 'doan', dam: true, chu: hs.loai === 'tnhh1' ? 'CHỦ SỞ HỮU CÔNG TY (ký, ghi rõ họ tên)' : hs.loai === 'ctcp' ? 'CÁC CỔ ĐÔNG SÁNG LẬP (ký, ghi rõ họ tên)' : 'CÁC THÀNH VIÊN (ký, ghi rõ họ tên)' },
      {
        k: 'bang',
        dau: [[{ chu: 'STT' }, { chu: 'Họ, tên' }, { chu: 'Chữ ký' }]],
        dong: (nguoi.length ? nguoi : [hs.dai_dien]).map((t, i) => [{ chu: String(i + 1) }, { chu: t.ho_ten.trim() }, { chu: '' }]),
      },
      {
        k: 'chu_thich',
        dong: [
          'Điều lệ khi đăng ký doanh nghiệp phải có họ, tên và chữ ký của chủ sở hữu (công ty TNHH một thành viên), của các thành viên (công ty TNHH hai thành viên trở lên), của các cổ đông sáng lập (công ty cổ phần) — theo Điều 24 Luật Doanh nghiệp; MIMI chưa đối chiếu bản gốc của điều này.',
          'Khung chỉ liệt kê nội dung bắt buộc; không thay tư vấn pháp lý. Bộ Điều lệ chủ dự án đã nộp thành công có thêm điều về con dấu — doanh nghiệp được tự bổ sung nội dung khác không trái luật.',
        ],
      },
    ],
  };
}

// ───────────────────────── Bộ hồ sơ theo loại hình ─────────────────────────

export function boMau(hs: HoSoDangKy): VanBanMau[] {
  if (hs.loai === 'hkd') return [mau1Hkd(hs)];
  if (hs.loai === 'tnhh1') return [mau2(hs), dieuLe(hs), mau10(hs)];
  if (hs.loai === 'tnhh2') return [mau3(hs), dieuLe(hs), mau6(hs), mau10(hs)];
  return [mau4(hs), dieuLe(hs), mau7(hs), mau10(hs)];
}

/** Bản chữ thuần của một văn bản (để test và sao chép). Bảng ghi mỗi dòng một hàng, ô cách bằng " | ". */
export function vanBanThanhChu(vb: VanBanMau): string {
  const ra: string[] = [];
  const chay = (k: Khoi) => {
    switch (k.k) {
      case 'so_mau': ra.push(k.chu); break;
      case 'quoc_hieu': ra.push('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', 'Độc lập - Tự do - Hạnh phúc'); break;
      case 'ngay': case 'can_giua': ra.push(k.chu); break;
      case 'tieu_de': ra.push(...k.dong); break;
      case 'muc': ra.push(`${k.chu}${k.nghieng ? ` (${k.nghieng})` : ''}${k.sau ?? ''}`); break;
      case 'dong': ra.push(`${k.nhan}${k.nghieng ? ` (${k.nghieng})` : ''}: ${k.gia.trim() || '……………'}`); break;
      case 'doan': ra.push(k.chu); break;
      case 'o': ra.push(k.muc.map((m) => `[${m.chon ? 'X' : ' '}] ${m.nhan}`).join('   ')); break;
      case 'khung': k.khoi.forEach(chay); break;
      case 'bang':
        k.dau.forEach((h) => ra.push(h.map((o) => o.chu).join(' | ')));
        if (k.so_cot) ra.push(k.so_cot.join(' | '));
        k.dong.forEach((h) => ra.push(h.map((o) => o.chu).join(' | ')));
        break;
      case 'ky': if (k.ngay) ra.push(k.ngay); ra.push(...k.chuc_danh, '(Ký và ghi họ tên)', k.ten); break;
      case 'chu_thich': ra.push('—', ...k.dong); break;
    }
  };
  vb.khoi.forEach(chay);
  return ra.join('\n');
}
