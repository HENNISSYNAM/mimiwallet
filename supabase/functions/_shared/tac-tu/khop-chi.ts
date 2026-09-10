/**
 * Khoản chi đã duyệt nào đã thật sự rời tài khoản — đọc từ sao kê, không tin lời ai.
 *
 * VÌ SAO CẦN. MIMI không chuyển tiền, nên "đã duyệt" chỉ là một lời cho phép.
 * Tiền có đi hay không, đi đúng số hay không, chỉ sao kê ngân hàng mới biết. Nếu
 * không đối soát, màn hình sẽ coi mọi khoản đã duyệt là đã chi — đúng loại con
 * số tự chế mà sản phẩm này đã gỡ bốn lần.
 *
 * KHỚP BẰNG MÃ THAM CHIẾU, SỐ TIỀN ĐỂ KIỂM. Lệnh trả mang mã `MIMIxxxxxx` trong
 * nội dung chuyển khoản; `sepay-map` đã đọc mã đó ra `payment_reference`. Cùng
 * mã mà khác số tiền là "lệch" — người trả gõ nhầm, hoặc trả một phần. Không tự
 * đóng: một người phải quyết.
 *
 * CHỈ TIỀN RA. Một khoản tiền VÀO mang cùng mã (ví dụ người nhận hoàn lại) không
 * phải là bằng chứng đã chi.
 */

export interface YeuCauChoKhop {
  id: string;
  maThamChieu: string;
  soTien: number;
}

export interface GiaoDichRa {
  id: string;
  amount: number;
  type: string;
  payment_reference: string | null;
}

export interface KetQuaKhop {
  khop: Array<{ yeuCauId: string; giaoDichId: string; soTien: number }>;
  lech: Array<{ yeuCauId: string; giaoDichId: string; mongDoi: number; thucTe: number }>;
}

export function khopChiTacTu(
  yeuCau: YeuCauChoKhop[],
  giaoDich: GiaoDichRa[],
  /** Giao dịch đã gắn với một yêu cầu khác — không dùng lại. */
  daDung: ReadonlySet<string> = new Set(),
): KetQuaKhop {
  const ketQua: KetQuaKhop = { khop: [], lech: [] };
  const dung = new Set(daDung);

  const tienRa = giaoDich.filter(
    (g) => g.payment_reference && (g.type === 'expense' || Number(g.amount) < 0),
  );

  for (const y of yeuCau) {
    const ungVien = tienRa.filter((g) => g.payment_reference === y.maThamChieu && !dung.has(g.id));
    if (!ungVien.length) continue;

    const dungSo = ungVien.find((g) => Math.abs(Number(g.amount)) === y.soTien);
    if (dungSo) {
      dung.add(dungSo.id);
      ketQua.khop.push({ yeuCauId: y.id, giaoDichId: dungSo.id, soTien: y.soTien });
      continue;
    }

    const g = ungVien[0];
    ketQua.lech.push({
      yeuCauId: y.id,
      giaoDichId: g.id,
      mongDoi: y.soTien,
      thucTe: Math.abs(Number(g.amount)),
    });
  }

  return ketQua;
}
