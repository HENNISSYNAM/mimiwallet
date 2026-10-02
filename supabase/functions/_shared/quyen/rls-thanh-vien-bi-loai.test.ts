import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Người đã bị gỡ / đã rời công ty không được đọc hay ghi dữ liệu công ty đó.
 *
 * Không chạy được SQL ở đây, nên test này đọc TOÀN BỘ migration theo thứ tự, dựng lại tập policy cuối
 * cùng (CREATE POLICY trừ đi DROP POLICY) và khẳng định luật ở mức văn bản:
 *   - policy trên bảng công ty phải đi qua hàm thành viên (`la_thanh_vien`, `la_chu_cong_ty`,
 *     `la_thanh_vien_thu_muc`), không được dựa vào `companies.user_id` (người TẠO, không đổi khi bị gỡ);
 *   - không còn `user_company_ids` trong policy;
 *   - nội dung hội thoại/thông báo phải kèm điều kiện thành viên; XOÁ hội thoại của mình thì không.
 *
 * Lưu ý giới hạn: policy do vòng lặp `DO $$ ... format() $$` ở migration cũ tạo ra không thấy được ở
 * đây; migration 30/09 gỡ chúng bằng vòng lặp trên `pg_policies` rồi tạo lại tường minh.
 */

const GOC = join(__dirname, '..', '..', '..', '..');
const DIR = join(GOC, 'supabase', 'migrations');
const MIGRATION = '20260930090000_rls_thanh_vien_bi_loai.sql';

interface Policy { bang: string; ten: string; lenh: string; than: string; tep: string }

function docPolicyCuoi(): Map<string, Policy> {
  const ds = new Map<string, Policy>();
  for (const tep of readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort()) {
    const sql = readFileSync(join(DIR, tep), 'utf8').replace(/--.*$/gm, '');
    // Giữ đúng thứ tự xuất hiện trong tệp: DROP rồi CREATE cùng tên phải cho kết quả là policy mới.
    const sk = [...sql.matchAll(/\b(DROP POLICY(?: IF EXISTS)?\s+("[^"]+"|\w+)\s+ON\s+([\w."]+)|CREATE POLICY\s+("[^"]+"|\w+)\s+ON\s+([\w."]+)([\s\S]*?);)/gi)];
    for (const m of sk) {
      if (m[1].toUpperCase().startsWith('DROP')) {
        ds.delete(`${m[3].replace('public.', '')}|${m[2].replace(/"/g, '')}`);
      } else {
        const bang = m[5].replace('public.', '');
        const ten = m[4].replace(/"/g, '');
        const than = m[6].replace(/\s+/g, ' ').trim();
        const lenh = /FOR\s+(SELECT|INSERT|UPDATE|DELETE|ALL)/i.exec(than)?.[1].toUpperCase() ?? 'ALL';
        ds.set(`${bang}|${ten}`, { bang, ten, lenh, than, tep });
      }
    }
  }
  return ds;
}

