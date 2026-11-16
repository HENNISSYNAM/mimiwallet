/**
 * Phần xử lý của edge function `gioi-thieu-ngan-hang`, tách khỏi `Deno.serve` để vitest chạy cả đường đi với CSDL giả.
 *
 * Quyền:
 *   - tin_hieu / dong_y / gui / thu_hoi / ds: CHỈ chủ sở hữu hoặc quản trị của công ty đang chọn; thành viên bị giới hạn
 *     vào một cơ sở bị từ chối (dấu hiệu là số của cả công ty). `companyId` đến từ `resolveCompanyVaiTro`, không từ thân
 *     yêu cầu — mọi truy vấn lọc theo nó, nên đồng ý / gói của công ty khác là "không tìm thấy".
 *   - tong_hop_van_phong: không nhận công ty; danh mục là các công ty người gọi làm sổ (chủ, quản trị, kế toán — giống
 *     văn phòng kế toán), loại thành viên bị giới hạn cơ sở. Chỉ trả MỨC tăng trưởng từng khách, không số tiền.
 *
 * Không có lời gọi mạng nào ra ngoài: "Gửi" chỉ đổi trạng thái và xuất gói.
 */
import { biGioiHan } from '../da-co-so/pham-vi.ts';
import { duocGoi } from '../an-ninh/gioi-han.ts';
import { laVaiTro } from '../quyen/vai-tro.ts';
import { VAI_TRO_VAN_PHONG } from '../van-phong/danh-muc.ts';
import { tinhTinHieu, THU_TU_MUC, type DauVaoTinHieu, type KetQuaTinHieu, type MucTangTruong, type Ngon } from './tin-hieu.ts';
import { khopNhuCau, laSanPhamDauTu, NHU_CAU_CO_GOI, type GoiNganHang, type NhuCau } from './khop-goi.ts';
import { deXuatHanhDong, NHAN_HEURISTIC } from './hanh-dong.ts';
import {
  bamGoi, CONG_BO_PHAN_TICH, docYeuCauDongY, dungHoSoDayDu, hanDongY, lapGoi, PHIEN_BAN_CONG_BO, TEN_TRUONG, TRUONG_CHIA_SE,
  TRUONG_MAC_DINH, trangThaiDongY, vanBanGoi, type GoiGioiThieu, type YeuCauDongY,
} from './dong-y.ts';
import { docDanhMucGoi, docDauVaoTinHieu } from './doc.ts';

// deno-lint-ignore no-explicit-any
type Db = any;
// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

export interface KetQua { status: number; body: Row }
const ok = (body: Row, status = 200): KetQua => ({ status, body });
const loi = (ma: string, cau: string, status: number): KetQua => ({ status, body: { error: cau, ma } });
const nhanh429 = (): KetQua => ({ status: 429, body: { error: 'Thao tác hơi nhanh. Đợi một chút rồi thử lại.', ma: 'QUA_NHIEU' } });

export const HANH_DONG = ['tin_hieu', 'dong_y', 'gui', 'thu_hoi', 'ds', 'tong_hop_van_phong'] as const;
export type HanhDong = (typeof HANH_DONG)[number];
export const laHanhDong = (x: unknown): x is HanhDong => (HANH_DONG as readonly string[]).includes(String(x));

export const GIOI_HAN: Record<HanhDong, { cua_so_giay: number; toi_da: number }> = {
  tin_hieu: { cua_so_giay: 60, toi_da: 10 },
  dong_y: { cua_so_giay: 3600, toi_da: 20 },
  gui: { cua_so_giay: 60, toi_da: 20 },
  thu_hoi: { cua_so_giay: 60, toi_da: 30 },
  ds: { cua_so_giay: 60, toi_da: 60 },
  tong_hop_van_phong: { cua_so_giay: 60, toi_da: 4 },
};

export const VAI_TRO_CHU = ['chu_so_huu', 'quan_tri'] as const;

export interface ThongTinCongTy { ten: string | null; ma_so_thue: string | null; tinh_thanh: string | null; nganh: string | null; la_demo: boolean }

export interface PhuThuoc {
  bayGio: () => Date;
  docDauVao: (db: Db, companyId: string, homNay: string, laDemo: boolean) => Promise<DauVaoTinHieu>;
  docGoi: (db: Db) => Promise<GoiNganHang[]>;
}
export const PHU_THUOC_THAT: PhuThuoc = { bayGio: () => new Date(), docDauVao: docDauVaoTinHieu, docGoi: docDanhMucGoi };

