import { describe, expect, it } from 'vitest';
import {
  danhGiaKhach, docDanhMucKhach, dongTien30Ngay, phanCongAgent, soSanhKhach, type KhachVanPhong,
} from './danh-muc';
import { docSoLieuDoanhThu } from '../doanh-thu/so-lieu';
import { docLichCongTy } from '../luat/doc-lich-thue';
import { mocKeTiep } from '../luat/lich-thue';

/**
 * Văn phòng kế toán — nghiệm thu backend:
 *   - số của từng khách KHỚP đúng nguồn chung (doanh thu, tiền chờ xác nhận, lịch thuế), không tính kiểu khác;
 *   - chỉ chủ / quản trị / kế toán; kế toán bị giới hạn một cơ sở bị loại hẳn (không số một phần);
 *   - không bao giờ đọc hay trả số của công ty người gọi không thuộc về, kể cả khi truy vấn trả dòng lạ;
 *   - xếp "cần làm trước", phân trang, và agent đi tới đúng bàn theo hoạt động thật.
 */

type Row = Record<string, unknown>;
type Bang = Record<string, Row[]>;

interface NhatKy { bang: string; loc: [string, string, unknown][] }

/**
 * CSDL giả chung: chạy được đúng chuỗi select/eq/in/gte/lte/is/order/range/limit/maybeSingle/then mà các hàm thật dùng.
 * Ghi lại mọi truy vấn và bộ lọc để test kiểm "không đụng công ty khác". `boQuaIn`: giả một truy vấn hỏng trả dòng của
 * mọi công ty — hàm thật vẫn phải bỏ dòng lạ.
 */
function dbGia(du: Bang, o: { boQuaIn?: boolean; thieuBang?: string[] } = {}) {
  const nhatKy: NhatKy[] = [];
  const db = {
    nhatKy,
    rpc: () => Promise.resolve({ data: true, error: null }),
    from(bang: string) {
      const loc: [string, string, unknown][] = [];
      const sapXep: [string, boolean][] = [];
      let tu = 0, den = Infinity;
      nhatKy.push({ bang, loc });
      const nguon = (): Row[] => {
        const ds = (du[bang] ?? []).map((r) => ({ ...r }));
        if (bang === 'thanh_vien_cong_ty') {
          return ds.map((r) => ({ ...r, companies: (du.companies ?? []).find((c) => c.id === r.company_id) ?? null }))
            .filter((r) => r.companies);
        }
        return ds;
      };
      const ketQua = () => {
        if (o.thieuBang?.includes(bang)) return { data: null, error: { code: 'PGRST205', message: `Could not find the table 'public.${bang}'` } };
        let ds = nguon().filter((r) => loc.every(([op, k, v]) => {
          const x = r[k];
          switch (op) {
            case 'eq': return x === v;
            case 'is': return (x ?? null) === v;
            case 'in': return o.boQuaIn || (v as unknown[]).includes(x);
            case 'gte': return String(x) >= String(v);
            case 'lte': return String(x) <= String(v);
            default: return true;
          }
        }));
        for (const [k, tang] of [...sapXep].reverse()) {
          ds = [...ds].sort((a, b) => (String(a[k]) < String(b[k]) ? -1 : String(a[k]) > String(b[k]) ? 1 : 0) * (tang ? 1 : -1));
        }
        return { data: ds.slice(tu, den === Infinity ? undefined : den + 1), error: null };
      };
      const p: Record<string, unknown> = {};
      const them = (op: string) => (k: string, v: unknown) => { loc.push([op, k, v]); return p; };
      Object.assign(p, {
        select: () => p,
        eq: them('eq'), is: them('is'), in: them('in'), gte: them('gte'), lte: them('lte'),
        order: (k: string, x?: { ascending?: boolean }) => { sapXep.push([k, x?.ascending !== false]); return p; },
        range: (a: number, b: number) => { tu = a; den = b; return p; },
        limit: (n: number) => { den = tu + n - 1; return p; },
        maybeSingle: () => { const r = ketQua(); return Promise.resolve({ data: r.error ? null : (r.data?.[0] ?? null), error: r.error }); },
        then: (f: (v: unknown) => unknown, g?: (e: unknown) => unknown) => Promise.resolve(ketQua()).then(f, g),
      });
      return p;
    },
  };
  return db;
}

