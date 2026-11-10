import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { docDeNghi, lapHoSoVay, PHIEN_BAN_HO_SO, type DauVaoHoSo } from './ho-so';
import { kiemCuaHoSoVay, thuocCongTy, GIOI_HAN_HO_SO_VAY, HANH_DONG_HO_SO_VAY } from './cong';
import { danhGiaSanSangVay, jsonOnDinh, sha256Hex, type DauVaoDanhGia } from '../tin-dung/cham-diem';
import { duBaoDongTien } from '../tai-chinh/du-bao';
import { VAI_TRO } from '../quyen/vai-tro';

const thang = Array.from({ length: 12 }, (_, i) => {
  const t = 2025 * 12 + 10 + i; // 2025-11 … 2026-10
  return { khoa: `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`, vao: 100e6, ra: 70e6 };
});
const dvDg = (p: Partial<DauVaoDanhGia> = {}): DauVaoDanhGia => ({
  thang, so_tien_de_nghi: 80e6, ky_han_thang: 12, cong_no_qua_han: 0, ty_le_khach_lon_nhat: 0.1, tien_nghi_chua_xac_nhan: 0,
  tong_tien_vao: 1.2e9, vay_hien_co: { tien_vay_vao: 0, so_khoan_vay_vao: 0, tra_no_ra: 0, so_khoan_tra_no: 0 }, ...p,
});

const dauVao = (p: Partial<DauVaoHoSo> = {}, dg = dvDg()): DauVaoHoSo => ({
  de_nghi: { so_tien: dg.so_tien_de_nghi, ky_han_thang: dg.ky_han_thang, muc_dich: 'Nhập hàng cho mùa Tết 2027' },
  cong_ty: { ten: 'Tiệm Mẫu', ma_so_thue: '0319436143', ten_theo_mst: 'HỘ KINH DOANH TIỆM MẪU', dia_chi_theo_mst: 'Q1, TP.HCM', loai_theo_mst: 'Hộ kinh doanh', trang_thai_mst: 'Đang hoạt động', tinh: 'TP.HCM', nganh: 'Bán lẻ' },
  homNay: '2026-11-10',
  bang_thang: dg.thang.map((t) => ({ khoa: t.khoa, vao: t.vao, ra: t.ra, rong: t.vao - t.ra })),
  tien_vao_bi_loai: { so_tien: 0, so_khoan: 0 },
  hoa_don_qua_han: { tong: 0, so: 0 },
  danh_gia: danhGiaSanSangVay(dg),
  du_bao: duBaoDongTien(dg.thang, { homNay: '2026-11-10', congNoQuaHan: 0 }),
  doanh_thu: [{ nam: 2026, gia_tri: 1e9, can_duoi: 0.98e9, can_tren: 1.01e9, trang_thai: 'chac', tien_vao: 1e9, da_xac_nhan: 0.9e9, chua_ro: 0, so_chua_ro: 0, khong_phai_doanh_thu: 0, noi_bo: 0, so_giao_dich: 300, ty_le_da_giai_thich: 0.98 }],
  to_khai: {
    nhap: [{ mau: '01/CNKD', nam: 2026, ky_loai: 'quy', quy: 2, han_nop: '2026-07-31', tao_luc: '2026-07-20T03:00:00Z', da_xuat_luc: null }],
    nop: [{ ky: '2026-Q2', trang_thai: 'accepted', ngay_nop: '2026-07-25', tao_luc: '2026-07-21T03:00:00Z' }],
  },
  co_ket_noi_ngan_hang: true,
  ...p,
});

const muc = (h: ReturnType<typeof lapHoSoVay>, ma: string) => h.kiem_tra.find((m) => m.ma === ma)!;

