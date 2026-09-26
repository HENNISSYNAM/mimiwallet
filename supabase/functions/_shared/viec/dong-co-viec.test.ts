import { describe, expect, it } from 'vitest';
import { cauHoiTiepTheo, tinhBuoc, type DuKien, type TrangThaiBuoc } from '../hanh-trinh/dong-co';
import type { LoaiHanhTrinh } from '../hanh-trinh/mau';
import type { MocThue } from '../luat/lich-thue';
import {
  cauTheoDoi, dieuKienGiaiQuyet, hanhDongTiepHanhTrinh, henKiemLaiKeTiep, homNayVN, khiNaoViec, lichTuViec, mucUuTienViec,
  ngayTuHanhTrinh, suyTrangThai, xepViec, type ViecCanLam, type ViecHanhTrinh,
} from './dong-co-viec';
import { kiemBangChung, kiemChuyenViec, type BangChung } from './trang-thai';
import { dauVanTayPhanLoai, tienGon, viecPhanLoaiDoanhThu } from './doanh-thu-viec';
import { docCauTraLoi, docLuaChon, docMaHoSo, docNgay, docThang, nhanBaoViec } from './tra-loi-chat';

const dk = (o: Record<string, string>): DuKien =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { gia_tri: v, nguon: 'nguoi_dung' as const, luc: '2026-09-26T02:00:00Z', boi: 'u1' }]));
const ht = (loai: LoaiHanhTrinh, d: DuKien, daCo: Partial<Record<string, TrangThaiBuoc>> = {}): ViecHanhTrinh => {
  const buoc = tinhBuoc(loai, d, daCo);
  return { loai, buoc, cau_hoi: cauHoiTiepTheo(buoc, d), du_kien: d };
};
const bc = (o: Partial<BangChung>): BangChung => ({
  loai: 'user_confirmation', nguon: 'nguoi_dung', gia_tri: null, trang_thai_xac_minh: 'user_confirmed', khoa_trung: 'x', tao_luc: '2026-09-26T07:40:00Z', ...o,
});

describe('máy trạng thái hồ sơ việc', () => {
  it('bạn xác nhận ≠ MIMI xác minh: không bằng chứng hệ thống thì không lên "đã xác minh"', () => {
    expect(kiemChuyenViec('waiting_external', 'resolved_system_verified', [bc({})])).toMatch(/Chưa có bằng chứng MIMI xác minh/);
    expect(kiemChuyenViec('waiting_external', 'resolved_user_confirmed', [])).toMatch(/Chưa có bằng chứng xác nhận/);
    expect(kiemChuyenViec('waiting_external', 'resolved_user_confirmed', [bc({})])).toBeNull();
    expect(kiemChuyenViec('resolved_user_confirmed', 'resolved_system_verified', [bc({ nguon: 'mimi_he_thong', trang_thai_xac_minh: 'system_verified' })])).toBeNull();
  });
  it('trạng thái cuối không đổi; đã xong theo bạn chỉ nâng lên xác minh', () => {
    expect(kiemChuyenViec('cancelled', 'ready_to_act', [])).not.toBeNull();
    expect(kiemChuyenViec('resolved_system_verified', 'needs_review', [])).not.toBeNull();
    expect(kiemChuyenViec('resolved_user_confirmed', 'ready_to_act', [])).not.toBeNull();
    expect(kiemChuyenViec('needs_information', 'cancelled', [])).toBeNull();
  });
  it('người dùng không tự khai bằng chứng "đã xác minh"', () => {
    expect(kiemBangChung({ loai: 'official_response', nguon: 'nguoi_dung', trang_thai_xac_minh: 'system_verified' })).not.toBeNull();
    expect(kiemBangChung({ loai: 'system_verified_event', nguon: 'nguoi_dung', trang_thai_xac_minh: 'user_confirmed' })).not.toBeNull();
    expect(kiemBangChung({ loai: 'official_response', nguon: 'nguoi_dung', trang_thai_xac_minh: 'user_confirmed' })).toBeNull();
  });
});

