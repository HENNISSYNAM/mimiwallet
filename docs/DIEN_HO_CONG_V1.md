# Điền hộ lên cổng — phiên bản đầu (v1)

Ngày: 10–11/10/2026. Trạng thái: **thử nghiệm, sau cờ, chưa triển khai production.**

Mục tiêu: MIMI lấy một bản nháp tờ khai đã lưu (máy chủ đã tính và băm), điền vào đúng tab người dùng chọn, đọc lại từng ô, báo đối chiếu, rồi **bàn giao trước khi ký/nộp**. Windows trước, hộ kinh doanh trước, một biểu mẫu: **01/TKN-CNKD** (thông báo doanh thu / tờ khai năm của hộ, kỳ năm và 6 tháng đầu, dòng [08a]–[08e] và [11]).

---

## 1. HEAD đã đọc và hiện trạng

**HEAD lúc bắt đầu:** `79c58ec` (Trợ lý: bỏ câu "MIMI đọc được hoá đơn điện tử"). Không có thay đổi chưa commit của người khác trong các tệp đã sửa. Các tệp chưa theo dõi có sẵn (`docs/bo-cong-thuong/...`, `docs/MO_TA_DU_AN_RND_TO_STARTUP_2026.docx`, `.claude/worktrees/`) không bị đụng tới.

Hiện trạng trước thay đổi, đã xác nhận bằng cách đọc code:

| Câu hỏi | Trả lời | Dẫn |
|---|---|---|
| Con trỏ "MIMI làm hộ" làm gì? | Chỉ điều khiển **giao diện MIMI** bên trong `/dashboard`: đi tới trang, chỉ, gõ, bấm các đích `data-mimi`. Không chạm trang ngoài. Có hai lớp chặn tự bấm: `DICH_KHONG_TU_BAM` lúc kiểm kịch bản và `[data-mimi-khong-tu-bam]` lúc chạy. | `src/lib/mimiLamHo.ts`, `src/components/mimi/MimiLamHo.tsx:212` |
| Nút "cổng thuế" truyền dữ liệu hay chỉ mở liên kết? | **Chỉ mở liên kết** `https://dichvucong.gdt.gov.vn/tthc/homelogin`. Không truyền gì. | `src/lib/goiToKhai.ts:37` |
| MCP trong repo là server hay client? | **Server** cung cấp công cụ (`app-mcp`, sinh tự động bởi `@lovable.dev/mcp-js`). MIMI không phải MCP client, không có công cụ trình duyệt trong sản phẩm. | `supabase/functions/app-mcp/index.ts:1-4` |
| Tính tờ khai ở đâu? | Máy chủ, edge function `to-khai`; bản nháp lưu ở `to_khai_nhap` (`du_lieu` + `ma_bam`). Doanh thu từ đường đọc `dungSoLieuDoanhThu` (loại chuyển nội bộ, hỏi khoản vay/chưa rõ), có test đối kháng. | `supabase/functions/to-khai/index.ts`, `supabase/functions/_shared/doanh-thu/so-lieu.ts:456`, `.../adversarial.test.ts` |
| Quyền | Hành động `soan_to_khai` (chủ sở hữu, quản trị, kế toán). | `supabase/functions/_shared/quyen/` |
| Trạng thái nộp hồ sơ | Đã có `yeu_cau_thuc_thi` (tự nộp → biên nhận → cơ quan xác nhận), không tự biến lời người dùng thành "đã chấp nhận". | `supabase/functions/_shared/thuc-thi/may-trang-thai.ts`, `thuc-thi.test.ts:90` |

Năng lực **chỉ có trong code / đã kiểm thử** trước thay đổi: điền hộ trên trang ngoài — **không tồn tại**. Mọi thứ dưới đây là mới.

Tái sử dụng (không dựng song song): quyền `soan_to_khai`; bản nháp đã băm `to_khai_nhap`; đường đọc doanh thu hiện có; chuỗi trạng thái hồ sơ `yeu_cau_thuc_thi`; zod; hạ tầng giới hạn tần suất của `to-khai`.

