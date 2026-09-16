import { describe, expect, it } from 'vitest';
import {
  chiPhiAi, chiPhiThang, danhSachKetNoi, duLieuTrong, modelReHon, nghiTraTrung, NANG_LUC, phanTichNhanh, phanTichTietKiem, thangLui,
  thieuChungTu, tinhHinhAgent, viecHomNay, yeuCauChoDuyet, type DuLieu, type GiaoDichTL,
} from './tinh-toan';
import { ghepChungTu } from '../chung-tu/khop-chung-tu';
import { LOAI_DE_XUAT, NHOM_NANG_LUC } from './kieu';

/** Mọi con số dưới đây là đầu vào của test, không đi vào sản phẩm. */
const HOM_NAY = '2026-09-15';
const KY = { tu: '2026-07-01', den: '2026-09-30', nhan: 'quý III/2026' };
const moi = (p: Partial<DuLieu> = {}): DuLieu => ({ ...duLieuTrong(HOM_NAY, KY), ...p });
let so = 0;
const gd = (p: Partial<GiaoDichTL>): GiaoDichTL => ({
  id: `gd${++so}`, amount: 100_000, type: 'expense', transaction_date: HOM_NAY, merchant_name: null, category: null,
  counter_account_name: 'CONG TY A', payment_reference: null, ...p,
});

describe('danh mục năng lực', () => {
  it('mọi năng lực thuộc một trong 7 nhóm, và trả kết quả khi không có dữ liệu', () => {
    const d = moi();
    for (const [id, nl] of Object.entries(NANG_LUC)) {
      expect(NHOM_NANG_LUC).toContain(nl.nhom);
      const r = nl.chay(d);
      expect(r.nang_luc).toBe(id);
      expect(r.tom_tat.length).toBeGreaterThan(10);
      for (const dx of r.de_xuat) expect(LOAI_DE_XUAT).toContain(dx.loai);
    }
  });

  it('không có dữ liệu thì không có con số giả nào', () => {
    const d = moi();
    for (const nl of Object.values(NANG_LUC)) {
      const r = nl.chay(d);
      expect(r.tom_tat).not.toMatch(/\b0 ₫|\$0\.00/);
    }
  });
});

describe('nghĩa vụ thuế', () => {
  const suKien = {
    nam: 2026, homNay: HOM_NAY, loai: 'ho_kinh_doanh' as const, doanhThuQuy: [200e6, 200e6, 200e6, 0] as [number, number, number, number],
    nguonDoanhThu: 'hoa_don_dien_tu' as const, nhomNganh: ['dich_vu' as const], kenh: 'dia_diem_co_dinh' as const,
    phuongPhapTncn: null, batDauKinhDoanh: null, daNopThueTrongNam: null, nganhDacThu: null, doanhThuNamTruoc: null, coQuanHeLienKet: null,
  };

  it('dưới ngưỡng: nói được miễn, đưa mẫu và hạn, mở được trang Tờ khai', () => {
    const r = NANG_LUC.nghia_vu_thue.chay(moi({ thue: { suKien, canhBao: [], canCuDaKiem: {} } }));
    expect(r.tom_tat).toContain('Không chịu thuế giá trị gia tăng');
    expect(r.tom_tat).toContain('Không phải nộp thuế thu nhập cá nhân');
    const bang = r.the.find((t) => t.loai === 'bang');
    expect(bang && bang.loai === 'bang' && bang.dong.some((d) => d[1] === '01/TKN-CNKD' && d[2] === '2027-01-31')).toBe(true);
    expect(r.de_xuat[0]).toMatchObject({ loai: 'mo_trang', tham_so: { duong_dan: '/dashboard/to-khai' } });
    expect(r.nguon.map((n) => n.ten)).toContain('Kho văn bản Công báo');
  });

  it('nêu rõ quan hệ nhân quả giữa GTGT và TNCN', () => {
    const r = NANG_LUC.nghia_vu_thue.chay(moi({ thue: { suKien, canhBao: [], canCuDaKiem: {} } }));
    const ghi = r.the.filter((t) => t.loai === 'ghi_chu').map((t) => (t.loai === 'ghi_chu' ? t.cau : '')).join(' ');
    expect(ghi).toContain('song song');
  });

  it('căn cứ chưa đối chiếu được với kho thì nói ra', () => {
    const r = NANG_LUC.nghia_vu_thue.chay(moi({ thue: { suKien, canhBao: [], canCuDaKiem: { nd68_d3_k1: false } } }));
    const ghi = r.the.filter((t) => t.loai === 'ghi_chu').map((t) => (t.loai === 'ghi_chu' ? t.cau : '')).join(' ');
    expect(ghi).toContain('chưa đối chiếu được');
  });

  it('chưa có hồ sơ thuế thì mời bổ sung, không đoán', () => {
    const r = NANG_LUC.nghia_vu_thue.chay(moi());
    expect(r.tom_tat).toContain('Chưa đọc được hồ sơ thuế');
    expect(r.the).toEqual([]);
  });
});

