import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { congThang } from '../tai-chinh/du-bao.ts';
import { laNguoi, PHIEN_BAN_TIN_HIEU, thangVuot, tinhTinHieu, xepMuc, type DauVaoTinHieu, type GiaoDichNguon, type KetQuaTinHieu } from './tin-hieu.ts';
import { khopNhuCau, laSanPhamDauTu, type GoiNganHang } from './khop-goi.ts';
import { deXuatHanhDong, hanKhaiQuyKeTiep, HOP_KENH } from './hanh-dong.ts';
import { docYeuCauDongY, khoangDoanhThu, TRUONG_MAC_DINH } from './dong-y.ts';
import { kiemCua, locCongTyLamSo, tongHopVanPhong, xuLy, type PhuThuoc } from './xu-ly.ts';

// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

const HOM_NAY = '2026-11-16';
const TR = 1_000_000;
/** n tháng đã khép sổ gần nhất, cũ → mới (tháng cuối là 2026-10). */
const cacThang = (n: number) => Array.from({ length: n }, (_, i) => congThang('2026-11', i - n));

let dem = 0;
const id = () => `g${String(++dem).padStart(6, '0')}`;
const ban = (khoa: string, tien: number, them: Partial<GiaoDichNguon> = {}): GiaoDichNguon => ({
  id: id(), amount: tien, type: 'income', transaction_date: `${khoa}-10`, counter_account_name: 'CONG TY TNHH KHACH QUEN',
  payment_reference: 'thanh toan don hang', account_number: '111111', counter_account_number: '900001', ...them,
});
const chi = (khoa: string, tien: number, them: Partial<GiaoDichNguon> = {}): GiaoDichNguon => ({
  id: id(), amount: tien, type: 'expense', transaction_date: `${khoa}-20`, counter_account_name: 'CONG TY TNHH NHA CUNG CAP',
  payment_reference: 'tien hang', account_number: '111111', counter_account_number: '900002', ...them,
});

/** Doanh nghiệp: tiền bán hàng theo tháng `ds`, chi cố định mỗi tháng. */
function congTy(ds: number[], chiThang = 50 * TR, them: Partial<DauVaoTinHieu> = {}): DauVaoTinHieu {
  const th = cacThang(ds.length);
  const gd: GiaoDichNguon[] = [];
  th.forEach((k, i) => { gd.push(ban(k, ds[i])); gd.push(chi(k, chiThang)); });
  return { hom_nay: HOM_NAY, giao_dich: gd, tai_khoan_cua_minh: ['111111'], ...them, ...(them.giao_dich ? { giao_dich: [...gd, ...them.giao_dich] } : {}) };
}
const ma = (k: KetQuaTinHieu) => k.tin_hieu.map((t) => t.ma);
const lay = (k: KetQuaTinHieu, m: string) => k.tin_hieu.find((t) => t.ma === m)!;

describe('dấu hiệu: ngưỡng doanh thu', () => {
  it('sắp vượt 01 tỷ: 12 tháng 960 triệu, dự báo đưa qua mốc vào 12/2026; kịch bản yếu vẫn qua → tin cậy cao; mức "Đang lên"', () => {
    const k = tinhTinHieu(congTy([...Array(6).fill(60 * TR), ...Array(6).fill(100 * TR)]));
    expect(k.doanh_thu_12_thang).toBe(960 * TR);
    const s = lay(k, 'sap_vuot_nguong');
    expect(s.gia_tri).toBe(1e9);
    expect(s.bang_chung.so.thang_du_kien).toBe('2026-12');
    expect(s.do_tin_cay).toBe('cao');
    expect(ma(k)).not.toContain('da_vuot_nguong');
    expect(k.muc).toBe('dang_len');
  });

  it('thangVuot: "vượt" là strictly trên; thiếu tháng coi như 0', () => {
    expect(thangVuot(Array(12).fill(100 * TR), 100 * TR, 1.2e9, '2026-11')).toBeNull();
    expect(thangVuot([], 200 * TR, 1e9, '2026-11')).toBe(congThang('2026-11', 5)); // 6 × 200tr = 1,2 tỷ
  });

  it('đã vượt 03 tỷ theo doanh thu năm có khoảng (cận dưới qua mốc) → cao; mức "Sẵn sàng mở rộng"', () => {
    const k = tinhTinHieu(congTy(Array(8).fill(300 * TR), 50 * TR, { doanh_thu_nam: { nam: 2026, uoc_tinh: 3.4e9, can_duoi: 3.2e9, can_tren: 3.6e9, trang_thai: 'chac' } }));
    const s = lay(k, 'da_vuot_nguong');
    expect(s.gia_tri).toBe(3e9);
    expect(s.do_tin_cay).toBe('cao');
    expect(k.muc).toBe('san_sang_mo_rong');
    // Khoảng cắt ngưỡng (cận dưới chưa qua) → chỉ "vừa".
    const k2 = tinhTinHieu(congTy(Array(8).fill(130 * TR), 50 * TR, { doanh_thu_nam: { nam: 2026, uoc_tinh: 1.1e9, can_duoi: 0.95e9, can_tren: 1.2e9, trang_thai: 'can_xem' } }));
    expect(lay(k2, 'da_vuot_nguong').do_tin_cay).toBe('vua');
  });
});

