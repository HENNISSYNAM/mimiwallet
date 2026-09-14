import { describe, expect, it } from 'vitest';
import { tomTatDinhDanh } from './dinh-danh-mot-lan';

// Hình dạng giống phản hồi /identity: định danh ở tầng ngoài, tài khoản trong mảng.
const PHAN_HOI = {
  requestId: 'reqIdentity01',
  legalId: '001090012345',
  fullName: 'DINH VAN NAM',
  birthday: '1990-01-01',
  address: '12 Nguyen Trai, Ha Noi',
  phone: '0901234567',
  accounts: [
    { accountNumber: '2431122002', accountName: 'DINH VAN NAM', currency: 'VND', balance: 1250000 },
  ],
  meta: { issuedPlace: 'Cuc Canh sat QLHC' },
};

describe('tóm tắt định danh không mang dữ liệu định danh', () => {
  it('giữ requestId, số tài khoản và 4 số cuối', () => {
    const t = tomTatDinhDanh(PHAN_HOI);
    expect(t.requestId).toBe('reqIdentity01');
    expect(t.soTaiKhoan).toBe(1);
    expect(t.duoiTaiKhoan).toEqual(['2002']);
  });

  it('liệt kê TÊN trường, kể cả trong mảng và đối tượng con', () => {
    expect(tomTatDinhDanh(PHAN_HOI).cacTruong).toEqual([
      'accounts',
      'accounts[].accountName',
      'accounts[].accountNumber',
      'accounts[].balance',
      'accounts[].currency',
      'address',
      'birthday',
      'fullName',
      'legalId',
      'meta',
      'meta.issuedPlace',
      'phone',
    ]);
  });

  it('không một giá trị định danh nào lọt ra', () => {
    const chuoi = JSON.stringify(tomTatDinhDanh(PHAN_HOI));
    for (const giaTri of ['001090012345', 'DINH VAN NAM', '1990-01-01', 'Nguyen Trai', '0901234567', '2431122002', '1250000', 'Cuc Canh sat']) {
      expect(chuoi).not.toContain(giaTri);
    }
  });

  it('phản hồi rỗng hoặc lạ không làm hỏng', () => {
    expect(tomTatDinhDanh(null)).toEqual({ requestId: null, soTaiKhoan: 0, duoiTaiKhoan: [], cacTruong: [] });
    expect(tomTatDinhDanh({ accounts: 'x' }).soTaiKhoan).toBe(0);
  });
});
