/**
 * Người mới vào MIMI thì làm gì trước.
 *
 * VÌ SAO KHÔNG PHẢI MỘT TOUR NĂM TRANG: với MIMI chỉ có **một** việc thật sự
 * quan trọng — liên kết ngân hàng. Chưa có nó thì mọi màn hình đều rỗng: không
 * giao dịch, không dòng tiền, không đối soát, không chứng từ. Một tour trình bày
 * năm tính năng cho người chưa có dữ liệu nào là năm lời hứa suông.
 *
 * QUY TẮC QUAN TRỌNG NHẤT CỦA FILE NÀY: **mỗi bước tự tick theo dữ liệu thật,
 * không tick khi người dùng bấm "tiếp theo".**
 *
 * Một checklist tick theo ý muốn là một màn hình nói dối — cùng họ với dòng
 * "✓ Khuôn mặt khớp 98,7%" vừa phải gỡ khỏi màn hình eKYC, nơi con số hiện ra
 * mà không có phép đo nào phía sau. Ở đây điều kiện hoàn thành là một truy vấn:
 * có liên kết ngân hàng đang hoạt động không, có giao dịch nào không, có khách
 * hàng nào trong danh bạ không. Bấm nút không làm bước nào xanh lên.
 *
 * Hệ quả có chủ ý: người dùng không "hoàn thành" được checklist bằng cách bấm
 * cho xong. Họ chỉ hoàn thành bằng cách thật sự dùng sản phẩm.
 */

export type MaBuoc = 'lien_ket_ngan_hang' | 'xem_dong_tien' | 'them_khach_hang';

export interface TinhTrang {
  /** Số liên kết ngân hàng đang hoạt động (không tính đã ngắt). */
  soLienKet: number;
  soGiaoDich: number;
  soKhachHang: number;
}

export interface Buoc {
  ma: MaBuoc;
  tieuDe: string;
  moTa: string;
  /** Đường dẫn nơi làm được việc này. */
  duongDan: string;
  xong: boolean;
  /**
   * Bước có làm được ngay chưa. Chưa liên kết ngân hàng thì "xem dòng tiền"
   * không phải chưa làm — mà là **chưa làm được**. Hai chuyện khác nhau, và
   * hiện sai sẽ khiến người dùng đi tìm một nút không tồn tại.
   */
  moKhoa: boolean;
}

/**
 * Dựng danh sách bước từ tình trạng thật.
 *
 * Thứ tự cố ý: liên kết ngân hàng mở khoá mọi thứ còn lại. Danh bạ khách hàng
 * đứng sau vì nó chỉ có nghĩa khi đã có tiền vào để đối soát.
 */
export function dungCacBuoc(t: TinhTrang): Buoc[] {
  const daLienKet = t.soLienKet > 0;

  return [
    {
      ma: 'lien_ket_ngan_hang',
      tieuDe: 'Liên kết tài khoản ngân hàng',
      moTa: 'MIMI đọc sao kê để dựng dòng tiền và bộ chứng từ. Chưa liên kết thì chưa có gì để xem.',
      duongDan: '/dashboard/fintech',
      xong: daLienKet,
      moKhoa: true,
    },
    {
      ma: 'xem_dong_tien',
      tieuDe: 'Xem dòng tiền của bạn',
      moTa: 'Giao dịch được phân loại thu – chi, lọc bỏ chuyển khoản nội bộ.',
      duongDan: '/dashboard',
      xong: t.soGiaoDich > 0,
      moKhoa: daLienKet,
    },
    /*
     * BỎ BƯỚC "Thêm khách hàng vào danh bạ" ngày 04/09/2026.
     *
     * Hai lý do, lý do thứ hai quan trọng hơn:
     *
     * 1. NÓ LÀ NGÕ CỤT. `ClientsPage` chỉ có `.update()` — tra cứu thuế và đổi
     *    trạng thái. Không một dòng `.insert()` nào trong toàn bộ mã ghi vào
     *    bảng `clients`; hai danh sách khách hiện có vào được là nhờ nạp thẳng
     *    bằng script. Người dùng mới bấm mũi tên sẽ tới một trang trống không
     *    có nút nào, và bước này không bao giờ tick được.
     *
     *    Cùng họ với vụ mã QR: đường đi có tồn tại, nhưng không tới được đích.
     *    Khác ở chỗ vụ QR là tính năng chạy được mà thiếu lối vào — còn ở đây
     *    tính năng chưa hề tồn tại, và chính checklist dẫn người ta tới.
     *
     * 2. NÓ KHÔNG PHẢI VẤN ĐỀ CỦA KHÁCH. Việc khách cần là chứng minh CHI PHÍ
     *    để chọn được cách tính thuế. Danh bạ khách hàng nằm ở phía doanh thu.
     *    Dựng form thêm khách sẽ gỡ được ngõ cụt, nhưng là gỡ bằng cách xây
     *    thêm một thứ không giải quyết vấn đề chính.
     *
     * Bảng và trang giữ nguyên — hoá đơn và tra cứu mã số thuế vẫn dùng. Chỉ
     * bỏ khỏi checklist, vì checklist là thứ định nghĩa "làm gì trước".
     */
  ];
}

/** Số bước đã xong. */
export function soBuocXong(bs: Buoc[]): number {
  return bs.filter((b) => b.xong).length;
}

/**
 * Xong hết chưa. Khi xong hết thì thẻ tự ẩn hẳn — không giữ lại một dải toàn
 * dấu tick để chúc mừng, vì nó chiếm chỗ vĩnh viễn mà không nói thêm điều gì.
 */
export function xongHet(bs: Buoc[]): boolean {
  return bs.length > 0 && bs.every((b) => b.xong);
}

/**
 * Bước tiếp theo nên làm: bước đầu tiên chưa xong **và** đã mở khoá.
 *
 * Trả `null` khi xong hết, hoặc khi mọi bước còn lại đều bị khoá — trường hợp
 * thứ hai không xảy ra với bộ bước hiện tại (bước đầu luôn mở khoá), nhưng xử
 * lý sẵn để thêm bước sau này không sinh ra một thẻ trỏ vào chỗ không bấm được.
 */
export function buocTiepTheo(bs: Buoc[]): Buoc | null {
  return bs.find((b) => !b.xong && b.moKhoa) ?? null;
}