## 2. Kiến trúc đã chọn và bằng chứng

**Chọn:** bộ chạy tại máy (Node 22 + `playwright-core` 1.56.1, Apache-2.0) mở **Chrome hoặc Edge đã cài** bằng `launchPersistentContext` với **hồ sơ trình duyệt riêng của MIMI** (`%LOCALAPPDATA%\MIMI\dien-ho\trinh-duyet-<kênh>`), điều khiển qua **pipe** (không có cổng gỡ lỗi TCP). Web MIMI nói chuyện với bộ chạy qua `http://127.0.0.1:47321` sau khi ghép mã. Máy chủ (`to-khai`) là nguồn sự thật của nhiệm vụ; bộ chạy hỏi lại máy chủ trước khi bắt đầu, trước **mỗi** lượt ghi và khi tiếp tục.

```
Web MIMI (trang Tờ khai)  ──ghép mã, token, nonce──▶  Bộ chạy 127.0.0.1:47321 ──pipe──▶ Chrome/Edge (hồ sơ MIMI)
      │ JWT người dùng                                     │ JWT (chỉ giữ trong RAM)          └─ tab người dùng chọn
      ▼                                                    ▼
  edge fn to-khai: dien_tao_phien / dien_nhiem_vu / dien_ghi   (nhiệm vụ, mã băm kế hoạch, nhật ký đã che giá trị)
```

Tách vai: **đề xuất** = bộ chuyển cố định (không có AI trong v1; nếu sau này có AI, nó chỉ được đề xuất `HanhDong` đúng schema) → **luật** = `kiemHanhDong` (`src/lib/dienCong/hopDong.ts`) + `kiemPhien` máy chủ → **thực thi** = `PhienDien` (`helper/src/thucThi.ts`) → **kiểm chứng** = đọc lại từng ô + `khopGiaTri`.

Bằng chứng thử nghiệm (`helper/thu/thu-nghiem-kien-truc.mjs`, chạy lại ngày 11/10/2026, cả Chrome và Edge — `THỬ NGHIỆM ĐẠT`):

```
ĐẠT  0. không mở cổng debug TCP — cổng LISTENING mới khi trình duyệt chạy: không có (so netstat trước/sau)
ĐẠT  1. kết nối đúng tab đã chọn — chọn tab 1/2
ĐẠT  2. nhập và chọn — kỳ=nam, năm=2025, đánh dấu, [08a] và [11] = 812.345.678
ĐẠT  3. đọc lại và khớp
ĐẠT  4. phát hiện khác biệt — điền 500.000, đọc lại 0 → lệch
ĐẠT  4b. không bấm nộp, không nhập OTP
ĐẠT  5. dừng và ngắt kết nối
```

Phương án loại và lý do:

- **Playwright MCP (extension mode / server):** sinh ra cho vòng lặp AI khám phá trang; chính tài liệu dự án ghi không phải ranh giới bảo mật. V1 không cần AI khám phá — biểu mẫu cố định, locator cố định. Không dùng.
- **`connectOverCDP` vào Chrome đang mở của người dùng:** cần mở cổng `--remote-debugging-port` (cổng gỡ lỗi trên máy, bất kỳ tiến trình nào cũng nối được), và Chrome mới chặn cổng này trên hồ sơ mặc định. Trái yêu cầu "không mở debugging công khai". Không dùng.
- **Điều khiển từ Edge Function:** không thể và không được phép. Không dùng.
- **nut.js:** không cần — không có tác vụ ngoài trình duyệt. Không thêm.

Giới hạn của lựa chọn: người dùng phải đăng nhập cổng **trong cửa sổ trình duyệt do bộ chạy mở** (hồ sơ riêng), không phải Chrome thường ngày của họ. Đó là đánh đổi có chủ đích để không mở cổng gỡ lỗi.

