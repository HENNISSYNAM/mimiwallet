import { describe, expect, it } from 'vitest';
import { hieuLucTaiNgay, nhanHieuLuc, tachQuanHeHieuLuc, type QuanHeHieuLuc } from './hieu-luc';

/**
 * MIMI-P0-003 — các đoạn dưới đây là nguyên văn trong kho Công báo của MIMI (truy vấn ngày
 * 17/09/2026), cắt tới đủ khoản cần kiểm.
 */

const LUAT_108 = 'Điều 52. Điều khoản thi hành 1. Luật này có hiệu lực thi hành từ ngày 01 tháng 7 năm 2026, trừ quy định tại khoản 2 Điều này. 2. Quy định tại Điều 13 và việc sử dụng hóa đơn điện tử của hộ kinh doanh, cá nhân kinh doanh quy định tại Điều 26 của Luật này có hiệu lực thi hành từ ngày 01 tháng 01 năm 2026. 3. Luật Quản lý thuế số 38/2019/QH14 đã được sửa đổi, bổ sung một số điều theo Luật số 56/2024/QH15 (sau đây gọi là Luật Quản lý thuế số 38/2019/QH14) hết hiệu lực thi hành kể từ ngày Luật này có hiệu lực thi hành, trừ quy định tại khoản 1 và khoản 3 Điều 53 của Luật này; riêng quy định tại Điều 51 của Luật Quản lý thuế số 38/2019/QH14 hết hiệu lực thi hành kể từ ngày 01 tháng 01 năm 2026. 4. Cơ quan thuế có trách nhiệm tổ chức xây dựng, nâng cấp và hoàn thiện hệ thống thông tin phục vụ việc thực hiện đầy đủ các giao dịch điện tử trong quản lý thuế.';

const TT_104 = 'Điều 32. Hiệu lực thi hành 1.Thông tư này có hiệu lực thi hành từ ngày 17 tháng 7 năm 2026. 2.Thông tư số 05/2026/TT-BTC ngày 22 tháng 01 năm 2026 của Bộ trưởng Bộ Tài chính quy định về phân cấp trong hoạt động kiểm tra chuyên ngành trong một số lĩnh vực của Bộ Tài chính hết hiệu lực kể từ ngày Thông tư này có hiệu lực. 3.Trường hợp các văn bản quy phạm pháp luật viện dẫn tại Thông tư này được sửa đổi, bổ sung hoặc thay thế thì áp dụng theo quy định tại văn bản sửa đổi, bổ sung hoặc thay thế đó.';

const TT_116 = 'Điều 6. Hiệu lực thi hành 1. Thông tư này có hiệu lực thi hành từ ngày 14 tháng 8 năm 2026. 2. Các Thông tư sau hết hiệu lực kể từ ngày Thông tư này có hiệu lực thi hành: a) Thông tư số 223/2016/TT-BTC quy định mức thu, chế độ thu, nộp, quản lý và sử dụng phí thẩm định tiêu chuẩn, điều kiện hành nghề trong lĩnh vực thừa phát lại; b) Thông tư số 05/2021/TT-BTC sửa đổi, bổ sung một số điều của Thông tư số 223/2016/TT-BTC ngày 10 tháng 11 năm 2016 của Bộ trưởng Bộ Tài chính quy định mức thu, chế độ thu, nộp, quản lý và sử dụng phí thẩm định tiêu chuẩn, điều kiện hành nghề Thừa phát lại; phí thẩm định điều kiện thành lập, hoạt động Văn phòng Thừa phát lại. 3. Các nội dung khác liên quan đến việc khai, thu, nộp, công khai chế độ thu phí không quy định tại Thông tư này được thực hiện theo quy định tại các văn bản: Luật';

const ND_254 = 'Điều 43. Hiệu lực thi hành 1. Nghị định này có hiệu lực thi hành từ ngày 01 tháng 7 năm 2026. 2. Kể từ ngày Nghị định này có hiệu lực thi hành, các Nghị định sau đây hết hiệu lực thi hành: a) Nghị định số 123/2020/NĐ-CP ngày 19 tháng 10 năm 2020 của Chính phủ quy định về hóa đơn, chứng từ; b) Điều 1 Nghị định số 41/2022/NĐ-CP ngày 20 tháng 6 năm 2022 của Chính phủ sửa đổi, bổ sung một số điều của Nghị định số 123/2020/NĐ-CP ngày 19 tháng 10 năm 2020 của Chính phủ quy định về hóa đơn, chứng từ và Nghị định số 15/2022/NĐ-CP ngày 28 tháng 01 năm 2022 của Chính phủ quy định chính sách miễn, giảm thuế theo Nghị quyết số 43/2022/QH15 của Quốc hội về chính sách tài khóa, tiền tệ hỗ trợ chương trình phục hồi và phát triển kinh tế - xã hội; c) Nghị định số 70/2025/NĐ-CP ngày 20 tháng 3 năm 2025 của Chính phủ sửa đổi, bổ sung một số điều của Nghị định số 123/2020/NĐ-CP ngày 1';

