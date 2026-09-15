import { webcrypto } from 'node:crypto';
import { describe, expect, it } from 'vitest';

// jsdom không có crypto.subtle; trình duyệt thì có sẵn.
if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
import { giaiMaSaoLuu, maHoaSaoLuu } from './saoLuuMaHoa';
import { bamHex, noiDungChuanChungTu, noiDungChuanHoaDon, thoiDiemUtc } from './chuanHoaChungTu';

describe('sao lưu mã hoá', () => {
  it('mã hoá rồi giải mã đúng mật khẩu ra đúng dữ liệu; bản mã không chứa bản rõ', async () => {
    const du = { chung_tu: [{ ben_ban: 'Công ty Đồng Tâm', tong_tien: 1_100_000 }] };
    const tep = await maHoaSaoLuu(du, 'mat-khau-dai-du', 2000);
    expect(JSON.stringify(tep)).not.toContain('Đồng Tâm');
    expect(await giaiMaSaoLuu(tep, 'mat-khau-dai-du')).toEqual(du);
  });

  it('sai mật khẩu hoặc sửa một byte thì không mở được', async () => {
    const tep = await maHoaSaoLuu({ a: 1 }, 'mat-khau-dai-du', 2000);
    await expect(giaiMaSaoLuu(tep, 'mat-khau-sai-roi')).rejects.toThrow('Sai mật khẩu');
    const bin = Uint8Array.from(atob(tep.du_lieu), (c) => c.charCodeAt(0));
    bin[0] ^= 1;
    const sua = { ...tep, du_lieu: btoa(String.fromCharCode(...bin)) };
    await expect(giaiMaSaoLuu(sua, 'mat-khau-dai-du')).rejects.toThrow('Sai mật khẩu');
  });

  it('mật khẩu ngắn và tệp lạ bị từ chối', async () => {
    await expect(maHoaSaoLuu({}, 'ngan')).rejects.toThrow('ít nhất');
    await expect(giaiMaSaoLuu({ dinh_dang: 'khac' }, 'mat-khau-dai-du')).rejects.toThrow('không phải tệp sao lưu');
    await expect(giaiMaSaoLuu({ dinh_dang: 'mimi-sao-luu', phien_ban: 1, kdf: 'PBKDF2-SHA256', so_vong: 1, muoi: '', iv: '', du_lieu: '' }, 'mat-khau-dai-du')).rejects.toThrow('thông số lạ');
  });
});

describe('nội dung chuẩn hoá (song sinh với SQL)', () => {
  it('thoát dấu | và \\, số để nguyên, thời điểm về UTC không phần lẻ giây', async () => {
    expect(thoiDiemUtc('2026-09-11T07:30:05.123+07:00')).toBe('2026-09-11T00:30:05Z');
    const hd = noiDungChuanHoaDon({
      company_id: 'c1', gdt_id: 'g|1', direction: 'received', invoice_serial: 'C26T', invoice_number: '0001',
      counterparty_tax_code: null, total_amount: 330000, tax_amount: 30000, issued_at: '2026-09-11T00:00:00+00:00', invoice_status: 1,
    });
    expect(hd).toBe('v1|hddt|c1|g\\|1|received|C26T|0001||330000|30000|2026-09-11T00:00:00Z|1');
    const ct = noiDungChuanChungTu({
      id: 'q1', company_id: 'c1', loai: 'bien_lai', so_hoa_don: null, ky_hieu: null, ngay: '2026-09-12', ben_ban: 'A\\B',
      ma_so_thue_ben_ban: null, tien_truoc_thue: null, tien_thue: null, tong_tien: 250000, giao_dich_id: null, anh_sha256: null,
    });
    // ben_ban | mst | tiền trước thuế | tiền thuế | tổng | giao dịch | mã băm ảnh
    expect(ct).toBe('v1|ctq|q1|c1|bien_lai|||2026-09-12|A\\\\B||||250000||');
    expect(await bamHex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
