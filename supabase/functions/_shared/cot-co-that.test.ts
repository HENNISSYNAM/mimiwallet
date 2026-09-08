import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * Mọi tên cột dùng trong truy vấn edge function phải có thật trong lược đồ.
 *
 * VÌ SAO ĐÁNG CÓ MỘT TEST RIÊNG. Ngày 08/09/2026 ba truy vấn trong
 * `bank-link/index.ts` sắp xếp theo `received_at` trên bảng `bank_connections`
 * — một cột thuộc bảng khác. PostgREST trả lỗi cho cả truy vấn, `data` thành
 * `null`, và vì chỗ gọi chỉ lấy `data` mà bỏ `error` nên một truy vấn HỎNG
 * trông y hệt một truy vấn KHÔNG TÌM THẤY GÌ.
 *
 * Hậu quả là ba tính năng chết trong khi màn hình vẫn nói năng bình thường:
 *
 *   - mã QR báo "chưa liên kết ngân hàng" dù đã liên kết
 *   - đường VietQR báo "chưa khai tài khoản" dù vừa khai
 *   - "chưa kết nối Tổng Cục Thuế" dù đã kết nối
 *
 * Không có test nào bắt được, vì mỗi truy vấn đều đúng cú pháp và cả ba đều
 * chạy trót lọt cho tới khi chạm cơ sở dữ liệu thật. Tên cột sai là loại lỗi
 * chỉ nổ ở lúc chạy, ở phía máy chủ, và biểu hiện ra ngoài thành một câu hoàn
 * toàn khác — nên nó phải bị bắt ở đây.
 *
 * `types.ts` do `supabase gen types` sinh từ chính cơ sở dữ liệu, nên nó là
 * nguồn sự thật đúng nghĩa: đổi lược đồ mà quên sửa truy vấn thì test này đỏ.
 */

const goc = join(__dirname, '..', '..', '..');
const thuMucHam = join(goc, 'supabase', 'functions');

/** Các toán tử PostgREST mà đối số đầu là một tên cột. */
const TOAN_TU_CO_TEN_COT = ['order', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'is', 'like', 'ilike'];

/** Đọc `types.ts` ra map bảng → tập tên cột. */
function docLuocDo(): Map<string, Set<string>> {
  const src = readFileSync(join(goc, 'src', 'integrations', 'supabase', 'types.ts'), 'utf8');
  const bang = new Map<string, Set<string>>();

  // Mỗi bảng là `ten: { Row: { cot: kieu ... } ... }`. Chỉ đọc khối Row —
  // Insert và Update lặp lại đúng những cột đó.
  const re = /^ {6}(\w+): \{\n {8}Row: \{\n([\s\S]*?)\n {8}\}/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const cot = new Set<string>();
    for (const dong of m[2].split('\n')) {
      const c = dong.match(/^ {10}(\w+)\??:/);
      if (c) cot.add(c[1]);
    }
    if (cot.size) bang.set(m[1], cot);
  }
  return bang;
}

/** Mọi file .ts của edge function, bỏ test. */
function cacFileHam(dir: string, ra: string[] = []): string[] {
  for (const ten of readdirSync(dir)) {
    const p = join(dir, ten);
    if (statSync(p).isDirectory()) cacFileHam(p, ra);
    else if (ten.endsWith('.ts') && !ten.includes('.test.')) ra.push(p);
  }
  return ra;
}

