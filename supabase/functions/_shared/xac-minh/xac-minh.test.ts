import { describe, expect, it, vi } from 'vitest';
import { cacThang, ky12Thang, kyTheoNam, lapBaoCao, laBaoCao, nhomSo, type DauVaoBaoCao } from './bao-cao';
import { bamBaoCao, jsonChuan, LoiChuanHoa, sha256Hex } from './chuan-hoa';
import { b64, guiNeo, LICH_XAC_MINH, nangCapNeo, tepOtsBaoCao, tuB64 } from './neo';
import { bamToken, goiCongKhai, hanChiaSe, laToken, taoToken, trangThaiChiaSe } from './chia-se';
import { neoLai, xemCongKhai, xuLyNguoiDung, type PhuThuoc } from './xu-ly';
import {
  docTepOts, ghiVarbytes, ghiVaruint, noi, OP_APPEND, OP_SHA256, sangHex, sha256, TAG_BITCOIN, TAG_CHO, tuHex, uriCho,
} from '../dau-thoi-gian/ots';

// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

const TR = 1_000_000;

// ── Bộ máy tính ────────────────────────────────────────────────────────────

function dauVaoMau(them: Partial<DauVaoBaoCao> = {}): DauVaoBaoCao {
  return {
    ky: kyTheoNam(2025, '2026-11-10')!,
    lap_ngay: '2026-11-10',
    ten_doanh_nghiep: 'Tạp hoá Mẫu',
    giao_dich: [
      { id: 't1', amount: 600 * TR, type: 'income', transaction_date: '2025-01-15' },
      { id: 't2', amount: 450 * TR, type: 'income', transaction_date: '2025-02-10' },
      { id: 't3', amount: 200 * TR, type: 'income', transaction_date: '2025-03-05' },
      { id: 't4', amount: 50 * TR, type: 'income', transaction_date: '2025-03-06' },
      { id: 't5', amount: 10 * TR, type: 'income', transaction_date: '2025-04-01' },
      { id: 't6', amount: 150 * TR, type: 'income', transaction_date: '2025-04-02' },
      { id: 't7', amount: 100 * TR, type: 'expense', transaction_date: '2025-05-01' },
      { id: 't8', amount: 120 * TR, type: 'income', transaction_date: '2026-01-03' },
    ],
    phan_loai: [
      { transaction_id: 't1', revenue_effect: 'include', confirmed_type: 'business_revenue', suggestion_source: 'rule' },
      { transaction_id: 't3', revenue_effect: 'exclude', confirmed_type: 'loan', suggestion_source: 'human' },
      { transaction_id: 't4', revenue_effect: 'exclude', confirmed_type: 'family_transfer', suggestion_source: 'human' },
      { transaction_id: 't5', revenue_effect: 'exclude', confirmed_type: 'refund', suggestion_source: 'human' },
    ],
    noi_bo_ids: new Set(['t6']),
    suy_doan_ids: new Set(),
    so_tai_khoan: 2,
    so_lan_doi_phan_loai: 5,
    du_lieu_minh_hoa: false,
    ...them,
  };
}

describe('kỳ báo cáo', () => {
  it('năm đã đóng đủ 12 tháng; năm đang chạy chỉ tới tháng đã kết thúc; 12 tháng gần nhất', () => {
    expect(kyTheoNam(2025, '2026-11-10')).toEqual({ loai: 'nam', tu_thang: '2025-01', den_thang: '2025-12' });
    expect(kyTheoNam(2026, '2026-11-10')).toEqual({ loai: 'nam', tu_thang: '2026-01', den_thang: '2026-10' });
    expect(kyTheoNam(2026, '2026-01-05')).toBeNull();
    expect(kyTheoNam(1999, '2026-11-10')).toBeNull();
    const k = ky12Thang('2026-01-05');
    expect(k).toEqual({ loai: '12_thang', tu_thang: '2025-01', den_thang: '2025-12' });
    expect(cacThang(ky12Thang('2026-11-10'))).toHaveLength(12);
    expect(cacThang(ky12Thang('2026-11-10'))[0]).toBe('2025-11');
  });
});

