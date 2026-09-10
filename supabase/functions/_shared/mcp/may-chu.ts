/**
 * MCP server của MIMI — phần giao thức, không dính tới database.
 *
 * MCP LÀ GÌ, NÓI NGẮN. Model Context Protocol là chuẩn chung để trợ lý AI
 * (Claude, Cursor, ChatGPT…) biết một dịch vụ có những công cụ nào và gọi chúng.
 * Có nó, người dùng không phải viết code gọi API: dán một dòng cấu hình, trợ lý
 * tự thấy "xin_chi", đọc mô tả và tự gọi đúng lúc.
 *
 * GIAO THỨC. JSON-RPC 2.0 qua HTTP POST ("Streamable HTTP"), trả thẳng JSON,
 * không mở luồng SSE, không giữ phiên — mỗi lần gọi tự mang khoá. Đủ cho ba công
 * cụ gọi-là-xong và chạy được trên edge function không trạng thái.
 *
 * VÌ SAO TÁCH KHỎI `mcp/index.ts`. Việc chạy công cụ được truyền vào (`chay`),
 * nên file này test được bằng Vitest mà không cần Deno hay database.
 *
 * THIẾU KHOÁ VẪN LIỆT KÊ ĐƯỢC CÔNG CỤ. Trả HTTP 401 sẽ khiến nhiều client MCP đi
 * tìm OAuth mà MIMI không có, rồi báo một lỗi khó hiểu. Danh sách công cụ không
 * có gì bí mật; chỉ lúc GỌI công cụ mới cần khoá, và thiếu khoá thì nói rõ cần
 * gửi header nào.
 */

import { NHOM_CHI } from '../tac-tu/chinh-sach.ts';

/** Mới nhất đứng đầu. Client xin bản nào có trong danh sách thì dùng bản đó. */
export const PHIEN_BAN_HO_TRO = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'] as const;

export const THONG_TIN_MAY_CHU = { name: 'mimi-wallet', title: 'MIMI Wallet', version: '0.1.0' };

export const HUONG_DAN =
  'MIMI là lớp kiểm soát chi cho agent của doanh nghiệp. Trước khi chi tiền, gọi xem_chinh_sach để biết hạn mức ' +
  'còn lại, rồi xin_chi. MIMI không chuyển tiền: khoản được duyệt trả về lenh_tra để một người trả bằng ứng dụng ' +
  'ngân hàng. Không bao giờ tự thử lách hạn mức bằng cách chia nhỏ khoản chi. ' +
  'MIMI is a spend-control layer for business agents; it never moves money itself.';

export interface CongCu {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: Record<string, boolean | string>;
}

