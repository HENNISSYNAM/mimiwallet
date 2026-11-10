import { describe, expect, it } from 'vitest';
import { CsdlGia } from './csdl-gia.ts';
import { duBaoDongTienTuCsdl } from './doc-db.ts';
import { mulberry32 } from './du-bao.ts';
import { gom, ngayTu, soNgay, type GiaoDichDT } from './tong-hop.ts';

/**
 * QUY MÔ: 200.000 giao dịch / công ty. Dữ liệu tổng hợp ~2 năm (~274 dòng/ngày), đọc qua CSDL giả theo trang con trỏ
 * 1.000 dòng như production, rồi gom + phát hiện định kỳ + kiểm định + bootstrap. Ngưỡng đặt rộng (máy chạy test chậm
 * và chạy song song); con số thật in ra để báo cáo.
 */
const CTY = '11111111-1111-4111-8111-111111111111';
const HOM_NAY = '2026-11-10';
const SO_DONG = 200_000;

function sinh(): (GiaoDichDT & { is_synthetic: boolean })[] {
  const rnd = mulberry32(99);
  const den = soNgay(HOM_NAY); const tu = den - 730;
  const out: (GiaoDichDT & { is_synthetic: boolean })[] = [];
  for (let k = 0; k < SO_DONG; k++) {
    const d = tu + Math.floor((k / SO_DONG) * 730);
    const vao = rnd() < 0.7;
    out.push({
      id: `00000000-0000-4000-8000-${String(k).padStart(12, '0')}`, company_id: CTY, is_synthetic: false,
      amount: vao ? 50_000 + Math.floor(rnd() * 2_000_000) : 100_000 + Math.floor(rnd() * 5_000_000),
      type: vao ? 'income' : 'expense', transaction_date: ngayTu(d),
      merchant_name: null, counter_account_name: vao ? `KHACH ${Math.floor(rnd() * 20_000)}` : `NCC ${Math.floor(rnd() * 300)}`,
      payment_reference: vao ? 'CK MUA HANG' : 'THANH TOAN TIEN HANG', category: null, account_number: '1234567890', counter_account_number: null,
    });
  }
  return out;
}

describe('quy mô 200.000 giao dịch', () => {
  it('đọc theo trang + gom một lượt + dự báo trong ngân sách thời gian và bộ nhớ', async () => {
    const ds = sinh();
    const db = new CsdlGia({ transactions: ds });
    db.ghiNhatKy = false;
    const heap0 = process.memoryUsage().heapUsed;
    let dinh = heap0;
    db.moiTruyVan = () => { const h = process.memoryUsage().heapUsed; if (h > dinh) dinh = h; };
    const t0 = performance.now();
    const kq = await duBaoDongTienTuCsdl(db, CTY, { homNay: HOM_NAY, laDemo: false });
    const ms = performance.now() - t0;
    const tangMB = (dinh - heap0) / 1e6;

    // Riêng phần tính (không đọc): gom mảng có sẵn.
    const t1 = performance.now();
    const th = gom(ds, { companyId: CTY, homNay: HOM_NAY });
    const msGom = performance.now() - t1;

    console.log(`[quy-mo] ${kq.doc.so_dong} dòng, ${kq.doc.so_trang} trang: tổng ${Math.round(ms)} ms; gom riêng ${Math.round(msGom)} ms; bộ nhớ tăng đỉnh ~${tangMB.toFixed(1)} MB; vào=${kq.mo_hinh.vao?.ten} (MASE ${kq.mo_hinh.vao?.mase}, sMAPE ${kq.mo_hinh.vao?.smape}%), ra=${kq.mo_hinh.ra?.ten} (MASE ${kq.mo_hinh.ra?.mase}, sMAPE ${kq.mo_hinh.ra?.smape}%)`);
    expect(kq.doc.so_dong).toBe(SO_DONG);
    expect(kq.doc.so_trang).toBe(SO_DONG / 1000 + 1);
    expect(th.so_dong).toBe(SO_DONG);
    expect(kq.che_do).toBe('day_du');
    expect(kq.tuan).toHaveLength(13);
    // Một mình: ~1,5 s. Chạy song song với ~30 tệp test khác trên máy dev: ~23 s. Trần 60 s để không chập chờn.
    expect(ms).toBeLessThan(60_000);
    expect(tangMB).toBeLessThan(200);
  }, 120_000);
});
