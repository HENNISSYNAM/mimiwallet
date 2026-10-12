import { describe, expect, it } from 'vitest';
import {
  buocTiep,
  buocTruoc,
  docKhungGioGo,
  docLenh,
  docTien,
  nhanTraLoi,
  thanLuuChinhSach,
  timAgent,
  type Nhap,
} from './hoiThoai';

describe('docTien — số tiền người Việt hay gõ, ra số nguyên đồng', () => {
  it.each([
    ['500k', 500_000],
    ['2tr', 2_000_000],
    ['1,5tr', 1_500_000],
    ['1.5 triệu', 1_500_000],
    ['2 tỷ', 2_000_000_000],
    ['1.500.000', 1_500_000],
    ['1,500,000', 1_500_000],
    ['1500000đ', 1_500_000],
    ['300.000 đồng', 300_000],
  ])('%s → %d', (vao, ra) => expect(docTien(vao)).toBe(ra));

  it.each(['', 'abc', '0', '-500k', '1,5', '1.2.3tr', '12.34', '99999999999999999'])('"%s" → null', (vao) => {
    expect(docTien(vao)).toBeNull();
  });
});

describe('docKhungGioGo', () => {
  it('"8-20" là mọi ngày', () => {
    expect(docKhungGioGo('8-20')).toEqual({ tuPhut: 480, denPhut: 1200, thu: [1, 2, 3, 4, 5, 6, 7] });
  });
  it('"08:00–17:30 t2-t6"', () => {
    expect(docKhungGioGo('08:00–17:30 t2-t6')).toEqual({ tuPhut: 480, denPhut: 1050, thu: [1, 2, 3, 4, 5] });
  });
  it('qua đêm "22-6"', () => {
    expect(docKhungGioGo('22-6')?.tuPhut).toBe(1320);
  });
  it('sai khuôn hoặc trùng giờ → null', () => {
    expect(docKhungGioGo('8-8')).toBeNull();
    expect(docKhungGioGo('25-6')).toBeNull();
    expect(docKhungGioGo('8-20 t6-t2')).toBeNull();
    expect(docKhungGioGo('sáng')).toBeNull();
  });
});

describe('nhanTraLoi', () => {
  it('tên theo đúng giới hạn máy chủ 2–80', () => {
    expect(nhanTraLoi('ten', 'a', {}).ok).toBe(false);
    expect(nhanTraLoi('ten', 'x'.repeat(81), {}).ok).toBe(false);
    expect(nhanTraLoi('ten', '  Agent QC  ', {})).toEqual({ ok: true, nhap: { ten: 'Agent QC' } });
  });

  it('nhóm: mã, tên không dấu, hoặc mọi nhóm', () => {
    expect(nhanTraLoi('nhom', 'quang_cao, phan mem', {})).toEqual({ ok: true, nhap: { nhom: ['quang_cao', 'phan_mem'] } });
    expect(nhanTraLoi('nhom', 'moi_nhom', {})).toEqual({ ok: true, nhap: { nhom: null } });
    expect(nhanTraLoi('nhom', 'mua sắm', {})).toEqual({ ok: false, loi: 'NHOM_LA' });
  });

  it('giữ thứ tự hạn mức mỗi lần ≤ ngày ≤ tháng như máy chủ', () => {
    expect(nhanTraLoi('ngay', '1tr', { moiLan: 2_000_000 })).toEqual({ ok: false, loi: 'NGAY_NHO_HON_MOI_LAN' });
    expect(nhanTraLoi('thang', '1tr', { ngay: 2_000_000 })).toEqual({ ok: false, loi: 'THANG_NHO_HON_NGAY' });
    expect(nhanTraLoi('ngay', '2tr', { moiLan: 2_000_000 }).ok).toBe(true);
  });

  it('ngưỡng duyệt nhận 0 (mọi khoản phải duyệt), hạn mức thì không', () => {
    expect(nhanTraLoi('nguong', '0', {})).toEqual({ ok: true, nhap: { nguong: 0 } });
    expect(nhanTraLoi('moiLan', '0', {}).ok).toBe(false);
  });

  it('khung giờ từ nút và từ chữ gõ', () => {
    const k = nhanTraLoi('khungGio', 'ngay_thuong', {});
    expect(k.ok && k.nhap.khungGio?.thu).toEqual([1, 2, 3, 4, 5]);
    expect(nhanTraLoi('khungGio', 'moi_luc', {})).toEqual({ ok: true, nhap: { khungGio: null } });
    expect(nhanTraLoi('khungGio', 'buổi sáng', {})).toEqual({ ok: false, loi: 'GIO_SAI' });
  });
});

