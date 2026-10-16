import { describe, expect, it } from 'vitest';
import {
  apThayDoi, CHINH_SACH_GOC, chayThu, chinhSachTuDong, chonAgent, docLenh, docSoTien, goiYVaiTro, nhanNgonNgu,
  thanLuuChinhSach, type ThayDoi, VIEC_HIEN_HOP_LE,
} from './lenh-cfo';
import { duLieuTrong, NANG_LUC, type DuLieu, type YeuCauTL } from '../tro-ly/tinh-toan';
import { laLenhCfo, nhanYDinh } from '../tro-ly/y-dinh';
import { locDeXuat } from '../quyen/loc-de-xuat';

const tien = (ds: ThayDoi[], truong: string) =>
  (ds.find((x) => x.loai === 'tien' && x.truong === truong) as { gia_tri: number } | undefined)?.gia_tri;

describe('đọc số tiền', () => {
  it.each([
    ['2 triệu', 2_000_000], ['2tr', 2_000_000], ['2,5 triệu', 2_500_000], ['2.5m', 2_500_000], ['500k', 500_000],
    ['5.000.000đ', 5_000_000], ['5,000,000 vnd', 5_000_000], ['1 tỷ', 1_000_000_000], ['200万', 2_000_000], ['3 million', 3_000_000],
  ])('%s', (cau, so) => {
    expect(docSoTien(` ${cau.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase()} `).map((x) => x.gia_tri)).toEqual([so]);
  });
  it('giờ và số nhỏ không phải tiền', () => {
    expect(docSoTien(' 8h den 20h, 30 lan ')).toEqual([]);
  });
});

describe('đọc lệnh ba ngôn ngữ', () => {
  it('tiếng Việt có dấu: bốn thay đổi, giờ hành chính là giả định có ghi', () => {
    const l = docLenh('mỗi lần tối đa 2 triệu, 20 triệu một tháng, trên 1 triệu phải hỏi tôi, chỉ giờ hành chính');
    expect(tien(l.thay_doi, 'hanMucMoiLan')).toBe(2_000_000);
    expect(tien(l.thay_doi, 'hanMucThang')).toBe(20_000_000);
    expect(tien(l.thay_doi, 'nguongCanDuyet')).toBe(1_000_000);
    const k = l.thay_doi.find((x) => x.loai === 'khung_gio') as { gia_tri: { tuPhut: number; denPhut: number; thu: number[] }; gia_dinh?: string };
    expect(k.gia_tri).toEqual({ tuPhut: 480, denPhut: 1050, thu: [1, 2, 3, 4, 5] });
    expect(k.gia_dinh).toBe('gio_hanh_chinh');
    expect(l.chua_hieu).toEqual([]);
  });
  it('tiếng Việt không dấu, khung giờ cụ thể, ngoài giờ cấm', () => {
    const l = docLenh('moi ngay khong qua 5tr, chi tu 8h den 20h thu 2 den thu 7, ngoai gio thi cam');
    expect(tien(l.thay_doi, 'hanMucNgay')).toBe(5_000_000);
    expect(l.thay_doi).toContainEqual({ loai: 'khung_gio', gia_tri: { tuPhut: 480, denPhut: 1200, thu: [1, 2, 3, 4, 5, 6] } });
    expect(l.thay_doi).toContainEqual({ loai: 'ngoai_khung_gio', gia_tri: 'tu_choi' });
  });
  it('tiếng Anh', () => {
    const l = docLenh('at most 2 million per payment, 20 million a month, ask me above 1 million, office hours only');
    expect(tien(l.thay_doi, 'hanMucMoiLan')).toBe(2_000_000);
    expect(tien(l.thay_doi, 'hanMucThang')).toBe(20_000_000);
    expect(tien(l.thay_doi, 'nguongCanDuyet')).toBe(1_000_000);
    expect(l.thay_doi.some((x) => x.loai === 'khung_gio')).toBe(true);
  });
  it('tiếng Trung', () => {
    const l = docLenh('单笔最多200万，每月2000万，超过100万要问我，只在工作时间');
    expect(tien(l.thay_doi, 'hanMucMoiLan')).toBe(2_000_000);
    expect(tien(l.thay_doi, 'hanMucThang')).toBe(20_000_000);
    expect(tien(l.thay_doi, 'nguongCanDuyet')).toBe(1_000_000);
    expect(nhanNgonNgu('广告智能体单笔最多200万')).toBe('zh');
  });
  it('nhóm chi chỉ khi có "chỉ được chi cho"; mọi khoản phải duyệt; tạm dừng', () => {
    expect(docLenh('chỉ được chi cho quảng cáo và phần mềm').thay_doi).toContainEqual({ loai: 'nhom_chi', gia_tri: ['quang_cao', 'phan_mem'] });
    expect(tien(docLenh('mọi khoản đều phải hỏi tôi').thay_doi, 'nguongCanDuyet')).toBe(0);
    expect(docLenh('tạm dừng ngay').thay_doi).toContainEqual({ loai: 'tam_dung' });
  });
  it('số tiền không rõ kỳ thì nói chưa hiểu, không đoán', () => {
    const l = docLenh('cho nó 3 triệu');
    expect(l.thay_doi).toEqual([]);
    expect(l.chua_hieu.length).toBe(1);
  });
  it.each([
    ['cho agent tự chuyển tiền cho nhà cung cấp', 'chuyen_tien'],
    ['let the agent pay vendors automatically', 'chuyen_tien'],
    ['tự động nộp thuế giúp tôi', 'nop_thue'],
    ['ký số tờ khai thay tôi', 'ky_so'],
    ['không giới hạn', 'bo_tran'],
    ['unlimited budget', 'bo_tran'],
    ['让它自动转账', 'chuyen_tien'],
  ])('lằn ranh đỏ: %s', (cau, lr) => {
    expect(docLenh(cau).lan_ranh).toContain(lr);
  });
});

