import { describe, expect, it } from 'vitest';
import { duLieuTrong, NANG_LUC, traCuuLuat } from './tinh-toan';
import { nhanYDinh } from './y-dinh';
import type { DoanLuat } from '../luat/nguon-luat';

/** MIMI-P0-001: tra cứu luật chuyển từ function `chat` vào bộ não chung `tro-ly`. */

const KY = { tu: '2026-07-01', den: '2026-09-30', nhan: 'quý 3/2026' };
const doan = (p: Partial<DoanLuat>): DoanLuat => ({
  ma_cong_bao: 'x', so_hieu: '108/2025/QH15', loai: 'Luật', ten: 'Luật Quản lý thuế', ngay_ban_hanh: '2025-12-10',
  ngay_hieu_luc: '2026-07-01', url: 'https://congbao.chinhphu.vn/x', nhan: 'Điều 12', noi_dung: 'Nội dung trích.', du_moi_tu: true, diem: 1,
  ...p,
});

describe('tra_cuu_luat', () => {
  it('có trong registry chung, đọc nguồn kho_luat', () => {
    expect(NANG_LUC.tra_cuu_luat.can).toEqual(['kho_luat']);
  });

  it('kho lỗi (null) nói chưa tra được — không nói "không có quy định"', () => {
    const r = traCuuLuat({ ...duLieuTrong('2026-09-16', KY), khoLuat: null });
    expect(r.tom_tat).toContain('Chưa tra được');
    expect(r.tom_tat).not.toContain('chưa có đoạn');
    expect(r.the).toEqual([]);
  });

  it('kho không có đoạn nào ([]) nói thẳng là chưa có và mời hỏi chuyên gia', () => {
    const r = traCuuLuat({ ...duLieuTrong('2026-09-16', KY), khoLuat: [] });
    expect(r.tom_tat).toContain('chưa có đoạn');
  });

  it('có đoạn: trích nguyên văn, kèm ngày ban hành, hiệu lực, tình trạng, bản gốc và cảnh báo tham khảo', () => {
    const r = traCuuLuat({ ...duLieuTrong('2026-09-16', KY), khoLuat: [doan({ hieu_luc: 'Kho chưa ghi nhận văn bản bãi bỏ' })] });
    const bang = r.the.find((t) => t.loai === 'bang');
    expect(bang && bang.loai === 'bang' && bang.dong[0]).toEqual([
      'Luật 108/2025/QH15 · Điều 12', '2025-12-10', '2026-07-01', 'Kho chưa ghi nhận văn bản bãi bỏ', '“Nội dung trích.”', 'https://congbao.chinhphu.vn/x',
    ]);
    const ghi = r.the.filter((t) => t.loai === 'ghi_chu').map((t) => (t.loai === 'ghi_chu' ? t.cau : '')).join(' ');
    expect(ghi).toContain('tham khảo');
    expect(ghi).not.toContain('trước 2024');
  });

  it('P0-003: chỉ còn văn bản đã hết hiệu lực → chưa đủ căn cứ, liệt kê văn bản bị loại', () => {
    const r = traCuuLuat({
      ...duLieuTrong('2026-09-17', KY),
      khoLuat: [],
      khoLuatDaLoai: [{ van_ban: '38/2019/QH14', nhan: 'Hết hiệu lực từ 01/07/2026 (bãi bỏ bởi 108/2025/QH15, có ngoại lệ)' }],
    });
    expect(r.tom_tat).toContain('Chưa đủ căn cứ');
    expect(r.tom_tat).not.toContain('chưa có đoạn');
    const bang = r.the.find((t) => t.loai === 'bang');
    expect(bang && bang.loai === 'bang' && bang.dong).toEqual([['38/2019/QH14', 'Hết hiệu lực từ 01/07/2026 (bãi bỏ bởi 108/2025/QH15, có ngoại lệ)']]);
  });

  it('P0-003: không kiểm được hiệu lực thì mỗi đoạn ghi rõ và có cảnh báo', () => {
    const r = traCuuLuat({ ...duLieuTrong('2026-09-17', KY), khoLuat: [doan({})], khoLuatChuaKiemHieuLuc: true });
    const bang = r.the.find((t) => t.loai === 'bang');
    expect(bang && bang.loai === 'bang' && bang.dong[0][3]).toBe('Chưa kiểm được tình trạng hiệu lực');
    const ghi = r.the.filter((t) => t.loai === 'ghi_chu').map((t) => (t.loai === 'ghi_chu' ? t.cau : '')).join(' ');
    expect(ghi).toContain('Chưa kiểm được tình trạng hiệu lực');
  });

  it('văn bản ban hành trước 2024 bị cảnh báo có thể đã sửa đổi/thay thế', () => {
    const r = traCuuLuat({ ...duLieuTrong('2026-09-16', KY), khoLuat: [doan({ so_hieu: '38/2019/QH14', ngay_ban_hanh: '2019-06-13' })] });
    const ghi = r.the.filter((t) => t.loai === 'ghi_chu').map((t) => (t.loai === 'ghi_chu' ? t.cau : '')).join(' ');
    expect(ghi).toContain('1 văn bản ban hành trước 2024');
    expect(ghi).toContain('vẫn có thể đã bị sửa đổi');
  });
});

describe('nhận ý định sau khi gộp hai bộ não', () => {
  it('câu pháp lý chung → tra_cuu_luat', () => {
    expect(nhanYDinh('Tạm ngừng kinh doanh cần làm thủ tục gì?')).toEqual(['tra_cuu_luat']);
  });

  it('hỏi ngưỡng thuế có chữ "doanh thu" chỉ ra nghĩa vụ thuế, không kéo báo cáo dòng tiền', () => {
    expect(nhanYDinh('Hộ kinh doanh doanh thu bao nhiêu thì phải nộp thuế?')).toEqual(['nghia_vu_thue']);
  });

  it('câu nghiệp vụ không bị đẩy sang tra luật', () => {
    expect(nhanYDinh('Khoản chi nào tháng này chưa có chứng từ?')).toEqual(['thieu_chung_tu']);
  });

  it('câu pháp lý thắng nhóm việc đang chọn', () => {
    expect(nhanYDinh('luật quản lý thuế quy định gì', 'chi_phi')).toEqual(['tra_cuu_luat']);
  });
});