describe('yêu cầu chờ duyệt', () => {
  it('chỉ đề xuất duyệt/từ chối cho khoản đang chờ, nói rõ MIMI không chuyển tiền', () => {
    const d = moi({
      tacTu: [{ id: 't1', ten: 'Trợ lý quảng cáo', trang_thai: 'hoat_dong' }],
      yeuCau: [
        { id: 'y1', tac_tu_id: 't1', so_tien: 2_000_000, ten_nguoi_nhan: 'CONG TY A', muc_dich: 'Quảng cáo', trang_thai: 'cho_duyet', created_at: '2026-09-14T02:00:00Z', so_tien_thuc_chi: null, ly_do: [{ ma: 'VUOT_NGUONG', cau: 'Vượt ngưỡng cần duyệt.' }] },
        { id: 'y2', tac_tu_id: 't1', so_tien: 500_000, ten_nguoi_nhan: 'B', muc_dich: 'x', trang_thai: 'da_duyet', created_at: '2026-09-14T02:00:00Z', so_tien_thuc_chi: null, ly_do: [] },
      ],
    });
    const r = yeuCauChoDuyet(d);
    expect(r.tom_tat).toContain('Có 1 khoản đang chờ bạn duyệt');
    expect(r.de_xuat.map((x) => x.loai)).toEqual(['duyet_yeu_cau', 'tu_choi_yeu_cau']);
    expect(r.de_xuat[0].tham_so).toEqual({ yeu_cau_id: 'y1' });
    expect(r.de_xuat[0].mo_ta).toContain('Vượt ngưỡng cần duyệt.');
    expect(r.de_xuat[0].mo_ta).toContain('MIMI không chuyển tiền');
    // Mã lỗi nội bộ không lọt ra câu người dùng đọc.
    expect(JSON.stringify(r)).not.toContain('VUOT_NGUONG');
  });
});

describe('tình hình agent', () => {
  it('đề xuất tạm dừng agent bị từ chối nhiều, không đề xuất cho agent đã tạm dừng', () => {
    const tuChoi = (tac_tu_id: string) => ({ id: `r${++so}`, tac_tu_id, so_tien: 1, ten_nguoi_nhan: null, muc_dich: 'x', trang_thai: 'tu_choi', created_at: '2026-09-14T00:00:00Z', so_tien_thuc_chi: null, ly_do: [] });
    const d = moi({
      tacTu: [{ id: 'a', ten: 'Bot A', trang_thai: 'hoat_dong' }, { id: 'b', ten: 'Bot B', trang_thai: 'tam_dung' }],
      chinhSach: [{ tac_tu_id: 'a', han_muc_thang: 1_000_000 }],
      yeuCau: [tuChoi('a'), tuChoi('a'), tuChoi('a'), tuChoi('b'), tuChoi('b'), tuChoi('b'),
        { id: 'ok', tac_tu_id: 'a', so_tien: 900_000, ten_nguoi_nhan: null, muc_dich: 'x', trang_thai: 'da_chi', created_at: '2026-09-02T00:00:00Z', so_tien_thuc_chi: 850_000, ly_do: [] }],
    });
    const r = tinhHinhAgent(d);
    expect(r.de_xuat.map((x) => x.tham_so.tac_tu_id)).toEqual(['a']);
    // Đã chi thật thì tính số tiền thực chi.
    expect(r.tom_tat).toContain('Bot A đã dùng 85% hạn mức tháng');
  });
});

describe('chi phí tháng', () => {
  it('khoản chi ngân hàng ghi số dương vẫn là tiền ra (type quyết định)', () => {
    const d = moi({
      giaoDich: [
        gd({ amount: 300_000, transaction_date: '2026-09-10' }),
        gd({ amount: 5_000_000, type: 'income', transaction_date: '2026-09-10' }),
        gd({ amount: 200_000, transaction_date: '2026-08-10' }),
        gd({ amount: 900_000, transaction_date: '2026-08-20' }),
      ],
    });
    const r = chiPhiThang(d);
    const soLieu = r.the[0];
    expect(soLieu.loai === 'so_lieu' && soLieu.muc.map((m) => m.gia_tri)).toEqual([300_000, 200_000, 50]);
    expect(r.tom_tat).toContain('tăng 50%');
  });
});

