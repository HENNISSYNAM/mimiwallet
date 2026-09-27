/**
 * Đọc tệp báo cáo tài chính / tờ khai người dùng chọn → nhận dạng và phân loại từng chỉ tiêu
 * (`_shared/bao-cao/doc-bao-cao.ts`). Chạy HẾT trong trình duyệt: tệp không gửi lên máy chủ nào.
 *
 * Excel đọc MỌI sheet — phần mềm kế toán hay để B01, B02, B03 ở ba sheet của cùng một tệp.
 */
import { docCsv, type O } from '../../supabase/functions/_shared/sao-ke/doc-sao-ke.ts';
import { docBaoCao, type SheetDaPhanLoai } from '../../supabase/functions/_shared/bao-cao/doc-bao-cao.ts';

export type { SheetDaPhanLoai };
export { TEN_LOAI_TAI_LIEU, TEN_CHE_DO } from '../../supabase/functions/_shared/bao-cao/nhan-dang.ts';

/** 10 MB — báo cáo tài chính thật chỉ vài trăm KB; tệp lớn hơn gần như chắc không phải báo cáo. */
export const CO_TOI_DA = 10 * 1024 * 1024;

function docChu(tep: File): Promise<string> {
  return new Promise((ok, hong) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result ?? ''));
    r.onerror = () => hong(new Error('Không đọc được tệp.'));
    r.readAsText(tep, 'utf-8');
  });
}

export async function docCacSheet(tep: File): Promise<{ ten: string; bang: O[][] }[]> {
  if (tep.size > CO_TOI_DA) throw new Error('Tệp lớn hơn 10 MB — báo cáo tài chính thường chỉ vài trăm KB. Kiểm lại có chọn đúng tệp không.');
  const ten = tep.name.toLowerCase();
  if (ten.endsWith('.csv') || ten.endsWith('.txt')) return [{ ten: tep.name, bang: docCsv(await docChu(tep)) }];
  if (ten.endsWith('.xlsx')) {
    const { default: docHetSheet } = await import('read-excel-file/browser');
    const ds = await docHetSheet(tep);
    return ds.map((s) => ({ ten: s.sheet, bang: s.data as O[][] }));
  }
  if (ten.endsWith('.xls')) throw new Error('Tệp .xls là định dạng Excel cũ. Mở bằng Excel rồi "Lưu thành" .xlsx hoặc .csv, sau đó chọn lại.');
  if (ten.endsWith('.pdf') || ten.endsWith('.xml')) throw new Error('MIMI chưa đọc được PDF / XML của báo cáo. Xuất báo cáo từ phần mềm kế toán ra Excel (.xlsx) rồi chọn lại.');
  throw new Error('MIMI đọc được tệp .xlsx và .csv.');
}

/** Đọc + phân loại. Không sheet nào có bảng chỉ tiêu thì nói thẳng, không trả kết quả rỗng trông như "đã xong". */
export async function docVaPhanLoai(tep: File): Promise<SheetDaPhanLoai[]> {
  // Sheet không có dòng số nào (trang bìa, ghi chú) không phải bảng chỉ tiêu.
  const kq = docBaoCao(await docCacSheet(tep)).filter((s) => s.so_dong_co_so > 0);
  if (!kq.length) throw new Error('Không thấy bảng chỉ tiêu nào trong tệp (cần cột tên chỉ tiêu và cột số).');
  return kq;
}