Dependency: `playwright-core` 1.56.1 (Apache-2.0) — không tải trình duyệt kèm. Node.exe đóng kèm gói (MIT). Đóng gói: mục 6.

## 3. Insight cuộc họp 09/10/2026 → tính năng → ưu tiên → nghiệm thu

Các phát biểu trong cuộc họp là **giả thuyết**, không phải bằng chứng về giấy phép, tích hợp hay tính năng đã xong.

| Insight (giả thuyết) | Tính năng trong v1 | Ưu tiên | Nghiệm thu |
|---|---|---|---|
| Thống nhất từ dữ liệu tài chính, chứng từ đến hồ sơ và theo dõi kết quả | Điền hộ nối tiếp bản nháp đã lưu (đã qua đường đọc doanh thu); kết quả điền tách khỏi trạng thái hồ sơ, trạng thái hồ sơ vẫn ở luồng nộp hiện có | P0 | Ô [11] được điền đúng số máy chủ tính, đã loại vay/nội bộ (`doanh-thu-den-o.test.ts`); phiên điền không thể mang trạng thái "đã nộp" (`luu.test.ts`) |
| Cá nhân hoá theo hồ sơ kinh doanh và chính sách tổ chức | Nhiệm vụ gắn công ty, người dùng, MST hồ sơ; quyền `soan_to_khai` hiện có | P0 | Sai công ty → 404; thiếu quyền → dừng; MST đăng nhập trên trang khác hồ sơ → dừng trước khi chạm ô |
| Tận dụng công nghệ sẵn có; tự làm phần nghiệp vụ, kiểm quyền, truy nguồn, kiểm chứng | Playwright (có sẵn), không tự viết điều khiển trình duyệt; tự viết hợp đồng hành động, luật, đối chiếu, nhật ký | P0 | Thử nghiệm kiến trúc đạt; 15 kịch bản trên trình duyệt thật đạt |
| Kiểm soát chi phí vận hành agent | V1 không gọi model trong vòng điền (bộ chuyển xác định) → chi phí model 0 cho mỗi lần điền | P1 | Không có lời gọi model trong `helper/` |
| Bắt đầu từ khách nhỏ và một hành trình hoàn chỉnh | Một loại hộ, một biểu mẫu, hai kỳ; mọi trường hợp ngoài phạm vi bị từ chối thay vì điền một phần | P0 | Bản nháp có [09x]/[10]/thuế phải nộp ≠ 0 → từ chối (`bo-chuyen.test.ts`) |
| Đa tài khoản, quốc tế, chạy tại máy — sau khi có bằng chứng nhu cầu | Bộ chạy tại máy đã có (vì cần cho trình duyệt), nhưng **model không chạy offline**; đa tài khoản/quốc tế để backlog | Backlog | — |
| Carbon, mô hình offline | Không làm | Backlog | — |

## 4. Thay đổi và kiểm thử thực sự đã chạy

Commit (trên máy, **chưa đẩy**):

| Commit | Nội dung |
|---|---|
| `996ef22` | Hợp đồng task/action/result (zod, `src/lib/dienCong/hopDong.ts`); bộ chuyển `tkn-cnkd-thu` 0.1.0 và `tkn-cnkd-cong-thue` 0.0.0 *chưa xác minh, tắt* (`supabase/functions/_shared/dien-cong/bo-chuyen.ts`); phiên/nhật ký (`.../luu.ts`); migration `20261010090000_dien_ho_cong.sql`; ba hành động mới trong `to-khai`; bộ chạy `helper/` (pipe, cổng 127.0.0.1 ghép mã, chống phát lại); biểu mẫu thử `helper/thu/bieu-mau-thu.html`; thử nghiệm kiến trúc |
| `1077e78` | Khung "Điền hộ lên cổng" trên trang Tờ khai sau cờ `VITE_DIEN_CONG` (`src/components/dien-cong/DienHoCong.tsx`); client bộ chạy (`src/lib/dienCong/ketNoiBoChay.ts`); kịch bản MIMI làm hộ `dien_to_khai_len_cong` + đích `to-khai.dien-ho`, `to-khai.dien-ho.bat-dau` (không tự bấm); CSP `connect-src` thêm `http://127.0.0.1:47321` |
| `31047ca` | Cờ máy chủ `DIEN_CONG_ENABLED` nhận `1` hoặc danh sách id công ty thử; test nối khoản vay/chuyển nội bộ tới ô [11] |
| `317d7ad` | Đóng gói Windows + bài kiểm gói |
| `2cec162` | Test máy chủ cho phiên |

