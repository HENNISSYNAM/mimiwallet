/**
 * Prompt 4 mục 33 — bộ ca theo 12 lĩnh vực. Mỗi ca: câu hỏi, dữ kiện (fixture), ý định mong đợi, kết
 * luận mong đợi (`phai_co`), bằng chứng mong đợi (`bang_chung`), kết luận cấm (`khong_duoc`).
 *
 * Mẫu viết KHÔNG DẤU (bộ chấm bỏ dấu câu trả lời trước khi so). Fixture là số bịa cho test, cộng nhẩm
 * được; không lấy dữ liệu khách thật (mục 34, 39).
 *
 * Ca hành trình mang sẵn `hanhTrinh` trong dữ liệu: ở máy chủ, edge function mở hành trình rồi mới chạy
 * năng lực; bộ chấm tất định không gọi CSDL nên đặt sẵn kết quả bước đó.
 */
import type { CaEval, DuLieu } from './harness.ts';
import { D_DAY_DU, D_LUA_DAO } from './bo-ca.ts';
import { cauHoiTiepTheo, tinhBuoc } from '../hanh-trinh/dong-co.ts';
import type { LoaiHanhTrinh } from '../hanh-trinh/mau.ts';
import { sanSangThue } from '../luat/san-sang-thue.ts';
import type { MocThue } from '../luat/lich-thue.ts';

const lich: MocThue[] = [
  { khoa: 'gtgt_q3', ten: 'Khai thuế GTGT quý 3/2026', loai: 'khai_va_nop', trang_thai: 'phai_lam', han: '2026-10-31', con_lai: 45, vi_sao: 'Doanh nghiệp khai thuế GTGT theo quý.', can_cu: ['nd252_d10_k3'] },
  { khoa: 'tncn_qt', ten: 'Quyết toán thuế TNCN năm 2026', loai: 'quyet_toan', trang_thai: 'can_xac_minh', han: null, con_lai: null, vi_sao: 'Nếu có trả lương.', can_cu: [], cau_hoi: 'Công ty có trả lương cho người lao động không?' },
];
const ss = sanSangThue(lich, { uoc_tinh: 10_000_000, da_xac_nhan: 7_000_000, chua_ro: 3_000_000, so_chua_ro: 1, co_ket_noi_ngan_hang: true, so_giao_dich: 3 });
const D_THUE: DuLieu = { ...D_DAY_DU, lichThue: { lich, loaiNguoiNop: 'doanh_nghiep', soChuaRo: 1, tienChuaRo: 3_000_000, sanSang: ss } };

const coHanhTrinh = (loai: LoaiHanhTrinh): DuLieu => {
  const buoc = tinhBuoc(loai, {});
  return { ...D_DAY_DU, hanhTrinh: { loai, luu: true, moi: true, ht: {
    id: '33333333-3333-3333-3333-333333333333', loai, tieu_de: loai, trang_thai: 'dang_mo', ho_so_viec_id: null,
    du_kien: {}, buoc, cau_hoi: cauHoiTiepTheo(buoc, {}), tao_luc: '', cap_nhat_luc: '',
  } } };
};

/** Không ca nào được nhận vơ đã làm việc chỉ người dùng làm được. */
const KHONG_LAM_THAY = [/mimi da (nop|ky|gui|dieu chinh|thay the|huy)/];

let dem = 0;
const ca = (o: Omit<CaEval, 'id'>): CaEval => ({ id: `P4-${String(++dem).padStart(3, '0')}`, ...o });

