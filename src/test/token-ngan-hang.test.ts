import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * Trình duyệt không được đọc token ngân hàng.
 *
 * 18/09/2026: migration mở quyền đọc theo thành viên (20260918140000) kéo theo cả
 * `bank_connections`, nên một thành viên vai trò `nguoi_xem` cũng đọc được
 * `access_token_enc`. Token có mã hoá, nhưng người chỉ được xem không có việc gì với nó.
 *
 * Quyền SELECT của `authenticated` giờ cấp theo từng cột và KHÔNG có cột đó
 * (20260918160000). Nếu mã giao diện lại chạm vào nó — select, lọc, sắp xếp đều tính —
 * PostgREST trả lỗi quyền cho CẢ truy vấn, `data` thành null, và màn hình sẽ nói
 * "chưa liên kết ngân hàng" thay vì nói có lỗi. Đúng loại lỗi im lặng mà
 * `cot-co-that.test.ts` được viết ra để chặn, nên chặn luôn ở đây.
 *
 * Cách kiểm: bỏ hết chú thích rồi tìm tên cột trong phần mã còn lại. Nhắc tên cột trong
 * chú thích để giải thích là được — dùng nó trong truy vấn thì không.
 */

const goc = join(__dirname, '..');
const DONG_MOI = String.fromCharCode(10);

function tepNguon(thuMuc: string, ra: string[] = []): string[] {
  for (const ten of readdirSync(thuMuc)) {
    const duong = join(thuMuc, ten);
    if (statSync(duong).isDirectory()) {
      tepNguon(duong, ra);
    } else if (/\.(ts|tsx)$/.test(ten) && !/\.(test|spec)\.(ts|tsx)$/.test(ten)) {
      ra.push(duong);
    }
  }
  return ra;
}

/**
 * Bỏ chú thích khối và chú thích dòng, giữ nguyên số dòng để vị trí báo lỗi vẫn đúng.
 *
 * Bỏ ký tự CR trước: tệp trong kho này lưu CRLF, mà trong biểu thức chính quy của JavaScript
 * thì CR là ký tự kết thúc dòng — `.*$` dừng trước nó nên không chú thích dòng nào bị bỏ, và
 * mọi tên cột nhắc trong chú thích đều bị báo oan là vi phạm.
 */
function boChuThich(ma: string): string {
  const trong = (m: string) => m.split(DONG_MOI).map(() => '').join(DONG_MOI);
  return ma
    .split(String.fromCharCode(13)).join('')
    .replace(/\/\*[\s\S]*?\*\//g, trong)
    .split(DONG_MOI)
    .map((dong) => dong.replace(/(^|[^:])\/\/.*$/, '$1'))
    .join(DONG_MOI);
}

describe('token ngân hàng', () => {
  it('không có mã giao diện nào đọc access_token_enc', () => {
    const viPham: string[] = [];
    for (const tep of tepNguon(goc)) {
      // types.ts do `supabase gen types` sinh từ lược đồ: nó phải liệt kê mọi cột.
      if (tep.endsWith(join('integrations', 'supabase', 'types.ts'))) continue;
      boChuThich(readFileSync(tep, 'utf8')).split(DONG_MOI).forEach((dong, i) => {
        if (dong.includes('access_token_enc')) {
          viPham.push(`${relative(goc, tep).split(sep).join('/')}:${i + 1}`);
        }
      });
    }
    expect(viPham, 'dùng cột co_token để biết liên kết còn chìa khoá hay không').toEqual([]);
  });

  it('PaymentMethods lọc liên kết còn dùng được bằng cột co_token', () => {
    const ma = readFileSync(join(goc, 'components', 'fintech', 'PaymentMethods.tsx'), 'utf8');
    expect(ma).toContain(".eq('co_token', true)");
  });
});
