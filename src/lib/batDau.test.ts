import { describe, it, expect } from 'vitest';
import {
  dungCacBuoc,
  soBuocXong,
  xongHet,
  buocTiepTheo,
  type TinhTrang,
} from './batDau';

const tt = (over: Partial<TinhTrang> = {}): TinhTrang => ({
  soLienKet: 0,
  soGiaoDich: 0,
  soKhachHang: 0,
  ...over,
});

describe('bước chỉ xanh khi dữ liệu thật nói vậy', () => {
  it('người dùng hoàn toàn mới: chưa bước nào xong', () => {
    const bs = dungCacBuoc(tt());
    expect(soBuocXong(bs)).toBe(0);
    expect(xongHet(bs)).toBe(false);
  });

  it('có liên kết ngân hàng thì bước 1 tự xong, không cần bấm gì', () => {
    const bs = dungCacBuoc(tt({ soLienKet: 1 }));
    expect(bs[0].xong).toBe(true);
  });

  it('liên kết đã ngắt không tính — soLienKet chỉ đếm liên kết đang hoạt động', () => {
    // Nơi gọi phải lọc `status != disconnected` trước khi truyền vào đây.
    expect(dungCacBuoc(tt({ soLienKet: 0 })).map((b) => b.xong)).toEqual([false, false]);
  });

  it('xong hết khi cả hai điều kiện đều thật', () => {
    // Từng là ba bước. Bước "Thêm khách hàng" bỏ ngày 04/09 vì nó là ngõ cụt —
    // không nơi nào trong mã ghi vào bảng `clients` — và vì danh bạ khách hàng
    // nằm ở phía doanh thu, trong khi việc khách cần là chứng minh chi phí.
    const bs = dungCacBuoc(tt({ soLienKet: 1, soGiaoDich: 42 }));
    expect(xongHet(bs)).toBe(true);
    expect(soBuocXong(bs)).toBe(2);
  });

  it('không còn bước nào trỏ vào trang không thêm được dữ liệu', () => {
    // Hồi quy cho chính ngõ cụt đó: checklist chỉ được chứa bước mà người dùng
    // thật sự làm xong được bằng giao diện.
    expect(dungCacBuoc(tt()).map((b) => b.ma)).not.toContain('them_khach_hang');
  });
});

describe('khoá bước chưa làm được', () => {
  it('chưa liên kết ngân hàng thì bước sau bị khoá', () => {
    const bs = dungCacBuoc(tt());
    expect(bs[0].moKhoa).toBe(true);
    // Mọi bước sau bước liên kết đều khoá — viết theo số bước thật thay vì
    // liệt kê chỉ số, để bỏ hay thêm bước không làm test này sai lặng lẽ.
    expect(bs.slice(1).every((b) => !b.moKhoa)).toBe(true);
    expect(bs.length).toBeGreaterThan(1);
  });

  it('liên kết xong thì mở khoá phần còn lại', () => {
    const bs = dungCacBuoc(tt({ soLienKet: 1 }));
    expect(bs.every((b) => b.moKhoa)).toBe(true);
  });

  it('"chưa làm" khác "chưa làm được" — bước khoá vẫn là chưa xong', () => {
    // Nếu gộp hai trạng thái này, màn hình sẽ mời người dùng đi tìm một nút
    // chưa tồn tại.
    const b = dungCacBuoc(tt())[1];
    expect(b.xong).toBe(false);
    expect(b.moKhoa).toBe(false);
  });
});

describe('buocTiepTheo — chỉ trỏ vào thứ bấm được', () => {
  it('người mới được trỏ vào liên kết ngân hàng', () => {
    expect(buocTiepTheo(dungCacBuoc(tt()))!.ma).toBe('lien_ket_ngan_hang');
  });

  it('bỏ qua bước đã xong; hết bước thì trả null', () => {
    const bs = dungCacBuoc(tt({ soLienKet: 1, soGiaoDich: 5 }));
    expect(buocTiepTheo(bs)).toBeNull();
  });

  it('không bao giờ trỏ vào bước đang khoá', () => {
    const b = buocTiepTheo(dungCacBuoc(tt()))!;
    expect(b.moKhoa).toBe(true);
  });

  it('xong hết thì trả null để giao diện ẩn hẳn thẻ', () => {
    const bs = dungCacBuoc(tt({ soLienKet: 2, soGiaoDich: 100 }));
    expect(buocTiepTheo(bs)).toBeNull();
  });
});

describe('mọi bước đều dẫn tới một nơi thật', () => {
  it('đường dẫn khớp bảng route trong App.tsx', () => {
    const hopLe = ['/dashboard', '/dashboard/fintech', '/dashboard/clients'];
    for (const b of dungCacBuoc(tt())) {
      expect(hopLe).toContain(b.duongDan);
    }
  });

  it('không bước nào thiếu tiêu đề hay mô tả', () => {
    for (const b of dungCacBuoc(tt())) {
      expect(b.tieuDe.length).toBeGreaterThan(0);
      expect(b.moTa.length).toBeGreaterThan(20);
    }
  });
});
