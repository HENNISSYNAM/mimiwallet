/**
 * Hồi quy 21/11/2026: trong hành động "hoi", biến nhóm năng lực (`body.pham_vi`) từng mang tên `phamVi`, che mất phạm vi
 * cơ sở đọc từ docPhamVi. Câu hỏi của kế toán một cơ sở vì vậy đọc số của cả công ty, còn chuỗi nhóm năng lực bị coi
 * là phạm vi cơ sở. Test này đi lại đúng đường đọc của câu hỏi: chọn nguồn → đọc → apPhamVi.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { apPhamVi, NGUON_CA_CONG_TY, nguonTheoPhamVi, type PhamViCoSo } from './pham-vi.ts';
import { docNhomNangLuc } from '../tro-ly/kieu.ts';
import { duLieuTrong, type GiaoDichTL } from '../tro-ly/tinh-toan.ts';

const CS_A: PhamViCoSo = { co_so_id: 'A', ten: 'Cơ sở A', tai_khoan: ['0123456789'] };
const gd = (id: string, so: string | null): GiaoDichTL => ({
  id, amount: 1_000_000, type: 'income', transaction_date: '2026-10-05', merchant_name: 'X', category: null,
  counter_account_name: 'KHACH', account_number: so,
} as GiaoDichTL);

describe('câu hỏi của kế toán một cơ sở chỉ đọc số cơ sở đó', () => {
  it('nhóm năng lực là chuỗi riêng, không bao giờ thành phạm vi cơ sở', () => {
    expect(docNhomNangLuc('chi_phi')).toBe('chi_phi');
    expect(docNhomNangLuc('khong_co')).toBeNull();
    expect(docNhomNangLuc(undefined)).toBeNull();
    expect(docNhomNangLuc({ co_so_id: 'A' })).toBeNull();
  });

  it('chọn nguồn: kế toán cơ sở không đọc nguồn của cả công ty; chủ thì đọc đủ', () => {
    const can = ['giao_dich', 'hoa_don_ban', ...NGUON_CA_CONG_TY];
    expect([...nguonTheoPhamVi(can, CS_A)]).toEqual(['giao_dich', 'hoa_don_ban']);
    expect([...nguonTheoPhamVi(can, null)]).toEqual(can);
  });

  it('dữ liệu đọc cho câu hỏi chỉ còn giao dịch của tài khoản thuộc cơ sở', () => {
    const d = duLieuTrong('2026-10-23', { tu: '2026-10-01', den: '2026-10-31' });
    d.giaoDich = [gd('a', '0123456789'), gd('b', '9999999999'), gd('c', null)];
    const r = apPhamVi(d, CS_A);
    expect(r.giaoDich.map((t) => t.id)).toEqual(['a']);
    expect(r.phamViCoSo).toEqual({ co_so_id: 'A', ten: 'Cơ sở A' });
  });

  it('trong tro-ly, `phamVi` chỉ có một nguồn: docPhamVi — không biến nào che nó', () => {
    const src = readFileSync(resolve(__dirname, '../../tro-ly/index.ts'), 'utf8');
    const khai = [...src.matchAll(/\b(?:const|let|var)\s+phamVi\s*=([^\n]*)/g)].map((m) => m[1]);
    expect(khai).toHaveLength(1);
    expect(khai[0]).toContain('docPhamVi(db, company.id, userId, vaiTro)');
    const hoi = src.slice(src.indexOf('case "hoi":'));
    expect(hoi).toMatch(/docDuLieu\(db, company\.id, new Set\(nguonDaDoc\), moc, \{[^}]*\bphamVi\b[^}]*\}\)/);
    expect(hoi.slice(0, hoi.indexOf('docDuLieu('))).toContain('nhanYDinh(cau, nhomNangLuc)');
  });
});