Kiểm thử đã chạy (11/10/2026, máy Windows 11 của chủ dự án):

| Lệnh | Kết quả |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | đạt |
| `npx tsc -p helper/tsconfig.json` (noEmit) | đạt (lần chạy trong commit `996ef22`) |
| `npx --yes deno check supabase/functions/to-khai/index.ts` | đạt |
| `npx vitest run --maxWorkers=2` (toàn bộ) | **220 tệp, 2105 test đạt** |
| `MIMI_KIEM_TRINH_DUYET=1 npx vitest run --config helper/vitest.config.ts --maxWorkers=1` | **15/15 đạt** trên Chrome; đã đạt trên `KENH=msedge` (lần chạy trong commit `996ef22`) |
| `node helper/thu/thu-nghiem-kien-truc.mjs` (+ `KENH=msedge`) | đạt cả hai |
| `node helper/dong-goi/kiem-goi.mjs helper/ban-phat-hanh/mimi-dien-ho-0.1.0-win-x64.zip` | **14/14 đạt** (cài, lối tắt, không tự khởi động, mã ghép, chỉ 127.0.0.1, Origin lạ bị chặn, ghép, mở Chrome hồ sơ riêng, không cổng gỡ lỗi, huỷ ghép, tắt bằng q, nâng bản, quay lại, gỡ) |
| `VITE_DIEN_CONG=1 npm run build` | đạt (exit 0). Bước dựng sẵn báo 5 trang `/kham-pha/*` "nội dung rỗng" và vẫn chạy như SPA — không thuộc tệp đã đổi, chưa kiểm ở commit trước |

Tình huống bắt buộc → test:

| Tình huống | Ở đâu |
|---|---|
| Sai tổ chức hoặc thiếu quyền | `luu.test.ts` (công ty khác → 404, thiếu quyền → dừng); `bo-chuyen.test.ts` (`kiemPhien`); MST trên trang khác hồ sơ → `thucThi.test.ts` |
| Khoản vay / chuyển nội bộ thành doanh thu | `doanh-thu-den-o.test.ts` (chạy đường đọc doanh thu thật → ô [11]); gốc ở `doanh-thu/adversarial.test.ts` |
| Dữ liệu thiếu, tiền lớn, định dạng | `bo-chuyen.test.ts` (`chuanTien`, tổng [11] mâu thuẫn, thiếu MST); `hopDong.test.ts` (8.500.000.000.000, dấu chấm/phẩy, phần lẻ thập phân là lệch) |
| Bản nháp đổi sau khi tạo kế hoạch | `luu.test.ts` (mã băm đổi, bản mới hơn cùng kỳ, MST đổi); `thucThi.test.ts` (đổi giữa chừng → dừng, ô sau không bị ghi) |
| Prompt injection từ trang | `thucThi.test.ts` (trang có đoạn "ra lệnh" nhập OTP và bấm Nộp — bị bỏ qua); bộ chạy không đọc chữ trên trang làm lệnh |
| Điều hướng ngoài phạm vi | `thucThi.test.ts`; `hopDong.test.ts` |
| Mất kết nối, hết phiên, đóng tab | `thucThi.test.ts` (đóng tab); `luu.test.ts` (hết hạn 30 phút); mất mạng khi hỏi máy chủ → phiên về `loi`, không ghi ô đó (theo code `helper/src/thucThi.ts`; **chưa có test riêng** cho mất mạng) |
| Ghi chưa rõ kết quả | `thucThi.test.ts` (ô bị khoá → `khong_ro`, dừng, không thử lại); `hopDong.test.ts` |
| Dừng và tiếp tục | `thucThi.test.ts` (đọc lại trang, ô đã đúng không ghi lại, tổng 9 lượt ghi) |
| Ký/nộp bị chặn, bàn giao | `hopDong.test.ts` (`DICH_CAM` chặn cả khi bộ chuyển đưa vào); `thucThi.test.ts` (nút Nộp/OTP không bị chạm; bàn giao chỉ sau đối chiếu); `mimiLamHo.test.ts` (nút bắt đầu không tự bấm) |
| Biên nhận chưa xác minh | Luồng hồ sơ hiện có: `thuc-thi/thuc-thi.test.ts:24,90`; phiên điền không có trạng thái nộp (`luu.test.ts`) |
| Thu hồi quyền bộ chạy | `mayChu.test.ts` (huỷ ghép, khoá sau 5 lần sai, hết hạn 8 giờ, phát lại nonce); `kiem-goi.mjs` (huỷ ghép trên bản đóng gói) |

