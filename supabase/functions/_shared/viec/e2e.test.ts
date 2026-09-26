/**
 * Hai bài kiểm LAUNCH-CRITICAL của Prompt 4B, chạy trọn đường mã thật (luu.ts, chat-viec.ts, dong-co-viec.ts)
 * trên CSDL giả mô phỏng đúng ràng buộc của migration 20260926120000. Ràng buộc thật đã kiểm riêng trên
 * CSDL (supabase/tests/vong_giai_quyet_viec.sql, giao dịch rollback).
 */
import { describe, expect, it } from 'vitest';
import { DbGiaViec } from './eval/db-gia-viec';
import { xuLyChatViec } from './chat-viec';
import {
  danhDauBuocViec, daNhacTheoDoi, docChiTietViec, dongBoViecDoanhThu, dsViecCanLam, ghiNhanDaNop, moViecHanhTrinh, nhapTheoDoiDenHan, traLoiViec,
} from './luu';
import { chiaTheoHoatDong, type KhoanDoanhThu, type PhanLoaiHoatDong } from '../doanh-thu/theo-hoat-dong';
import { sanSangThue } from '../luat/san-sang-thue';
import type { LichCongTy } from '../luat/doc-lich-thue';
import type { MocThue } from '../luat/lich-thue';
import { duLieuTrong, NANG_LUC } from '../tro-ly/tinh-toan';

const C = '11111111-1111-4111-8111-111111111111';
const C2 = '22222222-2222-4222-8222-222222222222';
const U = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const HOM_NAY = '2026-09-26';

const lichRong = (): LichCongTy => ({
  lich: [], loaiNguoiNop: 'ho_kinh_doanh', soChuaRo: 0, tienChuaRo: 0, hoatDong: null,
  sanSang: sanSangThue([], { uoc_tinh: 0, da_xac_nhan: 0, chua_ro: 0, so_chua_ro: 0, co_ket_noi_ngan_hang: true, so_giao_dich: 0 }),
});

const soViecMo = (db: DbGiaViec) => db.ds('ho_so_viec').filter((r) => !['resolved_user_confirmed', 'resolved_system_verified', 'cancelled'].includes(r.trang_thai)).length;