describe('đề nghị vay', () => {
  it('nhận số tiền nguyên 1 triệu – 100 tỷ, kỳ hạn 1–120 tháng, mục đích 3–500 ký tự', () => {
    expect(docDeNghi({ so_tien: 1e8, ky_han_thang: 12, muc_dich: '  nhập   hàng ' }, true)).toEqual({ ok: true, v: { so_tien: 1e8, ky_han_thang: 12, muc_dich: 'nhập hàng' } });
    for (const b of [{ so_tien: 999_999, ky_han_thang: 12 }, { so_tien: 1.5e6 + 0.5, ky_han_thang: 12 }, { so_tien: 2e11, ky_han_thang: 12 }, { so_tien: 'abc', ky_han_thang: 12 },
      { so_tien: 1e8, ky_han_thang: 0 }, { so_tien: 1e8, ky_han_thang: 121 }, { so_tien: 1e8, ky_han_thang: 6.5 }]) {
      expect(docDeNghi({ ...b, muc_dich: 'nhập hàng' }, true).ok, JSON.stringify(b)).toBe(false);
    }
    expect(docDeNghi({ so_tien: 1e8, ky_han_thang: 12, muc_dich: 'ab' }, true).ok).toBe(false);
    expect(docDeNghi({ so_tien: 1e8, ky_han_thang: 12 }, false).ok).toBe(true);
    const en = docDeNghi({ so_tien: 1, ky_han_thang: 12 }, false, 'en');
    expect(!en.ok && en.cau).toMatch(/million/);
  });
});

