import { describe, expect, it } from 'vitest';
import { BoGom, gom, LoiKhacCongTy, ngayTu, soNgay, type GiaoDichDT } from './tong-hop.ts';
import { phatHienDinhKy } from './dinh-ky.ts';
import { chonMoHinh, giaiCholesky, holtWinters, hoiQuyRidge, kiemDinh, muaVuNgayThuong } from './mo-hinh.ts';
import { duBaoTuTongHop, mulberry32 } from './du-bao.ts';
import { deXuatPhanLoai, huanLuyen, trangThaiCuoi, type MauHoc } from './hoc-phan-loai.ts';
import { nhomRa, nhomVao } from './phan-nhom.ts';
import { docGiaoDichTheoTrang, duBaoDongTienTuCsdl, LoiConTro } from './doc-db.ts';
import { CsdlGia } from './csdl-gia.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const HOM_NAY = '2026-11-10';
const CTY = '11111111-1111-4111-8111-111111111111';
const CTY_KHAC = '22222222-2222-4222-8222-222222222222';
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

function chuoi(n: number, f: (t: number) => number): Float64Array {
  return Float64Array.from({ length: n }, (_, t) => f(t));
}

describe('mô hình và kiểm định quay vòng', () => {
  const d0 = soNgay('2025-01-06'); // Thứ Hai

  it('Cholesky giải đúng hệ 3×3', () => {
    const A = Float64Array.from([4, 2, 0, 2, 5, 1, 0, 1, 3]);
    const x = giaiCholesky(A, Float64Array.from([2, 3, 4]), 3);
    // Kiểm bằng nhân lại với ma trận gốc.
    const G = [[4, 2, 0], [2, 5, 1], [0, 1, 3]];
    G.forEach((h, i) => expect(h.reduce((s, v, j) => s + v * x[j], 0)).toBeCloseTo([2, 3, 4][i], 9));
  });

  it('chuỗi chỉ có mùa vụ tuần (không nhiễu): mùa vụ ngây thơ đúng tuyệt đối, được chọn', () => {
    const mau = [100, 120, 90, 150, 300, 500, 50];
    const y = chuoi(140, (t) => mau[t % 7] * 1000);
    const kq = kiemDinh(y, d0)!;
    const sn = kq.diem.find((d) => d.ten === 'mua_vu_ngay_thuong')!;
    expect(sn.mase).toBeLessThan(1e-9);
    expect(chonMoHinh(kq).ten).toBe('mua_vu_ngay_thuong');
  });

  it('chuỗi có XU HƯỚNG + mùa vụ: mô hình được chọn thắng mùa vụ ngây thơ và dự báo theo xu hướng', () => {
    const rnd = mulberry32(7);
    const mau = [1, 1.2, 0.9, 1.1, 1.6, 2, 0.4];
    const y = chuoi(280, (t) => (200 + 2 * t) * mau[t % 7] * 1000 * (1 + (rnd() - 0.5) * 0.1));
    const kq = kiemDinh(y, d0)!;
    const tot = chonMoHinh(kq);
    const sn = kq.diem.find((d) => d.ten === 'mua_vu_ngay_thuong')!;
    expect(tot.ten).not.toBe('mua_vu_ngay_thuong');
    expect(tot.mase).toBeLessThan(sn.mase);
    expect(kq.moc.length).toBe(6);
    for (const f of [holtWinters, hoiQuyRidge]) {
      const du = f(y, 28, d0);
      const tuanCuoi = y.subarray(273).reduce((s, x) => s + x, 0);
      const tuan4 = du.subarray(21, 28).reduce((s, x) => s + x, 0);
      expect(tuan4).toBeGreaterThan(tuanCuoi); // xu hướng tăng được giữ
    }
  });

  it('MASE được tính đúng thang: dự báo bằng 0 cho chuỗi hằng số dương có sai số hữu hạn', () => {
    const y = chuoi(100, () => 1000);
    const kq = kiemDinh(y, d0, ['mua_vu_ngay_thuong'])!;
    expect(kq.diem[0].mase).toBe(0);
    expect(muaVuNgayThuong(y, 3, d0)).toEqual(Float64Array.from([1000, 1000, 1000]));
  });

  it('ít hơn 42 ngày huấn luyện thì không có mốc kiểm định', () => {
    expect(kiemDinh(chuoi(60, () => 1), d0)).toBeNull();
  });
});

