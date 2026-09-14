import { describe, expect, it } from 'vitest';
import { goiTacTu, HAN_LENH_TRA_MS, type Db } from '../cong-tac-tu';
import { bamKhoa, sinhKhoa } from '../khoa';
import { xuLyMcp } from '../../mcp/may-chu';
import { DbGia, type Dong } from './db-gia';

/**
 * Kiểm TÍCH HỢP cả vòng agent xin chi: khoá → ghi trước giữ chỗ → đọc bối cảnh →
 * bộ luật → cập nhật → nhật ký. Chạy trên `DbGia`, không chạm CSDL thật.
 *
 * Bộ case vàng kiểm bộ luật đứng riêng; file này kiểm những thứ chỉ lộ ra khi
 * nối vào dữ liệu: bối cảnh có được đọc đúng không, dòng có được ghi đúng không,
 * và các bất biến an toàn (không duyệt lọt trần khi gọi đồng thời, agent này
 * không đọc được yêu cầu của agent kia).
 */

const GIO = 3_600_000;
const truoc = (ms: number) => new Date(Date.now() - ms).toISOString();

async function moiTruong(chinhSach: Dong = {}) {
  const db = new DbGia();
  const khoa = sinhKhoa();
  const company_id = 'cong-ty-1';
  const tac_tu_id = 'agent-1';
  db.bang.tac_tu.push({ id: tac_tu_id, company_id, ten: 'agent-thu', trang_thai: 'hoat_dong', khoa_bam: await bamKhoa(khoa) });
  db.bang.chinh_sach_chi.push({
    tac_tu_id, company_id,
    han_muc_moi_lan: 5_000_000, han_muc_ngay: 20_000_000, han_muc_thang: 100_000_000,
    nguong_can_duyet: 2_000_000, nhom_chi_duoc_phep: null, chi_tra_nguoi_nhan_da_duyet: false,
    het_han: null, so_yeu_cau_moi_gio: 30,
    ...chinhSach,
  });
  db.bang.nguoi_nhan_duoc_phep.push({
    id: 'nn-1', company_id, ngan_hang_bin: '970422', so_tai_khoan: '2431122002',
    ten_chu_tai_khoan: 'CÔNG TY TNHH ABC', created_at: truoc(30 * 24 * GIO),
  });
  const goi = (hanhDong: string, body: Dong = {}, k = khoa) => goiTacTu(db as unknown as Db, k, hanhDong, body);
  return { db, khoa, company_id, tac_tu_id, goi };
}

const xin = (sua: Dong = {}): Dong => ({
  so_tien: 500_000, ngan_hang_bin: '970422', so_tai_khoan: '2431122002',
  nhom_chi: 'quang_cao', muc_dich: 'Nạp ngân sách quảng cáo tháng 9', ...sua,
});

const maLyDo = (body: Dong): string[] => (body.yeu_cau?.ly_do ?? body.ly_do ?? []).map((l: Dong) => l.ma);

describe('khoá và quyền', () => {
  it('khoá sai khuôn → 401, không ghi gì', async () => {
    const m = await moiTruong();
    const r = await m.goi('xin_chi', xin(), 'mimi_ak_sai');
    expect(r.status).toBe(401);
    expect(r.body.ma).toBe('KHOA_SAI');
    expect(m.db.bang.yeu_cau_chi).toHaveLength(0);
  });

  it('khoá đúng khuôn nhưng không tồn tại → 401', async () => {
    const m = await moiTruong();
    const r = await m.goi('xem_chinh_sach', {}, sinhKhoa());
    expect(r.status).toBe(401);
  });

  it('agent đã thu hồi → 403 trước khi làm gì', async () => {
    const m = await moiTruong();
    m.db.bang.tac_tu[0].trang_thai = 'thu_hoi';
    const r = await m.goi('xin_chi', xin());
    expect(r.status).toBe(403);
    expect(m.db.bang.yeu_cau_chi).toHaveLength(0);
  });

  it('hành động lạ → 400', async () => {
    const m = await moiTruong();
    expect((await m.goi('chuyen_tien')).status).toBe(400);
  });
});

