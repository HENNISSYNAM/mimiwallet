import { describe, expect, it } from 'vitest';
import { doiChieuGia } from './gia-san.ts';
import {
  bangChungPhapLy,
  bangChungThiTruong,
  bangChungViMo,
  lienQuanTaiSanSo,
  tongHop,
  type VanBanPhapLy,
} from './tin-hieu.ts';

const vb = (p: Partial<VanBanPhapLy> = {}): VanBanPhapLy => ({
  soHieu: '05/2025/NQ-CP',
  ten: 'Nghị quyết về triển khai thí điểm thị trường tài sản mã hoá',
  ngayHieuLuc: '2026-10-01',
  doiTuongApDung: 'tổ chức cung cấp dịch vụ tài sản mã hoá',
  tomTatDeHieu: null,
  url: null,
  ...p,
});

describe('lienQuanTaiSanSo', () => {
  it('nhận văn bản nói về tài sản mã hoá', () => {
    expect(lienQuanTaiSanSo(vb())).toBe(true);
  });

  it('bỏ qua văn bản không liên quan', () => {
    expect(
      lienQuanTaiSanSo(vb({ ten: 'Nghị định về hoá đơn điện tử', doiTuongApDung: 'hộ kinh doanh' })),
    ).toBe(false);
  });

  /*
   * Khớp bừa thì một văn bản về thuế hộ kinh doanh hiện ngay cạnh giá BTC, và
   * người đọc tưởng hai thứ dính nhau. Thà bỏ sót.
   */
  it('không suy diễn từ cơ quan ban hành hay loại văn bản', () => {
    expect(
      lienQuanTaiSanSo(
        vb({
          ten: 'Thông tư của Ngân hàng Nhà nước về lãi suất',
          // Phải ghi đè cả trường này: bản đầu của test chỉ đổi `ten` và vẫn
          // để `doiTuongApDung` mặc định chứa "tài sản mã hoá" — nên nó đỏ, và
          // đỏ đúng. Hàm đọc cả ba trường, đó là chủ ý.
          doiTuongApDung: 'tổ chức tín dụng',
        }),
      ),
    ).toBe(false);
  });
});

describe('bangChungThiTruong', () => {
  it('nói ra giá kèm nguồn đã đối chiếu', () => {
    const g = doiChieuGia('BTC', [
      { san: 'Binance', gia: 100_000, doi24h: 2.5 },
      { san: 'Coinbase', gia: 100_100, doi24h: 2.4 },
    ]);
    const bc = bangChungThiTruong([g]);
    expect(bc[0].cau).toContain('BTC');
    expect(bc[0].cau).toContain('tăng');
    expect(bc[0].dan).toMatch(/khớp nhau/);
  });

  it('lệch bất thường là một dòng riêng, không phải chú thích', () => {
    const g = doiChieuGia('BTC', [
      { san: 'Binance', gia: 100_000, doi24h: null },
      { san: 'Coinbase', gia: 105_000, doi24h: null },
    ]);
    const bc = bangChungThiTruong([g]);
    expect(bc).toHaveLength(2);
    expect(bc[1].cau).toMatch(/lệch nhau bất thường/);
  });

  it('không đọc được giá thì nói vậy, không bỏ im', () => {
    const bc = bangChungThiTruong([doiChieuGia('BTC', [])]);
    expect(bc[0].cau).toMatch(/Không đọc được/);
  });
});

describe('bangChungViMo', () => {
  it('bỏ tin trung tính', () => {
    const bc = bangChungViMo([
      { tieuDe: 'A', chuDe: 'policy', tacDong: 'neutral', nguon: 'X' },
      { tieuDe: 'B', chuDe: 'interest_rate', tacDong: 'negative', nguon: 'Y' },
    ]);
    expect(bc.map((b) => b.cau)).toEqual(['B']);
  });

  it('luôn kèm nguồn', () => {
    const bc = bangChungViMo([
      { tieuDe: 'B', chuDe: 'fx', tacDong: 'positive', nguon: 'VnExpress', url: 'https://x' },
    ]);
    expect(bc[0].dan).toContain('VnExpress');
    expect(bc[0].url).toBe('https://x');
  });
});

