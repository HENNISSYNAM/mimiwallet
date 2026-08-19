import { describe, it, expect } from 'vitest';
import {
  chonBanTin,
  tinDangDua,
  laNgayCuaTip,
  chiSoNgay,
  bam,
  TIPS,
  CHU_KY_TIP,
  type NewsItem,
} from './dailyBrief';

const tin = (over: Partial<NewsItem> = {}): NewsItem => ({
  id: 'n1',
  title: 'NHNN hạ lãi suất điều hành',
  summary: null,
  url: 'https://vnexpress.net/x',
  source: 'VnExpress',
  published_at: '2026-08-19T02:00:00Z',
  topic: 'interest_rate',
  impact: 'positive',
  ...over,
});

const NGAY = '2026-08-19';

/** Tìm một ngày mà công ty này KHÔNG rơi vào lượt tip, để test nhánh tin. */
function ngayCoTin(companyId: string): string {
  for (let i = 0; i < CHU_KY_TIP + 2; i++) {
    const d = new Date(Date.parse(`${NGAY}T00:00:00Z`) + i * 86_400_000)
      .toISOString().slice(0, 10);
    if (!laNgayCuaTip(d, companyId)) return d;
  }
  throw new Error('không có ngày nào dành cho tin — chu kỳ tip sai');
}

describe('tinDangDua — thẻ chiếm chỗ đẹp nhất nên phải trả lại thứ dùng được', () => {
  it('nhận tin còn mới, có chủ đề, có chiều', () => {
    expect(tinDangDua(tin(), NGAY)).toBe(true);
  });

  it('loại tin quá cũ — đó là lưu trữ, không phải tin', () => {
    expect(tinDangDua(tin({ published_at: '2026-08-01T02:00:00Z' }), NGAY)).toBe(false);
  });

  it('loại tin chưa phân loại được chủ đề', () => {
    expect(tinDangDua(tin({ topic: 'general' }), NGAY)).toBe(false);
  });

  it('loại tin không biết tốt hay xấu cho người đang vay', () => {
    expect(tinDangDua(tin({ impact: 'neutral' }), NGAY)).toBe(false);
  });

  it('loại tin có ngày đăng ở tương lai — dữ liệu hỏng, không phải tin sốt dẻo', () => {
    expect(tinDangDua(tin({ published_at: '2026-09-01T00:00:00Z' }), NGAY)).toBe(false);
  });
});

describe('tất định theo ngày — bản tin, không phải máy quay số', () => {
  it('gọi lại nhiều lần trong cùng một ngày cho ra đúng một thẻ', () => {
    const ds = [tin({ id: 'a' }), tin({ id: 'b' }), tin({ id: 'c' })];
    const lan = Array.from({ length: 20 }, () => chonBanTin(ds, TIPS, NGAY, 'com-1'));
    expect(new Set(lan.map((r) => JSON.stringify(r))).size).toBe(1);
  });

  it('thứ tự truy vấn đổi cũng không đổi kết quả', () => {
    const ds = [tin({ id: 'a' }), tin({ id: 'b' }), tin({ id: 'c' })];
    const d = ngayCoTin('com-1');
    expect(chonBanTin(ds, TIPS, d, 'com-1')).toEqual(
      chonBanTin([...ds].reverse(), TIPS, d, 'com-1'),
    );
  });

  it('hai công ty cùng ngày không bị ép nhận đúng một thẻ', () => {
    const ds = Array.from({ length: 8 }, (_, i) => tin({ id: `n${i}` }));
    const ket = new Set(
      Array.from({ length: 12 }, (_, i) => JSON.stringify(chonBanTin(ds, TIPS, NGAY, `com-${i}`))),
    );
    expect(ket.size).toBeGreaterThan(1);
  });
});

describe('tip', () => {
  it('không có tin nào đạt chuẩn thì đưa tip, không đưa tiêu đề chung chung', () => {
    const r = chonBanTin([tin({ topic: 'general' })], TIPS, NGAY, 'com-1');
    expect(r?.kind).toBe('tip');
  });

  it('không có tin lẫn tip thì trả null, để giao diện ẩn thẻ thay vì dựng khung rỗng', () => {
    expect(chonBanTin([], [], NGAY, 'com-1')).toBeNull();
  });

  it('tip vẫn xuất hiện đều cả khi lúc nào cũng có tin tốt', () => {
    // "lâu lâu sẽ là tip" — nếu tip chỉ là thứ lấp chỗ trống thì vào tuần nhiều
    // tin nó biến mất hẳn, mà tip mới là phần dạy người dùng dùng sản phẩm.
    const ds = [tin()];
    const loai = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(Date.parse(`${NGAY}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10);
      return chonBanTin(ds.map((n) => ({ ...n, published_at: `${d}T02:00:00Z` })), TIPS, d, 'com-1')?.kind;
    });
    expect(loai.filter((k) => k === 'tip').length).toBeGreaterThan(0);
    expect(loai.filter((k) => k === 'news').length).toBeGreaterThan(0);
  });

  it('không lặp lại tip hai ngày liền', () => {
    const ids = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(Date.parse(`${NGAY}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10);
      const r = chonBanTin([], TIPS, d, 'com-1');
      return r?.kind === 'tip' ? r.tip.id : null;
    });
    for (let i = 1; i < ids.length; i++) expect(ids[i]).not.toBe(ids[i - 1]);
  });
});

describe('bộ TIPS', () => {
  it('id không trùng nhau — trùng là một tip bị xoay vòng bỏ qua', () => {
    expect(new Set(TIPS.map((t) => t.id)).size).toBe(TIPS.length);
  });

  it('mọi tip đều có đủ eyebrow, tiêu đề và nội dung', () => {
    for (const t of TIPS) {
      expect(t.eyebrow.length).toBeGreaterThan(0);
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.body.length).toBeGreaterThan(40);
    }
  });

  it('tip nào nhắc tới mốc ngày hoặc số tiền thì phải dẫn nguồn', () => {
    // Ràng buộc trung thực viết thành test: con số không nguồn là thứ đã phải
    // gỡ khỏi repo này nhiều lần rồi.
    for (const t of TIPS) {
      const coSo = /\d{2}\/\d{2}\/\d{4}|\btỷ\b|\btriệu\b/.test(t.body);
      if (coSo) expect(t.nguon, `tip "${t.id}" nêu số mà không có nguồn`).toBeTruthy();
    }
  });
});

describe('bam và chiSoNgay', () => {
  it('bam luôn trả số nguyên không âm', () => {
    for (const s of ['', 'com-1', 'x'.repeat(200)]) {
      expect(bam(s)).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(bam(s))).toBe(true);
    }
  });

  it('chiSoNgay tăng đúng một đơn vị mỗi ngày', () => {
    expect(chiSoNgay('2026-08-20') - chiSoNgay('2026-08-19')).toBe(1);
  });
});