// ── Dữ liệu tổng hợp có khoản định kỳ cài sẵn ─────────────────────────────────

let seq = 0;
const gd = (p: Partial<GiaoDichDT> & { transaction_date: string; amount: number; type: string }): GiaoDichDT => ({
  id: uuid(++seq), company_id: CTY, merchant_name: null, counter_account_name: null, payment_reference: null, category: null,
  account_number: '111222333', counter_account_number: null, ...p,
});

function sinhCongTy(soNgayLS: number, seed = 1): GiaoDichDT[] {
  const rnd = mulberry32(seed);
  const den = soNgay(HOM_NAY);
  const out: GiaoDichDT[] = [];
  for (let d = den - soNgayLS; d < den; d++) {
    const ngay = ngayTu(d); const dom = Number(ngay.slice(8, 10)); const w = ((d + 3) % 7 + 7) % 7;
    // Bán hàng: nhiều khách lẻ mỗi ngày, cuối tuần đông hơn.
    const soKhach = 3 + Math.floor(rnd() * 4) + (w >= 5 ? 4 : 0);
    for (let k = 0; k < soKhach; k++) out.push(gd({ transaction_date: ngay, type: 'income', amount: 200_000 + Math.floor(rnd() * 800_000), counter_account_name: `KHACH LE ${Math.floor(rnd() * 1e6)}`, payment_reference: 'CK MUA HANG' }));
    // Nhập hàng lặt vặt.
    if (rnd() < 0.5) out.push(gd({ transaction_date: ngay, type: 'expense', amount: 500_000 + Math.floor(rnd() * 2_000_000), counter_account_name: `NCC ${Math.floor(rnd() * 1e6)}`, payment_reference: 'THANH TOAN TIEN HANG' }));
    // CÀI SẴN: lương ngày 5, tiền nhà ngày 1, Google mỗi Thứ Hai, khách quen 2 tuần/lần.
    if (dom === 5) out.push(gd({ transaction_date: ngay, type: 'expense', amount: 45_000_000, counter_account_name: 'BANG LUONG NHAN VIEN', payment_reference: `TRA LUONG T${ngay.slice(5, 7)}` }));
    if (dom === 1) out.push(gd({ transaction_date: ngay, type: 'expense', amount: 15_000_000, counter_account_name: 'NGUYEN VAN CHU NHA', counter_account_number: '9988776655', payment_reference: 'TIEN THUE MAT BANG' }));
    if (w === 0) out.push(gd({ transaction_date: ngay, type: 'expense', amount: 1_250_000, counter_account_name: 'GOOGLE ASIA PACIFIC', payment_reference: 'GOOGLE ADS' }));
    if ((d - (den - soNgayLS)) % 14 === 3) out.push(gd({ transaction_date: ngay, type: 'income', amount: 30_000_000 + Math.floor(rnd() * 600_000), counter_account_name: 'CONG TY TNHH KHACH QUEN', payment_reference: 'TT DON HANG' }));
  }
  return out;
}

