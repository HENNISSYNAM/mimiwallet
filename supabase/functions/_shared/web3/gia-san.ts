/**
 * Đối chiếu giá một tài sản số từ hai sàn, và nói ra khi hai sàn không khớp.
 *
 * VÌ SAO HỎI HAI SÀN CHỨ KHÔNG MỘT. Một sàn trả về một con số, và con số đó
 * không có gì để đối chứng. Nếu Binance lỗi, trả giá cũ, hoặc bị chặn theo vùng
 * và trả về một trang lỗi mà mình đọc nhầm thành số — không có cách nào biết.
 * Hai sàn thì một sàn hỏng là lộ ngay dưới dạng chênh lệch bất thường.
 *
 * Đây cùng một kỷ luật với `vietqr.ts` (đối chiếu CRC với vector chuẩn) và với
 * `cot-co-that.test.ts`: một phép đo không có gì đối chứng là một phép đo có
 * thể sai lặng lẽ.
 *
 * VÀ CHÊNH LỆCH TỰ NÓ LÀ THÔNG TIN. Hai sàn lớn lệch quá 1% cho cùng một cặp
 * thanh khoản cao là chuyện đáng chú ý — thường là thanh khoản mỏng, một sàn
 * đang tắc rút tiền, hoặc dữ liệu cũ. Không nuốt nó; báo ra.
 *
 * CHỈ DÙNG ENDPOINT CÔNG KHAI, KHÔNG KHOÁ API. Không đăng nhập, không quyền
 * giao dịch, không giữ tài sản của ai. Đây là ranh giới cố ý: đọc giá công khai
 * là đọc dữ liệu thị trường, còn nối tài khoản sàn là chuyện hoàn toàn khác về
 * cả kỹ thuật lẫn pháp lý.
 */

export interface BaoGia {
  /** Tên sàn, để câu trả lời nói được nguồn. */
  san: string;
  /** Giá quy đổi sang USD. */
  gia: number;
  /** Phần trăm thay đổi 24 giờ. `null` khi sàn không trả về. */
  doi24h: number | null;
}

export type MucLech = 'khop' | 'lech_nhe' | 'lech_dang_ke';

export interface GiaDoiChieu {
  ma: string;
  /** Trung vị của các báo giá đọc được. `null` khi không sàn nào trả lời. */
  gia: number | null;
  doi24h: number | null;
  /** Chênh lệch giữa báo giá cao nhất và thấp nhất, tính theo phần trăm. */
  lechPhanTram: number | null;
  mucLech: MucLech;
  /** Các sàn đã trả lời. Rỗng nghĩa là không đọc được gì. */
  nguon: string[];
  /** Câu mô tả tình trạng dữ liệu, luôn có. */
  ghiChu: string;
}

/** Ngưỡng coi là lệch đáng kể, tính theo phần trăm giữa hai báo giá. */
export const NGUONG_LECH = 1;

function trungVi(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const g = Math.floor(s.length / 2);
  return s.length % 2 ? s[g] : (s[g - 1] + s[g]) / 2;
}

/**
 * Gộp báo giá từ nhiều sàn thành một con số, kèm mức tin cậy.
 *
 * DÙNG TRUNG VỊ, KHÔNG DÙNG TRUNG BÌNH. Một sàn trả về giá hỏng — số 0, giá của
 * hôm qua, hay một số lệch mười lần — kéo trung bình đi theo nó. Trung vị thì
 * không, và với ba sàn trở lên nó bỏ qua được đúng một nguồn hỏng.
 *
 * Báo giá <= 0 bị loại trước khi tính: đó là dữ liệu hỏng chứ không phải một
 * mức giá, và giữ nó lại chỉ để trung vị "dân chủ" là để một lỗi bỏ phiếu.
 */
export function doiChieuGia(ma: string, baoGia: BaoGia[]): GiaDoiChieu {
  const hopLe = baoGia.filter((b) => Number.isFinite(b.gia) && b.gia > 0);
  const nguon = hopLe.map((b) => b.san);

  if (!hopLe.length) {
    return {
      ma,
      gia: null,
      doi24h: null,
      lechPhanTram: null,
      mucLech: 'khop',
      nguon: [],
      ghiChu: 'Không sàn nào trả về giá. Chưa có dữ liệu để nói gì.',
    };
  }

  const gia = trungVi(hopLe.map((b) => b.gia));
  const cacDoi = hopLe.map((b) => b.doi24h).filter((d): d is number => d !== null);
  const doi24h = cacDoi.length ? trungVi(cacDoi) : null;

  if (hopLe.length === 1) {
    return {
      ma,
      gia,
      doi24h,
      lechPhanTram: null,
      mucLech: 'khop',
      nguon,
      /*
       * Nói rõ là chỉ một nguồn. Con số vẫn hiện, nhưng người đọc phải biết nó
       * không có gì đối chứng — khác hẳn con số đã khớp giữa hai sàn.
       */
      ghiChu: `Chỉ ${nguon[0]} trả lời, không có nguồn thứ hai để đối chiếu.`,
    };
  }

  const cao = Math.max(...hopLe.map((b) => b.gia));
  const thap = Math.min(...hopLe.map((b) => b.gia));
  const lechPhanTram = ((cao - thap) / thap) * 100;
  const mucLech: MucLech =
    lechPhanTram >= NGUONG_LECH ? 'lech_dang_ke' : lechPhanTram > 0 ? 'lech_nhe' : 'khop';

  const ghiChu =
    mucLech === 'lech_dang_ke'
      ? `${nguon.join(' và ')} lệch ${lechPhanTram.toFixed(2)}% — cao hơn ngưỡng ${NGUONG_LECH}%. Kiểm lại trước khi dùng con số này.`
      : `${nguon.join(' và ')} khớp nhau trong ${lechPhanTram.toFixed(2)}%.`;

  return { ma, gia, doi24h, lechPhanTram, mucLech, nguon, ghiChu };
}
