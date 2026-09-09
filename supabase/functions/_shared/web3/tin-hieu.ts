import type { GiaDoiChieu } from './gia-san.ts';

/**
 * Bầy tác tử đọc thị trường tài sản số: giá nhiều sàn, vĩ mô, và pháp lý.
 *
 * VÌ SAO THỨ NÀY CÓ LÝ DO TỒN TẠI, VÀ VÌ SAO LÝ DO ĐÓ HẸP.
 *
 * Giá thì sàn nào cũng có, và app của Binance hiển thị giá tốt hơn mình mãi
 * mãi. "AI phân tích crypto" cũng đã đông: toàn cầu có Nansen, Arkham,
 * Messari, Token Metrics; riêng Việt Nam đã có Ngân Crypto, Ainosha (tra ngày
 * 09/09/2026). Vào bằng cửa đó là làm người đến sau.
 *
 * Chỗ còn trống là **lịch hiệu lực của văn bản pháp luật, theo nhiều quốc
 * gia**: văn bản nào sắp hiệu lực, áp lên ai, ở đâu. Nó khó vì phải có người
 * đọc chứ không cào được — `legal_documents` của MIMI vốn đã theo kỷ luật đó,
 * mỗi dòng vào bằng migration sau khi có người đọc và tóm tắt.
 *
 * Và ở đây xuất phát từ Việt Nam là lợi thế chứ không phải bất lợi: quy định
 * của các thị trường mới nổi bị công cụ phương Tây bỏ trống.
 *
 * BỐN TÁC TỬ, MỖI TÁC TỬ MỘT VIỆC, HỘI TỤ VỀ MỘT BỐI CẢNH:
 *
 *   THU_THAP  đọc giá từ các sàn, đối chiếu chéo   → `gia-san.ts`
 *   VI_MO     đọc tin đã phân loại                  → `macro-news/analysis.ts`
 *   PHAP_LY   đọc văn bản sắp/vừa hiệu lực          → `legal_documents`
 *   TONG_HOP  gộp lại thành một bối cảnh có dẫn chứng
 *
 * BẰNG CHỨNG LÀ DỮ LIỆU CÓ CẤU TRÚC, KHÔNG PHẢI CÂU CHỮ.
 *
 * Bản đầu (464d579) nướng cứng câu tiếng Việt vào đây — `"BTC đang ở … tăng
 * …%"`. Sai ngay khi sản phẩm nhắm thị trường ngoài Việt Nam, và sai cả với
 * người dùng Việt đang bật giao diện tiếng Anh, vì MIMI đã có i18next với hai
 * ngôn ngữ. Logic quyết định **cái gì đáng nói**; tầng hiển thị quyết định
 * **nói bằng chữ nào**.
 *
 * MỖI DÒNG PHẢI CÓ NGUỒN ĐI KÈM. Không có `dan` thì không hiện. Kỷ luật này đã
 * áp cho phần thuế và phần nghiệm thu; ở đây nó nặng hơn, vì người đọc sẽ dùng
 * nó để quyết định về tiền của họ.
 *
 * KHÔNG SINH RA CHỮ "MUA" HAY "BÁN". Module mô tả **điều đang xảy ra và bằng
 * chứng của nó**, rồi dừng. Ba lý do, xếp theo sức nặng:
 *
 *  1. Một khuyến nghị sai làm người dùng mất tiền thật.
 *  2. Đưa khuyến nghị mua bán là hoạt động có điều kiện ở phần lớn thị trường;
 *     mô tả dữ liệu thì không. Điều này càng đúng khi bán ra nhiều quốc gia.
 *  3. Bối cảnh có dẫn chứng hữu ích hơn một chữ "mua": nó cho người đọc thứ để
 *     tự kiểm, còn chữ "mua" thì bắt họ tin.
 */

export type NguonBangChung = 'thi_truong' | 'vi_mo' | 'phap_ly';

/**
 * Mã sự kiện. Tầng hiển thị tra mã này ra câu chữ theo ngôn ngữ đang bật.
 *
 * Dùng mã thay vì câu để một sự kiện mới không thể lọt ra giao diện mà chưa có
 * bản dịch — thiếu mã thì hiện chính mã đó, thấy ngay, thay vì hiện tiếng Việt
 * cho người đọc tiếng Anh.
 */