describe('hiểu dòng tiền: nhóm và khoản định kỳ', () => {
  it('xếp nhóm: lương, mặt bằng, thuế, trả nợ, nhà cung cấp; tiền vay theo luật; chủ xác nhận thắng luật', () => {
    expect(nhomRa({ payment_reference: 'TRA LUONG T10' })).toBe('luong');
    expect(nhomRa({ payment_reference: 'TIEN THUE MAT BANG' })).toBe('mat_bang');
    expect(nhomRa({ payment_reference: 'NOP THUE GTGT QUY 3' })).toBe('thue');
    expect(nhomRa({ payment_reference: 'TRA GOC LAI VAY HDTD 01' })).toBe('tra_no');
    expect(nhomRa({ payment_reference: 'THANH TOAN TIEN HANG' })).toBe('nha_cung_cap');
    expect(nhomRa({ payment_reference: 'CK' })).toBe('chi_khac');
    expect(nhomVao({ payment_reference: 'GIAI NGAN HDTD 0126' })).toBe('vay');
    expect(nhomVao({ payment_reference: 'GIAI NGAN HDTD 0126' }, { hieu_luc: 'include' })).toBe('ban_hang');
    expect(nhomVao({ payment_reference: 'CK' }, { loai: 'family_transfer' })).toBe('nguoi_nha');
    expect(nhomVao({ payment_reference: 'CK MUA HANG' })).toBe('ban_hang');
  });

  it('chuyển giữa tài khoản của chính mình bị loại (đối ứng là TK của mình, hoặc ghép hai chân)', () => {
    const ds = [
      gd({ transaction_date: '2026-10-01', type: 'income', amount: 20e6, account_number: '1110001', counter_account_number: '2220002' }),
      gd({ transaction_date: '2026-10-02', type: 'income', amount: 7e6, account_number: '3330003' }),
      gd({ transaction_date: '2026-10-03', type: 'expense', amount: 7e6, account_number: '1110001' }),
      gd({ transaction_date: '2026-10-03', type: 'income', amount: 5e6, account_number: '1110001' }),
    ];
    const th = gom(ds, { companyId: CTY, homNay: HOM_NAY, taiKhoanCuaMinh: ['1110001', '2220002', '3330003'] });
    expect(th.so_noi_bo).toBe(3);
  });

  it('phát hiện đúng khoản định kỳ cài sẵn, độ chính xác ≥ 90% trên nhiễu', () => {
    const th = gom(sinhCongTy(365), { companyId: CTY, homNay: HOM_NAY });
    const ds = phatHienDinhKy(th).filter((d) => d.do_tin_cay >= 0.6);
    const ten = (t: string) => ds.find((d) => d.ten === t);
    expect(ten('BANG LUONG NHAN VIEN')).toMatchObject({ chu_ky: 'thang', loai: 'luong', so_tien_du_kien: 45_000_000, ngay_ke_tiep: '2026-12-05', chieu: 'ra' });
    expect(ten('NGUYEN VAN CHU NHA')).toMatchObject({ chu_ky: 'thang', loai: 'mat_bang', so_tien_du_kien: 15_000_000, ngay_ke_tiep: '2026-12-01' });
    expect(ten('GOOGLE ASIA PACIFIC')).toMatchObject({ chu_ky: 'tuan', loai: 'thue_bao', so_tien_du_kien: 1_250_000, ngay_ke_tiep: '2026-11-16' });
    expect(ten('CONG TY TNHH KHACH QUEN')).toMatchObject({ chu_ky: 'hai_tuan', loai: 'khach_quen', chieu: 'vao' });
    const cai = new Set(['BANG LUONG NHAN VIEN', 'NGUYEN VAN CHU NHA', 'GOOGLE ASIA PACIFIC', 'CONG TY TNHH KHACH QUEN']);
    const dung = ds.filter((d) => cai.has(d.ten)).length;
    expect(dung / ds.length).toBeGreaterThanOrEqual(0.9);
    for (const d of ds.filter((x) => cai.has(x.ten))) expect(d.do_tin_cay).toBeGreaterThanOrEqual(0.8);
  });
});

