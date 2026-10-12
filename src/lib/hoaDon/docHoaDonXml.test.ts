import { describe, expect, it } from 'vitest';
import { docHoaDonXml, demMuc, duLieuLuuChungTu, KICH_THUOC_TOI_DA, type DongKiem } from './docHoaDonXml';
import { truongTraCuu, CONG_TRA_CUU_HDDT } from './traCuu';
import hopLe from './__mau__/hop-le.xml?raw';
import lechTong from './__mau__/lech-tong.xml?raw';
import banHangBoc from './__mau__/ban-hang-boc.xml?raw';
import docHai from './__mau__/doc-hai.xml?raw';

/* Mọi tệp trong __mau__ là hoá đơn TỔNG HỢP: số liệu và MST giả, đúng hình. Không dùng hoá đơn thật của ai. */

const muc = (kiem: DongKiem[], khoa: string) => kiem.find((k) => k.khoa === khoa)?.muc;

describe('docHoaDonXml — hoá đơn đúng', () => {
  const r = docHoaDonXml(hopLe, { mstCongTy: '0108888888' });
  it('đọc đủ trường theo định dạng', () => {
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.hoa_don).toMatchObject({
      ky_hieu_mau: '1', ky_hieu: 'C26TMM', so: '123', ngay_lap: '2026-09-15',
      ben_ban: { mst: '0109999999' }, ben_mua: { mst: '0108888888' },
      tong_chua_thue: 440000, tong_thue: 41200, tong_thanh_toan: 481200, co_chu_ky: true,
    });
    expect(r.hoa_don.ma_cqt).toBeTruthy();
    expect(r.hoa_don.dong).toHaveLength(2);
  });
  it('mọi phép kiểm đạt, không lệch, không thiếu', () => {
    if (!r.ok) throw new Error('phải đọc được');
    const d = demMuc(r.kiem);
    expect(d.lech).toBe(0);
    expect(d.thieu).toBe(0);
    for (const k of ['thanh_tien_dong', 'tong_chua_thue', 'tien_thue_nhom', 'tong_thue', 'tong_thanh_toan', 'chu_ky', 'ma_cqt', 'mst_mua']) {
      expect(muc(r.kiem, k), k).toBe('dat');
    }
  });
  it('chữ ký: chỉ nói CÓ, không khẳng định hợp lệ', () => {
    if (!r.ok) throw new Error('phải đọc được');
    const ck = r.kiem.find((k) => k.khoa === 'chu_ky')!;
    expect(ck.cau).toMatch(/không khẳng định chữ ký hợp lệ/);
  });
  it('dữ liệu lưu chứng từ: số nguyên đồng, ký hiệu ghép mẫu số', () => {
    if (!r.ok) throw new Error('phải đọc được');
    const { du, canh_bao } = duLieuLuuChungTu(r.hoa_don);
    expect(du).toEqual({
      loai: 'hoa_don', so_hoa_don: '123', ky_hieu: '1C26TMM', ngay: '2026-09-15', ben_ban: 'CÔNG TY TNHH MẪU BÁN HÀNG',
      ma_so_thue_ben_ban: '0109999999', tien_truoc_thue: 440000, tien_thue: 41200, tong_tien: 481200,
    });
    expect(canh_bao).toBeNull();
  });
  it('tra cứu: đưa đủ trường để sao chép, đúng cổng của cơ quan thuế', () => {
    if (!r.ok) throw new Error('phải đọc được');
    expect(CONG_TRA_CUU_HDDT).toBe('https://hoadondientu.gdt.gov.vn/');
    expect(truongTraCuu(r.hoa_don).map((t) => [t.khoa, t.gia_tri])).toEqual([
      ['mst_ban', '0109999999'], ['ky_hieu_mau', '1'], ['ky_hieu', 'C26TMM'], ['so', '123'], ['tong_thue', '41200'], ['tong_thanh_toan', '481200'],
    ]);
  });
});