## 5. Năng lực: đã xác minh / chưa xác minh / chưa hỗ trợ

**Đã xác minh (bằng test chạy thật trên máy này):**
- Bộ chạy điền, đọc lại, đối chiếu, bàn giao trên **biểu mẫu thử có nhãn "MÔI TRƯỜNG THỬ"**, Chrome và Edge.
- Không mở cổng gỡ lỗi; cổng bộ chạy chỉ nghe 127.0.0.1; ghép mã, thu hồi, chống phát lại, Origin/Host.
- Các chặn ký/nộp/OTP/thanh toán nằm trong executor (`kiemHanhDong`), không chỉ trong lời nhắc.
- Logic máy chủ (tạo/kiểm phiên, chuyển trạng thái, nhật ký) trên CSDL giả.
- Gói Windows: cài, chạy, ghép, dừng, nâng, quay lại, gỡ — không admin, không tự khởi động.

**Chưa xác minh:**
- **Bộ chuyển cổng thuế thật `tkn-cnkd-cong-thue`:** chưa truy cập cổng thật → `chua_xac_minh`, `bat: false`, phiên bản 0.0.0, không có ánh xạ ô. Không có bằng chứng tương thích nào với `dichvucong.gdt.gov.vn` / eTax.
- **Chạy trọn trong sản phẩm (định nghĩa hoàn thành):** **chưa có**. Lý do (trở ngại bên ngoài): (1) migration `20261010090000_dien_ho_cong.sql` chưa áp lên CSDL và `to-khai` mới chưa triển khai — cả hai là thay đổi production, cần chủ dự án duyệt; (2) không dựng được Supabase cục bộ vì máy chưa có WSL nên Docker không chạy (cài WSL cần quyền admin và khởi động lại). Phần web ↔ bộ chạy đã chạy được qua bản đóng gói; phần web ↔ máy chủ ↔ bộ chạy mới chạy trong test với máy chủ giả.
- RLS thật của hai bảng mới (mới chỉ đọc lại SQL, chưa chạy trên Postgres).
- `upgrade-insecure-requests` trong CSP production với `fetch('http://127.0.0.1:47321')`: Chrome coi 127.0.0.1 là nguồn tin cậy, nhưng chưa thử trên tên miền thật.

**Chưa hỗ trợ (cố ý, chặn trong executor):** nhập OTP, vượt CAPTCHA, ký số, nộp chính thức, thanh toán; tạo XML hợp lệ (bản nháp in/xuất **không phải** XML hợp lệ và **không phải** hồ sơ đã nộp); biểu mẫu khác 01/TKN-CNKD; kỳ quý/6 tháng cuối; dòng [09x], [10], thuế phải nộp ≠ 0; mẫu theo TT89 (bản nháp năm 2026 đang bị chặn `MAU_DA_THAY`); macOS.

