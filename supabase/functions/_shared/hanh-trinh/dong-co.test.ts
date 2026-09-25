import { describe, expect, it } from 'vitest';
import { buocTiepTheo, cauHoiTiepTheo, dauVanTay, kiemCauTraLoi, kiemNhatQuan, nhanHanhTrinh, tinhBuoc, trangThaiHanhTrinh, type DuKien } from './dong-co';
import { DU_KIEN, LOAI_HANH_TRINH, MAU_HANH_TRINH } from './mau';

const dk = (o: Record<string, string>): DuKien =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { gia_tri: v, nguon: 'nguoi_dung' as const, luc: '2026-09-25T00:00:00Z', boi: 'u' }]));

describe('mẫu hành trình', () => {
  it('đủ 12 loại; mọi dữ kiện được hỏi đều có câu hỏi; khoá bước duy nhất', () => {
    expect(Object.keys(MAU_HANH_TRINH).sort()).toEqual([...LOAI_HANH_TRINH].sort());
    for (const [loai, m] of Object.entries(MAU_HANH_TRINH)) {
      const khoa = m.buoc.map((b) => b.khoa);
      expect(new Set(khoa).size, loai).toBe(khoa.length);
      for (const b of m.buoc) for (const k of b.du_kien_can) expect(DU_KIEN[k], `${loai}.${b.khoa}.${k}`).toBeTruthy();
    }
  });

  it('không mẫu nào tự viết hạn luật, số điều hay mã thủ tục', () => {
    const chu = JSON.stringify(MAU_HANH_TRINH) + JSON.stringify(DU_KIEN);
    expect(chu).not.toMatch(/Điều \d+|Nghị định|Thông tư|\d+ ngày làm việc|mẫu số \d/i);
  });
});

describe('hỏi từng câu một', () => {
  it('"Tôi muốn tạm ngừng" → câu đầu tiên là ngày bắt đầu tạm ngừng', () => {
    const b = tinhBuoc('suspension', {});
    expect(cauHoiTiepTheo(b, {})?.cau).toBe('Bạn muốn bắt đầu tạm ngừng từ ngày nào?');
  });

  it('trả lời xong thì hỏi câu kế, không hỏi lại câu cũ', () => {
    const d = dk({ tam_ngung_tu: '2026-10-01' });
    expect(cauHoiTiepTheo(tinhBuoc('suspension', d), d)?.khoa).toBe('tam_ngung_den');
  });

  it('bước cần dữ kiện chưa có thì bị chặn, nói rõ cần biết gì', () => {
    const b = tinhBuoc('suspension', {}).find((x) => x.khoa === 'tra_thu_tuc')!;
    expect(b.trang_thai).toBe('blocked');
    expect(b.ly_do_chan).toContain('Bạn muốn bắt đầu tạm ngừng từ ngày nào?');
  });

  it('đủ dữ kiện: bước mở, hành trình không còn câu hỏi', () => {
    const d = dk({ tam_ngung_tu: '2026-10-01', tam_ngung_den: '2026-12-31' });
    const b = tinhBuoc('suspension', d);
    expect(cauHoiTiepTheo(b, d)).toBeNull();
    expect(b.find((x) => x.khoa === 'tra_thu_tuc')!.trang_thai).toBe('ready');
    expect(buocTiepTheo(b)?.khoa).toBe('nghia_vu_con_treo');
  });
});

describe('rẽ nhánh theo dữ kiện', () => {
  it('đã có MST thì bỏ bước đăng ký thuế; chưa có thì mở', () => {
    const co = tinhBuoc('business_start', dk({ loai_chu_the: 'ho_kinh_doanh', da_co_mst: 'co' }));
    expect(co.find((b) => b.khoa === 'dang_ky_thue')!.trang_thai).toBe('skipped');
    const chua = tinhBuoc('business_start', dk({ loai_chu_the: 'ho_kinh_doanh', da_co_mst: 'khong' }));
    expect(chua.find((b) => b.khoa === 'dang_ky_thue')!.trang_thai).toBe('ready');
  });

  it('hoá đơn chưa kê khai thì không hỏi khai bổ sung', () => {
    const b = tinhBuoc('invoice_correction', dk({ so_hoa_don: '123', hoa_don_sai_o_dau: 'mst_nguoi_mua', da_gui_nguoi_mua: 'co', da_ke_khai_hoa_don: 'khong' }));
    expect(b.find((x) => x.khoa === 'ke_khai_bo_sung')!.trang_thai).toBe('skipped');
  });
});

