import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * Mọi nơi đọc `transactions` để hiện số cho người dùng đều phải xử lý cờ
 * `is_synthetic`.
 *
 * VÌ SAO CÓ TEST NÀY. Bảng `transactions` chứa lẫn hai loại: giao dịch thật của
 * khách, và giao dịch do môi trường sandbox sinh ra để thử. `open-banking` và
 * `ingest.ts` gắn cờ `is_synthetic = true` cho loại thứ hai.
 *
 * `DashboardOverview` và `tax-summary` đã lọc cờ đó từ lâu. Nhưng quy ước ấy chỉ
 * nằm trong đầu người viết, không ở đâu bắt buộc — nên ngày 10/09/2026 trang
 * Chứng từ chi phí ra đời mà quên lọc, và hiện **5.861.347.116đ chi phí** cùng
 * những cái tên như "NCC Vật tư XYZ" như thể đó là tiền thật của khách.
 *
 * Con số đó còn đi thẳng vào phép tính thuế. Một quy ước mà quên là hỏng, và
 * quên thì không ai báo, thì phải thành một phép kiểm.
 *
 * CÁCH KIỂM: mỗi chuỗi `.from("transactions")` có `.select(` phải nhắc tới
 * `is_synthetic` ở đâu đó trong cùng câu lệnh — hoặc trong danh sách cột, hoặc
 * trong bộ lọc. Không ép phải lọc bỏ: có màn hình cố ý hiện cả hai loại và gắn
 * nhãn cho dòng thử (`DashboardOverview` làm đúng vậy). Chỉ ép **phải nghĩ tới
 * nó**.
 */

// `_shared` nằm ở supabase/functions/_shared → lùi ba tầng mới tới gốc dự án.
const goc = join(__dirname, '..', '..', '..');
const THU_MUC = [join(goc, 'supabase', 'functions'), join(goc, 'src')];

/**
 * Những chỗ được phép không nhắc tới cờ, kèm lý do.
 *
 * Danh sách này cố ý ngắn và phải có lý do viết ra. Thêm một dòng vào đây là
 * một quyết định, không phải một cách làm cho test xanh.
 */
const MIEN_TRU: Array<{ file: string; vi: string }> = [
  {
    file: 'supabase/functions/_shared/ledger/qr-reconciler.ts',
    vi: 'Đối soát mã QR khớp theo mã tham chiếu và tài khoản định danh, không cộng tiền. Dòng thử không có hai thứ đó nên không lọt vào.',
  },
  {
    file: 'supabase/functions/_shared/bank/ingest.ts',
    vi: 'Chỉ đếm tổng số dòng trước và sau khi nạp, để biết nạp thêm được bao nhiêu. Đây là số đo kỹ thuật, không hiện cho người dùng và không cộng thành tiền.',
  },
];

function cacFile(dir: string, ra: string[] = []): string[] {
  for (const ten of readdirSync(dir)) {
    const p = join(dir, ten);
    if (statSync(p).isDirectory()) cacFile(p, ra);
    else if ((ten.endsWith('.ts') || ten.endsWith('.tsx')) && !ten.includes('.test.')) ra.push(p);
  }
  return ra;
}

function boChuThich(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/** Các câu lệnh có `.from("transactions")` kèm `.select(`, trả về nguyên đoạn. */
export function doanDocGiaoDich(src: string): string[] {
  const sach = boChuThich(src);
  const ra: string[] = [];
  const re = /\.from\(\s*["']transactions["']\s*\)/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(sach))) {
    const sau = m.index + m[0].length;
    const moc = [sach.indexOf(';', sau), sach.indexOf('.from(', sau)].filter((i) => i !== -1);
    const doan = sach.slice(m.index, moc.length ? Math.min(...moc) : sach.length);
    if (doan.includes('.select(')) ra.push(doan);
  }
  return ra;
}

describe('bộ dò câu lệnh đọc giao dịch', () => {
  it('bắt câu có select, bỏ qua câu chỉ ghi', () => {
    const doc = `const { data } = await supabase.from("transactions").select("amount").eq("company_id", id);`;
    const ghi = `await supabase.from("transactions").upsert(rows, { onConflict: "id" });`;
    expect(doanDocGiaoDich(doc)).toHaveLength(1);
    expect(doanDocGiaoDich(ghi)).toHaveLength(0);
  });

  it('không lẫn sang bảng khác trong cùng câu lệnh', () => {
    // Hình dạng `Promise.all`, giống bẫy đã gặp ở `cot-co-that.test.ts`.
    const nguon = `await Promise.all([
      supabase.from("transactions").select("amount, is_synthetic"),
      supabase.from("gdt_invoices").select("total_amount"),
    ]);`;
    const doan = doanDocGiaoDich(nguon);
    expect(doan).toHaveLength(1);
    expect(doan[0]).not.toContain('gdt_invoices');
  });

  it('bỏ qua chuỗi nằm trong chú thích', () => {
    expect(doanDocGiaoDich(`// .from("transactions").select("x")`)).toHaveLength(0);
  });
});

describe('cờ dữ liệu thử', () => {
  it('mọi nơi đọc transactions để hiện số đều nhắc tới is_synthetic', () => {
    const sai: string[] = [];

    for (const f of THU_MUC.flatMap((d) => cacFile(d))) {
      const ten = relative(goc, f).split(sep).join('/');
      if (MIEN_TRU.some((x) => ten.endsWith(x.file.replace('supabase/', '')) || ten === x.file)) {
        continue;
      }
      for (const doan of doanDocGiaoDich(readFileSync(f, 'utf8'))) {
        if (!doan.includes('is_synthetic')) {
          sai.push(`${ten}: đọc transactions mà không nhắc tới is_synthetic`);
        }
      }
    }

    expect(sai).toEqual([]);
  });

  it('trang Chứng từ chi phí có lọc — chính chỗ đã sai ngày 10/09', () => {
    const src = readFileSync(join(goc, 'src', 'pages', 'ChungTuPage.tsx'), 'utf8');
    expect(src).toContain('is_synthetic');
    // Lọc bỏ, chứ không chỉ đọc ra rồi để đó.
    expect(src).toMatch(/filter\([\s\S]{0,60}!\s*\w+\.is_synthetic/);
  });

  it('danh sách miễn trừ nào cũng phải có lý do viết ra', () => {
    for (const x of MIEN_TRU) expect(x.vi.trim().length).toBeGreaterThan(30);
  });
});