describe('LAUNCH-CRITICAL 1 — "Tôi muốn tạm ngừng kinh doanh"', () => {
  it('ý định → một hồ sơ → chỉ hỏi điều chưa biết → trả lời qua Trợ lý và pet → nộp → chờ → nhắc → phản hồi → xong theo xác nhận của bạn', async () => {
    const db = new DbGiaViec();
    const chat = (cau: string, loai: 'suspension' | null = null) => xuLyChatViec(db, {
      companyId: C, userId: U, cau, homNay: HOM_NAY, duocGhi: true, loaiHanhTrinh: loai,
      duKienBiet: { loai_chu_the: 'ho_kinh_doanh', da_co_mst: 'co' },
    });

    // 1–6. Hiểu ý định, mở MỘT hồ sơ, hỏi đúng dữ kiện còn thiếu (không hỏi lại loại người nộp, MST).
    const a = await chat('Tôi muốn tạm ngừng kinh doanh.', 'suspension');
    expect(a.hanhTrinh?.moi).toBe(true);
    const ht = a.hanhTrinh!.ht!;
    expect(ht.cau_hoi?.khoa).toBe('tam_ngung_tu');
    expect(ht.du_kien.loai_chu_the?.nguon).toBe('ho_so'); // biết từ hồ sơ, không hỏi
    expect(soViecMo(db)).toBe(1);
    const caseId = ht.ho_so_viec_id!;
    expect(db.ds('ho_so_viec')[0].trang_thai).toBe('needs_information');

    // 7. Hỏi lại cùng câu → mở tiếp đúng việc đó, không tạo hồ sơ thứ hai. Cả khi hai nơi hỏi cùng lúc.
    const b = await chat('Tôi muốn tạm ngừng kinh doanh.', 'suspension');
    expect(b.hanhTrinh?.moi).toBe(false);
    expect(b.hanhTrinh?.ht?.ho_so_viec_id).toBe(caseId);
    await Promise.all([
      moViecHanhTrinh(db, { companyId: C, userId: U, loai: 'suspension', yDinh: 'x', homNay: HOM_NAY }),
      moViecHanhTrinh(db, { companyId: C, userId: U, loai: 'suspension', yDinh: 'y', homNay: HOM_NAY }),
    ]);
    expect(soViecMo(db)).toBe(1);
    expect(db.ds('hanh_trinh').length).toBe(1);

    // 8–10. Tổng quan, pet, lịch đọc CÙNG việc, CÙNG việc tiếp theo.
    const ds1 = await dsViecCanLam(db, { companyId: C, homNay: HOM_NAY, laDemo: false, boi: U, lich: lichRong() });
    expect(ds1.viec).toHaveLength(1);
    expect(ds1.viec[0].id).toBe(caseId);
    expect(ds1.viec[0].hanh_dong?.tieu_de).toBe('Xác nhận ngày bắt đầu tạm ngừng');
    expect(ds1.viec[0].can_ban).toBe(true); // pet hiện "Cần bạn" từ đúng mục này

    // 11. Trả lời qua Trợ lý → cùng hồ sơ.
    const tl = await chat('01/10/2026');
    expect(tl.ketQua?.tom_tat).toContain('Đã ghi vào việc "Tạm ngừng kinh doanh"');
    expect(tl.ketQua?.tom_tat).toContain('Bạn dự định tạm ngừng tới ngày nào?');
    // 12. Trả lời từ pet (ô trả lời của việc) → cùng hồ sơ.
    const htId = db.ds('hanh_trinh')[0].id;
    await traLoiViec(db, { companyId: C, userId: U, htId, khoa: 'tam_ngung_den', giaTri: '2026-12-31', homNay: HOM_NAY, nguon: 'pet' });
    expect(soViecMo(db)).toBe(1);
    expect(db.ds('ho_so_viec')[0].trang_thai).toBe('ready_to_act');
    // Lịch: ngày tạm ngừng là ngày MIMI KHUYÊN nộp trước — không phải hạn pháp lý.
    const ds2 = await dsViecCanLam(db, { companyId: C, homNay: HOM_NAY, laDemo: false, boi: U, lich: lichRong() });
    expect(ds2.lich.map((x) => x.loai_ngay)).toEqual(['nen_lam']);
    expect(ds2.lich[0].ngay).toBe('2026-10-01');

    // Các bước chuẩn bị (bạn đánh dấu xong = bằng chứng "bạn xác nhận").
    await danhDauBuocViec(db, { companyId: C, userId: U, htId, khoa: 'nghia_vu_con_treo', trangThai: 'completed', homNay: HOM_NAY });
    await danhDauBuocViec(db, { companyId: C, userId: U, htId, khoa: 'tra_thu_tuc', trangThai: 'completed', homNay: HOM_NAY });
    const ds3 = await dsViecCanLam(db, { companyId: C, homNay: HOM_NAY, laDemo: false, boi: U, lich: lichRong() });
    expect(ds3.viec[0].hanh_dong?.loai).toBe('ghi_da_nop');

    // 13–16. "Tôi đã nộp" → bằng chứng mức "bạn xác nhận", chờ bên ngoài, hẹn kiểm lại. Không tự xác minh.
    const nop = await chat('Tôi đã nộp rồi, mã hồ sơ 11220260001234');
    expect(nop.ketQua?.tom_tat).toContain('Đây là xác nhận của bạn');
    await chat('Tôi đã nộp rồi, mã hồ sơ 11220260001234'); // nói lại → không trùng
    const bc = db.ds('bang_chung_viec').filter((x) => x.ho_so_viec_id === caseId);
    expect(bc.filter((x) => x.khoa_trung === 'da_nop')).toHaveLength(1);
    expect(bc.find((x) => x.loai === 'reference_number')?.gia_tri).toBe('11220260001234');
    expect(bc.every((x) => x.trang_thai_xac_minh !== 'system_verified')).toBe(true);
    const sauNop = db.ds('ho_so_viec')[0];
    expect(sauNop.trang_thai).toBe('waiting_external');
    expect(sauNop.hen_kiem_lai).toBe('2026-09-29');

    // Theo dõi: tới ngày hẹn → một lời nhắc (không nói "cơ quan chưa xử lý"), rồi dời hẹn; chạy lại không nhắc trùng.
    const nhac = await nhapTheoDoiDenHan(db, C, '2026-09-29');
    expect(nhac.nhap).toHaveLength(1);
    expect(nhac.nhap[0].noi_dung).toContain('MIMI chưa có bằng chứng về phản hồi mới');
    expect(nhac.nhap[0].noi_dung).not.toMatch(/chưa xử lý/);
    await daNhacTheoDoi(db, C, nhac.viec, '2026-09-29');
    expect(db.ds('ho_so_viec')[0].hen_kiem_lai).toBe('2026-10-06');
    expect((await nhapTheoDoiDenHan(db, C, '2026-09-29')).nhap).toHaveLength(0);

    // 17. Có phản hồi (bạn nhập) → đủ điều kiện → xong ở mức "theo xác nhận của bạn", KHÔNG "hệ thống xác minh".
    const ph = await chat('Đã nhận thông báo chấp nhận số 123/TB-CCT');
    expect(ph.ketQua?.tom_tat).toContain('theo xác nhận của bạn');
    const xong = db.ds('ho_so_viec')[0];
    expect(xong.trang_thai).toBe('resolved_user_confirmed');
    expect(xong.ket_qua).toContain('123/TB-CCT');

    // 18. Dòng thời gian suy từ nhật ký thật, đúng mức chắc chắn.
    const ct = (await docChiTietViec(db, C, caseId, HOM_NAY))!;
    const cau = ct.dong_thoi_gian.map((x) => x.cau).join('\n');
    expect(cau).toContain('MIMI mở việc "Tạm ngừng kinh doanh"');
    expect(cau).toContain('Bạn trả lời: Bạn muốn bắt đầu tạm ngừng từ ngày nào — 01/10/2026 (qua Trợ lý)');
    expect(cau).toContain('Bạn ghi nhận đã nộp hồ sơ.');
    expect(cau).toContain('Đang chờ bằng chứng phản hồi của cơ quan.');
    expect(cau).toContain('Việc xong — theo xác nhận của bạn');
    expect(ct.dong_thoi_gian.some((x) => x.do_chac === 'he_thong_xac_minh')).toBe(false);

    // Xong rồi: không còn trong Việc cần làm; lịch vẫn hiện nhưng gạch.
    const ds4 = await dsViecCanLam(db, { companyId: C, homNay: HOM_NAY, laDemo: false, boi: U, lich: lichRong() });
    expect(ds4.viec).toHaveLength(0);
    expect(ds4.lich.every((x) => x.da_xong)).toBe(true);

    // Công ty khác không đọc, không ghi được việc này.
    expect(await docChiTietViec(db, C2, caseId, HOM_NAY)).toBeNull();
    await expect(ghiNhanDaNop(db, { companyId: C2, userId: U, caseId, homNay: HOM_NAY })).rejects.toThrow();
  });

  it('"tôi đã nộp" khi chưa trả lời đủ → không ghi, nói rõ còn thiếu gì; bấm hai lần cùng lúc → một bằng chứng', async () => {
    const db = new DbGiaViec();
    const r = await moViecHanhTrinh(db, { companyId: C, userId: U, loai: 'suspension', yDinh: 'Tôi muốn tạm ngừng', homNay: HOM_NAY });
    const caseId = r.ht.ho_so_viec_id!;
    await expect(ghiNhanDaNop(db, { companyId: C, userId: U, caseId, homNay: HOM_NAY })).rejects.toThrow(/Cần biết trước/);
    expect(db.ds('bang_chung_viec')).toHaveLength(0);
    await traLoiViec(db, { companyId: C, userId: U, htId: r.ht.id, khoa: 'tam_ngung_tu', giaTri: '2026-10-01', homNay: HOM_NAY });
    await traLoiViec(db, { companyId: C, userId: U, htId: r.ht.id, khoa: 'tam_ngung_den', giaTri: '2026-12-31', homNay: HOM_NAY });
    await Promise.all([
      ghiNhanDaNop(db, { companyId: C, userId: U, caseId, homNay: HOM_NAY }),
      ghiNhanDaNop(db, { companyId: C, userId: U, caseId, homNay: HOM_NAY }),
    ]);
    expect(db.ds('bang_chung_viec').filter((x) => x.khoa_trung === 'da_nop')).toHaveLength(1);
    expect(db.ds('ho_so_viec')[0].trang_thai).toBe('waiting_external');
  });
});

