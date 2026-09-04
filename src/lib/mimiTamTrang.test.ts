import { describe, it, expect } from 'vitest';
import { tamTrang, POSE_DUNG, type TinhHinh, type Pose } from './mimiTamTrang';

describe('tamTrang — mặt vui không được đè lên tin xấu', () => {
  it('tiền vừa về NHƯNG có việc hỏng thì vẫn báo việc hỏng', () => {
    // Đây là hồi quy cho một lỗi chưa xảy ra nhưng rất dễ xảy ra: xếp
    // `vuaCoTienVe` lên trước thì Mimi cười trong lúc liên kết ngân hàng đang
    // chết. Cùng loại với ngõ cụt "bấm Cập nhật" — giao diện nói câu dễ chịu
    // trong khi sự thật là chuyện khác.
    const ra = tamTrang({ vuaCoTienVe: true, soViecCanXuLy: 2 });
    expect(ra.pose).toBe('look-side');
    expect(ra.cau).toContain('2 việc');
  });

  it('tiền vừa về NHƯNG có bất thường thì báo bất thường', () => {
    expect(tamTrang({ vuaCoTienVe: true, coBatThuong: true }).pose).toBe('surprised');
  });

  it('bất thường đứng trên việc cần xử lý', () => {
    expect(tamTrang({ coBatThuong: true, soViecCanXuLy: 5 }).pose).toBe('surprised');
  });
});

describe('tamTrang — không bịa cảm xúc khi không biết gì', () => {
  it('chưa có dữ liệu thì NGỦ, không cười', () => {
    const ra = tamTrang({ chuaCoDuLieu: true });
    expect(ra.pose).toBe('sleep');
    expect(ra.cau).toContain('Chưa có dữ liệu');
  });

  it('mọi thứ yên ổn thì ngồi yên và KHÔNG nói gì', () => {
    // Trạng thái tốt thì im lặng. Một câu vui vẻ mỗi lần mở app là tiếng ồn,
    // và người dùng học cách bỏ qua nó — rồi bỏ qua luôn lúc nó nói thật.
    const ra = tamTrang({});
    expect(ra.pose).toBe('content');
    expect(ra.cau).toBeNull();
  });
});

describe('tamTrang — các trạng thái còn lại', () => {
  it('lần đầu mở app thì vẫy tay, đứng trên tất cả', () => {
    const ra = tamTrang({ lanDau: true, chuaCoDuLieu: true, soViecCanXuLy: 3 });
    expect(ra.pose).toBe('wave');
  });

  it('đang đồng bộ thì canh', () => {
    expect(tamTrang({ dangChay: true }).pose).toBe('watch');
  });

  it('tiền về mà không vướng gì thì cười', () => {
    expect(tamTrang({ vuaCoTienVe: true }).pose).toBe('laugh');
  });

  it('không việc nào cần xử lý (0) thì không coi là có việc', () => {
    expect(tamTrang({ soViecCanXuLy: 0 }).pose).toBe('content');
  });
});

describe('POSE_DUNG — danh sách nạp trước không được lệch khỏi thực tế', () => {
  it('mọi tổ hợp đầu vào chỉ sinh ra pose nằm trong POSE_DUNG', () => {
    // Duyệt hết 2^6 tổ hợp cờ. Nếu ai thêm nhánh mới mà quên khai báo pose vào
    // POSE_DUNG, ảnh đó không được nạp trước và sẽ hiện ra một khung trống —
    // đúng cái lỗi mà MimiCat đã cẩn thận tránh cho phần nháy mắt.
    const co: (keyof TinhHinh)[] = [
      'chuaCoDuLieu', 'dangChay', 'vuaCoTienVe', 'coBatThuong', 'lanDau',
    ];
    const thay = new Set<Pose>();
    for (let m = 0; m < (1 << co.length); m++) {
      for (const soViec of [0, 1, 7]) {
        const t: TinhHinh = { soViecCanXuLy: soViec };
        co.forEach((k, i) => { if (m & (1 << i)) (t as Record<string, unknown>)[k] = true; });
        thay.add(tamTrang(t).pose);
      }
    }
    for (const p of thay) expect(POSE_DUNG).toContain(p);
  });

  it('không khai thừa — mọi pose khai báo đều thật sự đạt tới được', () => {
    const co: (keyof TinhHinh)[] = [
      'chuaCoDuLieu', 'dangChay', 'vuaCoTienVe', 'coBatThuong', 'lanDau',
    ];
    const thay = new Set<Pose>();
    for (let m = 0; m < (1 << co.length); m++) {
      for (const soViec of [0, 1]) {
        const t: TinhHinh = { soViecCanXuLy: soViec };
        co.forEach((k, i) => { if (m & (1 << i)) (t as Record<string, unknown>)[k] = true; });
        thay.add(tamTrang(t).pose);
      }
    }
    for (const p of POSE_DUNG) expect(thay).toContain(p);
  });
});
