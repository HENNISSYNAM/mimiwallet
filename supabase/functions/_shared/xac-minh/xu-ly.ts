/**
 * Phần xử lý của edge function `doanh-thu-xac-minh`, tách khỏi `Deno.serve` để vitest chạy được cả đường đi với
 * CSDL giả: quyền, phạm vi cơ sở, công ty khác, mã chia sẻ, hết hạn, thu hồi, neo hỏng mạng.
 *
 * Mọi truy vấn đều lọc theo `companyId` lấy từ `resolveCompanyVaiTro` (thành viên thật), không theo id gửi lên —
 * báo cáo / chia sẻ của công ty khác là "không tìm thấy".
 */
import { biGioiHan } from '../da-co-so/pham-vi.ts';
import { daBiKhoaViSai, duocGoi, ghiLanSai } from '../an-ninh/gioi-han.ts';
import { ky12Thang, kyTheoNam } from './bao-cao.ts';
import { bamBaoCao } from './chuan-hoa.ts';
import { dungBaoCao } from './doc.ts';
import { guiNeo, nangCapNeo, type KetQuaGuiNeo, type KetQuaNangCap, type NhanhNeo } from './neo.ts';
import { bamToken, duocChiaSe, goiCongKhai, hanChiaSe, lamSachChu, laToken, taoToken, trangThaiChiaSe } from './chia-se.ts';

// deno-lint-ignore no-explicit-any
type Db = any;
// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

export interface KetQua { status: number; body: Row }
const ok = (body: Row, status = 200): KetQua => ({ status, body });
const loi = (ma: string, cau: string, status: number): KetQua => ({ status, body: { error: cau, ma } });
const nhanh429 = (): KetQua => ({ status: 429, body: { error: 'Thao tác hơi nhanh. Đợi một chút rồi thử lại.', ma: 'QUA_NHIEU' } });

export interface PhuThuoc {
  gui: (sha256: string) => Promise<KetQuaGuiNeo>;
  nangCap: (sha256: string, nhanh: NhanhNeo[]) => Promise<KetQuaNangCap>;
  bayGio: () => Date;
}
export const PHU_THUOC_THAT: PhuThuoc = { gui: (h) => guiNeo(h), nangCap: (h, n) => nangCapNeo(h, n), bayGio: () => new Date() };

export const LAN_THU_TOI_DA = 48;
export const KHONG_MO_DUOC = 'Đường dẫn không đúng hoặc không còn dùng được. Hỏi lại chủ hộ đã gửi cho bạn.';
const COT_BAO_CAO = 'id, ky_loai, tu_ngay, den_ngay, report_json, sha256, anchor_status, anchored_at, confirmed_at, bitcoin_block, created_at';
const laUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);
export const homNayVN = (d: Date) => new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);

/** Gửi mã băm của một báo cáo tới lịch. Lỗi mạng (kể cả hàm gửi ném lỗi) chỉ để lại `not_anchored`. */
export async function neoBaoCao(db: Db, r: Row, pt: PhuThuoc = PHU_THUOC_THAT): Promise<string> {
  let kq: KetQuaGuiNeo;
  try {
    kq = await pt.gui(r.sha256);
  } catch (e) {
    kq = { trang_thai: 'not_anchored', nhanh: [], ots_proof: null, loi: e instanceof Error ? e.message : 'lỗi' };
  }
  const bayGio = pt.bayGio().toISOString();
  const lan = (r.anchor_tries ?? 0) + 1;
  const { error } = await db.from('bao_cao_xac_minh').update(kq.trang_thai === 'pending'
    ? { anchor_status: 'pending', ots_proof: kq.ots_proof, ots_nhanh: kq.nhanh, anchor_error: null, anchored_at: bayGio, anchor_tries: lan, updated_at: bayGio }
    : { anchor_status: 'not_anchored', anchor_error: kq.loi, anchor_tries: lan, updated_at: bayGio }).eq('id', r.id);
  if (error) console.error('xac-minh cập nhật neo:', error.message);
  return kq.trang_thai;
}