describe('docHoaDonXml — hoá đơn có lỗi', () => {
  const r = docHoaDonXml(lechTong, { mstCongTy: '0108888888' });
  it('bắt lệch từng dòng, thuế, tổng, năm ký hiệu, MST người mua', () => {
    if (!r.ok) throw new Error('phải đọc được');
    expect(muc(r.kiem, 'thanh_tien_dong')).toBe('lech');
    expect(muc(r.kiem, 'tien_thue_nhom')).toBe('lech');
    expect(muc(r.kiem, 'tong_thanh_toan')).toBe('lech');
    expect(muc(r.kiem, 'ky_hieu_nam')).toBe('lech');
    expect(muc(r.kiem, 'mst_mua')).toBe('lech');
  });
  it('thiếu chữ ký; ký hiệu "C" mà không có mã CQT → lệch', () => {
    if (!r.ok) throw new Error('phải đọc được');
    expect(muc(r.kiem, 'chu_ky')).toBe('thieu');
    expect(muc(r.kiem, 'ma_cqt')).toBe('lech');
  });
  it('MST 12 số người bán: đúng hình, nhưng không gửi lên luu_chung_tu (máy chủ chỉ nhận 10 số)', () => {
    if (!r.ok) throw new Error('phải đọc được');
    expect(muc(r.kiem, 'mst_ban')).toBe('dat');
    const { du, canh_bao } = duLieuLuuChungTu(r.hoa_don);
    expect(du.ma_so_thue_ben_ban).toBeNull();
    expect(canh_bao).toMatch(/012345678901/);
  });
  it('công ty chưa có MST: không so được → lưu ý, không phải đạt', () => {
    const r2 = docHoaDonXml(lechTong, { mstCongTy: null });
    if (!r2.ok) throw new Error('phải đọc được');
    expect(muc(r2.kiem, 'mst_mua')).toBe('luu_y');
  });
});

describe('docHoaDonXml — hoá đơn bán hàng bọc trong thông điệp', () => {
  const r = docHoaDonXml(banHangBoc, { mstCongTy: '0108888888' });
  it('tìm được HDon trong TDiep; chữ ký có tiền tố namespace vẫn nhận ra', () => {
    if (!r.ok) throw new Error('phải đọc được');
    expect(r.hoa_don.so).toBe('7');
    expect(r.hoa_don.co_chu_ky).toBe(true);
  });
  it('số lượng thập phân, dòng ghi chú bỏ qua; không kiểm thuế khi là hoá đơn bán hàng', () => {
    if (!r.ok) throw new Error('phải đọc được');
    expect(muc(r.kiem, 'thanh_tien_dong')).toBe('dat');
    expect(muc(r.kiem, 'tong_thanh_toan')).toBe('dat');
    expect(muc(r.kiem, 'tong_thue')).toBeUndefined();
    expect(muc(r.kiem, 'mst_mua')).toBe('thieu');
    expect(muc(r.kiem, 'ma_cqt')).toBe('luu_y');
  });
});

describe('docHoaDonXml — chống tệp độc, tệp sai', () => {
  it('từ chối DOCTYPE/ENTITY trước khi phân tích', () => {
    const r = docHoaDonXml(docHai);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.loi).toMatch(/DOCTYPE/);
  });
  it('từ chối tệp quá 2 MB', () => {
    const r = docHoaDonXml(`<HDon>${'a'.repeat(KICH_THUOC_TOI_DA)}</HDon>`);
    expect(r.ok).toBe(false);
  });
  it('XML hỏng → báo, không ném lỗi', () => {
    const r = docHoaDonXml('<HDon><DLHDon></HDon>');
    expect(r.ok).toBe(false);
  });
  it('XML hợp lệ nhưng không phải hoá đơn → báo không thấy HDon', () => {
    const r = docHoaDonXml('<?xml version="1.0"?><ToKhai><MST>0100000000</MST></ToKhai>');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.loi).toMatch(/HDon/);
  });
  it('số tiền lẻ trên hoá đơn VND → lệch, không tự làm tròn', () => {
    const xml = hopLe.replace('<TgTThue>41200</TgTThue>', '<TgTThue>41200.5</TgTThue>');
    const r = docHoaDonXml(xml);
    if (!r.ok) throw new Error('phải đọc được');
    expect(muc(r.kiem, 'so_nguyen')).toBe('lech');
  });
  it('thiếu trường bắt buộc → thiếu', () => {
    const r = docHoaDonXml(hopLe.replace('<SHDon>123</SHDon>', '').replace('<KHMSHDon>1</KHMSHDon>', ''));
    if (!r.ok) throw new Error('phải đọc được');
    expect(muc(r.kiem, 'so')).toBe('thieu');
    expect(muc(r.kiem, 'ky_hieu_mau')).toBe('thieu');
  });
});
