import { describe, expect, it } from 'vitest';
import { HanhDongSchema, kiemHanhDong, khopGiaTri, NhiemVuSchema, type NhiemVu, type NguCanhLuat } from './hopDong';

const nv: NhiemVu = {
  id: '11111111-1111-4111-8111-111111111111',
  nguoi_dung_id: '22222222-2222-4222-8222-222222222222',
  cong_ty_id: '33333333-3333-4333-8333-333333333333',
  nhap_id: '44444444-4444-4444-8444-444444444444',
  ma_bam_nhap: 'a'.repeat(64),
  ma_bam_ke_hoach: 'b'.repeat(64),
  nang_luc: 'dien_bieu_mau',
  bo_chuyen: 'tkn-cnkd-thu',
  phien_ban_bo_chuyen: '0.1.0',
  origin_cho_phep: ['http://127.0.0.1:*'],
  het_han: '2026-10-10T10:30:00.000Z',
  khoa_chong_trung: 'khoa-chong-trung-01',
  chu_the: { mst: '0123456789', ten: 'Hộ thử', ky_loai: 'nam', nam: 2025 },
  truong: [{ khoa: 'dt_08a', nhan: '[08a]', kieu: 'so_tien', gia_tri: '812345678' }, { khoa: 'ky_loai', nhan: '[01]', kieu: 'chon', gia_tri: 'nam' }],
};
const ctx = (sua: Partial<NguCanhLuat> = {}): NguCanhLuat => ({
  nhiemVu: nv,
  urlTab: 'http://127.0.0.1:5000/',
  khoaBoChuyen: new Set(['dt_08a', 'ky_loai', 'nop']),
  khoaDuocBam: new Set(),
  coGhiChuaRo: false,
  bayGio: new Date('2026-10-10T10:00:00Z'),
  originHopLe: (u) => u.startsWith('http://127.0.0.1:'),
  ...sua,
});

describe('hợp đồng nhiệm vụ', () => {
  it('nhiệm vụ đúng khuôn qua được; thiếu revision/hash, sai năng lực, thừa trường lạ ở hành động thì không', () => {
    expect(NhiemVuSchema.safeParse(nv).success).toBe(true);
    expect(NhiemVuSchema.safeParse({ ...nv, ma_bam_nhap: 'abc' }).success).toBe(false);
    expect(NhiemVuSchema.safeParse({ ...nv, nang_luc: 'nop_to_khai' }).success).toBe(false);
    expect(NhiemVuSchema.safeParse({ ...nv, truong: [{ khoa: 'Dt-08A;drop', nhan: 'x', kieu: 'so_tien', gia_tri: '1' }] }).success).toBe(false);
  });
  it('không có loại hành động "nộp", "ký", "chạy script", "selector tuỳ ý"', () => {
    for (const loai of ['nop', 'ky_so', 'chay_js', 'shell', 'nhap_otp', 'thanh_toan']) {
      expect(HanhDongSchema.safeParse({ loai }).success).toBe(false);
    }
    expect(HanhDongSchema.safeParse({ loai: 'dien', khoa: '#dt-08a' }).success).toBe(false);
  });
});

describe('luật hành động — chạy trong executor', () => {
  it('ô có trong bộ chuyển và nhiệm vụ: được ghi', () => expect(kiemHanhDong({ loai: 'dien', khoa: 'dt_08a' }, ctx())).toBeNull());
  it('ký, nộp, OTP, thanh toán: chặn theo tên, kể cả khi bộ chuyển (hay chữ trên trang) đưa vào', () => {
    expect(kiemHanhDong({ loai: 'bam_duoc_phep', khoa: 'nop' }, ctx({ khoaDuocBam: new Set(['nop']) }))).toMatch(/Không bao giờ/);
    expect(kiemHanhDong({ loai: 'dien', khoa: 'otp' }, ctx())).toMatch(/Không bao giờ/);
    expect(kiemHanhDong({ loai: 'bam_duoc_phep', khoa: 'ky_so' }, ctx())).toMatch(/Không bao giờ/);
  });
  it('điều hướng hoặc tab ở ngoài phạm vi: chặn', () => {
    expect(kiemHanhDong({ loai: 'dieu_huong', url: 'https://evil.example/' }, ctx())).toMatch(/ngoài phạm vi/);
    expect(kiemHanhDong({ loai: 'dien', khoa: 'dt_08a' }, ctx({ urlTab: 'https://evil.example/' }))).toMatch(/ngoài phạm vi/);
  });
  it('lần ghi trước chưa rõ kết quả: chặn mọi lần ghi tiếp, không tự thử lại', () => {
    expect(kiemHanhDong({ loai: 'dien', khoa: 'dt_08a' }, ctx({ coGhiChuaRo: true }))).toMatch(/chưa rõ/);
  });
  it('ô không có trong nhiệm vụ hoặc bộ chuyển; nhiệm vụ hết hạn: chặn. Dừng và bàn giao luôn được.', () => {
    expect(kiemHanhDong({ loai: 'dien', khoa: 'dt_09a' }, ctx())).not.toBeNull();
    expect(kiemHanhDong({ loai: 'dien', khoa: 'dt_08a' }, ctx({ bayGio: new Date('2026-10-10T11:00:00Z') }))).toMatch(/hết hạn/);
    expect(kiemHanhDong({ loai: 'dung', ly_do: 'người dùng bấm' }, ctx({ urlTab: 'https://evil.example/' }))).toBeNull();
    expect(kiemHanhDong({ loai: 'ban_giao', ly_do: 'xong' }, ctx())).toBeNull();
  });
});

describe('đối chiếu giá trị đọc lại', () => {
  it('tiền: chấp nhận dấu chấm/phẩy nghìn của cổng; số lẻ thập phân, chữ, rỗng là lệch', () => {
    expect(khopGiaTri('so_tien', '812345678', '812.345.678')).toBe(true);
    expect(khopGiaTri('so_tien', '812345678', '812,345,678')).toBe(true);
    expect(khopGiaTri('so_tien', '8500000000000', '8.500.000.000.000')).toBe(true);
    expect(khopGiaTri('so_tien', '812345678', '812.345.678,00')).toBe(false);
    expect(khopGiaTri('so_tien', '812345678', '0')).toBe(false);
    expect(khopGiaTri('so_tien', '0', '')).toBe(false);
    expect(khopGiaTri('so_tien', '812345678', null)).toBe(false);
  });
  it('chọn, chữ, đánh dấu: phải đúng nguyên giá trị', () => {
    expect(khopGiaTri('chon', 'nam', 'nam')).toBe(true);
    expect(khopGiaTri('chon', 'nam', '6_thang_dau')).toBe(false);
    expect(khopGiaTri('danh_dau', 'co', 'khong')).toBe(false);
  });
});
