import type { GiaDoiChieu } from './gia-san.ts';

/**
 * Bầy tác tử đọc thị trường tài sản số bằng dữ liệu Việt Nam.
 *
 * VÌ SAO THỨ NÀY CÓ LÝ DO TỒN TẠI. Giá thì sàn nào cũng có, và app của Binance
 * hiển thị giá tốt hơn MIMI mãi mãi. Thứ không ai làm là ghép ba nguồn:
 *
 *   giá công khai từ nhiều sàn  +  vĩ mô Việt Nam  +  văn bản pháp luật Việt Nam
 *
 * MIMI đã có sẵn hai nguồn sau — `macro-news` đọc RSS và phân loại, còn
 * `legal_documents` giữ văn bản đã có người đọc và tóm tắt. Đó là tài sản
 * riêng, không mua được bằng một khoá API.
 *
 * BỐN TÁC TỬ, MỖI TÁC TỬ MỘT VIỆC, HỘI TỤ VỀ MỘT BỐI CẢNH:
 *
 *   THU_THAP  đọc giá từ các sàn, đối chiếu chéo   → `gia-san.ts`
 *   VI_MO     đọc tin vĩ mô đã phân loại            → `macro-news/analysis.ts`
 *   PHAP_LY   đọc văn bản sắp/vừa hiệu lực          → `legal_documents`
 *   TONG_HOP  gộp lại thành một bối cảnh có dẫn chứng
 *
 * MỖI CÂU PHẢI CÓ DẪN CHỨNG ĐI KÈM. Không có `BangChung` thì không có dòng nào
 * được hiện. Đây là kỷ luật đã áp cho phần thuế và phần nghiệm thu, và ở đây nó
 * còn quan trọng hơn: người đọc sẽ dùng nó để quyết định về tiền của họ.
 *
 * KHÔNG SINH RA CHỮ "MUA" HAY "BÁN". Module này mô tả **điều đang xảy ra và
 * bằng chứng của nó**, rồi dừng. Ba lý do, xếp theo sức nặng:
 *
 *  1. Một khuyến nghị sai làm người dùng mất tiền thật, và người dùng ở đây là
 *     chủ hộ kinh doanh không chuyên — không phải nhà giao dịch.
 *  2. Đưa khuyến nghị mua bán là hoạt động có điều kiện; mô tả dữ liệu thì không.
 *  3. Một bối cảnh có dẫn chứng thật ra hữu ích hơn một chữ "mua": nó cho người
 *     đọc thứ để tự kiểm, còn chữ "mua" thì bắt họ tin.
 */

export type NguonBangChung = 'thi_truong' | 'vi_mo' | 'phap_ly';

export interface BangChung {
  nguon: NguonBangChung;
  /** Câu ngắn, tự nó đứng được. */
  cau: string;
  /** Ai nói, hoặc đo từ đâu. Không có thì không đưa vào. */
  dan: string;
  /** Đường dẫn tới nguồn, nếu có. */
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
}

export type MucChuY = 'binh_thuong' | 'dang_chu_y' | 'can_doc_ky';

export interface BoiCanh {
  /** Mức đáng chú ý, để giao diện chọn màu mà không tự đặt ngưỡng riêng. */
  mucChuY: MucChuY;
  /** Câu đầu tiên người đọc thấy. Luôn có, kể cả khi không có gì đặc biệt. */
  cauMoDau: string;
  bangChung: BangChung[];
  /** Câu bắt buộc, không phải câu lịch sự. */
  luuY: string;
}

/** Số ngày tính là "sắp hiệu lực" — đủ gần để đáng nhắc, đủ xa để kịp chuẩn bị. */
export const NGAY_SAP_HIEU_LUC = 90;

/**
 * Văn bản có nói tới tài sản số không.
 *
 * DÙNG TỪ KHOÁ, VÀ CHẤP NHẬN LÀ NÓ THÔ. Không suy diễn từ tên cơ quan ban hành
 * hay loại văn bản — chỉ khớp cụm từ trong tên và đối tượng áp dụng. Bỏ sót thì
 * mất một dòng bối cảnh; khớp bừa thì hiện một văn bản không liên quan bên cạnh
 * giá coin, và người đọc tưởng hai thứ dính nhau.
 */