describe('tạm ngừng kinh doanh — trạng thái, việc tiếp theo, ngày, điều kiện xong', () => {
  const homNay = '2026-09-26';
  it('mới mở: cần thông tin; việc tiếp theo nói cụ thể, không "Tiếp tục"', () => {
    const h = ht('suspension', {});
    expect(suyTrangThai(h, [])).toBe('needs_information');
    const a = hanhDongTiepHanhTrinh(h, 'needs_information', [], homNay)!;
    expect(a.tieu_de).toBe('Xác nhận ngày bắt đầu tạm ngừng');
    expect(a.can_nhap[0].khoa).toBe('tam_ngung_tu');
    expect(a.tieu_de).not.toMatch(/^(Xử lý ngay|Tiếp tục|Hoàn thành)$/);
  });
  it('đủ dữ kiện → làm bước; tới bước nộp → "Nộp hồ sơ, rồi ghi nhận đã nộp"', () => {
    const d = dk({ tam_ngung_tu: '2026-10-01', tam_ngung_den: '2026-12-31' });
    const h = ht('suspension', d, { nghia_vu_con_treo: 'completed', tra_thu_tuc: 'completed' });
    expect(suyTrangThai(h, [])).toBe('ready_to_act');
    expect(hanhDongTiepHanhTrinh(h, 'ready_to_act', [], homNay)!.loai).toBe('ghi_da_nop');
  });
  it('ghi đã nộp → chờ bên ngoài; việc tiếp theo là kiểm phản hồi, lời không nói "cơ quan chưa xử lý"', () => {
    const d = dk({ tam_ngung_tu: '2026-10-01', tam_ngung_den: '2026-12-31' });
    const h = ht('suspension', d, { nghia_vu_con_treo: 'completed', tra_thu_tuc: 'completed', nguoi_dung_nop: 'waiting_external' });
    const b = [bc({ khoa_trung: 'da_nop', tao_luc: '2026-09-23T07:40:00Z' })];
    expect(suyTrangThai(h, b)).toBe('waiting_external');
    const a = hanhDongTiepHanhTrinh(h, 'waiting_external', b, homNay)!;
    expect(a.tieu_de).toBe('Kiểm tra xem bạn đã nhận phản hồi chưa');
    expect(a.mo_ta).toContain('3 ngày trước');
    expect(a.mo_ta).toContain('MIMI chưa có bằng chứng về phản hồi mới');
    expect(a.mo_ta).not.toMatch(/chưa xử lý/);
  });
  it('chỉ "tôi đã nộp" thì chưa xong; có phản hồi (bạn xác nhận) → xong theo xác nhận của bạn, KHÔNG phải xác minh', () => {
    const d = dk({ tam_ngung_tu: '2026-10-01', tam_ngung_den: '2026-12-31' });
    const xong = { nghia_vu_con_treo: 'completed', tra_thu_tuc: 'completed', nguoi_dung_nop: 'completed', kiem_ket_qua: 'completed' } as const;
    const h = ht('suspension', d, xong);
    const daNop = bc({ khoa_trung: 'da_nop' });
    expect(dieuKienGiaiQuyet(h, [daNop]).dat).toBe(false);
    expect(dieuKienGiaiQuyet(h, [daNop]).thieu.join(' ')).toMatch(/bằng chứng kết quả/);
    expect(suyTrangThai(h, [daNop])).toBe('needs_review');
    const phanHoi = bc({ loai: 'official_response', khoa_trung: 'phan_hoi:1', gia_tri: 'Thông báo chấp nhận số 123/TB' });
    expect(suyTrangThai(h, [daNop, phanHoi])).toBe('resolved_user_confirmed');
  });
  it('ngày: ngày tạm ngừng là ngày MIMI KHUYÊN làm trước — không phải hạn pháp lý', () => {
    const n = ngayTuHanhTrinh('suspension', dk({ tam_ngung_tu: '2026-10-01' }));
    expect(n.han_luat).toBeNull();
    expect(n.ngay_nen_lam).toBe('2026-10-01');
    expect(n.ngay_nen_lam_ly_do).toMatch(/MIMI khuyên/);
    const tl = ngayTuHanhTrinh('authority_response', dk({ han_tra_loi: '2026-10-10' }));
    expect(tl.han_luat).toBe('2026-10-10');
    expect(tl.ngay_nen_lam).toBe('2026-10-07');
  });
});