describe('hồ sơ vay', () => {
  it('đủ các phần: danh tính, dòng tiền 12 tháng, doanh thu, thuế, khả năng trả, dự báo, đánh giá, kiểm tra, đồng ý', () => {
    const h = lapHoSoVay(dauVao());
    expect(h.phien_ban).toBe(PHIEN_BAN_HO_SO);
    expect(h.nhan).toContain('NĐ 58/2021');
    expect(h.danh_tinh.ma_so_thue).toBe('0319436143');
    expect(h.dong_tien.thang).toHaveLength(12);
    expect(h.dong_tien.tong_vao).toBe(1.2e9);
    expect(h.dong_tien.tong_rong).toBe(360e6);
    expect(h.dong_tien.so_thang_co_du_lieu).toBe(12);
    expect(h.doanh_thu[0].nam).toBe(2026);
    expect(h.thue.nop).toHaveLength(1);
    expect(h.du_bao.kich_ban).toHaveLength(3);
    expect(h.danh_gia.co_diem).toBe(true);
    expect(h.kha_nang_tra.vua_suc).toBe(true);
    expect(h.kha_nang_tra.gia_dinh).toMatch(/30%/);
    expect(h.dong_y).toMatch(/MIMI không gửi hồ sơ/);
    expect(h.dong_y).toMatch(/không cho vay/);
    expect(h.giay_to_tu_chuan_bi.length).toBeGreaterThanOrEqual(4);
    expect(h.hoan_chinh).toBe(true);
    expect(h.kiem_tra.every((m) => m.trang_thai === 'co')).toBe(true);
  });

  it('tất định: cùng đầu vào → cùng hồ sơ, cùng mã băm', async () => {
    const a = lapHoSoVay(dauVao());
    const b = lapHoSoVay(dauVao());
    expect(jsonOnDinh(a)).toBe(jsonOnDinh(b));
    expect(await sha256Hex(jsonOnDinh(a))).toBe(await sha256Hex(jsonOnDinh(b)));
  });

  it('thiếu mã số thuế → mục bắt buộc "thiếu", hồ sơ chưa hoàn chỉnh', () => {
    const h = lapHoSoVay(dauVao({ cong_ty: { ...dauVao().cong_ty, ma_so_thue: null, ten_theo_mst: null } }));
    expect(muc(h, 'ma_so_thue').trang_thai).toBe('thieu');
    expect(muc(h, 'danh_tinh_mst').trang_thai).toBe('can_xem');
    expect(h.hoan_chinh).toBe(false);
  });

  it('dưới 3 tháng dữ liệu: không có điểm, sức trả "thiếu", sao kê "thiếu"', () => {
    const dg = dvDg({ thang: thang.slice(-2) });
    const h = lapHoSoVay(dauVao({}, dg));
    expect(h.danh_gia.co_diem).toBe(false);
    expect(muc(h, 'sao_ke_12_thang').trang_thai).toBe('thieu');
    expect(muc(h, 'trong_suc_tra').trang_thai).toBe('thieu');
    expect(h.kha_nang_tra.tra_gop_thang).toBeNull();
    expect(h.hoan_chinh).toBe(false);
  });

  it('6–11 tháng sao kê → "cần xem"; không kết nối trực tiếp → "cần xem" nhưng vẫn hoàn chỉnh', () => {
    const dg = dvDg({ thang: thang.slice(-8) });
    const h = lapHoSoVay(dauVao({ co_ket_noi_ngan_hang: false }, dg));
    expect(muc(h, 'sao_ke_12_thang').trang_thai).toBe('can_xem');
    expect(muc(h, 'ket_noi_ngan_hang').trang_thai).toBe('can_xem');
    expect(h.hoan_chinh).toBe(true);
  });

  it('số tiền vượt sức trả → "cần xem" kèm số tối đa; dòng tiền âm → "thiếu"', () => {
    const lon = lapHoSoVay(dauVao({}, dvDg({ so_tien_de_nghi: 5e9 })));
    expect(muc(lon, 'trong_suc_tra').trang_thai).toBe('can_xem');
    expect(muc(lon, 'trong_suc_tra').ghi_chu).toMatch(/vượt sức trả/);
    expect(lon.kha_nang_tra.vua_suc).toBe(false);
    const am = lapHoSoVay(dauVao({}, dvDg({ thang: thang.map((t) => ({ ...t, ra: 120e6 })) })));
    expect(muc(am, 'trong_suc_tra').trang_thai).toBe('thieu');
    expect(am.kha_nang_tra.goc_toi_da).toBeNull();
  });

  it('thuế: chỉ đếm 12 tháng qua; bản nháp mà chưa nộp → "cần xem"; không có gì → nói mang bản đã nộp', () => {
    const chiNhap = lapHoSoVay(dauVao({ to_khai: { nhap: dauVao().to_khai.nhap, nop: [] } }));
    expect(muc(chiNhap, 'to_khai_thue').trang_thai).toBe('can_xem');
    expect(muc(chiNhap, 'to_khai_thue').ghi_chu).toMatch(/1 bản nháp/);
    const cu = lapHoSoVay(dauVao({ to_khai: { nhap: [], nop: [{ ky: '2025-Q1', trang_thai: 'accepted', ngay_nop: '2025-04-20', tao_luc: '2025-04-19T00:00:00Z' }] } }));
    expect(cu.thue.nop).toHaveLength(0);
    expect(muc(cu, 'to_khai_thue').ghi_chu).toMatch(/Chưa có tờ khai/);
    const huy = lapHoSoVay(dauVao({ to_khai: { nhap: [], nop: [{ ky: '2026-Q2', trang_thai: 'cancelled', ngay_nop: null, tao_luc: '2026-07-21T00:00:00Z' }] } }));
    expect(huy.thue.nop).toHaveLength(0);
  });

  it('doanh thu chưa chắc → "cần xem" kèm số khoản chưa rõ', () => {
    const dt = { ...dauVao().doanh_thu[0], trang_thai: 'can_xem' as const, so_chua_ro: 7 };
    const h = lapHoSoVay(dauVao({ doanh_thu: [dt] }));
    expect(muc(h, 'doanh_thu_xac_nhan').trang_thai).toBe('can_xem');
    expect(muc(h, 'doanh_thu_xac_nhan').ghi_chu).toMatch(/7 khoản/);
  });

  it('tiếng Anh', () => {
    const h = lapHoSoVay({ ...dauVao(), ngon: 'en' });
    expect(h.dong_y).toMatch(/does not send this file/);
    expect(muc(h, 'ma_so_thue').ten).toBe('Tax code');
  });
});