const TU_KHOA_TAI_SAN_SO = [
  'tài sản số',
  'tài sản mã hóa',
  'tài sản mã hoá',
  'tiền mã hóa',
  'tiền mã hoá',
  'tiền ảo',
  'blockchain',
  'công nghệ số',
  'sàn giao dịch tài sản',
];

export function lienQuanTaiSanSo(vb: VanBanPhapLy): boolean {
  const kho = `${vb.ten} ${vb.doiTuongApDung ?? ''} ${vb.tomTatDeHieu ?? ''}`.toLowerCase();
  return TU_KHOA_TAI_SAN_SO.some((t) => kho.includes(t));
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
      ra.push({
        nguon: 'thi_truong',
        cau: `Không đọc được giá ${g.ma}.`,
        dan: g.ghiChu,
      });
      continue;
    }

    const doi =
      g.doi24h === null
        ? ''
        : ` ${g.doi24h >= 0 ? 'tăng' : 'giảm'} ${Math.abs(g.doi24h).toFixed(2)}% trong 24 giờ,`;
    ra.push({
      nguon: 'thi_truong',
      cau: `${g.ma} đang ở ${g.gia.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} USD,${doi} theo ${g.nguon.length} sàn.`,
      dan: g.ghiChu,
    });

    // Lệch giữa hai sàn là một sự kiện riêng, không phải chú thích của giá.
    if (g.mucLech === 'lech_dang_ke') {
      ra.push({
        nguon: 'thi_truong',
        cau: `Hai sàn báo giá ${g.ma} lệch nhau bất thường.`,
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
      cau: t.tieuDe,
      dan: `${t.nguon} · chủ đề ${t.chuDe}`,
      ...(t.url ? { url: t.url } : {}),
    }));
}

/**
 * PHAP_LY → bằng chứng pháp lý.
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

    const moc =
      con > 0
        ? `còn ${con} ngày nữa hiệu lực`
        : con === 0
          ? 'hiệu lực từ hôm nay'
          : `đã hiệu lực ${-con} ngày`;

    ra.push({
      nguon: 'phap_ly',
      cau: `${vb.soHieu} — ${vb.ten}`,
      dan: `${moc}${vb.doiTuongApDung ? ` · áp dụng cho ${vb.doiTuongApDung}` : ''}`,
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
  const coPhapLy = bangChung.some((b) => b.nguon === 'phap_ly');
  const coBatThuong = bangChung.some(
    (b) => b.nguon === 'thi_truong' && b.cau.includes('lệch nhau bất thường'),
  );
  const soViMo = bangChung.filter((b) => b.nguon === 'vi_mo').length;

  const mucChuY: MucChuY = coPhapLy || coBatThuong ? 'can_doc_ky' : soViMo ? 'dang_chu_y' : 'binh_thuong';

  const cauMoDau = coPhapLy
    ? 'Có văn bản pháp luật liên quan tài sản số sắp hoặc vừa có hiệu lực.'
    : coBatThuong
      ? 'Giá giữa các sàn đang lệch bất thường.'
      : soViMo
        ? `Có ${soViMo} tin vĩ mô đáng chú ý trong kỳ.`
        : 'Không có sự kiện nào nổi bật trong kỳ.';

  return {
    mucChuY,
    cauMoDau,
    bangChung,
    /*
     * Câu bắt buộc, cùng kỷ luật với `tax-summary` và `ChonCachTinhThue`: tính
     * ra một con số không có nghĩa là con số đó thay được người quyết định.
     */
    luuY:
      'Đây là bối cảnh thị trường và pháp lý, không phải khuyến nghị mua bán. ' +
      'Tài sản số biến động mạnh và có thể mất phần lớn giá trị. ' +
      'MIMI không giữ tài sản, không đặt lệnh, và không nhận uỷ thác đầu tư.',
  };
}
