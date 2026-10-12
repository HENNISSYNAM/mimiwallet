import { describe, expect, it } from 'vitest';
import { nguongOtsu, taoAnhMau, thanhXam, xoay90, type AnhMau } from './anh';
import { apDung, kichThuocRa, maTranPhoiCanh, nanPhang, sapGoc, type BonGoc, type Diem } from './phoiCanh';
import { baoLoi, khungMacDinh, timBonGoc, tuGiacLonNhat } from './timGoc';
import { cheDoMau, cheDoTaiLieu } from './lamRo';
import { chuoiPdf, datAnhTrenTrang, docJpeg, taoPdf, A4 } from './pdf';

/**
 * Máy quét giấy tờ — kiểm phần toán trên ẢNH TỔNG HỢP (jsdom không có canvas thật).
 * Mỗi ảnh dựng từ một tứ giác biết trước, nên đáp án đúng là toạ độ đã dùng để vẽ.
 */

const trongTuGiac = (p: Diem, q: Diem[]) => {
  let trong = false;
  for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
    if ((q[i].y > p.y) !== (q[j].y > p.y) && p.x < ((q[j].x - q[i].x) * (p.y - q[i].y)) / (q[j].y - q[i].y) + q[i].x) trong = !trong;
  }
  return trong;
};

/** Ảnh: nền tối có nhiễu, tờ giấy sáng hình tứ giác `giay`, vài vạch chữ đen bên trong. */
function veAnh(rong: number, cao: number, giay: Diem[], { nen = 60, sang = 225 } = {}): AnhMau {
  const a = taoAnhMau(rong, cao);
  let hat = 12345;
  const ngauNhien = () => { hat = (hat * 1103515245 + 12345) & 0x7fffffff; return hat / 0x7fffffff; };
  const cx = giay.reduce((s, p) => s + p.x, 0) / 4;
  const cy = giay.reduce((s, p) => s + p.y, 0) / 4;
  for (let y = 0; y < cao; y++) {
    for (let x = 0; x < rong; x++) {
      const p = { x: x + 0.5, y: y + 0.5 };
      let v = nen + (ngauNhien() - 0.5) * 16;
      if (trongTuGiac(p, giay)) {
        v = sang + (ngauNhien() - 0.5) * 8;
        // Dòng chữ: vạch ngang đen ở giữa tờ giấy.
        const dy = y - cy;
        if (Math.abs(x - cx) < 40 && Math.abs(dy) < 50 && ((Math.floor(dy + 50) % 12) < 3)) v = 30;
      }
      const i = (y * rong + x) * 4;
      a.du[i] = v; a.du[i + 1] = v; a.du[i + 2] = v * 0.95; a.du[i + 3] = 255;
    }
  }
  return a;
}

const gan = (a: Diem, b: Diem, sai: number) => Math.hypot(a.x - b.x, a.y - b.y) <= sai;

describe('tìm bốn góc tờ giấy', () => {
  it('tờ giấy chụp xiên trên bàn tối: tìm đúng bốn góc (sai ≤ 2% cạnh ảnh), đúng thứ tự', () => {
    const giay: BonGoc = [{ x: 70, y: 50 }, { x: 330, y: 75 }, { x: 345, y: 420 }, { x: 45, y: 400 }];
    const kq = timBonGoc(thanhXam(veAnh(400, 480, giay)));
    expect(kq.timThay).toBe(true);
    kq.goc.forEach((p, i) => expect(gan(p, giay[i], 10), `góc ${i}: ${JSON.stringify(p)}`).toBe(true));
  });

  it('tờ giấy xoay gần 45°: vẫn tìm đủ bốn góc', () => {
    const giay: BonGoc = [{ x: 200, y: 40 }, { x: 360, y: 200 }, { x: 200, y: 360 }, { x: 40, y: 200 }];
    const kq = timBonGoc(thanhXam(veAnh(400, 400, giay)));
    expect(kq.timThay).toBe(true);
    for (const p of giay) expect(kq.goc.some((q) => gan(p, q, 10)), JSON.stringify(p)).toBe(true);
  });

  it('ảnh phẳng không có giấy: trả khung mặc định, báo không tìm thấy để người dùng kéo tay', () => {
    const a = taoAnhMau(300, 200);
    a.du.fill(128);
    const kq = timBonGoc(thanhXam(a));
    expect(kq.timThay).toBe(false);
    expect(kq.goc).toEqual(khungMacDinh(300, 200));
  });

  it('tứ giác lớn nhất trên bao lồi của một hình chữ nhật là chính nó', () => {
    const ds: Diem[] = [];
    for (let x = 0; x <= 10; x++) { ds.push({ x, y: 0 }); ds.push({ x, y: 5 }); }
    for (let y = 0; y <= 5; y++) { ds.push({ x: 0, y }); ds.push({ x: 10, y }); }
    ds.push({ x: 5, y: 2 });
    const q = tuGiacLonNhat(baoLoi(ds));
    expect(q).not.toBeNull();
    expect(sapGoc(q as Diem[])).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }, { x: 0, y: 5 }]);
  });
});