export type MaSuKien =
  | 'gia.hien_tai'
  | 'gia.khong_doc_duoc'
  | 'gia.lech_bat_thuong'
  | 'vi_mo.tin'
  | 'phap_ly.sap_hieu_luc'
  | 'phap_ly.hieu_luc_hom_nay'
  | 'phap_ly.vua_hieu_luc';

export interface BangChung {
  nguon: NguonBangChung;
  ma: MaSuKien;
  /** Tham số để tầng hiển thị ghép câu. Chỉ dữ liệu, không có câu chữ. */
  thamSo: Record<string, string | number>;
  /** Ai nói, hoặc đo từ đâu. Tên riêng nên không cần dịch. */
  dan: string;
  url?: string;
}

export interface TinViMo {
  tieuDe: string;
  chuDe: string;
  tacDong: 'positive' | 'negative' | 'neutral';
  nguon: string;
  url?: string;
}

export interface VanBanPhapLy {
  soHieu: string;
  ten: string;
  /** ISO date. */
  ngayHieuLuc: string | null;
  doiTuongApDung: string | null;
  tomTatDeHieu: string | null;
  url: string | null;
  /**
   * Mã quốc gia ISO 3166-1 alpha-2, hoặc `EU`. Mặc định `VN` cho dòng cũ —
   * `legal_documents` sinh ra để phục vụ luật Việt Nam nên mọi dòng hiện có
   * đều là VN, và đoán khác đi là bịa.
   */
  quocGia?: string;
}

export type MucChuY = 'binh_thuong' | 'dang_chu_y' | 'can_doc_ky';

export interface BoiCanh {
  mucChuY: MucChuY;
  /** Mã cho câu mở đầu; tầng hiển thị dịch. */
  maMoDau: MaSuKien | 'tong.khong_co_gi' | 'tong.co_phap_ly' | 'tong.lech_gia' | 'tong.co_vi_mo';
  thamSoMoDau: Record<string, string | number>;
  bangChung: BangChung[];
  /** Các quốc gia có bằng chứng pháp lý trong kỳ này. */
  quocGia: string[];
}

/** Số ngày tính là "sắp hiệu lực" — đủ gần để đáng nhắc, đủ xa để kịp chuẩn bị. */
export const NGAY_SAP_HIEU_LUC = 90;

/**
 * Từ khoá nhận diện văn bản về tài sản số, theo từng ngôn ngữ.
 *
 * DÙNG TỪ KHOÁ, VÀ CHẤP NHẬN LÀ NÓ THÔ. Không suy diễn từ cơ quan ban hành hay
 * loại văn bản. Bỏ sót thì mất một dòng bối cảnh; khớp bừa thì hiện một văn bản
 * không liên quan ngay cạnh giá coin, và người đọc tưởng hai thứ dính nhau.
 */
const TU_KHOA = [
  // Tiếng Việt
  'tài sản số',
  'tài sản mã hóa',
  'tài sản mã hoá',
  'tiền mã hóa',
  'tiền mã hoá',
  'tiền ảo',
  'công nghệ số',
  'sàn giao dịch tài sản',
  // Tiếng Anh — cần cho các thị trường ngoài Việt Nam
  'crypto-asset',
  'crypto asset',
  'cryptocurrency',
  'digital asset',
  'virtual asset',
  'stablecoin',
  'blockchain',
  'distributed ledger',
];

export function lienQuanTaiSanSo(vb: VanBanPhapLy): boolean {
  const kho = `${vb.ten} ${vb.doiTuongApDung ?? ''} ${vb.tomTatDeHieu ?? ''}`.toLowerCase();
  return TU_KHOA.some((t) => kho.includes(t));
}