describe('theo dõi, lịch, thứ tự việc', () => {
  it('hẹn kiểm lại: +3, +7, rồi +14 ngày', () => {
    expect(henKiemLaiKeTiep('2026-09-26', 0)).toBe('2026-09-29');
    expect(henKiemLaiKeTiep('2026-09-29', 1)).toBe('2026-10-06');
    expect(henKiemLaiKeTiep('2026-10-06', 2)).toBe('2026-10-20');
    expect(cauTheoDoi(null, '2026-09-26')).toMatch(/chưa có bằng chứng/);
  });
  it('hôm nay theo giờ Việt Nam: 18:30 UTC ngày 26 là ngày 27 ở Việt Nam', () => {
    expect(homNayVN(new Date('2026-09-26T18:30:00Z'))).toBe('2026-09-27');
    expect(homNayVN(new Date('2026-09-26T16:59:59Z'))).toBe('2026-09-26');
  });
  it('lịch đọc thẳng cột của việc; ba loại ngày tách nhau; việc xong vẫn hiện nhưng gạch', () => {
    const v = { id: 'v1', tieu_de: 'Tạm ngừng', trang_thai: 'waiting_external', han_luat: null, han_luat_nguon: null, ngay_nen_lam: '2026-10-01', ngay_nen_lam_ly_do: 'MIMI khuyên', hen_kiem_lai: '2026-09-29' };
    const l = lichTuViec(v);
    expect(l.map((x) => x.loai_ngay)).toEqual(['nen_lam', 'hen_kiem_lai']);
    expect(l.some((x) => x.loai_ngay === 'han_luat')).toBe(false);
    expect(lichTuViec({ ...v, trang_thai: 'resolved_user_confirmed' }).every((x) => x.da_xong)).toBe(true);
    expect(lichTuViec({ ...v, trang_thai: 'resolved_user_confirmed' }).some((x) => x.loai_ngay === 'hen_kiem_lai')).toBe(false);
    expect(khiNaoViec(v)?.loai_ngay).toBe('hen_kiem_lai');
  });
  it('thứ tự: quá hạn → sắp hạn → chặn tờ khai → chặn thủ tục → theo dõi', () => {
    const h = '2026-09-26';
    expect(mucUuTienViec({ loai: 'yeu_cau_giai_trinh', trang_thai: 'ready_to_act', han_luat: '2026-09-20', hen_kiem_lai: null }, h)).toBe(1);
    expect(mucUuTienViec({ loai: 'yeu_cau_giai_trinh', trang_thai: 'ready_to_act', han_luat: '2026-10-10', hen_kiem_lai: null }, h)).toBe(2);
    expect(mucUuTienViec({ loai: 'phan_loai_hoat_dong', trang_thai: 'ready_to_act', han_luat: '2027-01-31', hen_kiem_lai: null }, h)).toBe(3);
    expect(mucUuTienViec({ loai: 'tam_ngung', trang_thai: 'needs_information', han_luat: null, hen_kiem_lai: null }, h)).toBe(4);
    expect(mucUuTienViec({ loai: 'tam_ngung', trang_thai: 'waiting_external', han_luat: null, hen_kiem_lai: '2026-09-29' }, h)).toBe(6);
    const mk = (id: string, muc: ViecCanLam['muc'], ngay: string | null): ViecCanLam => ({ id, nguon: 'ho_so_viec', loai: 'x', tieu_de: id, trang_thai: 'ready_to_act', muc, vi_sao: '', khi: ngay ? { loai_ngay: 'han_luat', ngay, nhan: '' } : null, hanh_dong: null, can_ban: true, duong_dan: '' });
    expect(xepViec([mk('c', 4, null), mk('a', 2, '2026-10-20'), mk('b', 2, '2026-10-01'), mk('d', 1, '2026-09-01')]).map((x) => x.id)).toEqual(['d', 'b', 'a', 'c']);
  });
});

