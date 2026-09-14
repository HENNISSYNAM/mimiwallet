import { describe, expect, it } from 'vitest';
import { kiemGrantQr, ketLuanLoiGrant, nhanKetLuan } from './kiem-grant-qr';

const loiCas = (errorCode: string) => Object.assign(new Error(errorCode), { errorCode });

describe('hỏi Cas xem grant QR còn sống không', () => {
  it('Cas trả lời bình thường thì còn sống', async () => {
    expect(await kiemGrantQr(async () => ({ accountNumber: '2431122002' }))).toEqual({ trangThai: 'song' });
  });

  it('grant bị thu hồi — đúng tình huống case 10 ngày 12/09', async () => {
    expect(await kiemGrantQr(async () => { throw loiCas('GRANT_NOT_FOUND'); })).toEqual({
      trangThai: 'da_thu_hoi',
      ma: 'GRANT_NOT_FOUND',
    });
    expect((await kiemGrantQr(async () => { throw loiCas('USER_PERMISSION_REVOKED'); })).trangThai).toBe('da_thu_hoi');
  });

  it('giới hạn lượt gọi không phải là thu hồi', async () => {
    expect(await kiemGrantQr(async () => { throw loiCas('RATE_LIMIT'); })).toEqual({ trangThai: 'gioi_han' });
  });

  it('mã lạ thì chưa rõ, giữ mã để đọc — không ngắt nhầm', async () => {
    expect(await kiemGrantQr(async () => { throw loiCas('GRANT_LOGIN_REQUIRED'); })).toEqual({
      trangThai: 'chua_ro',
      ma: 'GRANT_LOGIN_REQUIRED',
    });
    expect(ketLuanLoiGrant('GRANT_NOT_PERMISSION').trangThai).toBe('chua_ro');
  });

  it('lỗi mạng không mang mã Cas thì không nói gì về grant', async () => {
    expect(await kiemGrantQr(async () => { throw new TypeError('fetch failed'); })).toEqual({
      trangThai: 'chua_ro',
      ma: 'LOI_KET_NOI',
    });
  });

  it('nhãn nhật ký phân biệt được bốn kết luận', () => {
    expect(nhanKetLuan({ trangThai: 'song' })).toBe('alive:qr-da-hoi-cas');
    expect(nhanKetLuan({ trangThai: 'da_thu_hoi', ma: 'GRANT_NOT_FOUND' })).toBe('da-thu-hoi:GRANT_NOT_FOUND');
    expect(nhanKetLuan({ trangThai: 'gioi_han' })).toBe('rate-limited');
    expect(nhanKetLuan({ trangThai: 'chua_ro', ma: 'X' })).toBe('chua-ro:X');
  });
});
