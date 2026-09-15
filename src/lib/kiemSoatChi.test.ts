import { describe, expect, it } from 'vitest';
import { MA_LY_DO } from './tacTu';
import {
  NHAN_MA, canChuY, cauTomTatKiemSoat, giuTheoNgay, ketQuaDanhGia, kiemTruocYeuCau, locYeuCau, luatDaKhop, nganSachQuanhKhoan, nhomTrungTen, thoiGianGiu, tienTrinh, tinhKpi,
  tomTatLuat, trangThaiHienThi, type ChinhSachRow, type NguoiNhan, type TacTu, type YeuCau,
} from './kiemSoatChi';

/** 12:00 ngày 15/09/2026 giờ Việt Nam. */
const NOW = new Date('2026-09-15T05:00:00Z');
const HOM_NAY = '2026-09-15T02:00:00.000Z';
const HOM_QUA = '2026-09-14T02:00:00.000Z';
const THANG_TRUOC = '2026-08-20T02:00:00.000Z';

const yc = (x: Partial<YeuCau>): YeuCau => ({
  cach_quyet: null, company_id: 'c', created_at: HOM_NAY, da_chi_luc: null, giao_dich_id: null, het_han_luc: null,
  id: 'y', ly_do: [], ma_tham_chieu: 'MIMI1', ma_yeu_cau: null, muc_dich: 'Nạp API', ngan_hang_bin: '970422',
  nguoi_quyet: null, nhom_chi: 'ha_tang_ai', quyet_luc: null, so_hoa_don: null, so_tai_khoan: '0123456789',
  so_tien: 1_000_000, so_tien_thuc_chi: null, tac_tu_id: 't1', ten_nguoi_nhan: 'CONG TY ABC', trang_thai: 'cho_duyet',
  updated_at: HOM_NAY, ...x,
});
const ma = (...ds: string[]) => ds.map((m) => ({ ma: m, cau: `câu ${m}` }));

const tacTu = (x: Partial<TacTu>): TacTu => ({
  company_id: 'c', created_at: THANG_TRUOC, dung_lan_cuoi: null, id: 't1', khoa_bam: 'h', khoa_hien: 'mimi_…',
  mo_ta: null, ten: 'agent', trang_thai: 'hoat_dong', updated_at: THANG_TRUOC, ...x,
});
const cs = (x: Partial<ChinhSachRow> = {}): ChinhSachRow => ({
  chi_tra_nguoi_nhan_da_duyet: true, company_id: 'c', han_muc_moi_lan: 5_000_000, han_muc_ngay: 5_000_000,
  han_muc_thang: 20_000_000, het_han: null, nguong_can_duyet: 0, nhom_chi_duoc_phep: null, so_yeu_cau_moi_gio: 30,
  tac_tu_id: 't1', updated_at: THANG_TRUOC, ...x,
});

describe('trạng thái hiển thị', () => {
  it('sáu trạng thái CSDL gom về đúng bốn nhãn', () => {
    expect(trangThaiHienThi(yc({ trang_thai: 'dang_xet' }))).toBe('dang_cho');
    expect(trangThaiHienThi(yc({ trang_thai: 'cho_duyet', ly_do: ma('TREN_NGUONG_DUYET') }))).toBe('dang_cho');
    expect(trangThaiHienThi(yc({ trang_thai: 'cho_duyet', ly_do: ma('TREN_NGUONG_DUYET', 'DOI_SO_TAI_KHOAN') }))).toBe('can_xem_xet');
    expect(trangThaiHienThi(yc({ trang_thai: 'cho_duyet', ly_do: ma('NGUOI_NHAN_MOI') }))).toBe('can_xem_xet');
    expect(trangThaiHienThi(yc({ trang_thai: 'da_duyet' }))).toBe('da_duyet');
    expect(trangThaiHienThi(yc({ trang_thai: 'da_chi' }))).toBe('da_duyet');
    expect(trangThaiHienThi(yc({ trang_thai: 'tu_choi' }))).toBe('tu_choi');
    expect(trangThaiHienThi(yc({ trang_thai: 'huy' }))).toBe('tu_choi');
  });

  it('mọi mã lý do của bộ luật đều có nhãn tiếng Việt', () => {
    for (const m of MA_LY_DO) expect(NHAN_MA[m], m).toBeTruthy();
  });
});

