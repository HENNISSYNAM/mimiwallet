/**
 * Lưu hành trình và hồ sơ việc — phần CHẠM CSDL (service role). Mọi quyết định nằm ở `dong-co.ts`;
 * ở đây chỉ đọc, gọi hàm thuần, ghi, và để lại dấu vết trong `nhat_ky_thay_doi`.
 *
 * Nơi gọi (edge function `tro-ly`) đã kiểm vai trò trước khi tới đây.
 */
import { cauHoiTiepTheo, kiemCauTraLoi, kiemNhatQuan, tinhBuoc, trangThaiHanhTrinh, type Buoc, type CauHoi, type DuKien, type TrangThaiBuoc } from './dong-co.ts';
import { MAU_HANH_TRINH, type LoaiHanhTrinh } from './mau.ts';
import { ghiSuKien } from '../do-luong/su-kien.ts';

// deno-lint-ignore no-explicit-any
type Db = any;

export interface HanhTrinhDay {
  id: string;
  loai: LoaiHanhTrinh;
  tieu_de: string;
  trang_thai: string;
  ho_so_viec_id: string | null;
  du_kien: DuKien;
  buoc: Buoc[];
  cau_hoi: CauHoi | null;
  tao_luc: string;
  cap_nhat_luc: string;
}

export async function ghiNhatKy(db: Db, o: {
  companyId: string; doiTuong: string; id: string; hanhDong: string; boi: string | null;
  truoc?: unknown; sau?: unknown; nguon?: string; bangChung?: unknown[];
}): Promise<void> {
  const { error } = await db.from('nhat_ky_thay_doi').insert({
    company_id: o.companyId, doi_tuong: o.doiTuong, doi_tuong_id: o.id, hanh_dong: o.hanhDong, boi: o.boi,
    truoc: o.truoc ?? null, sau: o.sau ?? null, nguon: o.nguon ?? null, bang_chung: o.bangChung ?? [],
  });
  // Dấu vết là một phần của việc: không ghi được thì việc không được coi là đã làm.
  if (error) throw new Error(`ghi nhật ký thay đổi: ${error.message}`);
}

const trangThaiDaCo = (rows: { khoa: string; trang_thai: TrangThaiBuoc }[]) =>
  Object.fromEntries(rows.map((r) => [r.khoa, r.trang_thai]));

/** Đọc một hành trình đầy đủ; bước tính lại từ dữ kiện (nguồn sự thật là dữ kiện + dấu người dùng). */
export async function docHanhTrinh(db: Db, companyId: string, id: string): Promise<HanhTrinhDay | null> {
  const { data: ht, error } = await db.from('hanh_trinh')
    .select('id, loai, tieu_de, trang_thai, ho_so_viec_id, du_kien, tao_luc, cap_nhat_luc')
    .eq('company_id', companyId).eq('id', id).maybeSingle();
  if (error) throw new Error(`đọc hành trình: ${error.message}`);
  if (!ht) return null;
  const { data: rows, error: e2 } = await db.from('buoc_hanh_trinh').select('khoa, trang_thai').eq('hanh_trinh_id', id);
  if (e2) throw new Error(`đọc bước: ${e2.message}`);
  const buoc = tinhBuoc(ht.loai, ht.du_kien ?? {}, trangThaiDaCo(rows ?? []));
  return { ...ht, du_kien: ht.du_kien ?? {}, buoc, cau_hoi: cauHoiTiepTheo(buoc, ht.du_kien ?? {}) };
}

async function ghiBuoc(db: Db, companyId: string, htId: string, buoc: Buoc[]): Promise<void> {
  const { error } = await db.from('buoc_hanh_trinh').upsert(buoc.map((b) => ({
    hanh_trinh_id: htId, company_id: companyId, thu_tu: b.thu_tu, khoa: b.khoa, tieu_de: b.tieu_de, mo_ta: b.mo_ta,
    trang_thai: b.trang_thai, uu_tien: b.uu_tien, du_kien_can: b.du_kien_can, giay_to_can: b.giay_to_can,
    thu_tuc: b.thu_tuc_tim ? [b.thu_tuc_tim] : [], loai_hanh_dong: b.loai_hanh_dong, dich_hanh_dong: b.dich_hanh_dong,
    ly_do_chan: b.ly_do_chan, hoan_tat_luc: b.trang_thai === 'completed' ? new Date().toISOString() : null,
  })), { onConflict: 'hanh_trinh_id,khoa' });
  if (error) throw new Error(`ghi bước: ${error.message}`);
}