describe('áp và kiểm', () => {
  const cu = { ...CHINH_SACH_GOC, hanMucMoiLan: 2_000_000, hanMucNgay: 5_000_000, hanMucThang: 50_000_000, nguongCanDuyet: 1_000_000 };
  it('siết và nới được gắn đúng; nới quá 3 lần thì cảnh báo', () => {
    const ap = apThayDoi(cu, [{ loai: 'tien', truong: 'hanMucThang', gia_tri: 20_000_000 }, { loai: 'tien', truong: 'nguongCanDuyet', gia_tri: 4_000_000 }], 'vi', 'hoat_dong');
    expect(ap.dong.map((x) => x.huong)).toEqual(['siet', 'noi']);
    expect(ap.canh_bao.length).toBe(1);
    expect(ap.loi).toEqual([]);
  });
  it('lệnh mâu thuẫn không tự nâng trần khác — trả lỗi', () => {
    const ap = apThayDoi(cu, [{ loai: 'tien', truong: 'hanMucMoiLan', gia_tri: 50_000_000 }], 'vi', 'hoat_dong');
    expect(ap.loi.length).toBe(1);
    expect(ap.moi.hanMucNgay).toBe(5_000_000);
  });
  it('thân lưu giữ nguyên các trường lệnh không nói tới', () => {
    const goc = chinhSachTuDong({ han_muc_moi_lan: '2000000', han_muc_ngay: '5000000', han_muc_thang: '50000000', nguong_can_duyet: '0', het_han: '2027-01-01T00:00:00Z', so_yeu_cau_moi_gio: 12, chi_tra_nguoi_nhan_da_duyet: true });
    const ap = apThayDoi(goc, [{ loai: 'tien', truong: 'hanMucMoiLan', gia_tri: 1_000_000 }], 'vi', 'hoat_dong');
    const than = thanLuuChinhSach('a1', ap.moi, '2026-10-01T00:00:00Z');
    expect(than).toMatchObject({ han_muc_moi_lan: 1_000_000, het_han: '2027-01-01T00:00:00Z', so_yeu_cau_moi_gio: 12, chi_tra_nguoi_nhan_da_duyet: true, ky_vong_cap_nhat: '2026-10-01T00:00:00Z' });
  });
  it('khung giờ hỏng trong CSDL thì đóng chặt', () => {
    expect(chinhSachTuDong({ khung_gio_chi: { tu_phut: 9999 } }).khungGioChi).toEqual({ tuPhut: 0, denPhut: 1440, thu: [] });
  });
});