describe('dấu hiệu: tăng trưởng, cơ sở mới, lương, tiền dư', () => {
  it('tăng trưởng doanh thu bền: 3 tháng +40%, 6 tháng +20%, cùng kỳ +40% → cao', () => {
    const k = tinhTinHieu(congTy([...Array(12).fill(50 * TR), ...Array(3).fill(70 * TR)], 30 * TR));
    const s = lay(k, 'tang_truong_doanh_thu');
    expect(s.do_tin_cay).toBe('cao');
    expect(s.gia_tri).toBeCloseTo(0.4, 3);
    expect(s.bang_chung.so.tang_6_thang).toBeCloseTo(0.2, 3);
  });

  it('mùa vụ không bị coi là tăng trưởng: cùng kỳ năm trước cũng cao như vậy', () => {
    const nam = [50, 50, 50, 50, 50, 50, 50, 50, 50, 80, 80, 80].map((x) => x * TR);
    const k = tinhTinHieu(congTy([...nam.slice(-3), ...nam], 30 * TR)); // 15 tháng: cùng kỳ năm trước = 80
    expect(ma(k)).not.toContain('tang_truong_doanh_thu');
  });

  it('cơ sở mới: tài khoản của cơ sở B có tiền lần đầu 06/2026, công ty hoạt động từ 12 tháng trước → cao', () => {
    const d = congTy(Array(12).fill(80 * TR), 40 * TR, {
      giao_dich: cacThang(5).map((k) => ban(k, 20 * TR, { account_number: '222222' })),
      co_so: [
        { id: 'cs-a', ten: 'Cơ sở chính', tao_luc: '2026-01-01T00:00:00Z', tai_khoan: ['111111'] },
        { id: 'cs-b', ten: 'Cơ sở Thủ Đức', tao_luc: '2026-09-01T00:00:00Z', tai_khoan: ['222222'] },
      ],
    });
    const s = lay(tinhTinHieu(d), 'mo_co_so_moi');
    expect(s.gia_tri).toBe(1);
    expect(s.do_tin_cay).toBe('cao');
    expect(s.bang_chung.thang).toEqual(['2026-06']);
    // Một cơ sở duy nhất thì không phải "mở cơ sở mới".
    expect(ma(tinhTinHieu({ ...d, co_so: d.co_so!.slice(0, 1) }))).not.toContain('mo_co_so_moi');
  });

  it('quỹ lương tăng: 3 → 5 người nhận đều mỗi tháng; bằng chứng không có tên người', () => {
    const NGUOI = ['NGUYEN VAN AN', 'TRAN THI BINH', 'LE VAN CUONG', 'PHAM THI DUNG', 'HOANG VAN EM'];
    const th = cacThang(6);
    const luong: GiaoDichNguon[] = [];
    th.forEach((k, i) => NGUOI.slice(0, i < 3 ? 3 : 5).forEach((n, j) => luong.push(chi(k, 8 * TR, { counter_account_name: n, counter_account_number: `55500${j}`, payment_reference: 'chuyen khoan' }))));
    const k = tinhTinHieu(congTy(Array(6).fill(120 * TR), 20 * TR, { giao_dich: luong }));
    const s = lay(k, 'quy_luong_tang');
    expect(s.bang_chung.so.so_nguoi_truoc).toBe(3);
    expect(s.bang_chung.so.so_nguoi_gan).toBe(5);
    expect(s.gia_tri).toBeCloseTo(40 / 24 - 1, 3);
    expect(s.do_tin_cay).toBe('thap'); // suy ra, không ghi "lương"
    for (const n of NGUOI) expect(JSON.stringify(k)).not.toContain(n);
    // Ghi rõ "luong" → tin cậy vừa.
    const luong2 = luong.map((t) => ({ ...t, id: `l${t.id}`, payment_reference: 'tra luong thang' }));
    expect(lay(tinhTinHieu(congTy(Array(6).fill(120 * TR), 20 * TR, { giao_dich: luong2 })), 'quy_luong_tang').do_tin_cay).toBe('vua');
    expect(laNguoi('CONG TY TNHH ABC')).toBe(false);
    expect(laNguoi('NGUYEN VAN AN')).toBe(true);
  });

  it('tiền dư đọng lại: 6 tháng bán 200tr, chi 50tr → dư 900tr, kịch bản yếu vẫn dư → cao', () => {
    const k = tinhTinHieu(congTy(Array(8).fill(200 * TR), 50 * TR));
    const s = lay(k, 'tien_du_dong_lai');
    expect(s.gia_tri).toBe(900 * TR);
    expect(s.do_tin_cay).toBe('cao');
  });

  it('khoảng trống vốn lưu động: 3 tháng hụt nhưng cả năm dư', () => {
    const ban12 = [100, 100, 100, 40, 40, 40, 100, 100, 100, 200, 200, 200].map((x) => x * TR);
    const k = tinhTinHieu(congTy(ban12, 80 * TR));
    const s = lay(k, 'khoang_trong_von_luu_dong');
    expect(s.bang_chung.so.so_thang_am).toBe(3);
    expect(s.gia_tri).toBe(40 * TR);
  });

  it('vay, trả nợ, tiền vào lớn, dòng tiền Hàn Quốc', () => {
    const th = cacThang(8);
    const them: GiaoDichNguon[] = [
      ban(th[2], 300 * TR, { type: 'loan', payment_reference: 'giai ngan hdtd 123' }),
      ...th.slice(-6).map((k) => chi(k, 10 * TR, { payment_reference: 'tra no vay thang' })),
      ban(th[5], 500 * TR, { payment_reference: 'gop von bo sung', counter_account_name: 'NGUYEN VAN CHU' }),
      ...th.slice(-4).map((k) => ban(k, 30 * TR, { payment_reference: 'KRW remittance from Seoul' })),
    ];
    const k = tinhTinHieu(congTy(Array(8).fill(100 * TR), 40 * TR, { giao_dich: them }));
    expect(lay(k, 'giai_ngan_vay').gia_tri).toBe(300 * TR);
    expect(lay(k, 'tra_no_vay_deu').bang_chung.so.so_thang).toBe(6);
    expect(lay(k, 'tien_vao_lon_mot_lan').gia_tri).toBe(500 * TR);
    const qt = lay(k, 'dong_tien_quoc_te');
    expect(qt.bang_chung.so.lien_quan_han_quoc).toBe(true);
    // Bảo thủ: hai khoản trong một tháng thì không đủ.
    const it2 = tinhTinHieu(congTy(Array(8).fill(100 * TR), 40 * TR, { giao_dich: [ban(th[7], 1 * TR, { payment_reference: 'usd' }), ban(th[7], 1 * TR, { payment_reference: 'usd' })] }));
    expect(ma(it2)).not.toContain('dong_tien_quoc_te');
  });

  it('chuyển giữa tài khoản của chính mình bị loại; dưới 6 tháng là "chưa đủ dữ liệu"', () => {
    const d = congTy(Array(4).fill(900 * TR));
    expect(tinhTinHieu(d).muc).toBe('chua_du_du_lieu');
    const noiBo = congTy(Array(8).fill(50 * TR), 30 * TR, { giao_dich: cacThang(8).map((k) => ban(k, 500 * TR, { counter_account_number: '111111' })) });
    expect(tinhTinHieu(noiBo).chuoi_thang.at(-1)!.vao_kd).toBe(50 * TR);
    expect(xepMuc(8, [])).toBe('on_dinh');
  });
});

