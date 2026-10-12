import { describe, expect, it } from 'vitest';
import type { NguoiLaoDong } from './khau-tru';
import { GHI_CHU_MAU_05, hanNop05, MA_CHI_TIEU_05, soanToKhai05, type ToKhai05 } from './to-khai-05';

/** Mọi con số dưới đây là đầu vào của test, không đi vào sản phẩm. */
const HO_SO = { ten: 'CÔNG TY TNHH THỬ', mst: '0123456789' };
const HOM_NAY = '2026-10-11';
const th = (tn: number, bh = 0) => ({ thu_nhap_chiu_thue: tn, bao_hiem_bat_buoc: bh });
const ba = (tn: number, bh = 0): NguoiLaoDong['thang'] => [th(tn, bh), th(tn, bh), th(tn, bh)];

const A: NguoiLaoDong = { ho_ten: 'A', loai: 'cu_tru_hdld', so_nguoi_phu_thuoc: 1, thang: ba(30_000_000, 3_150_000), thue_da_khau_tru_quy: null };
const B: NguoiLaoDong = { ho_ten: 'B', loai: 'cu_tru_hdld', so_nguoi_phu_thuoc: 0, thang: ba(12_000_000, 1_260_000), thue_da_khau_tru_quy: null };
const C: NguoiLaoDong = { ho_ten: 'C', loai: 'cu_tru_khac', so_nguoi_phu_thuoc: 0, thang: [th(5_000_000), th(0), th(0)], thue_da_khau_tru_quy: 500_000 };
const D: NguoiLaoDong = { ho_ten: 'D', loai: 'khong_cu_tru', so_nguoi_phu_thuoc: 0, thang: ba(50_000_000), thue_da_khau_tru_quy: 30_000_000 };

const gt = (tk: ToKhai05, ma: string) => tk.dong.find((d) => d.ma === ma)?.gia_tri;

function soan(ds: NguoiLaoDong[], ky = { nam: 2026, quy: 3 }, hoSo: { ten: string | null; mst: string | null } = HO_SO) {
  const r = soanToKhai05(ds, hoSo, ky, HOM_NAY);
  if (!r.ok) throw new Error(r.ly_do);
  return r.to_khai;
}

describe('mẫu 05/KK-TNCN kèm Thông tư 89/2026 — khung chép từ văn bản gốc', () => {
  it('đủ 31 chỉ tiêu bảng [15]…[45], đúng thứ tự', () => {
    expect(MA_CHI_TIEU_05).toEqual(Array.from({ length: 31 }, (_, i) => `[${i + 15}]`));
  });

  it('tiêu đề, câu áp dụng, kèm theo và Ghi chú đúng mẫu', () => {
    const tk = soan([A]);
    expect(tk.mau).toBe('05/KK-TNCN');
    expect(tk.tieu_de).toBe('TỜ KHAI THUẾ THU NHẬP CÁ NHÂN');
    expect(tk.ap_dung).toBe('(Áp dụng đối với tổ chức, cá nhân trả các khoản thu nhập từ tiền lương, tiền công)');
    expect(tk.kem_theo).toContain('89/2026/TT-BTC ngày 30 tháng 6 năm 2026');
    expect(tk.ghi_chu_mau).toEqual(GHI_CHU_MAU_05);
    expect(tk.ghi_chu_mau[0]).toContain('không phân biệt có phát sinh khấu trừ thuế');
    expect(tk.chi_tieu_dau.map((c) => c.ma)).toEqual(['[01]', '[02]', '[03]', '[04]', '[05]', '[06]', '[07]', '[08]', '[09]', '[10]', '[11]', '[12]', '[13]']);
    expect(tk.chi_tieu_dau[0].gia_tri).toBe('Quý 3 năm 2026');
  });

  it('công thức in trong ô giữ nguyên', () => {
    const tk = soan([A]);
    const nhan = (ma: string) => tk.dong.find((d) => d.ma === ma)?.nhan;
    expect(nhan('[17]')).toBe('Tổng số cá nhân đã khấu trừ thuế [17]=[18]+[19]');
    expect(nhan('[24]')).toBe('Tổng thu nhập được miễn trong kỳ [24]=[25]+[26]+[27]+[28]');
    expect(nhan('[42]')).toBe('Tổng số thuế thu nhập cá nhân đã khấu trừ [42]=[43]+[44]');
  });
});