/**
 * Mở việc có hướng dẫn — hoặc MỞ TIẾP việc cùng loại đang dở (Prompt 4B mục 3).
 *
 * Danh tính là HỒ SƠ VIỆC đang mở có cùng dấu vân tay (loại + đối tượng), không phải tiêu đề: hỏi lại
 * "tôi muốn tạm ngừng" → cùng hồ sơ, cùng hành trình (kể cả khi các bước đã xong mà việc chưa đóng vì
 * còn thiếu bằng chứng). Hai yêu cầu cùng lúc (trợ lý + pet, hai tab): chỉ mục duy nhất ở CSDL chặn bản
 * thứ hai; bên thua đọc lại bản đã có.
 * `duKienBiet`: dữ kiện đã biết từ hồ sơ để không hỏi lại điều MIMI đã biết.
 */
export async function moHanhTrinh(db: Db, o: {
  companyId: string; userId: string; loai: LoaiHanhTrinh; yDinh: string; duKienBiet?: Record<string, string>;
}, lan = 0): Promise<{ ht: HanhTrinhDay; moi: boolean }> {
  const mau = MAU_HANH_TRINH[o.loai];
  const dauVanTay = `${mau.loai_ho_so}:chung`;
  const dangMo = ['needs_information', 'ready_to_act', 'in_progress', 'waiting_external', 'needs_review'];

  const { data: hsCu, error: loiHs } = await db.from('ho_so_viec').select('id').eq('company_id', o.companyId).eq('dau_van_tay', dauVanTay)
    .in('trang_thai', dangMo).maybeSingle();
  if (loiHs) throw new Error(`đọc hồ sơ việc: ${loiHs.message}`);
  if (hsCu) {
    const { data: htCu, error: loiHt } = await db.from('hanh_trinh').select('id').eq('company_id', o.companyId).eq('ho_so_viec_id', hsCu.id)
      .neq('trang_thai', 'da_huy').order('tao_luc', { ascending: false }).limit(1);
    if (loiHt) throw new Error(`đọc hành trình: ${loiHt.message}`);
    if (htCu?.[0]) return { ht: (await docHanhTrinh(db, o.companyId, htCu[0].id)) as HanhTrinhDay, moi: false };
  }
  // Hành trình cũ chưa gắn hồ sơ (trước Prompt 4B) cùng loại đang mở: mở tiếp nó.
  if (!hsCu) {
    const { data: htLe } = await db.from('hanh_trinh').select('id').eq('company_id', o.companyId).eq('loai', o.loai)
      .not('trang_thai', 'in', '(hoan_tat,da_huy)').maybeSingle();
    if (htLe) return { ht: (await docHanhTrinh(db, o.companyId, htLe.id)) as HanhTrinhDay, moi: false };
  }

  const luc = new Date().toISOString();
  const duKien: DuKien = Object.fromEntries(Object.entries(o.duKienBiet ?? {})
    .filter(([k, v]) => v && kiemCauTraLoi(k, v).ok)
    .map(([k, v]) => [k, { gia_tri: v, nguon: 'ho_so' as const, luc, boi: null }]));

  let hoSoId: string | null = hsCu?.id ?? null;
  if (!hoSoId) {
    const { data: hs, error } = await db.from('ho_so_viec').insert({
      company_id: o.companyId, loai: mau.loai_ho_so, tieu_de: mau.tieu_de, dau_van_tay: dauVanTay,
      nguon: { y_dinh: o.yDinh.slice(0, 500) }, tao_boi: o.userId,
    }).select('id').single();
    if (error) {
      if (/duplicate|unique/i.test(error.message) && lan < 3) return moHanhTrinh(db, o, lan + 1);
      throw new Error(`mở hồ sơ việc: ${error.message}`);
    }
    hoSoId = hs.id;
    await ghiNhatKy(db, { companyId: o.companyId, doiTuong: 'ho_so_viec', id: hs.id, hanhDong: 'mo', boi: o.userId, sau: { loai: mau.loai_ho_so, tieu_de: mau.tieu_de }, nguon: 'tro_ly' });
    await ghiSuKien(db, o.companyId, o.userId, 'first_case_created', { loai: mau.loai_ho_so });
    await ghiSuKien(db, o.companyId, o.userId, 'case_created', { loai: mau.loai_ho_so });
  }

  const buoc = tinhBuoc(o.loai, duKien);
  const { data: ht, error } = await db.from('hanh_trinh').insert({
    company_id: o.companyId, loai: o.loai, y_dinh: o.yDinh.slice(0, 1000), tieu_de: mau.tieu_de,
    trang_thai: trangThaiHanhTrinh(buoc), ho_so_viec_id: hoSoId, du_kien: duKien, tao_boi: o.userId,
    loai_chu_the: duKien.loai_chu_the?.gia_tri ?? null,
  }).select('id').single();
  if (error) {
    // Hai yêu cầu cùng lúc: yêu cầu kia đã mở — đọc lại cái đó.
    if (/duplicate|unique/i.test(error.message) && lan < 3) return moHanhTrinh(db, o, lan + 1);
    throw new Error(`mở hành trình: ${error.message}`);
  }
  await ghiBuoc(db, o.companyId, ht.id, buoc);
  await ghiNhatKy(db, { companyId: o.companyId, doiTuong: 'hanh_trinh', id: ht.id, hanhDong: 'mo', boi: o.userId, sau: { loai: o.loai, du_kien_biet: Object.keys(duKien) }, nguon: 'tro_ly' });
  await ghiSuKien(db, o.companyId, o.userId, 'journey_started', { loai: o.loai });
  return { ht: (await docHanhTrinh(db, o.companyId, ht.id)) as HanhTrinhDay, moi: true };
}

