/**
 * ĐỒNG NGHIỆP (24/11/2026) — nhóm chat của workflow có các mèo biết phản ứng như người: xong việc thì mèo kế tiếp thả 👍 và nhận
 * việc; bước kẹt thì Mèo Thư ký lo lắng và nhờ người xem; người duyệt thì được cảm ơn; cả quy trình xong thì cả nhà ăn mừng.
 *
 * KHÔNG GỌI AI, KHÔNG TỐN XU: phản ứng được suy ra chắc chắn từ đồ thị và trạng thái thật của lần chạy (cùng đầu vào → cùng
 * câu), nên không bao giờ bịa việc chưa làm. Câu chọn theo mã bước để nhóm không lặp một câu mãi. Hàm thuần, dễ kiểm.
 */
import type { DoThiHien, NutHien } from './do-thi.ts';

export interface PhanUng { meo: string; emoji: string }
export interface TinNhom { meo: string; noi: string }
export interface DongNghiep { phan_ung: PhanUng[]; tra?: TinNhom }

const chonCau = (cau: string[], khoa: string) => cau[[...khoa].reduce((s, c) => s + c.charCodeAt(0), 0) % cau.length];

/** Mèo của bước agent kế tiếp (nếu có) — con mèo "nhận tay" việc. */
const meoKeTiep = (d: DoThiHien, nutId: string): string | null => {
  for (const c of d.canh) {
    if (c.tu !== nutId) continue;
    const n = d.nut.find((x) => x.id === c.den);
    if (n?.lam === 'agent' && n.meo) return n.meo;
  }
  return null;
};

const meoTrongNhom = (d: DoThiHien) => [...new Set(d.nut.map((n) => n.meo).filter((m): m is NonNullable<NutHien['meo']> => !!m))];

/** Mèo vừa báo "xong" hoặc "kẹt" một bước → phản ứng của đồng nghiệp. */
export function sauBuoc(d: DoThiHien, nut: NutHien, kieu: 'xong' | 'chan'): DongNghiep {
  const cua = nut.meo ?? 'thu_ky';
  if (kieu === 'chan') {
    if (cua === 'thu_ky') return { phan_ung: [] };
    return {
      phan_ung: [{ meo: 'thu_ky', emoji: '😟' }],
      tra: { meo: 'thu_ky', noi: chonCau(['Bước này đang kẹt — anh/chị xem giúp em với nhé 🙏', 'Chỗ này em chưa qua được, mình cần người xử lý giúp ạ 🙏'], nut.id) },
    };
  }
  const tiep = meoKeTiep(d, nut.id);
  if (tiep && tiep !== cua) {
    return { phan_ung: [{ meo: tiep, emoji: '👍' }], tra: { meo: tiep, noi: chonCau(['Nhận rồi, em làm tiếp nhé 👌', 'Em nhận bước tiếp theo ạ 🙌', 'Ok, đến lượt em rồi 💪'], nut.id) } };
  }
  const khac = meoTrongNhom(d).find((m) => m !== cua);
  return { phan_ung: khac ? [{ meo: khac, emoji: '👍' }] : [] };
}

/** Người vừa quyết một bước (duyệt / cần sửa / làm tay) → Mèo Thư ký ghi nhận, cảm ơn. */
export function sauNguoi(quyet: 'xong' | 'duyet' | 'tu_choi'): DongNghiep {
  if (quyet === 'duyet') return { phan_ung: [{ meo: 'thu_ky', emoji: '❤️' }], tra: { meo: 'thu_ky', noi: 'Đã nhận quyết định duyệt, cảm ơn anh/chị ạ 🙌' } };
  if (quyet === 'tu_choi') return { phan_ung: [{ meo: 'thu_ky', emoji: '🙏' }], tra: { meo: 'thu_ky', noi: 'Dạ em ghi nhận, cần sửa — em chỉnh lại ngay ạ 🙏' } };
  return { phan_ung: [{ meo: 'thu_ky', emoji: '👍' }], tra: { meo: 'thu_ky', noi: 'Cảm ơn anh/chị, cả nhà đi tiếp nhé 👍' } };
}

/** Cả quy trình vừa xong → ăn mừng (Thư ký báo, các mèo khác thả 🎉). */
export function ketThuc(d: DoThiHien): DongNghiep {
  return {
    phan_ung: meoTrongNhom(d).filter((m) => m !== 'thu_ky').slice(0, 4).map((meo) => ({ meo, emoji: '🎉' })),
    tra: { meo: 'thu_ky', noi: 'Xong cả quy trình rồi, cả nhà làm tốt lắm 🎉' },
  };
}