describe('kỳ khai', () => {
  it('kỳ trước 01/07/2026 → từ chối rõ, chỉ đúng mẫu theo Thông tư 80/2021', () => {
    for (const ky of [{ nam: 2026, quy: 2 }, { nam: 2026, quy: 1 }, { nam: 2025, quy: 4 }]) {
      const r = soanToKhai05([A], HO_SO, ky, HOM_NAY);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.ly_do).toContain('Thông tư 80/2021/TT-BTC');
    }
  });

  it('quý không hợp lệ → từ chối', () => {
    expect(soanToKhai05([A], HO_SO, { nam: 2026, quy: 5 }, HOM_NAY).ok).toBe(false);
  });

  it('hạn nộp: ngày cuối tháng đầu quý sau; quý 4 sang tháng 1 năm sau', () => {
    expect(hanNop05({ nam: 2026, quy: 3 })).toBe('2026-10-31');
    expect(hanNop05({ nam: 2026, quy: 4 })).toBe('2027-01-31');
    expect(hanNop05({ nam: 2027, quy: 1 })).toBe('2027-04-30');
  });

  it('quý chưa kết thúc → cảnh báo', () => {
    const r = soanToKhai05([A], HO_SO, { nam: 2026, quy: 4 }, HOM_NAY);
    expect(r.ok && r.to_khai.canh_bao.some((c) => c.includes('chưa kết thúc'))).toBe(true);
  });
});

describe('tổng hợp quý', () => {
  it('chỉ người cư trú có HĐLĐ: điền đủ cả thu nhập tính thuế', () => {
    const tk = soan([A, B]);
    expect(gt(tk, '[15]')).toBe(2);
    expect(gt(tk, '[16]')).toBe(2);
    expect(gt(tk, '[17]')).toBe(1); // B không phát sinh thuế
    expect(gt(tk, '[21]')).toBe(126_000_000);
    expect(gt(tk, '[22]')).toBe(0);
    expect(gt(tk, '[30]')).toBe(90_000_000);
    expect(gt(tk, '[33]')).toBe(15_450_000); // 5.150.000 × 3 của A; B 0
    expect(gt(tk, '[34]')).toBe(0);
    expect(gt(tk, '[32]')).toBe(15_450_000);
    expect(gt(tk, '[43]')).toBe(772_500); // 257.500 × 3
    expect(gt(tk, '[42]')).toBe(772_500);
    expect(gt(tk, '[35]')).toBe(772_500);
    expect(tk.san_sang.trang_thai).toBe('can_xem');
    expect(tk.san_sang.vuong.map((v) => v.ma)).toEqual(['CAN_CU_CHUA_DOI_CHIEU']);
  });

  it('có người nhập tay: cộng số họ nhập, để trống thu nhập tính thuế của nhóm đó', () => {
    const tk = soan([A, B, C, D]);
    expect(gt(tk, '[15]')).toBe(4);
    expect(gt(tk, '[16]')).toBe(2);
    expect(gt(tk, '[18]')).toBe(2);
    expect(gt(tk, '[19]')).toBe(1);
    expect(gt(tk, '[17]')).toBe(3);
    expect(gt(tk, '[21]')).toBe(131_000_000);
    expect(gt(tk, '[22]')).toBe(150_000_000);
    expect(gt(tk, '[20]')).toBe(281_000_000);
    expect(gt(tk, '[30]')).toBe(95_000_000);
    expect(gt(tk, '[31]')).toBe(150_000_000);
    expect(gt(tk, '[29]')).toBe(245_000_000);
    expect(gt(tk, '[33]')).toBeNull();
    expect(gt(tk, '[34]')).toBeNull();
    expect(gt(tk, '[32]')).toBeNull();
    expect(gt(tk, '[43]')).toBe(1_272_500);
    expect(gt(tk, '[44]')).toBe(30_000_000);
    expect(gt(tk, '[42]')).toBe(31_272_500);
    expect(tk.san_sang.vuong.map((v) => v.ma)).toEqual(['CAN_CU_CHUA_DOI_CHIEU', 'NHAP_TAY']);
  });

  it('ô MIMI không biết để trống, không điền 0', () => {
    const tk = soan([A]);
    for (const ma of ['[23]', '[24]', '[25]', '[26]', '[27]', '[28]', '[36]', '[37]', '[38]', '[39]', '[40]', '[41]', '[45]']) {
      expect(gt(tk, ma), ma).toBeNull();
    }
  });

  it('quý không khấu trừ đồng nào vẫn soạn được (Ghi chú mẫu)', () => {
    const tk = soan([B]);
    expect(gt(tk, '[17]')).toBe(0);
    expect(gt(tk, '[42]')).toBe(0);
    expect(gt(tk, '[29]')).toBe(0);
  });

  it('thiếu mã số thuế → chặn xuất', () => {
    const tk = soan([A], { nam: 2026, quy: 3 }, { ten: 'X', mst: null });
    expect(tk.san_sang.trang_thai).toBe('bi_chan');
  });

  it('căn cứ: văn bản gốc TT89 luôn có; biểu thuế/giảm trừ ghi rõ là nguồn thứ cấp', () => {
    const tk = soan([A]);
    expect(tk.can_cu_tncn.filter((c) => c.nguon === 'van_ban_goc').map((c) => c.id)).toContain('tt89_mau_05kk');
    expect(tk.can_cu_tncn.filter((c) => c.nguon === 'thu_cap').map((c) => c.van_ban)).toEqual(['109/2025/QH15', '110/2025/UBTVQH15']);
    expect(soan([D]).can_cu_tncn.some((c) => c.nguon === 'thu_cap')).toBe(false);
  });
});