export const homNayVN = (d: Date) => new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
const laUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/** Cửa quyền cho các hành động trên công ty đang chọn — hàm thuần. */
export function kiemCua(vaiTro: string, coSoId: string | null | undefined): { ok: true } | { ok: false; status: 403; ma: string; cau: string } {
  if (biGioiHan(vaiTro, coSoId)) {
    return { ok: false, status: 403, ma: 'PHAM_VI_CO_SO', cau: 'Bạn đang phụ trách một cơ sở nên không xem được dấu hiệu tăng trưởng của cả công ty. Việc này dành cho chủ doanh nghiệp hoặc quản trị.' };
  }
  if (!(VAI_TRO_CHU as readonly string[]).includes(vaiTro)) {
    return { ok: false, status: 403, ma: 'KHONG_DU_QUYEN', cau: 'Chỉ chủ doanh nghiệp hoặc quản trị được xem cơ hội phát triển và đồng ý chia sẻ.' };
  }
  return { ok: true };
}

export interface NguoiGoi { userId: string; email: string | null; companyId: string; vaiTro: string; coSoId: string | null }

async function coKeToan(db: Db, companyId: string): Promise<boolean> {
  const { data, error } = await db.from('thanh_vien_cong_ty').select('company_id, vai_tro').eq('company_id', companyId).eq('vai_tro', 'ke_toan').limit(1);
  if (error) return false;
  return ((data ?? []) as Row[]).some((r) => String(r.company_id) === companyId);
}

async function docCongTy(db: Db, companyId: string): Promise<ThongTinCongTy> {
  const { data, error } = await db.from('companies').select('id, name, tax_id, province, industry, la_demo').eq('id', companyId).maybeSingle();
  if (error) throw new Error(`công ty: ${error.message}`);
  if (!data || String(data.id) !== companyId) throw new Error('công ty không khớp');
  return { ten: data.name ?? null, ma_so_thue: data.tax_id ?? null, tinh_thanh: data.province ?? null, nganh: data.industry ?? null, la_demo: data.la_demo === true };
}

interface PhanTich { th: KetQuaTinHieu; goi: GoiNganHang[]; ct: ThongTinCongTy; nhuCau: ReturnType<typeof khopNhuCau>; hanhDong: ReturnType<typeof deXuatHanhDong> }

async function phanTich(db: Db, ng: NguoiGoi, ngon: Ngon, pt: PhuThuoc): Promise<PhanTich> {
  const homNay = homNayVN(pt.bayGio());
  const ct = await docCongTy(db, ng.companyId);
  const [dv, goi, keToan] = await Promise.all([pt.docDauVao(db, ng.companyId, homNay, ct.la_demo), pt.docGoi(db), coKeToan(db, ng.companyId)]);
  const th = tinhTinHieu(dv);
  const nhuCau = khopNhuCau(th, goi, { ngon, tinh_thanh: ct.tinh_thanh });
  const hanhDong = deXuatHanhDong(nhuCau, th, { hom_nay: homNay, co_ke_toan: keToan, ngon });
  return { th, goi, ct, nhuCau, hanhDong };
}

const COT_DONG_Y = 'id, company_id, offer_id, data_scope, purpose, yeu_cau_lien_he, cong_bo_phien_ban, created_by, created_at, expires_at, revoked_at';
const COT_GIOI_THIEU = 'id, company_id, consent_id, offer_id, status, payload, payload_sha256, created_at, sent_at, withdrawn_at';

