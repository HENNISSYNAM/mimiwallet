# Cắt giảm MIMI theo thuật toán 5 bước (chuẩn bị 20/11/2026, thực hiện từ 27/11/2026)

> 1. Nghi ngờ mọi yêu cầu — mỗi yêu cầu phải có **tên một người** chịu trách nhiệm, không phải "phòng ban" hay "cho đủ bộ".
> 2. **Xoá** phần thừa. Chưa phải thêm lại ~10% thì là xoá chưa đủ.
> 3. Đơn giản hoá — chỉ sau khi đã xoá.
> 4. Tăng tốc. 5. Tự động hoá — luôn sau cùng.

Vòng duy nhất MIMI giữ: **Tiền vào → Sổ → Thuế** (cộng Quầy và Văn phòng kế toán làm kênh). Thứ gì không phục vụ vòng này phải có người
đứng tên bảo vệ, không thì xoá.

## Bảng quyết định (Nam điền cột "Người chịu trách nhiệm" + đánh dấu)

Số dòng = code không tính test. "Dính vào" = nơi ngoài tính năng đang import nó (quét 20/11).

| # | Phần | Dòng | Dính vào lõi? | Đề xuất | Người chịu trách nhiệm | Quyết |
|---|---|---|---|---|---|---|
| A | **Kiểm soát agent** — trang `TacTuPage`, `ChinhSach`, `components/tac-tu`, edge function `tac-tu` | ~3.600 | **Có**: `_shared/tac-tu` (khớp chi, khoá, chính sách) được `cas-webhook`, `bank-link`, `sao-ke`, `mcp`, `cfo` dùng | Xoá TRANG + function `tac-tu`; GIỮ phần `_shared/tac-tu` đang được webhook dùng, chuyển sang `_shared/doi-soat` cho đúng tên | | ☐ xoá ☐ giữ |
| B | **Chi phí AI + "Model AI rẻ hơn"** — `ChiPhiAiPage`, `components/chi-phi-ai`, function `chi-phi-ai` | ~1.800 | **Có**: `_shared/chi-phi-ai/bang-gia.ts` được hệ thống XU dùng | Xoá trang + function; chuyển `bang-gia.ts` vào `_shared/xu/` | | ☐ xoá ☐ giữ |
| C | **Đăng ký kinh doanh + Soạn giấy tờ** — `lib/dangKy` (1.743), 2 trang, `components/dang-ky` | ~2.770 | **Không** | Xoá sạch | | ☐ xoá ☐ giữ |
| D | **Trang công khai đã đóng** — Trí tuệ nhân tạo, Khảo sát giá, Khám phá/agent-ai, sản phẩm kiểm soát agent / duyệt chi / chống chuyển nhầm | ~600 + nội dung | Không | Xoá; đường dẫn cũ chuyển về trang chủ | | ☐ xoá ☐ giữ |
| E | **Bản dịch tiếng Trung + tiếng Hàn** | ~9.000 | Không | Xoá; giữ vi + en. Mỗi câu chữ mới hiện phải viết 4 lần | | ☐ xoá ☐ giữ |
| F | **SePay** (khách đã bỏ) — 25 file còn nhắc | ? | Cần kiểm webhook cũ | Xoá đường nhận SePay; giữ dữ liệu cũ đã ghi | | ☐ xoá ☐ giữ |
| G | **11 route "Tạm dừng"** + `TamDungPage` + `dongBang.ts` | nhỏ | Không | Xoá sau khi A–D xoá (hết thứ để đóng băng) | | ☐ xoá |
| H | **Cổng AI Lovable** (route `/.lovable/oauth/consent`, gateway trong `tro-ly`, `agent-dieu-phoi`) | nhỏ | Có (dự phòng trong tro-ly) | Bỏ; production đã dùng OpenRouter, nay thêm Bedrock | | ☐ xoá ☐ giữ |
| I | **Dấu chân carbon** trong trợ lý (`_shared/carbon`, `DauChanCarbon`) | ~200 | Có (tro-ly) | Hỏi: ai cần carbon trong app thuế hộ kinh doanh? Không ai → xoá | | ☐ xoá ☐ giữ |
| J | **MCP / app-mcp** (cho AI bên ngoài gọi MIMI) | ~470 | Có (menu công khai) | Hỏi: có khách nào đang nối MCP không? Không → tắt, giữ trên nhánh lưu trữ | | ☐ xoá ☐ giữ |
| K | **`/admin/quant`** (công cụ cá nhân của Nam) trong app bán khách | ~340 | Không | **Không đưa vào app khách** — tách ra repo mimi-quant | | ☐ tách |
| L | **11 worktree + 16 nhánh** (cũ nhất 08/2026) | — | Không | Gộp cái cần, xoá còn lại; mục tiêu ≤ 3 nhánh | | ☐ dọn |
| M | **Cổng AI dư** (Lovable, Stali, OpenRouter, Bedrock) | — | Có | Còn 2: Bedrock chính, OpenRouter dự phòng | | ☐ |

**Không cắt** (đã kiểm, là lõi): `hanh-trinh` (dùng khắp nơi), `dien-cong` (tờ khai), xu/năng lượng, POS, văn phòng, soat-bill.

**Câu hỏi bước 1 — cần Nam trả lời trước khi cắt:**
1. Hồ sơ vay + Cơ hội phát triển + Giới thiệu ngân hàng (~1.600 dòng `gioi-thieu-ngan-hang`): ngoài hồ sơ UOB, đã có ngân hàng / khách nào dùng chưa?
2. Mã hoá hậu lượng tử (PQC) cho KYC: ai yêu cầu? Có điều khoản / quy định nào bắt buộc không?
3. Chế độ 3D văn phòng: giữ làm màn tổng quan + demo (đề xuất), hay chỉ giữ lưới / danh sách?

## Ước tính

A + B (phần trang) + C + D + E + G ≈ **18.000–20.000 dòng (~15% code)**. Kèm theo: ít trang hơn → điều hướng tự gọn (xem đề xuất 4 chỗ:
Hôm nay · Quầy · Sổ · Giấy tờ), build nhanh hơn, ít chỗ cho lỗi.

## Cách làm an toàn (27/11 trở đi — KHÔNG làm trước khi nộp TechDay)

1. Tạo nhánh lưu trữ `luu-tru/truoc-cat-2026-11` từ main — mọi thứ xoá vẫn lấy lại được.
2. Làm trên nhánh riêng `cat-giam/musk-1`, mỗi mục A…M một commit (hoàn tác từng mục được).
3. Thứ tự: C, D, E (không dính lõi) → G → A, B (tách phần dùng chung trước, xoá sau) → H, I, J, M.
4. Mỗi commit: `npx tsc -p tsconfig.app.json --noEmit`, `npx vitest run`, `npx vite build`, `deno check` các function bị đụng.
5. Đường dẫn cũ → chuyển hướng (không 404 với người đã lưu bookmark).
6. Bảng dữ liệu KHÔNG xoá trong đợt này (chỉ code). Dọn bảng là đợt sau, có sao lưu.
7. Deploy: đẩy function trước, giao diện sau (theo quy trình đang dùng). Chỉ khi Nam nói "đẩy".

## Thước đo sau khi cắt
- Số dòng code, số trang, số route, thời gian `vite build`, thời gian tsc.
- Không thêm lại quá 10% trong 1 tháng → cắt đúng mức; thêm lại nhiều hơn → cắt quá tay, xem lại.
