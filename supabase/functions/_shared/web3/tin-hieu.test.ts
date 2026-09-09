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
  it('nhận văn bản tiếng Việt về tài sản mã hoá', () => {
    expect(lienQuanTaiSanSo(vb())).toBe(true);
  });

  /*
   * Cần cho thị trường ngoài Việt Nam. Nếu chỉ có từ khoá tiếng Việt thì mọi
   * văn bản của EU, Nhật, Singapore đều rơi qua — và cái rơi mất chính là thứ
   * duy nhất mang ra toàn cầu được.
   */
  it('nhận văn bản tiếng Anh — đây là điều kiện để ra khỏi Việt Nam', () => {
    expect(
      lienQuanTaiSanSo(
        vb({
          soHieu: 'EU 2023/1114',
          ten: 'Markets in Crypto-Assets Regulation (MiCA)',
          doiTuongApDung: 'crypto-asset service providers',
          quocGia: 'EU',
        }),
      ),
    ).toBe(true);
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
          // Phải ghi đè cả trường này: bản đầu của test chỉ đổi `ten` và vẫn để
          // `doiTuongApDung` mặc định chứa "tài sản mã hoá" — nên nó đỏ, và đỏ
          // đúng. Hàm đọc cả ba trường, đó là chủ ý.
          doiTuongApDung: 'tổ chức tín dụng',
        }),
      ),
    ).toBe(false);
  });
});

describe('bangChungThiTruong', () => {
  it('mang số liệu có cấu trúc, không mang câu chữ', () => {
    const g = doiChieuGia('BTC', [
      { san: 'Binance', gia: 100_000, doi24h: 2.5 },
      { san: 'Coinbase', gia: 100_100, doi24h: 2.4 },
    ]);
    const [bc] = bangChungThiTruong([g]);
    expect(bc.ma).toBe('gia.hien_tai');
    expect(bc.thamSo).toMatchObject({ ma: 'BTC', gia: 100_050, soSan: 2 });
    expect(bc.thamSo.doi24h).toBeCloseTo(2.45, 5);
  });

  it('lệch bất thường là một dòng riêng, không phải chú thích', () => {
    const g = doiChieuGia('BTC', [
      { san: 'Binance', gia: 100_000, doi24h: null },
      { san: 'Coinbase', gia: 105_000, doi24h: null },
    ]);
    const bc = bangChungThiTruong([g]);
    expect(bc).toHaveLength(2);
    expect(bc[1].ma).toBe('gia.lech_bat_thuong');
  });

  it('bỏ hẳn doi24h khi không sàn nào trả về, thay vì gửi 0', () => {
    // Gửi 0 thì tầng hiển thị ghép ra "đứng giá" — một câu nói dối.
    const g = doiChieuGia('BTC', [{ san: 'Binance', gia: 100_000, doi24h: null }]);
    expect(bangChungThiTruong([g])[0].thamSo).not.toHaveProperty('doi24h');
  });

  it('không đọc được giá thì nói vậy, không bỏ im', () => {
    expect(bangChungThiTruong([doiChieuGia('BTC', [])])[0].ma).toBe('gia.khong_doc_duoc');
  });
});

describe('bangChungViMo', () => {
  it('bỏ tin trung tính', () => {
    const bc = bangChungViMo([
      { tieuDe: 'A', chuDe: 'policy', tacDong: 'neutral', nguon: 'X' },
      { tieuDe: 'B', chuDe: 'interest_rate', tacDong: 'negative', nguon: 'Y' },
    ]);
    expect(bc.map((b) => b.thamSo.tieuDe)).toEqual(['B']);
  });

  it('giữ nguyên văn tiêu đề của nhà xuất bản', () => {
    // Dịch hay tóm tắt lại tiêu đề là nói thay họ.
    const goc = 'NHNN giữ nguyên lãi suất điều hành';
    const [bc] = bangChungViMo([
      { tieuDe: goc, chuDe: 'interest_rate', tacDong: 'negative', nguon: 'VnExpress', url: 'https://x' },
    ]);
    expect(bc.thamSo.tieuDe).toBe(goc);
    expect(bc.dan).toBe('VnExpress');
    expect(bc.url).toBe('https://x');
  });
});