describe('lapBaoCao: con số', () => {
  const bc = lapBaoCao(dauVaoMau());

  it('doanh thu = tiền vào − nội bộ − khoản chủ hộ xác nhận không phải doanh thu; khoảng cắt ngưỡng 01 tỷ', () => {
    expect(bc.doanh_thu.uoc_tinh).toBe(1050 * TR);
    expect(bc.doanh_thu.can_duoi).toBe(600 * TR);
    expect(bc.doanh_thu.can_tren).toBe(1050 * TR);
    expect(bc.doanh_thu.trang_thai).toBe('can_xem');
    expect(bc.doanh_thu.ket_luan_phu_thuoc).toBe(true);
    expect(bc.doanh_thu.nguong).toEqual([
      { ma: 'mien_thue_1_ty', gia_tri: 1_000_000_000, phia: 'chua_chac' },
      { ma: 'phuong_phap_3_ty', gia_tri: 3_000_000_000, phia: 'duoi' },
    ]);
    expect(bc.ly_do.vi.khoang).toMatch(/cắt ngưỡng 01 tỷ đồng/);
  });

  it('khoản ngoài kỳ không tính', () => {
    expect(bc.tien_vao.tong).toBe(1460 * TR);
    expect(bc.tien_vao.so_khoan).toBe(6);
  });

  it('loại trừ theo loại, cộng khớp', () => {
    expect(bc.loai_tru).toEqual({ tien_vay: 200 * TR, gop_von: 0, nguoi_nha: 50 * TR, hoan_tien: 10 * TR, dat_coc: 0, khac: 0, chuyen_noi_bo: 150 * TR, tong: 410 * TR });
  });

  it('phần xác nhận / tự động / chưa rõ theo tiền, cộng đúng 10000 phần vạn', () => {
    expect(bc.tien_vao.chu_xac_nhan).toBe(860 * TR);
    expect(bc.tien_vao.tu_dong_noi_bo).toBe(150 * TR);
    expect(bc.tien_vao.chua_ro).toBe(450 * TR);
    expect([bc.tien_vao.ty_le_chu_xac_nhan_pv, bc.tien_vao.ty_le_tu_dong_pv, bc.tien_vao.ty_le_chua_ro_pv]).toEqual([5890, 1027, 3083]);
    expect(bc.tien_vao.nguon_xac_nhan).toEqual({ theo_goi_y_quy_tac: 1, theo_goi_y_mo_hinh: 0, tu_chon: 3 });
    expect(bc.ly_do.vi.xac_nhan).toContain('58,9%');
    expect(bc.ly_do.en.xac_nhan).toContain('58.9%');
  });

  it('chuỗi theo tháng: đủ 12 tháng, tháng không giao dịch là "chưa có dữ liệu" chứ không phải 0', () => {
    expect(bc.theo_thang).toHaveLength(12);
    expect(bc.theo_thang[0]).toEqual({ thang: '2025-01', doanh_thu: 600 * TR, co_du_lieu: true });
    expect(bc.theo_thang[1]).toEqual({ thang: '2025-02', doanh_thu: 450 * TR, co_du_lieu: true });
    expect(bc.theo_thang[5]).toEqual({ thang: '2025-06', doanh_thu: 0, co_du_lieu: false });
    expect(bc.pham_vi.thang_co_du_lieu).toEqual(['2025-01', '2025-02', '2025-03', '2025-04', '2025-05']);
    expect(bc.pham_vi.so_tai_khoan).toBe(2);
    expect(bc.theo_thang.reduce((s, t) => s + t.doanh_thu, 0)).toBe(bc.doanh_thu.uoc_tinh);
  });

  it('có câu giải thích tiếng Việt và tiếng Anh cho từng con số, và lưu ý không phải điểm tín dụng', () => {
    for (const k of ['doanh_thu', 'khoang', 'theo_thang', 'xac_nhan', 'loai_tru', 'pham_vi'] as const) {
      expect(bc.ly_do.vi[k].length).toBeGreaterThan(20);
      expect(bc.ly_do.en[k].length).toBeGreaterThan(20);
    }
    expect(bc.luu_y.vi).toBe('Báo cáo do chủ hộ chia sẻ, không phải điểm tín dụng.');
    expect(laBaoCao(bc)).toBe(true);
  });

  it('tháng trống giữa kỳ mở rộng cận trên', () => {
    const r = lapBaoCao(dauVaoMau({
      giao_dich: [
        { id: 'a', amount: 100 * TR, type: 'income', transaction_date: '2025-01-10' },
        { id: 'b', amount: 50 * TR, type: 'income', transaction_date: '2025-03-10' },
      ],
      phan_loai: [{ transaction_id: 'a', revenue_effect: 'include' }, { transaction_id: 'b', revenue_effect: 'include' }],
      noi_bo_ids: new Set(),
    }));
    expect(r.doanh_thu.uoc_tinh).toBe(150 * TR);
    expect(r.doanh_thu.can_tren).toBe(250 * TR);
    expect(r.ly_do.vi.khoang).toMatch(/1 tháng/);
  });

  it('kỳ 12 tháng vắt qua hai năm: cộng cả hai năm', () => {
    const r = lapBaoCao(dauVaoMau({ ky: ky12Thang('2026-02-01') }));
    // 2025-02 .. 2026-01: t2 (450) + t8 (120, chưa xác nhận); t1 tháng 1/2025 nằm ngoài.
    expect(r.doanh_thu.uoc_tinh).toBe(570 * TR);
    expect(r.ky).toEqual({ loai: '12_thang', tu_ngay: '2025-02-01', den_ngay: '2026-01-31' });
  });

  it('không có giao dịch → chưa đủ dữ liệu', () => {
    const r = lapBaoCao(dauVaoMau({ giao_dich: [], phan_loai: [] }));
    expect(r.doanh_thu.trang_thai).toBe('chua_du_du_lieu');
    expect(r.tien_vao.ty_le_chu_xac_nhan_pv).toBeNull();
  });

  it('nhomSo không phụ thuộc ICU', () => {
    expect(nhomSo(1234567)).toBe('1.234.567');
    expect(nhomSo('-1000')).toBe('-1.000');
  });
});

