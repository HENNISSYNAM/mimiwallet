import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GIA_MOT_TO_KHAI, GOI_THANG, giaVND } from './bang-gia';
import { GOI, GIA_MOT_TO_KHAI as GIA_MAY_CHU } from './thu-tien';
import { TIERS } from '../../../../src/store/useSubscriptionStore';

const GOC = join(__dirname, '../../../..');

describe('một bảng giá cho mọi nơi', () => {
  it('máy chủ thu tiền, trang Cài đặt đọc cùng số', () => {
    expect(GOI).toBe(GOI_THANG);
    expect(GIA_MAY_CHU).toBe(GIA_MOT_TO_KHAI);
    expect(TIERS.starter.price).toBe(GOI_THANG.starter.amount);
    expect(TIERS.growth.price).toBe(GOI_THANG.growth.amount);
  });

  it('trang chủ không viết cứng giá gói', () => {
    const landing = readFileSync(join(GOC, 'src/pages/Landing.tsx'), 'utf8');
    for (const g of Object.values(GOI_THANG)) {
      const so = String(g.amount);
      const coCham = so.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      const coPhay = so.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      expect(landing.includes(`price="${coCham}`) || landing.includes(`price="${coPhay}`)).toBe(false);
    }
    expect(landing).toContain('giaVND(GOI_THANG.growth.amount)');
  });

  it('định dạng giá kiểu Việt Nam', () => {
    expect(giaVND(249_000)).toBe('249.000₫');
  });
});
