import { describe, expect, it } from 'vitest';
import {
  canTraLuat,
  chonNguon,
  nguonThanhLoiDan,
  tenNguon,
  KY_TU_MOI_NGUON,
  SO_DOAN_MOI_VAN_BAN,
  type DoanLuat,
} from './nguon-luat';

const d = (sua: Partial<DoanLuat> = {}): DoanLuat => ({
  ma_cong_bao: 'a',
  so_hieu: '141/2026/NĐ-CP',
  loai: 'Nghị định',
  ten: 'Nghị định sửa đổi Nghị định 68/2026/NĐ-CP',
  ngay_ban_hanh: '2026-04-29',
  ngay_hieu_luc: '2026-01-01',
  url: 'https://congbao.chinhphu.vn/van-ban/nghi-dinh-141.htm',
  nhan: 'Điều 1',
  noi_dung: 'Sửa đổi cụm từ "500 triệu đồng" thành "01 tỷ đồng".',
  du_moi_tu: true,
  diem: 0.5,
  ...sua,
});

describe('câu hỏi nào cần tra luật', () => {
  it('nhận cả chữ có dấu và không dấu', () => {
    expect(canTraLuat('Hộ kinh doanh doanh thu 1 tỷ có phải nộp thuế không?')).toBe(true);
    expect(canTraLuat('thue ho kinh doanh 2026')).toBe(true);
    expect(canTraLuat('Công ty bị trạng thái 06 thì làm sao')).toBe(true);
    expect(canTraLuat('Nghị định 141 nói gì')).toBe(true);
  });

  it('câu hỏi về số liệu của chính mình thì không', () => {
    expect(canTraLuat('Dòng tiền tháng này thế nào?')).toBe(false);
    expect(canTraLuat('Chào bạn')).toBe(false);
  });
});

describe('chọn nguồn', () => {
  it('mỗi văn bản tối đa hai đoạn, giữ thứ tự xếp hạng', () => {
    const ds = [d({ nhan: 'Điều 1' }), d({ nhan: 'Điều 2' }), d({ nhan: 'Điều 3' }), d({ ma_cong_bao: 'b', nhan: 'Điều 9' })];
    const ra = chonNguon(ds);
    expect(ra.map((x) => x.nhan)).toEqual(['Điều 1', 'Điều 2', 'Điều 9']);
    expect(ra.filter((x) => x.ma_cong_bao === 'a')).toHaveLength(SO_DOAN_MOI_VAN_BAN);
  });

  it('không quá số nguồn tối đa', () => {
    const ds = Array.from({ length: 20 }, (_, i) => d({ ma_cong_bao: `v${i}` }));
    expect(chonNguon(ds, 6)).toHaveLength(6);
  });
});

describe('lời dặn cho mô hình', () => {
  it('có số hiệu, Điều, ngày và đường dẫn Công báo', () => {
    const s = nguonThanhLoiDan([d()]);
    expect(s).toContain('[1] Nghị định 141/2026/NĐ-CP · Điều 1');
    expect(s).toContain('ban hành 29/04/2026');
    expect(s).toContain('https://congbao.chinhphu.vn/');
    expect(s).toContain('01 tỷ đồng');
  });

  it('văn bản cũ bị gắn cảnh báo có thể đã thay thế', () => {
    expect(nguonThanhLoiDan([d({ ngay_ban_hanh: '2015-03-18' })])).toContain('CÓ THỂ ĐÃ BỊ SỬA/THAY THẾ');
    expect(nguonThanhLoiDan([d()])).not.toContain('CÓ THỂ ĐÃ BỊ SỬA/THAY THẾ');
  });

  it('không có nguồn thì dặn nói thẳng là chưa có, không đoán', () => {
    const s = nguonThanhLoiDan([]);
    expect(s).toContain('Không tìm thấy đoạn nào');
    expect(s).toContain('Không đoán số hiệu');
  });

  it('đoạn dài bị cắt', () => {
    const s = nguonThanhLoiDan([d({ noi_dung: 'x'.repeat(KY_TU_MOI_NGUON + 500) })]);
    expect(s).toContain('x'.repeat(KY_TU_MOI_NGUON) + '…');
    expect(s).not.toContain('x'.repeat(KY_TU_MOI_NGUON + 1));
  });

  it('văn bản thiếu số hiệu vẫn có tên để trích', () => {
    expect(tenNguon(d({ so_hieu: null, loai: null, nhan: null }))).toBe('Nghị định sửa đổi Nghị định 68/2026/NĐ-CP');
  });
});
