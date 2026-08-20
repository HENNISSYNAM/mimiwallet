import { describe, it, expect } from 'vitest';
import {
  brier,
  diemBrier,
  soSanhVoiNenTang,
  hieuChuan,
  laPhatBieuKiemChungDuoc,
  MAU_TOI_THIEU,
  type DuDoan,
} from './predictions';

const dd = (over: Partial<DuDoan> = {}): DuDoan => ({
  id: 'p1',
  claim: 'Lãi suất điều hành giảm ít nhất 0,25 điểm trước 30/09/2026',
  confidence: 0.7,
  resolve_on: '2026-09-30',
  outcome: 'pending',
  ...over,
});

const bo = (n: number, conf: number, soDung: number): DuDoan[] =>
  Array.from({ length: n }, (_, i) =>
    dd({ id: `p${i}`, confidence: conf, outcome: i < soDung ? 'correct' : 'wrong' }),
  );

describe('brier', () => {
  it('dự đoán chắc chắn và trúng thì điểm 0', () => {
    expect(brier(1, true)).toBe(0);
  });

  it('dự đoán chắc chắn và trượt thì điểm 1 — mức phạt tối đa', () => {
    expect(brier(1, false)).toBe(1);
  });

  it('nói 0,5 luôn cho 0,25, dù kết quả nào', () => {
    // 0,5 là "tôi không biết". Nó không bao giờ bị phạt nặng, cũng không bao
    // giờ được thưởng — đúng như phải thế.
    expect(brier(0.5, true)).toBe(0.25);
    expect(brier(0.5, false)).toBe(0.25);
  });

  it('kẹp xác suất ngoài khoảng thay vì cho ra điểm vô nghĩa', () => {
    expect(brier(1.5, true)).toBe(0);
    expect(brier(-0.3, false)).toBe(0);
  });
});

describe('diemBrier', () => {
  it('chưa có dự đoán nào kết luận thì trả null, KHÔNG trả 0', () => {
    // 0 là điểm hoàn hảo. Trả 0 lúc chưa đo được gì sẽ hiện lên màn hình thành
    // "dự đoán tuyệt đối chính xác" — nói dối đúng theo hướng dễ tin nhất.
    expect(diemBrier([])).toBeNull();
    expect(diemBrier([dd(), dd({ outcome: 'unresolvable' })])).toBeNull();
  });

  it('bỏ qua dự đoán chưa tới hạn và loại không kết luận được', () => {
    const ds = [
      dd({ id: 'a', confidence: 1, outcome: 'correct' }),
      dd({ id: 'b', outcome: 'pending' }),
      dd({ id: 'c', outcome: 'unresolvable' }),
    ];
    expect(diemBrier(ds)).toBe(0);
  });
});