describe('bangChungPhapLy', () => {
  const luc = new Date(2026, 8, 9); // 09/09/2026

  it('lấy văn bản sắp hiệu lực trong cửa sổ', () => {
    const bc = bangChungPhapLy([vb({ ngayHieuLuc: '2026-10-01' })], luc);
    expect(bc).toHaveLength(1);
    expect(bc[0].dan).toMatch(/còn 22 ngày/);
  });

  it('lấy cả văn bản vừa hiệu lực', () => {
    const bc = bangChungPhapLy([vb({ ngayHieuLuc: '2026-09-01' })], luc);
    expect(bc[0].dan).toMatch(/đã hiệu lực 8 ngày/);
  });

  it('nói riêng ngày hiệu lực rơi đúng hôm nay', () => {
    const bc = bangChungPhapLy([vb({ ngayHieuLuc: '2026-09-09' })], luc);
    expect(bc[0].dan).toMatch(/hiệu lực từ hôm nay/);
  });

  it('bỏ văn bản còn quá xa hoặc đã quá cũ', () => {
    expect(bangChungPhapLy([vb({ ngayHieuLuc: '2027-06-01' })], luc)).toHaveLength(0);
    expect(bangChungPhapLy([vb({ ngayHieuLuc: '2025-01-01' })], luc)).toHaveLength(0);
  });

  it('bỏ văn bản không có ngày hiệu lực', () => {
    expect(bangChungPhapLy([vb({ ngayHieuLuc: null })], luc)).toHaveLength(0);
  });
});

describe('tongHop', () => {
  const luc = new Date(2026, 8, 9);

  /*
   * Xếp hạng theo LOẠI bằng chứng, không theo số lượng. Tin vĩ mô đổi hàng
   * ngày; ngày hiệu lực của một văn bản thì không đổi và có hậu quả cụ thể.
   */
  it('một văn bản pháp lý thắng nhiều tin vĩ mô', () => {
    const nhieuTin = bangChungViMo(
      Array.from({ length: 5 }, (_, i) => ({
        tieuDe: `tin ${i}`,
        chuDe: 'policy',
        tacDong: 'negative' as const,
        nguon: 'X',
      })),
    );
    expect(tongHop(nhieuTin).mucChuY).toBe('dang_chu_y');

    const coLuat = [...nhieuTin, ...bangChungPhapLy([vb()], luc)];
    expect(tongHop(coLuat).mucChuY).toBe('can_doc_ky');
    expect(tongHop(coLuat).cauMoDau).toMatch(/pháp luật/);
  });

  it('không có gì thì nói là không có gì', () => {
    const b = tongHop([]);
    expect(b.mucChuY).toBe('binh_thuong');
    expect(b.cauMoDau).toMatch(/Không có sự kiện nào nổi bật/);
  });

  /*
   * Câu bắt buộc. Cùng kỷ luật với `tax-summary`: tính ra một con số không có
   * nghĩa là con số đó thay được người quyết định.
   */
  it('luôn kèm câu lưu ý, và câu đó nói rõ ba điều', () => {
    const b = tongHop([]);
    expect(b.luuY).toMatch(/không phải khuyến nghị mua bán/);
    expect(b.luuY).toMatch(/mất phần lớn giá trị/);
    expect(b.luuY).toMatch(/không giữ tài sản/);
  });

  it('không có dòng bằng chứng nào chứa chữ mua hoặc bán như một lời khuyên', () => {
    const b = tongHop([
      ...bangChungThiTruong([
        doiChieuGia('BTC', [
          { san: 'Binance', gia: 100_000, doi24h: -9 },
          { san: 'Coinbase', gia: 100_050, doi24h: -9 },
        ]),
      ]),
      ...bangChungPhapLy([vb()], luc),
    ]);
    for (const bc of b.bangChung) {
      expect(bc.cau).not.toMatch(/nên mua|nên bán|khuyến nghị mua|khuyến nghị bán/i);
    }
  });
});
