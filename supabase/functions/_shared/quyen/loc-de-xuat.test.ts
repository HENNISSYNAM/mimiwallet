import { describe, expect, it } from 'vitest';
import { deXuatDuocPhep, locDeXuat, locPhanTich, QUYEN_DE_XUAT } from './loc-de-xuat';
import { LOAI_DE_XUAT } from '../tro-ly/kieu';
import type { DeXuat, KetQuaNangLuc, PhanTichNhanh } from '../tro-ly/kieu';

/** MIMI-P1-003 — nút chỉ hiện cho vai trò bấm được; số liệu thì ai cũng thấy. */

const dx = (loai: DeXuat['loai'], khoa = loai): DeXuat => ({ khoa, loai, nhan: khoa, mo_ta: '', tham_so: {} });

const ketQua: KetQuaNangLuc[] = [{
  nang_luc: 'yeu_cau_cho_duyet', nhom: 'tro_ly', tom_tat: 'Có 1 khoản chờ duyệt, 2.000.000 ₫.',
  the: [{ loai: 'ghi_chu', muc_do: 'thong_tin', cau: 'số liệu vẫn hiện' }],
  de_xuat: [dx('duyet_yeu_cau'), dx('tu_choi_yeu_cau'), dx('mo_trang'), dx('dong_bo_ngan_hang')],
  nguon: [], trang: [],
}];

describe('lọc nút theo vai trò', () => {
  it('mọi loại đề xuất đều khai báo quyền tương ứng', () => {
    for (const l of LOAI_DE_XUAT) expect(QUYEN_DE_XUAT[l], l).toBeTruthy();
  });

  it('người xem: mất nút duyệt, từ chối, đồng bộ; giữ nút mở trang và toàn bộ số liệu', () => {
    const r = locDeXuat(ketQua, 'nguoi_xem');
    expect(r[0].de_xuat.map((d) => d.loai)).toEqual(['mo_trang']);
    expect(r[0].the).toEqual(ketQua[0].the);
    expect(r[0].tom_tat).toBe(ketQua[0].tom_tat);
  });

  it('kế toán: không duyệt nhưng đồng bộ được', () => {
    expect(locDeXuat(ketQua, 'ke_toan')[0].de_xuat.map((d) => d.loai)).toEqual(['mo_trang', 'dong_bo_ngan_hang']);
  });

  it('người duyệt: duyệt và từ chối được, không đồng bộ', () => {
    expect(locDeXuat(ketQua, 'nguoi_duyet')[0].de_xuat.map((d) => d.loai)).toEqual(['duyet_yeu_cau', 'tu_choi_yeu_cau', 'mo_trang']);
  });

  it('chủ doanh nghiệp giữ nguyên mọi nút', () => {
    expect(locDeXuat(ketQua, 'chu_so_huu')[0].de_xuat).toHaveLength(4);
    expect(deXuatDuocPhep(dx('duyet_yeu_cau'), 'chu_so_huu')).toBe(true);
  });

  it('màn đầu: thẻ cần xác nhận bỏ nút duyệt với vai trò không được duyệt, vẫn giữ số tiền', () => {
    const p: PhanTichNhanh = {
      chi_phi_ai: null,
      toi_uu: { y: [], tiet_kiem_usd: null, hoi: '' },
      can_xac_nhan: {
        so_khoan: 1, tong_tien: 2_000_000,
        muc: [{ yeu_cau_id: 'y1', muc_dich: 'Quảng cáo', nguoi_nhan: 'CONG TY A', agent: 'Agent', so_tien: 2_000_000, ngay: '2026-09-14', duyet: dx('duyet_yeu_cau') }],
      },
    };
    const xem = locPhanTich(p, 'nguoi_xem');
    expect(xem.can_xac_nhan.muc[0].duyet).toBeNull();
    expect(xem.can_xac_nhan.tong_tien).toBe(2_000_000);
    expect(locPhanTich(p, 'nguoi_duyet').can_xac_nhan.muc[0].duyet).toMatchObject({ loai: 'duyet_yeu_cau' });
  });
});