describe('xin chi — trọn vòng', () => {
  it('trong chính sách: đã duyệt, có lệnh trả, hạn 72 giờ, một dòng nhật ký', async () => {
    const m = await moiTruong();
    const r = await m.goi('xin_chi', xin());
    expect(r.status).toBe(200);
    const yc = r.body.yeu_cau;
    expect(yc.trang_thai).toBe('da_duyet');
    expect(yc.lenh_tra.noi_dung_chuyen_khoan).toBe(yc.ma_tham_chieu);
    expect(yc.ma_tham_chieu).toMatch(/^MIMI/);
    const conLai = new Date(yc.lenh_tra.het_han_luc).getTime() - Date.now();
    expect(Math.abs(conLai - HAN_LENH_TRA_MS)).toBeLessThan(60_000);
    expect(m.db.bang.nhat_ky_tac_tu.filter((n) => n.su_kien === 'xin_chi')).toHaveLength(1);
  });

  it('gửi lại cùng mã yêu cầu: trả yêu cầu cũ, không ghi dòng thứ hai', async () => {
    const m = await moiTruong();
    const a = await m.goi('xin_chi', xin({ ma_yeu_cau: 'don-001' }));
    const b = await m.goi('xin_chi', xin({ ma_yeu_cau: 'don-001' }));
    expect(b.body.trung_lap).toBe(true);
    expect(b.body.yeu_cau.id).toBe(a.body.yeu_cau.id);
    expect(m.db.bang.yeu_cau_chi).toHaveLength(1);
  });

  it('số tiền sai khuôn: 422, không có dòng yêu cầu, có nhật ký sai khuôn', async () => {
    const m = await moiTruong();
    const r = await m.goi('xin_chi', xin({ so_tien: 'năm trăm' }));
    expect(r.status).toBe(422);
    expect(m.db.bang.yeu_cau_chi).toHaveLength(0);
    expect(m.db.bang.nhat_ky_tac_tu.some((n) => n.su_kien === 'xin_chi_sai_khuon')).toBe(true);
  });

  it('khoản trước giữ chỗ hạn mức ngày cho khoản sau', async () => {
    const m = await moiTruong({ nguong_can_duyet: 10_000_000 });
    for (let i = 0; i < 4; i++) expect((await m.goi('xin_chi', xin({ so_tien: 5_000_000 }))).body.yeu_cau.trang_thai).toBe('da_duyet');
    const r = await m.goi('xin_chi', xin({ so_tien: 5_000_000 }));
    expect(r.status).toBe(422);
    expect(maLyDo(r.body)).toContain('VUOT_HAN_MUC_NGAY');
  });

  it('BẤT BIẾN: gọi đồng thời không bao giờ duyệt lọt quá trần ngày', async () => {
    const m = await moiTruong({ nguong_can_duyet: 10_000_000, so_yeu_cau_moi_gio: null });
    const kq = await Promise.all(Array.from({ length: 8 }, () => m.goi('xin_chi', xin({ so_tien: 5_000_000 }))));
    for (const r of kq) expect([200, 422]).toContain(r.status);
    const daDuyet = m.db.bang.yeu_cau_chi
      .filter((y) => y.trang_thai === 'da_duyet')
      .reduce((s, y) => s + Number(y.so_tien), 0);
    expect(daDuyet).toBeLessThanOrEqual(20_000_000);
    // Nếu từ chối hết thì bất biến trên đúng một cách vô nghĩa — phải có khoản được duyệt.
    expect(daDuyet).toBeGreaterThan(0);
    expect(m.db.bang.yeu_cau_chi.some((y) => y.trang_thai === 'dang_xet')).toBe(false);
  });
});