export async function xuLy(db: Db, ng: NguoiGoi, hanhDong: HanhDong, body: Row, pt: PhuThuoc = PHU_THUOC_THAT): Promise<KetQua> {
  const cua = kiemCua(ng.vaiTro, ng.coSoId);
  if (!cua.ok) { const c = cua as { ma: string; cau: string; status: number }; return loi(c.ma, c.cau, c.status); }
  const ngon: Ngon = body.ngon === 'en' ? 'en' : 'vi';
  const { companyId, userId } = ng;

  switch (hanhDong) {
    case 'tin_hieu': {
      const p = await phanTich(db, ng, ngon, pt);
      return ok({
        tin_hieu: p.th, nhu_cau: p.nhuCau, hanh_dong: p.hanhDong, ghi_chu_thu_tu: NHAN_HEURISTIC[ngon],
        cong_bo: CONG_BO_PHAN_TICH[ngon], truong_chia_se: TRUONG_CHIA_SE.map((k) => ({ ma: k, ten: TEN_TRUONG[ngon][k], mac_dinh: TRUONG_MAC_DINH.includes(k) })),
      });
    }

    case 'dong_y': {
      if (!laUuid(body.goi_id)) return loi('THAM_SO', ngon === 'vi' ? 'Thiếu gói dịch vụ.' : 'Missing product.', 400);
      const kq = docYeuCauDongY(body, ngon);
      if (!kq.ok) return loi('THAM_SO', (kq as { cau: string }).cau, 400);
      const yc = kq as { ok: true; v: YeuCauDongY };
      const p = await phanTich(db, ng, ngon, pt);
      const goi = p.goi.find((g) => g.id === body.goi_id);
      if (!goi || !goi.dang_hoat_dong || !(NHU_CAU_CO_GOI as readonly string[]).includes(goi.nhu_cau) || laSanPhamDauTu(goi)) {
        return loi('KHONG_THAY', ngon === 'vi' ? 'Không thấy gói này.' : 'Product not found.', 404);
      }
      // Chỉ đồng ý cho gói thuộc một nhu cầu MIMI đã thấy ở doanh nghiệp này — không mở "gửi cho mọi gói".
      const nhuCauKhop = p.nhuCau.find((n) => n.nhu_cau === goi.nhu_cau && n.goi.some((x) => x.id === goi.id));
      if (!nhuCauKhop) return loi('KHONG_KHOP', ngon === 'vi' ? 'Gói này không khớp nhu cầu nào MIMI thấy ở doanh nghiệp bạn lúc này.' : 'This product does not match any current need.', 409);

      const bayGio = pt.bayGio();
      const hetHan = hanDongY(bayGio, yc.v.so_ngay);
      const nhuCau: NhuCau[] = [goi.nhu_cau as NhuCau];
      const hs = dungHoSoDayDu(p.th, nhuCau, { ...p.ct, email: ng.email, dien_thoai: yc.v.dien_thoai }, ngon);
      const goiGT = lapGoi(hs, yc.v, goi, bayGio.toISOString(), hetHan, ngon);
      const maBam = await bamGoi(goiGT);

      // Thứ tự: đồng ý TRƯỚC, gói SAU — CSDL cũng bắt buộc (khoá ngoại consent_id NOT NULL cùng công ty).
      const { data: dy, error: e1 } = await db.from('dong_y_gioi_thieu').insert({
        company_id: companyId, offer_id: goi.id, data_scope: yc.v.pham_vi, purpose: goiGT.muc_dich,
        yeu_cau_lien_he: yc.v.yeu_cau_lien_he, cong_bo_phien_ban: PHIEN_BAN_CONG_BO, created_by: userId,
        expires_at: hetHan, created_at: bayGio.toISOString(),
      }).select(COT_DONG_Y).single();
      if (e1 || !dy) throw new Error(`ghi đồng ý: ${e1?.message ?? 'không có dòng'}`);
      const { data: gt, error: e2 } = await db.from('gioi_thieu_ngan_hang').insert({
        company_id: companyId, consent_id: dy.id, offer_id: goi.id, status: 'draft', payload: goiGT, payload_sha256: maBam,
        created_by: userId, created_at: bayGio.toISOString(),
      }).select(COT_GIOI_THIEU).single();
      if (e2 || !gt) throw new Error(`ghi gói giới thiệu: ${e2?.message ?? 'không có dòng'}`);
      return ok({ dong_y: dy, gioi_thieu: gt, van_ban: vanBanGoi(goiGT, ngon) });
    }

    case 'gui': {
      if (!laUuid(body.id)) return loi('THAM_SO', 'Thiếu mã gói.', 400);
      const { data: gt, error } = await db.from('gioi_thieu_ngan_hang').select(COT_GIOI_THIEU).eq('company_id', companyId).eq('id', body.id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!gt || String(gt.company_id) !== companyId) return loi('KHONG_THAY', 'Không thấy gói này trong công ty đang chọn.', 404);
      if (gt.status === 'withdrawn' || !gt.payload) return loi('DA_RUT', 'Gói đã rút lại, không gửi được.', 409);
      const { data: dy, error: e2 } = await db.from('dong_y_gioi_thieu').select(COT_DONG_Y).eq('company_id', companyId).eq('id', gt.consent_id).maybeSingle();
      if (e2) throw new Error(e2.message);
      if (!dy) return loi('KHONG_DONG_Y', 'Không thấy lời đồng ý của gói này.', 409);
      const tt = trangThaiDongY(dy, pt.bayGio());
      if (tt !== 'con_hieu_luc') return loi(tt === 'het_han' ? 'HET_HAN' : 'DA_THU_HOI', tt === 'het_han' ? 'Đồng ý đã hết hạn. Tạo đồng ý mới nếu vẫn muốn.' : 'Bạn đã rút đồng ý này.', 409);
      if ((await bamGoi(gt.payload as GoiGioiThieu)) !== gt.payload_sha256) return loi('KHONG_NGUYEN_VEN', 'Gói đã bị thay đổi sau khi lập — không gửi.', 409);
      let dong = gt;
      if (gt.status === 'draft') {
        const bayGio = pt.bayGio().toISOString();
        const { error: e3 } = await db.from('gioi_thieu_ngan_hang').update({ status: 'sent_by_owner', sent_at: bayGio, sent_by: userId })
          .eq('company_id', companyId).eq('id', gt.id).eq('status', 'draft');
        if (e3) throw new Error(e3.message);
        dong = { ...gt, status: 'sent_by_owner', sent_at: bayGio };
      }
      // Xuất gói: chủ (hoặc bộ phận vận hành MIMI theo yêu cầu của chủ) chuyển cho đúng pháp nhân ghi trên gói.
      return ok({ gioi_thieu: dong, goi: gt.payload, ma_bam: gt.payload_sha256, van_ban: vanBanGoi(gt.payload as GoiGioiThieu, ngon) });
    }

    case 'thu_hoi': {
      if (!laUuid(body.id)) return loi('THAM_SO', 'Thiếu mã đồng ý.', 400);
      const { data: dy, error } = await db.from('dong_y_gioi_thieu').select(COT_DONG_Y).eq('company_id', companyId).eq('id', body.id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!dy || String(dy.company_id) !== companyId) return loi('KHONG_THAY', 'Không thấy đồng ý này trong công ty đang chọn.', 404);
      const bayGio = pt.bayGio().toISOString();
      if (!dy.revoked_at) {
        const { error: e1 } = await db.from('dong_y_gioi_thieu').update({ revoked_at: bayGio, revoked_by: userId }).eq('company_id', companyId).eq('id', dy.id);
        if (e1) throw new Error(e1.message);
      }
      // Rút gói: xoá nội dung, giữ mã băm để đối chiếu nếu ngân hàng đã nhận bản trước đó.
      const { error: e2 } = await db.from('gioi_thieu_ngan_hang').update({ status: 'withdrawn', payload: null, withdrawn_at: bayGio })
        .eq('company_id', companyId).eq('consent_id', dy.id);
      if (e2) throw new Error(e2.message);
      return ok({
        thu_hoi: true, id: dy.id,
        luu_y: ngon === 'vi'
          ? 'Đã rút đồng ý và xoá nội dung gói trong MIMI. Nếu bạn đã gửi gói cho ngân hàng, hãy báo ngân hàng xoá bản họ đã nhận.'
          : 'Consent withdrawn and the package content deleted in MIMI. If you already sent it, ask the bank to delete their copy.',
      });
    }

    case 'ds': {
      const [dy, gt] = await Promise.all([
        db.from('dong_y_gioi_thieu').select(COT_DONG_Y).eq('company_id', companyId).order('created_at', { ascending: false }).limit(100),
        db.from('gioi_thieu_ngan_hang').select(COT_GIOI_THIEU).eq('company_id', companyId).order('created_at', { ascending: false }).limit(100),
      ]);
      if (dy.error) throw new Error(dy.error.message);
      if (gt.error) throw new Error(gt.error.message);
      const bayGio = pt.bayGio();
      return ok({
        dong_y: ((dy.data ?? []) as Row[]).filter((r) => String(r.company_id) === companyId).map((r) => ({ ...r, trang_thai: trangThaiDongY(r as { expires_at: string; revoked_at: string | null }, bayGio) })),
        gioi_thieu: ((gt.data ?? []) as Row[]).filter((r) => String(r.company_id) === companyId),
      });
    }

    default:
      return loi('THAM_SO', 'Hành động không hợp lệ.', 400);
  }
}