const TT_91 = 'Điều 25. Hiệu lực thi hành 1. Thông tư này có hiệu lực thi hành kể từ ngày 01 tháng 7 năm 2026. 2. Kể từ ngày Thông tư này có hiệu lực thi hành, Thông tư số 32/2025/TT-BTC ngày 31 tháng 5 năm 2025 của Bộ trưởng Bộ Tài chính hướng dẫn thực hiện một số điều của Luật Quản lý thuế ngày 13 tháng 6 năm 2019, Nghị định số 123/2020/NĐ-CP ngày 19 tháng 10 năm 2020 của Chính phủ quy định về hóa đơn, chứng từ, Nghị định số 70/2025/NĐ-CP ngày 20 tháng 3 năm 2025 sửa đổi, bổ sung một số điều của Nghị định số 123/2020/NĐ-CP hết hiệu lực thi hành. 3. Thông tư này gồm 05 Phụ lục, các phụ lục từ Phụ lục I đến Phụ lục IV có tính bắt buộc, Phụ lục V có tính chất tham khảo (không bắt buộc).';

const ND_284 = 'Điều 21. Hiệu lực thi hành Nghị định này có hiệu lực thi hành từ ngày 01 tháng 9 năm 2026 đến ngày Nghị quyết số 05/2025/NQ-CP hết hiệu lực thi hành.';

const ND_336_BIEU_MAU = 'Số định danh chứng thư số (Serial Number) x Tên đơn vị cung cấp dịch vụ chứng thư số x x x Tên người được cấp chứng thư số x Ngày hiệu lực x Ngày hết hiệu lực x Khóa công khai (Public Key) x';

const gonQh = (ds: QuanHeHieuLuc[]) => ds.map(({ so_hieu_dich, loai, hieu_luc_tu, do_tin_cay, co_ngoai_le }) => ({ so_hieu_dich, loai, hieu_luc_tu, do_tin_cay, co_ngoai_le }));