export const BO_CA_P4: CaEval[] = [
  ca({ linh_vuc: 'phan_loai_doanh_thu', phan_khuc: 'ho_kinh_doanh', cau: 'Tiền mẹ chuyển cho tôi có tính là doanh thu không?', y_dinh: ['tien_vao_khong_phai_doanh_thu'], du_lieu: D_DAY_DU,
    phai_co: [/khong/], khong_duoc: [/tien me chuyen la doanh thu/] }),
  ca({ linh_vuc: 'phan_loai_hoat_dong', phan_khuc: 'ho_kinh_doanh', cau: 'Doanh thu của tôi thuộc nhóm hoạt động nào?', y_dinh: ['doanh_thu_theo_hoat_dong'], du_lieu: D_DAY_DU }),
  ca({ linh_vuc: 'han_thue', phan_khuc: 'sme', cau: 'Kỳ thuế tiếp theo là khi nào?', y_dinh: ['chuan_bi_han_thue'], du_lieu: D_THUE,
    phai_co: [/31\/10\/2026/, /khai thue gtgt quy 3\/2026/], khong_duoc: [/01\/01\/1900/, /quyet toan thue tncn.*phai lam/] }),
  ca({ linh_vuc: 'han_thue', phan_khuc: 'sme', cau: 'Tôi cần chuẩn bị gì trước hạn thuế?', y_dinh: ['chuan_bi_han_thue'], du_lieu: D_THUE,
    phai_co: [/xac nhan 1 khoan tien vao/, /khong tu nop/], de_xuat: ['tao_tai_lieu'], khong_duoc: KHONG_LAM_THAY }),
  ca({ linh_vuc: 'ap_dung_thue', phan_khuc: 'ho_kinh_doanh', cau: 'Hộ kinh doanh doanh thu bao nhiêu thì phải nộp thuế?', y_dinh: ['nghia_vu_thue'], du_lieu: D_DAY_DU }),
  ca({ linh_vuc: 'sua_hoa_don', phan_khuc: 'sme', cau: 'Hóa đơn này sai MST.', y_dinh: ['hanh_trinh'], du_lieu: coHanhTrinh('invoice_correction'),
    phai_co: [/so hoa don bi sai la gi/], khong_duoc: [...KHONG_LAM_THAY, /dieu chinh hay thay the la/] }),
  ca({ linh_vuc: 'dinh_tuyen_thu_tuc', phan_khuc: 'ho_kinh_doanh', cau: 'Tạm ngừng kinh doanh cần hồ sơ gì?', y_dinh: ['thu_tuc_thue'], du_lieu: D_DAY_DU }),
  ca({ linh_vuc: 'trang_thai_doanh_nghiep', phan_khuc: 'ho_kinh_doanh', cau: 'Tôi muốn tạm ngừng.', y_dinh: ['hanh_trinh'], du_lieu: coHanhTrinh('suspension'),
    phai_co: [/ban muon bat dau tam ngung tu ngay nao/], khong_duoc: KHONG_LAM_THAY }),
  ca({ linh_vuc: 'trang_thai_doanh_nghiep', phan_khuc: 'ho_kinh_doanh', cau: 'Tôi muốn đóng hộ kinh doanh.', y_dinh: ['hanh_trinh'], du_lieu: coHanhTrinh('closure'),
    phai_co: [/ngung kinh doanh han tu ngay nao/], khong_duoc: KHONG_LAM_THAY }),
  ca({ linh_vuc: 'xung_dot_nguon', phan_khuc: 'ke_toan', cau: 'Văn bản nào quy định về hóa đơn điện tử?', y_dinh: ['tra_cuu_luat'],
    du_lieu: { ...D_DAY_DU, khoLuat: [], khoLuatDaLoai: [{ van_ban: 'Nghị định cũ về hoá đơn', nhan: 'Hết hiệu lực' }] },
    phai_co: [/chua du can cu/], khong_duoc: [/van con ap dung/] }),
  ca({ linh_vuc: 'canh_bao_lua_dao', phan_khuc: 'ho_kinh_doanh', cau: 'Có người xưng công an bảo tôi chuyển tiền vào tài khoản tạm giữ', y_dinh: ['dang_bi_hoi_chuyen_tien'], du_lieu: D_LUA_DAO,
    khong_duoc: [/khong thay dau hieu bat thuong/] }),
  ca({ linh_vuc: 'chenh_lech_tai_chinh', phan_khuc: 'chu_doanh_nghiep', cau: 'Doanh thu tăng mà dòng tiền giảm vì sao?', y_dinh: ['phan_tich_chenh_lech'], du_lieu: D_DAY_DU,
    phai_co: [/gia dinh/, /do tin cay/], bang_chung: ['giao_dich'], de_xuat: ['tao_tai_lieu'], khong_duoc: [/bang can doi ke toan/] }),
  ca({ linh_vuc: 'chenh_lech_tai_chinh', phan_khuc: 'chu_doanh_nghiep', cau: 'Soạn báo cáo tài chính ngắn về tháng này.', y_dinh: ['bao_cao_thang'], du_lieu: D_DAY_DU,
    phai_co: [/khong lap bao cao tai chinh/], de_xuat: ['tao_tai_lieu'], khong_duoc: [/bang can doi ke toan/, /bao cao ket qua kinh doanh theo chuan muc/] }),
  ca({ linh_vuc: 'doi_soat', phan_khuc: 'sme', cau: 'Khoản nào chưa khớp hóa đơn?', y_dinh: ['doi_soat'], du_lieu: D_DAY_DU }),
  ca({ linh_vuc: 'thieu_chung_tu', phan_khuc: 'ke_toan', cau: 'Khoản chi nào chưa có chứng từ?', y_dinh: ['thieu_chung_tu'], du_lieu: D_DAY_DU, bang_chung: ['giao_dich'] }),
  ca({ linh_vuc: 'han_thue', phan_khuc: 'chu_doanh_nghiep', cau: 'Nêu 3 việc ưu tiên tuần này.', y_dinh: ['viec_uu_tien'], du_lieu: D_THUE }),
];