export class LoiHanhTrinh extends Error {}

/** Ghi một câu trả lời. Sai thì ném `LoiHanhTrinh` với câu cho người dùng. */
export async function traLoi(db: Db, o: { companyId: string; userId: string; id: string; khoa: string; giaTri: unknown; nguon?: string }): Promise<HanhTrinhDay> {
  const ht = await docHanhTrinh(db, o.companyId, o.id);
  if (!ht) throw new LoiHanhTrinh('Không tìm thấy việc này.');
  if (ht.trang_thai === 'hoan_tat' || ht.trang_thai === 'da_huy') throw new LoiHanhTrinh('Việc này đã đóng.');
  const k = kiemCauTraLoi(o.khoa, o.giaTri);
  if (k.ok === false) throw new LoiHanhTrinh(k.loi);
  if (!MAU_HANH_TRINH[ht.loai].buoc.some((b) => b.du_kien_can.includes(o.khoa))) throw new LoiHanhTrinh('Việc này không hỏi dữ kiện đó.');
  const truoc = ht.du_kien[o.khoa] ?? null;
  const duKien: DuKien = { ...ht.du_kien, [o.khoa]: { gia_tri: k.gia_tri, nguon: 'nguoi_dung', luc: new Date().toISOString(), boi: o.userId } };
  const loiNhatQuan = kiemNhatQuan(Object.fromEntries(Object.entries(duKien).map(([a, b]) => [a, b.gia_tri])));
  if (loiNhatQuan) throw new LoiHanhTrinh(loiNhatQuan);

  const { data: rows } = await db.from('buoc_hanh_trinh').select('khoa, trang_thai').eq('hanh_trinh_id', o.id);
  const buoc = tinhBuoc(ht.loai, duKien, trangThaiDaCo(rows ?? []));
  const { error } = await db.from('hanh_trinh').update({
    du_kien: duKien, trang_thai: trangThaiHanhTrinh(buoc), cap_nhat_luc: new Date().toISOString(),
    buoc_hien_tai: cauHoiTiepTheo(buoc, duKien)?.buoc ?? null,
    ...(o.khoa === 'loai_chu_the' ? { loai_chu_the: k.gia_tri } : {}),
  }).eq('id', o.id).eq('company_id', o.companyId);
  if (error) throw new Error(`ghi câu trả lời: ${error.message}`);
  await ghiBuoc(db, o.companyId, o.id, buoc);
  await ghiNhatKy(db, { companyId: o.companyId, doiTuong: 'hanh_trinh', id: o.id, hanhDong: 'tra_loi', boi: o.userId, truoc: truoc ? { [o.khoa]: truoc.gia_tri } : null, sau: { [o.khoa]: k.gia_tri }, nguon: o.nguon ?? 'nguoi_dung' });
  return (await docHanhTrinh(db, o.companyId, o.id)) as HanhTrinhDay;
}