describe('tách quan hệ bãi bỏ từ điều "Hiệu lực thi hành"', () => {
  it('Luật 108/2025: bãi bỏ Luật 38/2019 từ 01/07/2026 (có ngoại lệ) và riêng Điều 51 từ 01/01/2026', () => {
    expect(gonQh(tachQuanHeHieuLuc(LUAT_108, '108/2025/QH15', '2026-07-01'))).toEqual([
      { so_hieu_dich: '38/2019/QH14', loai: 'bai_bo', hieu_luc_tu: '2026-07-01', do_tin_cay: 'chac_chan', co_ngoai_le: true },
      // Luật 56/2024 chỉ được nhắc là luật đã sửa đổi 38/2019 — không phải đối tượng bãi bỏ.
      { so_hieu_dich: '38/2019/QH14', loai: 'bai_bo_mot_phan', hieu_luc_tu: '2026-01-01', do_tin_cay: 'chac_chan', co_ngoai_le: false },
    ]);
  });

  // Hai câu dưới đây DỰNG theo mẫu câu trong kho (bản xuất bị cắt giữa chừng), không phải trích nguyên văn.
  it('văn bản sửa đổi được nhắc để gọi tên văn bản bị bãi bỏ thì không bị tính (Luật GTGT 48/2024 trong Luật TNCN 109/2025)', () => {
    const cau = '3. Luật Thuế thu nhập cá nhân số 04/2007/QH12 đã được sửa đổi, bổ sung một số điều theo Luật số 26/2012/QH13, Luật số 71/2014/QH13 và Luật số 48/2024/QH15 hết hiệu lực kể từ ngày Luật này có hiệu lực thi hành.';
    expect(gonQh(tachQuanHeHieuLuc(cau, '109/2025/QH15', '2026-07-01'))).toEqual([
      { so_hieu_dich: '04/2007/QH12', loai: 'bai_bo', hieu_luc_tu: '2026-07-01', do_tin_cay: 'chac_chan', co_ngoai_le: false },
    ]);
    const boi = '2. Nghị định số 96/2020/NĐ-CP được sửa đổi, bổ sung bởi Nghị định số 37/2022/NĐ-CP ngày 06 tháng 6 năm 2022 của Chính phủ hết hiệu lực kể từ ngày Nghị định này có hiệu lực thi hành.';
    expect(tachQuanHeHieuLuc(boi, '79/2026/NĐ-CP', '2026-05-02').map((q) => q.so_hieu_dich)).toEqual(['96/2020/NĐ-CP']);
  });

  it('TT 104/2026: một văn bản, ngày theo "kể từ ngày Thông tư này có hiệu lực"', () => {
    expect(gonQh(tachQuanHeHieuLuc(TT_104, '104/2026/TT-BTC', '2026-07-17'))).toEqual([
      { so_hieu_dich: '05/2026/TT-BTC', loai: 'bai_bo', hieu_luc_tu: '2026-07-17', do_tin_cay: 'chac_chan', co_ngoai_le: false },
    ]);
  });

  it('TT 116/2026: danh sách a), b) — lấy đúng văn bản đứng đầu từng mục', () => {
    expect(gonQh(tachQuanHeHieuLuc(TT_116, '116/2026/TT-BTC', '2026-08-14'))).toEqual([
      { so_hieu_dich: '223/2016/TT-BTC', loai: 'bai_bo', hieu_luc_tu: '2026-08-14', do_tin_cay: 'chac_chan', co_ngoai_le: false },
      { so_hieu_dich: '05/2021/TT-BTC', loai: 'bai_bo', hieu_luc_tu: '2026-08-14', do_tin_cay: 'chac_chan', co_ngoai_le: false },
    ]);
  });

  it('NĐ 254/2026: mục "Điều 1 Nghị định …" là bãi bỏ một phần; số hiệu chỉ được nhắc tới không bị tính', () => {
    const r = gonQh(tachQuanHeHieuLuc(ND_254, '254/2026/NĐ-CP', '2026-07-01'));
    expect(r).toEqual([
      { so_hieu_dich: '123/2020/NĐ-CP', loai: 'bai_bo', hieu_luc_tu: '2026-07-01', do_tin_cay: 'chac_chan', co_ngoai_le: false },
      { so_hieu_dich: '41/2022/NĐ-CP', loai: 'bai_bo_mot_phan', hieu_luc_tu: '2026-07-01', do_tin_cay: 'chac_chan', co_ngoai_le: false },
      { so_hieu_dich: '70/2025/NĐ-CP', loai: 'bai_bo', hieu_luc_tu: '2026-07-01', do_tin_cay: 'chac_chan', co_ngoai_le: false },
    ]);
    expect(r.map((x) => x.so_hieu_dich)).not.toContain('15/2022/NĐ-CP');
    expect(r.map((x) => x.so_hieu_dich)).not.toContain('43/2022/QH15');
  });

  it('TT 91/2026: câu liệt kê không dấu a) — số đầu chắc chắn, các số sau cần xem lại', () => {
    expect(gonQh(tachQuanHeHieuLuc(TT_91, '91/2026/TT-BTC', '2026-07-01'))).toEqual([
      { so_hieu_dich: '32/2025/TT-BTC', loai: 'bai_bo', hieu_luc_tu: '2026-07-01', do_tin_cay: 'chac_chan', co_ngoai_le: false },
      { so_hieu_dich: '123/2020/NĐ-CP', loai: 'bai_bo', hieu_luc_tu: '2026-07-01', do_tin_cay: 'can_xem_lai', co_ngoai_le: false },
      { so_hieu_dich: '70/2025/NĐ-CP', loai: 'bai_bo', hieu_luc_tu: '2026-07-01', do_tin_cay: 'can_xem_lai', co_ngoai_le: false },
    ]);
  });

  it('không nhận nhầm: thời hạn "đến ngày … hết hiệu lực" và ô biểu mẫu "Ngày hết hiệu lực"', () => {
    expect(tachQuanHeHieuLuc(ND_284, '284/2026/NĐ-CP', '2026-09-01')).toEqual([]);
    expect(tachQuanHeHieuLuc(ND_336_BIEU_MAU, '336/2026/NĐ-CP', '2026-10-15')).toEqual([]);
  });

  it('văn bản hợp nhất (VBHN) và ngày giữ chỗ 01/01/1900 không sinh quan hệ có ngày sai', () => {
    expect(tachQuanHeHieuLuc(TT_104, '61/VBHN-BTC', '1900-01-01')).toEqual([]);
    // Nguồn thường nhưng kho ghi ngày giữ chỗ: không bịa ngày.
    expect(tachQuanHeHieuLuc(TT_104, '104/2026/TT-BTC', '1900-01-01').map((q) => q.hieu_luc_tu)).toEqual([null]);
  });

  it('số hiệu có chữ thường và chữ Đ được lấy trọn ("QĐ-TTg")', () => {
    const r = tachQuanHeHieuLuc('2. Quyết định số 38/2004/QĐ-TTg ngày 17 tháng 3 năm 2004 của Thủ tướng Chính phủ hết hiệu lực từ ngày Nghị định này có hiệu lực.', '136/2013/NĐ-CP', '2014-01-01');
    expect(r.map((q) => q.so_hieu_dich)).toEqual(['38/2004/QĐ-TTg']);
  });

  it('giữ câu trích nguyên văn để kiểm lại', () => {
    const [q] = tachQuanHeHieuLuc(TT_104, '104/2026/TT-BTC', '2026-07-17');
    expect(q.trich).toContain('Thông tư số 05/2026/TT-BTC');
    expect(q.trich).toContain('hết hiệu lực kể từ ngày Thông tư này có hiệu lực');
  });
});

