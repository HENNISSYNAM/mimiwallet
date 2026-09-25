import { describe, expect, it } from 'vitest';
import { chonThuTuc, maMauTrongCau, type ThuTucThue } from './thu-tuc';
import { thuTucThue } from './tinh-toan';
import { nhanYDinh } from './y-dinh';

// Tên và mã thật, lấy từ dichvucong.gdt.gov.vn ngày 25/09/2026.
const t = (ma: string, ten: string, mau: string[] = []): ThuTucThue => ({
  ma, ten, mau_to_khai: mau, doi_tuong: 'Tổ chức, cá nhân', co_quan: 'Thuế cơ sở', cach_thuc: '+ Trực tuyến',
  thanh_phan_ho_so: '+ Thành phần hồ sơ gồm: ...', ket_qua: 'Thông báo', can_cu_phap_ly: null,
  nguon: `https://dichvucong.gdt.gov.vn/tthc/homelogin/chi-tiet-tthc?maTTHC=${ma}`, lay_luc: '2026-09-25T10:40:00+0700',
});
const DS = [
  t('1.007042', 'Đăng ký thuế trong trường hợp tạm ngừng hoạt động, kinh doanh; tiếp tục hoạt động, kinh doanh trước thời hạn'),
  t('1.007607', 'Chấm dứt hiệu lực mã số thuế'),
  t('1.014979', 'Hoàn nộp thừa các loại thuế đối với hộ kinh doanh, cá nhân kinh doanh'),
  t('1.011022', 'Khai thuế đối với hộ kinh doanh, cá nhân kinh doanh nộp thuế theo phương pháp kê khai', ['01-2/BK-HĐKD', '01/CNKD']),
  t('1.008590', 'Gia hạn nộp thuế'),
  t('1.008513', 'Gia hạn nộp hồ sơ khai thuế'),
  t('1.010990', 'Khai tạm tính tiền lãi dầu, khí nước chủ nhà đối với hoạt động dầu khí'),
  t('1.009824', 'Thông báo địa điểm kinh doanh của hộ kinh doanh, cá nhân kinh doanh'),
];

describe('chọn thủ tục theo câu hỏi', () => {
  it.each([
    ['Tôi muốn tạm ngừng kinh doanh thì cần hồ sơ gì?', '1.007042'],
    ['Tôi nghỉ bán rồi thì làm sao', '1.007042'],
    ['Đóng mã số thuế', '1.007607'],
    ['giải thể công ty', '1.007607'],
    ['Hoàn thuế nộp thừa cho hộ kinh doanh', '1.014979'],
    ['mẫu 01/CNKD nộp ở đâu', '1.011022'],
    ['gia hạn nộp thuế', '1.008590'],
  ])('%s → %s', (cau, ma) => {
    expect(chonThuTuc(cau, DS)[0]?.ma).toBe(ma);
  });

  it('không khớp đủ thì trả rỗng — không đoán thủ tục', () => {
    expect(chonThuTuc('hôm nay trời đẹp', DS)).toEqual([]);
  });

  it('đọc mã mẫu trong câu', () => {
    expect(maMauTrongCau('Nộp 23/ĐK-TCT và 01-2/BK-HĐKD.')).toEqual(['23/ĐK-TCT', '01-2/BK-HĐKD']);
  });
});

describe('trợ lý: thủ tục thuế', () => {
  // deno-lint-ignore no-explicit-any
  const du = (thuTuc: ThuTucThue[] | null) => ({ thuTuc }) as any;

  it('trích điều cổng ghi, kèm trang gốc và ngày lấy, và nói căn cứ trên trang có thể cũ', () => {
    const r = thuTucThue(du([DS[3], DS[0]]));
    expect(r.tom_tat).toContain('1.011022');
    expect(r.tom_tat).toContain('01/CNKD');
    const bang = r.the[0] as { dong: string[][] };
    expect(bang.dong.find((d) => d[0] === 'Trang gốc')?.[1]).toContain('maTTHC=1.011022');
    const ghiChu = r.the.map((x) => ('cau' in x ? x.cau : '')).join(' ');
    expect(ghiChu).toContain('25/09/2026');
    expect(ghiChu).toContain('chưa cập nhật');
    expect(ghiChu).toContain('Có thể bạn cần');
  });

  it('không tìm thấy thì nói thật', () => {
    expect(thuTucThue(du([])).tom_tat).toContain('chưa tìm thấy');
    expect(thuTucThue(du(null)).tom_tat).toContain('Chưa tra được');
  });

  it.each(['Tạm ngừng kinh doanh cần hồ sơ gì', 'Đóng mã số thuế thế nào', 'Hồ sơ gồm những gì để hoàn thuế', 'gia hạn nộp thuế'])('nhận ra: %s', (c) => {
    expect(nhanYDinh(c)[0]).toBe('thu_tuc_thue');
  });

  // Prompt 4 (25/09/2026): nói Ý MUỐN làm thì mở hành trình trước, thủ tục đi kèm.
  it('"Tôi muốn tạm ngừng kinh doanh" → hành trình, rồi thủ tục', () => {
    expect(nhanYDinh('Tôi muốn tạm ngừng kinh doanh').slice(0, 2)).toEqual(['hanh_trinh', 'thu_tuc_thue']);
  });

  it('câu hỏi nghĩa vụ thuế vẫn đi đường cũ', () => {
    expect(nhanYDinh('Năm nay tôi phải khai thuế gì?')[0]).toBe('nghia_vu_thue');
  });
});