describe('soSanhVoiNenTang — con số duy nhất đáng nhìn', () => {
  it('luôn nói 0,9 mà chỉ đúng 50% thì THUA nền', () => {
    const r = soSanhVoiNenTang(bo(20, 0.9, 10))!;
    expect(r.tyLeNen).toBe(0.5);
    // Nền nói 0,5 cho mọi câu → Brier 0,25. Người quá tự tin thì tệ hơn.
    expect(r.diemNenTang).toBeCloseTo(0.25, 5);
    expect(r.diem).toBeGreaterThan(r.diemNenTang);
    expect(r.hon).toBeLessThan(0);
  });

  it('độ tự tin CỐ ĐỊNH bằng tỷ lệ nền thì hoà, dù nghe rất giỏi', () => {
    // Nói 0,9 cho mọi câu và đúng 90% số lần. Nhưng tỷ lệ nền cũng là 0,9, nên
    // người dự đoán và nền là một. Đây là tính chất của phép đo, không phải lỗi:
    // hô cùng một con số mãi thì không mang thêm thông tin nào.
    const r = soSanhVoiNenTang(bo(20, 0.9, 18))!;
    expect(r.hon).toBeCloseTo(0, 10);
  });

  it('PHÂN BIỆT được mới là hơn nền', () => {
    // Nói 0,9 cho 10 thứ đã xảy ra, nói 0,1 cho 10 thứ đã không xảy ra.
    // Tỷ lệ nền 0,5 nên nền ăn 0,25; người phân biệt được ăn 0,01.
    const ds = [
      ...Array.from({ length: 10 }, (_, i) =>
        dd({ id: `a${i}`, confidence: 0.9, outcome: 'correct' as const })),
      ...Array.from({ length: 10 }, (_, i) =>
        dd({ id: `b${i}`, confidence: 0.1, outcome: 'wrong' as const })),
    ];
    const r = soSanhVoiNenTang(ds)!;
    expect(r.tyLeNen).toBe(0.5);
    expect(r.diemNenTang).toBeCloseTo(0.25, 5);
    expect(r.diem).toBeCloseTo(0.01, 5);
    expect(r.hon).toBeGreaterThan(0.2);
  });

  it('đánh dấu chưa đủ mẫu — mười lần may mắn trông y hệt mười lần giỏi', () => {
    expect(soSanhVoiNenTang(bo(5, 0.9, 5))!.duMau).toBe(false);
    expect(soSanhVoiNenTang(bo(MAU_TOI_THIEU, 0.9, 18))!.duMau).toBe(true);
  });

  it('chưa có gì kết luận thì trả null', () => {
    expect(soSanhVoiNenTang([dd()])).toBeNull();
  });
});

describe('hieuChuan — chỉ ra vì sao điểm tệ', () => {
  it('phát hiện quá tự tin: nói 90% nhưng chỉ đúng 50%', () => {
    const o = hieuChuan(bo(20, 0.9, 10));
    const cao = o.find((x) => x.nhan === '80–100%')!;
    expect(cao.soLuong).toBe(20);
    expect(cao.tuTinTrungBinh).toBeCloseTo(0.9, 5);
    expect(cao.thucTe).toBe(0.5);
  });

  it('ô cuối lấy cả biên phải, nếu không dự đoán 100% rơi ra ngoài mọi ô', () => {
    const o = hieuChuan(bo(4, 1, 4));
    expect(o.reduce((s, x) => s + x.soLuong, 0)).toBe(4);
  });

  it('bỏ qua ô rỗng thay vì hiện hàng loạt dòng 0/0', () => {
    expect(hieuChuan(bo(6, 0.7, 3)).length).toBe(1);
  });
});

describe('laPhatBieuKiemChungDuoc — hàng rào quan trọng nhất', () => {
  it('nhận phát biểu có mốc thời gian và điều kiện dứt khoát', () => {
    expect(laPhatBieuKiemChungDuoc(
      'Lãi suất điều hành giảm ít nhất 0,25 điểm trước 30/09/2026',
    ).ok).toBe(true);
  });

  it('bác "thị trường sẽ biến động" — đúng trong mọi trường hợp nên vô dụng', () => {
    const r = laPhatBieuKiemChungDuoc('Thị trường sẽ biến động trong thời gian tới');
    expect(r.ok).toBe(false);
    expect(r.lyDo).toContain('biến động');
  });

  it('bác từ nước đôi — không chấm sai được thì không phải dự đoán', () => {
    expect(laPhatBieuKiemChungDuoc('Tỷ giá có thể tăng mạnh trong quý tới').ok).toBe(false);
    expect(laPhatBieuKiemChungDuoc('Nhiều khả năng NHNN sẽ nới room tín dụng').ok).toBe(false);
  });

  it('bác phát biểu không có số lẫn chiều so sánh', () => {
    const r = laPhatBieuKiemChungDuoc('Chính sách mới sẽ được ban hành sớm thôi nhé');
    expect(r.ok).toBe(false);
    expect(r.lyDo).toContain('con số');
  });

  it('bác phát biểu quá ngắn', () => {
    expect(laPhatBieuKiemChungDuoc('Tăng').ok).toBe(false);
  });

  it('nhận phát biểu chỉ có chiều, không có số', () => {
    expect(laPhatBieuKiemChungDuoc('Giá vàng trong nước giảm so với ngày 20/08/2026').ok).toBe(true);
  });
});
