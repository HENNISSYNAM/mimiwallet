/**
 * Người dùng tự chỉnh workflow bằng tay (22/11/2026) — thuần. Mỗi thao tác trả đồ thị MỚI đã qua `chuanHoa`; luật cứng
 * (người duyệt trước chuyển tiền / nộp / gửi ra ngoài / xoá) vẫn do `apPhuongAn` áp lại lúc hiển thị và lúc chạy, nên
 * không thao tác nào bỏ được cổng duyệt. Cổng do luật tự thêm (id `duyet_…` không có trong đồ thị gốc) không sửa được.
 */
import { chuanHoa, laMeo, LoiDoThi, TAC_DONG, type DoThi, type LoaiNut, type Meo, type Nut, type TacDong } from './do-thi.ts';

export type ThaoTac =
  | { thao_tac: 'doi_ten'; nut_id: string; ten: string; mo_ta?: string }
  | { thao_tac: 'doi_nguoi_lam'; nut_id: string; lam: 'agent' | 'nguoi' }
  | { thao_tac: 'doi_tac_dong'; nut_id: string; tac_dong: TacDong }
  | { thao_tac: 'doi_cong_cu'; nut_id: string; cong_cu: string | null }
  | { thao_tac: 'them_sau'; nut_id: string; ten: string; lam: 'agent' | 'nguoi' | 'duyet' }
  | { thao_tac: 'xoa'; nut_id: string }
  | { thao_tac: 'doi_meo'; nut_id: string; meo: Meo | null }
  | { thao_tac: 'doi_chi_tiet'; nut_id: string; chi_tiet: Record<string, unknown> }
  | { thao_tac: 'them_nhanh_sua'; nut_id: string; ten: string };

const sach = (s: unknown, n: number) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

export function apThaoTac(goc: DoThi, t: ThaoTac): DoThi {
  const nut = goc.nut.map((n) => ({ ...n }));
  let canh = goc.canh.map((c) => ({ ...c }));
  const tim = (id: string) => {
    const n = nut.find((x) => x.id === id);
    if (!n) throw new LoiDoThi(id.startsWith('duyet_') ? 'Cổng duyệt này do luật an toàn tự thêm — không sửa được.' : 'Không có bước này.');
    return n;
  };
  switch (t.thao_tac) {
    case 'doi_ten': {
      const n = tim(t.nut_id);
      const ten = sach(t.ten, 60);
      if (!ten) throw new LoiDoThi('Tên bước không được trống.');
      n.ten = ten;
      if (t.mo_ta !== undefined) n.mo_ta = sach(t.mo_ta, 200);
      break;
    }
    case 'doi_nguoi_lam': {
      const n = tim(t.nut_id);
      if (n.loai === 'kich_hoat' || n.loai === 'duyet') throw new LoiDoThi('Bước này không đổi người làm được.');
      if (t.lam === 'agent' && n.tac_dong === 'chuyen_tien') throw new LoiDoThi('MIMI không chuyển tiền — bước chuyển tiền luôn do người.');
      n.loai = t.lam === 'agent' ? (n.loai === 'nguoi' ? 'agent' : n.loai) : 'nguoi';
      n.ai_duoc = t.lam === 'agent';
      break;
    }
    case 'doi_tac_dong': {
      const n = tim(t.nut_id);
      if (!(TAC_DONG as readonly string[]).includes(t.tac_dong)) throw new LoiDoThi('Tác động không hợp lệ.');
      n.tac_dong = t.tac_dong;
      if (t.tac_dong === 'chuyen_tien') { n.loai = 'nguoi'; n.ai_duoc = false; }
      break;
    }
    case 'doi_cong_cu': {
      const n = tim(t.nut_id);
      n.cong_cu = t.cong_cu ? sach(t.cong_cu, 40).toLowerCase().replace(/[^a-z0-9_]/g, '_') || null : null;
      break;
    }
    case 'them_sau': {
      tim(t.nut_id);
      const ten = sach(t.ten, 60);
      if (!ten) throw new LoiDoThi('Tên bước không được trống.');
      let i = 1;
      while (nut.some((n) => n.id === `buoc_${i}`)) i++;
      const loai: LoaiNut = t.lam === 'duyet' ? 'duyet' : t.lam === 'agent' ? 'agent' : 'nguoi';
      const moi: Nut = { id: `buoc_${i}`, loai, ten, mo_ta: '', ai_duoc: t.lam === 'agent', tac_dong: 'doc', cong_cu: null };
      nut.splice(nut.findIndex((n) => n.id === t.nut_id) + 1, 0, moi);
      const sau = canh.filter((c) => c.tu === t.nut_id).map((c) => c.den);
      canh = [...canh.filter((c) => c.tu !== t.nut_id), { tu: t.nut_id, den: moi.id }, ...sau.map((d) => ({ tu: moi.id, den: d }))];
      break;
    }
    case 'xoa': {
      const n = tim(t.nut_id);
      if (n.loai === 'kich_hoat') throw new LoiDoThi('Không xoá được bước bắt đầu.');
      if (nut.length <= 2) throw new LoiDoThi('Workflow cần ít nhất một bước ngoài bước bắt đầu.');
      const truoc = canh.filter((c) => c.den === n.id).map((c) => c.tu);
      const sau = canh.filter((c) => c.tu === n.id).map((c) => c.den);
      canh = [...canh.filter((c) => c.tu !== n.id && c.den !== n.id), ...truoc.flatMap((a) => sau.map((b) => ({ tu: a, den: b })))];
      nut.splice(nut.indexOf(n), 1);
      break;
    }
    case 'doi_chi_tiet': {
      // Trường kỹ thuật: qua `chuanHoa` (cắt độ dài, lọc giá trị lạ) ở cuối hàm.
      const n = tim(t.nut_id) as unknown as Record<string, unknown>;
      for (const k of ['vai_tro', 'dau_vao', 'dau_ra', 'bang_chung', 'kiem_soat', 'sla_gio'] as const) {
        if (k in t.chi_tiet) { const v = t.chi_tiet[k]; if (v === '' || v == null) delete n[k]; else n[k] = v; }
      }
      break;
    }
    case 'doi_meo': {
      const n = tim(t.nut_id);
      if (t.meo && !laMeo(t.meo)) throw new LoiDoThi('Không có mèo này.');
      if (t.meo) n.meo_chon = t.meo; else delete n.meo_chon;
      break;
    }
    case 'them_nhanh_sua': {
      // Sau bước duyệt: thêm nhánh "Cần sửa" (người sửa rồi quay về bước trước duyệt là việc của lượt chạy sau).
      const n = tim(t.nut_id);
      if (n.loai !== 'duyet') throw new LoiDoThi('Chỉ bước duyệt mới có nhánh "Cần sửa".');
      if (canh.some((c) => c.tu === n.id && c.nhanh === 'can_sua')) throw new LoiDoThi('Bước này đã có nhánh "Cần sửa".');
      const ten = sach(t.ten, 60) || 'Trả lại để bổ sung';
      let i = 1;
      while (nut.some((x) => x.id === `sua_${i}`)) i++;
      const moi: Nut = { id: `sua_${i}`, loai: 'nguoi', ten, mo_ta: 'Người lập sửa theo ý kiến người duyệt', ai_duoc: false, tac_dong: 'ghi', cong_cu: null };
      nut.push(moi);
      canh = [...canh.map((c) => (c.tu === n.id && !c.nhanh ? { ...c, nhanh: 'dat' as const } : c)), { tu: n.id, den: moi.id, nhanh: 'can_sua' as const }];
      break;
    }
    default: throw new LoiDoThi('Thao tác không hợp lệ.');
  }
  return chuanHoa({ nut, canh });
}