// ── Doanh thu 951.983.000đ: 700tr hàng hoá, 150tr dịch vụ, 101.983.000đ chưa rõ nhóm ─────────────
const KHOAN: KhoanDoanhThu[] = [
  ...Array.from({ length: 7 }, (_, i) => ({ nguon: 'giao_dich' as const, id: `g${i}`, so_tien: 100_000_000, ngay: `2026-0${1 + (i % 8)}-15` })),
  ...Array.from({ length: 3 }, (_, i) => ({ nguon: 'giao_dich' as const, id: `d${i}`, so_tien: 50_000_000, ngay: `2026-0${2 + i}-10` })),
  { nguon: 'giao_dich', id: 'u0', so_tien: 50_000_000, ngay: '2026-07-01' },
  { nguon: 'giao_dich', id: 'u1', so_tien: 40_000_000, ngay: '2026-08-01' },
  { nguon: 'giao_dich', id: 'u2', so_tien: 11_983_000, ngay: '2026-09-01' },
];
const PHAN_LOAI: PhanLoaiHoatDong[] = [
  ...Array.from({ length: 7 }, (_, i) => ({ nguon: 'giao_dich' as const, nguon_id: `g${i}`, hoat_dong: 'phan_phoi_hang_hoa' as const })),
  ...Array.from({ length: 3 }, (_, i) => ({ nguon: 'giao_dich' as const, nguon_id: `d${i}`, hoat_dong: 'dich_vu' as const })),
];
const MOC: MocThue[] = [{ khoa: 'khai_nam_2026', ten: 'Khai thuế năm 2026', loai: 'khai_va_nop', trang_thai: 'phai_lam', han: '2027-01-31', con_lai: 127, vi_sao: 'Hộ khai theo năm.', can_cu: [] }];