describe('ba luật an toàn khi nối dữ liệu thật', () => {
  it('tần suất: đếm đúng yêu cầu trong 60 phút của chính agent này', async () => {
    const m = await moiTruong();
    for (let i = 0; i < 30; i++) {
      m.db.bang.yeu_cau_chi.push(m.db.macDinh('yeu_cau_chi', {
        company_id: m.company_id, tac_tu_id: m.tac_tu_id, so_tien: 1000, ngan_hang_bin: '970422',
        so_tai_khoan: '2431122002', muc_dich: 'vòng lặp', nhom_chi: 'quang_cao', trang_thai: 'tu_choi',
        ma_tham_chieu: `MIMICU${String(i).padStart(4, '0')}`, created_at: truoc(10 * 60_000),
      }));
    }
    // Yêu cầu cũ hơn 60 phút và của agent khác không được tính.
    m.db.bang.yeu_cau_chi.push(m.db.macDinh('yeu_cau_chi', {
      company_id: m.company_id, tac_tu_id: 'agent-khac', so_tien: 1000, ngan_hang_bin: '970422', so_tai_khoan: '2431122002',
      muc_dich: 'khác', nhom_chi: 'quang_cao', trang_thai: 'tu_choi', ma_tham_chieu: 'MIMIKHAC01', created_at: truoc(60_000),
    }));
    const r = await m.goi('xin_chi', xin());
    expect(r.status).toBe(422);
    expect(maLyDo(r.body)).toEqual(['VUOT_TAN_SUAT']);
  });

  it('tần suất: yêu cầu cũ hơn 60 phút không tính', async () => {
    const m = await moiTruong({ so_yeu_cau_moi_gio: 1 });
    m.db.bang.yeu_cau_chi.push(m.db.macDinh('yeu_cau_chi', {
      company_id: m.company_id, tac_tu_id: m.tac_tu_id, so_tien: 1000, ngan_hang_bin: '970422', so_tai_khoan: '2431122002',
      muc_dich: 'hôm qua', nhom_chi: 'quang_cao', trang_thai: 'tu_choi', ma_tham_chieu: 'MIMICU9999', created_at: truoc(2 * GIO),
    }));
    expect((await m.goi('xin_chi', xin())).body.yeu_cau.trang_thai).toBe('da_duyet');
  });

  it('đổi số tài khoản: đọc lịch sử đã chi của công ty và dừng lại', async () => {
    const m = await moiTruong();
    m.db.bang.yeu_cau_chi.push(m.db.macDinh('yeu_cau_chi', {
      company_id: m.company_id, tac_tu_id: m.tac_tu_id, so_tien: 3_000_000, ngan_hang_bin: '970436',
      so_tai_khoan: '0071000123456', ten_nguoi_nhan: 'Công ty TNHH Minh Long', muc_dich: 'hàng tháng 8',
      nhom_chi: 'nha_cung_cap', trang_thai: 'da_chi', ma_tham_chieu: 'MIMIDACHI1', created_at: truoc(20 * 24 * GIO),
    }));
    const r = await m.goi('xin_chi', xin({
      so_tai_khoan: '9999888877', ten_nguoi_nhan: 'CONG TY TNHH MINH LONG', nhom_chi: 'nha_cung_cap', muc_dich: 'Tiền hàng tháng 9',
    }));
    expect(r.body.yeu_cau.trang_thai).toBe('cho_duyet');
    expect(maLyDo(r.body)).toEqual(expect.arrayContaining(['NGUOI_NHAN_MOI', 'DOI_SO_TAI_KHOAN']));
  });

  it('người nhận vừa thêm: giữ 24 giờ, và tên trong danh sách thắng tên agent khai', async () => {
    const m = await moiTruong();
    m.db.bang.nguoi_nhan_duoc_phep.push({
      id: 'nn-moi', company_id: m.company_id, ngan_hang_bin: '970432', so_tai_khoan: '111222333',
      ten_chu_tai_khoan: 'CÔNG TY THẬT', created_at: truoc(GIO),
    });
    const r = await m.goi('xin_chi', xin({ ngan_hang_bin: '970432', so_tai_khoan: '111222333', ten_nguoi_nhan: 'TÊN AGENT TỰ KHAI' }));
    expect(r.body.yeu_cau.trang_thai).toBe('cho_duyet');
    expect(maLyDo(r.body)).toEqual(['NGUOI_NHAN_MOI_THEM']);
    expect(m.db.bang.yeu_cau_chi[0].ten_nguoi_nhan).toBe('CÔNG TY THẬT');
  });
});

describe('đọc', () => {
  it('xem chính sách trả trần tần suất và hạn mức còn lại dạng snake_case', async () => {
    const m = await moiTruong();
    const r = await m.goi('xem_chinh_sach');
    expect(r.body.chinh_sach.so_yeu_cau_moi_gio).toBe(30);
    expect(Object.keys(r.body.han_muc_con_lai).sort()).toEqual(['moi_lan', 'ngay', 'thang']);
  });

  it('CÁCH LY: agent không đọc được yêu cầu của agent khác', async () => {
    const m = await moiTruong();
    m.db.bang.yeu_cau_chi.push(m.db.macDinh('yeu_cau_chi', {
      id: 'yc-cua-agent-khac', company_id: m.company_id, tac_tu_id: 'agent-2', so_tien: 1000, ngan_hang_bin: '970422',
      so_tai_khoan: '2431122002', muc_dich: 'bí mật', nhom_chi: 'quang_cao', trang_thai: 'da_duyet', ma_tham_chieu: 'MIMIBIMAT1',
    }));
    expect((await m.goi('xem_yeu_cau', { id: 'yc-cua-agent-khac' })).status).toBe(404);
    expect((await m.goi('xem_yeu_cau', {})).status).toBe(400);
  });
});

describe('qua cửa MCP', () => {
  it('tools/call xin_chi đi đúng bộ xử lý chung và không phải lỗi công cụ', async () => {
    const m = await moiTruong();
    const tra = await xuLyMcp(
      { jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'xin_chi', arguments: xin() } },
      { coKhoa: true, chay: (ten: string, doiSo: Dong) => m.goi(ten, doiSo) },
    ) as Dong;
    expect(tra.result.isError).not.toBe(true);
    expect(m.db.bang.yeu_cau_chi).toHaveLength(1);
    expect(m.db.bang.yeu_cau_chi[0].trang_thai).toBe('da_duyet');
  });
});
