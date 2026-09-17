/**
 * Dựng câu trả lời của MIMI Assistant từ các kết quả năng lực.
 *
 * Dùng cho cả hai chế độ: khi có mô hình, `cau` là lời mô hình viết; khi không có (hoặc
 * cổng mô hình lỗi), `cau` ghép từ các câu tóm tắt tính bằng dữ liệu thật.
 */
import type { BuocXuLy, DeXuat, KetQuaNangLuc, NhomNangLuc, TraLoi } from './kieu.ts';
import { cauCanhBao, trangThaiChung } from './do-day.ts';
import { boDau } from './y-dinh.ts';
import { hoiChiSoKeToan } from '../chi-so/tu-dien.ts';

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

/** Năng lực chỉ đọc tiền ngân hàng — hỏi lợi nhuận mà ra những năng lực này thì phải nói rõ. */
const NANG_LUC_DONG_TIEN = new Set(['bao_cao_tai_chinh', 'dong_tien', 'chi_phi_thang']);

export const CAU_CHUA_CO_SO_KE_TOAN =
  'MIMI chưa tính được lợi nhuận, lãi lỗ hay báo cáo tài chính vì chưa có sổ kế toán của bạn. Dưới đây là dòng tiền ngân hàng — chưa phải các chỉ số đó.';

export function dungTraLoi(o: { ketQua: KetQuaNangLuc[]; cheDo: TraLoi['che_do']; cauMoHinh?: string; cauHoi?: string }): TraLoi {
  const { ketQua } = o;
  if (!ketQua.length) {
    return {
      cau: o.cauMoHinh?.trim() || CAU_CHUA_HIEU,
      buoc: [{ ten: 'hieu', cau: o.cauMoHinh ? 'Câu hỏi không cần đọc số liệu của công ty.' : 'Chưa nhận ra câu hỏi thuộc việc nào.' }],
      ket_qua: [],
      che_do: o.cheDo,
      do_day: 'complete',
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

  // P0-002: nguồn thiếu thì câu trả lời mở đầu bằng cảnh báo — kể cả khi mô hình viết lời,
  // vì mô hình có thể dùng số trong tóm tắt mà bỏ qua câu cảnh báo đứng trước nó.
  const doDay = [...new Map(gonLai.flatMap((r) => r.do_day ?? []).map((d) => [d.nguon, d])).values()];
  const canhBao = cauCanhBao(doDay);
  const cauMoHinh = o.cauMoHinh?.trim();
  if (canhBao) buoc[1] = { ten: 'du_lieu', cau: `${buoc[1].cau} ${canhBao}` };

  // P0-004: hỏi lợi nhuận/BCTC mà chỉ có dòng tiền ngân hàng → nói thẳng trước mọi con số.
  const thuatNgu = o.cauHoi && hoiChiSoKeToan(boDau(o.cauHoi)) && gonLai.some((r) => NANG_LUC_DONG_TIEN.has(r.nang_luc))
    ? CAU_CHUA_CO_SO_KE_TOAN
    : null;
  // Không có mô hình: tóm tắt từng năng lực đã tự mang cảnh báo độ đầy đủ (apDoDay), không chèn lần hai.
  const than = cauMoHinh ? (canhBao ? `${canhBao}\n\n${cauMoHinh}` : cauMoHinh) : gonLai.map((r) => r.tom_tat).join('\n\n');

  return {
    cau: thuatNgu ? `${thuatNgu}\n\n${than}` : than,
    buoc,
    ket_qua: gonLai,
    che_do: o.cheDo,
    do_day: trangThaiChung(doDay),
  };
}