// 11/11/2026 10:00 giờ Việt Nam.
const BAY_GIO = Date.parse('2026-11-11T03:00:00Z');
const GIO_TRUOC = (h: number) => new Date(BAY_GIO - h * 3_600_000).toISOString();

const gd = (id: string, company_id: string, amount: number, type: 'income' | 'expense', ngay: string): Row => ({
  id, company_id, amount, type, transaction_date: ngay, account_number: '111', counter_account_number: null,
  is_synthetic: false, merchant_name: null, counter_account_name: null, payment_reference: null,
});

function duLieu(): Bang {
  return {
    companies: [
      { id: 'c-an', name: 'Tiệm An', la_demo: false },
      { id: 'c-binh', name: 'Quán Bình', la_demo: false },
      { id: 'c-cuong', name: 'Cửa hàng Cường', la_demo: false },
      { id: 'c-co-so', name: 'Chuỗi Dung (cơ sở 2)', la_demo: false },
      { id: 'c-xem', name: 'Công ty chỉ được xem', la_demo: false },
      { id: 'c-la', name: 'Công ty người khác', la_demo: false },
    ],
    thanh_vien_cong_ty: [
      { company_id: 'c-an', user_id: 'u-kt', vai_tro: 'ke_toan', co_so_id: null, tao_luc: '2026-01-01' },
      { company_id: 'c-binh', user_id: 'u-kt', vai_tro: 'quan_tri', co_so_id: null, tao_luc: '2026-01-02' },
      { company_id: 'c-cuong', user_id: 'u-kt', vai_tro: 'chu_so_huu', co_so_id: null, tao_luc: '2026-01-03' },
      // Kế toán được giao một cơ sở: loại hẳn khỏi văn phòng.
      { company_id: 'c-co-so', user_id: 'u-kt', vai_tro: 'ke_toan', co_so_id: 'cs-2', tao_luc: '2026-01-04' },
      { company_id: 'c-xem', user_id: 'u-kt', vai_tro: 'nguoi_xem', co_so_id: null, tao_luc: '2026-01-05' },
      { company_id: 'c-la', user_id: 'u-khac', vai_tro: 'chu_so_huu', co_so_id: null, tao_luc: '2026-01-01' },
    ],
    transactions: [
      // Tiệm An: 1,05 tỷ tiền vào, 100 triệu chưa ai xác nhận → khoảng [950tr; 1,05 tỷ] cắt ngưỡng 01 tỷ.
      gd('t-an-1', 'c-an', 950_000_000, 'income', '2026-03-10'),
      gd('t-an-2', 'c-an', 100_000_000, 'income', '2026-10-20'),
      // Quán Bình: 40 triệu vào (đã xác nhận), 60 triệu ra trong 30 ngày qua → dòng tiền âm.
      gd('t-binh-1', 'c-binh', 40_000_000, 'income', '2026-11-01'),
      gd('t-binh-2', 'c-binh', 60_000_000, 'expense', '2026-11-05'),
      // Cửa hàng Cường: 10 triệu vào, đã xác nhận là doanh thu.
      gd('t-cuong-1', 'c-cuong', 10_000_000, 'income', '2026-06-01'),
      // Công ty người khác và công ty cơ sở: không bao giờ được đọc.
      gd('t-la-1', 'c-la', 5_000_000_000, 'income', '2026-05-01'),
      gd('t-cs-1', 'c-co-so', 3_000_000_000, 'income', '2026-05-01'),
    ],
    revenue_classifications: [
      { company_id: 'c-an', transaction_id: 't-an-1', revenue_effect: 'include', confirmed_type: 'doanh_thu' },
      { company_id: 'c-binh', transaction_id: 't-binh-1', revenue_effect: 'include', confirmed_type: 'doanh_thu' },
      { company_id: 'c-cuong', transaction_id: 't-cuong-1', revenue_effect: 'include', confirmed_type: 'doanh_thu' },
    ],
    ho_so_viec: [
      { id: 'v1', company_id: 'c-cuong', trang_thai: 'mo', muc_do: 'chan' },
      { id: 'v2', company_id: 'c-binh', trang_thai: 'dang_xu_ly', muc_do: 'binh_thuong' },
      { id: 'v3', company_id: 'c-binh', trang_thai: 'da_giai_quyet', muc_do: 'gap' },
      { id: 'v4', company_id: 'c-la', trang_thai: 'mo', muc_do: 'chan' },
    ],
    nhiem_vu_agent: [
      { id: 'n1', company_id: 'c-cuong', agent: 'thue', trang_thai: 'xong', cap_nhat_luc: GIO_TRUOC(2) },
      { id: 'n2', company_id: 'c-an', agent: 'thue', trang_thai: 'xong', cap_nhat_luc: GIO_TRUOC(30) },
      { id: 'n3', company_id: 'c-la', agent: 'tai_chinh', trang_thai: 'dang_chay', cap_nhat_luc: GIO_TRUOC(1) },
    ],
    thong_bao: [
      { id: 'tb1', company_id: 'c-an', user_id: 'u-kt', loai: 'tien_vao', tao_luc: GIO_TRUOC(3) },
      { id: 'tb2', company_id: 'c-binh', user_id: 'u-khac', loai: 'tien_vao', tao_luc: GIO_TRUOC(1) },
    ],
    revenue_classification_events: [
      { id: 1, company_id: 'c-binh', at: GIO_TRUOC(5) },
      { id: 2, company_id: 'c-la', at: GIO_TRUOC(1) },
    ],
    ban_hang_pos: [
      { id: 'p1', company_id: 'c-binh', amount: 45_000, status: 'paid', sold_at: '2026-11-11T01:00:00Z' },
      { id: 'p2', company_id: 'c-binh', amount: 30_000, status: 'paid', sold_at: '2026-11-11T02:00:00Z' },
      { id: 'p3', company_id: 'c-binh', amount: 99_000, status: 'pending', sold_at: '2026-11-11T02:30:00Z' },
      // Hôm qua theo giờ Việt Nam (23:00 ngày 10/11) — không tính vào hôm nay.
      { id: 'p4', company_id: 'c-binh', amount: 70_000, status: 'paid', sold_at: '2026-11-10T16:00:00Z' },
    ],
  };
}