/** Lịch chạy hằng giờ: gửi lại báo cáo chưa neo, nâng cấp báo cáo đang chờ Bitcoin. */
export async function neoLai(db: Db, pt: PhuThuoc = PHU_THUOC_THAT): Promise<Row[]> {
  const ketQua: Row[] = [];
  const { data: chua, error: e1 } = await db.from('bao_cao_xac_minh').select('id, sha256, anchor_tries')
    .eq('anchor_status', 'not_anchored').lt('anchor_tries', LAN_THU_TOI_DA).order('created_at', { ascending: true }).limit(50);
  if (e1) throw e1;
  for (const r of chua ?? []) ketQua.push({ id: r.id, gui: await neoBaoCao(db, r, pt) });

  const { data: cho, error: e2 } = await db.from('bao_cao_xac_minh').select('id, sha256, ots_nhanh')
    .eq('anchor_status', 'pending').lt('anchored_at', new Date(pt.bayGio().getTime() - 3_600_000).toISOString())
    .order('anchored_at', { ascending: true }).limit(100);
  if (e2) throw e2;
  for (const r of cho ?? []) {
    const kq = await pt.nangCap(r.sha256, (r.ots_nhanh ?? []) as NhanhNeo[]);
    const bayGio = pt.bayGio().toISOString();
    const du = kq.trang_thai === 'confirmed'
      ? { anchor_status: 'confirmed', ots_proof: kq.ots_proof, bitcoin_block: kq.khoi_bitcoin, confirmed_at: bayGio, anchor_error: null, updated_at: bayGio }
      : kq.trang_thai === 'failed'
        ? { anchor_status: 'failed', anchor_error: kq.loi ?? null, updated_at: bayGio }
        : { anchor_error: kq.loi ?? null, updated_at: bayGio };
    const { error } = await db.from('bao_cao_xac_minh').update(du).eq('id', r.id);
    if (error) console.error('xac-minh nâng cấp:', error.message);
    ketQua.push({ id: r.id, nang_cap: kq.trang_thai });
  }
  return ketQua;
}

/** Người nhận mở đường dẫn. `khoaIp` = IP đã băm (`idTuIp`). */
export async function xemCongKhai(db: Db, khoaIp: string, body: Row, pt: PhuThuoc = PHU_THUOC_THAT): Promise<KetQua> {
  if (await daBiKhoaViSai(db, khoaIp, 'xm_sai_ma')) return nhanh429();
  if (!(await duocGoi(db, khoaIp, [{ hanh_dong: 'xm_xem', cua_so_giay: 600, toi_da: 60 }]))) return nhanh429();

  const token = body.token;
  if (!laToken(token)) { await ghiLanSai(db, khoaIp, 'xm_sai_ma'); return loi('KHONG_TIM_THAY', KHONG_MO_DUOC, 404); }
  const { data: cs, error } = await db.from('chia_se_xac_minh')
    .select('id, report_id, company_id, recipient_name, purpose, expires_at, revoked_at')
    .eq('token_hash', await bamToken(token)).maybeSingle();
  if (error) throw error;
  if (!cs) { await ghiLanSai(db, khoaIp, 'xm_sai_ma'); return loi('KHONG_TIM_THAY', KHONG_MO_DUOC, 404); }

  const tt = trangThaiChiaSe(cs, pt.bayGio());
  const { error: loiGhi } = await db.from('nhat_ky_xem_xac_minh').insert({
    share_id: cs.id, report_id: cs.report_id, company_id: cs.company_id, ket_qua: tt === 'con_han' ? 'xem' : tt, ip_bam: khoaIp,
  });
  if (loiGhi) console.error('xac-minh ghi nhật ký xem:', loiGhi.message);
  if (tt !== 'con_han') return loi(tt === 'het_han' ? 'HET_HAN' : 'DA_THU_HOI', KHONG_MO_DUOC, 410);

  const { data: bc, error: loiBc } = await db.from('bao_cao_xac_minh')
    .select('report_json, sha256, anchor_status, ots_proof, anchored_at, confirmed_at, bitcoin_block')
    .eq('id', cs.report_id).eq('company_id', cs.company_id).maybeSingle();
  if (loiBc) throw loiBc;
  if (!bc) return loi('KHONG_TIM_THAY', KHONG_MO_DUOC, 404);
  return ok(goiCongKhai(bc, cs));
}

