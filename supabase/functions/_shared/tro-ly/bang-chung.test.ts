import { describe, expect, it } from 'vitest';
import { bangChung, duLieuTrong, NANG_LUC, SO_ID_BANG_CHUNG, type DuLieu } from './tinh-toan';
import type { BangChung, MucSoLieu } from './kieu';

/**
 * MIMI-P1-001 — mỗi con số phải chỉ ra được bản ghi đứng sau nó.
 *
 * Bộ này đo ĐỘ PHỦ: chạy mọi năng lực trên một bộ dữ liệu đủ giàu, đếm xem bao nhiêu ô số liệu có
 * `bang_chung`. Những ô không thể có bản ghi (ngưỡng luật, ngân sách người dùng tự đặt, doanh thu
 * do hệ luật chọn nguồn) phải nằm trong danh sách miễn KÈM LÝ DO — không được im lặng bỏ qua.
 */

const HOM_NAY = '2026-09-16';
const KY = { tu: '2026-07-01', den: '2026-09-30', nhan: 'quý 3/2026' };

const gd = (i: number, loai: 'income' | 'expense', tien: number, ngay: string) => ({
  id: `t${i}`, amount: loai === 'income' ? tien : -tien, type: loai, transaction_date: ngay,
  merchant_name: `Đối tác ${i % 3}`, category: 'Dịch vụ', counter_account_name: `CONG TY ${i % 3}`, payment_reference: `REF${i}`,
});

const DU_LIEU: DuLieu = {
  ...duLieuTrong(HOM_NAY, KY),
  giaoDich: [
    gd(1, 'income', 50_000_000, '2026-07-05'), gd(2, 'expense', 20_000_000, '2026-07-06'),
    gd(3, 'income', 40_000_000, '2026-08-05'), gd(4, 'expense', 25_000_000, '2026-08-06'),
    gd(5, 'income', 30_000_000, '2026-09-05'), gd(6, 'expense', 10_000_000, '2026-09-06'),
    gd(7, 'expense', 10_000_000, '2026-09-07'), gd(8, 'expense', 3_000_000, '2026-08-20'),
  ] as DuLieu['giaoDich'],
  hoaDonVao: [
    { id: 'hv1', total_amount: 10_000_000, issued_at: '2026-09-06', invoice_number: 'HD1', counterparty_name: 'CONG TY 0', counterparty_tax_code: '0301234567' },
  ] as DuLieu['hoaDonVao'],
  hoaDonBan: [
    { id: 'hb1', invoice_number: 'B1', client_name: 'Khách A', total: 12_000_000, issued_date: '2026-07-01', due_date: '2026-08-01', status: 'pending' },
    { id: 'hb2', invoice_number: 'B2', client_name: 'Khách B', total: 30_000_000, issued_date: '2026-09-01', due_date: '2026-10-30', status: 'pending' },
  ] as DuLieu['hoaDonBan'],
  yeuCau: [
    { id: 'y1', tac_tu_id: 'a1', so_tien: 2_000_000, ten_nguoi_nhan: 'CONG TY A', muc_dich: 'Quảng cáo', trang_thai: 'cho_duyet', created_at: '2026-09-14T00:00:00Z', so_tien_thuc_chi: null, ly_do: [] },
  ] as unknown as DuLieu['yeuCau'],
  tacTu: [{ id: 'a1', ten: 'Trợ lý quảng cáo', trang_thai: 'dang_chay' }] as DuLieu['tacTu'],
  chinhSach: [{ tac_tu_id: 'a1', han_muc_thang: 10_000_000 }] as DuLieu['chinhSach'],
  chiPhiAi: [
    { id: 'ca1', nha_cung_cap: 'openai', ngay: '2026-09-02', hang_muc: 'gpt-5', so_tien_usd: 40, nguon: 'api' },
    { id: 'ca2', nha_cung_cap: 'anthropic', ngay: '2026-09-10', hang_muc: 'claude-opus-5', so_tien_usd: 60, nguon: 'api' },
  ] as DuLieu['chiPhiAi'],
  nganSachAi: { han_muc_thang_usd: 150, canh_bao_phan_tram: 80 },
  tokenAi: [
    { id: 'tk1', nha_cung_cap: 'openai', ngay: '2026-09-02', model: 'gpt-5', token_vao: 1_000_000, token_vao_cache: 0, token_ra: 200_000, so_lan_goi: 100 },
  ] as DuLieu['tokenAi'],
  bangGia: [
    { model_id: 'openai/gpt-5', ten: 'GPT-5', gia_vao_usd_moi_trieu: 10, gia_ra_usd_moi_trieu: 30 },
    { model_id: 'openai/gpt-5-mini', ten: 'GPT-5 mini', gia_vao_usd_moi_trieu: 1, gia_ra_usd_moi_trieu: 3 },
  ],
  bangGiaLuc: '2026-09-15T00:00:00Z',
  chungTuQuet: [{ id: 'ct1', tong_tien: 3_000_000, ngay: '2026-08-20', giao_dich_id: 't8' }] as DuLieu['chungTuQuet'],
  ketNoiNganHang: [
    { id: 'k1', bank_name: 'MB', account_number: '0001', status: 'connected', scopes: 'transaction', provider: 'cas', last_synced_at: '2026-09-16T01:00:00Z' },
  ] as DuLieu['ketNoiNganHang'],
};