describe('thứ tự bước', () => {
  it('không có khung giờ thì bỏ qua câu "ngoài giờ thì sao", cả khi đi tới lẫn quay lại', () => {
    expect(buocTiep('khungGio', { khungGio: null })).toBe('hetHan');
    expect(buocTruoc('hetHan', { khungGio: null })).toBe('khungGio');
    const k = { tuPhut: 480, denPhut: 1200, thu: [1] };
    expect(buocTiep('khungGio', { khungGio: k })).toBe('ngoaiGio');
    expect(buocTruoc('hetHan', { khungGio: k })).toBe('ngoaiGio');
  });
  it('đầu và cuối không tràn', () => {
    expect(buocTruoc('ten', {})).toBe('ten');
    expect(buocTiep('xacNhan', {})).toBe('xacNhan');
  });
});

describe('thanLuuChinhSach — đúng thân của hành động luu_chinh_sach sẵn có', () => {
  const co: Nhap = {
    ten: 'QC', nhom: ['quang_cao'], moiLan: 1_000_000, ngay: 5_000_000, thang: 50_000_000, nguong: 500_000,
    chiNguoiDaDuyet: true, tranNguoiNhan: null, khungGio: null, hetHanNgay: null,
  };
  it('không đặt khung giờ/trần người nhận thì KHÔNG gửi các trường mới (máy chủ giữ nguyên)', () => {
    const t = thanLuuChinhSach(co, 'tt-1');
    expect(t).toEqual({
      tac_tu_id: 'tt-1', han_muc_moi_lan: 1_000_000, han_muc_ngay: 5_000_000, han_muc_thang: 50_000_000,
      nguong_can_duyet: 500_000, nhom_chi_duoc_phep: ['quang_cao'], chi_tra_nguoi_nhan_da_duyet: true, het_han: null,
    });
  });
  it('có đặt thì gửi ở dạng lưu snake_case', () => {
    const t = thanLuuChinhSach(
      { ...co, tranNguoiNhan: 3_000_000, khungGio: { tuPhut: 480, denPhut: 1200, thu: [1, 2] }, ngoaiGio: 'tu_choi', hetHanNgay: 30 },
      'tt-1',
      new Date('2026-10-11T00:00:00Z'),
    );
    expect(t.khung_gio_chi).toEqual({ tu_phut: 480, den_phut: 1200, thu: [1, 2] });
    expect(t.ngoai_khung_gio).toBe('tu_choi');
    expect(t.han_muc_moi_nguoi_nhan_thang).toBe(3_000_000);
    expect(t.het_han).toBe('2026-11-10T00:00:00.000Z');
  });
});

describe('lệnh', () => {
  it('đọc lệnh và tham số, chấp nhận tên kiểu BotFather', () => {
    expect(docLenh('/hanmuc Agent quảng cáo')).toEqual({ lenh: 'hanmuc', thamSo: 'Agent quảng cáo' });
    expect(docLenh('/newbot')).toEqual({ lenh: 'taoagent', thamSo: '' });
    expect(docLenh('/CANCEL')).toEqual({ lenh: 'huy', thamSo: '' });
    expect(docLenh('/xoahet')).toEqual({ lenh: null, ten: 'xoahet' });
    expect(docLenh('500k')).toBeNull();
  });

  it('tìm agent: trùng khít thắng, nhiều kết quả thì trả hết để hỏi lại', () => {
    const ds = [{ id: '1', ten: 'Agent QC' }, { id: '2', ten: 'Agent QC mới' }, { id: '3', ten: 'Kho' }];
    expect(timAgent(ds, 'agent qc').map((a) => a.id)).toEqual(['1']);
    expect(timAgent(ds, 'agent').map((a) => a.id)).toEqual(['1', '2']);
    expect(timAgent(ds, 'không có')).toEqual([]);
    expect(timAgent(ds, '')).toEqual([]);
  });
});