describe('dự báo 13 tuần', () => {
  it('đủ dữ liệu: chọn mô hình bằng kiểm định, P10 ≤ P50 ≤ P90, có lịch lương/tiền nhà, tất định', () => {
    const th = gom(sinhCongTy(365), { companyId: CTY, homNay: HOM_NAY });
    const a = duBaoTuTongHop(th, { soDuHienTai: 10_000_000 });
    const b = duBaoTuTongHop(gom(sinhCongTy(365), { companyId: CTY, homNay: HOM_NAY }), { soDuHienTai: 10_000_000 });
    expect(a.che_do).toBe('day_du');
    console.log(`[kiem-dinh] ${a.mo_hinh.ung_vien.map((u) => `${u.chuoi}/${u.ten}: MASE ${u.mase}, sMAPE ${u.smape}%`).join(' | ')} → chọn vào=${a.mo_hinh.vao?.ten}, ra=${a.mo_hinh.ra?.ten}`);
    expect(a.mo_hinh.so_moc).toBe(6);
    expect(a.mo_hinh.ung_vien.length).toBe(6);
    expect(a.tuan).toHaveLength(13);
    expect(a.thang.map((t) => t.khoa)).toEqual(['2026-12', '2027-01', '2027-02']);
    for (const t of a.tuan) { expect(t.rong.p10).toBeLessThanOrEqual(t.rong.p50); expect(t.rong.p50).toBeLessThanOrEqual(t.rong.p90); }
    expect(JSON.stringify(a.tuan)).toBe(JSON.stringify(b.tuan.map((t, i) => ({ ...t, tu: a.tuan[i].tu, den: a.tuan[i].den }))));
    // Tuần chứa ngày 05/12 phải có tiền ra lớn hơn tuần trước đó vì lương 45 triệu.
    const iLuong = a.tuan.findIndex((t) => t.tu <= '2026-12-05' && t.den >= '2026-12-05');
    expect(a.tuan[iLuong].ra_p50).toBeGreaterThan(a.tuan[iLuong - 1].ra_p50 + 30_000_000);
    expect(a.dong_chinh.some((d) => d.dinh_ky && d.khoa.includes('luong'))).toBe(true);
    expect(a.giai_thich.join(' ')).toMatch(/thử lại trên 6 mốc/);
  });

  it('không nhập số dư: nói số cần giữ tối thiểu; có số dư thấp: chỉ ra tuần rủi ro', () => {
    const th = gom(sinhCongTy(200), { companyId: CTY, homNay: HOM_NAY });
    const khong = duBaoTuTongHop(th);
    expect(khong.so_du_hien_tai).toBeNull();
    expect(khong.can_giu_toi_thieu).not.toBeNull();
    expect(khong.so_du_tuong_doi).toBe(true);
    const thap = duBaoTuTongHop(th, { soDuHienTai: -50_000_000 });
    expect(thap.tuan_rui_ro.length).toBeGreaterThan(0);
    expect(thap.tuan_rui_ro[0].muc).toBe('cao');
  });

  it('ít hơn 8 tuần: dự phòng và NÓI RÕ; ít hơn 14 ngày: không dự báo', () => {
    const it5 = duBaoTuTongHop(gom(sinhCongTy(35), { companyId: CTY, homNay: HOM_NAY }));
    expect(it5.che_do).toBe('du_phong');
    expect(it5.ly_do).toMatch(/chưa đủ 8 tuần/);
    expect(it5.tuan).toHaveLength(13);
    const it1 = duBaoTuTongHop(gom(sinhCongTy(10), { companyId: CTY, homNay: HOM_NAY }));
    expect(it1.che_do).toBe('khong_du');
    expect(it1.tuan).toHaveLength(0);
    expect(duBaoTuTongHop(gom([], { homNay: HOM_NAY })).tom_tat).toMatch(/Chưa có giao dịch/);
  });

  it('tiếng Anh: lời giải thích không có chữ tiếng Việt có dấu', () => {
    const a = duBaoTuTongHop(gom(sinhCongTy(120), { companyId: CTY, homNay: HOM_NAY }), { ngon: 'en' });
    expect([a.tom_tat, ...a.giai_thich].join(' ').replace(/₫/g, '')).not.toMatch(/[ạảãàáâậầấẩẫăắằặẳẵđêềếệểễôồốộổỗơờớợởỡưừứựửữ]/i);
  });
});