describe('tất định và lời lẽ', () => {
  it('cùng dữ liệu (kể cả xáo thứ tự) → cùng kết quả, có phiên bản', () => {
    const d = congTy([...Array(12).fill(50 * TR), ...Array(3).fill(70 * TR)], 30 * TR);
    const a = tinhTinHieu(d);
    const b = tinhTinHieu({ ...d, giao_dich: [...d.giao_dich].reverse() });
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    expect(a.phien_ban).toBe(PHIEN_BAN_TIN_HIEU);
  });

  it('không có lời khuyên đầu tư, không gọi là "điểm" hay điểm tín dụng trong dấu hiệu, nhu cầu, bước tiếp theo', () => {
    const CAM = /(đầu tư|dau tu|invest|chứng khoán|cổ phiếu|trái phiếu|\bđiểm\b|\bscore\b|credit)/i;
    const ca = [
      congTy([...Array(6).fill(60 * TR), ...Array(6).fill(100 * TR)]),
      congTy(Array(8).fill(200 * TR), 50 * TR),
      congTy([...Array(12).fill(50 * TR), ...Array(3).fill(70 * TR)], 30 * TR),
    ];
    for (const d of ca) for (const ngon of ['vi', 'en'] as const) {
      const k = tinhTinHieu(d);
      const n = khopNhuCau(k, DANH_MUC, { ngon, tinh_thanh: null });
      const h = deXuatHanhDong(n, k, { hom_nay: HOM_NAY, co_ke_toan: true, ngon });
      const chu = [...k.tin_hieu.map((t) => t.giai_thich[ngon]), k.ten_muc[ngon], k.ly_do_muc[ngon], ...n.map((x) => `${x.ten} ${x.ly_do}`), ...h.map((x) => x.cau)];
      for (const c of chu) expect(c, c).not.toMatch(CAM);
    }
  });
});

