import { describe, expect, it } from 'vitest';
import { hoiChiSoKeToan, TU_DIEN_CHI_SO, tuSaiThuatNgu } from './tu-dien';
import { duLieuTrong, NANG_LUC, type DuLieu } from '../tro-ly/tinh-toan';
import { CAU_CHUA_CO_SO_KE_TOAN, dungTraLoi } from '../tro-ly/tra-loi';
import { boDau } from '../tro-ly/y-dinh';
import financeVi from '../../../../src/i18n/modules/finance.vi';
import financeEn from '../../../../src/i18n/modules/finance.en';

/**
 * MIMI-P0-004 — số chỉ từ ngân hàng không được mang tên doanh thu kế toán, lợi nhuận hay báo cáo
 * tài chính. Test quét chữ thật mà năng lực và trang Báo cáo hiện ra.
 */

describe('bộ kiểm thuật ngữ', () => {
  it('bắt từ cần sổ kế toán', () => {
    expect(tuSaiThuatNgu('Lợi nhuận tháng này là 5 triệu.')).toEqual(['lợi nhuận']);
    expect(tuSaiThuatNgu('Báo cáo tài chính quý 3')).toEqual(['báo cáo tài chính']);
  });

  it('cho phép cách nói phủ định trong cùng mệnh đề', () => {
    expect(tuSaiThuatNgu('Đây là tiền vào, chưa phải doanh thu, lợi nhuận hay báo cáo tài chính.')).toEqual([]);
    expect(tuSaiThuatNgu('MIMI chưa tính được lợi nhuận, lãi lỗ hay báo cáo tài chính vì chưa có sổ.')).toEqual([]);
  });

  it('phủ định ở câu trước không che cho câu sau', () => {
    expect(tuSaiThuatNgu('Không phải số kế toán. Lợi nhuận: 5 triệu.')).toEqual(['lợi nhuận']);
  });

  it('nhận ra câu hỏi đòi chỉ số kế toán', () => {
    expect(hoiChiSoKeToan(boDau('Lợi nhuận tháng này bao nhiêu?'))).toBe(true);
    expect(hoiChiSoKeToan(boDau('Tháng này lãi hay lỗ?'))).toBe(true);
    expect(hoiChiSoKeToan(boDau('Dòng tiền tháng này'))).toBe(false);
  });

  it('từ điển: mọi chỉ số chỉ từ ngân hàng đều ghi giới hạn', () => {
    for (const c of Object.values(TU_DIEN_CHI_SO)) {
      expect(c.gioi_han.length).toBeGreaterThan(10);
      if (c.trang_thai_ke_toan === 'dong_tien_ngan_hang') expect(tuSaiThuatNgu(c.ten)).toEqual([]);
    }
  });
});

const HOM_NAY = '2026-09-16';
const KY = { tu: '2026-07-01', den: '2026-09-30', nhan: 'quý 3/2026' };
const gd = (i: number, type: 'income' | 'expense', amount: number, ngay: string) => ({
  id: `t${i}`, amount, type, transaction_date: ngay, merchant_name: `Đối tác ${i % 3}`, category: 'Dịch vụ',
  counter_account_name: `CONG TY ${i % 3}`, payment_reference: null,
});
const duLieu: DuLieu = {
  ...duLieuTrong(HOM_NAY, KY),
  giaoDich: [
    gd(1, 'income', 50_000_000, '2026-07-05'), gd(2, 'expense', -20_000_000, '2026-07-06'),
    gd(3, 'income', 40_000_000, '2026-08-05'), gd(4, 'expense', -25_000_000, '2026-08-06'),
    gd(5, 'income', 30_000_000, '2026-09-05'), gd(6, 'expense', -10_000_000, '2026-09-06'),
  ] as DuLieu['giaoDich'],
};

// Hai năng lực thuế/luật dùng "lợi nhuận" đúng nghĩa pháp lý (thuế theo thu nhập) — không quét.
const BO_QUA = new Set(['nghia_vu_thue', 'tra_cuu_luat']);

describe('chữ mà các năng lực hiện ra', () => {
  for (const [id, nl] of Object.entries(NANG_LUC)) {
    if (BO_QUA.has(id)) continue;
    it(`${id}: không gọi số ngân hàng bằng tên kế toán`, () => {
      const r = nl.chay(duLieu);
      const chu = [
        nl.mo_ta, r.tom_tat,
        ...r.the.flatMap((t) => (t.loai === 'ghi_chu' ? [t.cau]
          : t.loai === 'so_lieu' ? [t.tieu_de, ...t.muc.flatMap((m) => [m.nhan, m.ghi_chu ?? ''])]
            : [t.tieu_de, ...t.cot.map((c) => c.nhan)])),
      ];
      for (const c of chu) expect(tuSaiThuatNgu(c), c).toEqual([]);
    });
  }

  it('hỏi lợi nhuận mà chỉ có dòng tiền: câu trả lời mở đầu bằng lời nói thẳng', () => {
    const tl = dungTraLoi({ ketQua: [NANG_LUC.bao_cao_tai_chinh.chay(duLieu)], cheDo: 'co_dinh', cauHoi: 'Lợi nhuận quý này bao nhiêu?' });
    expect(tl.cau.startsWith(CAU_CHUA_CO_SO_KE_TOAN)).toBe(true);
    // Chế độ mô hình: mô hình có lỡ viết "lợi nhuận" thì câu nói thẳng vẫn đứng trước.
    const mh = dungTraLoi({ ketQua: [NANG_LUC.bao_cao_tai_chinh.chay(duLieu)], cheDo: 'mo_hinh', cauMoHinh: 'Lợi nhuận là 65 triệu.', cauHoi: 'Lãi lỗ thế nào?' });
    expect(mh.cau.startsWith(CAU_CHUA_CO_SO_KE_TOAN)).toBe(true);
  });

  it('hỏi dòng tiền thì không chèn câu đó', () => {
    const tl = dungTraLoi({ ketQua: [NANG_LUC.bao_cao_tai_chinh.chay(duLieu)], cheDo: 'co_dinh', cauHoi: 'Dòng tiền quý này?' });
    expect(tl.cau.startsWith(CAU_CHUA_CO_SO_KE_TOAN)).toBe(false);
  });
});

describe('nhãn trang Tổng hợp dòng tiền', () => {
  it('vi và en không còn gọi số sao kê là doanh thu/lợi nhuận/báo cáo tài chính', () => {
    const vi = (financeVi as { fin: { reports: Record<string, unknown> } }).fin.reports;
    const en = (financeEn as { fin: { reports: Record<string, unknown> } }).fin.reports;
    const chu = (o: unknown): string[] => (typeof o === 'string' ? [o] : o && typeof o === 'object' ? Object.values(o).flatMap(chu) : []);
    for (const c of chu(vi)) {
      expect(tuSaiThuatNgu(c), c).toEqual([]);
      expect(c.toLowerCase(), c).not.toMatch(/doanh thu(?! hay)/);
    }
    for (const c of chu(en)) expect(c.toLowerCase(), c).not.toMatch(/\b(revenue|profit|financial report)\b/);
  });
});