describe('thiếu chứng từ', () => {
  it('cùng con số với hàm ghép của màn Chứng từ; chứng từ quét chỉ ghi chú, không đổi tổng', () => {
    const chi = [
      gd({ id: 'c1', amount: 1_000_000, transaction_date: '2026-08-01' }),
      gd({ id: 'c2', amount: 2_000_000, transaction_date: '2026-08-05', payment_reference: 'TT HD 00012345' }),
      gd({ id: 'c3', amount: 700_000, transaction_date: '2026-06-30' }), // ngoài kỳ
    ];
    const d = moi({
      giaoDich: chi,
      hoaDonVao: [{ id: 'h1', total_amount: 2_000_000, issued_at: '2026-08-03T00:00:00Z', invoice_number: '00012345', counterparty_name: 'X', counterparty_tax_code: null }],
      chungTuQuet: [{ id: 'q1', tong_tien: 1_000_000, ngay: '2026-08-02', giao_dich_id: null }],
    });
    const r = thieuChungTu(d);
    const g = ghepChungTu(
      [{ id: 'c1', soTien: 1_000_000, ngay: '2026-08-01', noiDung: null, tenNguoiNhan: 'CONG TY A' }, { id: 'c2', soTien: 2_000_000, ngay: '2026-08-05', noiDung: 'TT HD 00012345', tenNguoiNhan: 'CONG TY A' }],
      [{ id: 'h1', soTien: 2_000_000, ngay: '2026-08-03', soHoaDon: '00012345', tenBenBan: 'X', maSoThueBenBan: null }],
    );
    const soLieu = r.the[0];
    expect(soLieu.loai === 'so_lieu' && soLieu.muc.find((m) => m.nhan === 'Chưa có hoá đơn điện tử')?.gia_tri).toBe(g.tongChuaCoGiay);
    expect(g.tongChuaCoGiay).toBe(1_000_000);
    expect(r.tom_tat).toContain('1 khoản đã có chứng từ quét');
    // Khoản đã có chứng từ quét không nằm trong bảng "chưa có giấy tờ".
    expect(r.the.some((t) => t.loai === 'bang')).toBe(false);
  });
});

describe('chi phí AI', () => {
  it('số API thắng file cùng ngày; vượt ngân sách thì nói rõ; kết nối cũ thì đề xuất lấy số mới', () => {
    const d = moi({
      chiPhiAi: [
        { nha_cung_cap: 'openai', ngay: '2026-09-10', hang_muc: 'gpt-4o', so_tien_usd: 60, nguon: 'api' },
        { nha_cung_cap: 'openai', ngay: '2026-09-10', hang_muc: 'gpt-4o', so_tien_usd: 999, nguon: 'nhap_file' },
        { nha_cung_cap: 'gemini', ngay: '2026-09-11', hang_muc: 'gemini', so_tien_usd: 50, nguon: 'nhap_file' },
      ],
      nganSachAi: { han_muc_thang_usd: 100, canh_bao_phan_tram: 80 },
      ketNoiAi: [{ nha_cung_cap: 'openai', trang_thai: 'hoat_dong', dong_bo_luc: '2026-09-14T00:00:00Z', loi_cuoi: null }],
    });
    const r = chiPhiAi(d);
    expect(r.tom_tat).toContain('$110.00');
    expect(r.tom_tat).toContain('VƯỢT ngân sách $100.00 (dùng 110%)');
    expect(r.de_xuat.map((x) => x.loai)).toEqual(['dong_bo_chi_phi_ai']);
    expect(viecHomNay(d).map((v) => v.khoa)).toContain('ngan_sach_ai');
  });

  it('chưa có bảng giá thì đề xuất lấy bảng giá, không đoán giá', () => {
    const d = moi({ tokenAi: [{ nha_cung_cap: 'openai', ngay: '2026-09-10', model: 'gpt-4o', token_vao: 10, token_vao_cache: 0, token_ra: 10, so_lan_goi: 1 }] });
    const r = modelReHon(d);
    expect(r.de_xuat.map((x) => x.loai)).toEqual(['cap_nhat_bang_gia']);
    expect(r.the).toEqual([]);
  });
});

describe('phân tích tiết kiệm', () => {
  it('nghi trả trùng: cùng người nhận + số tiền trong 3 ngày; bỏ khoản nhỏ và khoản xa', () => {
    const d = moi({
      giaoDich: [
        gd({ amount: 1_500_000, transaction_date: '2026-09-01' }),
        gd({ amount: 1_500_000, transaction_date: '2026-09-03' }),
        gd({ amount: 1_500_000, transaction_date: '2026-09-12' }),
        gd({ amount: 20_000, transaction_date: '2026-09-01' }),
        gd({ amount: 20_000, transaction_date: '2026-09-01' }),
      ],
    });
    expect(nghiTraTrung(d)).toHaveLength(1);
    expect(phanTichTietKiem(d).tom_tat).toContain('1 cặp khoản chi');
  });
});