export interface NguoiGoi { userId: string; companyId: string; vaiTro: string; coSoId: string | null }

export async function xuLyNguoiDung(db: Db, ng: NguoiGoi, hanhDong: string, body: Row, pt: PhuThuoc = PHU_THUOC_THAT): Promise<KetQua> {
  const { userId, companyId } = ng;
  // Kế toán / người xem phụ trách một cơ sở không xem được doanh thu cả công ty.
  if (biGioiHan(ng.vaiTro, ng.coSoId)) {
    return loi('PHAM_VI_CO_SO', 'Bạn đang phụ trách một cơ sở, nên không lập hay xem báo cáo doanh thu của cả công ty.', 403);
  }
  const quanLy = duocChiaSe(ng.vaiTro);
  const chiQuanLy = () => loi('KHONG_DU_QUYEN', 'Chỉ chủ doanh nghiệp hoặc quản trị được lập và chia sẻ báo cáo doanh thu.', 403);

  switch (hanhDong) {
    case 'tao_bao_cao': {
      if (!quanLy) return chiQuanLy();
      if (!(await duocGoi(db, userId, [{ hanh_dong: 'xm_tao', cua_so_giay: 3600, toi_da: 20 }]))) return nhanh429();
      const homNay = homNayVN(pt.bayGio());
      const ky = body.ky === 'nam' ? kyTheoNam(Number(body.nam), homNay) : ky12Thang(homNay);
      if (!ky) return loi('KY', 'Năm này chưa có tháng nào kết thúc để lập báo cáo.', 400);
      const bc = await dungBaoCao(db, companyId, ky, homNay);
      const sha256 = await bamBaoCao(bc);
      const { data: cu } = await db.from('bao_cao_xac_minh').select(COT_BAO_CAO).eq('company_id', companyId).eq('sha256', sha256).maybeSingle();
      if (cu) return ok({ bao_cao: cu, da_co: true });
      const { data: moi, error } = await db.from('bao_cao_xac_minh').insert({
        company_id: companyId, ky_loai: ky.loai, tu_ngay: bc.ky.tu_ngay, den_ngay: bc.ky.den_ngay,
        report_json: bc, sha256, created_by: userId,
      }).select(`${COT_BAO_CAO}, anchor_tries`).single();
      if (error) throw error;
      // Neo SAU khi đã lưu: mạng hỏng thì báo cáo vẫn có, lịch chạy hằng giờ gửi lại.
      const neo = await neoBaoCao(db, moi, pt);
      return ok({ bao_cao: { ...moi, anchor_status: neo }, da_co: false });
    }

    case 'ds': {
      const { data: bc, error } = await db.from('bao_cao_xac_minh').select(COT_BAO_CAO)
        .eq('company_id', companyId).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      if (!quanLy) return ok({ bao_cao: bc ?? [], chia_se: [], duoc_chia_se: false });
      const [{ data: cs, error: e2 }, { data: log, error: e3 }] = await Promise.all([
        db.from('chia_se_xac_minh').select('id, report_id, recipient_name, purpose, expires_at, revoked_at, created_at')
          .eq('company_id', companyId).order('created_at', { ascending: false }).limit(200),
        db.from('nhat_ky_xem_xac_minh').select('share_id, ket_qua, at')
          .eq('company_id', companyId).order('at', { ascending: false }).limit(2000),
      ]);
      if (e2) throw e2;
      if (e3) throw e3;
      const bayGio = pt.bayGio();
      const chiaSe = ((cs ?? []) as Row[]).map((s) => {
        const xem = ((log ?? []) as Row[]).filter((l) => l.share_id === s.id && l.ket_qua === 'xem');
        return { ...s, trang_thai: trangThaiChiaSe(s as never, bayGio), so_lan_xem: xem.length, xem_gan_nhat: xem[0]?.at ?? null };
      });
      return ok({ bao_cao: bc ?? [], chia_se: chiaSe, duoc_chia_se: true });
    }

    case 'chia_se': {
      if (!quanLy) return chiQuanLy();
      if (!laUuid(body.report_id)) return loi('THAM_SO', 'Thiếu báo cáo cần chia sẻ.', 400);
      const nguoiNhan = lamSachChu(body.nguoi_nhan, 120);
      const mucDich = lamSachChu(body.muc_dich, 200);
      if (!nguoiNhan || !mucDich) return loi('THAM_SO', 'Ghi rõ gửi cho ai và để làm gì.', 400);
      const bayGio = pt.bayGio();
      const het = hanChiaSe(body.so_ngay, bayGio);
      if (!het) return loi('THAM_SO', 'Thời hạn chia sẻ từ 1 đến 30 ngày.', 400);
      const { data: bc } = await db.from('bao_cao_xac_minh').select('id').eq('id', body.report_id).eq('company_id', companyId).maybeSingle();
      if (!bc) return loi('KHONG_TIM_THAY', 'Không tìm thấy báo cáo này.', 404);
      const token = taoToken();
      const { data: cs, error } = await db.from('chia_se_xac_minh').insert({
        report_id: bc.id, company_id: companyId, recipient_name: nguoiNhan, purpose: mucDich,
        token_hash: await bamToken(token), expires_at: het, created_by: userId, created_at: bayGio.toISOString(),
      }).select('id, report_id, recipient_name, purpose, expires_at, revoked_at, created_at').single();
      if (error) throw error;
      // Mã chỉ trả ĐÚNG lần này. MIMI chỉ giữ mã băm.
      return ok({ token, chia_se: { ...cs, trang_thai: 'con_han', so_lan_xem: 0, xem_gan_nhat: null } });
    }

    case 'thu_hoi': {
      if (!quanLy) return chiQuanLy();
      if (!laUuid(body.share_id)) return loi('THAM_SO', 'Thiếu lần chia sẻ cần thu hồi.', 400);
      const { data, error } = await db.from('chia_se_xac_minh').update({ revoked_at: pt.bayGio().toISOString(), revoked_by: userId })
        .eq('id', body.share_id).eq('company_id', companyId).is('revoked_at', null).select('id');
      if (error) throw error;
      if (!data?.length) return loi('KHONG_TIM_THAY', 'Không tìm thấy lần chia sẻ này, hoặc đã thu hồi rồi.', 404);
      return ok({ ok: true });
    }

    case 'neo_lai_bao_cao': {
      if (!quanLy) return chiQuanLy();
      if (!laUuid(body.report_id)) return loi('THAM_SO', 'Thiếu báo cáo.', 400);
      const { data: r } = await db.from('bao_cao_xac_minh').select('id, sha256, anchor_status, anchor_tries')
        .eq('id', body.report_id).eq('company_id', companyId).maybeSingle();
      if (!r) return loi('KHONG_TIM_THAY', 'Không tìm thấy báo cáo này.', 404);
      if (r.anchor_status !== 'not_anchored') return ok({ anchor_status: r.anchor_status });
      return ok({ anchor_status: await neoBaoCao(db, r, pt) });
    }

    default:
      return loi('HANH_DONG', 'Hành động không hợp lệ.', 400);
  }
}