describe('chuẩn hoá và mã băm', () => {
  it('khoá xếp thứ tự, không khoảng trắng, bỏ undefined', () => {
    expect(jsonChuan({ b: 1, a: { d: [1, { z: 1, y: 2 }], c: null, x: undefined } })).toBe('{"a":{"c":null,"d":[1,{"y":2,"z":1}]},"b":1}');
    expect(jsonChuan({ s: 'Tiền "bán" hàng' })).toBe('{"s":"Tiền \\"bán\\" hàng"}');
    expect(() => jsonChuan({ x: Number.NaN })).toThrow(LoiChuanHoa);
    expect(() => jsonChuan({ x: Infinity })).toThrow(LoiChuanHoa);
  });

  it('SHA-256 đúng vector chuẩn', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('cùng dữ liệu, khác thứ tự đọc → cùng báo cáo, cùng mã băm', async () => {
    const a = lapBaoCao(dauVaoMau());
    const dv = dauVaoMau();
    const b = lapBaoCao({ ...dv, giao_dich: [...dv.giao_dich].reverse(), phan_loai: [...dv.phan_loai].reverse() });
    expect(jsonChuan(a)).toBe(jsonChuan(b));
    expect(await bamBaoCao(a)).toBe(await bamBaoCao(b));
    // Đi qua JSON (lưu jsonb rồi đọc lại) vẫn ra cùng mã băm.
    expect(await bamBaoCao(JSON.parse(JSON.stringify(a)))).toBe(await bamBaoCao(a));
    // Đổi một đồng → mã băm khác.
    const c = lapBaoCao({ ...dv, giao_dich: dv.giao_dich.map((t) => (t.id === 't2' ? { ...t, amount: 450 * TR + 1 } : t)) });
    expect(await bamBaoCao(c)).not.toBe(await bamBaoCao(a));
  });
});

// ── Neo OpenTimestamps (fetch giả) ─────────────────────────────────────────

const enc = (s: string) => new TextEncoder().encode(s);
/** Phản hồi lịch: append nonce, sha256, chứng thực chờ với URI của lịch. */
const phanHoiLich = (uri: string, nonce = 7) =>
  noi([OP_APPEND], ghiVarbytes(new Uint8Array(16).fill(nonce)), [OP_SHA256], [0x00], tuHex(TAG_CHO), ghiVarbytes(ghiVarbytes(enc(uri))));
const resBytes = (b: Uint8Array, status = 200) => new Response(new Uint8Array(b), { status });

describe('neo OpenTimestamps', () => {
  const SHA = 'ab'.repeat(32);

  it('chỉ gửi đúng 32 byte mã băm tới hai lịch; bằng chứng đọc lại được thành tệp .ots', async () => {
    const goi = vi.fn(async (url: string, init?: RequestInit) => {
      expect(init?.method).toBe('POST');
      expect([...(init?.body as Uint8Array)]).toEqual([...tuHex(SHA)]);
      return resBytes(phanHoiLich(url.replace('/digest', ''), url.includes('//a.') ? 1 : 2));
    });
    const kq = await guiNeo(SHA, goi);
    expect(goi.mock.calls.map((c) => c[0]).sort()).toEqual(LICH_XAC_MINH.map((l) => `${l}/digest`));
    expect(kq.trang_thai).toBe('pending');
    expect(kq.nhanh).toHaveLength(2);
    const tep = await docTepOts(tepOtsBaoCao(SHA, kq.ots_proof!));
    expect(sangHex(tep.digest)).toBe(SHA);
    expect(tep.ds.map(uriCho).sort()).toEqual([...LICH_XAC_MINH]);
  });

  it('mạng hỏng không ném lỗi: not_anchored kèm lý do; một lịch hỏng vẫn còn nhánh kia', async () => {
    const hong = await guiNeo(SHA, async () => { throw new Error('mất mạng'); });
    expect(hong).toMatchObject({ trang_thai: 'not_anchored', ots_proof: null });
    expect(hong.loi).toMatch(/mất mạng/);
    const mot = await guiNeo(SHA, async (url: string) => (url.includes('//a.') ? resBytes(new Uint8Array(0), 503) : resBytes(phanHoiLich(LICH_XAC_MINH[1]))));
    expect(mot.trang_thai).toBe('pending');
    expect(mot.nhanh.map((n) => n.lich)).toEqual([LICH_XAC_MINH[1]]);
    const rac = await guiNeo(SHA, async () => resBytes(enc('không phải ots')));
    expect(rac.trang_thai).toBe('not_anchored');
    expect((await guiNeo('xyz')).trang_thai).toBe('not_anchored');
  });

  it('nâng cấp: vào Bitcoin và khớp merkle root → confirmed; chưa có → pending; root lệch → failed', async () => {
    const gui = await guiNeo(SHA, async (url: string) => resBytes(phanHoiLich(url.replace('/digest', ''))));
    const camKet = await sha256(noi(tuHex(SHA), new Uint8Array(16).fill(7)));
    const btc = noi([OP_SHA256], [0x00], tuHex(TAG_BITCOIN), ghiVarbytes(new Uint8Array(ghiVaruint(870000))));
    const root = sangHex(await sha256(camKet));
    const goiBtc = async (url: string) => {
      expect(url).toContain(`/timestamp/${sangHex(camKet)}`);
      return resBytes(btc);
    };
    const xong = await nangCapNeo(SHA, gui.nhanh, goiBtc, async () => root);
    expect(xong).toMatchObject({ trang_thai: 'confirmed', khoi_bitcoin: 870000 });
    const tep = await docTepOts(tepOtsBaoCao(SHA, xong.ots_proof!));
    expect(tep.ds.some((c) => c.tag === TAG_BITCOIN)).toBe(true);

    expect((await nangCapNeo(SHA, gui.nhanh, async () => resBytes(new Uint8Array(0), 404))).trang_thai).toBe('pending');
    expect((await nangCapNeo(SHA, gui.nhanh, async () => { throw new Error('mất mạng'); })).trang_thai).toBe('pending');
    expect((await nangCapNeo(SHA, gui.nhanh, goiBtc, async () => '00'.repeat(32))).trang_thai).toBe('failed');
    expect((await nangCapNeo(SHA, [{ lich: LICH_XAC_MINH[0], phan_hoi: b64(enc('hỏng')) }], goiBtc)).trang_thai).toBe('failed');
    expect(tuB64(b64(new Uint8Array([1, 2, 3])))).toEqual(new Uint8Array([1, 2, 3]));
  });
});

// ── Chia sẻ ────────────────────────────────────────────────────────────────

describe('mã chia sẻ và hạn', () => {
  it('mã 256 bit, 43 ký tự base64url, mỗi lần khác; băm không trả lại mã', async () => {
    const a = taoToken();
    const b = taoToken();
    expect(laToken(a)).toBe(true);
    expect(a).not.toBe(b);
    const h = await bamToken(a);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain(a);
    expect(laToken('ngan')).toBe(false);
  });

  it('hạn 1–30 ngày, mặc định 14; hết hạn và thu hồi', () => {
    const t = new Date('2026-11-10T00:00:00Z');
    expect(hanChiaSe(undefined, t)).toBe('2026-11-24T00:00:00.000Z');
    expect(hanChiaSe(30, t)).toBe('2026-12-10T00:00:00.000Z');
    expect(hanChiaSe(31, t)).toBeNull();
    expect(hanChiaSe(0, t)).toBeNull();
    expect(hanChiaSe(1.5, t)).toBeNull();
    expect(trangThaiChiaSe({ expires_at: '2026-11-11T00:00:00Z', revoked_at: null }, t)).toBe('con_han');
    expect(trangThaiChiaSe({ expires_at: '2026-11-10T00:00:00Z', revoked_at: null }, t)).toBe('het_han');
    expect(trangThaiChiaSe({ expires_at: '2026-11-11T00:00:00Z', revoked_at: '2026-11-09T00:00:00Z' }, t)).toBe('da_thu_hoi');
  });

  it('gói công khai chỉ có những trường được liệt kê', () => {
    const g = goiCongKhai(
      { report_json: { x: 1 }, sha256: 'ab'.repeat(32), anchor_status: 'not_anchored', ots_proof: null, anchored_at: null, confirmed_at: null, bitcoin_block: null, company_id: 'c', created_by: 'u', ots_nhanh: [] } as never,
      { recipient_name: 'Ngân hàng X', purpose: 'Vay vốn', expires_at: '2026-11-24T00:00:00Z', token_hash: 'h', company_id: 'c', created_by: 'u' } as never,
    );
    expect(Object.keys(g).sort()).toEqual(['bao_cao', 'chia_se', 'neo', 'sha256']);
    expect(JSON.stringify(g)).not.toMatch(/company_id|created_by|token_hash|ots_nhanh/);
  });
});

// ── Đường đi đầy đủ với CSDL giả ───────────────────────────────────────────

const MAC_DINH: Record<string, () => Row> = {
  bao_cao_xac_minh: () => ({ anchor_status: 'not_anchored', anchor_tries: 0, ots_proof: null, ots_nhanh: [], anchored_at: null, confirmed_at: null, bitcoin_block: null }),
  chia_se_xac_minh: () => ({ revoked_at: null }),
  nhat_ky_xem_xac_minh: () => ({ at: new Date().toISOString() }),
};

function dbGia(bang: Record<string, Row[]>) {
  const dem = new Map<string, number>();
  const db = {
    bang,
    dem,
    async rpc(ten: string, p: Row) {
      const k = `${p.p_user}|${p.p_hanh_dong}`;
      if (ten === 'so_luot_goi') return { data: dem.get(k) ?? 0, error: null };
      const n = (dem.get(k) ?? 0) + 1;
      dem.set(k, n);
      return { data: n <= p.p_toi_da, error: null };
    },
    from(ten: string) {
      const loc: ((r: Row) => boolean)[] = [];
      let kieu: 'select' | 'insert' | 'update' = 'select';
      let du: Row | Row[] | null = null;
      let mot: 'maybe' | 'single' | null = null;
      let tu = 0;
      let den = Number.POSITIVE_INFINITY;
      let gioi = Number.POSITIVE_INFINITY;
      const chay = () => {
        const rows = (bang[ten] ??= []);
        let ra: Row[];
        if (kieu === 'insert') {
          ra = (Array.isArray(du) ? du : [du as Row]).map((r) => ({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...(MAC_DINH[ten]?.() ?? {}), ...r }));
          rows.push(...ra);
        } else if (kieu === 'update') {
          ra = rows.filter((r) => loc.every((f) => f(r)));
          for (const r of ra) Object.assign(r, du);
        } else ra = rows.filter((r) => loc.every((f) => f(r)));
        ra = ra.slice(tu, Math.min(den + 1, tu + 1000)).slice(0, gioi).map((r) => JSON.parse(JSON.stringify(r)));
        if (mot) return { data: ra[0] ?? null, error: mot === 'single' && !ra[0] ? { message: 'không có dòng' } : null };
        return { data: ra, error: null };
      };
      // deno-lint-ignore no-explicit-any
      const q: any = {
        select: () => q, order: () => q,
        eq: (c: string, v: unknown) => { loc.push((r) => r[c] === v); return q; },
        is: (c: string, v: unknown) => { loc.push((r) => (r[c] ?? null) === v); return q; },
        lt: (c: string, v: string | number) => { loc.push((r) => r[c] !== null && r[c] !== undefined && r[c] < v); return q; },
        gte: (c: string, v: string | number) => { loc.push((r) => r[c] >= v); return q; },
        lte: (c: string, v: string | number) => { loc.push((r) => r[c] <= v); return q; },
        limit: (n: number) => { gioi = n; return q; },
        range: (a: number, b: number) => { tu = a; den = b; return q; },
        insert: (r: Row | Row[]) => { kieu = 'insert'; du = r; return q; },
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
const PII = ['NGUYEN VAN A', '0123456789', '9876543210', 'chuyen tien hang thang 3', 'TRAN THI B'];

function duLieu() {
  const gd = (id: string, amount: number, ngay: string, them: Row = {}): Row => ({
    id, company_id: CT_A, amount, type: 'income', transaction_date: ngay, is_synthetic: false,
    account_number: '0123456789', counter_account_number: '9876543210', counter_account_name: 'NGUYEN VAN A',
    payment_reference: 'chuyen tien hang thang 3', merchant_name: 'TRAN THI B', ...them,
  });
  return dbGia({
    companies: [{ id: CT_A, name: 'Tạp hoá A', la_demo: false }, { id: CT_B, name: 'Cửa hàng B', la_demo: false }],
    transactions: [gd('g1', 300 * TR, '2026-03-05'), gd('g2', 80 * TR, '2026-04-10'), gd('g3', 20 * TR, '2026-05-01', { type: 'expense' })],
    bank_connections: [{ company_id: CT_A, account_number: '0123456789', revoked_at: null }],
    sao_ke_nhap: [],
    revenue_classifications: [{ company_id: CT_A, transaction_id: 'g2', confirmed_type: 'loan', revenue_effect: 'exclude', suggestion_source: 'pattern' }],
    revenue_classification_events: [{ id: 1, company_id: CT_A, transaction_id: 'g2' }],
  });
}

function dongHo(iso: string, them: Partial<PhuThuoc> = {}): PhuThuoc & { dat: (s: string) => void } {
  let t = new Date(iso);
  return {
    gui: async () => ({ trang_thai: 'not_anchored', nhanh: [], ots_proof: null, loi: 'mất mạng' }),
    nangCap: async () => ({ trang_thai: 'pending' }),
    bayGio: () => t,
    dat: (s: string) => { t = new Date(s); },
    ...them,
  };
}

const CHU_A = { userId: 'u-a', companyId: CT_A, vaiTro: 'chu_so_huu', coSoId: null };
const CHU_B = { userId: 'u-b', companyId: CT_B, vaiTro: 'chu_so_huu', coSoId: null };

describe('xử lý: lập, chia sẻ, xem, thu hồi', () => {
  it('lập báo cáo khi mạng hỏng vẫn thành công (not_anchored), lịch chạy sau neo được', async () => {
    const db = duLieu();
    const pt = dongHo('2026-11-10T03:00:00Z', { gui: async () => { throw new Error('DNS'); } });
    const r = await xuLyNguoiDung(db, CHU_A, 'tao_bao_cao', { ky: '12_thang' }, pt);
    expect(r.status).toBe(200);
    expect(r.body.bao_cao.anchor_status).toBe('not_anchored');
    const dong = db.bang.bao_cao_xac_minh[0];
    expect(dong).toMatchObject({ company_id: CT_A, anchor_status: 'not_anchored', anchor_tries: 1, created_by: 'u-a' });
    expect(dong.anchor_error).toMatch(/DNS/);
    expect(dong.sha256).toBe(await bamBaoCao(dong.report_json));
    expect(dong.report_json.doanh_thu.uoc_tinh).toBe(300 * TR);
    expect(dong.report_json.loai_tru.tien_vay).toBe(80 * TR);
    expect(dong.report_json.tien_vao.so_lan_doi_phan_loai).toBe(1);
    expect(dong.report_json.pham_vi.so_tai_khoan).toBe(1);
    for (const p of PII) expect(JSON.stringify(dong.report_json)).not.toContain(p);

    // Lập lại cùng ngày, cùng dữ liệu → trả báo cáo cũ, không thêm dòng.
    const lai = await xuLyNguoiDung(db, CHU_A, 'tao_bao_cao', { ky: '12_thang' }, pt);
    expect(lai.body.da_co).toBe(true);
    expect(db.bang.bao_cao_xac_minh).toHaveLength(1);

    const sha = dong.sha256;
    const ptOk = dongHo('2026-11-10T04:00:00Z', {
      gui: async (h) => { expect(h).toBe(sha); return { trang_thai: 'pending', nhanh: [{ lich: LICH_XAC_MINH[0], phan_hoi: 'AA==' }], ots_proof: 'AA==', loi: null }; },
    });
    expect(await neoLai(db, ptOk)).toEqual([{ id: dong.id, gui: 'pending' }]);
    expect(db.bang.bao_cao_xac_minh[0]).toMatchObject({ anchor_status: 'pending', anchor_tries: 2, anchor_error: null });

    // Một giờ sau: nâng cấp lên Bitcoin.
    const ptBtc = dongHo('2026-11-10T06:00:00Z', { nangCap: async () => ({ trang_thai: 'confirmed', ots_proof: 'AQ==', khoi_bitcoin: 870001 }) });
    await neoLai(db, ptBtc);
    expect(db.bang.bao_cao_xac_minh[0]).toMatchObject({ anchor_status: 'confirmed', bitcoin_block: 870001 });
  });

  it('chia sẻ trả mã một lần, chỉ lưu mã băm; người nhận xem được báo cáo không có dữ liệu riêng tư; hết hạn; thu hồi', async () => {
    const db = duLieu();
    const pt = dongHo('2026-11-10T03:00:00Z');
    const bc = (await xuLyNguoiDung(db, CHU_A, 'tao_bao_cao', { ky: 'nam', nam: 2026 }, pt)).body.bao_cao;

    expect((await xuLyNguoiDung(db, CHU_A, 'chia_se', { report_id: bc.id, nguoi_nhan: 'Ngân hàng X', muc_dich: 'Vay vốn', so_ngay: 31 }, pt)).status).toBe(400);
    expect((await xuLyNguoiDung(db, CHU_A, 'chia_se', { report_id: bc.id, nguoi_nhan: '  ', muc_dich: 'Vay vốn' }, pt)).status).toBe(400);
    const cs = await xuLyNguoiDung(db, CHU_A, 'chia_se', { report_id: bc.id, nguoi_nhan: 'Ngân hàng <X>', muc_dich: 'Vay vốn', so_ngay: 7 }, pt);
    expect(cs.status).toBe(200);
    const token = cs.body.token as string;
    expect(laToken(token)).toBe(true);
    expect(JSON.stringify(db.bang)).not.toContain(token);
    expect(db.bang.chia_se_xac_minh[0].token_hash).toBe(await bamToken(token));
    expect(db.bang.chia_se_xac_minh[0].recipient_name).toBe('Ngân hàng X');

    const xem = await xemCongKhai(db, 'ip-1', { token }, pt);
    expect(xem.status).toBe(200);
    expect(Object.keys(xem.body).sort()).toEqual(['bao_cao', 'chia_se', 'neo', 'sha256']);
    expect(xem.body.sha256).toBe(bc.sha256);
    expect(await bamBaoCao(xem.body.bao_cao)).toBe(xem.body.sha256);
    expect(xem.body.neo.trang_thai).toBe('not_anchored');
    const chuoi = JSON.stringify(xem.body);
    for (const p of [...PII, 'g1', 'g2', 'transaction_id', 'account_number', CT_A, 'u-a', 'token_hash']) expect(chuoi).not.toContain(p);
    expect(db.bang.nhat_ky_xem_xac_minh).toEqual([expect.objectContaining({ ket_qua: 'xem', company_id: CT_A, ip_bam: 'ip-1' })]);

    const ds = await xuLyNguoiDung(db, CHU_A, 'ds', {}, pt);
    expect(ds.body.chia_se[0]).toMatchObject({ recipient_name: 'Ngân hàng X', trang_thai: 'con_han', so_lan_xem: 1 });
    expect(JSON.stringify(ds.body)).not.toContain(token);

    // Hết hạn sau 7 ngày.
    pt.dat('2026-11-17T03:00:01Z');
    const het = await xemCongKhai(db, 'ip-1', { token }, pt);
    expect(het).toMatchObject({ status: 410, body: { ma: 'HET_HAN' } });
    expect(het.body.bao_cao).toBeUndefined();

    // Thu hồi một lần chia sẻ khác.
    pt.dat('2026-11-10T05:00:00Z');
    const cs2 = await xuLyNguoiDung(db, CHU_A, 'chia_se', { report_id: bc.id, nguoi_nhan: 'Đối tác Y', muc_dich: 'Nhập hàng trả chậm' }, pt);
    expect((await xemCongKhai(db, 'ip-2', { token: cs2.body.token }, pt)).status).toBe(200);
    expect((await xuLyNguoiDung(db, CHU_A, 'thu_hoi', { share_id: cs2.body.chia_se.id }, pt)).status).toBe(200);
    expect(await xemCongKhai(db, 'ip-2', { token: cs2.body.token }, pt)).toMatchObject({ status: 410, body: { ma: 'DA_THU_HOI' } });
    expect((await xuLyNguoiDung(db, CHU_A, 'thu_hoi', { share_id: cs2.body.chia_se.id }, pt)).status).toBe(404);
    expect(db.bang.nhat_ky_xem_xac_minh.map((l) => l.ket_qua)).toEqual(['xem', 'het_han', 'xem', 'da_thu_hoi']);
  });

  it('mã sai bị đếm; dò quá nhiều lần thì bị chặn kể cả khi đoán đúng', async () => {
    const db = duLieu();
    const pt = dongHo('2026-11-10T03:00:00Z');
    const bc = (await xuLyNguoiDung(db, CHU_A, 'tao_bao_cao', {}, pt)).body.bao_cao;
    const token = (await xuLyNguoiDung(db, CHU_A, 'chia_se', { report_id: bc.id, nguoi_nhan: 'X', muc_dich: 'Y' }, pt)).body.token;
    expect((await xemCongKhai(db, 'ip-do', { token: 'abc' }, pt)).status).toBe(404);
    expect((await xemCongKhai(db, 'ip-do', { token: taoToken() }, pt)).status).toBe(404);
    for (let i = 0; i < 20; i++) await xemCongKhai(db, 'ip-do', { token: taoToken() }, pt);
    expect((await xemCongKhai(db, 'ip-do', { token }, pt)).status).toBe(429);
    expect((await xemCongKhai(db, 'ip-khac', { token }, pt)).status).toBe(200);
  });

  it('công ty khác không thấy, không chia sẻ, không thu hồi được', async () => {
    const db = duLieu();
    const pt = dongHo('2026-11-10T03:00:00Z');
    const bc = (await xuLyNguoiDung(db, CHU_A, 'tao_bao_cao', {}, pt)).body.bao_cao;
    const cs = (await xuLyNguoiDung(db, CHU_A, 'chia_se', { report_id: bc.id, nguoi_nhan: 'X', muc_dich: 'Y' }, pt)).body.chia_se;
    expect((await xuLyNguoiDung(db, CHU_B, 'chia_se', { report_id: bc.id, nguoi_nhan: 'X', muc_dich: 'Y' }, pt)).status).toBe(404);
    expect((await xuLyNguoiDung(db, CHU_B, 'thu_hoi', { share_id: cs.id }, pt)).status).toBe(404);
    expect((await xuLyNguoiDung(db, CHU_B, 'neo_lai_bao_cao', { report_id: bc.id }, pt)).status).toBe(404);
    const ds = await xuLyNguoiDung(db, CHU_B, 'ds', {}, pt);
    expect(ds.body).toMatchObject({ bao_cao: [], chia_se: [] });
    expect(db.bang.chia_se_xac_minh[0].revoked_at).toBeNull();
    // Báo cáo của B lập từ dữ liệu của B (không có giao dịch) — không lẫn số của A.
    const bcB = (await xuLyNguoiDung(db, CHU_B, 'tao_bao_cao', {}, pt)).body.bao_cao;
    expect(bcB.report_json.doanh_thu.uoc_tinh).toBe(0);
    expect(bcB.report_json.doanh_nghiep.ten).toBe('Cửa hàng B');
  });

  it('vai trò và phạm vi cơ sở: kế toán chỉ xem danh sách; người phụ trách một cơ sở bị từ chối hết', async () => {
    const db = duLieu();
    const pt = dongHo('2026-11-10T03:00:00Z');
    const bc = (await xuLyNguoiDung(db, CHU_A, 'tao_bao_cao', {}, pt)).body.bao_cao;
    const keToan = { userId: 'u-kt', companyId: CT_A, vaiTro: 'ke_toan', coSoId: null };
    expect((await xuLyNguoiDung(db, keToan, 'tao_bao_cao', {}, pt)).status).toBe(403);
    expect((await xuLyNguoiDung(db, keToan, 'chia_se', { report_id: bc.id, nguoi_nhan: 'X', muc_dich: 'Y' }, pt)).status).toBe(403);
    const ds = await xuLyNguoiDung(db, keToan, 'ds', {}, pt);
    expect(ds.status).toBe(200);
    expect(ds.body).toMatchObject({ duoc_chia_se: false, chia_se: [] });
    expect(ds.body.bao_cao).toHaveLength(1);

    const coSo = { userId: 'u-cs', companyId: CT_A, vaiTro: 'ke_toan', coSoId: 'cs-1' };
    for (const h of ['ds', 'tao_bao_cao', 'chia_se', 'thu_hoi']) {
      expect(await xuLyNguoiDung(db, coSo, h, { report_id: bc.id }, pt)).toMatchObject({ status: 403, body: { ma: 'PHAM_VI_CO_SO' } });
    }
    // Quản trị gắn cơ sở vẫn thấy cả công ty (biGioiHan).
    const quanTri = { userId: 'u-qt', companyId: CT_A, vaiTro: 'quan_tri', coSoId: 'cs-1' };
    expect((await xuLyNguoiDung(db, quanTri, 'chia_se', { report_id: bc.id, nguoi_nhan: 'X', muc_dich: 'Y' }, pt)).status).toBe(200);
  });
});