// ── Tổng hợp cho văn phòng kế toán ──────────────────────────────────────────

export const TOI_DA_KHACH_VP = 50;
const SONG_SONG = 3;

export interface CongTyLamSo { company_id: string; ten: string; vai_tro: string; la_demo: boolean }

/** Cùng luật thành viên với văn phòng kế toán: chủ / quản trị / kế toán, bỏ người bị giới hạn một cơ sở. Hàm thuần. */
export function locCongTyLamSo(rows: readonly Row[]): { duoc: CongTyLamSo[]; gioi_han_co_so: number; vai_tro_khong_lam_so: number } {
  const duoc: CongTyLamSo[] = [];
  const daCo = new Set<string>();
  let gioiHan = 0, khong = 0;
  for (const r of rows) {
    const ct = Array.isArray(r.companies) ? r.companies[0] : r.companies;
    if (!ct || !laVaiTro(r.vai_tro) || String(ct.id) !== String(r.company_id) || daCo.has(String(ct.id))) continue;
    daCo.add(String(ct.id));
    if (!(VAI_TRO_VAN_PHONG as readonly string[]).includes(r.vai_tro)) { khong++; continue; }
    if (biGioiHan(r.vai_tro, r.co_so_id)) { gioiHan++; continue; }
    duoc.push({ company_id: String(ct.id), ten: String(ct.name ?? '').trim() || '—', vai_tro: r.vai_tro, la_demo: ct.la_demo === true });
  }
  return { duoc, gioi_han_co_so: gioiHan, vai_tro_khong_lam_so: khong };
}

