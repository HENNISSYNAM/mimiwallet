/**
 * Bảng giá model và đề xuất model rẻ hơn.
 *
 * NGUỒN GIÁ: OpenRouter `GET https://openrouter.ai/api/v1/models` (đối chiếu tài liệu
 * 15/09/2026, https://openrouter.ai/docs/api/api-reference/models/get-models). Mỗi model
 * có `pricing.prompt` và `pricing.completion` là CHUỖI, tính bằng USD cho MỘT token.
 * Đây là giá OpenRouter bán lại; giá gọi thẳng nhà cung cấp có thể khác, và màn hình
 * phải nói vậy.
 *
 * ĐỀ XUẤT LÀ ƯỚC TÍNH. Tính bằng số token thật của doanh nghiệp nhân giá niêm yết, không
 * trừ giảm giá cache hay batch. Model rẻ hơn không chắc làm được việc như model đắt — nên
 * chỉ gợi ý bậc thấp hơn GẦN NHẤT của cùng hãng, và câu hiển thị luôn nhắc thử trước.
 */

export interface GiaModel {
  model_id: string;
  ten: string;
  gia_vao_usd_moi_trieu: number;
  gia_ra_usd_moi_trieu: number;
}

export interface DongToken {
  nha_cung_cap: string;
  model: string;
  token_vao: number;
  token_vao_cache: number;
  token_ra: number;
  so_lan_goi: number;
}

export interface DeXuatModel {
  model: string;
  hien_tai: GiaModel;
  thay_bang: GiaModel;
  token_vao: number;
  token_ra: number;
  chi_phi_uoc_tinh_usd: number;
  chi_phi_neu_doi_usd: number;
  tiet_kiem_usd: number;
  /**
   * MIMI-P1-006: độ tin về chất lượng của model rẻ hơn trên việc của công ty. Hiện luôn là
   * 'chua_do' — MIMI chưa có số đo chất lượng, độ trễ hay chi phí gọi lại, nên con số tiết kiệm
   * chỉ là chênh giá token, KHÔNG phải đề xuất đổi model.
   */
  do_tin_chat_luong: 'chua_do';
  con_thieu: string[];
}

/** Những gì còn phải đo trước khi so hai model cho công bằng (đặc tả MIMI-P1-006). */
export const CAN_DO_TRUOC_KHI_DOI = ['chất lượng trên việc thật của bạn', 'độ trễ', 'chi phí gọi lại khi trả lời hỏng'];

const chuoi = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const lamTron = (n: number) => Math.round(n * 1e6) / 1e6;

/** Model không dùng để trò chuyện: không đem ra so với model chat. */
const KHONG_PHAI_CHAT = /(embed|tts|whisper|transcribe|dall-e|image|audio|realtime|moderation|search-preview)/;

export function docBangGiaOpenRouter(json: unknown): GiaModel[] {
  const ds = (json as { data?: unknown } | null)?.data;
  if (!Array.isArray(ds)) throw new Error('Phản hồi danh sách model của OpenRouter không đúng khuôn.');
  const kq: GiaModel[] = [];
  for (const m of ds as Array<Record<string, unknown>>) {
    const id = chuoi(m.id);
    const gia = (m.pricing ?? {}) as Record<string, unknown>;
    const vaoChu = chuoi(gia.prompt);
    const raChu = chuoi(gia.completion);
    // Thiếu giá thì bỏ, không đọc thành 0 — Number('') là 0, tức một model "miễn phí" giả.
    if (!id || !vaoChu || !raChu) continue;
    const vao = Number(vaoChu);
    const ra = Number(raChu);
    // Giá "-1" là giá thay đổi theo định tuyến (openrouter/auto): không có con số để so.
    if (!Number.isFinite(vao) || !Number.isFinite(ra) || vao < 0 || ra < 0) continue;
    kq.push({
      model_id: id.slice(0, 200),
      ten: (chuoi(m.name) || id).slice(0, 200),
      gia_vao_usd_moi_trieu: lamTron(vao * 1e6),
      gia_ra_usd_moi_trieu: lamTron(ra * 1e6),
    });
  }
  return kq;
}