const ids = (ds: { id: string }[]) => ds.map((k) => k.id);

describe('danh mục khách của văn phòng kế toán', () => {
  it('chỉ công ty mình làm sổ (chủ, quản trị, kế toán); loại kế toán một cơ sở và người xem, có đếm', async () => {
    const kq = await docDanhMucKhach(dbGia(duLieu()), 'u-kt', { bayGio: BAY_GIO });
    expect(ids(kq.khach).sort()).toEqual(['c-an', 'c-binh', 'c-cuong']);
    expect(kq.loai_tru).toEqual({ gioi_han_co_so: 1, vai_tro_khong_lam_so: 1, vuot_tran: 0 });
    expect(kq.hom_nay).toBe('2026-11-11');
  });

  it('không đọc bất kỳ dòng nào của công ty không thuộc về hay của cơ sở bị giới hạn', async () => {
    const db = dbGia(duLieu());
    const kq = await docDanhMucKhach(db, 'u-kt', { bayGio: BAY_GIO });
    const cam = new Set(['c-la', 'c-co-so', 'c-xem']);
    for (const q of db.nhatKy) {
      if (q.bang === 'thanh_vien_cong_ty') {
        // Bước kiểm thành viên: lọc theo chính người gọi.
        expect(q.loc).toContainEqual(['eq', 'user_id', 'u-kt']);
        continue;
      }
      const theoCty = q.loc.filter(([, k]) => k === 'company_id' || (q.bang === 'companies' && k === 'id'));
      expect(theoCty.length, `${q.bang} phải lọc theo công ty`).toBeGreaterThan(0);
      for (const [op, , v] of theoCty) {
        const ds = op === 'in' ? (v as string[]) : [v as string];
        for (const x of ds) expect(cam.has(x), `${q.bang} đụng ${x}`).toBe(false);
      }
    }
    expect(JSON.stringify(kq)).not.toMatch(/c-la|c-co-so|c-xem/);
  });

  it('truy vấn hỏng trả dòng của công ty khác: dòng lạ bị bỏ, không lọt vào số hay agent', async () => {
    const kq = await docDanhMucKhach(dbGia(duLieu(), { boQuaIn: true }), 'u-kt', { bayGio: BAY_GIO });
    const cuong = kq.khach.find((k) => k.id === 'c-cuong')!;
    expect(cuong.viec_mo).toEqual({ so: 1, chan: 1, gap: 0 });
    expect(JSON.stringify(kq)).not.toMatch(/c-la|c-co-so/);
    // Agent dự báo không chạy sang công ty lạ dù nhiệm vụ "tai_chinh" của nó mới nhất.
    expect(kq.agent.find((a) => a.agent === 'du_bao')?.company_id).not.toBe('c-la');
  });

  it('người không làm sổ ở đâu thì danh mục rỗng, không lỗi', async () => {
    const kq = await docDanhMucKhach(dbGia(duLieu()), 'u-khong-ai', { bayGio: BAY_GIO });
    expect(kq.khach).toEqual([]);
    expect(kq.tong).toBe(0);
    expect(kq.agent.every((a) => a.company_id === null)).toBe(true);
  });

  it('số của từng khách khớp đúng nguồn chung: doanh thu, tiền chờ xác nhận, sẵn sàng thuế, hạn kế tiếp', async () => {
    const du = duLieu();
    const kq = await docDanhMucKhach(dbGia(du), 'u-kt', { bayGio: BAY_GIO });
    for (const id of ['c-an', 'c-binh', 'c-cuong']) {
      const s = await docSoLieuDoanhThu(dbGia(du), id, 2026, false);
      const lich = await docLichCongTy(dbGia(du), id, { nam: 2026, homNay: '2026-11-11', laDemo: false, s });
      const k = kq.khach.find((x) => x.id === id)!;
      expect(k.doanh_thu?.uoc_tinh).toBe(Number(s.do_chac_chan.gia_tri));
      expect(k.doanh_thu?.can_duoi).toBe(Number(s.do_chac_chan.can_duoi));
      expect(k.doanh_thu?.can_tren).toBe(Number(s.do_chac_chan.can_tren));
      expect(k.tien_vao_cho_xac_nhan).toEqual({ so_khoan: s.so_chua_ro, so_tien: Math.round(s.chua_ro) });
      expect(k.thue?.trang_thai).toBe(lich.sanSang.trang_thai);
      expect(k.thue?.moc_ke_tiep?.han ?? null).toBe(mocKeTiep(lich.lich)?.han ?? null);
    }
    const an = kq.khach.find((x) => x.id === 'c-an')!;
    expect(an.doanh_thu?.uoc_tinh).toBe(1_050_000_000);
    expect(an.tien_vao_cho_xac_nhan).toEqual({ so_khoan: 1, so_tien: 100_000_000 });
  });

  it('khoảng doanh thu cắt ngưỡng 01 tỷ → "cần xem" và đèn đỏ; khách bình yên → xanh', async () => {
    const kq = await docDanhMucKhach(dbGia(duLieu()), 'u-kt', { bayGio: BAY_GIO });
    const an = kq.khach.find((x) => x.id === 'c-an')!;
    expect(an.doanh_thu?.can_xem).toBe(true);
    expect(an.muc).toBe('do');
    expect(an.ly_do.map((l) => l.ma)).toContain('nguong_chua_chac');
    expect(an.ly_do.find((l) => l.ma === 'nguong_chua_chac')?.nguong).toBe(1_000_000_000);
  });

  it('bán tại quầy: chỉ lần đã thu của HÔM NAY giờ Việt Nam; bảng chưa có thì nói chưa có, không báo 0', async () => {
    const kq = await docDanhMucKhach(dbGia(duLieu()), 'u-kt', { bayGio: BAY_GIO });
    const binh = kq.khach.find((x) => x.id === 'c-binh')!;
    expect(binh.ban_hang_hom_nay).toMatchObject({ so_lan: 2, tong: 75_000 });
    expect(kq.co_bang_ban_hang).toBe(true);

    const thieu = await docDanhMucKhach(dbGia(duLieu(), { thieuBang: ['ban_hang_pos'] }), 'u-kt', { bayGio: BAY_GIO });
    expect(thieu.co_bang_ban_hang).toBe(false);
    expect(thieu.khach.every((k) => k.ban_hang_hom_nay === null)).toBe(true);
  });

  it('dòng tiền 30 ngày âm và hồ sơ việc mở làm đèn vàng; việc "chặn" làm đèn đỏ', async () => {
    const kq = await docDanhMucKhach(dbGia(duLieu()), 'u-kt', { bayGio: BAY_GIO });
    const binh = kq.khach.find((x) => x.id === 'c-binh')!;
    expect(binh.dong_tien_30_ngay).toMatchObject({ tien_vao: 40_000_000, tien_ra: 60_000_000, rong: -20_000_000 });
    expect(binh.viec_mo).toEqual({ so: 1, chan: 0, gap: 0 });
    expect(binh.ly_do.map((l) => l.ma)).toEqual(expect.arrayContaining(['dong_tien_am_30_ngay', 'viec_mo']));
    const cuong = kq.khach.find((x) => x.id === 'c-cuong')!;
    expect(cuong.muc).toBe('do');
    expect(cuong.ly_do[0].ma).toBe('viec_chan');
  });

  it('hoạt động 24 giờ: chỉ sự kiện trong 24 giờ, thông báo chỉ của chính người gọi', async () => {
    const kq = await docDanhMucKhach(dbGia(duLieu()), 'u-kt', { bayGio: BAY_GIO });
    const an = kq.khach.find((x) => x.id === 'c-an')!;
    expect(an.hoat_dong_24h.nhiem_vu).toEqual([]); // nhiệm vụ 30 giờ trước không tính
    expect(an.hoat_dong_24h.thong_bao).toBe(1);
    const binh = kq.khach.find((x) => x.id === 'c-binh')!;
    expect(binh.hoat_dong_24h.thong_bao).toBe(0); // thông báo của người khác
    expect(binh.hoat_dong_24h.phan_loai).toBe(1);
  });

  it('agent đi tới bàn theo hoạt động thật; không có thì tới khách có việc chờ', async () => {
    const kq = await docDanhMucKhach(dbGia(duLieu()), 'u-kt', { bayGio: BAY_GIO });
    const o = Object.fromEntries(kq.agent.map((a) => [a.agent, a]));
    // Thông báo tiền vào ở Tiệm An (3 giờ trước) mới hơn lần phân loại ở Quán Bình (5 giờ trước).
    expect(o.phan_loai).toMatchObject({ company_id: 'c-an', ly_do: 'su_kien_24h' });
    expect(o.thue).toMatchObject({ company_id: 'c-cuong', ly_do: 'su_kien_24h' });
    expect(o.ban_hang).toMatchObject({ company_id: 'c-binh', ly_do: 'su_kien_24h', so: 2 });
    // Không có nhiệm vụ tài chính nào của khách mình: dự báo đứng ở khách dòng tiền âm.
    expect(o.du_bao).toMatchObject({ company_id: 'c-binh', ly_do: 'viec_cho' });
    expect(o.tai_lieu).toMatchObject({ company_id: 'c-cuong', ly_do: 'viec_cho' });
  });

  it('xếp cần làm trước và phân trang trên danh sách đã xếp', async () => {
    const kq = await docDanhMucKhach(dbGia(duLieu()), 'u-kt', { bayGio: BAY_GIO });
    const hang = { do: 0, vang: 1, xanh: 2 };
    for (let i = 1; i < kq.khach.length; i++) expect(hang[kq.khach[i - 1].muc]).toBeLessThanOrEqual(hang[kq.khach[i].muc]);
    expect(kq.dem.do + kq.dem.vang + kq.dem.xanh).toBe(3);

    const t1 = await docDanhMucKhach(dbGia(duLieu()), 'u-kt', { bayGio: BAY_GIO, kichThuoc: 2, trang: 1 });
    const t2 = await docDanhMucKhach(dbGia(duLieu()), 'u-kt', { bayGio: BAY_GIO, kichThuoc: 2, trang: 2 });
    expect(t1.so_trang).toBe(2);
    expect([...ids(t1.khach), ...ids(t2.khach)]).toEqual(ids(kq.khach));
    // Trang vượt quá → trang cuối, không rỗng.
    const t9 = await docDanhMucKhach(dbGia(duLieu()), 'u-kt', { bayGio: BAY_GIO, kichThuoc: 2, trang: 9 });
    expect(t9.trang).toBe(2);
    // Kích thước bị chặn trên.
    const lon = await docDanhMucKhach(dbGia(duLieu()), 'u-kt', { bayGio: BAY_GIO, kichThuoc: 10_000 });
    expect(lon.kich_thuoc).toBe(50);
  });

  it('một khách đọc lỗi: khách đó "không đọc được", các khách khác vẫn đủ số', async () => {
    const du = duLieu();
    const db = dbGia(du);
    const goc = db.from.bind(db);
    db.from = (bang: string) => {
      const q = goc(bang) as Record<string, (...a: unknown[]) => unknown>;
      if (bang !== 'transactions') return q;
      const eq = q.eq;
      q.eq = (k: unknown, v: unknown) => {
        if (k === 'company_id' && v === 'c-cuong') throw new Error('mất kết nối');
        return eq(k, v);
      };
      return q;
    };
    const kq = await docDanhMucKhach(db, 'u-kt', { bayGio: BAY_GIO });
    const cuong = kq.khach.find((x) => x.id === 'c-cuong')!;
    expect(cuong.loi).toBe('khong_doc_duoc');
    expect(cuong.doanh_thu).toBeNull();
    expect(kq.khach.find((x) => x.id === 'c-an')?.doanh_thu?.uoc_tinh).toBe(1_050_000_000);
  });
});

