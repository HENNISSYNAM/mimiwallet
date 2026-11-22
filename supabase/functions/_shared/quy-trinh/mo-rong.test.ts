import { describe, expect, it, vi } from 'vitest';
import { apPhuongAn, chuanHoa, MAU, MEO, meoCua, PHUONG_AN, taiNguyenCan, viPhamLuat } from './do-thi';
import { apThaoTac, docThaoTac } from './sua-tay';
import { chonMau, THU_VIEN } from './thu-vien';
import { KIEN_THUC, kienThucChoLoiNhac, kiemChuan } from './kien-thuc';
import { goiYDieuChinh } from './goi-y';
import { goiKetNoi, urlAnToan } from './ket-noi';
import { diTiep, lanChayMoi, nguoiXuLy, trangThai } from './chay';

describe('thư viện workflow theo chu trình chuẩn', () => {
  it.each(THU_VIEN.map((m) => [m.khoa, m] as const))('%s: hợp lệ và đúng luật ở mọi phương án', (_k, m) => {
    expect(m.do_thi.nut.length).toBeGreaterThan(3);
    for (const pa of PHUONG_AN) expect(viPhamLuat(apPhuongAn(m.do_thi, pa))).toEqual([]);
  });
  it('chọn mẫu theo câu', () => {
    expect(chonMau('đóng sổ cuối tháng 11')?.khoa).toBe('dong_so_thang');
    expect(chonMau('trả tiền nhà cung cấp tuần này')?.khoa).toBe('tra_ncc');
    expect(chonMau('nhân viên nghỉ việc thứ sáu')?.khoa).toBe('nghi_viec');
    expect(chonMau('bị hack tài khoản email')?.khoa).toBe('su_co');
    expect(chonMau('xyz')).toBeNull();
  });
});

describe('kho kiến thức & kiểm chuẩn nghề', () => {
  it('mỗi lĩnh vực đủ 4 mặt: vị trí, kỹ thuật, tên gọi chuyên môn, giấy tờ', () => {
    for (const k of Object.values(KIEN_THUC)) {
      for (const f of ['vai_tro', 'ky_thuat', 'thuat_ngu', 'giay_to', 'chuan', 'nguyen_tac'] as const) expect(k[f].length).toBeGreaterThan(0);
    }
    expect(kienThucChoLoiNhac('thanh_toan')).toMatch(/Khớp 3 bên[\s\S]*Uỷ nhiệm chi/);
  });
  it('chuyển tiền mà không kiểm người nhận → lỗi; cùng vai vừa duyệt vừa chi → lỗi tách nhiệm vụ', () => {
    const d = chuanHoa({ nut: [
      { id: 'a', loai: 'kich_hoat', ten: 'Bắt đầu' },
      { id: 'd', loai: 'duyet', ten: 'Duyệt chi', vai_tro: 'Kế toán trưởng' },
      { id: 'c', loai: 'nguoi', ten: 'Chuyển tiền', tac_dong: 'chuyen_tien', vai_tro: 'Kế toán trưởng' },
    ] });
    const cb = kiemChuan(apPhuongAn(d, 'nguoi_ai'), 'thanh_toan').map((x) => x.cau).join(' | ');
    expect(cb).toMatch(/xác minh người nhận/);
    expect(cb).toMatch(/Phân tách nhiệm vụ/);
  });
});

describe('sửa tay', () => {
  const goc = chuanHoa(MAU.thanh_toan.do_thi);
  it('thêm sau / xoá / đổi người làm / đổi mèo — vẫn đúng luật', () => {
    let d = apThaoTac(goc, docThaoTac({ thao_tac: 'them_sau', nut_id: 'doc_hd', ten: 'Kiểm trùng hoá đơn', lam: 'agent' }));
    const moi = d.nut[d.nut.findIndex((n) => n.id === 'doc_hd') + 1];
    expect(moi.ten).toBe('Kiểm trùng hoá đơn');
    expect(d.canh).toContainEqual({ tu: 'doc_hd', den: moi.id });
    d = apThaoTac(d, { thao_tac: 'xoa', nut_id: moi.id });
    expect(d.canh).toContainEqual({ tu: 'doc_hd', den: 'kiem_nhan' });
    d = apThaoTac(d, { thao_tac: 'doi_meo', nut_id: 'kiem_nhan', meo: 'bao_ve' });
    expect(apPhuongAn(d, 'ai').nut.find((n) => n.id === 'kiem_nhan')!.meo).toBe('bao_ve');
    for (const pa of PHUONG_AN) expect(viPhamLuat(apPhuongAn(d, pa))).toEqual([]);
  });
  it('không cho agent chuyển tiền, không xoá bước đầu, không sửa cổng luật', () => {
    expect(() => apThaoTac(goc, { thao_tac: 'doi_nguoi_lam', nut_id: 'chuyen', lam: 'agent' })).toThrow(/không chuyển tiền/);
    expect(() => apThaoTac(goc, { thao_tac: 'xoa', nut_id: 'bat_dau' })).toThrow();
    expect(() => apThaoTac(goc, { thao_tac: 'xoa', nut_id: 'duyet_chuyen' })).toThrow(/luật an toàn/);
    expect(() => docThaoTac({ thao_tac: 'xoa_het' })).toThrow();
  });
  it('mỗi bước agent có một mèo; đủ 12 mèo để chọn', () => {
    expect(MEO).toHaveLength(12);
    const h = apPhuongAn(chuanHoa(MAU.thanh_toan.do_thi), 'ai', { linhVuc: 'thanh_toan' });
    for (const n of h.nut.filter((x) => x.lam === 'agent' && x.loai !== 'kich_hoat')) expect(MEO).toContain(n.meo);
    expect(meoCua({ ten: 'Kiểm người nhận', cong_cu: null }, 'thanh_toan')).toBe('bao_ve');
  });
});

