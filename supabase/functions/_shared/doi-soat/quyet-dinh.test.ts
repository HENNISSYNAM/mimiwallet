import { describe, expect, it } from 'vitest';
import { doiChieuQuyetDinh } from './quyet-dinh';

describe('máy chủ chốt kết quả quyết định (P1-005)', () => {
  it('duyệt: giao diện báo xong và yêu cầu đã duyệt → thành công, ghi theo trạng thái thật', () => {
    const k = doiChieuQuyetDinh({ loai: 'duyet_yeu_cau', baoOk: true, trangThai: 'da_duyet' });
    expect(k.ket_qua).toBe('thanh_cong');
    expect(k.cau).toContain('Máy chủ đối chiếu');
  });

  it('duyệt: giao diện báo xong nhưng yêu cầu vẫn chờ duyệt → LỆCH, không ghi thành công', () => {
    expect(doiChieuQuyetDinh({ loai: 'duyet_yeu_cau', baoOk: true, trangThai: 'cho_duyet' })).toMatchObject({ ket_qua: 'loi', ma_loi: 'LECH_KET_QUA' });
  });

  it('duyệt bị treo (trình duyệt tắt) nhưng thực ra đã duyệt → máy chủ tự chốt thành công', () => {
    expect(doiChieuQuyetDinh({ loai: 'duyet_yeu_cau', baoOk: null, trangThai: 'da_chi' }).ket_qua).toBe('thanh_cong');
  });

  it('duyệt bị treo và yêu cầu vẫn chờ → KHONG_CO_KET_QUA', () => {
    expect(doiChieuQuyetDinh({ loai: 'duyet_yeu_cau', baoOk: null, trangThai: 'cho_duyet' }).ma_loi).toBe('KHONG_CO_KET_QUA');
  });

  it('từ chối: đối chiếu với trạng thái tu_choi', () => {
    expect(doiChieuQuyetDinh({ loai: 'tu_choi_yeu_cau', baoOk: true, trangThai: 'tu_choi' }).ket_qua).toBe('thanh_cong');
    expect(doiChieuQuyetDinh({ loai: 'tu_choi_yeu_cau', baoOk: true, trangThai: 'da_duyet' }).ma_loi).toBe('LECH_KET_QUA');
  });

  it('việc không có bằng chứng phía máy chủ: dựa lời giao diện nhưng ghi rõ nguồn; im lặng thì không đoán', () => {
    expect(doiChieuQuyetDinh({ loai: 'dong_bo_ngan_hang', baoOk: true, baoCau: 'Đã đồng bộ.', trangThai: null }))
      .toEqual({ ket_qua: 'thanh_cong', cau: '(giao diện báo) Đã đồng bộ.', ma_loi: null });
    expect(doiChieuQuyetDinh({ loai: 'dong_bo_ngan_hang', baoOk: null, trangThai: null }).ma_loi).toBe('KHONG_CO_KET_QUA');
  });
});