// ── Hàm thuần ───────────────────────────────────────────────────────────────

const khachMau = (o: Partial<KhachVanPhong> = {}): Omit<KhachVanPhong, 'muc' | 'ly_do'> => ({
  id: 'k', ten: 'K', vai_tro: 'ke_toan', la_demo: false,
  doanh_thu: null, tien_vao_cho_xac_nhan: null, thue: null,
  viec_mo: { so: 0, chan: 0, gap: 0 }, ban_hang_hom_nay: null, dong_tien_30_ngay: null,
  hoat_dong_24h: { phan_loai: 0, thong_bao: 0, nhiem_vu: [], gan_nhat: null }, loi: null, ...o,
});
const thue = (con_lai: number | null, trang_thai: NonNullable<KhachVanPhong['thue']>['trang_thai']) => ({
  trang_thai, ten_viec: 'Tờ khai quý', han: con_lai === null ? null : '2026-11-15', con_lai,
  moc_ke_tiep: con_lai === null ? null : { ten: 'Tờ khai quý', loai: 'khai_va_nop' as const, han: '2026-11-15', con_lai },
});

describe('đèn của một khách', () => {
  it('hạn trong 7 ngày mà chưa sẵn sàng → đỏ; đã sẵn sàng thì chỉ nhắc, vẫn xanh', () => {
    expect(danhGiaKhach(khachMau({ thue: thue(4, 'thieu_du_lieu') })).muc).toBe('do');
    const ok = danhGiaKhach(khachMau({ thue: thue(4, 'san_sang') }));
    expect(ok.muc).toBe('xanh');
    expect(ok.ly_do.map((l) => l.ma)).toEqual(['han_trong_30_ngay']);
  });
  it('hạn 20 ngày, chưa sẵn sàng → vàng; không có gì → xanh', () => {
    expect(danhGiaKhach(khachMau({ thue: thue(20, 'can_xac_minh') })).muc).toBe('vang');
    expect(danhGiaKhach(khachMau()).muc).toBe('xanh');
  });
  it('đã chắc chắn vượt 01 tỷ không phải rủi ro, chỉ là thông tin', () => {
    const r = danhGiaKhach(khachMau({ doanh_thu: { nam: 2026, uoc_tinh: 2e9, can_duoi: 1.9e9, can_tren: 2e9, trang_thai: 'chac', can_xem: false, nguong: [{ ma: 'mien_thue_1_ty', gia_tri: 1e9, phia: 'tren' }] } }));
    expect(r).toEqual({ muc: 'xanh', ly_do: [{ ma: 'da_vuot_nguong', muc: 'xanh', nguong: 1e9 }] });
  });
  it('lý do nặng đứng trước', () => {
    const r = danhGiaKhach(khachMau({ tien_vao_cho_xac_nhan: { so_khoan: 3, so_tien: 1 }, viec_mo: { so: 1, chan: 1, gap: 0 } }));
    expect(r.ly_do.map((l) => l.muc)).toEqual(['do', 'vang']);
  });
});