export async function tongHopVanPhong(db: Db, userId: string, pt: PhuThuoc = PHU_THUOC_THAT): Promise<KetQua> {
  if (!(await duocGoi(db, userId, [{ hanh_dong: 'gt_ngan_hang_vp', ...GIOI_HAN.tong_hop_van_phong }]))) return nhanh429();
  const { data, error } = await db.from('thanh_vien_cong_ty')
    .select('company_id, vai_tro, co_so_id, tao_luc, companies!inner(id, name, la_demo)')
    .eq('user_id', userId).order('tao_luc', { ascending: true }).limit(500);
  if (error) throw new Error(`thành viên: ${error.message}`);
  const loc = locCongTyLamSo((data ?? []) as Row[]);
  const sap = [...loc.duoc].sort((a, b) => a.ten.localeCompare(b.ten, 'vi') || (a.company_id < b.company_id ? -1 : 1));
  const tinh = sap.slice(0, TOI_DA_KHACH_VP);
  const homNay = homNayVN(pt.bayGio());
  const khach: { company_id: string; ten: string; muc: MucTangTruong | null; so_dau_hieu: number; loi: boolean }[] = new Array(tinh.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(SONG_SONG, tinh.length) }, async () => {
    while (i < tinh.length) {
      const k = i++;
      const c = tinh[k];
      try {
        const th = tinhTinHieu(await pt.docDauVao(db, c.company_id, homNay, c.la_demo));
        // Chỉ mức và số dấu hiệu — không số tiền, không tên dấu hiệu, không bằng chứng.
        khach[k] = { company_id: c.company_id, ten: c.ten, muc: th.muc, so_dau_hieu: th.tin_hieu.length, loi: false };
      } catch (e) {
        console.error('gioi-thieu tong hop:', e instanceof Error ? e.message : e);
        khach[k] = { company_id: c.company_id, ten: c.ten, muc: null, so_dau_hieu: 0, loi: true };
      }
    }
  }));
  const dem = Object.fromEntries(THU_TU_MUC.map((m) => [m, khach.filter((x) => x.muc === m).length])) as Record<MucTangTruong, number>;
  return ok({
    hom_nay: homNay, khach, dem,
    loai_tru: { gioi_han_co_so: loc.gioi_han_co_so, vai_tro_khong_lam_so: loc.vai_tro_khong_lam_so, vuot_tran: Math.max(0, sap.length - TOI_DA_KHACH_VP) },
    ghi_chu: 'Chỉ mức tăng trưởng của từng khách cho văn phòng làm sổ; không có số tiền và không chia sẻ cho ngân hàng.',
  });
}
