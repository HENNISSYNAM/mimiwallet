import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import DocBaoCaoPage from './DocBaoCaoPage';

/* Báo cáo dựng tay theo hình dạng tệp phần mềm kế toán xuất ra — dữ liệu kiểm thử, không phải số của ai. */
const KQKD = [
  'CÔNG TY TNHH THỬ NGHIỆM,,,,Mẫu số B02 - DN',
  ',,,,(Ban hành theo Thông tư số 200/2014/TT-BTC ngày 22/12/2014 của Bộ Tài chính)',
  'BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH',
  'Năm 2026',
  ',,,,Đơn vị tính: đồng',
  'CHỈ TIÊU,Mã số,Thuyết minh,Năm nay,Năm trước',
  '1. Doanh thu bán hàng và cung cấp dịch vụ,01,VI.25,951983000,800000000',
  '2. Các khoản giảm trừ doanh thu,02,,1983000,0',
  '3. Doanh thu thuần về bán hàng và cung cấp dịch vụ (10 = 01 - 02),10,,950000000,800000000',
  '4. Giá vốn hàng bán,11,VI.27,600000000,520000000',
  // Cố ý sai 10.000.000: lợi nhuận gộp đúng là 350.000.000.
  '5. Lợi nhuận gộp về bán hàng và cung cấp dịch vụ (20 = 10 - 11),20,,360000000,280000000',
  'Chỉ tiêu tự đặt lạ lùng,99,,5,5',
].join('\n');

const chonTep = (ten: string, noiDung: string) => {
  const input = screen.getByLabelText('Chọn tệp báo cáo') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [new File([noiDung], ten, { type: 'text/csv' })] } });
};

describe('Đọc báo cáo tài chính & tờ khai', () => {
  it('CSV kết quả kinh doanh: nhận dạng, cảnh báo mẫu kèm câu trích nguyên văn, báo đúng chỗ lệch, dòng lạ để "chưa xếp"', async () => {
    render(<DocBaoCaoPage />);
    chonTep('B02-2026.csv', KQKD);
    expect(await screen.findByRole('heading', { name: 'Báo cáo kết quả hoạt động kinh doanh' })).toBeTruthy();
    expect(screen.getByText(/Thông tư 200\/2014\/TT-BTC · Năm 2026 · Đơn vị: đồng/)).toBeTruthy();
    // Mẫu TT200 cho năm 2026: cảnh báo, căn cứ là câu trích từ TT99/2025 Điều 31.
    expect(screen.getByText(/Thông tư này thay thế cho các Thông tư số 200\/2014\/TT-BTC/)).toBeTruthy();
    expect(screen.getByText(/99\/2025\/TT-BTC, Điều 31 khoản 1/)).toBeTruthy();
    // Lợi nhuận gộp lệch đúng 10.000.000 ở cột "Năm nay".
    // Hai cột (năm nay, năm trước) → công thức hiện hai lần; chỉ cột "Năm nay" lệch.
    const gop = screen.getAllByText(/Lợi nhuận gộp = Doanh thu thuần − Giá vốn/, { selector: 'span' });
    expect(gop).toHaveLength(2);
    expect(gop.filter((x) => /lệch/.test(x.textContent ?? ''))).toHaveLength(1);
    expect(gop.find((x) => /lệch/.test(x.textContent ?? ''))!.textContent).toMatch(/Năm nay.*lệch\s*10\.000\.000/);
    // Dòng lạ: không đoán.
    expect(screen.getAllByText('Chưa xếp').length).toBe(1);
    expect(screen.getByText(/Đã xếp/).textContent).toMatch(/5\s*\/6/);
  });

  it('PDF → nói rõ chưa đọc được và cách làm, không trả kết quả rỗng', async () => {
    render(<DocBaoCaoPage />);
    chonTep('bao-cao.pdf', '%PDF-1.4');
    expect((await screen.findByRole('alert')).textContent).toContain('Xuất báo cáo từ phần mềm kế toán ra Excel');
  });

  it('tệp không có bảng chỉ tiêu → báo không thấy bảng', async () => {
    render(<DocBaoCaoPage />);
    chonTep('rong.csv', 'xin chao\nkhong co gi');
    expect((await screen.findByRole('alert')).textContent).toContain('Không thấy bảng chỉ tiêu');
  });
});
