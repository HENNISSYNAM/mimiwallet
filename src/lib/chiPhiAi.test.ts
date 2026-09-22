import { describe, expect, it } from 'vitest';
import {
  cauTomTatChiPhi, chuoiTheoNgay, locTrungNguon, tongQuan, topHangMuc, usd, viecCanLamChiPhi, type DongChiPhiAi,
} from './chiPhiAi';

/** 15/09/2026, 08:00 UTC. */
const NOW = new Date('2026-09-15T08:00:00Z');
const d = (x: Partial<DongChiPhiAi>): DongChiPhiAi => ({
  nha_cung_cap: 'openai', ngay: '2026-09-15', hang_muc: 'gpt-4o', du_an: 'proj_1', so_tien_usd: 1, nguon: 'api', ...x,
});

describe('chi phí AI', () => {
  it('API thắng file trong cùng ngày, cùng nhà cung cấp, cùng model — không đếm đôi', () => {
    const ds = [
      d({ so_tien_usd: 10 }),
      d({ so_tien_usd: 100, nguon: 'nhap_file' }),
      d({ ngay: '2026-09-14', so_tien_usd: 5, nguon: 'nhap_file' }),
      d({ nha_cung_cap: 'anthropic', so_tien_usd: 7, nguon: 'nhap_file' }),
      // MIMI-P1-005: model API không trả về trong ngày đó thì dòng file được GIỮ.
      d({ hang_muc: 'whisper-1', so_tien_usd: 3, nguon: 'nhap_file' }),
    ];
    expect(locTrungNguon(ds).map((x) => x.so_tien_usd)).toEqual([10, 5, 7, 3]);
  });

  it('không có dữ liệu: không số giả, không so với tháng trước', () => {
    const t = tongQuan([], NOW, null);
    expect(t.coDuLieu).toBe(false);
    expect(t.cungKyThangTruoc).toBeNull();
    expect(t.thayDoiPhanTram).toBeNull();
    expect(t.duLieuToi).toBeNull();
    expect(t.nganSach).toBeNull();
  });

  it('tháng này, cùng kỳ tháng trước (cùng 15 ngày đầu), 7 ngày, theo nhà cung cấp, ngân sách', () => {
    const ds = [
      d({ ngay: '2026-09-01', so_tien_usd: 4 }),
      d({ ngay: '2026-09-15', so_tien_usd: 6 }),
      d({ ngay: '2026-09-10', nha_cung_cap: 'anthropic', so_tien_usd: 10, nguon: 'nhap_file' }),
      d({ ngay: '2026-08-15', so_tien_usd: 8 }),
      // Sau ngày 15 của tháng trước: không nằm trong cùng kỳ.
      d({ ngay: '2026-08-20', so_tien_usd: 100 }),
    ];
    const t = tongQuan(ds, NOW, { han_muc_thang_usd: 25, canh_bao_phan_tram: 80 });
    expect(t.thangNay).toBe(20);
    expect(t.cungKyThangTruoc).toBe(8);
    expect(t.thayDoiPhanTram).toBe(150);
    expect(t.bayNgay).toBe(16);
    expect(t.theoNcc).toEqual([{ ncc: 'openai', tong: 10 }, { ncc: 'anthropic', tong: 10 }]);
    expect(t.duLieuToi).toBe('2026-09-15');
    expect(t.nganSach).toEqual({ han: 25, daDung: 20, conLai: 5, phanTram: 80, canhBao: true, vuot: false });
  });

  it('cùng kỳ khi tháng trước ngắn hơn: 31/03 so với hết tháng 2', () => {
    const t = tongQuan([d({ ngay: '2026-02-28', so_tien_usd: 3 }), d({ ngay: '2026-03-31', so_tien_usd: 1 })], new Date('2026-03-31T12:00:00Z'), null);
    expect(t.cungKyThangTruoc).toBe(3);
  });

  it('chuỗi theo ngày có đủ ngày 1 tới hôm nay, chia theo nhà cung cấp', () => {
    const c = chuoiTheoNgay([d({ ngay: '2026-09-02', so_tien_usd: 2 }), d({ ngay: '2026-09-02', nha_cung_cap: 'gemini', so_tien_usd: 3, nguon: 'nhap_file' })], NOW);
    expect(c).toHaveLength(15);
    expect(c[1]).toEqual({ ngay: '2026-09-02', theoNcc: { openai: 2, gemini: 3 }, tong: 5 });
    expect(c[0].tong).toBe(0);
  });

  it('top hạng mục tháng này, gom dự án, tính phần trăm', () => {
    const top = topHangMuc([
      d({ hang_muc: 'gpt-4o', du_an: 'a', so_tien_usd: 6 }),
      d({ hang_muc: 'gpt-4o', du_an: 'b', so_tien_usd: 2 }),
      d({ nha_cung_cap: 'anthropic', hang_muc: 'claude-opus-5', du_an: 'w', so_tien_usd: 2 }),
      d({ ngay: '2026-08-01', hang_muc: 'cu', so_tien_usd: 99 }),
    ], NOW);
    expect(top).toEqual([
      { ncc: 'openai', hangMuc: 'gpt-4o', duAn: ['a', 'b'], tong: 8, phanTram: 80 },
      { ncc: 'anthropic', hangMuc: 'claude-opus-5', duAn: ['w'], tong: 2, phanTram: 20 },
    ]);
  });

  it('câu trợ lý: chưa có số thì nói việc cần làm', () => {
    expect(cauTomTatChiPhi(tongQuan([], NOW, null), NOW)).toContain('Tải file báo cáo chi phí');
  });

  it('câu trợ lý: tiền, xu hướng, ai chiếm nhiều, ngân sách, cập nhật đến ngày — không thuật ngữ kỹ thuật', () => {
    const ds = [
      d({ ngay: '2026-09-15', so_tien_usd: 15 }),
      d({ ngay: '2026-09-14', nha_cung_cap: 'anthropic', so_tien_usd: 5, nguon: 'nhap_file' }),
      d({ ngay: '2026-08-10', so_tien_usd: 10 }),
    ];
    const cau = cauTomTatChiPhi(tongQuan(ds, NOW, { han_muc_thang_usd: 50, canh_bao_phan_tram: 80 }), NOW);
    expect(cau).toBe('Tháng 9 bạn đã chi $20.00 cho dịch vụ AI, tăng 100% so với cùng kỳ tháng trước. OpenAI chiếm 75%. Còn $30.00 trong ngân sách tháng. Số liệu cập nhật đến 15/09/2026.');
    expect(cau).not.toMatch(/UTC|API|token|workspace/i);
  });

  it('việc cần làm: lấy tự động bị lỗi, ngân sách, số liệu cũ', () => {
    const tq = tongQuan([d({ ngay: '2026-09-10', so_tien_usd: 45 })], NOW, { han_muc_thang_usd: 50, canh_bao_phan_tram: 80 });
    const viec = viecCanLamChiPhi(tq, NOW, [{ nha_cung_cap: 'openai', loi_cuoi: 'Khoá không còn hiệu lực.' }]);
    expect(viec.map((v) => v.loai)).toEqual(['lay_tu_dong_loi', 'ngan_sach', 'so_lieu_cu']);
    expect(viec[1].cau).toBe('Đã dùng 90% ngân sách chi phí AI tháng này');
    expect(viec[2].cau).toContain('cách đây 5 ngày');
    expect(viecCanLamChiPhi(tongQuan([d({})], NOW, null), NOW, []).map((v) => v.loai)).toEqual(['dat_ngan_sach']);
  });

  it('định dạng USD', () => {
    expect(usd(1234.5)).toBe('$1,234.50');
    expect(usd(0.004)).toBe('$0.00');
  });
});