// ── Danh mục và ghép gói ────────────────────────────────────────────────────

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const goi = (n: number, them: Partial<GoiNganHang>): GoiNganHang => ({
  id: uuid(n), ma: `goi_${n}`, ngan_hang: 'Ngân hàng X', phap_nhan_nhan: 'Ngân hàng X (Việt Nam)', ten_goi: `Gói ${n}`, nhu_cau: 'tien_gui',
  mo_ta: 'Mô tả', tieu_chi: null, da_xac_minh: false, nguon: null, dang_hoat_dong: true, ...them,
});
const DANH_MUC: GoiNganHang[] = [
  goi(1, { nhu_cau: 'tien_gui', ten_goi: 'Tiền gửi doanh nghiệp (chờ xác minh)' }),
  goi(2, { nhu_cau: 'uu_tien_chu', ten_goi: 'Khách hàng ưu tiên', da_xac_minh: true, nguon: 'https://x.vn/a', tieu_chi: { so_du_binh_quan_thang_toi_thieu: 1e9 } }),
  goi(3, { nhu_cau: 'ngoai_te', ten_goi: 'Ngoại hối' }),
  goi(4, { nhu_cau: 'tien_gui', ten_goi: 'Chứng chỉ quỹ mở cân bằng' }),
  goi(5, { nhu_cau: 'uu_tien_chu', ten_goi: 'Thẻ du lịch', da_xac_minh: true, nguon: 'https://x.vn/b', tieu_chi: { tinh_thanh: ['Hồ Chí Minh', 'Hà Nội'] } }),
  goi(6, { nhu_cau: 'ngoai_te', ten_goi: 'Tư vấn bàn Hàn Quốc', da_xac_minh: true, nguon: 'https://x.vn/c', tieu_chi: { can_lien_quan_han_quoc: true } }),
  goi(7, { nhu_cau: 'von_luu_dong', ten_goi: 'Bảo hiểm liên kết' }),
];

describe('nhu cầu → gói', () => {
  const k = tinhTinHieu(congTy(Array(8).fill(200 * TR), 50 * TR));

  it('tiền dư → tiền gửi + ưu tiên; sản phẩm đầu tư bị loại dù cấu hình sai; gói chưa xác minh không lộ ngưỡng', () => {
    const lech = [...DANH_MUC, goi(8, { nhu_cau: 'tien_gui', ten_goi: 'Tiền gửi lệch', tieu_chi: { doanh_thu_nam_toi_thieu: 5e9 } })];
    const n = khopNhuCau(k, lech, { ngon: 'vi', tinh_thanh: 'TP. Hồ Chí Minh' });
    const tg = n.find((x) => x.nhu_cau === 'tien_gui')!;
    expect(tg.goi.map((g) => g.id)).toEqual([uuid(1), uuid(8)]);
    for (const g of tg.goi) { expect(g.tieu_chi).toBeNull(); expect(g.da_xac_minh).toBe(false); expect(g.phu_hop).toBe('chua_kiem_duoc'); }
    expect(laSanPhamDauTu(DANH_MUC[3])).toBe(true);
    expect(laSanPhamDauTu(DANH_MUC[6])).toBe(true);
    const ut = n.find((x) => x.nhu_cau === 'uu_tien_chu')!;
    expect(ut.goi.find((g) => g.id === uuid(2))!.tieu_chi).toEqual({ so_du_binh_quan_thang_toi_thieu: 1e9 });
    expect(ut.goi.find((g) => g.id === uuid(2))!.phu_hop).toBe('chua_kiem_duoc'); // số dư cá nhân: MIMI không thấy
    expect(ut.goi.find((g) => g.id === uuid(5))!.phu_hop).toBe('phu_hop');
    // Ở Đà Nẵng: thẻ chỉ cho HCM/HN bị bỏ.
    const dn = khopNhuCau(k, DANH_MUC, { ngon: 'vi', tinh_thanh: 'Đà Nẵng' }).find((x) => x.nhu_cau === 'uu_tien_chu')!;
    expect(dn.goi.map((g) => g.id)).not.toContain(uuid(5));
  });

  it('bảo hiểm chỉ được nêu, không bao giờ ghép gói; gói Hàn Quốc chỉ khi có dòng tiền liên quan Hàn Quốc', () => {
    const NGUOI = ['NGUYEN VAN AN', 'TRAN THI BINH', 'LE VAN CUONG', 'PHAM THI DUNG'];
    const luong: GiaoDichNguon[] = [];
    cacThang(6).forEach((m, i) => NGUOI.slice(0, i < 3 ? 3 : 4).forEach((n, j) => luong.push(chi(m, 8 * TR, { counter_account_name: n, counter_account_number: `6660${j}`, payment_reference: 'luong' }))));
    const k2 = tinhTinHieu(congTy(Array(6).fill(120 * TR), 20 * TR, { giao_dich: [...luong, ...cacThang(4).map((m) => ban(m, 5 * TR, { payment_reference: 'usd transfer' }))] }));
    const n = khopNhuCau(k2, DANH_MUC, { ngon: 'vi', tinh_thanh: null });
    expect(n.find((x) => x.nhu_cau === 'bao_hiem')!.goi).toEqual([]);
    expect(n.find((x) => x.nhu_cau === 'ngoai_te')!.goi.map((g) => g.id)).toEqual([uuid(3)]);
  });
});

