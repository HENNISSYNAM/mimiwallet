# MIMI Cloud Agent Runtime — hợp đồng v1 (13/10/2026)

Chủ dự án chốt: trình duyệt cloud chạy trên **Vercel Functions** (cùng dự án web); đợt đầu không giới hạn phạm vi website.
Giữ nguyên yêu cầu mục 6 của đặc tả: thao tác có tác động bên ngoài (gửi hồ sơ, ký số, thanh toán, xác nhận pháp lý)
**dừng chờ người dùng duyệt** trong MIMI rồi mới chạy. OTP/CAPTCHA: agent không tự vượt — bàn giao người dùng.

## Kiến trúc

```
TroLyPage (MIMI Assistant) ──goiTroLy/goiDieuPhoi──▶ edge fn `agent-dieu-phoi` (Supabase, Orchestrator)
                                                      │ chọn agent (registry), dựng kế hoạch, lưu nhiem_vu_agent,
                                                      │ KÝ Ed25519 lệnh chạy (khoá riêng = secret MIMI_RUNTIME_PRIVATE_KEY)
                                                      ▼
                                   Vercel fn `POST /api/agent-runtime` (Node + playwright-core + @sparticuz/chromium)
                                   kiểm chữ ký (khoá công khai trong code) + JWT người dùng (Supabase Auth)
                                   + hạn lệnh 60s; chạy các bước trong ngân sách thời gian; trả kết quả từng bước
                                                      ▼
                                   `agent-dieu-phoi` ghi nhật ký bước, cập nhật trạng thái, gọi tiếp nếu còn bước,
                                   dừng ở bước cần duyệt; kết quả cuối trả về hội thoại
```

Runtime **không có quyền CSDL, không giữ bí mật**. Mọi trạng thái nằm ở Supabase (Orchestrator ghi). Mỗi lần gọi runtime
mở trình duyệt mới (Vercel không giữ tiến trình) → nhiệm vụ dài được chia lượt; lượt sau mở lại `url_hien_tai`.

## Lệnh chạy (Orchestrator → Runtime)

`POST /api/agent-runtime`, header `Authorization: Bearer <JWT người dùng>`, body JSON:

```ts
interface LenhChay {
  phien_ban: 1;
  nhiem_vu_id: string;           // uuid
  cong_ty_id: string;            // uuid — phải khớp app_metadata/thành viên? (runtime chỉ kiểm user_id khớp JWT)
  nguoi_dung_id: string;         // uuid — runtime so với `sub` của JWT
  agent: 'thue' | 'tai_chinh' | 'tai_lieu' | 'trinh_duyet';
  mien_cho_phep: string[];       // tên miền được phép, ví dụ ['vanban.chinhphu.vn'] (khớp đúng hoặc tên miền con)
  url_bat_dau: string | null;    // lượt tiếp theo: URL đang dở
  tu_buoc: number;               // chạy từ bước thứ mấy (0-based)
  buoc: BuocCongCu[];            // kế hoạch đầy đủ
  da_duyet: number[];            // chỉ số các bước tác động bên ngoài người dùng đã duyệt
  ngan_sach_ms: number;          // ≤ 50_000
  het_han: string;               // ISO, ≤ 60s sau khi ký
  nonce: string;                 // ≥ 16 ký tự
  chu_ky: string;                // Ed25519 base64url trên JSON chuẩn hoá của mọi trường còn lại (khoá sắp xếp)
}

type BuocCongCu =
  | { cong_cu: 'mo_trang'; url: string }
  | { cong_cu: 'doc_noi_dung'; toi_da_ky_tu?: number }            // chữ hiển thị, cắt gọn
  | { cong_cu: 'lay_url_tieu_de' }
  | { cong_cu: 'chup_man_hinh' }                                   // PNG base64, giới hạn kích thước
  | { cong_cu: 'tim_phan_tu'; vai_tro?: string; ten?: string; nhan?: string; chu?: string }
  | { cong_cu: 'dien'; nhan: string; gia_tri: string }             // định vị theo nhãn/placeholder, không CSS tuỳ ý
  | { cong_cu: 'nhan'; ten: string; tac_dong: 'doc' | 'ngoai' };   // 'ngoai' = có tác động bên ngoài → cần duyệt
```

Không có công cụ chạy JavaScript, selector CSS tuỳ ý hay shell. `tac_dong: 'ngoai'` chỉ chạy khi chỉ số bước nằm trong
`da_duyet`; runtime còn tự coi là `ngoai` mọi nút có tên khớp `DICH_CAM` (nộp, gửi, ký, thanh toán, OTP…) dù kế hoạch ghi 'doc'.

## Kết quả (Runtime → Orchestrator)

```ts
interface KetQuaLuot {
  nhiem_vu_id: string;
  trang_thai: 'xong' | 'tiep' | 'cho_duyet' | 'ban_giao' | 'loi';
  // xong: hết bước; tiep: hết ngân sách thời gian, chạy tiếp từ `buoc_tiep`; cho_duyet: gặp bước 'ngoai' chưa duyệt;
  // ban_giao: gặp OTP/CAPTCHA/đăng nhập — cần người; loi: lỗi (kèm `loi`)
  buoc_tiep: number;
  url_hien_tai: string | null;
  ket_qua_buoc: { buoc: number; cong_cu: string; tac_dong: 'doc' | 'ngoai'; ok: boolean; du_lieu?: unknown; loi?: string; ms: number }[];
  loi?: string;
}
```

Nội dung trang là **dữ liệu không đáng tin**: runtime trả nguyên văn (cắt gọn) trong `du_lieu`, không bao giờ diễn giải
thành lệnh; Orchestrator/mô hình chỉ được dùng nó làm dữ liệu.