function soNgayToi(hieuLuc: string, luc: Date): number {
  const a = new Date(luc.getFullYear(), luc.getMonth(), luc.getDate()).getTime();
  const d = new Date(hieuLuc);
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** THU_THAP → bằng chứng thị trường. */
export function bangChungThiTruong(gia: GiaDoiChieu[]): BangChung[] {
  const ra: BangChung[] = [];
  for (const g of gia) {
    if (g.gia === null) {
      ra.push({ nguon: 'thi_truong', ma: 'gia.khong_doc_duoc', thamSo: { ma: g.ma }, dan: g.ghiChu });
      continue;
    }

    ra.push({
      nguon: 'thi_truong',
      ma: 'gia.hien_tai',
      thamSo: {
        ma: g.ma,
        gia: g.gia,
        ...(g.doi24h === null ? {} : { doi24h: g.doi24h }),
        soSan: g.nguon.length,
      },
      dan: g.ghiChu,
    });

    // Lệch giữa hai sàn là một sự kiện riêng, không phải chú thích của giá.
    if (g.mucLech === 'lech_dang_ke') {
      ra.push({
        nguon: 'thi_truong',
        ma: 'gia.lech_bat_thuong',
        thamSo: { ma: g.ma, lech: g.lechPhanTram ?? 0 },
        dan: g.ghiChu,
      });
    }
  }
  return ra;
}

/** VI_MO → bằng chứng vĩ mô. Chỉ lấy tin đã được phân loại là có tác động. */
export function bangChungViMo(tin: TinViMo[]): BangChung[] {
  return tin
    .filter((t) => t.tacDong !== 'neutral')
    .map((t) => ({
      nguon: 'vi_mo' as const,
      ma: 'vi_mo.tin' as const,
      // Tiêu đề giữ nguyên văn của nhà xuất bản, không dịch và không tóm tắt
      // lại: đó là câu họ viết, và sửa nó là nói thay họ.
      thamSo: { tieuDe: t.tieuDe, chuDe: t.chuDe, tacDong: t.tacDong },
      dan: t.nguon,
      ...(t.url ? { url: t.url } : {}),
    }));
}

/**
 * PHAP_LY → bằng chứng pháp lý, đa quốc gia.
 *
 * Chỉ lấy văn bản **liên quan tài sản số** và **sắp hoặc vừa hiệu lực**. Một
 * văn bản đã hiệu lực hai năm không phải tin; một văn bản còn hai năm nữa mới
 * hiệu lực cũng không phải việc của hôm nay.
 */
export function bangChungPhapLy(vanBan: VanBanPhapLy[], luc: Date = new Date()): BangChung[] {
  const ra: BangChung[] = [];
  for (const vb of vanBan) {
    if (!lienQuanTaiSanSo(vb) || !vb.ngayHieuLuc) continue;
    const con = soNgayToi(vb.ngayHieuLuc, luc);
    if (con > NGAY_SAP_HIEU_LUC || con < -NGAY_SAP_HIEU_LUC) continue;

    const ma: MaSuKien =
      con > 0 ? 'phap_ly.sap_hieu_luc' : con === 0 ? 'phap_ly.hieu_luc_hom_nay' : 'phap_ly.vua_hieu_luc';

    ra.push({
      nguon: 'phap_ly',
      ma,
      thamSo: {
        soHieu: vb.soHieu,
        ten: vb.ten,
        quocGia: vb.quocGia ?? 'VN',
        ngay: Math.abs(con),
        ...(vb.doiTuongApDung ? { doiTuong: vb.doiTuongApDung } : {}),
      },
      dan: `${vb.quocGia ?? 'VN'} · ${vb.soHieu}`,
      ...(vb.url ? { url: vb.url } : {}),
    });
  }
  return ra;
}

/**
 * TONG_HOP → gộp thành một bối cảnh.
 *
 * MỨC CHÚ Ý XẾP THEO LOẠI BẰNG CHỨNG, KHÔNG THEO SỐ LƯỢNG. Mười dòng tin vĩ mô
 * không bằng một văn bản pháp luật sắp hiệu lực: tin thì đổi hàng ngày, còn
 * ngày hiệu lực thì không đổi và có hậu quả cụ thể.
 */
export function tongHop(bangChung: BangChung[]): BoiCanh {
  const phapLy = bangChung.filter((b) => b.nguon === 'phap_ly');
  const lech = bangChung.filter((b) => b.ma === 'gia.lech_bat_thuong');
  const viMo = bangChung.filter((b) => b.nguon === 'vi_mo');

  const quocGia = [...new Set(phapLy.map((b) => String(b.thamSo.quocGia)))].sort();

  const mucChuY: MucChuY =
    phapLy.length || lech.length ? 'can_doc_ky' : viMo.length ? 'dang_chu_y' : 'binh_thuong';

  const [maMoDau, thamSoMoDau] = phapLy.length
    ? (['tong.co_phap_ly', { soVanBan: phapLy.length, quocGia: quocGia.join(', ') }] as const)
    : lech.length
      ? (['tong.lech_gia', { soMa: lech.length }] as const)
      : viMo.length
        ? (['tong.co_vi_mo', { soTin: viMo.length }] as const)
        : (['tong.khong_co_gi', {}] as const);

  return {
    mucChuY,
    maMoDau,
    thamSoMoDau: thamSoMoDau as Record<string, string | number>,
    bangChung,
    quocGia,
  };
}
