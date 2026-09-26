/**
 * Trợ lý LÀM TIẾP việc, không chỉ trò chuyện (Prompt 4B mục 15). Chạy TRƯỚC mô hình và bộ hiểu câu:
 *
 *   1. Câu nói về một việc nhiều bước ("tôi muốn tạm ngừng kinh doanh") → mở hoặc MỞ TIẾP đúng hồ sơ việc
 *      đó; nếu câu có luôn câu trả lời ("từ 1/10 đến 31/12/2026") thì ghi luôn.
 *   2. "Tôi đã nộp (mã …)" / "đã nhận thông báo chấp nhận số …" → ghi bằng chứng mức "theo xác nhận của
 *      bạn" vào đúng việc đang chờ bước đó. Không bao giờ thành "đã xác minh".
 *   3. Câu trả lời ngắn cho câu hỏi đang chờ ("01/10/2026", "hộ kinh doanh") → ghi vào đúng việc đang hỏi.
 *
 * Cùng hàm ghi với trang Việc cần làm và pet — một hồ sơ việc, không ba bản.
 */
import type { KetQuaNangLuc, NguonDuLieu, The } from '../tro-ly/kieu.ts';
import { dsHanhTrinhDangMo, docHanhTrinh, type HanhTrinhDay } from '../hanh-trinh/luu.ts';
import { DU_KIEN, type LoaiHanhTrinh } from '../hanh-trinh/mau.ts';
import { hanhDongTiepHanhTrinh, type HanhDongTiep } from './dong-co-viec.ts';
import { docBangChung, docHoSoViec, ghiNhanDaNop, ghiNhanPhanHoi, LoiViec, moViecHanhTrinh, traLoiViec, type HoSoViecDong } from './luu.ts';
import { docCauTraLoi, docNgay, docThang, nhanBaoViec } from './tra-loi-chat.ts';
import { laDangMo, TEN_TRANG_THAI_VIEC, type TrangThaiViec } from './trang-thai.ts';
import { LoiHanhTrinh } from '../hanh-trinh/luu.ts';

// deno-lint-ignore no-explicit-any
type Db = any;

const NGUON_VIEC: NguonDuLieu = { ten: 'Việc đang làm của công ty', mo_ta: 'Hồ sơ việc, dữ kiện bạn đã trả lời, bằng chứng — lưu ở máy chủ MIMI.' };
const ngayVN = (ymd: string) => ymd.slice(0, 10).split('-').reverse().join('/');

function giaTriDe(khoa: string, v: string): string {
  const lc = DU_KIEN[khoa]?.lua_chon?.find((x) => x.gia_tri === v);
  if (lc) return lc.nhan;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return ngayVN(v);
  if (/^\d{4}-\d{2}$/.test(v)) return v.split('-').reverse().join('/');
  return v;
}

function ketQua(tom: string, the: The[], viecId: string | null): KetQuaNangLuc {
  return {
    nang_luc: 'viec', nhom: 'tro_ly', tom_tat: tom, the, de_xuat: [], nguon: [NGUON_VIEC],
    trang: [{ nhan: viecId ? 'Mở việc này' : 'Mở Việc cần làm', duong_dan: viecId ? `/dashboard/viec-can-lam?viec=${viecId}` : '/dashboard/viec-can-lam' }],
  };
}

const cauTiep = (a: HanhDongTiep | null): string => {
  if (!a) return '';
  if (a.loai === 'tra_loi' && a.can_nhap[0]) return ` Câu tiếp theo: ${a.can_nhap[0].cau}`;
  return ` Việc tiếp theo: ${a.tieu_de}.`;
};

/** Ghi lần lượt các giá trị đọc được từ một câu vào các câu hỏi đang chờ (tối đa 3, cùng kiểu). */
async function apCauTraLoi(db: Db, o: { companyId: string; userId: string; ht: HanhTrinhDay; cau: string; homNay: string }): Promise<{ ht: HanhTrinhDay; daGhi: string[] }> {
  let ht = o.ht;
  const daGhi: string[] = [];
  const ngay = docNgay(o.cau, o.homNay);
  const thang = docThang(o.cau);
  for (let i = 0; i < 3 && ht.cau_hoi; i++) {
    const q = ht.cau_hoi;
    const v = q.kieu === 'ngay' ? ngay[daGhi.filter((k) => DU_KIEN[k]?.kieu === 'ngay').length] ?? null
      : q.kieu === 'thang' ? thang[daGhi.filter((k) => DU_KIEN[k]?.kieu === 'thang').length] ?? null
        : i === 0 ? docCauTraLoi(o.cau, q, o.homNay) : null;
    if (!v) break;
    const r = await traLoiViec(db, { companyId: o.companyId, userId: o.userId, htId: ht.id, khoa: q.khoa, giaTri: v, homNay: o.homNay, nguon: 'tro_ly' });
    daGhi.push(q.khoa);
    ht = r.ht;
  }
  return { ht, daGhi };
}