## 6. Cài, dùng, dừng, gỡ, xử lý lỗi

**Bật (chỉ khi chủ dự án duyệt):**
1. Áp migration `supabase/migrations/20261010090000_dien_ho_cong.sql`.
2. Đặt secret `DIEN_CONG_ENABLED=<id công ty thử>` (không đặt `1` cho tới khi có bộ chuyển cổng thật đã xác minh), rồi triển khai `to-khai`.
3. Build web với `VITE_DIEN_CONG=1`. Cờ tắt thì khung không hiện, kịch bản mèo nói rõ là chưa bật.
4. Tắt nhanh: bỏ secret (máy chủ trả `DIEN_CONG_TAT`), hoặc đặt `bat: false` cho bộ chuyển trong `bo-chuyen.ts` (phiên đang chạy sẽ dừng ở lượt hỏi lại kế tiếp vì `kiemPhien` kiểm bộ chuyển).

**Đóng gói:** `powershell -ExecutionPolicy Bypass -File helper/dong-goi/dong-goi.ps1` → `helper/ban-phat-hanh/mimi-dien-ho-<bản>-win-x64.zip` + `.sha256` (~33 MB; thư mục này không commit).

**Người dùng cài:** giải nén → bấm phải `cai-dat.ps1` → Run with PowerShell. Cài vào `%LOCALAPPDATA%\MIMI\dien-ho\ban\<bản>`, tạo lối tắt menu Start "MIMI Dien Ho". Không cần admin, không tự khởi động, không ghi registry.

**Dùng:**
1. Mở "MIMI Dien Ho" → cửa sổ hiện **mã ghép 6 số** (10 phút, dùng một lần).
2. MIMI → Tờ khai → "Điền hộ lên cổng" → nhập mã → Ghép nối.
3. Chọn bản nháp 01/TKN-CNKD đã lưu.
4. Bấm "Mở Chrome" (hoặc Edge) → trong cửa sổ đó đăng nhập và mở trang biểu mẫu → "Tải danh sách tab" → chọn tab.
5. "Bắt đầu điền" → theo dõi tiến độ → xem bảng đối chiếu (Bản nháp / Đọc lại / Khớp–Lệch) → "Nhận bàn giao".
6. Tự kiểm trên trang, tự ký, tự nộp. Trạng thái hồ sơ vẫn là **chưa nộp** cho tới khi bạn ghi nhận ở luồng nộp.

**Dừng:** nút "Dừng" (phiên về `tam_dung`; "Tiếp tục" gửi lại phiên đăng nhập mới, bộ chạy hỏi lại máy chủ và đọc lại trang trước khi ghi). Hoặc gõ `q` trong cửa sổ bộ chạy, hoặc đóng cửa sổ.

**Thu hồi:** "Huỷ ghép" trong MIMI, hoặc gõ `m` trong cửa sổ bộ chạy (mã mới, mọi ghép cũ mất hiệu lực). Token tự hết hạn sau 8 giờ.

**Quay lại bản trước:** `powershell -ExecutionPolicy Bypass -File "%LOCALAPPDATA%\MIMI\dien-ho\ban\<bản đang dùng>\cai-dat.ps1" -QuayLai`.

**Gỡ:** `powershell -ExecutionPolicy Bypass -File go-cai-dat.ps1` (xoá cả hồ sơ trình duyệt riêng, tức phiên đăng nhập cổng); thêm `-GiuHoSo` để giữ.

**Dữ liệu:** cookie, mật khẩu, OTP của cổng nằm trong hồ sơ trình duyệt riêng trên máy, không gửi lên MIMI/Supabase/model, không nằm trong sao lưu MIMI. Máy chủ chỉ lưu nhật ký: tác nhân, hành động, khoá ô, kết quả, **SHA-256 của giá trị** (không giá trị thô), mã băm bản nháp, phiên bản bộ chuyển, phương pháp kiểm chứng, thời điểm. Hạn lưu: nhật ký 90 ngày, phiên 180 ngày (cron `mimi-don-dien-cong`). Xoá công ty → xoá dây chuyền theo khoá ngoại.