function lichTu(pl: PhanLoaiHoatDong[]): LichCongTy {
  const chia = chiaTheoHoatDong('giao_dich', KHOAN, pl);
  const s = { uoc_tinh: chia.tong, da_xac_nhan: chia.tong, chua_ro: 0, so_chua_ro: 0, co_ket_noi_ngan_hang: true, so_giao_dich: KHOAN.length };
  return {
    lich: MOC, loaiNguoiNop: 'ho_kinh_doanh', soChuaRo: 0, tienChuaRo: 0, hoatDong: chia,
    sanSang: sanSangThue(MOC, s, { so_tien: chia.nhom.chua_ro.so_tien, so_khoan: chia.nhom.chua_ro.so_khoan }),
  };
}

describe('LAUNCH-CRITICAL 2 — doanh thu 951.983.000đ có 101.983.000đ chưa rõ nhóm hoạt động', () => {
  it('chặn khai → MỘT việc → Tổng quan, Trợ lý, pet cùng thấy → phân loại → tính lại → việc đóng "MIMI đã kiểm", hết cảnh báo, không trùng', async () => {
    const db = new DbGiaViec();
    const l0 = lichTu(PHAN_LOAI);
    expect(l0.hoatDong!.tong).toBe(951_983_000);
    expect(l0.hoatDong!.nhom.phan_phoi_hang_hoa.so_tien).toBe(700_000_000);
    expect(l0.hoatDong!.nhom.dich_vu.so_tien).toBe(150_000_000);
    expect(l0.hoatDong!.nhom.chua_ro.so_tien).toBe(101_983_000);
    // Sẵn sàng khai: BỊ CHẶN.
    expect(l0.sanSang.trang_thai).toBe('bi_chan');
    expect(l0.sanSang.viec_tiep[0]).toBe('Phân loại 101.983.000đ doanh thu trước khi hoàn tất tờ khai');

    // Một việc — kể cả khi cron, trợ lý, tổng quan cùng đồng bộ một lúc.
    await Promise.all([1, 2, 3].map(() => dongBoViecDoanhThu(db, { companyId: C, nam: 2026, homNay: HOM_NAY, laDemo: false, boi: null, lich: l0 })));
    expect(soViecMo(db)).toBe(1);
    const v = db.ds('ho_so_viec')[0];
    expect(v.tieu_de).toBe('Phân loại 101.983.000đ doanh thu trước khi hoàn tất tờ khai');
    expect(v.han_luat).toBe('2027-01-31');

    // Tổng quan và pet: cùng mục; Trợ lý (việc ưu tiên): cùng mục, không tự ghép bản khác.
    const ds = await dsViecCanLam(db, { companyId: C, homNay: HOM_NAY, laDemo: false, boi: null, lich: l0 });
    const muc = ds.viec.find((x) => x.loai === 'phan_loai_hoat_dong')!;
    expect(muc.id).toBe(v.id);
    expect(muc.muc).toBe(3);
    expect(muc.hanh_dong?.tieu_de).toBe('Phân loại 101.983.000đ doanh thu trước khi hoàn tất tờ khai');
    expect(muc.can_ban).toBe(true);
    expect(ds.viec.filter((x) => x.loai === 'phan_loai_hoat_dong')).toHaveLength(1);
    const uuTien = NANG_LUC.viec_uu_tien.chay({ ...duLieuTrong(HOM_NAY, { tu: '2026-07-01', den: '2026-09-30', nhan: 'quý III/2026' }), cauHoi: 'Tôi cần làm gì?', viecCanLam: ds.viec });
    expect(JSON.stringify(uuTien.the)).toContain('Phân loại 101.983.000đ doanh thu trước khi hoàn tất tờ khai');

    // Phân loại một phần (50.000.000đ là dịch vụ) → cùng việc, số tiền mới; vẫn chặn.
    const l1 = lichTu([...PHAN_LOAI, { nguon: 'giao_dich', nguon_id: 'u0', hoat_dong: 'dich_vu' }]);
    await dongBoViecDoanhThu(db, { companyId: C, nam: 2026, homNay: HOM_NAY, laDemo: false, boi: U, lich: l1 });
    expect(soViecMo(db)).toBe(1);
    expect(db.ds('ho_so_viec')[0].tieu_de).toBe('Phân loại 51.983.000đ doanh thu trước khi hoàn tất tờ khai');
    expect(l1.sanSang.trang_thai).toBe('bi_chan');

    // Phân loại hết → tính lại → sẵn sàng hết chặn; việc đóng ở mức "MIMI đã kiểm trên dữ liệu" (có bằng chứng hệ thống).
    const l2 = lichTu([...PHAN_LOAI,
      { nguon: 'giao_dich', nguon_id: 'u0', hoat_dong: 'dich_vu' }, { nguon: 'giao_dich', nguon_id: 'u1', hoat_dong: 'phan_phoi_hang_hoa' },
      { nguon: 'giao_dich', nguon_id: 'u2', hoat_dong: 'dich_vu' }]);
    expect(l2.hoatDong!.nhom.chua_ro.so_tien).toBe(0);
    expect(l2.sanSang.trang_thai).not.toBe('bi_chan');
    expect(l2.sanSang.chan).toEqual([]);
    const dong = await dongBoViecDoanhThu(db, { companyId: C, nam: 2026, homNay: HOM_NAY, laDemo: false, boi: U, lich: l2 });
    expect(dong?.trang_thai).toBe('resolved_system_verified');
    const bcHeThong = db.ds('bang_chung_viec').filter((x) => x.ho_so_viec_id === v.id);
    expect(bcHeThong).toHaveLength(1);
    expect(bcHeThong[0]).toMatchObject({ loai: 'system_verified_event', nguon: 'mimi_he_thong', trang_thai_xac_minh: 'system_verified' });
    expect(bcHeThong[0].gia_tri).toMatch(/không phải xác nhận của cơ quan thuế/);

    // Không còn cảnh báo cũ; không mở lại; đồng bộ lần nữa không đổi gì.
    const dsSau = await dsViecCanLam(db, { companyId: C, homNay: HOM_NAY, laDemo: false, boi: U, lich: l2 });
    expect(dsSau.viec.some((x) => x.loai === 'phan_loai_hoat_dong')).toBe(false);
    await dongBoViecDoanhThu(db, { companyId: C, nam: 2026, homNay: HOM_NAY, laDemo: false, boi: U, lich: l2 });
    expect(db.ds('ho_so_viec')).toHaveLength(1);
  });

  it('mất dữ liệu doanh thu (ngắt ngân hàng) → KHÔNG tự đóng việc; doanh nghiệp → không mở việc nhóm hoạt động', async () => {
    const db = new DbGiaViec();
    await dongBoViecDoanhThu(db, { companyId: C, nam: 2026, homNay: HOM_NAY, laDemo: false, boi: null, lich: lichTu(PHAN_LOAI) });
    await dongBoViecDoanhThu(db, { companyId: C, nam: 2026, homNay: HOM_NAY, laDemo: false, boi: null, lich: { ...lichRong(), hoatDong: null } });
    expect(db.ds('ho_so_viec')[0].trang_thai).toBe('ready_to_act');
    const db2 = new DbGiaViec();
    await dongBoViecDoanhThu(db2, { companyId: C, nam: 2026, homNay: HOM_NAY, laDemo: false, boi: null, lich: { ...lichTu(PHAN_LOAI), loaiNguoiNop: 'doanh_nghiep' } });
    expect(db2.ds('ho_so_viec')).toHaveLength(0);
  });
});