export const CONG_CU: CongCu[] = [
  {
    name: 'xem_chinh_sach',
    title: 'Xem hạn mức và chính sách chi',
    description:
      'Xem chính sách chi của agent này và hạn mức còn lại hôm nay, tháng này, mỗi khoản. Gọi trước khi xin chi. ' +
      '(Read this agent\'s spend policy and remaining limits in VND.)',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'xin_chi',
    title: 'Xin chi một khoản',
    description:
      'Xin phép chi một khoản tiền VND tới một tài khoản ngân hàng Việt Nam. Kết quả: da_duyet (kèm lenh_tra để ' +
      'người trả), cho_duyet (chờ chủ doanh nghiệp), hoặc tu_choi (kèm ly_do). MIMI KHÔNG chuyển tiền. ' +
      'Luôn gửi ma_yeu_cau duy nhất để gọi lại không sinh khoản thứ hai. ' +
      '(Request approval to pay; MIMI returns a payment instruction, it does not transfer funds.)',
    inputSchema: {
      type: 'object',
      properties: {
        so_tien: { type: 'integer', minimum: 1, description: 'Số tiền, đồng Việt Nam, số nguyên.' },
        ngan_hang_bin: {
          type: 'string',
          pattern: '^\\d{6}$',
          description: 'Mã BIN 6 số của ngân hàng người nhận, ví dụ 970422 (MB Bank). Không biết thì gọi tra_ma_ngan_hang.',
        },
        so_tai_khoan: { type: 'string', pattern: '^\\d{6,19}$', description: 'Số tài khoản người nhận, chỉ chữ số.' },
        ten_nguoi_nhan: { type: 'string', description: 'Tên chủ tài khoản người nhận.' },
        nhom_chi: { type: 'string', enum: [...NHOM_CHI], description: 'Nhóm chi phí.' },
        muc_dich: {
          type: 'string',
          minLength: 5,
          maxLength: 300,
          description: 'Mục đích chi, viết rõ cho người đọc sổ. Ví dụ: "Nạp tiền API mô hình tháng 9".',
        },
        so_hoa_don: { type: 'string', description: 'Số hoá đơn nếu đã có.' },
        ma_yeu_cau: {
          type: 'string',
          maxLength: 100,
          description: 'Khoá chống trùng do agent đặt, duy nhất cho mỗi khoản chi. Gọi lại cùng giá trị thì nhận lại yêu cầu cũ.',
        },
      },
      required: ['so_tien', 'ngan_hang_bin', 'so_tai_khoan', 'nhom_chi', 'muc_dich'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'xem_yeu_cau',
    title: 'Xem trạng thái một khoản đã xin',
    description:
      'Xem trạng thái một yêu cầu chi theo id hoặc ma_yeu_cau. da_chi nghĩa là sao kê ngân hàng đã xác nhận tiền đi. ' +
      '(Check a spend request; da_chi means the bank statement confirmed payment.)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'id MIMI trả về khi xin chi.' },
        ma_yeu_cau: { type: 'string', description: 'ma_yeu_cau agent đã gửi khi xin chi.' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'tra_ma_ngan_hang',
    title: 'Tra mã BIN ngân hàng',
    description:
      'Tra mã BIN 6 số từ tên ngân hàng Việt Nam (ví dụ "Vietcombank", "MB", "Techcombank"). Bỏ trống để lấy cả danh sách. ' +
      '(Look up a Vietnamese bank BIN code by name.)',
    inputSchema: {
      type: 'object',
      properties: { ten: { type: 'string', description: 'Tên hoặc tên viết tắt của ngân hàng.' } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
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

const dong = (n: unknown) => `${Math.round(Number(n)).toLocaleString('vi-VN')}đ`;

/** Một câu mở đầu cho mô hình đọc, trước khối JSON đầy đủ. */
export function tomTat(ten: string, kq: KetQuaChay): string {
  const b = kq.body as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (b.error) return `Lỗi: ${b.error}`;

  if (ten === 'xem_chinh_sach' && b.han_muc_con_lai) {
    const c = b.han_muc_con_lai;
    return `Hạn mức còn lại — mỗi khoản tối đa ${dong(c.moi_lan)}, hôm nay ${dong(c.ngay)}, tháng này ${dong(c.thang)}.`;
  }

  if (ten === 'xin_chi' || ten === 'xem_yeu_cau') {
    const y = b.yeu_cau;
    const lyDo = (x: unknown) => (Array.isArray(x) ? x.map((l) => l?.cau).filter(Boolean).join(' ') : '');
    if (!y) return b.ket_qua === 'tu_choi' ? `Bị từ chối. ${lyDo(b.ly_do)}` : 'Đã xử lý.';
    const trung = b.trung_lap ? ' (yêu cầu này đã gửi trước đó)' : '';
    switch (y.trang_thai) {
      case 'da_duyet':
        return `Đã duyệt ${dong(y.so_tien)}${trung}. MIMI không chuyển tiền: đưa lenh_tra cho người có quyền trả, giữ nguyên nội dung chuyển khoản ${y.ma_tham_chieu}.`;
      case 'cho_duyet':
        return `Đang chờ chủ doanh nghiệp duyệt${trung}. ${lyDo(y.ly_do)} Gọi xem_yeu_cau sau để biết kết quả; đừng xin lại khoản khác thay thế.`;
      case 'tu_choi':
        return `Bị từ chối${trung}. ${lyDo(y.ly_do)}`;
      case 'da_chi':
        return `Đã chi — sao kê ngân hàng xác nhận ${dong(y.da_chi?.so_tien ?? y.so_tien)}.`;
      case 'huy':
        return 'Yêu cầu đã bị huỷ.';
      default:
        return `Trạng thái: ${y.trang_thai}.`;
    }
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
            text: 'Thiếu khoá agent. Cấu hình MCP phải gửi header "x-mimi-agent-key: mimi_ak_…" ' +
              '(hoặc "Authorization: Bearer mimi_ak_…"). Khoá lấy ở MIMI → Kiểm soát agent.',
          }],
          isError: true,
        });
      }

      let kq: KetQuaChay;
      try {
        kq = await nc.chay(ten, doiSo);
      } catch (e) {
        return ketQuaRpc(id, {
          content: [{ type: 'text', text: `MIMI gặp lỗi hệ thống: ${e instanceof Error ? e.message : 'không rõ'}` }],
          isError: true,
        });
      }

      // 422 là "bị từ chối theo chính sách" — một câu trả lời hợp lệ để mô hình
      // đọc lý do, không phải lỗi công cụ. Đánh dấu lỗi sẽ khiến nó thử lại mãi.
      const laLoi = kq.status >= 400 && kq.status !== 422;
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