async function hanhDongCua(db: Db, companyId: string, ht: HanhTrinhDay, homNay: string): Promise<{ v: HoSoViecDong | null; a: HanhDongTiep | null }> {
  if (!ht.ho_so_viec_id) return { v: null, a: null };
  const v = await docHoSoViec(db, companyId, ht.ho_so_viec_id);
  if (!v) return { v: null, a: null };
  const bc = await docBangChung(db, companyId, v.id);
  return { v, a: hanhDongTiepHanhTrinh(ht, v.trang_thai as TrangThaiViec, bc, homNay) };
}

export interface KetQuaChatViec {
  /** Câu trả lời xong — trả thẳng, không cần mô hình. */
  ketQua: KetQuaNangLuc | null;
  /** Việc vừa mở / mở tiếp — để năng lực "hành trình" của trợ lý trả lời tiếp. */
  hanhTrinh: { loai: LoaiHanhTrinh; luu: boolean; moi: boolean; ht: HanhTrinhDay | null } | null;
}

export async function xuLyChatViec(db: Db, o: {
  companyId: string; userId: string; cau: string; homNay: string; duocGhi: boolean;
  loaiHanhTrinh: LoaiHanhTrinh | null; duKienBiet: Record<string, string>;
}): Promise<KetQuaChatViec> {
  // 1. Ý định mở việc.
  if (o.loaiHanhTrinh) {
    if (!o.duocGhi) return { ketQua: null, hanhTrinh: { loai: o.loaiHanhTrinh, luu: false, moi: false, ht: null } };
    const r = await moViecHanhTrinh(db, { companyId: o.companyId, userId: o.userId, loai: o.loaiHanhTrinh, yDinh: o.cau, duKienBiet: o.duKienBiet, homNay: o.homNay });
    const ap = await apCauTraLoi(db, { companyId: o.companyId, userId: o.userId, ht: r.ht, cau: o.cau, homNay: o.homNay }).catch((e) => {
      if (e instanceof LoiHanhTrinh || e instanceof LoiViec) return { ht: r.ht, daGhi: [] as string[] };
      throw e;
    });
    return { ketQua: null, hanhTrinh: { loai: o.loaiHanhTrinh, luu: true, moi: r.moi, ht: ap.ht } };
  }
  if (!o.duocGhi) return { ketQua: null, hanhTrinh: null };

  const moi = await dsHanhTrinhDangMo(db, o.companyId).catch(() => [] as HanhTrinhDay[]);

  // 2. Câu báo việc.
  const bao = nhanBaoViec(o.cau);
  if (bao) {
    const ungVien: { ht: HanhTrinhDay; v: HoSoViecDong }[] = [];
    for (const ht of moi) {
      if (!ht.ho_so_viec_id) continue;
      const v = await docHoSoViec(db, o.companyId, ht.ho_so_viec_id);
      if (!v || !laDangMo(v.trang_thai)) continue;
      const nop = ht.buoc.find((b) => b.khoa === 'nguoi_dung_nop');
      const kiem = ht.buoc.find((b) => b.loai_hanh_dong === 'kiem_ket_qua');
      if (bao.loai === 'da_nop' && nop && nop.trang_thai !== 'completed' && nop.trang_thai !== 'skipped') ungVien.push({ ht, v });
      if (bao.loai === 'co_phan_hoi' && kiem && kiem.trang_thai !== 'completed') ungVien.push({ ht, v });
    }
    if (!ungVien.length) {
      return {
        ketQua: ketQua(bao.loai === 'da_nop'
          ? 'MIMI chưa thấy việc nào đang chờ bạn nộp hồ sơ, nên chưa ghi gì. Nếu bạn vừa nộp cho một việc mới, nói với MIMI việc đó là gì (ví dụ "tôi muốn tạm ngừng kinh doanh").'
          : 'MIMI chưa thấy việc nào đang chờ phản hồi của cơ quan, nên chưa ghi gì. Mở Việc cần làm để chọn đúng việc.', [], null),
        hanhTrinh: null,
      };
    }
    if (ungVien.length > 1) {
      return {
        ketQua: ketQua(`Bạn đang có ${ungVien.length} việc cùng chờ bước này — MIMI không đoán việc nào. Mở đúng việc để ghi nhận:`, [{
          loai: 'bang', tieu_de: 'Việc đang chờ', cot: [{ nhan: 'Việc', don_vi: 'chu' }, { nhan: 'Trạng thái', don_vi: 'chu' }],
          dong: ungVien.map(({ v }) => [v.tieu_de, TEN_TRANG_THAI_VIEC[v.trang_thai as TrangThaiViec] ?? v.trang_thai]),
        }], null),
        hanhTrinh: null,
      };
    }
    const { v } = ungVien[0];
    try {
      if (bao.loai === 'da_nop') {
        const r = await ghiNhanDaNop(db, { companyId: o.companyId, userId: o.userId, caseId: v.id, maHoSo: bao.ma_ho_so, homNay: o.homNay, nguon: 'tro_ly' });
        const hen = r.viec?.hen_kiem_lai ? ` MIMI sẽ nhắc bạn kiểm phản hồi vào ${ngayVN(r.viec.hen_kiem_lai)}.` : '';
        return {
          ketQua: ketQua(
            `MIMI đã ghi nhận bạn nộp hồ sơ "${v.tieu_de}"${bao.ma_ho_so ? `, mã ${bao.ma_ho_so}` : ''}. Đây là xác nhận của bạn — MIMI chưa có phản hồi của cơ quan, nên việc đang ở trạng thái chờ phản hồi.${hen}${bao.ma_ho_so ? '' : ' Nếu có mã hồ sơ hoặc biên nhận, ghi thêm để dễ tra về sau.'}`,
            [{ loai: 'ghi_chu', muc_do: 'thong_tin', cau: 'Bằng chứng: bạn xác nhận đã nộp — MIMI chưa kiểm được với cơ quan.' }], v.id),
          hanhTrinh: null,
        };
      }
      const r = await ghiNhanPhanHoi(db, { companyId: o.companyId, userId: o.userId, caseId: v.id, noiDung: bao.noi_dung, homNay: o.homNay, nguon: 'tro_ly' });
      const tt = r.viec?.trang_thai ?? v.trang_thai;
      const { a } = await hanhDongCua(db, o.companyId, r.ht, o.homNay);
      const tom = tt === 'resolved_user_confirmed'
        ? `MIMI đã ghi phản hồi bạn nhận được và đóng việc "${v.tieu_de}" ở mức "theo xác nhận của bạn" — MIMI chưa tự kiểm được với cơ quan.`
        : `MIMI đã ghi phản hồi bạn nhận được cho "${v.tieu_de}". Việc chưa đóng được: ${TEN_TRANG_THAI_VIEC[tt as TrangThaiViec] ?? tt}.${cauTiep(a)}`;
      return { ketQua: ketQua(tom, [], v.id), hanhTrinh: null };
    } catch (e) {
      if (e instanceof LoiViec || e instanceof LoiHanhTrinh) return { ketQua: ketQua(`Chưa ghi được: ${e.message}`, [], v.id), hanhTrinh: null };
      throw e;
    }
  }

  // 3. Trả lời ngắn cho câu hỏi đang chờ.
  if (o.cau.trim().length > 200) return { ketQua: null, hanhTrinh: null };
  const coHoi = moi.filter((h) => h.cau_hoi);
  for (const ht of coHoi) {
    const v1 = docCauTraLoi(o.cau, ht.cau_hoi!, o.homNay);
    if (!v1) continue;
    try {
      const khoaDau = ht.cau_hoi!.khoa;
      const ap = await apCauTraLoi(db, { companyId: o.companyId, userId: o.userId, ht, cau: o.cau, homNay: o.homNay });
      const daGhi = ap.daGhi.map((k) => `${(DU_KIEN[k]?.viec ?? k).replace(/^(Xác nhận|Cho biết|Ghi|Chọn)\s+/i, '')}: ${giaTriDe(k, ap.ht.du_kien[k]?.gia_tri ?? '')}`);
      const moiNhat = (await docHanhTrinh(db, o.companyId, ht.id)) as HanhTrinhDay;
      const { v, a } = await hanhDongCua(db, o.companyId, moiNhat, o.homNay);
      const tom = `Đã ghi vào việc "${moiNhat.tieu_de}" — ${daGhi.join('; ') || khoaDau}.${cauTiep(a)}`;
      return { ketQua: ketQua(tom, [], v?.id ?? null), hanhTrinh: null };
    } catch (e) {
      if (e instanceof LoiViec || e instanceof LoiHanhTrinh) {
        return { ketQua: ketQua(`Chưa ghi được: ${e.message} ${ht.cau_hoi!.cau}`, [], ht.ho_so_viec_id), hanhTrinh: null };
      }
      throw e;
    }
  }
  return { ketQua: null, hanhTrinh: null };
}