describe('kết nối', () => {
  it('Gemini chỉ nhập file; ngân hàng cần đăng nhập lại là cần xử lý', () => {
    const d = moi({
      nhapFileAi: ['gemini'],
      ketNoiNganHang: [{ id: 'k', bank_name: 'MB', account_number: '0123456789', status: 'needs_relink', scopes: 'transaction', provider: 'bankhub', last_synced_at: null }],
    });
    const ds = danhSachKetNoi(d);
    expect(ds.find((k) => k.khoa === 'gemini')?.trang_thai).toBe('chi_nhap_file');
    expect(ds.find((k) => k.khoa === 'ngan_hang')?.trang_thai).toBe('can_xu_ly');
    expect(ds.find((k) => k.khoa === 'tong_cuc_thue')?.trang_thai).toBe('chua_ket_noi');
    expect(viecHomNay(d)[0].khoa).toBe('dang_nhap_lai');
  });
});

describe('ba thẻ phân tích ở màn đầu', () => {
  it('lùi tháng qua năm', () => {
    expect(thangLui('2026-02-10', 3)).toBe('2025-11');
    expect(thangLui('2026-09-15', 0)).toBe('2026-09');
  });

  it('chưa có gì: không số giả, không đề xuất bịa, không khoản chờ', () => {
    const p = phanTichNhanh(moi());
    expect(p.chi_phi_ai).toBeNull();
    expect(p.toi_uu.tiet_kiem_usd).toBeNull();
    expect(p.toi_uu.y).toEqual(['Liên kết ngân hàng hoặc tải chi phí AI để MIMI bắt đầu tìm chỗ tiết kiệm']);
    expect(p.can_xac_nhan).toEqual({ so_khoan: 0, tong_tien: 0, muc: [] });
  });

  it('chi phí AI: tháng chưa có số là null chứ không phải 0; so cùng kỳ tháng trước', () => {
    const p = phanTichNhanh(moi({
      chiPhiAi: [
        { nha_cung_cap: 'openai', ngay: '2026-08-05', hang_muc: 'gpt', so_tien_usd: 40, nguon: 'api' },
        { nha_cung_cap: 'openai', ngay: '2026-08-25', hang_muc: 'gpt', so_tien_usd: 500, nguon: 'api' },
        { nha_cung_cap: 'openai', ngay: '2026-09-05', hang_muc: 'gpt', so_tien_usd: 50, nguon: 'api' },
      ],
    }));
    expect(p.chi_phi_ai?.thang_nay_usd).toBe(50);
    // Cùng kỳ tháng trước (01–15/08) là $40, không phải cả tháng $540.
    expect(p.chi_phi_ai?.thay_doi_phan_tram).toBe(25);
    expect(p.chi_phi_ai?.theo_thang.map((t) => t.usd)).toEqual([null, null, null, 540, 50]);
    expect(p.chi_phi_ai?.theo_thang.map((t) => t.nhan)).toEqual(['T5', 'T6', 'T7', 'T8', 'T9']);
    expect(p.toi_uu.y).toContain('Đặt ngân sách AI tháng để được cảnh báo trước khi vượt');
  });

  it('cần xác nhận: khoản chờ lâu nhất trước, kèm đúng đề xuất duyệt của khoản đó', () => {
    const cho = (id: string, luc: string, so_tien: number) => ({ id, tac_tu_id: 't', so_tien, ten_nguoi_nhan: null, muc_dich: `Mua ${id}`, trang_thai: 'cho_duyet', created_at: luc, so_tien_thuc_chi: null, ly_do: [] });
    const p = phanTichNhanh(moi({
      tacTu: [{ id: 't', ten: 'Bot mua hàng', trang_thai: 'hoat_dong' }],
      yeuCau: [cho('b', '2026-09-14T00:00:00Z', 300), cho('a', '2026-09-10T00:00:00Z', 200)],
    }));
    expect(p.can_xac_nhan.so_khoan).toBe(2);
    expect(p.can_xac_nhan.tong_tien).toBe(500);
    expect(p.can_xac_nhan.muc.map((m) => m.yeu_cau_id)).toEqual(['a', 'b']);
    expect(p.can_xac_nhan.muc[0].duyet?.tham_so).toEqual({ yeu_cau_id: 'a' });
    expect(p.can_xac_nhan.muc[0]).toMatchObject({ agent: 'Bot mua hàng', nguoi_nhan: 'Người nhận chưa rõ tên' });
  });
});
