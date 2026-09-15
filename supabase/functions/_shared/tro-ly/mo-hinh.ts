/**
 * Gọi mô hình để hiểu câu tự do và viết câu trả lời.
 *
 * CỔNG: Lovable AI gateway, dạng OpenAI Chat Completions — cùng cổng và cùng model
 * edge function `chat` đã dùng (`google/gemini-3-flash-preview`, khoá `LOVABLE_API_KEY`).
 * Người dùng chọn đường này ngày 15/09/2026. CHƯA KIỂM được bằng một lần gọi thật: máy chủ
 * chưa có khoá, và tài liệu công khai của Lovable không mô tả gọi công cụ. Vì vậy mọi lỗi
 * ở đây (khoá thiếu, 402/429, phản hồi lạ) đều ném `LoiMoHinh`, và edge function quay về
 * bộ nhận ý định cố định — người dùng vẫn có câu trả lời.
 *
 * MÔ HÌNH KHÔNG TỰ TẠO SỐ HAY HÀNH ĐỘNG. Nó chỉ chọn năng lực nào cần chạy (gọi công cụ)
 * và viết lời. Số liệu, bảng, đề xuất trong câu trả lời là của `tinh-toan.ts`.
 */
import type { KetQuaNangLuc, KetQuaQuet } from './kieu.ts';

export const DIEM_GOI_MO_HINH = 'https://ai.gateway.lovable.dev/v1/chat/completions';
export const MO_HINH = 'google/gemini-3-flash-preview';
export const SO_VONG_TOI_DA = 4;
export const SO_NANG_LUC_MOT_CAU = 3;

export class LoiMoHinh extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'LoiMoHinh';
  }
}

type Goi = (url: string, init: RequestInit) => Promise<Response>;

export interface TinNhanCu {
  vai: 'nguoi_dung' | 'tro_ly';
  noi_dung: string;
}

export interface CongCuMoTa {
  id: string;
  mo_ta: string;
}

export function loiDanHeThong(congTy: string | null, homNay: string): string {
  return [
    'Bạn là MIMI Assistant — trợ lý kế toán của một doanh nghiệp nhỏ ở Việt Nam trong ứng dụng MIMI Wallet.',
    `Công ty: ${congTy ?? 'chưa rõ tên'}. Hôm nay: ${homNay.split('-').reverse().join('/')}.`,
    'Cách làm:',
    '- Muốn biết số liệu thì GỌI CÔNG CỤ. Chỉ dùng con số có trong kết quả công cụ; không có thì nói chưa có dữ liệu và cách có.',
    '- Trả lời tiếng Việt, ngắn (tối đa khoảng 120 chữ), như một kế toán nói với chủ doanh nghiệp: tiền bao nhiêu, việc gì cần làm.',
    '- Không dùng thuật ngữ kỹ thuật (API, khoá, JSON, UTC, mã lỗi).',
    '- Bảng số và nút hành động đã hiện riêng dưới câu trả lời. Đừng chép lại bảng; đừng nói đã duyệt, đã đồng bộ hay đã làm việc gì — người dùng tự bấm xác nhận.',
    '- MIMI không giữ và không chuyển tiền. Không hứa cho vay, không chấm điểm tín dụng.',
    '- Câu hỏi ngoài tài chính của doanh nghiệp thì nói ngắn là MIMI chỉ hỗ trợ tiền, chứng từ, chi phí và kết nối của công ty.',
  ].join('\n');
}

function congCuOpenAI(congCu: CongCuMoTa[]) {
  return congCu.map((c) => ({
    type: 'function',
    function: { name: c.id, description: c.mo_ta, parameters: { type: 'object', properties: {}, additionalProperties: false } },
  }));
}

/** Kết quả công cụ gửi lại mô hình: gọn, không có mã đề xuất hay đường dẫn. */
export function ketQuaChoMoHinh(r: KetQuaNangLuc): string {
  const the = r.the.map((t) =>
    t.loai === 'so_lieu'
      ? { tieu_de: t.tieu_de, so_lieu: t.muc.map((m) => ({ nhan: m.nhan, gia_tri: m.gia_tri, don_vi: m.don_vi, ghi_chu: m.ghi_chu })) }
      : t.loai === 'bang'
        ? { tieu_de: t.tieu_de, cot: t.cot.map((c) => `${c.nhan} (${c.don_vi})`), dong: t.dong.slice(0, 8), con_lai: t.con_lai }
        : { ghi_chu: t.cau });
  return JSON.stringify({ tom_tat: r.tom_tat, the, co_nut_hanh_dong: r.de_xuat.map((d) => d.nhan) }).slice(0, 6000);
}

