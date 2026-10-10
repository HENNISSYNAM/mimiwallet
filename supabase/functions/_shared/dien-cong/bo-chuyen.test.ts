import { describe, expect, it } from 'vitest';
import { BO_CHUYEN, chuanTien, coBatDienCong, kiemPhien, layTruongTKN, originHopLe, timBoChuyen } from './bo-chuyen';
import { CHUYEN_PHIEN, dongNhatKyHopLe, duocChuyen } from './luu';

const dong = (ma: string, tong: number | null, khac: Record<string, number | null> = {}) => ({ ma, o: { tong_dt: tong, thue_gtgt: null, thue_tncn: null, ...khac } });
const nhapHopLe = (sua: Partial<{ dong: unknown[]; mau: string; san_sang: unknown }> = {}) => ({
  mau: '01/TKN-CNKD',
  danh_dau: [{ nhan: 'Hộ ≤ 1 tỷ', chon: true }, { nhan: 'Mới ra kinh doanh', chon: false }],
  dong: [dong('[08]', null), dong('[08a]', 800_000_000), dong('[08b]', 12_345_678), dong('[08c]', 0), dong('[08d]', null), dong('[08e]', 0),
    dong('[09]', null), dong('[09a]', 0), dong('[10]', null), dong('[11]', 812_345_678)],
  san_sang: { trang_thai: 'san_sang' },
  ...sua,
});
const hoSo = { mst: '0123456789', ten: 'Hộ kinh doanh thử' };

describe('lấy ô cần điền từ bản nháp máy chủ (01/TKN-CNKD)', () => {
  it('bản nháp hợp lệ: chép đúng số, tổng [11] khớp tổng dòng, có chủ thể để kiểm trên cổng', () => {
    const r = layTruongTKN(nhapHopLe(), { loai: 'nam', nam: 2025 }, hoSo);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.chu_the).toEqual({ mst: '0123456789', ten: 'Hộ kinh doanh thử', ky_loai: 'nam', nam: 2025 });
    const theo = Object.fromEntries(r.truong.map((t) => [t.khoa, t.gia_tri]));
    expect(theo).toMatchObject({ ky_loai: 'nam', ky_nam: '2025', dd_1: 'co', dd_2: 'khong', dt_08a: '800000000', dt_08b: '12345678', dt_08d: '0', dt_11: '812345678' });
  });

  it('tổng [11] không bằng tổng các dòng: từ chối, không điền một bản nháp mâu thuẫn', () => {
    const d = nhapHopLe({ dong: [dong('[08a]', 100), dong('[08b]', 50), dong('[11]', 999)] });
    const r = layTruongTKN(d, { loai: 'nam', nam: 2025 }, hoSo);
    expect(r.ok).toBe(false);
  });

  it('có số ở dòng ngoài phạm vi (bán qua sàn [09a]) hoặc có số thuế phải nộp: từ chối thay vì điền một phần', () => {
    expect(layTruongTKN(nhapHopLe({ dong: [dong('[08a]', 10), dong('[09a]', 5), dong('[11]', 15)] }), { loai: 'nam', nam: 2025 }, hoSo).ok).toBe(false);
    expect(layTruongTKN(nhapHopLe({ dong: [dong('[08a]', 10, { thue_gtgt: 1 }), dong('[11]', 10)] }), { loai: 'nam', nam: 2025 }, hoSo).ok).toBe(false);
  });

  it('bản nháp còn vướng mắc chặn, thiếu MST, sai mẫu, sai kỳ: từ chối', () => {
    expect(layTruongTKN(nhapHopLe({ san_sang: { trang_thai: 'bi_chan' } }), { loai: 'nam', nam: 2025 }, hoSo).ok).toBe(false);
    expect(layTruongTKN(nhapHopLe(), { loai: 'nam', nam: 2025 }, { mst: null, ten: 'x' }).ok).toBe(false);
    expect(layTruongTKN(nhapHopLe({ mau: '01/CNKD' }), { loai: 'quy', nam: 2025 }, hoSo).ok).toBe(false);
    expect(layTruongTKN(nhapHopLe(), { loai: 'quy', nam: 2025 }, hoSo).ok).toBe(false);
  });

  it('tiền lớn và tiền hỏng: số nguyên an toàn thì giữ nguyên chữ số; số lẻ, âm, vượt 2^53 thì từ chối', () => {
    expect(chuanTien(9_007_199_254_740_991)).toBe('9007199254740991');
    expect(chuanTien(9_007_199_254_740_992)).toBeNull();
    expect(chuanTien(1234.5)).toBeNull();
    expect(chuanTien(-1)).toBeNull();
    expect(chuanTien('1000')).toBeNull();
    expect(chuanTien(null)).toBe('0');
    const lon = layTruongTKN(nhapHopLe({ dong: [dong('[08a]', 8_500_000_000_000), dong('[11]', 8_500_000_000_000)] }), { loai: 'nam', nam: 2025 }, hoSo);
    expect(lon.ok && lon.truong.find((t) => t.khoa === 'dt_11')?.gia_tri).toBe('8500000000000');
  });
});

