import { describe, expect, it } from 'vitest';
import { docKeHoach, laCauNhoViec, loiDanLapKeHoach, SO_BUOC_KE_HOACH_TOI_DA } from './lap-kich-ban';
import { DICH_KHONG_TU_BAM, kiemKichBan } from '../../../../src/lib/mimiLamHo';

const kh = (buoc: unknown[], them: Record<string, unknown> = {}) => JSON.stringify({ lam_duoc: true, mo_ta: 'mở nạp xu', buoc, ...them });

describe('trỏ tự lập kế hoạch — kiểm kế hoạch của mô hình', () => {
  it('kế hoạch đúng danh mục: nhận, và vẫn qua bộ kiểm phía trình duyệt', () => {
    const r = docKeHoach('Đây là kế hoạch:\n```json\n' + kh([
      { loai: 'di_toi', duongDan: '/dashboard/tac-tu', noi: 'Mở Kiểm soát agent.' },
      { loai: 'bam', dich: 'tac-tu.tab.agents', noi: 'Mở tab Agents.' },
      { loai: 'go', dich: 'tac-tu.ten', chu: 'Bot quảng cáo', noi: 'Gõ tên.' },
      { loai: 'nhuong', dich: 'tac-tu.them', noi: 'Bạn bấm Thêm agent.' },
    ]) + '\n```');
    expect(r.ok).toBe(true);
    if (r.ok) expect(kiemKichBan(r.keHoach)).toEqual([]);
  });
  it('mô hình đòi TỰ BẤM nút chạm tiền / thêm agent / duyệt: bỏ cả kế hoạch', () => {
    for (const dich of ['tac-tu.them', 'tac-tu.duyet', 'tac-tu.nguoi-nhan.them', 'to-khai.dien-ho.bat-dau']) {
      expect(DICH_KHONG_TU_BAM.has(dich) || dich === 'tac-tu.duyet').toBe(true);
      const r = docKeHoach(kh([{ loai: 'di_toi', duongDan: '/dashboard/tac-tu', noi: 'x' }, { loai: 'bam', dich, noi: 'bấm' }]));
      expect(r.ok).toBe(false);
    }
  });
  it('trang ngoài danh mục, đường ngoài /dashboard, đích lạ, đích khác trang, gõ vào ô không cho gõ: bỏ', () => {
    expect(docKeHoach(kh([{ loai: 'di_toi', duongDan: 'https://evil.example', noi: 'x' }])).ok).toBe(false);
    expect(docKeHoach(kh([{ loai: 'di_toi', duongDan: '/admin', noi: 'x' }])).ok).toBe(false);
    expect(docKeHoach(kh([{ loai: 'chi', dich: '#nut-nop', noi: 'x' }])).ok).toBe(false);
    expect(docKeHoach(kh([{ loai: 'di_toi', duongDan: '/dashboard/settings', noi: 'x' }, { loai: 'chi', dich: 'tac-tu.kpi', noi: 'x' }])).ok).toBe(false);
    expect(docKeHoach(kh([{ loai: 'di_toi', duongDan: '/dashboard/tac-tu', noi: 'x' }, { loai: 'go', dich: 'tac-tu.kpi', chu: 'a', noi: 'x' }])).ok).toBe(false);
    expect(docKeHoach(kh([{ loai: 'chay_js', dich: 'tac-tu.kpi', noi: 'x' }])).ok).toBe(false);
  });
  it('quá số bước, không phải JSON, mô hình nói không làm được: không có kế hoạch', () => {
    const nhieu = Array.from({ length: SO_BUOC_KE_HOACH_TOI_DA + 1 }, () => ({ loai: 'di_toi', duongDan: '/dashboard', noi: 'x' }));
    expect(docKeHoach(kh(nhieu)).ok).toBe(false);
    expect(docKeHoach('tôi sẽ mở trang cho bạn').ok).toBe(false);
    expect(docKeHoach(JSON.stringify({ lam_duoc: false, ly_do: 'Cần đăng nhập cổng thuế' }))).toEqual({ ok: false, ly_do: 'Cần đăng nhập cổng thuế' });
  });
  it('lời dặn chỉ chứa danh mục và luật, không chứa số liệu công ty', () => {
    const l = loiDanLapKeHoach();
    expect(l).toContain('/dashboard/to-khai');
    expect(l).toMatch(/LUÔN là nhuong/);
  });
  it('chỉ hỏi mô hình khi câu có dáng nhờ việc', () => {
    expect(laCauNhoViec('Chỉ cho tôi chỗ nạp xu')).toBe(true);
    expect(laCauNhoViec('giup minh mo trang to khai tncn')).toBe(true);
    expect(laCauNhoViec('Doanh thu tháng này bao nhiêu?')).toBe(false);
  });
});