describe('bước tiếp theo', () => {
  it('giá trị kỳ vọng = tin cậy × độ mạnh × hợp kênh; không có kế toán thì không đi kênh văn phòng', () => {
    const k = tinhTinHieu(congTy(Array(8).fill(200 * TR), 50 * TR));
    const n = khopNhuCau(k, DANH_MUC, { ngon: 'vi', tinh_thanh: null });
    const h = deXuatHanhDong(n, k, { hom_nay: HOM_NAY, co_ke_toan: false, ngon: 'vi' });
    for (const x of h) {
      expect(x.kenh).not.toBe('van_phong_ke_toan');
      expect(x.kenh_khac.map((c) => c.kenh)).not.toContain('van_phong_ke_toan');
      expect(x.gia_tri_ky_vong).toBeCloseTo(x.thanh_phan.tin_cay * x.thanh_phan.do_manh * HOP_KENH[x.nhu_cau][x.kenh], 2);
      if (x.kenh === 'gap_chuyen_vien') expect(x.can_chu_yeu_cau).toBe(true);
    }
    const tg = h.find((x) => x.nhu_cau === 'tien_gui')!;
    expect(tg.kenh).toBe('the_trong_ung_dung');
    expect(tg.ngay_goi_y).toBe('2027-02-01');
  });
  it('hạn khai quý kế tiếp', () => {
    expect(hanKhaiQuyKeTiep('2026-11-16')).toBe('2027-01-31');
    expect(hanKhaiQuyKeTiep('2026-10-15')).toBe('2026-10-31');
    expect(hanKhaiQuyKeTiep('2026-04-30')).toBe('2026-04-30');
  });
});

// ── Đồng ý, gói giới thiệu, quyền ───────────────────────────────────────────

function dbGia(bang: Record<string, Row[]>) {
  const dem = new Map<string, number>();
  const db = {
    bang,
    async rpc(_ten: string, p: Row) {
      const k = `${p.p_user}|${p.p_hanh_dong}`;
      const n = (dem.get(k) ?? 0) + 1;
      dem.set(k, n);
      return { data: n <= p.p_toi_da, error: null };
    },
    from(ten: string) {
      const loc: ((r: Row) => boolean)[] = [];
      let kieu: 'select' | 'insert' | 'update' = 'select';
      let du: Row | null = null;
      let mot: 'maybe' | 'single' | null = null;
      let gioi = Number.POSITIVE_INFINITY;
      const chay = () => {
        const rows = (bang[ten] ??= []);
        let ra: Row[];
        if (kieu === 'insert') { ra = [{ id: crypto.randomUUID(), revoked_at: null, ...du }]; rows.push(...ra); }
        else if (kieu === 'update') { ra = rows.filter((r) => loc.every((f) => f(r))); for (const r of ra) Object.assign(r, du); }
        else ra = rows.filter((r) => loc.every((f) => f(r)));
        ra = ra.slice(0, gioi).map((r) => JSON.parse(JSON.stringify(r)));
        if (mot) return { data: ra[0] ?? null, error: mot === 'single' && !ra[0] ? { message: 'không có dòng' } : null };
        return { data: ra, error: null };
      };
      // deno-lint-ignore no-explicit-any
      const q: any = {
        select: () => q, order: () => q,
        eq: (c: string, v: unknown) => { loc.push((r) => r[c] === v); return q; },
        limit: (n: number) => { gioi = n; return q; },
        insert: (r: Row) => { kieu = 'insert'; du = r; return q; },
        update: (r: Row) => { kieu = 'update'; du = r; return q; },
        maybeSingle: () => { mot = 'maybe'; return q; },
        single: () => { mot = 'single'; return q; },
        then: (ok: (v: unknown) => unknown, hong: (e: unknown) => unknown) => Promise.resolve(chay()).then(ok, hong),
      };
      return q;
    },
  };
  return db;
}

const CT_A = '00000000-0000-4000-8000-00000000000a';
const CT_B = '00000000-0000-4000-8000-00000000000b';
const DU_LIEU_A = congTy(Array(8).fill(200 * TR), 50 * TR);