describe('doanh thu chưa rõ nhóm → MỘT việc chặn tờ khai (bộ dữ liệu 951.983.000đ)', () => {
  const lich: MocThue[] = [
    { khoa: 'khai_nam_2026', ten: 'Khai thuế năm 2026', loai: 'khai_va_nop', trang_thai: 'phai_lam', han: '2027-01-31', con_lai: 127, vi_sao: '', can_cu: [] },
  ];
  it('hộ kinh doanh, 101.983.000đ chưa rõ nhóm → một việc, tiêu đề cụ thể, hạn từ lịch thuế', () => {
    const v = viecPhanLoaiDoanhThu({ nam: 2026, laHoKinhDoanh: true, chuaRo: { so_tien: 101_983_000, so_khoan: 7 }, lich, homNay: '2026-09-26' })!;
    expect(v.tieu_de).toBe('Phân loại 101.983.000đ doanh thu trước khi hoàn tất tờ khai');
    expect(v.dau_van_tay).toBe(dauVanTayPhanLoai(2026));
    expect(v.han_luat).toBe('2027-01-31');
    expect(v.han_luat_nguon).toMatch(/lịch thuế/);
    expect(v.ngay_nen_lam).toBe('2027-01-24');
  });
  it('số tiền đổi → cùng dấu vân tay (không mở việc thứ hai); hết chưa rõ → không cần việc', () => {
    const a = viecPhanLoaiDoanhThu({ nam: 2026, laHoKinhDoanh: true, chuaRo: { so_tien: 101_983_000, so_khoan: 7 }, lich, homNay: '2026-09-26' })!;
    const b = viecPhanLoaiDoanhThu({ nam: 2026, laHoKinhDoanh: true, chuaRo: { so_tien: 50_000_000, so_khoan: 3 }, lich, homNay: '2026-09-26' })!;
    expect(a.dau_van_tay).toBe(b.dau_van_tay);
    expect(viecPhanLoaiDoanhThu({ nam: 2026, laHoKinhDoanh: true, chuaRo: { so_tien: 0, so_khoan: 0 }, lich, homNay: '2026-09-26' })).toBeNull();
    expect(viecPhanLoaiDoanhThu({ nam: 2026, laHoKinhDoanh: false, chuaRo: { so_tien: 101_983_000, so_khoan: 7 }, lich, homNay: '2026-09-26' })).toBeNull();
  });
  it('tiền viết gọn không phụ thuộc máy chủ', () => {
    expect(tienGon(951_983_000)).toBe('951.983.000đ');
    expect(tienGon(0)).toBe('0đ');
  });
});

describe('đọc câu trả lời trong chat', () => {
  const homNay = '2026-09-26';
  it('ngày: nhiều cách viết; khoảng "từ … đến …" ra hai ngày; ngày sai bị loại', () => {
    expect(docNgay('01/10/2026', homNay)).toEqual(['2026-10-01']);
    expect(docNgay('từ 1/10 đến 31/12/2026', homNay)).toEqual(['2026-10-01', '2026-12-31']);
    expect(docNgay('ngày 1 tháng 10 năm 2026', homNay)).toEqual(['2026-10-01']);
    expect(docNgay('2026-10-01', homNay)).toEqual(['2026-10-01']);
    expect(docNgay('31/02/2026', homNay)).toEqual([]);
    expect(docNgay('tôi muốn tạm ngừng kinh doanh', homNay)).toEqual([]);
  });
  it('tháng và lựa chọn', () => {
    expect(docThang('tháng 4/2026')).toEqual(['2026-04']);
    expect(docThang('2026-06')).toEqual(['2026-06']);
    const loai = [{ gia_tri: 'ho_kinh_doanh', nhan: 'Hộ kinh doanh' }, { gia_tri: 'doanh_nghiep', nhan: 'Doanh nghiệp' }];
    expect(docLuaChon('mình là hộ kinh doanh', loai)).toBe('ho_kinh_doanh');
    expect(docLuaChon('abc', loai)).toBeNull();
    const coKhong = [{ gia_tri: 'co', nhan: 'Có' }, { gia_tri: 'khong', nhan: 'Không' }, { gia_tri: 'chua_ro', nhan: 'Tôi chưa rõ' }];
    expect(docLuaChon('chưa', coKhong)).toBe('khong');
    expect(docLuaChon('có rồi', coKhong)).toBe('co');
    expect(docLuaChon('tôi không biết', coKhong)).toBe('chua_ro');
    expect(docCauTraLoi('01/10/2026', { kieu: 'ngay' }, homNay)).toBe('2026-10-01');
    expect(docCauTraLoi('bla', { kieu: 'chu' }, homNay)).toBeNull();
  });
  it('báo đã nộp / có phản hồi; câu hỏi thì không phải báo', () => {
    expect(nhanBaoViec('Tôi đã nộp rồi, mã hồ sơ 11220260001234')).toEqual({ loai: 'da_nop', ma_ho_so: '11220260001234' });
    expect(nhanBaoViec('Tôi đã nộp.')).toEqual({ loai: 'da_nop', ma_ho_so: null });
    expect(nhanBaoViec('Tôi nộp chưa nhỉ?')).toBeNull();
    expect(nhanBaoViec('Tôi chưa nộp')).toBeNull();
    expect(nhanBaoViec('Đã nhận thông báo chấp nhận số 123/TB-CCT')?.loai).toBe('co_phan_hoi');
    expect(docMaHoSo('số biên nhận: BN-2026/0912')).toBe('BN-2026/0912');
    expect(docMaHoSo('mã hồ sơ là abc')).toBeNull();
  });
});
