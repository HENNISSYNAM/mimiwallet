/**
 * Đưa đoạn luật từ kho vào câu trả lời của agent — có trích dẫn, không bịa.
 *
 * VIỆC CỦA FILE NÀY LÀ GIỚI HẠN MÔ HÌNH. Mô hình ngôn ngữ nhớ luật cũ và nhớ
 * sai: nó sẽ nói ngưỡng miễn thuế hộ kinh doanh là 100 triệu hay 500 triệu, và
 * bịa ra số hiệu văn bản trông rất thật. Nên: trước khi trả lời câu hỏi pháp lý,
 * tìm đoạn luật trong kho, đưa NGUYÊN VĂN kèm số hiệu và đường dẫn Công báo, và
 * dặn mô hình chỉ khẳng định điều gì có trong nguồn được đưa.
 *
 * HÀM THUẦN, để test được mà không cần database hay mô hình.
 */

export interface DoanLuat {
  ma_cong_bao: string;
  so_hieu: string | null;
  loai: string | null;
  ten: string;
  ngay_ban_hanh: string | null;
  ngay_hieu_luc: string | null;
  url: string;
  nhan: string | null;
  noi_dung: string;
  du_moi_tu: boolean;
  diem: number;
}

/** Tối đa bao nhiêu đoạn đưa cho mô hình. */
export const SO_NGUON_TOI_DA = 6;
/** Tối đa bao nhiêu đoạn từ cùng một văn bản — để một thông tư dài không chiếm hết chỗ. */
export const SO_DOAN_MOI_VAN_BAN = 2;
/** Cắt mỗi đoạn khi đưa vào lời dặn. */
export const KY_TU_MOI_NGUON = 1800;
/**
 * Văn bản ban hành trước năm này thì dặn mô hình nói rõ có thể đã bị sửa hoặc
 * thay thế. Kho chưa có tình trạng hiệu lực, nên đây là điều tối thiểu phải nói.
 */
export const NAM_CAN_CANH_BAO = 2024;

const boDau = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

/**
 * Câu hỏi có cần tra luật không. So trên chữ đã bỏ dấu, vì người dùng hay gõ
 * không dấu ("thue ho kinh doanh").
 */
const TU_PHAP_LY = [
  "thue", "luat", "nghi dinh", "thong tu", "nghi quyet", "quyet dinh", "van ban", "quy dinh",
  "hoa don", "ke khai", "khai thue", "le phi", "phi ", "ma so thue", "mst", "quyet toan",
  "giai the", "pha san", "tam ngung", "dang ky kinh doanh", "ho kinh doanh", "doanh nghiep tu nhan",
  "xu phat", "phat ", "bao hiem xa hoi", "bhxh", "chung tu", "ke toan", "hieu luc", "dieu ",
  "mien thue", "giam thue", "hoan thue", "nop thue", "vat", "gtgt", "tncn", "tndn",
  "thong bao 06", "trang thai 06", "trang thai 03", "khoi phuc mst",
];

export function canTraLuat(cauHoi: string): boolean {
  const s = ` ${boDau(cauHoi)} `;
  return TU_PHAP_LY.some((t) => s.includes(t));
}

/**
 * Chọn đoạn đưa cho mô hình: giữ thứ tự xếp hạng của database, mỗi văn bản tối
 * đa `SO_DOAN_MOI_VAN_BAN` đoạn, tổng tối đa `SO_NGUON_TOI_DA`.
 */
export function chonNguon(ds: DoanLuat[], toiDa = SO_NGUON_TOI_DA): DoanLuat[] {
  const demTheoVanBan = new Map<string, number>();
  const ra: DoanLuat[] = [];
  for (const d of ds) {
    const n = demTheoVanBan.get(d.ma_cong_bao) ?? 0;
    if (n >= SO_DOAN_MOI_VAN_BAN) continue;
    demTheoVanBan.set(d.ma_cong_bao, n + 1);
    ra.push(d);
    if (ra.length >= toiDa) break;
  }
  return ra;
}

const ngayVN = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "không rõ");

export function tenNguon(d: DoanLuat): string {
  const van = [d.loai, d.so_hieu].filter(Boolean).join(" ") || d.ten;
  return d.nhan ? `${van} · ${d.nhan}` : van;
}

export const QUY_TAC_TRICH_DAN = `QUY TẮC KHI TRẢ LỜI VỀ PHÁP LUẬT:
- Chỉ khẳng định một quy định khi nó có trong NGUỒN LUẬT bên dưới. Ghi rõ nguồn theo dạng [số], kèm số hiệu văn bản và Điều.
- Không có nguồn phù hợp thì nói thẳng: "Kho văn bản của MIMI chưa có đoạn nói về việc này". Không đoán số hiệu, không đoán con số.
- Kho chưa theo dõi tình trạng hiệu lực. Với văn bản ban hành trước ${NAM_CAN_CANH_BAO}, nói rõ nó có thể đã bị sửa đổi hoặc thay thế.
- Nhiều nguồn mâu thuẫn thì ưu tiên văn bản ban hành sau, và nói ra sự mâu thuẫn đó.
- Cuối câu trả lời pháp lý, nhắc người dùng đối chiếu với kế toán hoặc cơ quan thuế trước khi nộp hồ sơ.`;

export function nguonThanhLoiDan(ds: DoanLuat[]): string {
  if (ds.length === 0) {
    return `${QUY_TAC_TRICH_DAN}\n\n=== NGUỒN LUẬT ===\n(Không tìm thấy đoạn nào trong kho cho câu hỏi này.)\n=== HẾT NGUỒN LUẬT ===`;
  }
  const khoi = ds.map((d, i) => {
    const nam = d.ngay_ban_hanh ? Number(d.ngay_ban_hanh.slice(0, 4)) : null;
    const canhBao = nam !== null && nam < NAM_CAN_CANH_BAO ? " · CÓ THỂ ĐÃ BỊ SỬA/THAY THẾ" : "";
    const noiDung = d.noi_dung.length > KY_TU_MOI_NGUON ? `${d.noi_dung.slice(0, KY_TU_MOI_NGUON)}…` : d.noi_dung;
    return `[${i + 1}] ${tenNguon(d)} · ban hành ${ngayVN(d.ngay_ban_hanh)} · hiệu lực ${ngayVN(d.ngay_hieu_luc)}${canhBao}\n${d.url}\n${noiDung}`;
  });
  return `${QUY_TAC_TRICH_DAN}\n\n=== NGUỒN LUẬT (Công báo, congbao.chinhphu.vn) ===\n${khoi.join("\n\n")}\n=== HẾT NGUỒN LUẬT ===`;
}