describe('tình trạng tại một ngày (nghiệm thu: hai kỳ khác nhau chọn đúng phiên bản)', () => {
  const qh = [
    ...tachQuanHeHieuLuc(LUAT_108, '108/2025/QH15', '2026-07-01'),
    ...tachQuanHeHieuLuc(TT_91, '91/2026/TT-BTC', '2026-07-01'),
    ...tachQuanHeHieuLuc(ND_254, '254/2026/NĐ-CP', '2026-07-01'),
  ];

  it('Luật 38/2019: trước 01/01/2026 chưa ghi nhận; giữa kỳ một phần; từ 01/07/2026 hết hiệu lực', () => {
    expect(hieuLucTaiNgay('38/2019/QH14', qh, '2025-12-31').trang_thai).toBe('chua_ghi_nhan_bai_bo');
    expect(hieuLucTaiNgay('38/2019/QH14', qh, '2026-03-01').trang_thai).toBe('het_hieu_luc_mot_phan');
    const sau = hieuLucTaiNgay('38/2019/QH14', qh, '2026-09-17');
    expect(sau).toMatchObject({ trang_thai: 'het_hieu_luc', tu: '2026-07-01', boi: '108/2025/QH15', co_ngoai_le: true });
    expect(nhanHieuLuc(sau)).toBe('Hết hiệu lực từ 01/07/2026 (bãi bỏ bởi 108/2025/QH15, có ngoại lệ)');
  });

  it('quan hệ chắc chắn thắng quan hệ cần xem lại cho cùng văn bản', () => {
    expect(hieuLucTaiNgay('123/2020/NĐ-CP', qh, '2026-09-17').trang_thai).toBe('het_hieu_luc');
  });

  it('chỉ có quan hệ cần xem lại → "có thể đã hết hiệu lực", không khẳng định', () => {
    // Chỉ dùng quan hệ từ TT 91/2026, nơi 70/2025 đứng sau số hiệu đầu trong câu liệt kê mơ hồ.
    const h = hieuLucTaiNgay('70/2025/NĐ-CP', tachQuanHeHieuLuc(TT_91, '91/2026/TT-BTC', '2026-07-01'), '2026-09-17');
    expect(h.trang_thai).toBe('co_the_het_hieu_luc');
    expect(nhanHieuLuc(h)).toContain('chưa xác minh');
  });

  it('văn bản mới không bị ai bãi bỏ: không bao giờ nói "còn hiệu lực"', () => {
    const h = hieuLucTaiNgay('108/2025/QH15', qh, '2026-09-17');
    expect(h.trang_thai).toBe('chua_ghi_nhan_bai_bo');
    expect(nhanHieuLuc(h)).toBe('Kho chưa ghi nhận văn bản bãi bỏ');
    expect(nhanHieuLuc(h)).not.toMatch(/còn hiệu lực/);
  });
});