async function goiCong(khoa: string, body: unknown, goi: Goi) {
  const res = await goi(DIEM_GOI_MO_HINH, {
    method: 'POST',
    headers: { Authorization: `Bearer ${khoa}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const cau = res.status === 429 ? 'Cổng mô hình đang giới hạn tần suất.'
      : res.status === 402 ? 'Cổng mô hình hết hạn mức sử dụng.'
        : `Cổng mô hình trả lỗi ${res.status}.`;
    throw new LoiMoHinh(res.status, cau);
  }
  const j = await res.json().catch(() => null) as { choices?: Array<{ message?: Record<string, unknown> }> } | null;
  const msg = j?.choices?.[0]?.message;
  if (!msg) throw new LoiMoHinh(502, 'Phản hồi của cổng mô hình không đúng khuôn.');
  return msg;
}

/**
 * Hỏi mô hình. Trả câu trả lời và các kết quả năng lực đã chạy (theo thứ tự chạy).
 * `chay` chạy một năng lực bằng dữ liệu thật — mô hình chỉ đưa ra tên.
 */
export async function hoiMoHinh(o: {
  khoa: string;
  cau: string;
  lichSu: TinNhanCu[];
  congCu: CongCuMoTa[];
  chay: (id: string) => Promise<KetQuaNangLuc>;
  congTy: string | null;
  homNay: string;
  goiY?: string[];
  goi?: Goi;
}): Promise<{ cau: string; ket_qua: KetQuaNangLuc[] }> {
  const goi = o.goi ?? ((u, i) => fetch(u, i));
  const hopLe = new Set(o.congCu.map((c) => c.id));
  // deno-lint-ignore no-explicit-any
  const tin: any[] = [
    { role: 'system', content: loiDanHeThong(o.congTy, o.homNay) },
    ...o.lichSu.slice(-6).map((m) => ({ role: m.vai === 'nguoi_dung' ? 'user' : 'assistant', content: m.noi_dung.slice(0, 1000) })),
    {
      role: 'user',
      content: o.goiY?.length ? `${o.cau}\n\n(Gợi ý: có thể cần các công cụ ${o.goiY.join(', ')}.)` : o.cau,
    },
  ];
  const ketQua: KetQuaNangLuc[] = [];
  const daChay = new Map<string, KetQuaNangLuc>();

  for (let vong = 0; vong < SO_VONG_TOI_DA; vong++) {
    const cuoi = vong === SO_VONG_TOI_DA - 1;
    const msg = await goiCong(o.khoa, {
      model: MO_HINH,
      messages: tin,
      ...(cuoi ? {} : { tools: congCuOpenAI(o.congCu), tool_choice: 'auto' }),
    }, goi);

    const goiCongCu = Array.isArray(msg.tool_calls) ? msg.tool_calls as Array<{ id?: string; function?: { name?: string } }> : [];
    if (goiCongCu.length && !cuoi) {
      tin.push({ role: 'assistant', content: typeof msg.content === 'string' ? msg.content : null, tool_calls: goiCongCu });
      for (const g of goiCongCu) {
        const id = String(g.function?.name ?? '');
        let noiDung: string;
        if (!hopLe.has(id)) {
          noiDung = JSON.stringify({ loi: 'Không có công cụ này.' });
        } else if (daChay.has(id)) {
          noiDung = ketQuaChoMoHinh(daChay.get(id) as KetQuaNangLuc);
        } else if (daChay.size >= SO_NANG_LUC_MOT_CAU) {
          noiDung = JSON.stringify({ loi: 'Đã đủ dữ liệu cho câu này — trả lời bằng kết quả đã có.' });
        } else {
          const r = await o.chay(id);
          daChay.set(id, r);
          ketQua.push(r);
          noiDung = ketQuaChoMoHinh(r);
        }
        tin.push({ role: 'tool', tool_call_id: g.id ?? id, content: noiDung });
      }
      continue;
    }

    const cau = typeof msg.content === 'string' ? msg.content.trim() : '';
    if (!cau) throw new LoiMoHinh(502, 'Mô hình không trả lời.');
    return { cau, ket_qua: ketQua };
  }
  throw new LoiMoHinh(502, 'Mô hình không kết thúc câu trả lời.');
}

// ── Đọc ảnh chứng từ ─────────────────────────────────────────────────────────

export const KICH_THUOC_ANH_TOI_DA = 5 * 1024 * 1024;
const LOAI_ANH = /^data:(image\/(jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

export function kiemAnh(anh: unknown): { ok: true } | { ok: false; cau: string } {
  if (typeof anh !== 'string') return { ok: false, cau: 'Chưa có ảnh.' };
  const m = anh.match(LOAI_ANH);
  if (!m) return { ok: false, cau: 'Chỉ đọc được ảnh JPG, PNG hoặc WEBP.' };
  const soByte = Math.floor((m[3].length * 3) / 4);
  if (soByte > KICH_THUOC_ANH_TOI_DA) return { ok: false, cau: 'Ảnh lớn hơn 5 MB — chụp lại gần hơn hoặc giảm độ phân giải.' };
  return { ok: true };
}

const TRUONG_QUET = ['loai', 'so_hoa_don', 'ky_hieu', 'ngay', 'ben_ban', 'ma_so_thue_ben_ban', 'tien_truoc_thue', 'tien_thue', 'tong_tien'] as const;

const CONG_CU_QUET = {
  type: 'function',
  function: {
    name: 'ghi_chung_tu',
    description: 'Ghi các trường đọc được từ ảnh chứng từ. Trường không đọc chắc thì để null và thêm tên trường vào can_xem_lai.',
    parameters: {
      type: 'object',
      properties: {
        loai: { type: 'string', enum: ['hoa_don', 'bien_lai', 'khac'] },
        so_hoa_don: { type: ['string', 'null'] },
        ky_hieu: { type: ['string', 'null'] },
        ngay: { type: ['string', 'null'], description: 'YYYY-MM-DD' },
        ben_ban: { type: ['string', 'null'] },
        ma_so_thue_ben_ban: { type: ['string', 'null'] },
        tien_truoc_thue: { type: ['number', 'null'], description: 'Đồng, số nguyên' },
        tien_thue: { type: ['number', 'null'], description: 'Đồng, số nguyên' },
        tong_tien: { type: ['number', 'null'], description: 'Tổng tiền thanh toán, đồng, số nguyên' },
        can_xem_lai: { type: 'array', items: { type: 'string' } },
      },
      required: ['loai', 'tong_tien', 'can_xem_lai'],
    },
  },
};

const chuoiHoacNull = (v: unknown, dai: number) => {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s ? s.slice(0, dai) : null;
};

/** "1.234.000", "1,234,000 đ", 1234000 → 1234000. Không đọc được hoặc âm → null. */
export function docSoTienVnd(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) && v >= 0 ? Math.round(v) : null;
  if (typeof v !== 'string') return null;
  const chi = v.replace(/[^\d]/g, '');
  if (!chi) return null;
  const n = Number(chi);
  return Number.isSafeInteger(n) ? n : null;
}

/** Kiểm lại mọi trường mô hình đọc. Máy chủ không tin mô hình hơn tin trình duyệt. */
export function docKetQuaQuet(v: unknown, homNay: string): KetQuaQuet {
  const r = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const canXem = new Set<string>(
    Array.isArray(r.can_xem_lai) ? (r.can_xem_lai as unknown[]).filter((x): x is string => typeof x === 'string' && (TRUONG_QUET as readonly string[]).includes(x)) : [],
  );
  const loai = r.loai === 'hoa_don' || r.loai === 'bien_lai' ? r.loai : 'khac';

  let ngay = chuoiHoacNull(r.ngay, 10);
  if (ngay && !(/^\d{4}-\d{2}-\d{2}$/.test(ngay) && new Date(`${ngay}T00:00:00Z`).toISOString().slice(0, 10) === ngay && ngay <= homNay)) {
    ngay = null;
    canXem.add('ngay');
  }
  let mst = chuoiHoacNull(r.ma_so_thue_ben_ban, 20)?.replace(/\s/g, '') ?? null;
  if (mst && !/^\d{10}(-\d{3})?$/.test(mst)) {
    mst = null;
    canXem.add('ma_so_thue_ben_ban');
  }
  const truoc = docSoTienVnd(r.tien_truoc_thue);
  const thue = docSoTienVnd(r.tien_thue);
  let tong = docSoTienVnd(r.tong_tien);
  if (tong === 0) tong = null;
  if (tong === null) canXem.add('tong_tien');
  if (tong !== null && truoc !== null && thue !== null && Math.abs(truoc + thue - tong) > 1000) canXem.add('tong_tien');

  return {
    loai,
    so_hoa_don: chuoiHoacNull(r.so_hoa_don, 60),
    ky_hieu: chuoiHoacNull(r.ky_hieu, 30),
    ngay,
    ben_ban: chuoiHoacNull(r.ben_ban, 200),
    ma_so_thue_ben_ban: mst,
    tien_truoc_thue: truoc,
    tien_thue: thue,
    tong_tien: tong,
    can_xem_lai: TRUONG_QUET.filter((t) => canXem.has(t)),
  };
}

export async function docAnhChungTu(o: { khoa: string; anh: string; homNay: string; goi?: Goi }): Promise<KetQuaQuet> {
  const goi = o.goi ?? ((u, i) => fetch(u, i));
  const msg = await goiCong(o.khoa, {
    model: MO_HINH,
    messages: [
      {
        role: 'system',
        content: 'Bạn đọc hoá đơn, biên lai của doanh nghiệp Việt Nam. Chỉ ghi điều nhìn thấy trên ảnh; không đoán. Số tiền tính bằng đồng.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Đọc chứng từ trong ảnh và gọi ghi_chung_tu.' },
          { type: 'image_url', image_url: { url: o.anh } },
        ],
      },
    ],
    tools: [CONG_CU_QUET],
    tool_choice: { type: 'function', function: { name: 'ghi_chung_tu' } },
  }, goi);
  const g = Array.isArray(msg.tool_calls) ? (msg.tool_calls as Array<{ function?: { arguments?: unknown } }>)[0] : undefined;
  const thamSo = g?.function?.arguments;
  let v: unknown = thamSo;
  if (typeof thamSo === 'string') {
    try {
      v = JSON.parse(thamSo);
    } catch {
      throw new LoiMoHinh(502, 'Mô hình trả kết quả đọc ảnh không đúng khuôn.');
    }
  }
  if (!v || typeof v !== 'object') throw new LoiMoHinh(502, 'Mô hình không đọc được chứng từ trong ảnh.');
  return docKetQuaQuet(v, o.homNay);
}