describe('rẽ nhánh sau duyệt', () => {
  const d = apPhuongAn(apThaoTac(chuanHoa(THU_VIEN.find((m) => m.khoa === 'hoan_ung')!.do_thi), { thao_tac: 'them_nhanh_sua', nut_id: 'ql', ten: 'Trả lại bổ sung chứng từ' }), 'nguoi_ai');
  const gio = (() => { let t = 0; return () => new Date(Date.parse('2026-11-22T00:00:00Z') + (t += 1000)).toISOString(); })();
  const chayToi = async (quyet: 'duyet' | 'tu_choi') => {
    let l = await diTiep(d, lanChayMoi(d, gio()), async () => 'ok', gio);
    for (let i = 0; i < 6; i++) {
      const c = d.nut.find((n) => l.buoc[n.id].tt === 'can_nguoi' || l.buoc[n.id].tt === 'chan');
      if (!c) break;
      l = await diTiep(d, nguoiXuLy(d, l, c.id, c.id === 'ql' ? quyet : c.loai === 'duyet' ? 'duyet' : 'xong', null, gio()), async () => 'ok', gio);
      if (c.id === 'ql') break;
    }
    return l;
  };
  it('Cần sửa → đi nhánh sửa, nhánh đạt bị bỏ qua, không dừng cả lượt', async () => {
    const l = await chayToi('tu_choi');
    expect(trangThai(d, l)).not.toBe('dung');
    const sua = d.nut.find((n) => n.ten === 'Trả lại bổ sung chứng từ')!;
    expect(l.buoc[sua.id].tt).toBe('can_nguoi');
    expect(l.buoc.chuyen.tt).toBe('bo_qua');
  });
  it('Duyệt → đi nhánh đạt, nhánh sửa bị bỏ qua', async () => {
    const l = await chayToi('duyet');
    const sua = d.nut.find((n) => n.ten === 'Trả lại bổ sung chứng từ')!;
    expect(l.buoc[sua.id].tt).toBe('bo_qua');
  });
});

describe('tự điều chỉnh', () => {
  it('bước cần kết nối → đề xuất kết nối hoặc giao người; số đo thật nhanh hơn ≥20% → đề xuất đổi phương án', () => {
    const d = apPhuongAn(chuanHoa(MAU.thanh_toan.do_thi), 'nguoi_ai');
    const hs = (ms: number) => ({ tong_ms: ms, cho_nguoi_ms: 0, agent_ms: 0, buoc_agent: 0, buoc_nguoi: 0, lam_tay: 0 });
    const g = goiYDieuChinh(d, 'nguoi_ai', null, [
      { phuong_an: 'nguoi_ai', trang_thai: 'xong', hieu_suat: hs(1000) }, { phuong_an: 'ai', trang_thai: 'xong', hieu_suat: hs(500) },
    ]);
    expect(g.some((x) => x.hanh_dong.thao_tac === 'ket_noi')).toBe(true);
    expect(g.some((x) => x.hanh_dong.thao_tac === 'doi_nguoi_lam')).toBe(true);
    expect(g.find((x) => x.hanh_dong.thao_tac === 'doi_phuong_an')?.cau).toMatch(/nhanh hơn 50%/);
    expect(goiYDieuChinh(d, 'nguoi_ai', null, []).some((x) => x.hanh_dong.thao_tac === 'doi_phuong_an')).toBe(false);
  });
});

describe('kết nối tại bước', () => {
  it('chỉ https công khai (chống SSRF)', () => {
    expect(urlAnToan('https://api.misa.vn/v1/x')).toBe('https://api.misa.vn/v1/x');
    for (const u of ['http://api.x.vn', 'https://localhost/a', 'https://10.0.0.1/a', 'https://192.168.1.2', 'https://169.254.169.254/latest', 'https://user:pw@x.vn', 'https://intranet', 'ftp://x.vn', '']) {
      expect(urlAnToan(u), u).toBeNull();
    }
  });
  it('bước đã kết nối tính là tự động; gọi API thật đúng phương thức', async () => {
    const d = apPhuongAn(chuanHoa(MAU.thanh_toan.do_thi), 'ai', { daKetNoi: new Set(['doc_chung_tu']) });
    expect(d.nut.find((n) => n.id === 'doc_hd')!.nhan).toBe('tu_dong');
    expect(taiNguyenCan(d, {}, new Set(['doc_chung_tu'])).find((t) => t.nut_id === 'doc_hd')!.co_san).toBe(true);
    const goi = vi.fn(async () => new Response('{"so_tien":1000}', { status: 200 }));
    const kq = await goiKetNoi({ cong_cu: 'doc_chung_tu', kieu: 'api', url: 'https://api.x.vn/doc', khoa: null, khoa_hien: null, cong_cu_mcp: null }, d.nut.find((n) => n.id === 'doc_hd')!, 'trả NCC', undefined, goi);
    expect(kq).toMatch(/so_tien/);
    expect((goi.mock.calls[0] as unknown as [string, RequestInit])[1].method).toBe('GET');
  });
});