**Xử lý lỗi:**

| Thấy | Làm |
|---|---|
| "Không thấy bộ chạy MIMI Điền hộ trên máy này" | Mở "MIMI Dien Ho". Lần đầu chạy bản mới có thể mất 10–60 giây (Windows quét tệp mới) trước khi hiện mã. |
| "Chưa ghép nối" / mã sai | Lấy mã mới (`m`). Sai 5 lần thì mã bị khoá, phải lấy mã mới. |
| "nhãn môi trường" | Bản v1 chỉ điền trang thử có nhãn "MÔI TRƯỜNG THỬ". Cổng thật chưa được hỗ trợ. |
| "Mã số thuế ... khác hồ sơ" | Đăng nhập đúng tài khoản của hộ trên trang, hoặc sửa MST trong hồ sơ MIMI. |
| "Bản nháp đã đổi" / "Kế hoạch dựng lại không còn khớp" | Bản nháp hoặc hồ sơ vừa đổi. Bắt đầu lại để tạo phiên mới. |
| "chưa rõ" ở một ô | Bộ chạy không biết lần ghi trước có ăn không nên đã dừng. Tự kiểm ô đó trên trang. Không bấm chạy lại cho tới khi đã kiểm. |
| "Lệch" trong bảng đối chiếu | Trang hiển thị khác bản nháp. Sửa tay trên trang hoặc tìm nguyên nhân trước khi ký. |
| "ngoài phạm vi" / "tab mới" | Trang tự chuyển hoặc mở cửa sổ khác. Đưa tab về đúng trang biểu mẫu rồi bắt đầu lại. |
| `DIEN_CONG_TAT` | Máy chủ đang tắt tính năng (cờ). |

## 7. Backlog theo phụ thuộc

1. **Duyệt và bật thử trong sản phẩm** *(cần chủ dự án)*: áp migration → secret `DIEN_CONG_ENABLED=<id công ty thử của chủ>` → triển khai `to-khai` → chạy web cục bộ với `VITE_DIEN_CONG=1` → chạy trọn luồng trên biểu mẫu thử, chụp bằng chứng. Hoặc cài WSL + Docker để chạy Supabase cục bộ thay vì đụng production. *Chặn mọi mục dưới.*
2. **Bộ chuyển cổng thật 01/TKN-CNKD** ← (1) + quan sát cổng thật bằng tài khoản thử của chủ: ghi locator ổn định, cách đọc MST đang đăng nhập, cách nhận biết đúng mẫu/kỳ; test trên ảnh chụp DOM; giữ `bat: false` cho tới khi điền-đọc lại đạt trên tài khoản thật mà không nộp.
3. **Nối bàn giao với trạng thái hồ sơ** ← (2): sau "Nhận bàn giao", gợi ý mở `yeu_cau_thuc_thi` tự nộp; vẫn đòi biên nhận và kết quả cơ quan như hiện nay.
4. **Mẫu theo TT89** ← có mẫu chính thức: bộ chuyển mới, phiên bản mới; bỏ chặn `MAU_DA_THAY` theo đúng quy định.
5. **Kỳ quý / 6 tháng cuối, dòng [09x]/[10]** ← (2).
6. **AI đề xuất bước** (chỉ khi trang biến động nhiều) ← (2): model chỉ đề xuất `HanhDong` đúng schema, luật và executor giữ nguyên; tính chi phí mỗi lần điền.
7. **Ký mã bản phát hành Windows** (chứng thư code-signing) ← trước khi phát cho khách ngoài nhóm thử.
8. Đa tài khoản, quốc tế, macOS ← có bằng chứng nhu cầu.
9. Carbon, mô hình offline — ngoài phạm vi v1.
