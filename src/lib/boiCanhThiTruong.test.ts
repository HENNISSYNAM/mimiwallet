import { describe, expect, it } from 'vitest';
import viMod from '@/i18n/modules/web3.vi';
import enMod from '@/i18n/modules/web3.en';

/**
 * Hai bản dịch phải có cùng bộ khoá.
 *
 * VÌ SAO ĐÁNG MỘT TEST. Logic sinh ra `MaSuKien`, còn hai file này dịch chúng.
 * Thêm một mã mà quên bản tiếng Anh thì người đọc tiếng Anh nhận đúng chuỗi
 * `web3.suKien.…` giữa màn hình — và nó chỉ lộ ra khi có người bật tiếng Anh,
 * tức là ở đúng thị trường mình đang nhắm tới.
 */
function khoaPhang(o: unknown, tienTo = ''): string[] {
  if (typeof o !== 'object' || o === null) return [tienTo];
  return Object.entries(o as Record<string, unknown>).flatMap(([k, v]) =>
    khoaPhang(v, tienTo ? `${tienTo}.${k}` : k),
  );
}

describe('bản dịch web3', () => {
  const kVi = khoaPhang(viMod).sort();
  const kEn = khoaPhang(enMod).sort();

  it('tiếng Anh không thiếu khoá nào so với tiếng Việt', () => {
    expect(kEn.filter((k) => !kVi.includes(k))).toEqual([]);
    expect(kVi.filter((k) => !kEn.includes(k))).toEqual([]);
  });

  it('có đủ mã sự kiện mà lõi sinh ra', () => {
    // Danh sách này phải khớp `MaSuKien` trong `_shared/web3/tin-hieu.ts`.
    for (const ma of [
      'gia.hien_tai',
      'gia.khong_doc_duoc',
      'gia.lech_bat_thuong',
      'vi_mo.tin',
      'phap_ly.sap_hieu_luc',
      'phap_ly.hieu_luc_hom_nay',
      'phap_ly.vua_hieu_luc',
    ]) {
      expect(kVi).toContain(`web3.suKien.${ma}`);
    }
  });

  it('câu lưu ý nói rõ ba điều, ở cả hai ngôn ngữ', () => {
    expect(viMod.web3.luuY).toMatch(/không phải khuyến nghị mua bán/);
    expect(viMod.web3.luuY).toMatch(/không giữ tài sản/);
    expect(enMod.web3.luuY).toMatch(/not investment advice/);
    expect(enMod.web3.luuY).toMatch(/does not custody/);
  });
});