describe('trạng thái hành trình', () => {
  it('chờ bên ngoài khi người dùng đã nộp', () => {
    const d = dk({ tam_ngung_tu: '2026-10-01', tam_ngung_den: '2026-12-31' });
    const b = tinhBuoc('suspension', d, { nguoi_dung_nop: 'waiting_external' });
    expect(trangThaiHanhTrinh(b)).toBe('cho_ben_ngoai');
  });

  it('chỉ hoàn tất khi mọi bước xong hoặc bỏ qua — kể cả bước kiểm kết quả', () => {
    const d = dk({ tam_ngung_tu: '2026-10-01', tam_ngung_den: '2026-12-31' });
    const gan = tinhBuoc('suspension', d, { nghia_vu_con_treo: 'completed', tra_thu_tuc: 'completed', nguoi_dung_nop: 'completed' });
    expect(trangThaiHanhTrinh(gan)).not.toBe('hoan_tat');
    const xong = tinhBuoc('suspension', d, { nghia_vu_con_treo: 'completed', tra_thu_tuc: 'completed', nguoi_dung_nop: 'completed', kiem_ket_qua: 'completed' });
    expect(trangThaiHanhTrinh(xong)).toBe('hoan_tat');
  });
});

describe('kiểm câu trả lời', () => {
  it('lựa chọn ngoài danh sách, ngày sai, tháng sai đều bị từ chối', () => {
    expect(kiemCauTraLoi('da_co_mst', 'maybe').ok).toBe(false);
    expect(kiemCauTraLoi('tam_ngung_tu', '01/10/2026').ok).toBe(false);
    expect(kiemCauTraLoi('tam_ngung_tu', '1900-01-01').ok).toBe(false);
    expect(kiemCauTraLoi('tu_thang', '2026-13').ok).toBe(false);
    expect(kiemCauTraLoi('khoa_la', 'x').ok).toBe(false);
    expect(kiemCauTraLoi('tam_ngung_tu', ' 2026-10-01 ')).toEqual({ ok: true, gia_tri: '2026-10-01' });
  });

  it('ngày tạm ngừng tới phải sau ngày bắt đầu', () => {
    expect(kiemNhatQuan({ tam_ngung_tu: '2026-10-01', tam_ngung_den: '2026-09-01' })).toContain('phải sau');
    expect(kiemNhatQuan({ tam_ngung_tu: '2026-10-01', tam_ngung_den: '2026-12-01' })).toBeNull();
  });
});

describe('nhận hành trình từ câu nói (Prompt 4 mục 40)', () => {
  it.each([
    ['Tôi vừa mở hộ kinh doanh, cần làm gì?', 'business_start'],
    ['Hóa đơn này sai MST.', 'invoice_correction'],
    ['Thuế yêu cầu tôi giải trình.', 'authority_response'],
    ['Tôi muốn tạm ngừng.', 'suspension'],
    ['Tôi muốn đóng hộ kinh doanh.', 'closure'],
    ['Tôi muốn kinh doanh trở lại', 'resumption'],
    ['Công ty chuẩn bị giải thể', 'dissolution'],
  ])('%s → %s', (cau, loai) => expect(nhanHanhTrinh(cau)).toBe(loai));

  it('câu hỏi số liệu thường không mở hành trình', () => {
    expect(nhanHanhTrinh('Chi phí tháng này bao nhiêu?')).toBeNull();
    expect(nhanHanhTrinh('Khoản nào chưa khớp hóa đơn?')).toBeNull();
  });

  it('dấu vân tay: cùng hoá đơn một hồ sơ, khác hoá đơn hai hồ sơ', () => {
    expect(dauVanTay('invoice_correction', { so_hoa_don: '1' })).toBe(dauVanTay('invoice_correction', { so_hoa_don: '1' }));
    expect(dauVanTay('invoice_correction', { so_hoa_don: '1' })).not.toBe(dauVanTay('invoice_correction', { so_hoa_don: '2' }));
  });
});
