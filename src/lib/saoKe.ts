import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';
import { kemCongTy } from '@/lib/congTyDangDung';
import { LoiGoiHam } from '@/lib/loiGoiHam';
import { docCsv, type O } from '../../supabase/functions/_shared/sao-ke/doc-sao-ke.ts';

export * from '../../supabase/functions/_shared/sao-ke/doc-sao-ke.ts';

/** Gọi edge function `sao-ke` bằng phiên của người đang đăng nhập, kèm công ty đang dùng. */
export async function goiSaoKe(hanhDong: string, du: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new LoiGoiHam('Phiên đăng nhập đã hết. Đăng nhập lại.', 401, {});
  const res = await fetch(`${SUPABASE_URL}/functions/v1/sao-ke`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ hanh_dong: hanhDong, ...(await kemCongTy(du)) }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || body.error) throw new LoiGoiHam(typeof body.error === 'string' ? body.error : `Lỗi ${res.status}`, res.status, body);
  return body;
}

/** Đọc tệp dạng chữ. `FileReader` thay cho `File.text()`: trình duyệt cũ và môi trường test không có hàm sau. */
function docChu(tep: File): Promise<string> {
  return new Promise((ok, hong) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result ?? ''));
    r.onerror = () => hong(new Error('Không đọc được tệp.'));
    r.readAsText(tep, 'utf-8');
  });
}

/** Đọc tệp người dùng chọn thành bảng. `.xls` (định dạng cũ) thì nói cách lưu lại, không đoán. */
export async function docTep(tep: File): Promise<O[][]> {
  const ten = tep.name.toLowerCase();
  if (ten.endsWith('.csv') || ten.endsWith('.txt')) return docCsv(await docChu(tep));
  if (ten.endsWith('.xlsx')) {
    const { readSheet } = await import('read-excel-file/browser');
    return (await readSheet(tep)) as O[][];
  }
  if (ten.endsWith('.xls')) throw new Error('Tệp .xls là định dạng Excel cũ. Mở bằng Excel rồi "Lưu thành" .xlsx hoặc .csv, sau đó tải lại.');
  throw new Error('MIMI đọc được tệp .xlsx và .csv.');
}

/** "Số tài khoản: 0123 456 789" ở phần đầu sao kê → đoán sẵn, người dùng khỏi gõ. */
export function doanTaiKhoan(bang: O[][]): string | null {
  for (const hang of bang.slice(0, 15)) {
    const dong = hang.map((o) => (o === null || o === undefined ? '' : String(o))).join(' ');
    const m = /(s[ốo]\s*t[àa]i\s*kho[ảa]n|account\s*(no|number)?|tk)\s*[:.]?\s*([\d\s.-]{6,24})/i.exec(dong);
    const so = m?.[3]?.replace(/\D/g, '');
    if (so && so.length >= 6 && so.length <= 19) return so;
  }
  return null;
}
