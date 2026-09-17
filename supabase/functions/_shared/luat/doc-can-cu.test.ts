import { describe, expect, it } from 'vitest';
import { chuanHoaChu, coTrich, dieuCuaDoan, kiemCanCu } from './doc-can-cu';
import { CAN_CU } from './he-luat';

/** Kho giả: chỉ có hai đoạn, một khớp câu trích, một đã bị đổi chữ. */
const KHO = {
  van_ban: [
    { ma_cong_bao: 'a', so_hieu: '68/2026/NĐ-CP', url: 'https://congbao.chinhphu.vn/a', ngay_ban_hanh: '2026-03-05' },
    { ma_cong_bao: 'b', so_hieu: '141/2026/NĐ-CP', url: 'https://congbao.chinhphu.vn/b', ngay_ban_hanh: '2026-04-29' },
  ],
  doan: [
    // Ngắt dòng giữa câu, như văn bản thật trong kho.
    { ma_cong_bao: 'a', thu_tu: 3, nhan: 'Điều 3', noi_dung: `Điều 3. Thuế giá trị gia tăng\n1. ${CAN_CU.nd68_d3_k1.trich.replace('có mức doanh thu', 'có mức\ndoanh thu')}` },
    { ma_cong_bao: 'b', thu_tu: 1, nhan: 'Điều 1', noi_dung: 'Điều 1. Sửa đổi cụm từ “500 triệu đồng” thành “02 tỷ đồng” tại Điều 3' },
  ],
  quan_he: [] as Record<string, unknown>[],
};

// deno-lint-ignore no-explicit-any
const dbGia = (loi?: string): any => ({
  from(bang: string) {
    const tra = bang === 'van_ban_phap_luat' ? KHO.van_ban : bang === 'quan_he_hieu_luc' ? KHO.quan_he : KHO.doan;
    const p: Record<string, unknown> = {};
    const ket = loi ? { data: null, error: { message: loi } } : { data: tra, error: null };
    const chuoi = () => p;
    Object.assign(p, {
      select: chuoi, in: chuoi, order: chuoi,
      limit: () => Promise.resolve(ket),
      then: (f: (v: unknown) => unknown) => Promise.resolve(ket).then(f),
    });
    return p;
  },
});

describe('so chữ với kho', () => {
  it('gộp khoảng trắng, chuẩn hoá Unicode', () => {
    expect(chuanHoaChu('  a \n b\tc ')).toBe('a b c');
    expect(coTrich('Doanh thu là\ntoàn bộ tiền bán hàng', 'Doanh thu là toàn bộ tiền bán hàng')).toBe(true);
    expect(coTrich('Doanh thu là toàn bộ tiền', 'Doanh thu là toàn bộ tiền bán hàng')).toBe(false);
  });

  it('đoạn "(tiếp)" vẫn thuộc cùng một Điều', () => {
    expect(dieuCuaDoan('Điều 4 (tiếp)')).toBe('Điều 4');
    expect(dieuCuaDoan('Điều 4')).toBe('Điều 4');
    expect(dieuCuaDoan(null)).toBe('');
  });
});

describe('đối chiếu căn cứ', () => {
  it('khớp thì đóng dấu đã đối chiếu, kèm đường dẫn Công báo', async () => {
    const r = await kiemCanCu(dbGia(), ['nd68_d3_k1', 'nd141_d1_k1']);
    const khop = r.find((c) => c.id === 'nd68_d3_k1');
    expect(khop?.da_doi_chieu).toBe(true);
    expect(khop?.url).toBe('https://congbao.chinhphu.vn/a');
    expect(khop?.ngay_ban_hanh).toBe('2026-03-05');
  });

  it('kho đổi chữ thì KHÔNG đóng dấu — đây là chỗ chặn bịa trích dẫn', async () => {
    const r = await kiemCanCu(dbGia(), ['nd141_d1_k1']);
    expect(r[0].da_doi_chieu).toBe(false);
    expect(r[0].trich).toBe(CAN_CU.nd141_d1_k1.trich);
  });

  it('kho lỗi thì trả chưa đối chiếu được, không ném lỗi làm mất câu trả lời', async () => {
    const r = await kiemCanCu(dbGia('kho sập'), ['nd68_d3_k1']);
    expect(r).toHaveLength(1);
    expect(r[0].da_doi_chieu).toBe(false);
  });

  it('P0-003: văn bản không có quan hệ bãi bỏ → nói "kho chưa ghi nhận", không nói "còn hiệu lực"', async () => {
    const [c] = await kiemCanCu(dbGia(), ['nd68_d3_k1'], '2026-09-17');
    expect(c.hieu_luc?.trang_thai).toBe('chua_ghi_nhan_bai_bo');
    expect(c.nhan_hieu_luc).toBe('Kho chưa ghi nhận văn bản bãi bỏ');
  });

  it('P0-003: căn cứ thuộc văn bản đã bị bãi bỏ thì mang nhãn hết hiệu lực, theo đúng ngày kiểm', async () => {
    KHO.quan_he = [{
      so_hieu_nguon: '999/2026/NĐ-CP', so_hieu_dich: '68/2026/NĐ-CP', loai: 'bai_bo', hieu_luc_tu: '2026-12-01',
      do_tin_cay: 'chac_chan', co_ngoai_le: false, trich: 'Nghị định số 68/2026/NĐ-CP hết hiệu lực kể từ ngày 01 tháng 12 năm 2026.',
    }];
    try {
      const [truoc] = await kiemCanCu(dbGia(), ['nd68_d3_k1'], '2026-09-17');
      expect(truoc.hieu_luc?.trang_thai).toBe('chua_ghi_nhan_bai_bo');
      const [sau] = await kiemCanCu(dbGia(), ['nd68_d3_k1'], '2026-12-02');
      expect(sau.hieu_luc?.trang_thai).toBe('het_hieu_luc');
      expect(sau.nhan_hieu_luc).toBe('Hết hiệu lực từ 01/12/2026 (bãi bỏ bởi 999/2026/NĐ-CP)');
    } finally {
      KHO.quan_he = [];
    }
  });

  it('P0-003: bảng quan hệ lỗi → "chưa kiểm được", không coi là còn hiệu lực', async () => {
    const [c] = await kiemCanCu(dbGia('kho sập'), ['nd68_d3_k1']);
    expect(c.hieu_luc).toBeNull();
    expect(c.nhan_hieu_luc).toBe('Chưa kiểm được tình trạng hiệu lực');
  });

  it('id lạ bị bỏ qua', async () => {
    expect(await kiemCanCu(dbGia(), ['khong_co_id_nay'])).toEqual([]);
  });
});