describe('so sánh và phân công', () => {
  const k = (id: string, ten: string, o: Partial<KhachVanPhong> = {}): KhachVanPhong => {
    const g = khachMau({ id, ten, ...o });
    return { ...g, ...danhGiaKhach(g) };
  };
  it('cùng màu: hạn gần trước, rồi tên', () => {
    const ds = [k('3', 'C', { thue: thue(25, 'can_xac_minh') }), k('2', 'B', { thue: thue(12, 'can_xac_minh') }), k('1', 'A'), k('4', 'Ă')];
    expect(ds.sort(soSanhKhach).map((x) => x.id)).toEqual(['2', '3', '1', '4']);
  });
  it('sự kiện mới nhất thắng; hoà giờ thì theo mã công ty', () => {
    const ds = [k('a', 'A'), k('b', 'B')];
    const r = phanCongAgent(ds, [
      { agent: 'thue', company_id: 'b', luc: '2026-11-11T01:00:00Z' },
      { agent: 'thue', company_id: 'a', luc: '2026-11-11T01:00:00Z' },
    ]);
    expect(r.find((x) => x.agent === 'thue')?.company_id).toBe('a');
  });
  it('dòng tiền 30 ngày bỏ chuyển nội bộ và giao dịch ngoài cửa sổ', () => {
    const r = dongTien30Ngay([
      { id: '1', amount: 100, type: 'income', transaction_date: '2026-11-10' },
      { id: '2', amount: 50, type: 'expense', transaction_date: '2026-11-09' },
      { id: '3', amount: 999, type: 'income', transaction_date: '2026-09-01' },
      { id: '4', amount: 70, type: 'expense', transaction_date: '2026-11-08' },
    ], new Set(['4']), '2026-11-11');
    expect(r).toEqual({ tu: '2026-10-13', tien_vao: 100, tien_ra: 50, rong: 50 });
    // Đầu năm: cửa sổ không lùi sang năm trước (dữ liệu đọc theo năm).
    expect(dongTien30Ngay([], new Set(), '2026-01-05').tu).toBe('2026-01-01');
  });
});