describe('phạm vi tab và sổ bộ chuyển', () => {
  it('bộ chuyển thử chỉ nhận biểu mẫu chạy tại 127.0.0.1; cổng thật chưa xác minh thì tắt', () => {
    const thu = timBoChuyen('tkn-cnkd-thu')!;
    expect(originHopLe(thu, 'http://127.0.0.1:51234/?mst=1')).toBe(true);
    expect(originHopLe(thu, 'http://127.0.0.1/')).toBe(false);
    expect(originHopLe(thu, 'http://localhost:51234/')).toBe(false);
    expect(originHopLe(thu, 'https://evil.example/')).toBe(false);
    expect(originHopLe(thu, 'javascript:alert(1)')).toBe(false);
    const that = timBoChuyen('tkn-cnkd-cong-thue')!;
    expect(that.trang_thai).toBe('chua_xac_minh');
    expect(that.bat).toBe(false);
    expect(BO_CHUYEN.filter((b) => b.trang_thai === 'chua_xac_minh').every((b) => !b.bat)).toBe(true);
  });
});

describe('kiểm phiên trước mỗi lượt và khi tiếp tục', () => {
  const p = { trang_thai: 'dang_dien' as const, het_han: '2026-10-10T10:30:00Z', nhap_id: 'n1', ma_bam_nhap: 'a'.repeat(64), bo_chuyen: 'tkn-cnkd-thu', phien_ban: '0.1.0' };
  const ctx = { bayGio: new Date('2026-10-10T10:00:00Z'), duocSoanToKhai: true, nhapHienTai: { id: 'n1', ma_bam: 'a'.repeat(64) }, nhapMoiNhatCungKy: { id: 'n1' } };
  it('còn hạn, còn quyền, bản nháp không đổi: được đi tiếp', () => expect(kiemPhien(p, ctx)).toEqual([]));
  it('bản nháp đổi sau khi tạo kế hoạch hoặc có bản mới hơn: mất hiệu lực', () => {
    expect(kiemPhien(p, { ...ctx, nhapHienTai: { id: 'n1', ma_bam: 'b'.repeat(64) } }).join()).toMatch(/đã đổi/);
    expect(kiemPhien(p, { ...ctx, nhapMoiNhatCungKy: { id: 'n2' } }).join()).toMatch(/mới hơn/);
    expect(kiemPhien(p, { ...ctx, nhapHienTai: null }).join()).toMatch(/xoá/);
  });
  it('thu hồi quyền hoặc hết hạn: dừng', () => {
    expect(kiemPhien(p, { ...ctx, duocSoanToKhai: false }).join()).toMatch(/quyền/);
    expect(kiemPhien(p, { ...ctx, bayGio: new Date('2026-10-10T11:00:00Z') }).join()).toMatch(/hết hạn/);
  });
  it('bộ chuyển đổi phiên bản hoặc bị tắt: dừng', () => {
    expect(kiemPhien({ ...p, phien_ban: '0.0.9' }, ctx).join()).toMatch(/phiên bản/);
    expect(kiemPhien({ ...p, bo_chuyen: 'tkn-cnkd-cong-thue' }, ctx).join()).toMatch(/tắt/);
  });
});

describe('trạng thái vận hành tách khỏi trạng thái hồ sơ', () => {
  it('phiên điền không bao giờ tự thành "đã nộp", "có biên nhận", "cơ quan chấp nhận"', () => {
    const tatCa = new Set(Object.values(CHUYEN_PHIEN).flat().concat(Object.keys(CHUYEN_PHIEN) as never[]));
    for (const s of ['submitted', 'accepted', 'da_nop', 'co_bien_nhan', 'resolved']) expect(tatCa.has(s as never)).toBe(false);
  });
  it('không đi tắt: tạo → bàn giao, đã đối chiếu → điền lại, bàn giao → bất cứ đâu đều bị chặn', () => {
    expect(duocChuyen('tao', 'ban_giao')).toBe(false);
    expect(duocChuyen('da_doi_chieu', 'dang_dien')).toBe(false);
    expect(duocChuyen('ban_giao', 'dang_dien')).toBe(false);
    expect(duocChuyen('dang_dien', 'tam_dung')).toBe(true);
    expect(duocChuyen('tam_dung', 'dang_dien')).toBe(true);
    expect(duocChuyen('lech', 'ban_giao')).toBe(true);
  });
  it('nhật ký từ bộ chạy phải đúng khuôn — không nhận giá trị thô, không nhận chữ dài', () => {
    expect(dongNhatKyHopLe({ tac_nhan: 'bo_chay', hanh_dong: 'dien', khoa_truong: 'dt_08a', ket_qua: 'ok', ma_bam_gia_tri: 'c'.repeat(64) })).toBe(true);
    expect(dongNhatKyHopLe({ tac_nhan: 'bo_chay', hanh_dong: 'dien', ket_qua: 'ok', ma_bam_gia_tri: '812345678' })).toBe(false);
    expect(dongNhatKyHopLe({ tac_nhan: 'ke_la', hanh_dong: 'dien', ket_qua: 'ok' })).toBe(false);
    expect(dongNhatKyHopLe({ tac_nhan: 'bo_chay', hanh_dong: 'dien', ket_qua: 'ok', ghi_chu: 'x'.repeat(301) })).toBe(false);
  });
});

describe('cờ máy chủ DIEN_CONG_ENABLED', () => {
  it('"1" bật cho mọi công ty; danh sách id chỉ bật cho công ty có tên; trống/khác là tắt', () => {
    expect(coBatDienCong('1', 'a')).toBe(true);
    expect(coBatDienCong('cty-1, cty-2', 'cty-2')).toBe(true);
    expect(coBatDienCong('cty-1,cty-2', 'cty-3')).toBe(false);
    expect(coBatDienCong('', 'cty-1')).toBe(false);
    expect(coBatDienCong(undefined, 'cty-1')).toBe(false);
    expect(coBatDienCong('true', 'cty-1')).toBe(false);
    expect(coBatDienCong('cty-1', '')).toBe(false);
  });
});