describe('bangChungPhapLy', () => {
  const luc = new Date(2026, 8, 9); // 09/09/2026

  it('lấy văn bản sắp hiệu lực trong cửa sổ', () => {
    const bc = bangChungPhapLy([vb({ ngayHieuLuc: '2026-10-01' })], luc);
    expect(bc).toHaveLength(1);
    expect(bc[0].ma).toBe('phap_ly.sap_hieu_luc');
    expect(bc[0].thamSo.ngay).toBe(22);
  });

  it('phân biệt vừa hiệu lực và hiệu lực hôm nay', () => {
    expect(bangChungPhapLy([vb({ ngayHieuLuc: '2026-09-01' })], luc)[0].ma).toBe(
      'phap_ly.vua_hieu_luc',
    );
    expect(bangChungPhapLy([vb({ ngayHieuLuc: '2026-09-09' })], luc)[0].ma).toBe(
      'phap_ly.hieu_luc_hom_nay',
    );
  });

  it('bỏ văn bản còn quá xa, đã quá cũ, hoặc chưa có ngày hiệu lực', () => {
    expect(bangChungPhapLy([vb({ ngayHieuLuc: '2027-06-01' })], luc)).toHaveLength(0);
    expect(bangChungPhapLy([vb({ ngayHieuLuc: '2025-01-01' })], luc)).toHaveLength(0);
    expect(bangChungPhapLy([vb({ ngayHieuLuc: null })], luc)).toHaveLength(0);
  });

  it('mặc định quốc gia là VN cho dòng cũ, không đoán khác', () => {
    // `legal_documents` sinh ra cho luật Việt Nam; mọi dòng hiện có đều là VN.
    expect(bangChungPhapLy([vb()], luc)[0].thamSo.quocGia).toBe('VN');
  });

  it('mang theo quốc gia khi có', () => {
    const bc = bangChungPhapLy(
      [vb({ quocGia: 'EU', ten: 'Markets in Crypto-Assets Regulation', soHieu: 'EU 2023/1114' })],
      luc,
    );
    expect(bc[0].thamSo.quocGia).toBe('EU');
    expect(bc[0].dan).toBe('EU · EU 2023/1114');
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

    const coLuat = tongHop([...nhieuTin, ...bangChungPhapLy([vb()], luc)]);
    expect(coLuat.mucChuY).toBe('can_doc_ky');
    expect(coLuat.maMoDau).toBe('tong.co_phap_ly');
  });

  it('gom danh sách quốc gia có văn bản trong kỳ', () => {
    const b = tongHop(
      bangChungPhapLy(
        [
          vb(),
          vb({ quocGia: 'EU', ten: 'Markets in Crypto-Assets Regulation', soHieu: 'EU 2023/1114' }),
          vb({ quocGia: 'EU', ten: 'MiCA technical standards', soHieu: 'EU 2024/xx' }),
        ],
        luc,
      ),
    );
    expect(b.quocGia).toEqual(['EU', 'VN']);
    expect(b.thamSoMoDau.soVanBan).toBe(3);
  });

  it('không có gì thì nói là không có gì', () => {
    const b = tongHop([]);
    expect(b.mucChuY).toBe('binh_thuong');
    expect(b.maMoDau).toBe('tong.khong_co_gi');
    expect(b.quocGia).toEqual([]);
  });

  /*
   * KHOÁ BẰNG CẤU TRÚC, KHÔNG KHOÁ BẰNG BIỂU THỨC TRÊN CÂU CHỮ.
   *
   * Bản trước kiểm bằng regex tìm chữ "nên mua" trong câu — vô dụng ngay khi
   * câu chữ chuyển sang tầng hiển thị, và vô dụng với mọi ngôn ngữ khác. Giờ
   * kiểm tập mã sự kiện: không mã nào là một lời khuyên, nên tầng hiển thị
   * không có gì để dịch thành một lời khuyên.
   */
  it('không mã sự kiện nào là một khuyến nghị giao dịch', () => {
    const b = tongHop([
      ...bangChungThiTruong([
        doiChieuGia('BTC', [
          { san: 'Binance', gia: 100_000, doi24h: -9 },
          { san: 'Coinbase', gia: 106_000, doi24h: -9 },
        ]),
      ]),
      ...bangChungViMo([{ tieuDe: 'x', chuDe: 'policy', tacDong: 'negative', nguon: 'X' }]),
      ...bangChungPhapLy([vb()], luc),
    ]);
    for (const bc of b.bangChung) {
      expect(bc.ma).not.toMatch(/mua|ban|buy|sell|long|short|khuyen_nghi/);
    }
  });

  it('mọi dòng bằng chứng đều có nguồn', () => {
    const b = tongHop([
      ...bangChungThiTruong([doiChieuGia('BTC', [{ san: 'Binance', gia: 1, doi24h: null }])]),
      ...bangChungViMo([{ tieuDe: 'x', chuDe: 'fx', tacDong: 'positive', nguon: 'X' }]),
      ...bangChungPhapLy([vb()], luc),
    ]);
    expect(b.bangChung.length).toBeGreaterThan(0);
    for (const bc of b.bangChung) expect(bc.dan.trim()).not.toBe('');
  });
});