/** Đọc thao tác từ trình duyệt (không tin). */
export function docThaoTac(b: Record<string, unknown>): ThaoTac {
  const nut_id = String(b.nut_id ?? '');
  switch (b.thao_tac) {
    case 'doi_ten': return { thao_tac: 'doi_ten', nut_id, ten: String(b.ten ?? ''), mo_ta: b.mo_ta == null ? undefined : String(b.mo_ta) };
    case 'doi_nguoi_lam': if (b.lam !== 'agent' && b.lam !== 'nguoi') break; return { thao_tac: 'doi_nguoi_lam', nut_id, lam: b.lam };
    case 'doi_tac_dong': return { thao_tac: 'doi_tac_dong', nut_id, tac_dong: String(b.tac_dong) as TacDong };
    case 'doi_cong_cu': return { thao_tac: 'doi_cong_cu', nut_id, cong_cu: b.cong_cu == null || b.cong_cu === '' ? null : String(b.cong_cu) };
    case 'them_sau': if (!['agent', 'nguoi', 'duyet'].includes(String(b.lam))) break; return { thao_tac: 'them_sau', nut_id, ten: String(b.ten ?? ''), lam: b.lam as 'agent' };
    case 'xoa': return { thao_tac: 'xoa', nut_id };
    case 'doi_meo': if (b.meo != null && b.meo !== '' && !laMeo(b.meo)) break; return { thao_tac: 'doi_meo', nut_id, meo: b.meo ? (b.meo as Meo) : null };
    case 'them_nhanh_sua': return { thao_tac: 'them_nhanh_sua', nut_id, ten: String(b.ten ?? '') };
    case 'doi_chi_tiet': if (!b.chi_tiet || typeof b.chi_tiet !== 'object') break; return { thao_tac: 'doi_chi_tiet', nut_id, chi_tiet: b.chi_tiet as Record<string, unknown> };
  }
  throw new LoiDoThi('Thao tác không hợp lệ.');
}