describe('kết quả đánh giá', () => {
  it('phân biệt luật quyết với người quyết', () => {
    expect(ketQuaDanhGia(yc({ cach_quyet: 'tu_dong', trang_thai: 'da_duyet', ly_do: ma('TRONG_CHINH_SACH') }))).toBe('duyet');
    expect(ketQuaDanhGia(yc({ trang_thai: 'tu_choi', ly_do: ma('VUOT_HAN_MUC_NGAY') }))).toBe('tu_choi');
    expect(ketQuaDanhGia(yc({ trang_thai: 'cho_duyet', ly_do: ma('TREN_NGUONG_DUYET') }))).toBe('can_nguoi');
    // Người từ chối một khoản mà luật đã đưa lên hỏi: luật đã nói "cần người", không phải "từ chối".
    expect(ketQuaDanhGia(yc({ trang_thai: 'tu_choi', cach_quyet: 'nguoi_duyet', ly_do: ma('TREN_NGUONG_DUYET', 'NGUOI_DUYET_TU_CHOI') }))).toBe('can_nguoi');
    expect(ketQuaDanhGia(yc({ trang_thai: 'dang_xet' }))).toBeNull();
  });

  it('ghi chú khi người từ chối không bị tính là luật đã khớp', () => {
    const y = yc({ ly_do: ma('TREN_NGUONG_DUYET', 'NGUOI_DUYET_TU_CHOI') });
    expect(luatDaKhop(y).map((l) => l.ma)).toEqual(['TREN_NGUONG_DUYET']);
    expect(tomTatLuat(y)).toBe('Trên ngưỡng tự duyệt');
    expect(tomTatLuat(yc({ ly_do: ma('DOI_SO_TAI_KHOAN', 'TREN_NGUONG_DUYET') }))).toBe('Đổi số tài khoản +1');
    expect(tomTatLuat(yc({ ly_do: [] }))).toBe('—');
  });
});

describe('KPI', () => {
  it('chưa có agent: không có ngân sách để cộng, không hiện số giả', () => {
    const k = tinhKpi({ yeuCau: [], dsTacTu: [], chinhSach: {}, giu: [], now: NOW });
    expect(k.coAgent).toBe(false);
    expect(k.nganSachThang).toBeNull();
  });

  it('đếm và cộng đúng từ dữ liệu đã tải', () => {
    const A = yc({ id: 'A', so_tien: 500_000, ly_do: ma('TREN_NGUONG_DUYET') });
    const B = yc({ id: 'B', so_tien: 12_800_000, ly_do: ma('DOI_SO_TAI_KHOAN') });
    const C = yc({ id: 'C', so_tien: 850_000, trang_thai: 'da_chi', cach_quyet: 'tu_dong', da_chi_luc: HOM_NAY, so_tien_thuc_chi: 850_000 });
    const C2 = yc({ id: 'C2', so_tien: 300_000, trang_thai: 'da_chi', created_at: HOM_QUA, da_chi_luc: HOM_QUA, so_tien_thuc_chi: 300_000 });
    const D = yc({ id: 'D', so_tien: 9_000_000, trang_thai: 'tu_choi', ly_do: ma('VUOT_HAN_MUC_NGAY') });
    const giu = [A, B, C, C2].map(({ tac_tu_id, so_tien, created_at }) => ({ tac_tu_id, so_tien, created_at }));

    const k = tinhKpi({
      yeuCau: [A, B, C, C2, D],
      dsTacTu: [tacTu({}), tacTu({ id: 't2', trang_thai: 'tam_dung' })],
      chinhSach: { t1: cs(), t2: cs({ tac_tu_id: 't2' }) },
      giu,
      now: NOW,
    });
    expect(k.canDuyet).toBe(2);
    expect(k.canXemXet).toBe(1);
    expect(k.daChiHomNay).toEqual({ tong: 850_000, soKhoan: 1 });
    expect(k.daGiuHomNay).toBe(500_000 + 12_800_000 + 850_000);
    // Agent tạm dừng không cộng vào ngân sách còn lại.
    expect(k.nganSachThang).toEqual({ conLai: 20_000_000 - 14_450_000, tran: 20_000_000, soAgent: 1 });
  });
});

