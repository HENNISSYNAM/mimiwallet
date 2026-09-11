import { describe, expect, it } from 'vitest';
import { DICH_KHONG_TU_BAM, kiemKichBan, layTen, nhanViec, type KichBan } from './mimiLamHo';

describe('nhận việc', () => {
  it('tạo agent, lấy tên trong ngoặc kép', () => {
    const kb = nhanViec('Tạo agent "Trợ lý quảng cáo" cho tôi');
    expect(kb?.ten).toBe('tao_agent');
    expect(kb?.buoc).toContainEqual(expect.objectContaining({ loai: 'go', dich: 'tac-tu.ten', chu: 'Trợ lý quảng cáo' }));
    expect(kb?.buoc.at(-1)).toMatchObject({ loai: 'nhuong', dich: 'tac-tu.them' });
  });

  it('gõ không dấu vẫn nhận', () => {
    expect(nhanViec('tao agent moi')?.ten).toBe('tao_agent');
  });

  it('không đoán tên từ phần còn lại của câu', () => {
    // "cho tôi" không phải tên agent.
    expect(nhanViec('Tạo agent cho tôi')?.buoc).toContainEqual(expect.objectContaining({ chu: 'Trợ lý MIMI' }));
  });

  it('thêm người nhận lấy số tài khoản và tên', () => {
    const kb = nhanViec('Thêm người nhận 2431122002 tên DINH VAN NAM');
    expect(kb?.ten).toBe('them_nguoi_nhan');
    expect(kb?.buoc).toContainEqual(expect.objectContaining({ dich: 'tac-tu.nguoi-nhan.stk', chu: '2431122002' }));
    expect(kb?.buoc).toContainEqual(expect.objectContaining({ dich: 'tac-tu.nguoi-nhan.ten', chu: 'DINH VAN NAM' }));
  });

  it('khoản chờ duyệt, chứng từ, ngân hàng', () => {
    expect(nhanViec('Khoản chi nào đang chờ tôi duyệt?')?.ten).toBe('xem_cho_duyet');
    expect(nhanViec('Khoản chi nào tháng này chưa có chứng từ?')?.ten).toBe('xem_chung_tu');
    expect(nhanViec('Liên kết ngân hàng giúp tôi')?.ten).toBe('lien_ket_ngan_hang');
  });

  it('câu hỏi thường không bị biến thành việc', () => {
    for (const cau of [
      'Dòng tiền tháng này thế nào?',
      'Tôi nên nộp thuế theo doanh thu hay theo lợi nhuận?',
      'Chứng từ hợp lệ theo luật là gì?',
      'Agent là gì?',
    ]) {
      expect(nhanViec(cau)).toBeNull();
    }
  });
});

describe('ranh giới an toàn', () => {
  it('mọi kịch bản nhận được đều hợp lệ', () => {
    for (const cau of [
      'tạo agent "A"', 'thêm người nhận 12345678', 'khoản chờ duyệt', 'xem chứng từ', 'kết nối ngân hàng', 'mở kiểm soát agent',
    ]) {
      const kb = nhanViec(cau);
      expect(kb, cau).not.toBeNull();
      expect(kiemKichBan(kb!), cau).toEqual([]);
    }
  });

  it('không kịch bản nào tự bấm nút làm đi tiền hay không hoàn tác được', () => {
    const tatCa = ['tạo agent "A"', 'thêm người nhận 12345678', 'khoản chờ duyệt'].map((c) => nhanViec(c)!);
    for (const kb of tatCa) {
      for (const b of kb.buoc) {
        if (b.loai === 'bam') expect(DICH_KHONG_TU_BAM.has(b.dich)).toBe(false);
      }
    }
  });

  it('chặn kịch bản tự bấm Duyệt', () => {
    const kb: KichBan = { ten: 'x', moTa: 'x', buoc: [{ loai: 'bam', dich: 'tac-tu.duyet', noi: '' }] };
    expect(kiemKichBan(kb).join(' ')).toContain('không được tự bấm');
  });

  it('chặn đi ra ngoài ứng dụng và đích sai khuôn', () => {
    const kb: KichBan = {
      ten: 'x',
      moTa: 'x',
      buoc: [
        { loai: 'di_toi', duongDan: 'https://example.com', noi: '' },
        { loai: 'chi', dich: 'button[onclick]', noi: '' },
      ],
    };
    const loi = kiemKichBan(kb);
    expect(loi).toHaveLength(2);
  });

  it('chặn kịch bản rỗng hoặc quá dài', () => {
    expect(kiemKichBan({ ten: 'x', moTa: 'x', buoc: [] })).not.toEqual([]);
    const dai = Array.from({ length: 13 }, () => ({ loai: 'chi' as const, dich: 'tac-tu.ten', noi: '' }));
    expect(kiemKichBan({ ten: 'x', moTa: 'x', buoc: dai })).not.toEqual([]);
  });
});

describe('lấy tên', () => {
  it('ngoặc kép thẳng, cong, và sau chữ "tên"', () => {
    expect(layTen('tạo agent "Bot A"')).toBe('Bot A');
    expect(layTen('tạo agent “Bot B”')).toBe('Bot B');
    expect(layTen('thêm người nhận tên là Nguyễn Văn C')).toBe('Nguyễn Văn C');
    expect(layTen('tạo agent cho tôi')).toBeNull();
  });
});