## An toàn bắt buộc ở runtime
- Chống SSRF: chỉ http/https, cổng 80/443; tên miền phải thuộc `mien_cho_phep`; phân giải DNS và chặn IP riêng/loopback/
  link-local/metadata (127/8, 10/8, 172.16/12, 192.168/16, 169.254/16, ::1, fc00::/7, fe80::/10, 100.64/10); chặn mọi
  request phụ (route) ra ngoài danh sách; chặn chuyển hướng ra ngoài phạm vi.
- Cô lập: mỗi lần gọi một browser context mới, không lưu cookie giữa người dùng/doanh nghiệp.
- Giới hạn: ngân sách thời gian, số bước ≤ 30, kích thước ảnh/nội dung, `maxDuration` Vercel.
- Không retry thao tác 'ngoai'. Lỗi giữa chừng ở bước 'ngoai' → trạng thái 'loi' kèm "chưa rõ kết quả", không chạy lại.

## Orchestrator (`agent-dieu-phoi`) — hành động
`tao` (từ hội thoại: mục tiêu + agent gợi ý), `chay` (gọi runtime đến khi xong/cho_duyet/ban_giao/loi, tối đa N lượt),
`duyet_buoc`, `huy`, `xem`, `ds`. Quyền theo vai trò sẵn có. Khoá chống trùng. Nhật ký mỗi bước (che giá trị điền).

Đã làm (13/10/2026): `supabase/functions/agent-dieu-phoi/index.ts`, `_shared/agent/{dang-ky,dieu-phoi,chuan-hoa-json}.ts`,
migration `20261013100000_nhiem_vu_agent.sql`. Quyền: `xem`/`ds` → `xem`; `tao`/`chay`/`huy` → `ghi_chung_tu`;
`duyet_buoc` → `soan_to_khai` (agent `tai_chinh`: `duyet_chi`). Chỉ duyệt được ĐÚNG bước runtime đang dừng (`buoc_tiep`).
Mỗi lần `chay` tối đa 4 lượt × ≤ 45 giây, tổng ≤ 110 giây; hết lượt → về `cho`, gọi `chay` lần nữa để chạy tiếp.
Bước `ngoai` đã gửi đi một lần bị gạch khỏi `da_duyet` ở mọi lượt sau (`ket_qua.ngoai_da_thu`); mất kết nối runtime khi
lượt có bước `ngoai` đã duyệt → `loi` "chưa rõ kết quả", trạng thái cuối. Runtime trả 4xx không kèm `trang_thai` (chữ ký,
JWT, hạn) → Orchestrator ghi `loi` với mã HTTP.

## Chuẩn hoá JSON (chữ ký lệnh) — runtime PHẢI dùng đúng thuật toán này

Nội dung ký = UTF-8 của `chuanHoaJson(lệnh bỏ trường chu_ky)`; `chu_ky` = Ed25519 (RFC 8032, WebCrypto `{name:'Ed25519'}`),
mã hoá **base64url không đệm** (86 ký tự). Bản tham chiếu + test: `supabase/functions/_shared/agent/chuan-hoa-json.ts`.

`chuanHoaJson(v)`:
- `null`, `true`, `false` → như `JSON.stringify`.
- số: phải hữu hạn (NaN/±Infinity → lỗi, từ chối lệnh); viết bằng `JSON.stringify(n)` (−0 → `0`). Lệnh v1 chỉ có số nguyên.
- chuỗi: `JSON.stringify(s)`.
- mảng: `"[" + phần tử chuẩn hoá nối "," + "]"`, giữ thứ tự; phần tử `undefined` → `null`.
- đối tượng thuần: bỏ khoá có giá trị `undefined`; sắp khoá bằng `Array.prototype.sort()` mặc định (thứ tự đơn vị mã
  UTF-16); `"{" + JSON.stringify(khoá) + ":" + giá trị chuẩn hoá`, nối ",", `"}"`.
- kiểu khác (Date, Map, bigint, hàm…) → lỗi.
- Không có khoảng trắng nào.

Ví dụ: `{"b":1,"a":[3,{"d":null,"c":"x"}]}` → `{"a":[3,{"c":"x","d":null}],"b":1}`.

Runtime kiểm: tách `chu_ky`, chuẩn hoá phần còn lại (đúng thân JSON đã parse — không ký trên chuỗi thô của request), verify
bằng khoá công khai. Sau đó mới kiểm `het_han` (≤ 60 giây), `nonce`, `nguoi_dung_id` = `sub` của JWT.

Định dạng khoá:
- Secret `MIMI_RUNTIME_PRIVATE_KEY` (Supabase): JWK JSON `{"kty":"OKP","crv":"Ed25519","d":"…","x":"…"}` **hoặc** PKCS8 DER
  base64/base64url (có thể bọc `-----BEGIN PRIVATE KEY-----`). Sai dạng/thiếu → `chay` trả 503 `RUNTIME_CHUA_CAU_HINH`.
- Khoá công khai (trong code runtime): 32 byte thô dạng base64url, hoặc JWK `{"kty":"OKP","crv":"Ed25519","x":"…"}`.
- `MIMI_RUNTIME_URL` mặc định `https://www.mimiwallet.online/api/agent-runtime`.

Tạo cặp khoá (Node ≥ 20): `crypto.subtle.generateKey({name:'Ed25519'}, true, ['sign','verify'])` → `exportKey('pkcs8')` cho
secret, `exportKey('raw')` (base64url) cho runtime.