/** "anthropic/claude-sonnet-4.5" và "claude-sonnet-4-5-20250929" cùng về "claude-sonnet-4-5". */
export function chuanHoaTenModel(ten: string): string {
  return ten
    .toLowerCase()
    .trim()
    .replace(/^[a-z0-9-]+\//, '')
    .replace(/:.*$/, '')
    .replace(/-(\d{8}|\d{4}-\d{2}-\d{2})$/, '')
    .replace(/\./g, '-');
}

/** Hãng của model: phần trước dấu "/" (dòng OpenRouter), hoặc chính nhà cung cấp. */
export function hangCuaModel(model: string, nhaCungCap: string): string {
  const m = model.toLowerCase().match(/^([a-z0-9-]+)\//);
  if (m) return m[1];
  return nhaCungCap === 'openrouter' ? '' : nhaCungCap;
}

const hangCuaGia = (g: GiaModel) => g.model_id.toLowerCase().split('/')[0];

export function timGia(model: string, nhaCungCap: string, bang: GiaModel[]): GiaModel | null {
  const hang = hangCuaModel(model, nhaCungCap);
  if (!hang) return null;
  const ten = chuanHoaTenModel(model);
  const khop = bang.filter((g) => hangCuaGia(g) === hang && !g.model_id.includes(':') && chuanHoaTenModel(g.model_id) === ten);
  if (!khop.length) return null;
  return [...khop].sort((a, b) => a.model_id.length - b.model_id.length)[0];
}

export function deXuatModelReHon(tokens: DongToken[], bang: GiaModel[]): { de_xuat: DeXuatModel[]; khong_khop: string[] } {
  // Gộp theo model thật (bỏ hậu tố ngày): cùng một model có thể nằm ở nhiều ngày, nhiều dòng.
  const gop = new Map<string, { model: string; nha_cung_cap: string; vao: number; ra: number }>();
  for (const t of tokens) {
    const k = `${hangCuaModel(t.model, t.nha_cung_cap)} ${chuanHoaTenModel(t.model)}`;
    const cu = gop.get(k);
    if (cu) {
      cu.vao += t.token_vao;
      cu.ra += t.token_ra;
    } else gop.set(k, { model: t.model, nha_cung_cap: t.nha_cung_cap, vao: t.token_vao, ra: t.token_ra });
  }

  const de_xuat: DeXuatModel[] = [];
  const khong_khop: string[] = [];
  for (const g of gop.values()) {
    if (g.vao + g.ra === 0) continue;
    const hienTai = timGia(g.model, g.nha_cung_cap, bang);
    if (!hienTai) {
      khong_khop.push(g.model);
      continue;
    }
    const hang = hangCuaGia(hienTai);
    const reHon = bang
      .filter((b) =>
        hangCuaGia(b) === hang &&
        !b.model_id.includes(':') &&
        !KHONG_PHAI_CHAT.test(b.model_id) &&
        b.gia_vao_usd_moi_trieu + b.gia_ra_usd_moi_trieu > 0 &&
        b.gia_vao_usd_moi_trieu < hienTai.gia_vao_usd_moi_trieu &&
        b.gia_ra_usd_moi_trieu < hienTai.gia_ra_usd_moi_trieu)
      // Bậc thấp hơn gần nhất: rẻ hơn nhưng ít hụt chất lượng nhất có thể.
      .sort((a, b) => (b.gia_vao_usd_moi_trieu + b.gia_ra_usd_moi_trieu) - (a.gia_vao_usd_moi_trieu + a.gia_ra_usd_moi_trieu));
    const thay = reHon[0];
    if (!thay) continue;
    const chiPhi = (gia: GiaModel) => (g.vao * gia.gia_vao_usd_moi_trieu + g.ra * gia.gia_ra_usd_moi_trieu) / 1e6;
    const truoc = lamTron(chiPhi(hienTai));
    const sau = lamTron(chiPhi(thay));
    const tiet = lamTron(truoc - sau);
    if (tiet < 0.01) continue;
    de_xuat.push({
      model: g.model,
      hien_tai: hienTai,
      thay_bang: thay,
      token_vao: g.vao,
      token_ra: g.ra,
      chi_phi_uoc_tinh_usd: truoc,
      chi_phi_neu_doi_usd: sau,
      tiet_kiem_usd: tiet,
      do_tin_chat_luong: 'chua_do',
      con_thieu: CAN_DO_TRUOC_KHI_DOI,
    });
  }
  de_xuat.sort((a, b) => b.tiet_kiem_usd - a.tiet_kiem_usd);
  return { de_xuat, khong_khop };
}