function moi(gio = '2026-11-16T03:00:00Z') {
  let t = new Date(gio);
  const pt: PhuThuoc & { dat: (s: string) => void } = {
    bayGio: () => t, dat: (s: string) => { t = new Date(s); },
    docDauVao: async (_db, cid) => ({ ...(cid === CT_A ? DU_LIEU_A : congTy(Array(3).fill(10 * TR))), hom_nay: HOM_NAY }),
    docGoi: async () => DANH_MUC,
  };
  const db = dbGia({
    companies: [
      { id: CT_A, name: 'Tạp hoá A', tax_id: '0312345678', province: 'TP. Hồ Chí Minh', industry: 'Bán lẻ', la_demo: false },
      { id: CT_B, name: 'Cửa hàng B', tax_id: null, province: null, industry: null, la_demo: false },
    ],
    thanh_vien_cong_ty: [],
  });
  return { db, pt };
}
const CHU_A = { userId: 'u-a', email: 'chu@a.vn', companyId: CT_A, vaiTro: 'chu_so_huu', coSoId: null };
const CHU_B = { userId: 'u-b', email: 'chu@b.vn', companyId: CT_B, vaiTro: 'chu_so_huu', coSoId: null };

describe('đồng ý và gói giới thiệu', () => {
  it('không có đồng ý (hoặc chưa đọc công bố phân tích) thì không có dòng nào, không có gói', async () => {
    const { db, pt } = moi();
    const r = await xuLy(db, CHU_A, 'dong_y', { goi_id: uuid(1), pham_vi: ['muc_tang_truong'] }, pt);
    expect(r.status).toBe(400);
    expect((await xuLy(db, CHU_A, 'dong_y', { goi_id: uuid(1), pham_vi: [], hieu_phan_tich: true }, pt)).status).toBe(400);
    expect((await xuLy(db, CHU_A, 'dong_y', { goi_id: uuid(1), pham_vi: ['lien_he_email'], hieu_phan_tich: true }, pt)).status).toBe(400);
    expect((await xuLy(db, CHU_A, 'dong_y', { goi_id: uuid(1), pham_vi: ['muc_tang_truong'], hieu_phan_tich: true, so_ngay: 365 }, pt)).status).toBe(400);
    // Gói không khớp nhu cầu nào (ngoại tệ) / gói đầu tư → không lập.
    expect((await xuLy(db, CHU_A, 'dong_y', { goi_id: uuid(3), pham_vi: ['muc_tang_truong'], hieu_phan_tich: true }, pt)).status).toBe(409);
    expect((await xuLy(db, CHU_A, 'dong_y', { goi_id: uuid(4), pham_vi: ['muc_tang_truong'], hieu_phan_tich: true }, pt)).status).toBe(404);
    expect(db.bang.dong_y_gioi_thieu ?? []).toEqual([]);
    expect(db.bang.gioi_thieu_ngan_hang ?? []).toEqual([]);
  });

  it('mặc định: gói chỉ có mức + nhu cầu; đúng các trường đã chọn; mã băm khớp; gửi; thu hồi xoá nội dung', async () => {
    const { db, pt } = moi();
    expect(TRUONG_MAC_DINH).toEqual(['muc_tang_truong', 'nhu_cau']);
    const r = await xuLy(db, CHU_A, 'dong_y', { goi_id: uuid(1), pham_vi: ['nhu_cau', 'muc_tang_truong'], hieu_phan_tich: true }, pt);
    expect(r.status).toBe(200);
    const dy = db.bang.dong_y_gioi_thieu[0];
    const gt = db.bang.gioi_thieu_ngan_hang[0];
    expect(dy).toMatchObject({ company_id: CT_A, offer_id: uuid(1), data_scope: ['muc_tang_truong', 'nhu_cau'], yeu_cau_lien_he: false, created_by: 'u-a', revoked_at: null });
    expect(gt).toMatchObject({ company_id: CT_A, consent_id: dy.id, status: 'draft' });
    expect(Object.keys(gt.payload.du_lieu)).toEqual(['muc_tang_truong', 'nhu_cau']);
    expect(gt.payload.du_lieu.nhu_cau).toEqual(['tien_gui']);
    expect(gt.payload.pham_vi_lanh_tho).toBe('viet_nam');
    const s = JSON.stringify(gt.payload);
    for (const cam of ['chu@a.vn', '0312345678', 'Tạp hoá A', '900001', '200000000', 'g0']) expect(s).not.toContain(cam);
    expect(Date.parse(dy.expires_at) - Date.parse('2026-11-16T03:00:00Z')).toBe(30 * 86_400_000);

    // Gửi: đổi trạng thái, xuất đúng gói đã lưu.
    pt.dat('2026-11-17T03:00:00Z');
    const g = await xuLy(db, CHU_A, 'gui', { id: gt.id }, pt);
    expect(g.status).toBe(200);
    expect(g.body.goi).toEqual(gt.payload);
    expect(db.bang.gioi_thieu_ngan_hang[0]).toMatchObject({ status: 'sent_by_owner', sent_by: 'u-a' });
    expect((await xuLy(db, CHU_A, 'gui', { id: gt.id }, pt)).status).toBe(200); // xuất lại được

    // Thu hồi: đồng ý hết hiệu lực, gói "đã rút", nội dung bị xoá; không gửi được nữa.
    const th = await xuLy(db, CHU_A, 'thu_hoi', { id: dy.id }, pt);
    expect(th.status).toBe(200);
    expect(db.bang.dong_y_gioi_thieu[0].revoked_at).toBeTruthy();
    expect(db.bang.gioi_thieu_ngan_hang[0]).toMatchObject({ status: 'withdrawn', payload: null });
    expect(db.bang.gioi_thieu_ngan_hang[0].payload_sha256).toBe(gt.payload_sha256);
    expect((await xuLy(db, CHU_A, 'gui', { id: gt.id }, pt)).status).toBe(409);
    const ds = await xuLy(db, CHU_A, 'ds', {}, pt);
    expect(ds.body.dong_y[0].trang_thai).toBe('da_thu_hoi');
  });

  it('số liệu và liên hệ chỉ khi chủ tích; liên hệ chỉ khi chủ yêu cầu ngân hàng liên hệ; hết hạn thì không gửi', async () => {
    const { db, pt } = moi();
    const r = await xuLy(db, CHU_A, 'dong_y', {
      goi_id: uuid(2), pham_vi: ['muc_tang_truong', 'doanh_thu_12_thang', 'lien_he_dien_thoai', 'ten_doanh_nghiep'],
      yeu_cau_lien_he: true, dien_thoai: '0912 345 678', hieu_phan_tich: true, so_ngay: 7,
    }, pt);
    expect(r.status).toBe(200);
    const p = db.bang.gioi_thieu_ngan_hang[0].payload;
    expect(Object.keys(p.du_lieu)).toEqual(['muc_tang_truong', 'doanh_thu_12_thang', 'ten_doanh_nghiep', 'lien_he_dien_thoai']);
    expect(p.du_lieu.lien_he_dien_thoai).toBe('0912345678');
    expect(p.yeu_cau_lien_he).toBe(true);
    expect(JSON.stringify(p)).not.toContain('chu@a.vn');
    pt.dat('2026-11-24T03:00:01Z');
    const g = await xuLy(db, CHU_A, 'gui', { id: db.bang.gioi_thieu_ngan_hang[0].id }, pt);
    expect(g.status).toBe(409);
    expect(g.body.ma).toBe('HET_HAN');
    expect(docYeuCauDongY({ hieu_phan_tich: true, pham_vi: ['khong_co'] }, 'vi').ok).toBe(false);
    expect(khoangDoanhThu(2e9)).toBe('tu_1_den_3_ty');
    expect(khoangDoanhThu(1e9)).toBe('duoi_1_ty');
  });

  it('chéo công ty và thành viên bị giới hạn bị từ chối', async () => {
    const { db, pt } = moi();
    await xuLy(db, CHU_A, 'dong_y', { goi_id: uuid(1), pham_vi: ['muc_tang_truong'], hieu_phan_tich: true }, pt);
    const gt = db.bang.gioi_thieu_ngan_hang[0];
    const dy = db.bang.dong_y_gioi_thieu[0];
    expect((await xuLy(db, CHU_B, 'gui', { id: gt.id }, pt)).status).toBe(404);
    expect((await xuLy(db, CHU_B, 'thu_hoi', { id: dy.id }, pt)).status).toBe(404);
    expect((await xuLy(db, CHU_B, 'ds', {}, pt)).body).toEqual({ dong_y: [], gioi_thieu: [] });
    expect(db.bang.gioi_thieu_ngan_hang[0].status).toBe('draft');
    expect(db.bang.dong_y_gioi_thieu[0].revoked_at).toBeNull();

    const keToanCoSo = { ...CHU_A, userId: 'u-k', vaiTro: 'ke_toan', coSoId: 'cs-1' };
    const r1 = await xuLy(db, keToanCoSo, 'tin_hieu', {}, pt);
    expect(r1.status).toBe(403);
    expect(r1.body.ma).toBe('PHAM_VI_CO_SO');
    const r2 = await xuLy(db, { ...keToanCoSo, coSoId: null }, 'thu_hoi', { id: dy.id }, pt);
    expect(r2.body.ma).toBe('KHONG_DU_QUYEN');
    expect(kiemCua('nguoi_xem', null).ok).toBe(false);
    expect(kiemCua('quan_tri', null).ok).toBe(true);
    expect(db.bang.dong_y_gioi_thieu[0].revoked_at).toBeNull();
  });

  it('tin_hieu trả công bố phân tích và các trường chia sẻ, mặc định chỉ mức + nhu cầu', async () => {
    const { db, pt } = moi();
    const r = await xuLy(db, CHU_A, 'tin_hieu', { ngon: 'en' }, pt);
    expect(r.status).toBe(200);
    expect(r.body.cong_bo.join(' ')).toMatch(/profiling/);
    expect(r.body.truong_chia_se.filter((t: Row) => t.mac_dinh).map((t: Row) => t.ma)).toEqual(['muc_tang_truong', 'nhu_cau']);
    // 8 tháng × 200 triệu: tổng trượt đã quá 1 tỷ ngay tháng này → sắp vượt 01 tỷ → "Đang lên".
    expect(r.body.tin_hieu.muc).toBe('dang_len');
  });
});

