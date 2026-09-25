/**
 * Phong bì webhook Cas — đọc, làm sạch, băm, định tuyến. Hàm thuần, không gọi mạng.
 *
 * Nguồn: tài liệu chính thức `cas.so/general/api/webhook` (đọc ngày 24/09/2026). Sáu loại
 * `webhookType`: GRANT, TRANSACTIONS, INVOICE, AUTO_DEBIT, TVAN, SIGN. Mọi payload có
 * `environment` ("dev" ở sandbox), `webhookType`, `webhookCode`, `error`, và tuỳ loại:
 *   GRANT        grantId; webhookCode ERROR | DEFAULT_UPDATE | USER_PERMISSION_REVOKED | GRANT_DELETED | GRANT_PAUSED
 *   TRANSACTIONS grantId, transaction { reference, amount, counterAccount… }   (TRANSACTION_UPDATE)
 *   INVOICE      grantId, invoice { id, codeOfTax, codeOfTaxStatus }            — hoá đơn phát hành qua Invoice Hub
 *   AUTO_DEBIT   grantId, autoDebit { id, batchId, state, payments[] }
 *   TVAN         KHÔNG có grantId; tvan { messageId, tvanMessageId, taxAuthorityMessageId, taxCode… }
 *   SIGN         grantId null; signRequest { signRequestId, state, identityKey?, rejectedReason? }
 *
 * Cas KHÔNG gửi mã sự kiện nào, và KHÔNG ký payload. Nên:
 *   - chống trùng bằng mã băm của chính nội dung (`khoaChongTrung`);
 *   - payload vẫn chỉ là gợi ý để đi hỏi lại Cas — xem `cas-webhook/index.ts`.
 *
 * MIMI hôm nay chưa gọi Invoice Hub, TVAN, eSign hay Auto Debit, nên bốn loại đó chỉ được ghi nhận
 * (`chua_dung`) — không đổi trạng thái nghiệp vụ nào. Xem `docs/KIEM_TOAN_CAS_WEBHOOK.md`, mục O.
 */

export const LOAI_WEBHOOK = ['GRANT', 'TRANSACTIONS', 'INVOICE', 'AUTO_DEBIT', 'TVAN', 'SIGN'] as const;
export type LoaiWebhook = (typeof LOAI_WEBHOOK)[number];

/** Việc MIMI làm với từng loại — ma trận "sự kiện → kết quả sản phẩm" của bản chỉ đạo, mục 22. */
export const CACH_XU_LY: Record<LoaiWebhook, { xu_ly: 'kiem_lai_cas' | 'ghi_nhan'; ket_qua_ky_thuat: string; ket_qua_san_pham: string }> = {
  GRANT: { xu_ly: 'kiem_lai_cas', ket_qua_ky_thuat: 'Trạng thái liên kết được cập nhật sau khi hỏi lại Cas', ket_qua_san_pham: 'Báo người dùng khi cần đăng nhập lại hoặc liên kết lại' },
  TRANSACTIONS: { xu_ly: 'kiem_lai_cas', ket_qua_ky_thuat: 'Giao dịch mới được kéo từ Cas và ghi một lần', ket_qua_san_pham: 'Đối soát QR, hỏi người dùng về khoản tiền vào chưa rõ' },
  INVOICE: { xu_ly: 'ghi_nhan', ket_qua_ky_thuat: 'Chỉ ghi nhận', ket_qua_san_pham: 'Chưa dùng — MIMI không phát hành hoá đơn qua Invoice Hub' },
  TVAN: { xu_ly: 'ghi_nhan', ket_qua_ky_thuat: 'Chỉ ghi nhận', ket_qua_san_pham: 'Chưa dùng — MIMI không gửi thông điệp qua TVAN' },
  SIGN: { xu_ly: 'ghi_nhan', ket_qua_ky_thuat: 'Chỉ ghi nhận', ket_qua_san_pham: 'Chưa dùng — MIMI chưa tạo yêu cầu ký số' },
  AUTO_DEBIT: { xu_ly: 'ghi_nhan', ket_qua_ky_thuat: 'Chỉ ghi nhận', ket_qua_san_pham: 'Không bao giờ tự chuyển tiền — MIMI không dùng trích nợ tự động' },
};

// deno-lint-ignore no-explicit-any
type Obj = Record<string, any>;
const laObj = (x: unknown): x is Obj => !!x && typeof x === 'object' && !Array.isArray(x);
const chuoi = (x: unknown) => (typeof x === 'string' && x ? x : null);

export interface PhongBi {
  /** 'RONG' = thân `{}` — lần Cas Console gửi thử khi lưu cấu hình. */
  loai: LoaiWebhook | 'RONG' | 'KHONG_RO';
  ma: string | null;
  grantId: string | null;
  moiTruong: string | null;
  /** Mã lỗi Cas kèm theo (GRANT ERROR), ví dụ GRANT_LOGIN_REQUIRED. */
  maLoi: string | null;
  chuThe: { kieu: string; id: string } | null;
}

/** Đoán loại theo hình dạng khi thiếu `webhookType` — bản cũ của Cas, hoặc payload lạ. */
function loaiTheoHinh(p: Obj): LoaiWebhook | null {
  if (laObj(p.transaction)) return 'TRANSACTIONS';
  if (laObj(p.invoice)) return 'INVOICE';
  if (laObj(p.tvan)) return 'TVAN';
  if (laObj(p.signRequest)) return 'SIGN';
  if (laObj(p.autoDebit)) return 'AUTO_DEBIT';
  return null;
}

