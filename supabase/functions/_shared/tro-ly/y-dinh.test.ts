import { describe, expect, it } from 'vitest';
import { MAC_DINH_THEO_NHOM, nhanYDinh } from './y-dinh';

describe('nhận ý định không cần mô hình', () => {
  it('câu mẫu của chủ sản phẩm: chi AI vượt ngân sách + model rẻ hơn', () => {
    expect(nhanYDinh('Tìm các khoản chi AI vượt ngân sách và đề xuất model rẻ hơn.')).toEqual(['chi_phi_ai', 'model_re_hon']);
  });

  it('muốn model rẻ hơn thì luôn kèm chi phí AI, dù câu không nói', () => {
    expect(nhanYDinh('Có model nào rẻ hơn không?')).toEqual(['chi_phi_ai', 'model_re_hon']);
  });

  it('"chi phí AI" không bị hiểu thành chi phí chung của doanh nghiệp', () => {
    expect(nhanYDinh('Chi phí AI tháng này bao nhiêu?')).toEqual(['chi_phi_ai']);
    expect(nhanYDinh('Chi phí tháng này tăng không?')).toEqual(['chi_phi_thang']);
  });

  it('nhận đúng các nhóm hay hỏi', () => {
    expect(nhanYDinh('Khoản nào đang chờ tôi duyệt?')).toEqual(['yeu_cau_cho_duyet']);
    expect(nhanYDinh('Khoản chi nào chưa có hoá đơn đầu vào?')).toEqual(['thieu_chung_tu']);
    expect(nhanYDinh('Khách nào đang nợ quá hạn?')).toEqual(['hoa_don_qua_han']);
    expect(nhanYDinh('Dòng tiền 6 tháng qua thế nào')).toEqual(['dong_tien']);
    expect(nhanYDinh('Token của Claude dùng bao nhiêu?')).toEqual(['token_ai', 'chi_phi_ai']);
    expect(nhanYDinh('Báo cáo lợi nhuận')).toEqual(['bao_cao_tai_chinh']);
    expect(nhanYDinh('Kết nối Tổng cục Thuế đã chạy chưa?')).toEqual(['tat_ca_ket_noi']);
  });

  it('chữ "ai" là "người nào" thì không kéo chi phí AI vào', () => {
    expect(nhanYDinh('Ai đã duyệt khoản này?')).toEqual(['yeu_cau_cho_duyet']);
  });

  it('không hiểu thì trả rỗng, trừ khi người dùng đã chọn nhóm', () => {
    expect(nhanYDinh('Hôm nay trời đẹp')).toEqual([]);
    expect(nhanYDinh('Hôm nay trời đẹp', 'chung_tu')).toEqual([MAC_DINH_THEO_NHOM.chung_tu]);
  });

  it('chỉ "hoá đơn" thì xem cả hai phía', () => {
    expect(nhanYDinh('hoá đơn')).toEqual(['hoa_don_qua_han', 'thieu_chung_tu']);
  });

  it('không quá ba năng lực một câu', () => {
    expect(nhanYDinh('duyệt agent token chi phí AI chứng từ dòng tiền báo cáo').length).toBe(3);
  });
});