/**
 * Người dùng đánh dấu một bước: đang làm, đã nộp (chờ bên ngoài), xong, bỏ qua. Chỉ đổi BƯỚC. Trạng thái
 * hồ sơ việc (kể cả đóng việc) chỉ đổi ở `viec/luu.ts` → `dongBoTrangThaiViec`, theo điều kiện và bằng chứng.
 * Bước "kiểm kết quả" chỉ xong khi có `ketQua`.
 */
export async function danhDauBuoc(db: Db, o: {
  companyId: string; userId: string; id: string; khoa: string; trangThai: TrangThaiBuoc; ketQua?: string;
}): Promise<HanhTrinhDay> {
  if (!['in_progress', 'waiting_external', 'completed', 'skipped'].includes(o.trangThai)) throw new LoiHanhTrinh('Trạng thái không hợp lệ.');
  const ht = await docHanhTrinh(db, o.companyId, o.id);
  if (!ht) throw new LoiHanhTrinh('Không tìm thấy việc này.');
  if (ht.trang_thai === 'hoan_tat' || ht.trang_thai === 'da_huy') throw new LoiHanhTrinh('Việc này đã đóng.');
  const b = ht.buoc.find((x) => x.khoa === o.khoa);
  if (!b) throw new LoiHanhTrinh('Không có bước này.');
  if (b.loai_hanh_dong === 'hoi') throw new LoiHanhTrinh('Bước này xong khi bạn trả lời câu hỏi.');
  if (b.trang_thai === 'blocked' && o.trangThai !== 'skipped') throw new LoiHanhTrinh(b.ly_do_chan ?? 'Bước này chưa mở.');
  const ketQua = (o.ketQua ?? '').trim();
  if (b.loai_hanh_dong === 'kiem_ket_qua' && o.trangThai === 'completed' && ketQua.length < 5) {
    throw new LoiHanhTrinh('Ghi lại kết quả (vd. số thông báo chấp nhận, ngày nhận biên nhận) trước khi đóng việc.');
  }
  if (b.loai_hanh_dong === 'kiem_ket_qua' && o.trangThai === 'skipped') throw new LoiHanhTrinh('Không bỏ qua được bước kiểm kết quả.');

  const { data: rows } = await db.from('buoc_hanh_trinh').select('khoa, trang_thai').eq('hanh_trinh_id', o.id);
  const daCo = { ...trangThaiDaCo(rows ?? []), [o.khoa]: o.trangThai };
  const buoc = tinhBuoc(ht.loai, ht.du_kien, daCo);
  const tt = trangThaiHanhTrinh(buoc);
  const bayGio = new Date().toISOString();
  const { error } = await db.from('hanh_trinh').update({ trang_thai: tt, cap_nhat_luc: bayGio, hoan_tat_luc: tt === 'hoan_tat' ? bayGio : null })
    .eq('id', o.id).eq('company_id', o.companyId);
  if (error) throw new Error(`đánh dấu bước: ${error.message}`);
  await ghiBuoc(db, o.companyId, o.id, buoc);
  await ghiNhatKy(db, { companyId: o.companyId, doiTuong: 'buoc_hanh_trinh', id: `${o.id}:${o.khoa}`, hanhDong: 'danh_dau', boi: o.userId, truoc: { trang_thai: b.trang_thai }, sau: { trang_thai: o.trangThai, ket_qua: ketQua || undefined }, nguon: 'nguoi_dung' });

  return (await docHanhTrinh(db, o.companyId, o.id)) as HanhTrinhDay;
}

/** Các hành trình đang mở của công ty — cho "Việc cần làm" và ngữ cảnh trợ lý. */
export async function dsHanhTrinhDangMo(db: Db, companyId: string): Promise<HanhTrinhDay[]> {
  const { data, error } = await db.from('hanh_trinh').select('id').eq('company_id', companyId)
    .not('trang_thai', 'in', '(hoan_tat,da_huy)').order('cap_nhat_luc', { ascending: false }).limit(12);
  if (error) throw new Error(`đọc hành trình: ${error.message}`);
  const ra: HanhTrinhDay[] = [];
  for (const r of data ?? []) { const h = await docHanhTrinh(db, companyId, r.id); if (h) ra.push(h); }
  return ra;
}
