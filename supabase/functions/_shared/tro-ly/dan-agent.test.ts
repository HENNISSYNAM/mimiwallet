import { describe, expect, it, vi } from 'vitest';
import { chayDanAgent, DAN_AGENT, danhSachAgent, GIOI_HAN_SONG_SONG, laQuyTrinh, NHAN_NANG_LUC, QUY_TRINH } from './dan-agent';
import { NANG_LUC } from './tinh-toan';
import { QUY_TRINH_DAN_AGENT, type KetQuaNangLuc } from './kieu';

const nguonCua = (id: string) => NANG_LUC[id]?.can ?? [];
const kq = (nang_luc: string, them: Partial<KetQuaNangLuc> = {}): KetQuaNangLuc =>
  ({ nang_luc, nhom: 'bao_cao', tom_tat: `Tóm tắt ${nang_luc}.`, the: [], de_xuat: [], nguon: [], trang: [], ...them });

function dongHo() { let t = 1_000_000; return () => (t += 5); }

describe('đàn agent — cấu hình', () => {
  it('mọi năng lực của agent và quy trình là khoá THẬT trong NANG_LUC, có nhãn đọc được', () => {
    for (const a of DAN_AGENT) for (const nl of a.nang_luc) {
      expect(NANG_LUC[nl], `${a.id}.${nl}`).toBeDefined();
      expect(NHAN_NANG_LUC[nl], nl).toBeTruthy();
    }
    const agent = new Set(DAN_AGENT.map((a) => a.id));
    for (const [q, qt] of Object.entries(QUY_TRINH)) for (const [a, nl] of qt.tac_vu) {
      expect(agent.has(a), `${q}: agent ${a}`).toBe(true);
      expect(DAN_AGENT.find((x) => x.id === a)?.nang_luc, `${q}: ${a} không có ${nl}`).toContain(nl);
    }
  });

  it('chỉ ba quy trình trong allowlist', () => {
    expect(Object.keys(QUY_TRINH).sort()).toEqual([...QUY_TRINH_DAN_AGENT].sort());
    expect(laQuyTrinh('ke_toan_hang_ngay')).toBe(true);
    expect(laQuyTrinh('xoa_du_lieu')).toBe(false);
    expect(laQuyTrinh('__proto__')).toBe(false);
    expect(laQuyTrinh('constructor')).toBe(false);
    expect(laQuyTrinh('toString')).toBe(false);
  });
});