describe('câu trợ lý màn Kiểm soát chi', () => {
  const kpiRong = { coAgent: true, canDuyet: 0, canXemXet: 0, daChiHomNay: { tong: 0, soKhoan: 0 }, daGiuHomNay: 0, nganSachThang: null };

  it('chưa có agent: nói việc đầu tiên cần làm', () => {
    expect(cauTomTatKiemSoat({ kpi: { ...kpiRong, coAgent: false }, soChoTra: 0 })).toContain('Thêm agent đầu tiên');
  });

  it('nói việc đang chờ trước, rồi tiền đã chi và hạn mức còn lại — bằng lời, không mã', () => {
    const cau = cauTomTatKiemSoat({
      kpi: { ...kpiRong, canDuyet: 2, canXemXet: 1, daChiHomNay: { tong: 850_000, soKhoan: 1 }, nganSachThang: { conLai: 5_850_000, tran: 20_000_000, soAgent: 1 } },
      soChoTra: 1,
    });
    expect(cau).toBe(
      'Có 2 khoản chờ bạn duyệt, trong đó 1 khoản cần xem kỹ vì người nhận mới hoặc đổi số tài khoản. ' +
      '1 khoản đã duyệt đang chờ bạn chuyển tiền. Hôm nay ngân hàng đã xác nhận 1 khoản, tổng 850.000đ. ' +
      'Hạn mức tháng của các agent còn 5.850.000đ.',
    );
    expect(cau).not.toMatch(/[A-Z]{3,}_[A-Z]/);
  });

  it('không có gì chờ và chưa có số: chỉ một câu ngắn', () => {
    expect(cauTomTatKiemSoat({ kpi: kpiRong, soChoTra: 0 })).toBe('Không có khoản nào chờ bạn duyệt.');
  });
});

describe('cần chú ý và biểu đồ', () => {
  const nguoiNhan = (x: Partial<NguoiNhan>): NguoiNhan => ({
    company_id: 'c', created_at: THANG_TRUOC, ghi_chu: null, id: 'n', ngan_hang_bin: '970422', so_tai_khoan: '0123456789',
    ten_chu_tai_khoan: 'CONG TY ABC', ...x,
  });

  it('không có gì bất thường thì danh sách rỗng', () => {
    expect(canChuY({ yeuCau: [], dsTacTu: [tacTu({})], chinhSach: { t1: cs() }, suDung: {}, nguoiNhan: [nguoiNhan({})], now: NOW })).toEqual([]);
  });

  it('gom đổi số tài khoản, lệnh quá hạn, agent gần chạm hạn mức, người nhận mới — nguy trước', () => {
    const ds = canChuY({
      yeuCau: [
        yc({ id: 'Q', trang_thai: 'da_duyet', het_han_luc: HOM_QUA }),
        yc({ id: 'B', ly_do: ma('DOI_SO_TAI_KHOAN') }),
        // Đã từ chối thì không còn việc gì để làm.
        yc({ id: 'X', trang_thai: 'tu_choi', ly_do: ma('DOI_SO_TAI_KHOAN') }),
      ],
      dsTacTu: [tacTu({}), tacTu({ id: 't2', ten: 'agent-2' })],
      chinhSach: { t1: cs(), t2: cs({ tac_tu_id: 't2' }) },
      suDung: { t1: { ngay: 0, thang: 18_000_000 }, t2: { ngay: 0, thang: 17_000_000 } },
      nguoiNhan: [nguoiNhan({ id: 'moi', created_at: '2026-09-15T00:00:00Z' })],
      now: NOW,
    });
    expect(ds.map((m) => m.khoa)).toEqual(['doi-tk-B', 'qua-han-Q', 'han-muc-t1', 'nguoi-nhan-moi']);
    expect(ds[2].mo).toContain('90%');
  });

  it('biểu đồ có đủ ngày 1 tới hôm nay, cộng theo ngày giờ Việt Nam', () => {
    const ds = giuTheoNgay(
      [
        { tac_tu_id: 't1', so_tien: 100, created_at: HOM_NAY },
        { tac_tu_id: 't1', so_tien: 50, created_at: HOM_NAY },
        // 23:30 ngày 14/09 giờ VN là 16:30 UTC — vẫn là ngày 14.
        { tac_tu_id: 't1', so_tien: 7, created_at: '2026-09-14T16:30:00Z' },
        { tac_tu_id: 't1', so_tien: 999, created_at: THANG_TRUOC },
      ],
      NOW,
    );
    expect(ds).toHaveLength(15);
    expect(ds[14]).toEqual({ ngay: 15, tong: 150 });
    expect(ds[13]).toEqual({ ngay: 14, tong: 7 });
    expect(ds.reduce((s, d) => s + d.tong, 0)).toBe(157);
  });
});