const HAM_THANH_VIEN = /public\.(la_thanh_vien|la_chu_cong_ty|la_thanh_vien_thu_muc)\(/;

/** Bảng có cột company_id mà policy phải theo thành viên. Thêm bảng công ty mới vào đây. */
const BANG_CONG_TY = [
  'transactions', 'invoices', 'gdt_invoices', 'chi_phi_ai', 'token_ai', 'chung_tu_quet', 'ho_so_thue', 'to_khai_nhap',
  'tac_tu', 'yeu_cau_chi', 'chinh_sach_chi', 'nguoi_nhan_duoc_phep', 'nhat_ky_tac_tu', 'so_cai_chung_tu', 'neo_thoi_gian',
  'ngan_sach_chi_phi_ai', 'lo_nhap_chi_phi_ai', 'bank_connections', 'qr_payments', 'clients', 'transaction_labels',
  'subscriptions', 'subscription_invoices', 'danh_muc_dau_tu', 'bang_chung_viec', 'ket_qua_quy_trinh', 'luot_to_khai',
  'nhat_ky_quyet_dinh', 'phan_loai_hoat_dong', 'phan_loai_hoat_dong_su_kien', 'quy_trinh_ai', 'revenue_classification_events',
  'revenue_classifications', 'sao_ke_nhap', 'quyet_dinh_chung_tu', 'ho_so_viec', 'hanh_trinh', 'buoc_hanh_trinh', 'tai_lieu',
  'phien_ban_tai_lieu', 'duyet_tai_lieu', 'nhat_ky_thay_doi', 'yeu_cau_thuc_thi', 'xung_dot_hoa_don',
  'carbon_snapshots', 'credit_score_factors', 'credit_score_snapshots', 'device_rules', 'device_wallets', 'kyc_verifications',
  'learning_progress', 'loan_applications', 'm2m_transactions', 'p2p_commitments', 'p2p_listings',
  'companies', 'hoi_thoai_tro_ly', 'thong_bao',
];

describe('RLS: người bị gỡ khỏi công ty mất quyền', () => {
  const ds = docPolicyCuoi();
  const sql = readFileSync(join(DIR, MIGRATION), 'utf8');

  it('migration tồn tại và là migration mới nhất về RLS thành viên', () => {
    const tep = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
    expect(tep).toContain(MIGRATION);
    expect(tep.indexOf(MIGRATION)).toBeGreaterThan(tep.indexOf('20260929160000_phan_hoi_khach.sql'));
  });

  it('đọc được policy cuối cùng của mọi bảng công ty (bộ đọc chưa hỏng)', () => {
    for (const b of BANG_CONG_TY) {
      expect([...ds.values()].some((p) => p.bang === b), `bảng ${b} không có policy nào`).toBe(true);
    }
  });

  it('MỌI policy trên bảng công ty (trừ XOÁ hội thoại của chính mình) đi qua hàm thành viên', () => {
    const vi_pham: string[] = [];
    for (const p of ds.values()) {
      if (!BANG_CONG_TY.includes(p.bang)) continue;
      // Ngoại lệ có chủ đích: người đã rời vẫn xoá được hội thoại của chính mình.
      if (p.bang === 'hoi_thoai_tro_ly' && p.lenh === 'DELETE') continue;
      // INSERT công ty mới: chưa có dòng thành viên để kiểm (trigger thêm sau); ràng buộc user_id = mình.
      if (p.bang === 'companies' && p.lenh === 'INSERT') continue;
      // Policy "ai cũng thấy khoản gọi vốn" của p2p là công khai theo trạng thái, không theo công ty.
      if (p.bang === 'p2p_listings' && /trang_thai IN/.test(p.than)) continue;
      if (!HAM_THANH_VIEN.test(p.than)) vi_pham.push(`${p.bang} | ${p.ten} (${p.tep})`);
    }
    expect(vi_pham).toEqual([]);
  });

  it('không policy nào còn dựa vào companies.user_id (người tạo) hay user_company_ids', () => {
    const vi_pham = [...ds.values()]
      .filter((p) => BANG_CONG_TY.includes(p.bang) || p.bang === 'storage.objects')
      .filter((p) => /FROM public\.companies|user_company_ids|companies\.user_id|c\.user_id/.test(p.than)
        || (p.bang === 'companies' && /auth\.uid\(\)\s*=\s*user_id/.test(p.than) && p.lenh !== 'INSERT'))
      .map((p) => `${p.bang} | ${p.ten} (${p.tep})`);
    expect(vi_pham).toEqual([]);
  });

  it('không có chỗ nào ghép sai tên cột khi sinh policy (vd. lender_public.…)', () => {
    expect(sql).not.toMatch(/[a-z_]public\.la_/);
  });

  it('ghi trực tiếp từ trình duyệt (INSERT/UPDATE/DELETE) chỉ dành cho chủ sở hữu, không phải mọi thành viên', () => {
    const sai = [...ds.values()]
      .filter((p) => BANG_CONG_TY.includes(p.bang) && ['INSERT', 'UPDATE', 'DELETE'].includes(p.lenh))
      .filter((p) => !(p.bang === 'hoi_thoai_tro_ly' && p.lenh === 'DELETE') && !(p.bang === 'companies' && p.lenh === 'INSERT'))
      .filter((p) => !/la_chu_cong_ty\(/.test(p.than))
      .map((p) => `${p.bang} | ${p.ten}`);
    expect(sai).toEqual([]);
  });

  it('hội thoại và thông báo: đọc phải là của mình VÀ còn là thành viên; xoá hội thoại chỉ cần là của mình', () => {
    const doc = ds.get('hoi_thoai_tro_ly|Đọc hội thoại của chính mình');
    expect(doc?.than).toMatch(/user_id = auth\.uid\(\)/);
    expect(doc?.than).toMatch(/la_thanh_vien\(company_id\)/);
    const xoa = ds.get('hoi_thoai_tro_ly|Xoá hội thoại của chính mình');
    expect(xoa?.lenh).toBe('DELETE');
    expect(xoa?.than).toMatch(/user_id = auth\.uid\(\)/);
    expect(xoa?.than).not.toMatch(/la_thanh_vien/);
    const tb = ds.get('thong_bao|Người nhận đọc thông báo của mình');
    expect(tb?.than).toMatch(/la_thanh_vien\(company_id\)/);
  });

  it('companies: chỉ thành viên đọc; chỉ chủ sở hữu hiện tại sửa/xoá', () => {
    expect(ds.get('companies|Thành viên đọc công ty mình thuộc về')?.than).toMatch(/la_thanh_vien\(id\)/);
    expect(ds.get('companies|Thành viên đọc công ty mình thuộc về')?.than).not.toMatch(/user_id/);
    expect(ds.get('companies|Users can update own companies')?.than).toMatch(/la_chu_cong_ty\(id\)/);
    expect(ds.get('companies|Users can delete own companies')?.than).toMatch(/la_chu_cong_ty\(id\)/);
  });

  it('Storage: chung-tu, tai-lieu, secure-documents cấp theo thành viên qua hàm, không theo người tạo', () => {
    const st = [...ds.values()].filter((p) => p.bang === 'storage.objects');
    for (const bucket of ['chung-tu', 'tai-lieu', 'secure-documents']) {
      const cs = st.filter((p) => p.than.includes(`bucket_id = '${bucket}'`));
      expect(cs.length, bucket).toBeGreaterThan(0);
      for (const p of cs) expect(p.than, `${bucket} | ${p.ten}`).toMatch(/la_thanh_vien_thu_muc\(/);
    }
    // Giấy tờ KYC: chỉ chủ sở hữu (đối số thứ hai = true).
    for (const p of st.filter((x) => x.than.includes("bucket_id = 'secure-documents'"))) expect(p.than).toMatch(/,\s*true\)/);
  });

  it('hàm mới là SECURITY DEFINER, cố định search_path, và gỡ quyền của anon', () => {
    for (const ten of ['la_chu_cong_ty', 'la_thanh_vien_thu_muc']) {
      const kh = new RegExp(`CREATE OR REPLACE FUNCTION public\\.${ten}\\([\\s\\S]*?\\$\\$;`, 'i').exec(sql)?.[0] ?? '';
      expect(kh, ten).toMatch(/SECURITY DEFINER/);
      expect(kh, ten).toMatch(/SET search_path = public/);
      expect(sql, ten).toMatch(new RegExp(`REVOKE EXECUTE ON FUNCTION public\\.${ten}\\([^)]*\\) FROM PUBLIC, anon`));
    }
    // user_company_ids chỉ trả cho chính người gọi.
    expect(/CREATE OR REPLACE FUNCTION public\.user_company_ids[\s\S]*?\$\$;/i.exec(sql)?.[0]).toMatch(/uid = auth\.uid\(\)/);
  });

  it('idempotent: mọi CREATE POLICY đều có DROP POLICY IF EXISTS cùng tên ngay trước đó trong migration', () => {
    const ct = [...sql.replace(/--.*$/gm, '').matchAll(/CREATE POLICY\s+("[^"]+"|\w+)\s+ON\s+([\w."]+)/g)];
    expect(ct.length).toBeGreaterThan(50);
    for (const m of ct) {
      const drop = new RegExp(`DROP POLICY IF EXISTS ${m[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} ON ${m[2].replace('.', '\\.')};`);
      expect(drop.test(sql), `${m[2]} ${m[1]}`).toBe(true);
    }
  });

  it('migration không xoá hay sửa dữ liệu (chỉ chính sách, hàm và một INSERT bổ sung thành viên)', () => {
    const sach = sql.replace(/--.*$/gm, '');
    expect(sach).not.toMatch(/\b(TRUNCATE|DROP TABLE|ALTER TABLE|DELETE FROM|UPDATE\s+public\.)/i);
    const insert = [...sach.matchAll(/INSERT INTO\s+([\w.]+)/gi)].map((m) => m[1]);
    expect(insert).toEqual(['public.thanh_vien_cong_ty']);
  });
});

describe('không còn đường dự phòng theo người tạo ở backend', () => {
  it('resolveCompanyVaiTro không đọc companies.user_id để cấp quyền', () => {
    const ma = readFileSync(join(GOC, 'supabase', 'functions', '_shared', 'company.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(ma).not.toMatch(/\.from\(\s*["']companies["']\s*\)/);
  });

  it('người nhận thông báo lấy từ thành viên hiện tại, không cộng người tạo', () => {
    const ma = readFileSync(join(GOC, 'supabase', 'functions', '_shared', 'thong-bao', 'gui.ts'), 'utf8');
    const ham = /export async function nguoiNhan[\s\S]*?\n\}/.exec(ma)?.[0] ?? '';
    expect(ham).toMatch(/thanh_vien_cong_ty/);
    expect(ham).not.toMatch(/companies/);
  });
});