describe('học từ chủ: chỉ đề xuất, không bao giờ trừ doanh thu', () => {
  const mau: MauHoc[] = [
    ...Array.from({ length: 6 }, (_, i) => ({ chieu: 'vao' as const, noi_dung: `CK TU ANH HUNG GUI ${i}`, so_tien: 5_000_000, tan_suat_doi_tac: 6, nhan: 'family_transfer' })),
    ...Array.from({ length: 8 }, (_, i) => ({ chieu: 'vao' as const, noi_dung: `TT DON HANG SO ${i} SHOP`, so_tien: 800_000, tan_suat_doi_tac: 1, nhan: 'business_revenue' })),
    ...Array.from({ length: 5 }, () => ({ chieu: 'ra' as const, noi_dung: 'PHI DICH VU KE TOAN', so_tien: 2_000_000, tan_suat_doi_tac: 5, nhan: 'dich_vu_ke_toan' })),
  ];

  it('học từ nhãn và đề xuất đúng cho khoản mới tương tự', () => {
    const ts = huanLuyen(mau);
    const dx = deXuatPhanLoai(ts, [
      { id: 'a', chieu: 'vao', noi_dung: 'CK TU ANH HUNG GUI THANG 11', so_tien: 5_000_000, tan_suat_doi_tac: 7, nhom: 'ban_hang' },
      { id: 'b', chieu: 'vao', noi_dung: 'TT DON HANG SO 99 SHOP', so_tien: 700_000, tan_suat_doi_tac: 1, nhom: 'ban_hang' },
      { id: 'c', chieu: 'ra', noi_dung: 'PHI DICH VU KE TOAN T11', so_tien: 2_000_000, tan_suat_doi_tac: 6, nhom: 'chi_khac' },
      { id: 'd', chieu: 'vao', noi_dung: 'GIAI NGAN HDTD', so_tien: 5_000_000, tan_suat_doi_tac: 1, nhom: 'vay' },
    ]);
    expect(dx.map((x) => `${x.transaction_id}:${x.de_xuat}`).sort()).toEqual(['a:family_transfer', 'c:dich_vu_ke_toan']);
    for (const x of dx) { expect(x.tu_dong).toBe(false); expect(x.tru_doanh_thu).toBe(false); expect(x.ly_do).toMatch(/Chỉ là đề xuất/); }
  });

  it('ít nhãn quá thì không đề xuất gì', () => {
    expect(deXuatPhanLoai(huanLuyen(mau.slice(0, 3)), [{ id: 'a', chieu: 'vao', noi_dung: 'CK TU ANH HUNG', so_tien: 5e6, tan_suat_doi_tac: 3, nhom: 'ban_hang' }])).toEqual([]);
  });

  it('trạng thái cuối lấy theo sự kiện mới nhất (hoàn tác là sự kiện mới)', () => {
    const m = trangThaiCuoi([
      { id: 1, transaction_id: 'x', to_type: 'loan' }, { id: 3, transaction_id: 'x', to_type: 'business_revenue' }, { id: 2, transaction_id: 'x', to_type: 'family_transfer' },
    ]);
    expect(m.get('x')).toBe('business_revenue');
  });

  it('đề xuất KHÔNG đổi dòng tiền hay doanh thu: dự báo trước và sau khi có mô hình giống hệt; khoản vẫn là bán hàng', async () => {
    const ds = sinhCongTy(120, 3);
    const moi = ds[ds.length - 1];
    Object.assign(moi, { type: 'income', payment_reference: 'CK TU ANH HUNG GUI THANG 11', counter_account_name: 'ANH HUNG' });
    const truoc = new CsdlGia({ transactions: ds.map((r) => ({ ...r, is_synthetic: false })) });
    const kqTruoc = await duBaoDongTienTuCsdl(truoc, CTY, { homNay: HOM_NAY, laDemo: false });
    // Cùng dữ liệu + chủ đã gắn 6 khoản "người nhà" trước đó.
    const nhan = ds.slice(0, 6).map((r, i) => ({ ...r, id: uuid(900000 + i), payment_reference: `CK TU ANH HUNG GUI ${i}`, type: 'income', transaction_date: '2026-06-01', is_synthetic: false }));
    const sau = new CsdlGia({
      transactions: [...ds.map((r) => ({ ...r, is_synthetic: false })), ...nhan],
      revenue_classification_events: [
        ...nhan.map((r, i) => ({ id: i + 1, company_id: CTY, transaction_id: r.id, to_type: 'family_transfer' })),
        ...ds.filter((r) => r.type === 'income').slice(0, 8).map((r, i) => ({ id: 100 + i, company_id: CTY, transaction_id: r.id, to_type: 'business_revenue' })),
      ],
    });
    // revenue_classifications (bảng doanh thu) KHÔNG có dòng nào → không khoản nào bị trừ.
    const kqSau = await duBaoDongTienTuCsdl(sau, CTY, { homNay: HOM_NAY, laDemo: false });
    expect(kqSau.mo_hinh_phan_loai.dung).toBe(true);
    expect(kqSau.mo_hinh_phan_loai.so_nhan).toBeGreaterThanOrEqual(6);
    const dx = kqSau.de_xuat_phan_loai.find((x) => x.transaction_id === moi.id);
    expect(dx?.de_xuat).toBe('family_transfer');
    expect(kqSau.de_xuat_phan_loai.every((x) => x.tu_dong === false && x.tru_doanh_thu === false)).toBe(true);
    // Khoản mới vẫn được tính là tiền bán hàng trong dòng tiền (đề xuất không áp dụng).
    const thSau = new BoGom({ companyId: CTY, homNay: HOM_NAY }); thSau.them([moi]);
    expect(thSau.ketThuc().nhom[0]).toBe(0);
    // Phần dự báo chỉ khác do 6 khoản lịch sử thêm vào ngày 01/06 (ngoài cửa sổ 13 tuần của mô hình? không) — so cùng dữ liệu:
    const lai = await duBaoDongTienTuCsdl(new CsdlGia({ transactions: [...ds.map((r) => ({ ...r, is_synthetic: false })), ...nhan] }), CTY, { homNay: HOM_NAY, laDemo: false });
    expect(JSON.stringify(lai.tuan)).toBe(JSON.stringify(kqSau.tuan));
    expect(kqTruoc.tuan).toHaveLength(13);
    // Mô hình được lưu cho lần sau.
    expect(sau.bang.dong_tien_mo_hinh?.[0]?.company_id).toBe(CTY);
  });
});