describe('ngân sách quanh một khoản', () => {
  it('khoản đang giữ hạn mức: cột "không tính" trừ chính nó ra', () => {
    const r = nganSachQuanhKhoan(yc({ so_tien: 2_000_000 }), cs(), { ngay: 3_000_000, thang: 8_000_000 }, NOW)!;
    expect(r.daTinh).toBe(true);
    expect(r.dong).toEqual([
      { nhan: 'Hôm nay', tran: 5_000_000, khongTinh: 1_000_000, tinhCa: 3_000_000 },
      { nhan: 'Tháng này', tran: 20_000_000, khongTinh: 6_000_000, tinhCa: 8_000_000 },
    ]);
  });

  it('khoản bị từ chối không giữ hạn mức: cột "tính cả" cho biết nếu nó được tính', () => {
    const r = nganSachQuanhKhoan(yc({ so_tien: 9_000_000, trang_thai: 'tu_choi' }), cs(), { ngay: 3_000_000, thang: 8_000_000 }, NOW)!;
    expect(r.daTinh).toBe(false);
    expect(r.dong[0]).toEqual({ nhan: 'Hôm nay', tran: 5_000_000, khongTinh: 3_000_000, tinhCa: 12_000_000 });
  });

  it('khoản hôm qua chỉ có dòng tháng; khoản tháng trước hoặc không có chính sách thì không tính', () => {
    expect(nganSachQuanhKhoan(yc({ created_at: HOM_QUA }), cs(), undefined, NOW)!.dong.map((d) => d.nhan)).toEqual(['Tháng này']);
    expect(nganSachQuanhKhoan(yc({ created_at: THANG_TRUOC }), cs(), undefined, NOW)).toBeNull();
    expect(nganSachQuanhKhoan(yc({}), undefined, undefined, NOW)).toBeNull();
  });
});

describe('tiến trình', () => {
  const trangThai = (y: YeuCau) => tienTrinh(y).map((b) => b.trangThai);

  it('đã chi: đủ năm bước, giờ đối soát lấy từ sao kê', () => {
    const b = tienTrinh(yc({ trang_thai: 'da_chi', cach_quyet: 'tu_dong', quyet_luc: HOM_NAY, da_chi_luc: HOM_NAY }));
    expect(b.map((x) => x.trangThai)).toEqual(['xong', 'xong', 'xong', 'xong', 'xong']);
    expect(b[3].luc).toBeNull();
    expect(b[4].luc).toBe(HOM_NAY);
  });

  it('luật từ chối: dừng ở đánh giá', () => {
    expect(trangThai(yc({ trang_thai: 'tu_choi', ly_do: ma('VUOT_HAN_MUC_NGAY'), quyet_luc: HOM_NAY }))).toEqual(['xong', 'dung', 'dung', 'dung', 'dung']);
  });

  it('chờ duyệt và chờ trả', () => {
    expect(trangThai(yc({ ly_do: ma('TREN_NGUONG_DUYET') }))).toEqual(['xong', 'xong', 'dang', 'cho', 'cho']);
    expect(trangThai(yc({ trang_thai: 'da_duyet', cach_quyet: 'nguoi_duyet', ly_do: ma('TREN_NGUONG_DUYET') }))).toEqual(['xong', 'xong', 'xong', 'dang', 'cho']);
  });

  it('huỷ sau khi duyệt dừng ở thanh toán', () => {
    expect(trangThai(yc({ trang_thai: 'huy', cach_quyet: 'tu_dong', ly_do: ma('TRONG_CHINH_SACH') }))).toEqual(['xong', 'xong', 'xong', 'dung', 'dung']);
  });
});

describe('người nhận', () => {
  const nn = (x: Partial<NguoiNhan>): NguoiNhan => ({
    company_id: 'c', created_at: THANG_TRUOC, ghi_chu: null, id: 'n', ngan_hang_bin: '970422', so_tai_khoan: '0123456789',
    ten_chu_tai_khoan: 'CONG TY ABC', ...x,
  });

  it('giữ 24 giờ tính từ lúc thêm', () => {
    expect(thoiGianGiu(nn({ created_at: '2026-09-15T00:00:00Z' }), NOW)).toEqual({ moi: true, conGio: 19 });
    expect(thoiGianGiu(nn({ created_at: HOM_QUA }), NOW)).toEqual({ moi: false, conGio: 0 });
  });

  it('cùng tên khác dấu mà khác số tài khoản thì gom cảnh báo; trùng hẳn thì không', () => {
    const g = nhomTrungTen([
      nn({ id: '1', ten_chu_tai_khoan: 'Đinh Văn Nam', so_tai_khoan: '111111' }),
      nn({ id: '2', ten_chu_tai_khoan: 'DINH VAN NAM', so_tai_khoan: '222222', ngan_hang_bin: '970436' }),
      nn({ id: '3', ten_chu_tai_khoan: 'Công ty ABC' }),
    ]);
    expect(g).toHaveLength(1);
    expect(g[0].map((n) => n.id)).toEqual(['1', '2']);
  });
});