/** Ô số liệu không thể trỏ tới bản ghi nào, kèm lý do — mỗi dòng là một quyết định có chủ ý. */
const DUOC_MIEN: Record<string, string> = {
  'Ngân sách tháng': 'Hạn mức do người dùng tự đặt, không phải tổng từ bản ghi.',
  'Lũy kế tới nay': 'Doanh thu do hệ luật thuế chọn nguồn (hoá đơn, ngân hàng hoặc tự khai) — nguồn ghi ngay trong ô.',
  'Cả năm': 'Như trên.',
  'Còn cách ngưỡng': 'Suy ra từ doanh thu và ngưỡng pháp luật ngay trên cùng thẻ.',
  'Đã vượt': 'Như trên.',
};

const oSo = (): { nangLuc: string; muc: MucSoLieu }[] => {
  const ra: { nangLuc: string; muc: MucSoLieu }[] = [];
  for (const [id, nl] of Object.entries(NANG_LUC)) {
    if (nl.can.includes('thue') || nl.can.includes('kho_luat')) continue;
    for (const t of nl.chay(DU_LIEU).the) {
      if (t.loai !== 'so_lieu') continue;
      for (const m of t.muc) if (typeof m.gia_tri === 'number') ra.push({ nangLuc: id, muc: m });
    }
  }
  return ra;
};

describe('bằng chứng cho từng con số', () => {
  it('bộ dữ liệu thử đủ giàu để mọi năng lực đều ra số', () => {
    expect(oSo().length).toBeGreaterThanOrEqual(12);
  });

  it('con số 0 không kèm khối bằng chứng rỗng, và cũng không bị coi là thiếu citation', () => {
    const khong = oSo().filter(({ muc }) => muc.gia_tri === 0);
    for (const { nangLuc, muc } of khong) expect(muc.bang_chung ?? [], `${nangLuc}/${muc.nhan}`).toEqual([]);
  });

  it('độ phủ citation cho ô số liệu đạt từ 95% trở lên', () => {
    // Con số 0 thì không có bản ghi nào để trỏ tới — không tính vào phép đo.
    const ds = oSo().filter(({ muc }) => muc.gia_tri !== 0);
    const co = ds.filter(({ muc }) => (muc.bang_chung?.length ?? 0) > 0);
    const thieu = ds.filter(({ muc }) => !(muc.bang_chung?.length ?? 0) && !DUOC_MIEN[muc.nhan]);
    expect(thieu.map((x) => `${x.nangLuc}: ${x.muc.nhan}`)).toEqual([]);
    const phu = (co.length + ds.filter(({ muc }) => DUOC_MIEN[muc.nhan]).length) / ds.length;
    expect(phu).toBeGreaterThanOrEqual(0.95);
  });

  it('mỗi khối bằng chứng trỏ tới bản ghi có thật trong dữ liệu đã đọc', () => {
    const coTheoLoai: Record<string, Set<string>> = {
      giao_dich: new Set(DU_LIEU.giaoDich.map((x) => x.id)),
      hoa_don_vao: new Set(DU_LIEU.hoaDonVao.map((x) => x.id)),
      hoa_don_ban: new Set(DU_LIEU.hoaDonBan.map((x) => x.id)),
      yeu_cau_chi: new Set(DU_LIEU.yeuCau.map((x) => x.id)),
      chung_tu_quet: new Set(DU_LIEU.chungTuQuet.map((x) => x.id)),
      chi_phi_ai: new Set(DU_LIEU.chiPhiAi.map((x) => x.id)),
      token_ai: new Set(DU_LIEU.tokenAi.map((x) => x.id)),
    };
    for (const { nangLuc, muc } of oSo()) {
      for (const b of muc.bang_chung ?? []) {
        expect(b.id.length, `${nangLuc}/${muc.nhan}`).toBeGreaterThan(0);
        expect(b.so_ban_ghi).toBeGreaterThanOrEqual(b.id.length);
        const co = coTheoLoai[b.loai];
        if (co) for (const id of b.id) expect(co.has(id), `${nangLuc}/${muc.nhan} → ${b.loai}/${id}`).toBe(true);
      }
    }
  });

  it('ngưỡng thuế trỏ tới điều khoản, không trỏ tới bản ghi của công ty', () => {
    const r = NANG_LUC.nghia_vu_thue.chay({
      ...DU_LIEU,
      thue: {
        suKien: {
          nam: 2026, homNay: HOM_NAY, loai: 'ho_kinh_doanh', doanhThuQuy: [200e6, 200e6, 200e6, 0],
          nguonDoanhThu: 'hoa_don_dien_tu', nhomNganh: ['dich_vu'], kenh: 'dia_diem_co_dinh', phuongPhapTncn: null,
          batDauKinhDoanh: null, daNopThueTrongNam: null, nganhDacThu: null, doanhThuNamTruoc: null, coQuanHeLienKet: null,
        },
        canhBao: [], canCuDaKiem: {},
      },
    } as DuLieu);
    const the = r.the.find((t) => t.loai === 'so_lieu');
    const nguong = the?.loai === 'so_lieu' ? the.muc.find((m) => m.nhan === 'Ngưỡng phải nộp thuế') : undefined;
    expect(nguong?.bang_chung).toEqual([{ loai: 'van_ban_luat', id: ['nd68_d3_k1', 'nd141_d1_k1'], so_ban_ghi: 2 }]);
  });

  it('danh sách id bị cắt thì số bản ghi vẫn nói thật', () => {
    const nhieu = Array.from({ length: SO_ID_BANG_CHUNG + 37 }, (_, i) => ({ id: `x${i}` }));
    const b: BangChung = bangChung('giao_dich', nhieu)[0];
    expect(b.id).toHaveLength(SO_ID_BANG_CHUNG);
    expect(b.so_ban_ghi).toBe(SO_ID_BANG_CHUNG + 37);
  });

  it('không có bản ghi thì không dựng khối bằng chứng rỗng', () => {
    expect(bangChung('giao_dich', [])).toEqual([]);
  });
});