describe('nắn phẳng phối cảnh', () => {
  it('ma trận đưa đúng bốn góc nguồn tới bốn góc đích', () => {
    const tu: BonGoc = [{ x: 12, y: 8 }, { x: 300, y: 30 }, { x: 280, y: 410 }, { x: 5, y: 380 }];
    const den: BonGoc = [{ x: 0, y: 0 }, { x: 210, y: 0 }, { x: 210, y: 297 }, { x: 0, y: 297 }];
    const H = maTranPhoiCanh(tu, den);
    expect(H).not.toBeNull();
    tu.forEach((p, i) => {
      const q = apDung(H as number[], p);
      expect(q.x).toBeCloseTo(den[i].x, 6);
      expect(q.y).toBeCloseTo(den[i].y, 6);
    });
  });

  it('ba góc thẳng hàng: không dựng ma trận (không chia cho 0)', () => {
    const tu: BonGoc = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }];
    expect(maTranPhoiCanh(tu, khungMacDinh(10, 10, 0))).toBeNull();
  });

  it('sắp góc theo trên-trái, trên-phải, dưới-phải, dưới-trái dù đưa vào lộn xộn', () => {
    const g = sapGoc([{ x: 90, y: 95 }, { x: 5, y: 3 }, { x: 8, y: 90 }, { x: 100, y: 10 }]);
    expect(g).toEqual([{ x: 5, y: 3 }, { x: 100, y: 10 }, { x: 90, y: 95 }, { x: 8, y: 90 }]);
  });

  it('nắn tờ giấy xiên: ảnh ra là giấy sáng phủ kín, không lẫn nền tối', () => {
    const giay: BonGoc = [{ x: 70, y: 50 }, { x: 330, y: 75 }, { x: 345, y: 420 }, { x: 45, y: 400 }];
    const anh = veAnh(400, 480, giay);
    const { rong, cao } = kichThuocRa(giay, 2000);
    expect(rong).toBeGreaterThan(250);
    expect(cao).toBeGreaterThan(330);
    const ra = nanPhang(anh, giay, rong, cao);
    // Lấy dải viền trong 3 điểm ảnh: phải là giấy (sáng), không phải bàn (tối).
    let toi = 0;
    let dem = 0;
    for (let y = 3; y < cao - 3; y += 5) for (const x of [3, rong - 4]) { dem++; if (ra.du[(y * rong + x) * 4] < 150) toi++; }
    expect(toi / dem).toBeLessThan(0.05);
  });

  it('kích thước ra bị chặn ở cạnh tối đa, giữ tỉ lệ', () => {
    const k = kichThuocRa([{ x: 0, y: 0 }, { x: 2100, y: 0 }, { x: 2100, y: 2970 }, { x: 0, y: 2970 }], 1800);
    expect(k.cao).toBe(1800);
    expect(k.rong).toBe(Math.round((2100 * 1800) / 2970));
  });
});

describe('làm rõ trang', () => {
  /** Giấy trắng có vệt bóng (trái sáng 230, phải tối 110), chữ tối hơn nền 45% ở cả hai phía. */
  function giayCoBong(): AnhMau {
    const a = taoAnhMau(320, 200);
    for (let y = 0; y < 200; y++) {
      for (let x = 0; x < 320; x++) {
        const nen = 230 - (120 * x) / 320;
        const chu = y % 20 < 3 && x % 40 < 30;
        const v = chu ? nen * 0.45 : nen;
        const i = (y * 320 + x) * 4;
        a.du[i] = v; a.du[i + 1] = v; a.du[i + 2] = v; a.du[i + 3] = 255;
      }
    }
    return a;
  }

  it('chế độ Tài liệu: chữ ra đen, giấy ra trắng ở CẢ phía bị bóng', () => {
    const ra = cheDoTaiLieu(giayCoBong());
    const px = (x: number, y: number) => ra.du[(y * 320 + x) * 4];
    expect(px(10, 1)).toBe(0); // chữ, phía sáng
    expect(px(290, 1)).toBe(0); // chữ, phía tối
    expect(px(10, 10)).toBe(255); // giấy, phía sáng
    expect(px(300, 10)).toBe(255); // giấy, phía tối — một ngưỡng chung sẽ làm chỗ này đen
  });

  it('chế độ Màu: giấy hai phía về gần cùng độ sáng (khử bóng)', () => {
    const vao = giayCoBong();
    const ra = cheDoMau(vao);
    const px = (a: AnhMau, x: number) => a.du[(10 * 320 + x) * 4];
    expect(Math.abs(px(vao, 20) - px(vao, 300))).toBeGreaterThan(90);
    expect(Math.abs(px(ra, 20) - px(ra, 300))).toBeLessThan(40);
  });

  it('Otsu tách hai nhóm sáng tối', () => {
    const t = nguongOtsu([10, 12, 11, 9, 200, 210, 205, 199]);
    expect(t).toBeGreaterThan(12);
    expect(t).toBeLessThan(199);
  });
});