describe('văn phòng kế toán: chỉ mức tăng trưởng', () => {
  it('lọc thành viên như văn phòng: bỏ người bị giới hạn cơ sở và vai trò không làm sổ; không số tiền', async () => {
    const rows = [
      { company_id: CT_A, vai_tro: 'ke_toan', co_so_id: null, companies: { id: CT_A, name: 'Tạp hoá A', la_demo: false } },
      { company_id: CT_B, vai_tro: 'ke_toan', co_so_id: 'cs-9', companies: { id: CT_B, name: 'Cửa hàng B', la_demo: false } },
      { company_id: 'c3', vai_tro: 'nguoi_xem', co_so_id: null, companies: { id: 'c3', name: 'C', la_demo: false } },
      { company_id: 'c4', vai_tro: 'ke_toan', co_so_id: null, companies: { id: 'khac', name: 'Lệch', la_demo: false } },
    ];
    const l = locCongTyLamSo(rows);
    expect(l.duoc.map((x) => x.company_id)).toEqual([CT_A]);
    expect(l.gioi_han_co_so).toBe(1);
    expect(l.vai_tro_khong_lam_so).toBe(1);

    const { db, pt } = moi();
    db.bang.thanh_vien_cong_ty = rows.map((r) => ({ ...r, user_id: 'u-k' }));
    const kq = await tongHopVanPhong(db, 'u-k', pt);
    expect(kq.status).toBe(200);
    expect(kq.body.khach).toHaveLength(1);
    expect(Object.keys(kq.body.khach[0]).sort()).toEqual(['company_id', 'loi', 'muc', 'so_dau_hieu', 'ten']);
    expect(kq.body.dem.dang_len + kq.body.dem.on_dinh + kq.body.dem.moi_tang_truong + kq.body.dem.san_sang_mo_rong + kq.body.dem.chua_du_du_lieu).toBe(1);
    expect(JSON.stringify(kq.body)).not.toMatch(/900000000|200000000/);
  });
});

