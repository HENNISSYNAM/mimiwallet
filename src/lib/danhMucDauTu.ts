/**
 * Số học của một danh mục tài sản số: giá trị, lãi lỗ, tỷ trọng.
 *
 * HÀM THUẦN, VÌ ĐÂY LÀ SỐ TIỀN CỦA NGƯỜI KHÁC. Sai một phép nhân ở đây không
 * báo lỗi ở đâu cả — nó chỉ hiện ra một con số trông hợp lý. Cùng lý do
 * `soSanhThue.ts` và `reconcile-qr.ts` được tách khỏi component.
 *
 * BA QUY TẮC, CẢ BA ĐỀU LÀ VỀ VIỆC KHÔNG BỊA:
 *
 *  1. Không có giá thì không có giá trị. Một dòng mà cả hai sàn đều không trả
 *     lời được thì `giaTri` là `null`, không phải 0. Số 0 nghĩa là "không đáng
 *     gì", còn `null` nghĩa là "chưa biết" — hai câu khác hẳn nhau.
 *  2. Không khai giá vốn thì không có lãi lỗ. `null`, không phải 0.
 *  3. Tổng danh mục chỉ cộng những dòng đọc được giá, và luôn kèm số dòng bị
 *     bỏ qua. Một tổng thiếu mà không nói là thiếu thì tệ hơn không có tổng.
 */

export interface KhoanNam {
  ma: string;
  soLuong: number;
  /** Giá vốn trung bình mỗi đơn vị, USD. `null` khi chưa khai. */
  giaVonUsd: number | null;
}

export interface KhoanTinh extends KhoanNam {
  /** Giá thị trường mỗi đơn vị, USD. `null` khi không đọc được. */
  giaUsd: number | null;
  /** Giá trị hiện tại. `null` khi không có giá. */
  giaTri: number | null;
  /** Lãi lỗ tuyệt đối. `null` khi thiếu giá hoặc thiếu giá vốn. */
  laiLo: number | null;
  /** Lãi lỗ theo phần trăm giá vốn. `null` như trên. */
  laiLoPhanTram: number | null;
  /** Tỷ trọng trong tổng danh mục, phần trăm. `null` khi không có giá. */
  tyTrong: number | null;
}

export interface TongDanhMuc {
  khoan: KhoanTinh[];
  /** Tổng giá trị của những dòng đọc được giá. */
  tongGiaTri: number;
  /** Tổng giá vốn của những dòng vừa có giá vừa có giá vốn. */
  tongGiaVon: number;
  /** Lãi lỗ trên phần có đủ dữ liệu. `null` khi không dòng nào đủ. */
  tongLaiLo: number | null;
  tongLaiLoPhanTram: number | null;
  /** Số dòng không đọc được giá, nên không nằm trong tổng. */
  soDongThieuGia: number;
  /** Số dòng có giá nhưng chưa khai giá vốn, nên không tính vào lãi lỗ. */
  soDongThieuGiaVon: number;
}

/**
 * Tính danh mục từ các khoản nắm giữ và bảng giá đọc được.
 *
 * `giaTheoMa` là map mã → giá USD. Mã không có trong map, hoặc có nhưng giá
 * `null`, đều tính là không đọc được — người gọi không phải phân biệt hai
 * trường hợp đó, vì hậu quả giống nhau.
 */
export function tinhDanhMuc(
  nam: KhoanNam[],
  giaTheoMa: Record<string, number | null | undefined>,
): TongDanhMuc {
  const buoc1 = nam.map((k) => {
    const g = giaTheoMa[k.ma];
    const giaUsd = typeof g === 'number' && Number.isFinite(g) && g > 0 ? g : null;
    const giaTri = giaUsd === null ? null : giaUsd * k.soLuong;

    const coGiaVon = k.giaVonUsd !== null && Number.isFinite(k.giaVonUsd) && k.giaVonUsd > 0;
    const von = coGiaVon ? (k.giaVonUsd as number) * k.soLuong : null;
    const laiLo = giaTri !== null && von !== null ? giaTri - von : null;
    const laiLoPhanTram = laiLo !== null && von ? (laiLo / von) * 100 : null;

    return { ...k, giaUsd, giaTri, laiLo, laiLoPhanTram, von };
  });

  const tongGiaTri = buoc1.reduce((s, k) => s + (k.giaTri ?? 0), 0);
  const tongGiaVon = buoc1.reduce((s, k) => s + (k.giaTri !== null && k.von !== null ? k.von : 0), 0);

  /*
   * Chỉ tính lãi lỗ trên phần vừa có giá vừa có giá vốn.
   *
   * Cộng giá trị của một dòng chưa khai giá vốn vào rồi so với tổng vốn thiếu
   * dòng đó sẽ cho ra một con số lãi phóng đại — và nó trông hoàn toàn bình
   * thường trên màn hình.
   */
  const giaTriCoVon = buoc1.reduce(
    (s, k) => s + (k.giaTri !== null && k.von !== null ? k.giaTri : 0),
    0,
  );
  const coDuLieu = buoc1.some((k) => k.giaTri !== null && k.von !== null);
  const tongLaiLo = coDuLieu ? giaTriCoVon - tongGiaVon : null;
  const tongLaiLoPhanTram = tongLaiLo !== null && tongGiaVon > 0 ? (tongLaiLo / tongGiaVon) * 100 : null;

  const khoan: KhoanTinh[] = buoc1.map(({ von: _von, ...k }) => ({
    ...k,
    tyTrong: k.giaTri === null || tongGiaTri <= 0 ? null : (k.giaTri / tongGiaTri) * 100,
  }));

  return {
    khoan,
    tongGiaTri,
    tongGiaVon,
    tongLaiLo,
    tongLaiLoPhanTram,
    soDongThieuGia: buoc1.filter((k) => k.giaTri === null).length,
    soDongThieuGiaVon: buoc1.filter((k) => k.giaTri !== null && k.von === null).length,
  };
}
