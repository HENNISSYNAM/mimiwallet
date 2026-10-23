/**
 * ĐA CƠ SỞ (22/10/2026) — một doanh nghiệp, nhiều cơ sở, mỗi cơ sở một tài khoản, một kế toán, một nguồn thu.
 *
 * VÌ SAO. Phần mềm kế toán thường nhìn một công ty như một sổ. Ngoài đời, một chuỗi cửa hàng, một phòng khám nhiều
 * chi nhánh hay một trường đại học 11 cơ sở là 11 sổ rời nhau: kế toán cơ sở A không thấy cơ sở B, cơ sở đang lỗ được
 * cơ sở khác chuyển tiền sang bù, và VAT đầu vào dư ở nơi này có thể nằm yên trong khi nơi khác đang nộp. Chủ doanh
 * nghiệp cần ba câu trả lời mà không sổ riêng lẻ nào cho được:
 *   1. Toàn hệ thống thật sự thu, chi, còn bao nhiêu — KHÔNG đếm hai lần tiền chuyển giữa các cơ sở.
 *   2. Cơ sở nào tự nuôi được mình, cơ sở nào đang sống nhờ cơ sở khác, và ai đang bù cho ai.
 *   3. VAT theo từng đơn vị khai thuế: đâu đang dư đầu vào, đâu đang phải nộp.
 *
 * NGUYÊN TẮC GÁN. Một giao dịch thuộc cơ sở sở hữu TÀI KHOẢN nhận/chi của nó (mỗi cơ sở thường có tài khoản riêng do
 * kế toán cơ sở giữ). Giao dịch mà tài khoản đối ứng cũng là tài khoản của một cơ sở trong công ty là CHUYỂN NỘI BỘ:
 * giữ trong số của từng cơ sở (để thấy ai bù cho ai) nhưng loại khỏi số hợp nhất. Tài khoản chưa gán cơ sở thì để riêng
 * một dòng "chưa gán" — không đoán.
 *
 * VAT. MIMI chỉ tính vị thế (đầu ra − đầu vào) theo đơn vị khai thuế. Cơ sở khai TẬP TRUNG gộp chung với trụ sở; cơ sở
 * khai RIÊNG đứng một mình. Việc một đơn vị khai riêng có được bù VAT với đơn vị khác hay không là chuyện đăng ký khai
 * thuế và căn cứ pháp lý: MIMI không kết luận thay — chỉ chỉ ra con số và đặt câu hỏi cho kế toán.
 */

export type CachKhaiThue = 'tap_trung' | 'rieng' | 'chua_ro';

export interface CoSo {
  id: string;
  ten: string;
  ma_so_thue: string | null;
  khai_thue: CachKhaiThue;
}

export interface GiaoDichCoSo {
  id: string;
  /** Dương = tiền vào, âm = tiền ra (đã chuẩn hoá chiều). */
  so_tien: number;
  ngay: string;
  tai_khoan: string | null;
  tai_khoan_doi_ung: string | null;
}

export interface VatCoSo {
  co_so_id: string;
  dau_ra: number;
  /** null = chưa có dữ liệu đầu vào cho cơ sở này (khác 0). */
  dau_vao: number | null;
}

export interface SoCoSo {
  co_so_id: string | null;
  ten: string;
  vao_ngoai: number;
  ra_ngoai: number;
  rong_ngoai: number;
  nhan_noi_bo: number;
  chuyen_noi_bo: number;
  /** Nhận nội bộ − chuyển nội bộ: dương = đang được cơ sở khác bù. */
  bu_dap_rong: number;
  so_giao_dich: number;
  /** id giao dịch đã cộng vào cơ sở này — bằng chứng. */
  ids: string[];
}

export interface DongBuDap { tu: string; den: string; so_tien: number; so_lan: number }

export interface ViTheVat {
  don_vi: string;
  cac_co_so: string[];
  khai_thue: CachKhaiThue;
  dau_ra: number;
  dau_vao: number | null;
  /** Đầu ra − đầu vào; null khi thiếu đầu vào của ít nhất một cơ sở trong đơn vị. */
  phai_nop: number | null;
}

export interface KetQuaHopNhat {
  co_so: SoCoSo[];
  chua_gan: SoCoSo | null;
  hop_nhat: { vao: number; ra: number; rong: number; noi_bo_da_loai: number };
  bu_dap: DongBuDap[];
  /** Cơ sở có dòng tiền ngoài âm nhưng được cơ sở khác chuyển tiền bù. */
  song_nho: string[];
  vat: ViTheVat[];
  /** Tài khoản của chính công ty xuất hiện trên sao kê nhưng chưa gán cơ sở. */
  tai_khoan_chua_gan: string[];
}

const moiSo = (co_so_id: string | null, ten: string): SoCoSo => ({
  co_so_id, ten, vao_ngoai: 0, ra_ngoai: 0, rong_ngoai: 0, nhan_noi_bo: 0, chuyen_noi_bo: 0, bu_dap_rong: 0, so_giao_dich: 0, ids: [],
});

export const chuanTaiKhoan = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '');