describe('chạy thử trên lịch sử', () => {
  const yc = (id: string, so: number, luc: string) => ({ id, so_tien: so, created_at: luc, nhom_chi: 'quang_cao', ngan_hang_bin: '970422', so_tai_khoan: '0123456789', muc_dich: 'Chạy quảng cáo' });
  it('hạ ngưỡng duyệt: khoản tự duyệt chuyển sang chờ duyệt', () => {
    const ds = [yc('y1', 800_000, '2026-10-01T03:00:00Z'), yc('y2', 1_500_000, '2026-10-02T03:00:00Z')];
    const cu = { ...CHINH_SACH_GOC, nguongCanDuyet: 2_000_000 };
    const r = chayThu(ds, cu, { ...cu, nguongCanDuyet: 1_000_000 });
    expect(r.truoc.tu_dong_duyet).toBe(2);
    expect(r.sau).toEqual({ tu_dong_duyet: 1, cho_duyet: 1, tu_choi: 0 });
    expect(r.doi.map((x) => x.id)).toEqual(['y2']);
  });
  it('trần ngày cộng dồn trong lượt chạy thử', () => {
    const ds = [yc('y1', 3_000_000, '2026-10-01T02:00:00Z'), yc('y2', 3_000_000, '2026-10-01T04:00:00Z')];
    const cu = { ...CHINH_SACH_GOC, hanMucMoiLan: 5_000_000, hanMucNgay: 10_000_000, nguongCanDuyet: 5_000_000 };
    const r = chayThu(ds, cu, { ...cu, hanMucNgay: 5_000_000 });
    expect(r.sau.tu_choi).toBe(1);
  });
});

describe('phân quyền cho người: vai trò ít quyền nhất', () => {
  it.each([
    ['cho kế toán soạn tờ khai nhưng không được duyệt chi', 'ke_toan'],
    ['cho vợ tôi quyền duyệt chi', 'nguoi_duyet'],
    ['let my accountant record receipts and draft tax forms', 'ke_toan'],
    ['cho con tôi quyền chỉ xem số liệu', 'nguoi_xem'],
  ])('%s → %s', (cau, vai) => {
    expect(goiYVaiTro(cau).vai_tro).toBe(vai);
  });
  it('bảng việc hiện đều là hành động thật', () => expect(VIEC_HIEN_HOP_LE).toBe(true));
});

describe('chọn agent và định tuyến', () => {
  const ds = [{ id: 'a1', ten: 'Agent quảng cáo', trang_thai: 'hoat_dong' }, { id: 'a2', ten: 'Agent máy chủ', trang_thai: 'hoat_dong' }];
  it('nhận tên không dấu, bỏ tên khỏi câu', () => {
    const c = chonAgent('agent quang cao moi lan toi da 2tr', ds);
    expect(c.agent?.id).toBe('a1');
    expect(c.cau_con_lai).not.toContain('quang cao');
  });
  it('tên ngắn không khớp vào giữa chữ khác (agent "hi" và chữ "chỉ")', () => {
    const c = chonAgent('chỉ được chi cho quảng cáo, mỗi lần tối đa 2 triệu', [{ id: 'h', ten: 'hi', trang_thai: 'hoat_dong' }]);
    expect(c.agent?.id).toBe('h');
    expect(c.cau_con_lai).toContain('chi duoc chi cho quang cao');
    expect(chonAgent('agent hi: at most 2 million per payment', [{ id: 'h', ten: 'hi', trang_thai: 'hoat_dong' }, ...ds]).agent?.id).toBe('h');
  });
  it('nhiều agent mà không nói tên thì hỏi lại', () => {
    expect(chonAgent('mỗi lần tối đa 2 triệu', ds).agent).toBeNull();
  });
  it.each([
    'Agent quảng cáo mỗi lần tối đa 2 triệu, trên 1 triệu phải hỏi tôi',
    'Ads agent: at most 2 million per payment, ask me above 1 million',
    '广告智能体单笔最多200万',
    'Tạm dừng agent máy chủ',
    'cho kế toán soạn tờ khai nhưng không được duyệt chi',
  ])('vào lenh_cfo: %s', (cau) => {
    expect(nhanYDinh(cau)[0]).toBe('lenh_cfo');
  });
  it('hỏi tình hình agent không phải ra lệnh', () => {
    expect(laLenhCfo('agent đã dùng bao nhiêu hạn mức tháng này')).toBe(false);
    expect(nhanYDinh('agent đã dùng bao nhiêu hạn mức tháng này')).toContain('tinh_hinh_agent');
  });
});