describe('cửa quyền hồ sơ vay', () => {
  it('chỉ chủ sở hữu và quản trị; các vai khác bị từ chối 403', () => {
    for (const v of VAI_TRO) {
      const r = kiemCuaHoSoVay(v, null);
      expect(r.ok, v).toBe(v === 'chu_so_huu' || v === 'quan_tri');
      if (!r.ok) { expect(r.status).toBe(403); expect(r.ma).toBe('KHONG_DU_QUYEN'); }
    }
  });

  it('kế toán bị giới hạn vào một cơ sở bị từ chối vì phạm vi, kể cả khi có co_so_id', () => {
    const r = kiemCuaHoSoVay('ke_toan', 'co-so-1');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.ma).toBe('PHAM_VI_CO_SO');
    // Chủ có co_so_id (dữ liệu lạ) vẫn thấy cả công ty — cùng quy tắc với RLS.
    expect(kiemCuaHoSoVay('chu_so_huu', 'co-so-1').ok).toBe(true);
  });

  it('một dòng hồ sơ chỉ thuộc đúng công ty của nó', () => {
    expect(thuocCongTy({ company_id: 'a' }, 'a')).toBe(true);
    expect(thuocCongTy({ company_id: 'b' }, 'a')).toBe(false);
    expect(thuocCongTy(null, 'a')).toBe(false);
  });

  it('mỗi hành động có giới hạn tần suất', () => {
    for (const h of HANH_DONG_HO_SO_VAY) expect(GIOI_HAN_HO_SO_VAY[h].toi_da).toBeGreaterThan(0);
  });
});

describe('edge function ho-so-vay (kiểm tĩnh)', () => {
  const goc = join(__dirname, '..', '..', '..', '..');
  const ma = readFileSync(join(goc, 'supabase', 'functions', 'ho-so-vay', 'index.ts'), 'utf8');
  const boChuThich = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

  it('mọi truy vấn bảng ho_so_vay đều lọc theo công ty đang chọn (không đọc chéo công ty bằng id đoán)', () => {
    const src = boChuThich(ma);
    const chuoi = [...src.matchAll(/\.from\("ho_so_vay"\)([\s\S]*?);/g)].map((m) => m[1]);
    expect(chuoi.length).toBeGreaterThanOrEqual(4);
    for (const c of chuoi.filter((c) => !/\.insert\(/.test(c))) expect(c).toMatch(/\.eq\("company_id", companyId\)/);
    expect(src).toMatch(/company_id: companyId, so_tien/);
  });

  it('xác thực bằng phiên người dùng, kiểm cửa quyền trước mọi hành động, có giới hạn tần suất', () => {
    expect(ma).toMatch(/auth\.getUser\(/);
    expect(ma).toMatch(/resolveCompanyVaiTro/);
    expect(ma.indexOf('kiemCuaHoSoVay(')).toBeLessThan(ma.indexOf('hanhDong === "ds"'));
    expect(ma).toMatch(/duocGoi\(/);
    expect(ma).toMatch(/body\.dong_y !== true/);
  });

  it('không gọi mô hình ngôn ngữ, không gửi hồ sơ ra ngoài', () => {
    const tep = [
      ma,
      ...['tin-dung', 'ho-so-vay'].flatMap((d) => readdirSync(join(goc, 'supabase', 'functions', '_shared', d))
        .filter((f) => f.endsWith('.ts') && !f.includes('.test.'))
        .map((f) => readFileSync(join(goc, 'supabase', 'functions', '_shared', d, f), 'utf8'))),
    ].map(boChuThich).join('\n');
    expect(tep).not.toMatch(/openrouter|openai|anthropic|chat\/completions|goiMoHinh|goiAi|\bfetch\(/i);
    expect(tep).not.toMatch(/from ['"][^'"]*\/ai\//);
  });
});