export function hopNhat(o: {
  co_so: CoSo[];
  /** số tài khoản (chỉ chữ số) → id cơ sở */
  tai_khoan_co_so: Record<string, string>;
  giao_dich: GiaoDichCoSo[];
  vat?: VatCoSo[];
}): KetQuaHopNhat {
  const ten = new Map(o.co_so.map((c) => [c.id, c.ten]));
  const so = new Map<string, SoCoSo>(o.co_so.map((c) => [c.id, moiSo(c.id, c.ten)]));
  const chuaGan = moiSo(null, 'Chưa gán cơ sở');
  const tkChuaGan = new Set<string>();
  const cap = new Map<string, DongBuDap>();
  let vao = 0;
  let ra = 0;
  let noiBo = 0;

  for (const g of o.giao_dich) {
    const tk = chuanTaiKhoan(g.tai_khoan);
    const csId = tk ? o.tai_khoan_co_so[tk] : undefined;
    const s = csId ? so.get(csId)! : chuaGan;
    if (!csId && tk) tkChuaGan.add(tk);
    const doiUng = o.tai_khoan_co_so[chuanTaiKhoan(g.tai_khoan_doi_ung)];
    s.so_giao_dich += 1;
    if (s.ids.length < 200) s.ids.push(g.id);
    if (doiUng && csId && doiUng !== csId) {
      // Chuyển giữa hai cơ sở của công ty: ghi ở từng cơ sở, loại khỏi hợp nhất. Mỗi chuyển khoản hiện ở cả hai sao kê
      // (ra ở bên chuyển, vào ở bên nhận) — chỉ đếm cặp bù đắp theo chiều TIỀN VÀO để không nhân đôi.
      if (g.so_tien > 0) {
        s.nhan_noi_bo += g.so_tien;
        noiBo += g.so_tien;
        const k = `${doiUng}>${csId}`;
        const c = cap.get(k) ?? { tu: ten.get(doiUng) ?? doiUng, den: s.ten, so_tien: 0, so_lan: 0 };
        c.so_tien += g.so_tien; c.so_lan += 1; cap.set(k, c);
      } else s.chuyen_noi_bo += -g.so_tien;
      continue;
    }
    if (g.so_tien > 0) { s.vao_ngoai += g.so_tien; vao += g.so_tien; } else { s.ra_ngoai += -g.so_tien; ra += -g.so_tien; }
  }

  const ds = [...so.values()];
  for (const s of [...ds, chuaGan]) {
    s.rong_ngoai = s.vao_ngoai - s.ra_ngoai;
    s.bu_dap_rong = s.nhan_noi_bo - s.chuyen_noi_bo;
  }
  ds.sort((a, b) => a.rong_ngoai - b.rong_ngoai);

  // VAT theo đơn vị khai thuế: các cơ sở khai tập trung gộp thành một đơn vị (cùng trụ sở); khai riêng hay chưa rõ đứng riêng.
  const vatCs = new Map((o.vat ?? []).map((v) => [v.co_so_id, v]));
  const nhom = new Map<string, { cs: CoSo[]; khai: CachKhaiThue }>();
  for (const c of o.co_so) {
    if (!vatCs.has(c.id)) continue;
    const k = c.khai_thue === 'tap_trung' ? 'tap_trung' : c.id;
    const n = nhom.get(k) ?? { cs: [], khai: c.khai_thue };
    n.cs.push(c); nhom.set(k, n);
  }
  const vat: ViTheVat[] = [...nhom.entries()].map(([k, n]) => {
    const dauRa = n.cs.reduce((t, c) => t + (vatCs.get(c.id)?.dau_ra ?? 0), 0);
    const thieu = n.cs.some((c) => vatCs.get(c.id)?.dau_vao == null);
    const dauVao = thieu ? null : n.cs.reduce((t, c) => t + (vatCs.get(c.id)?.dau_vao ?? 0), 0);
    return {
      don_vi: k === 'tap_trung' ? 'Khai tập trung' : n.cs[0].ten,
      cac_co_so: n.cs.map((c) => c.ten), khai_thue: n.khai, dau_ra: dauRa, dau_vao: dauVao,
      phai_nop: dauVao === null ? null : dauRa - dauVao,
    };
  });

  return {
    co_so: ds,
    chua_gan: chuaGan.so_giao_dich ? chuaGan : null,
    hop_nhat: { vao, ra, rong: vao - ra, noi_bo_da_loai: noiBo },
    bu_dap: [...cap.values()].sort((a, b) => b.so_tien - a.so_tien),
    song_nho: ds.filter((s) => s.rong_ngoai < 0 && s.bu_dap_rong > 0).map((s) => s.ten),
    vat,
    tai_khoan_chua_gan: [...tkChuaGan],
  };
}

/**
 * Câu hỏi cho kế toán khi các đơn vị khai thuế lệch chiều nhau: một nơi dư đầu vào, nơi khác phải nộp.
 * MIMI không kết luận được có bù được hay không — chỉ nói con số và hỏi.
 */
export function cauHoiVatLechChieu(vat: ViTheVat[]): string | null {
  const du = vat.filter((v) => v.phai_nop !== null && v.phai_nop < 0);
  const nop = vat.filter((v) => v.phai_nop !== null && v.phai_nop > 0);
  if (!du.length || !nop.length) return null;
  const s = (x: number) => `${Math.round(Math.abs(x)).toLocaleString('vi-VN')} ₫`;
  return `${du.map((v) => `${v.don_vi} đang dư VAT đầu vào ${s(v.phai_nop!)}`).join('; ')} trong khi ${nop.map((v) => `${v.don_vi} phải nộp ${s(v.phai_nop!)}`).join('; ')}. `
    + 'Bù trừ giữa các đơn vị khai thuế khác nhau phụ thuộc cách công ty đăng ký khai (tập trung hay riêng từng cơ sở) — MIMI chưa có căn cứ đã đối chiếu để kết luận. Hỏi kế toán hoặc cơ quan thuế quản lý trước khi khai kỳ tới.';
}