describe('chặn chéo công ty', () => {
  it('bộ gom ném lỗi khi gặp dòng của công ty khác', () => {
    const b = new BoGom({ companyId: CTY, homNay: HOM_NAY });
    expect(() => b.them([gd({ transaction_date: '2026-10-01', type: 'income', amount: 1, company_id: CTY_KHAC })])).toThrow(LoiKhacCongTy);
  });

  it('chỉ đọc giao dịch của đúng công ty; mọi truy vấn lọc company_id', async () => {
    const db = new CsdlGia({
      transactions: [
        ...sinhCongTy(60, 5).map((r) => ({ ...r, is_synthetic: false })),
        ...sinhCongTy(60, 6).map((r) => ({ ...r, id: uuid(5_000_000 + ++seq), company_id: CTY_KHAC, is_synthetic: false })),
      ],
    });
    const kq = await duBaoDongTienTuCsdl(db, CTY, { homNay: HOM_NAY, laDemo: false, trang: 250 });
    const cuaCty = (db.bang.transactions as { company_id: string }[]).filter((r) => r.company_id === CTY).length;
    expect(kq.doc.so_dong).toBe(cuaCty);
    for (const q of db.nhatKy) expect(q.loc, q.bang).toContain('eq:company_id');
  });

  it('CSDL trả nhầm dòng công ty khác → dừng, không trộn số', async () => {
    const db = new CsdlGia({ transactions: [{ ...gd({ transaction_date: '2026-10-01', type: 'income', amount: 1 }), company_id: CTY, is_synthetic: false }] });
    // Giả lập máy chủ bỏ qua bộ lọc company_id.
    const goc = db.from.bind(db);
    db.from = (t: string) => { const q = goc(t); q.eq = function (this: typeof q) { return this; } as typeof q.eq; return q; };
    db.bang.transactions.push({ ...gd({ transaction_date: '2026-10-02', type: 'income', amount: 1 }), company_id: CTY_KHAC, is_synthetic: false });
    await expect(docGiaoDichTheoTrang(db, CTY, { tuNgay: '2026-01-01', denNgay: '2026-11-09', laDemo: false }, () => {})).rejects.toThrow(LoiKhacCongTy);
  });

  it('con trỏ phân trang không nhận giá trị lạ (chống chèn bộ lọc)', async () => {
    const db = new CsdlGia({ transactions: [{ ...gd({ transaction_date: '2026-10-01', type: 'income', amount: 1 }), id: 'x),company_id.neq.0', is_synthetic: false }] });
    await expect(docGiaoDichTheoTrang(db, CTY, { tuNgay: '2026-01-01', denNgay: '2026-11-09', laDemo: false }, () => {})).rejects.toThrow(LoiConTro);
  });

  it('migration: bảng mới bật RLS, đọc qua la_thanh_vien, không mở ghi cho trình duyệt', () => {
    const sql = readFileSync(join(__dirname, '../../../migrations/20261110120000_dong_tien_ml.sql'), 'utf8').replace(/--.*$/gm, '');
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/FOR SELECT TO authenticated\s+USING \(public\.la_thanh_vien\(company_id\)\)/);
    expect(sql).not.toMatch(/FOR (INSERT|UPDATE|DELETE|ALL)/);
    expect(sql).not.toMatch(/SECURITY DEFINER/);
    expect(sql).toMatch(/transactions_company_date_id_idx/);
  });
});
