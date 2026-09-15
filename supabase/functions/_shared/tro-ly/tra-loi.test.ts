import { describe, expect, it } from 'vitest';
import { CAU_CHUA_HIEU, dungTraLoi } from './tra-loi';
import type { KetQuaNangLuc } from './kieu';

const kq = (p: Partial<KetQuaNangLuc>): KetQuaNangLuc => ({
  nang_luc: 'x', nhom: 'ai_token', tom_tat: 'Tóm tắt.', the: [], de_xuat: [], nguon: [], trang: [], ...p,
});

describe('dựng câu trả lời', () => {
  it('không nhận ra việc gì thì nói thật là chưa hiểu', () => {
    const r = dungTraLoi({ ketQua: [], cheDo: 'co_dinh' });
    expect(r.cau).toBe(CAU_CHUA_HIEU);
    expect(r.ket_qua).toEqual([]);
  });

  it('không có mô hình: ghép câu tóm tắt; gộp đề xuất trùng; nêu nguồn đã đọc', () => {
    const dx = { khoa: 'cap_nhat_bang_gia', loai: 'cap_nhat_bang_gia' as const, nhan: 'Lấy bảng giá', mo_ta: 'x', tham_so: {} };
    const r = dungTraLoi({
      cheDo: 'co_dinh',
      ketQua: [
        kq({ nang_luc: 'chi_phi_ai', tom_tat: 'Đã chi $10.00.', nguon: [{ ten: 'Chi phí AI', mo_ta: '' }], de_xuat: [dx] }),
        kq({ nang_luc: 'model_re_hon', tom_tat: 'Có model rẻ hơn.', nguon: [{ ten: 'Chi phí AI', mo_ta: '' }, { ten: 'Bảng giá OpenRouter', mo_ta: '' }], de_xuat: [dx] }),
      ],
    });
    expect(r.cau).toBe('Đã chi $10.00.\n\nCó model rẻ hơn.');
    expect(r.ket_qua.flatMap((k) => k.de_xuat)).toHaveLength(1);
    expect(r.buoc.map((b) => b.ten)).toEqual(['hieu', 'du_lieu', 'phan_tich', 'de_xuat']);
    expect(r.buoc[1].cau).toBe('Đã đọc: Chi phí AI, Bảng giá OpenRouter.');
  });

  it('có mô hình: dùng lời mô hình nhưng giữ nguyên số liệu và đề xuất của MIMI', () => {
    const r = dungTraLoi({ cheDo: 'mo_hinh', cauMoHinh: ' Tháng này ổn. ', ketQua: [kq({ the: [{ loai: 'ghi_chu', muc_do: 'thong_tin', cau: 'a' }] })] });
    expect(r.cau).toBe('Tháng này ổn.');
    expect(r.ket_qua[0].the).toHaveLength(1);
  });
});