export function docPhongBi(payload: unknown): PhongBi {
  const p: Obj = laObj(payload) ? payload : {};
  if (!Object.keys(p).length) return { loai: 'RONG', ma: null, grantId: null, moiTruong: null, maLoi: null, chuThe: null };

  const khai = chuoi(p.webhookType) ?? chuoi(p.type);
  const loai: PhongBi['loai'] = (LOAI_WEBHOOK as readonly string[]).includes(khai ?? '') ? (khai as LoaiWebhook) : (loaiTheoHinh(p) ?? 'KHONG_RO');

  const chuThe = (() => {
    switch (loai) {
      case 'TRANSACTIONS': { const r = chuoi(p.transaction?.reference); return r ? { kieu: 'giao_dich', id: r } : null; }
      case 'INVOICE': { const r = chuoi(p.invoice?.id); return r ? { kieu: 'hoa_don_invoice_hub', id: r } : null; }
      case 'TVAN': { const r = chuoi(p.tvan?.messageId); return r ? { kieu: 'thong_diep_tvan', id: r } : null; }
      case 'SIGN': { const r = chuoi(p.signRequest?.signRequestId); return r ? { kieu: 'yeu_cau_ky', id: r } : null; }
      case 'AUTO_DEBIT': { const r = chuoi(p.autoDebit?.id); return r ? { kieu: 'trich_no', id: r } : null; }
      case 'GRANT': { const r = chuoi(p.grantId); return r ? { kieu: 'grant', id: r } : null; }
      default: return null;
    }
  })();

  return {
    loai,
    ma: chuoi(p.webhookCode) ?? chuoi(p.code),
    grantId: chuoi(p.grantId) ?? chuoi(p.grant_id) ?? chuoi(p.data?.grantId),
    moiTruong: chuoi(p.environment),
    maLoi: chuoi(p.error?.errorCode),
    chuThe,
  };
}

/**
 * Bỏ dữ liệu định danh TRƯỚC khi ghi vào `webhook_events`. `identityKey` (SIGN) là khoá tra định
 * danh người ký; số CCCD, token không bao giờ cần để gỡ lỗi. Giữ tên trường, thay giá trị, để người
 * đọc nhật ký biết trường đó từng có.
 */
const NHAY_CAM = new Set([
  'identitykey', 'identitykeyexpiresat', 'identificationnumber', 'cccd', 'idnumber', 'nationalid',
  'accesstoken', 'access_token', 'publictoken', 'public_token', 'refreshtoken', 'secret', 'password', 'otp',
]);
export const DA_AN = '[đã ẩn]';

export function anNhayCam(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(anNhayCam);
  if (!laObj(x)) return x;
  const ra: Obj = {};
  for (const [k, v] of Object.entries(x)) ra[k] = NHAY_CAM.has(k.toLowerCase()) && v !== null ? DA_AN : anNhayCam(v);
  return ra;
}

/** JSON với khoá sắp xếp: cùng nội dung thì cùng chuỗi, dù Cas đổi thứ tự trường khi gửi lại. */
export function jsonChuan(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(jsonChuan).join(',')}]`;
  if (laObj(x)) return `{${Object.keys(x).sort().map((k) => `${JSON.stringify(k)}:${jsonChuan(x[k])}`).join(',')}}`;
  return JSON.stringify(x ?? null);
}

/**
 * Khoá chống trùng = băm (NGÀY giờ VN + nội dung).
 *
 * VÌ SAO KÈM NGÀY (sửa 25/09/2026, cùng ngày viết): payload Cas không mang thời gian. Băm nội dung
 * trần thì `GRANT / DEFAULT_UPDATE` cho cùng một grant tuần sau giống hệt tuần này và bị bỏ VĨNH VIỄN
 * như bản trùng — liên kết đã hỏng không bao giờ được đánh dấu kết nối lại.
 *
 * Kèm ngày thì: Cas gửi lại trong cùng ngày → trùng, bỏ (đúng mục đích). Gửi lại vắt qua nửa đêm →
 * xử lý thêm một lần, vô hại vì GRANT hỏi lại Cas, TRANSACTIONS ghi theo mã tham chiếu. Sự kiện thật
 * lặp lại ở ngày khác → được xử lý. Xử lý thừa một lần luôn rẻ hơn bỏ sót một lần.
 */
export async function khoaChongTrung(payload: unknown, ngay: string): Promise<string> {
  const b = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${ngay}|${jsonChuan(payload)}`)));
  return Array.from(b, (v) => v.toString(16).padStart(2, '0')).join('');
}

/**
 * Sự kiện có thuộc môi trường đang chạy không. Sandbox gửi `environment: "dev"` [tài liệu + mọi sự
 * kiện thật tới 24/09/2026]. Giá trị production chưa thấy lần nào, nên chỉ chặn chỗ chắc chắn sai:
 * production nhận "dev", hoặc sandbox nhận một giá trị khác "dev". Thiếu trường thì cho qua.
 */
export function dungMoiTruong(moiTruong: string | null, bankhubEnv: string): boolean {
  if (!moiTruong) return true;
  const laDev = moiTruong.toLowerCase() === 'dev';
  return bankhubEnv.toLowerCase() === 'production' ? !laDev : laDev;
}
