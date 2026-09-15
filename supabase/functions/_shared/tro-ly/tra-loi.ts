/**
 * Dựng câu trả lời của MIMI Assistant từ các kết quả năng lực.
 *
 * Dùng cho cả hai chế độ: khi có mô hình, `cau` là lời mô hình viết; khi không có (hoặc
 * cổng mô hình lỗi), `cau` ghép từ các câu tóm tắt tính bằng dữ liệu thật.
 */
import type { BuocXuLy, DeXuat, KetQuaNangLuc, NhomNangLuc, TraLoi } from './kieu.ts';

export const TEN_NHOM: Record<NhomNangLuc, string> = {
  tro_ly: 'Trợ lý & agent',
  chi_phi: 'Chi phí',
  chung_tu: 'Hoá đơn & chứng từ',
  ngan_hang: 'Ngân hàng & đối soát',
  ai_token: 'AI & token',
  bao_cao: 'Báo cáo',
  ket_noi: 'Kết nối',
};

export const CAU_CHUA_HIEU =
  'Mình chưa hiểu câu này. Bạn thử hỏi về: khoản đang chờ duyệt, chi phí tháng này, khoản chi thiếu hoá đơn, công nợ, dòng tiền, chi phí AI, báo cáo hoặc kết nối.';

export const SO_DE_XUAT_TOI_DA = 10;

export function dungTraLoi(o: { ketQua: KetQuaNangLuc[]; cheDo: TraLoi['che_do']; cauMoHinh?: string }): TraLoi {
  const { ketQua } = o;
  if (!ketQua.length) {
    return {
      cau: o.cauMoHinh?.trim() || CAU_CHUA_HIEU,
      buoc: [{ ten: 'hieu', cau: o.cauMoHinh ? 'Câu hỏi không cần đọc số liệu của công ty.' : 'Chưa nhận ra câu hỏi thuộc việc nào.' }],
      ket_qua: [],
      che_do: o.cheDo,
    };
  }

  // Cùng một đề xuất có thể đến từ hai năng lực: chỉ giữ một nút.
  const daCo = new Set<string>();
  const gonLai: KetQuaNangLuc[] = ketQua.map((r) => {
    const de_xuat: DeXuat[] = [];
    for (const d of r.de_xuat) {
      if (daCo.has(d.khoa) || daCo.size >= SO_DE_XUAT_TOI_DA) continue;
      daCo.add(d.khoa);
      de_xuat.push(d);
    }
    return { ...r, de_xuat };
  });

  const nhom = [...new Set(gonLai.map((r) => TEN_NHOM[r.nhom]))];
  const nguon = [...new Set(gonLai.flatMap((r) => r.nguon.map((n) => n.ten)))];
  const soThe = gonLai.reduce((s, r) => s + r.the.length, 0);
  const buoc: BuocXuLy[] = [
    { ten: 'hieu', cau: `Hiểu là bạn hỏi về ${nhom.join(', ').toLowerCase()}.` },
    { ten: 'du_lieu', cau: nguon.length ? `Đã đọc: ${nguon.join(', ')}.` : 'Không cần đọc thêm dữ liệu.' },
    { ten: 'phan_tich', cau: soThe ? `Tính ra ${soThe} bảng số liệu từ dữ liệu thật của công ty.` : 'Chưa đủ dữ liệu để lập bảng.' },
    { ten: 'de_xuat', cau: daCo.size ? `${daCo.size} việc bạn có thể làm ngay — bấm để xem lại rồi xác nhận.` : 'Không có việc nào cần bạn xác nhận.' },
  ];

  return {
    cau: o.cauMoHinh?.trim() || gonLai.map((r) => r.tom_tat).join('\n\n'),
    buoc,
    ket_qua: gonLai,
    che_do: o.cheDo,
  };
}