describe('kiểm tra trước khi tạo yêu cầu', () => {
  const nn = (x: Partial<NguoiNhan>): NguoiNhan => ({
    company_id: 'c', created_at: THANG_TRUOC, ghi_chu: null, id: 'n', ngan_hang_bin: '970422', so_tai_khoan: '0123456789',
    ten_chu_tai_khoan: 'CONG TY ABC', ...x,
  });
  const nhap = (x: Partial<{ soTien: number; nhomChi: string; nganHangBin: string; soTaiKhoan: string }> = {}) => ({
    soTien: 500_000, nhomChi: 'ha_tang_ai', nganHangBin: '970422', soTaiKhoan: '0123456789', ...x,
  });
  const agent = tacTu({});

  it('trong hạn mức, người nhận cũ, dưới ngưỡng: sẽ tự duyệt', () => {
    const r = kiemTruocYeuCau(nhap(), agent, cs({ nguong_can_duyet: 1_000_000 }), { ngay: 0, thang: 0 }, [nn({})], NOW);
    expect(r.ketLuan).toBe('tu_dong_duyet');
  });

  it('vượt hạn mức ngày: sẽ bị từ chối, nói còn bao nhiêu', () => {
    const r = kiemTruocYeuCau(nhap(), agent, cs({ nguong_can_duyet: 1_000_000 }), { ngay: 4_800_000, thang: 4_800_000 }, [nn({})], NOW);
    expect(r.ketLuan).toBe('tu_choi');
    expect(r.dong.map((d) => d.cau).join(' ')).toContain('hôm nay còn 200.000đ');
  });

  it('người nhận lạ: từ chối nếu chính sách chặn, cần duyệt nếu chính sách hỏi', () => {
    const la = nhap({ soTaiKhoan: '999999999' });
    expect(kiemTruocYeuCau(la, agent, cs({ nguong_can_duyet: 1_000_000 }), undefined, [nn({})], NOW).ketLuan).toBe('tu_choi');
    expect(kiemTruocYeuCau(la, agent, cs({ nguong_can_duyet: 1_000_000, chi_tra_nguoi_nhan_da_duyet: false }), undefined, [nn({})], NOW).ketLuan).toBe('cho_duyet');
  });

  it('người nhận mới thêm dưới 24 giờ, hoặc ngưỡng 0: cần duyệt', () => {
    expect(kiemTruocYeuCau(nhap(), agent, cs({ nguong_can_duyet: 1_000_000 }), undefined, [nn({ created_at: '2026-09-15T04:00:00Z' })], NOW).ketLuan).toBe('cho_duyet');
    expect(kiemTruocYeuCau(nhap(), agent, cs({ nguong_can_duyet: 0 }), undefined, [nn({})], NOW).ketLuan).toBe('cho_duyet');
  });

  it('agent tạm dừng hoặc nhóm chi không được phép: sẽ bị từ chối', () => {
    expect(kiemTruocYeuCau(nhap(), tacTu({ trang_thai: 'tam_dung' }), cs({ nguong_can_duyet: 1_000_000 }), undefined, [nn({})], NOW).ketLuan).toBe('tu_choi');
    expect(kiemTruocYeuCau(nhap({ nhomChi: 'quang_cao' }), agent, cs({ nguong_can_duyet: 1_000_000, nhom_chi_duoc_phep: ['ha_tang_ai'] }), undefined, [nn({})], NOW).ketLuan).toBe('tu_choi');
  });
});

describe('lọc yêu cầu', () => {
  const ds = [
    yc({ id: 'A', ten_nguoi_nhan: 'Công ty In Ấn', ly_do: ma('TREN_NGUONG_DUYET') }),
    yc({ id: 'D', trang_thai: 'tu_choi', muc_dich: 'Quảng cáo tuần' }),
  ];

  it('lọc theo trạng thái và tìm không phân biệt dấu', () => {
    expect(locYeuCau(ds, { trangThai: 'tu_choi', tim: '' }, {}).map((y) => y.id)).toEqual(['D']);
    expect(locYeuCau(ds, { trangThai: 'tat_ca', tim: 'in an' }, {}).map((y) => y.id)).toEqual(['A']);
    expect(locYeuCau(ds, { trangThai: 'tat_ca', tim: 'bot-a' }, { t1: 'bot-a' }).map((y) => y.id)).toEqual(['A', 'D']);
  });
});