describe('migration và mã', () => {
  const GOC = join(__dirname, '..', '..', '..', '..');
  const sql = readFileSync(join(GOC, 'supabase', 'migrations', '20261116090000_gioi_thieu_ngan_hang.sql'), 'utf8');
  it('gói chưa xác minh không được mang ngưỡng; gói xác minh có nguồn; không có nhóm bảo hiểm/đầu tư; chỉ Việt Nam', () => {
    expect(sql).toMatch(/CHECK \(da_xac_minh OR tieu_chi IS NULL\)/);
    expect(sql).toMatch(/CHECK \(NOT da_xac_minh OR nguon IS NOT NULL\)/);
    expect(sql).toMatch(/pham_vi_lanh_tho = 'viet_nam'/);
    expect(/nhu_cau IN \(([^)]*)\)/.exec(sql)![1]).not.toMatch(/bao_hiem|dau_tu/);
    expect(sql).toMatch(/'uob_vn_tien_gui_draft'[\s\S]*?NULL, false, NULL/);
    // Gói giới thiệu không tồn tại nếu không có đồng ý cùng công ty.
    expect(sql).toMatch(/FOREIGN KEY \(consent_id, company_id\) REFERENCES public\.dong_y_gioi_thieu \(id, company_id\)/);
    expect(sql).toMatch(/status <> 'withdrawn' OR \(payload IS NULL/);
  });
  it('không gọi mạng ra ngoài (không fetch) trong module và edge function', () => {
    const dir = join(GOC, 'supabase', 'functions', '_shared', 'gioi-thieu-ngan-hang');
    const tep = readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts')).map((f) => readFileSync(join(dir, f), 'utf8'));
    tep.push(readFileSync(join(GOC, 'supabase', 'functions', 'gioi-thieu-ngan-hang', 'index.ts'), 'utf8'));
    for (const s of tep) expect(s).not.toMatch(/\bfetch\(/);
  });
});
