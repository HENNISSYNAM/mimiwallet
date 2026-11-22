/**
 * MCP server của MIMI cho BÀN KẾ TOÁN (22/11/2026) — phần giao thức, không dính tới database.
 *
 * MCP (Model Context Protocol) là chuẩn để trợ lý AI (Claude, Cursor, ChatGPT…) biết một dịch vụ có công cụ nào và
 * tự gọi. Kế toán dán một dòng cấu hình; agent của họ thấy danh mục khách, hàng duyệt, và gửi được ĐỀ XUẤT phân loại.
 *
 * AGENT ĐỀ XUẤT, NGƯỜI DUYỆT. Không công cụ nào ghi vào sổ. `de_xuat_phan_loai` chỉ đặt một ý kiến vào hàng duyệt;
 * sổ đổi khi kế toán bấm "Chấp nhận" trong MIMI.
 *
 * GIAO THỨC. JSON-RPC 2.0 qua HTTP POST ("Streamable HTTP"), trả thẳng JSON, không mở luồng SSE, không giữ phiên —
 * mỗi lần gọi tự mang khoá. Việc chạy công cụ được truyền vào (`chay`), nên file này test được bằng Vitest.
 *
 * THIẾU KHOÁ VẪN LIỆT KÊ ĐƯỢC CÔNG CỤ. Trả HTTP 401 khiến nhiều client MCP đi tìm OAuth mà MIMI chưa có, rồi báo lỗi
 * khó hiểu. Danh sách công cụ không bí mật; chỉ lúc GỌI mới cần khoá, và thiếu khoá thì nói rõ cần gửi header nào.
 */

import { LOAI_PHAN_LOAI } from '../doanh-thu/phan-loai.ts';

/** Mới nhất đứng đầu. Client xin bản nào có trong danh sách thì dùng bản đó. */
export const PHIEN_BAN_HO_TRO = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'] as const;

export const THONG_TIN_MAY_CHU = { name: 'mimi-ban-ke-toan', title: 'MIMI — Bàn kế toán', version: '1.0.0' };

export const HEADER_KHOA_MCP = 'x-mimi-key';

export const HUONG_DAN =
  'MIMI là bàn kế toán cho văn phòng làm sổ và thuế cho nhiều hộ kinh doanh. Bắt đầu bằng danh_sach_khach để biết khách ' +
  'nào cần làm trước, rồi hang_duyet để xem các khoản tiền vào chưa phân loại kèm bằng chứng. Khi bạn chắc một khoản là ' +
  'gì (tiền bán hàng, tiền nhà cho, tiền vay, chuyển giữa tài khoản của chủ…), gọi de_xuat_phan_loai kèm lý do ngắn, rõ, ' +
  'dựa trên nội dung chuyển khoản. Bạn KHÔNG ghi sổ: kế toán duyệt trong MIMI. Không chắc thì đừng đề xuất. ' +
  'MIMI is an accounting desk; you can read and propose, a human accountant approves.';

export interface CongCu {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: Record<string, boolean | string>;
}

const UUID = { type: 'string', pattern: '^[0-9a-fA-F-]{36}$' };