/** Bỏ chú thích, để chuỗi trong chú thích không bị đọc như mã. */
function boChuThich(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

interface CachDung {
  file: string;
  bang: string;
  cot: string;
  toanTu: string;
}

/**
 * Tìm các chuỗi `.from("bang")....toanTu("cot"`.
 *
 * Cắt đoạn tại `.from(` KẾ TIẾP hoặc dấu `;`, tuỳ cái nào tới trước.
 *
 * Chỉ cắt tại `;` là chưa đủ, và bản đầu của test này đã báo nhầm vì thế:
 * `Promise.all([ ... ])` xếp nhiều truy vấn trong một câu lệnh, còn một truy
 * vấn lồng trong truy vấn khác thì cũng vậy — nên cột của bảng sau bị quy cho
 * bảng trước. Một test báo nhầm thì lần sau người ta tắt nó đi.
 */
function timCachDung(duongDan: string): CachDung[] {
  const ten = relative(goc, duongDan).split(sep).join('/');
  return doDoan(boChuThich(readFileSync(duongDan, 'utf8')), ten);
}

/** Phần thuần của `timCachDung`, tách ra để test được bằng chuỗi. */
function doDoan(src: string, ten: string): CachDung[] {
  const ra: CachDung[] = [];
  const reFrom = /\.from\(\s*["'](\w+)["']\s*\)/g;
  let m: RegExpExecArray | null;

  while ((m = reFrom.exec(src))) {
    const sauFrom = m.index + m[0].length;
    const moc = [src.indexOf(';', sauFrom), src.indexOf('.from(', sauFrom)]
      .filter((i) => i !== -1);
    const doan = src.slice(m.index, moc.length ? Math.min(...moc) : src.length);
    const reOp = new RegExp(`\\.(${TOAN_TU_CO_TEN_COT.join('|')})\\(\\s*["']([\\w.]+)["']`, 'g');
    let o: RegExpExecArray | null;
    while ((o = reOp.exec(doan))) {
      // Bỏ tên có dấu chấm: đó là cột của bảng nhúng, không phải bảng này.
      if (o[2].includes('.')) continue;
      ra.push({
        file: ten,
        bang: m[1],
        cot: o[2],
        toanTu: o[1],
      });
    }
  }
  return ra;
}

/*
 * Bộ dò phải bắt được đúng thứ đã xảy ra, và không bắt nhầm thứ không xảy ra.
 *
 * Nới bộ dò cho hết báo nhầm rất dễ nới quá tay thành không báo gì. Hai test
 * dưới khoá cả hai đầu bằng chính hai hình dạng mã đã gặp hôm nay.
 */
describe('bộ dò tên cột', () => {
  it('bắt được đúng chuỗi đã gây ra sự cố 08/09', () => {
    const nguon = `
      const { data } = await supabase
        .from("bank_connections")
        .eq("company_id", company.id)
        .order("received_at", { ascending: false })
        .maybeSingle();
    `;
    expect(doDoan(nguon, 'x.ts').map((d) => `${d.bang}.${d.cot}`)).toEqual([
      'bank_connections.company_id',
      'bank_connections.received_at',
    ]);
  });

  it('không quy cột của truy vấn sau cho bảng của truy vấn trước', () => {
    // Hình dạng `Promise.all` — nhiều truy vấn trong một câu lệnh. Bản đầu chỉ
    // cắt tại `;` nên gán nhầm `computed_at` cho `loan_applications`.
    const nguon = `
      await Promise.all([
        admin.from("loan_applications").select("amount").eq("company_id", id),
        admin.from("credit_score_snapshots").order("computed_at", { ascending: false }),
      ]);
    `;
    expect(doDoan(nguon, 'x.ts').map((d) => `${d.bang}.${d.cot}`)).toEqual([
      'loan_applications.company_id',
      'credit_score_snapshots.computed_at',
    ]);
  });
});

describe('tên cột trong truy vấn edge function', () => {
  const luocDo = docLuocDo();

  it('đọc được lược đồ từ types.ts', () => {
    // Nếu định dạng `types.ts` đổi thì mọi test dưới sẽ xanh giả — bảng rỗng
    // thì không có gì để đối chiếu. Chốt lại ở đây.
    expect(luocDo.size).toBeGreaterThan(20);
    expect(luocDo.get('bank_connections')?.has('company_id')).toBe(true);
    // Chính cái cột đã gây ra cả chuyện này.
    expect(luocDo.get('bank_connections')?.has('received_at')).toBe(false);
    expect(luocDo.get('webhook_events')?.has('received_at')).toBe(true);
  });

  it('mọi cột đều có thật trong bảng được truy vấn', () => {
    const sai: string[] = [];

    for (const f of cacFileHam(thuMucHam)) {
      for (const d of timCachDung(f)) {
        const cot = luocDo.get(d.bang);
        // Bảng không có trong types.ts thì bỏ qua: có thể là bảng mới chưa
        // sinh lại kiểu. Không phán điều mình không biết.
        if (!cot) continue;
        if (!cot.has(d.cot)) {
          sai.push(`${d.file}: .from("${d.bang}").${d.toanTu}("${d.cot}") — bảng này không có cột đó`);
        }
      }
    }

    expect(sai).toEqual([]);
  });
});