describe('xoay', () => {
  it('xoay 90° theo chiều kim đồng hồ đổi rộng/cao và đưa điểm trên-trái sang trên-phải', () => {
    const a = taoAnhMau(3, 2);
    a.du[0] = 255; // điểm (0,0)
    const r = xoay90(a, 1);
    expect([r.rong, r.cao]).toEqual([2, 3]);
    expect(r.du[(0 * 2 + 1) * 4]).toBe(255);
    expect(xoay90(xoay90(a, 1), -1).du).toEqual(a.du);
  });
});

/** JPEG tối thiểu đủ để đọc đoạn SOF0 (không cần giải mã được). */
function jpegGia(rong: number, cao: number, soKenh = 3): Uint8Array {
  return new Uint8Array([
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, // APP0 dài 4
    0xff, 0xc0, 0x00, 0x11, 0x08, cao >> 8, cao & 255, rong >> 8, rong & 255, soKenh,
    ...new Array(9).fill(0),
    0xff, 0xd9,
  ]);
}

describe('ghi PDF', () => {
  it('đọc kích thước JPEG; tệp không phải JPEG thì báo lỗi', () => {
    expect(docJpeg(jpegGia(1240, 1754))).toEqual({ rong: 1240, cao: 1754, soKenh: 3 });
    expect(() => docJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toThrow();
  });

  it('ảnh dọc → A4 dọc, ảnh ngang → A4 ngang, co vừa và đặt giữa', () => {
    const d = datAnhTrenTrang(1000, 2000);
    expect([d.trangRong, d.trangCao]).toEqual([A4.rong, A4.cao]);
    expect(d.h).toBeCloseTo(A4.cao);
    expect(d.x).toBeCloseTo((A4.rong - d.w) / 2);
    const n = datAnhTrenTrang(3000, 2000);
    expect([n.trangRong, n.trangCao]).toEqual([A4.cao, A4.rong]);
  });

  it('nhiều trang: đủ số trang, bảng xref trỏ đúng từng đối tượng', () => {
    const pdf = taoPdf([jpegGia(1240, 1754), jpegGia(1754, 1240, 1)], 'Hoá đơn tháng 9');
    const chu = new TextDecoder('latin1').decode(pdf);
    expect(chu.startsWith('%PDF-1.4')).toBe(true);
    expect(chu).toContain('/Count 2');
    expect(chu).toContain('/ColorSpace /DeviceGray');
    expect(chu.trimEnd().endsWith('%%EOF')).toBe(true);
    const startxref = Number(/startxref\n(\d+)/.exec(chu)?.[1]);
    expect(chu.slice(startxref, startxref + 4)).toBe('xref');
    const dong = chu.slice(startxref).split('\n');
    const tong = Number(dong[1].split(' ')[1]);
    expect(tong).toBe(10);
    for (let i = 1; i < tong; i++) {
      const lech = Number(dong[2 + i].slice(0, 10));
      expect(chu.slice(lech, lech + `${i} 0 obj`.length)).toBe(`${i} 0 obj`);
    }
  });

  it('tiêu đề có dấu ghi bằng UTF-16BE, ASCII thoát ngoặc', () => {
    expect(chuoiPdf('a(b)')).toBe('(a\\(b\\))');
    expect(chuoiPdf('Đơn')).toBe('<FEFF011001A1006E>');
  });

  it('không có trang thì báo lỗi, không ghi tệp rỗng', () => {
    expect(() => taoPdf([])).toThrow();
  });
});