describe('đàn agent — một lần chạy', () => {
  it('đọc dữ liệu ĐÚNG MỘT lần cho hợp mọi nguồn; không gọi mô hình; kết quả mỗi năng lực một lần', async () => {
    const docNguon = vi.fn(async (can: Set<string>) => ({ can }));
    const chayNangLuc = vi.fn(async (id: string) => kq(id));
    const r = await chayDanAgent('ke_toan_hang_ngay', { docNguon, chayNangLuc, nguonCua, congTyId: 'cty-1', now: dongHo(), taoId: () => 'lc-1' });
    expect(docNguon).toHaveBeenCalledTimes(1);
    const hop = new Set(QUY_TRINH.ke_toan_hang_ngay.tac_vu.flatMap(([, nl]) => nguonCua(nl)));
    expect(docNguon.mock.calls[0][0]).toEqual(hop);
    expect(r.dan_agent).toMatchObject({ lan_chay_id: 'lc-1', cong_ty_id: 'cty-1', trang_thai: 'hoan_tat' });
    expect(r.dan_agent.tai_nguyen).toMatchObject({ so_tac_vu: 5, so_agent: 3, so_nguon_doc: hop.size, so_luot_mo_hinh: 0, gioi_han_song_song: GIOI_HAN_SONG_SONG });
    expect(r.ket_qua.map((x) => x.nang_luc)).toEqual(['chi_phi_thang', 'thieu_chung_tu', 'giao_dich_bat_thuong', 'yeu_cau_cho_duyet', 'chuan_bi_han_thue']);
    expect(r.dan_agent.tac_vu[0].ten).toBe('Kế toán · Chi phí tháng này');
    expect(r.dan_agent.gioi_han.join(' ')).toMatch(/Chỉ đọc và soạn nháp/);
  });

  it('không quá giới hạn song song', async () => {
    let dang = 0; let toiDa = 0;
    const chayNangLuc = async (id: string) => {
      dang++; toiDa = Math.max(toiDa, dang);
      await new Promise((r) => setTimeout(r, 5));
      dang--; return kq(id);
    };
    await chayDanAgent('ke_toan_hang_ngay', { docNguon: async () => ({}), chayNangLuc, nguonCua, congTyId: 'c', gioiHanSongSong: 2 });
    expect(toiDa).toBe(2);
  });

  it('một agent lỗi không kéo đổ agent khác → "một phần", câu lỗi thật', async () => {
    const chayNangLuc = async (id: string) => { if (id === 'doi_soat') throw new Error('bảng hoá đơn không đọc được'); return kq(id); };
    const r = await chayDanAgent('thu_hoi_cong_no', { docNguon: async () => ({}), chayNangLuc, nguonCua, congTyId: 'c' });
    expect(r.dan_agent.trang_thai).toBe('mot_phan');
    const loi = r.dan_agent.tac_vu.find((t) => t.nang_luc === 'doi_soat')!;
    expect(loi).toMatchObject({ trang_thai: 'loi', agent_id: 'doi_soat' });
    expect(loi.cau).toContain('bảng hoá đơn không đọc được');
    expect(r.dan_agent.tac_vu.find((t) => t.nang_luc === 'hoa_don_qua_han')?.trang_thai).toBe('hoan_tat');
    expect(r.ket_qua.map((x) => x.nang_luc)).toEqual(['hoa_don_qua_han']);
    expect(r.dan_agent.gioi_han.join(' ')).toMatch(/Nhắc nợ chỉ là bản nháp/);
  });

  it('nguồn chưa kết nối → tác vụ "cần bổ sung", không phải "hoàn tất" với số 0', async () => {
    const chayNangLuc = async (id: string) => kq(id, { do_day: [{ nguon: 'giao_dich', coverage_status: 'unavailable' } as never] });
    const r = await chayDanAgent('kiem_tra_so_sach', { docNguon: async () => ({}), chayNangLuc, nguonCua, congTyId: 'c' });
    expect(r.dan_agent.trang_thai).toBe('can_bo_sung');
    expect(r.dan_agent.tac_vu.every((t) => t.trang_thai === 'can_bo_sung')).toBe(true);
    expect(r.dan_agent.gioi_han.join(' ')).toMatch(/không phải bằng 0/);
  });

  it('đọc dữ liệu hỏng → mọi tác vụ lỗi với câu lỗi, không có kết quả bịa', async () => {
    const chayNangLuc = vi.fn();
    const r = await chayDanAgent('thu_hoi_cong_no', { docNguon: async () => { throw new Error('timeout'); }, chayNangLuc, nguonCua, congTyId: 'c' });
    expect(chayNangLuc).not.toHaveBeenCalled();
    expect(r.ket_qua).toEqual([]);
    expect(r.dan_agent.trang_thai).toBe('can_bo_sung');
    expect(r.dan_agent.tai_nguyen.so_nguon_doc).toBe(0);
    expect(r.dan_agent.tac_vu.every((t) => t.trang_thai === 'loi' && t.cau.includes('timeout'))).toBe(true);
  });

  it('tái sử dụng: tác vụ không cần đọc thêm nguồn nào (tác vụ trước đã cần đủ) được đánh dấu, đếm đúng', async () => {
    const r = await chayDanAgent('kiem_tra_so_sach', { docNguon: async () => ({}), chayNangLuc: async (id) => kq(id), nguonCua, congTyId: 'c' });
    const mong = (() => {
      const truoc = new Set<string>();
      return QUY_TRINH.kiem_tra_so_sach.tac_vu.map(([, nl]) => {
        const n = nguonCua(nl); const co = n.length > 0 && n.every((x) => truoc.has(x)); n.forEach((x) => truoc.add(x)); return co;
      });
    })();
    expect(r.dan_agent.tac_vu.map((t) => t.tai_su_dung)).toEqual(mong);
    expect(r.dan_agent.tai_nguyen.so_luot_tai_su_dung).toBe(mong.filter(Boolean).length);
    // dong_tien chỉ cần giao dịch — đã được đối soát đọc trước đó.
    expect(r.dan_agent.tac_vu.find((t) => t.nang_luc === 'dong_tien')?.tai_su_dung).toBe(true);
  });
});

describe('danh sách agent', () => {
  it('agent cần nguồn chưa có → "cần kết nối"; quyền luôn chỉ đọc và soạn nháp', () => {
    const ds = danhSachAgent(nguonCua, new Set(['hoa_don_ban']));
    expect(ds.find((a) => a.id === 'cong_no')?.trang_thai).toBe('can_ket_noi');
    expect(ds.find((a) => a.id === 'thue')?.trang_thai).toBe('san_sang');
    expect(ds.every((a) => a.quyen === 'chi_doc_va_soan_nhap')).toBe(true);
  });
});