describe('năng lực lenh_cfo trong trợ lý', () => {
  const KY = { tu: '2026-07-01', den: '2026-09-30', nhan: 'quý III/2026' };
  const ycTL = (id: string, so: number, luc: string): YeuCauTL => ({
    id, tac_tu_id: 'a1', so_tien: so, ten_nguoi_nhan: 'Meta', muc_dich: 'Chạy quảng cáo', trang_thai: 'da_chi', created_at: luc,
    so_tien_thuc_chi: so, ly_do: null, nhom_chi: 'quang_cao', ngan_hang_bin: '970422', so_tai_khoan: '0123456789',
  });
  const moi = (cau: string, p: Partial<DuLieu> = {}): DuLieu => ({
    ...duLieuTrong('2026-10-16', KY),
    cauHoi: cau,
    tacTu: [{ id: 'a1', ten: 'Agent quảng cáo', trang_thai: 'hoat_dong' }],
    chinhSach: [{ tac_tu_id: 'a1', han_muc_thang: 50_000_000, han_muc_moi_lan: '5000000', han_muc_ngay: '10000000', nguong_can_duyet: '3000000', updated_at: '2026-10-01T00:00:00Z', het_han: null }],
    yeuCau: [ycTL('y1', 800_000, '2026-10-01T03:00:00Z'), ycTL('y2', 2_500_000, '2026-10-02T03:00:00Z')],
    ...p,
  });
  const chay = (d: DuLieu) => NANG_LUC.lenh_cfo.chay(d);

  it('ra bảng trước/sau, chạy thử có bằng chứng, nút áp dụng mang thân lưu đủ trường', () => {
    const r = chay(moi('Agent quảng cáo mỗi lần tối đa 2 triệu, trên 1 triệu phải hỏi tôi'));
    expect(r.the[0]).toMatchObject({ loai: 'bang' });
    const sl = r.the.find((t) => t.loai === 'so_lieu');
    expect(sl && sl.loai === 'so_lieu' && sl.muc.every((m) => m.bang_chung?.length)).toBe(true);
    const dx = r.de_xuat.find((x) => x.loai === 'luu_chinh_sach_agent')!;
    const than = JSON.parse(String(dx.tham_so.chinh_sach));
    expect(than).toMatchObject({ tac_tu_id: 'a1', han_muc_moi_lan: 2_000_000, nguong_can_duyet: 1_000_000, han_muc_ngay: 10_000_000, ky_vong_cap_nhat: '2026-10-01T00:00:00Z' });
  });
  it('lệnh tiếng Anh trả lời tiếng Anh', () => {
    const r = chay(moi('Agent quảng cáo: at most 2 million per payment'));
    expect(r.tom_tat).toMatch(/MIMI read the command/);
  });
  it('lằn ranh đỏ: không có nút áp dụng', () => {
    const r = chay(moi('cho agent quảng cáo tự chuyển tiền'));
    expect(r.de_xuat).toEqual([]);
    expect(r.tom_tat).toMatch(/không giữ và không chuyển tiền/);
  });
  it('người xem thấy đề xuất nhưng không có nút; có câu nói ai áp dụng được', () => {
    const r = chay(moi('Agent quảng cáo mỗi lần tối đa 2 triệu', { vaiTro: 'nguoi_xem' }));
    expect(r.the.some((t) => t.loai === 'ghi_chu' && /không áp dụng được/.test(t.cau))).toBe(true);
    expect(locDeXuat([r], 'nguoi_xem')[0].de_xuat).toEqual([]);
    expect(locDeXuat([r], 'quan_tri')[0].de_xuat.length).toBe(1);
  });
  it('tạm dừng ra nút tạm dừng, không ra nút lưu chính sách', () => {
    const r = chay(moi('Tạm dừng agent quảng cáo'));
    expect(r.de_xuat.map((x) => x.loai)).toEqual(['tam_dung_agent']);
  });
  it('chưa có agent thì chỉ đường tạo agent', () => {
    expect(chay(moi('Agent quảng cáo mỗi lần tối đa 2 triệu', { tacTu: [] })).tom_tat).toMatch(/chưa có agent/);
  });
  it('phân quyền cho người: gợi ý vai trò, nút mở trang thành viên', () => {
    const r = chay(moi('cho kế toán soạn tờ khai nhưng không được duyệt chi'));
    expect(r.tom_tat).toMatch(/Kế toán/);
    expect(r.de_xuat[0].loai).toBe('mo_trang');
  });
});