export const CONG_CU: CongCu[] = [
  {
    name: 'danh_sach_khach',
    title: 'Danh sách khách (hộ kinh doanh) đang làm sổ',
    description:
      'Mọi khách bạn làm sổ, xếp "cần làm trước": mức (do/vang/xanh) và lý do, doanh thu năm nay dạng khoảng so với ngưỡng ' +
      '1 tỷ / 3 tỷ, số khoản tiền vào chờ phân loại, hạn thuế kế tiếp. Chỉ đọc. ' +
      '(List the client businesses you keep books for, most urgent first. Read-only.)',
    inputSchema: {
      type: 'object',
      properties: { trang: { type: 'integer', minimum: 1, maximum: 1000, description: 'Trang, mỗi trang 50 khách. Mặc định 1.' } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'hang_duyet',
    title: 'Hàng duyệt: việc agent đề xuất đang chờ kế toán',
    description:
      'Các đề xuất đang chờ, nặng trước. Loại phan_loai là một khoản tiền vào chưa ai quyết: có transaction_id, số tiền, ' +
      'nội dung chuyển khoản, đề xuất hiện tại và tác động lên khoảng doanh thu / ngưỡng. Các loại khác (han_thue, ' +
      'to_khai_san_sang, dong_tien, viec, nguong) là việc cần kế toán làm. Chỉ đọc. ' +
      '(Pending review queue with evidence. Read-only.)',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: { ...UUID, description: 'Chỉ lấy của một khách (id từ danh_sach_khach). Bỏ trống: mọi khách.' },
        loai: {
          type: 'string', enum: ['phan_loai', 'han_thue', 'to_khai_san_sang', 'dong_tien', 'viec', 'nguong'],
          description: 'Chỉ lấy một loại. Muốn phân loại tiền vào thì dùng "phan_loai".',
        },
        gioi_han: { type: 'integer', minimum: 1, maximum: 100, description: 'Tối đa bao nhiêu dòng. Mặc định 30.' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'de_xuat_phan_loai',
    title: 'Đề xuất phân loại một khoản tiền vào',
    description:
      'Đặt ý kiến của bạn về một khoản tiền vào lên hàng duyệt của kế toán. KHÔNG ghi sổ — kế toán duyệt trong MIMI. ' +
      'Gửi lại cho cùng khoản thì thay ý kiến cũ. Khoản đã có người quyết thì bị từ chối. ' +
      'business_revenue = tiền bán hàng/dịch vụ (tính doanh thu); internal_transfer = chuyển giữa tài khoản của chủ; ' +
      'loan = tiền vay; capital_contribution = góp vốn; family_transfer = người nhà cho/gửi; personal = tiền cá nhân; ' +
      'refund = hoàn tiền; deposit = tiền đặt cọc; collection_on_behalf = thu hộ; other = khác. ' +
      '(Propose a category for one incoming payment; a human approves.)',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: { ...UUID, description: 'id khách, từ danh_sach_khach hoặc hang_duyet.' },
        transaction_id: { ...UUID, description: 'id khoản tiền vào, từ hang_duyet.' },
        loai: { type: 'string', enum: LOAI_PHAN_LOAI.filter((l) => l !== 'unknown'), description: 'Loại bạn đề xuất.' },
        ly_do: {
          type: 'string', minLength: 5, maxLength: 300,
          description: 'Vì sao, dựa trên bằng chứng kế toán kiểm lại được. Ví dụ: "Nội dung CK ghi \'me gui tien nha\'".',
        },
      },
      required: ['company_id', 'transaction_id', 'loai', 'ly_do'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
];

export interface KetQuaChay {
  status: number;
  body: Record<string, unknown>;
}

export interface NguCanh {
  coKhoa: boolean;
  chay: (ten: string, doiSo: Record<string, unknown>) => Promise<KetQuaChay>;
}

type Id = string | number | null;

const loiRpc = (id: Id, code: number, message: string) => ({ jsonrpc: '2.0', id, error: { code, message } });
const ketQuaRpc = (id: Id, result: unknown) => ({ jsonrpc: '2.0', id, result });

/** Một câu mở đầu cho mô hình đọc, trước khối JSON đầy đủ. */
export function tomTat(ten: string, kq: KetQuaChay): string {
  const b = kq.body as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (b.error) return `Lỗi: ${b.error}`;
  if (ten === 'danh_sach_khach' && b.dem) {
    return `${b.tong} khách — ${b.dem.do} cần làm ngay, ${b.dem.vang} cần xem, ${b.dem.xanh} ổn. Trang ${b.trang}/${b.so_trang}.`;
  }
  if (ten === 'hang_duyet' && Array.isArray(b.de_xuat)) {
    return `${b.de_xuat.length} đề xuất (tổng ${b.tong} đang chờ). Kế toán duyệt trong MIMI.`;
  }
  if (ten === 'de_xuat_phan_loai' && b.de_xuat) {
    return `Đã đặt đề xuất lên hàng duyệt${b.thay_y_kien_cu ? ' (thay ý kiến cũ của bạn)' : ''}. Sổ chưa đổi — chờ kế toán duyệt.`;
  }
  return 'Xong.';
}

async function xuLyMot(tin: unknown, nc: NguCanh): Promise<unknown | null> {
  if (!tin || typeof tin !== 'object' || Array.isArray(tin)) return loiRpc(null, -32600, 'Invalid Request');
  const m = tin as { jsonrpc?: unknown; id?: Id; method?: unknown; params?: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
  const coId = 'id' in m && m.id !== undefined;
  const id: Id = coId ? (m.id as Id) : null;

  if (m.jsonrpc !== '2.0' || typeof m.method !== 'string') {
    // Một phản hồi từ client (có result/error, không có method) thì không cần trả lời.
    if (!('method' in m) && ('result' in m || 'error' in m)) return null;
    return loiRpc(id, -32600, 'Invalid Request');
  }

  // Thông báo (không có id) không bao giờ được trả lời.
  if (!coId) return null;

  switch (m.method) {
    case 'initialize': {
      const xin = m.params?.protocolVersion;
      const phienBan = (PHIEN_BAN_HO_TRO as readonly string[]).includes(xin) ? xin : PHIEN_BAN_HO_TRO[0];
      return ketQuaRpc(id, {
        protocolVersion: phienBan,
        capabilities: { tools: { listChanged: false } },
        serverInfo: THONG_TIN_MAY_CHU,
        instructions: HUONG_DAN,
      });
    }

    case 'ping':
      return ketQuaRpc(id, {});

    case 'tools/list':
      return ketQuaRpc(id, { tools: CONG_CU });

    case 'tools/call': {
      const ten = m.params?.name;
      const doiSo = m.params?.arguments ?? {};
      if (!CONG_CU.some((c) => c.name === ten)) return loiRpc(id, -32602, `Không có công cụ "${String(ten)}".`);
      if (typeof doiSo !== 'object' || Array.isArray(doiSo)) return loiRpc(id, -32602, 'arguments phải là object.');

      if (!nc.coKhoa) {
        return ketQuaRpc(id, {
          content: [{
            type: 'text',
            text: `Thiếu khoá MCP. Cấu hình phải gửi header "${HEADER_KHOA_MCP}: mimi_ak_…" ` +
              '(hoặc "Authorization: Bearer mimi_ak_…"). Khoá tạo ở MIMI → Văn phòng kế toán → Kết nối agent (MCP).',
          }],
          isError: true,
        });
      }

      let kq: KetQuaChay;
      try {
        kq = await nc.chay(ten, doiSo);
      } catch {
        // Không đưa thông điệp lỗi nội bộ ra ngoài.
        return ketQuaRpc(id, { content: [{ type: 'text', text: 'MIMI gặp lỗi hệ thống. Thử lại sau ít phút.' }], isError: true });
      }

      // 409 "đã có người quyết" là câu trả lời hợp lệ để mô hình đọc, không phải lỗi công cụ — đánh lỗi sẽ khiến nó thử lại mãi.
      const laLoi = kq.status >= 400 && kq.status !== 409;
      return ketQuaRpc(id, {
        content: [{ type: 'text', text: `${tomTat(ten, kq)}\n\n${JSON.stringify(kq.body, null, 2)}` }],
        structuredContent: kq.body,
        isError: laLoi,
      });
    }

    default:
      return loiRpc(id, -32601, `Method not found: ${m.method}`);
  }
}

/**
 * Xử lý một thông điệp hoặc một mảng thông điệp JSON-RPC.
 * Trả `null` khi không có gì để trả lời (chỉ toàn thông báo) — HTTP 202.
 */
export async function xuLyMcp(tin: unknown, nc: NguCanh): Promise<unknown | null> {
  if (Array.isArray(tin)) {
    if (tin.length === 0) return loiRpc(null, -32600, 'Invalid Request');
    const ra = (await Promise.all(tin.map((t) => xuLyMot(t, nc)))).filter((x) => x !== null);
    return ra.length ? ra : null;
  }
  return xuLyMot(tin, nc);
}
