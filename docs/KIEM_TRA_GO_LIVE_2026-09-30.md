# Kiểm tra trước go-live — 30/09/2026

Phạm vi: giao diện phát hành 29–30/09 (không gian Trợ lý, dải biểu tượng + lịch sử hỏi, MeoSong/PetMimi, video hero, i18n `kg.*`) và các luồng quan trọng (xác nhận chi `xac_nhan`, chuẩn hoá số hoá đơn, tiền BigInt, logic thuế).

Cách kiểm: đọc mã; test tái hiện tạm (đã xoá sau khi chạy, `git checkout -- supabase/functions/app-mcp/index.ts` sau mỗi lần); gọi GET tới production để xem header; mở trang chủ production ở 390px trong trình duyệt. **Không** đăng nhập vào dashboard production, nên phần dashboard trên máy thật là "chưa kiểm được".

Ký hiệu: **[TÁI HIỆN]** = đã có test tạm chạy qua, chứng minh lỗi; **[ĐỌC MÃ]** = kết luận từ đọc mã; **[PROD]** = đã kiểm trên production.

---

## P0 — chặn go-live

### P0-1. Bộ nhớ "công ty đang dùng" sống qua lần đăng xuất / đổi tài khoản [TÁI HIỆN]

- `src/lib/congTyDangDung.ts:48` (`let boNho`) và `:79` (`boNho ??= tai()`): bộ nhớ đệm cấp module, chỉ bị xoá ở `chonCongTy`/`lamMoiCongTy`. Không có chỗ nào xoá nó khi đăng xuất hoặc khi đổi người dùng.
- `src/hooks/useCongTy.ts:17,33,38`: bộ nhớ thứ hai (`boNho` tên + id công ty) cũng không bao giờ bị xoá.
- Đăng xuất là SPA, không tải lại trang: `MenuTaiKhoan.tsx:70` và `DashboardLayout.tsx:416` gọi `logout(); navigate('/')`; `useAuthStore.ts:137` chỉ `signOut()`. Đăng nhập lại cũng là SPA: `Login.tsx:49` (`navigate(dich)`) và nút demo `Landing.tsx:620-623`.

**Tình huống lỗi:** trên cùng một máy, A đăng xuất rồi B đăng nhập (hoặc bấm "Dùng thử demo" ngay ở trang chủ). `idCongTyDangDung()` trả **công ty của A**:
1. Tên công ty của A hiện trong menu tài khoản và tiêu đề bảng "Thêm" của B, chữ tắt ảnh đại diện lấy từ tên đó (`DashboardLayout.tsx:188-191`). Tên công ty của người khác bị lộ.
2. `kemCongTy` gắn `company_id` của A vào **mọi** lời gọi edge function (`goiTroLy`, `goiTacTu`, `goiCongTy`, `QrPayDialog`, `SubscriptionPayment`…). `tro-ly/index.ts:1364-1366` trả **403 "Bạn không thuộc công ty này"**. Với B, Trợ lý, pet, thanh toán, tờ khai đều hỏng cho tới khi tải lại trang.
3. Nếu B cũng là thành viên công ty của A (ví dụ kế toán được mời), B bị đưa **im lặng** vào công ty A thay vì công ty B đã chọn.
4. Phạm vi của bộ não thành `B:<công ty A>`, và lịch sử lọc theo công ty A (`lichSuHoiThoai.ts:305-310`).

Test tạm: `congTyDangDung()` cho A → đổi phiên sang B → vẫn trả `cty-of-u-A`, tên `Ten u-A`. **Pass = lỗi có thật.**

**Đề xuất sửa:**
- Thêm `xoaBoNhoCongTy()` trong `congTyDangDung.ts` (đặt `boNho = null`). Gọi hàm này và xoá `boNho` của `useCongTy`, `useCongCuGhim`, `useTrangThaiTroLy` trong một bộ nghe `supabase.auth.onAuthStateChange` **mỗi khi user id đổi**, gồm SIGNED_OUT và SIGNED_IN với id khác. Đặt bộ nghe ở `useAuthStore.initialize`, không đặt trong layout.
- Cách chắc nhất để go-live: sau `signOut()` thì `window.location.assign('/')` (tải lại cứng). Mọi bộ nhớ module đều mất.
- Nên cho `tai()` ghi kèm `user.id` vào `boNho`, và bỏ qua bộ nhớ khi id phiên hiện tại khác.

### P0-2. Bộ não dùng chung giữ câu trả lời tài chính của A sau khi A đăng xuất [TÁI HIỆN]

- `src/store/naoMimi.ts:223`: cleanup của `ganPhamViNao` huỷ bộ nghe auth. `DashboardLayout.tsx:146` gắn nó theo vòng đời layout.
- Khi đăng xuất: `navigate('/')` làm layout unmount **ngay**. Bộ nghe bị gỡ trước khi `logout()` (async) đặt `user = null`. Vì vậy `datPhamVi(null)` **không bao giờ chạy**: `luot` (câu hỏi, câu trả lời có số liệu, bảng) của A nằm lại trong bộ nhớ tab.
- Khi B đăng nhập, layout mount lại. `TroLyPage.tsx:101` (`useNaoMimi(s => s.luot)`) và `PetMimi` render **lần đầu với các lượt của A**. Chỉ khi effect của layout chạy (sau khi vẽ) thì dữ liệu mới bị xoá. Effect của trang con chạy trước effect của layout, nên `scrollIntoView`, và lượt pet `daXem=false` có thể hiện bong bóng.
- Điều này trái với điều kiện số 1 do chính kho tự đặt ra (`naoMimi.ts:16-17`).

Test tạm: gắn phạm vi A, thêm lượt, gọi cleanup, đặt `user=null` → `phamVi` vẫn `A:cA`, `luot.length === 1`.

**Đề xuất sửa:** xoá bộ não ngay trong `useAuthStore.logout` (`datLaiNao()` đồng bộ trước `signOut`), và/hoặc gắn `ganPhamViNao()` **một lần ở cấp App** (không gắn theo layout). Nên thêm một chốt nữa: `TroLyPage`/`PetMimi` chỉ hiện `luot` khi `phamVi` bắt đầu bằng `${user.id}:`. Cách tải lại cứng khi đăng xuất ở P0-1 cũng đóng luôn lỗi này.

---

## P1 — sửa trước hoặc ngay sau go-live

### P1-1. Race khi tải danh sách lịch sử: phản hồi cũ đè lên phạm vi mới [TÁI HIỆN]

- `src/components/layout/ThanhLichSu.tsx:45-58`: `tai()` không có mã lần gọi hay cờ huỷ. Khi `phamVi` đổi, nó `setDong(null)` rồi gọi lại. Nhưng phản hồi **chậm** của phạm vi cũ vẫn `setDong` khi về sau.
- Tình huống: danh sách đang tải cho công ty A, phạm vi đổi sang B (`lamMoiCongTy` ở `ThanhVienCongTy.tsx:64`, hoặc đổi tài khoản ở tab khác qua storage event của Supabase trong khi tab này vẫn mở dashboard). Danh sách B hiện ra, rồi bị **thay bằng các cuộc hỏi của công ty A**.
- Test tạm: gửi B trước, A về sau → màn hình còn "BI MAT cong ty A", mất "Cau cua cong ty B".
- Hiện đổi công ty qua Cài đặt có `window.location.reload()` (`ThanhVienCongTy.tsx:94`), nên khe hở hẹp. Nhưng bất biến "không bao giờ hiện lịch sử công ty khác" đang không được mã bảo đảm.

**Sửa:** trong `tai`, chụp `phamVi` (hoặc một bộ đếm) lúc gọi và bỏ kết quả nếu phạm vi đã đổi; hoặc dùng `useEffect` với cờ `huy`. `docLichSu` nên nhận `cid` từ phạm vi thay vì tự đọc lại `idCongTyDangDung()`.

### P1-2. `napCuoc` không kiểm phạm vi: mở một cuộc hỏi cũ rồi đổi phạm vi thì cuộc hỏi rơi vào phạm vi mới [TÁI HIỆN]

- `ThanhLichSu.tsx:83-94` (`mo`): `await docCuoc()` rồi gọi `napCuoc` vô điều kiện.
- `naoMimi.ts:172-177` (`napCuoc`): không so `theHe`/`phamVi`, khác với `chay()` vốn có `conHieuLuc`.
- Test tạm: bấm cuộc hỏi của A → `datPhamVi('u1:cB')` → `docCuoc` trả về → kho `u1:cB` chứa "Doanh thu A = 1 ty".
- Kèm theo: `lichSuHoiThoai.ts:318-323` (`docCuoc`) chỉ lọc theo `id`, không lọc `company_id`. RLS chỉ lọc `user_id = auth.uid()` (`20260918150000_hoi_thoai_quyet_dinh.sql`), nên người dùng đọc được hội thoại của **mọi** công ty mình từng hỏi.

**Sửa:** `napCuoc(ds, phamViLucGoi)` và bỏ qua nếu `get().phamVi !== phamViLucGoi`; trong `mo`, chụp `phamVi` trước khi `await`. Thêm `.eq('company_id', cid)` vào `docCuoc`.

### P1-3. Ghép số hoá đơn bằng chuỗi con: ghép nhầm hoá đơn vào khoản chi (ảnh hưởng số liệu thuế) [TÁI HIỆN]

- `supabase/functions/_shared/chung-tu/khop-chung-tu.ts:151-162`: vòng 1 chỉ kiểm `noi.includes(so)` với `so.length >= 4`. Không kiểm số tiền, không kiểm khoảng ngày, không kiểm ranh giới chữ số.
- Test tạm:
  - HĐ số `1234` (800.000 ₫, tháng 3) bị ghép vào khoản chi 5.000.000 ₫ tháng 9 có nội dung "TT tien hang 1.234.000…". `phang()` biến số tiền thành `1234000`, chứa `1234`.
  - Ngược lại, HĐ `00001234` (dạng 8 số thường gặp) **không** khớp nội dung "HD 1234".
- Hậu quả: `tongCoGiay` ("chi phí chứng minh được") và "còn thiếu bao nhiêu chứng từ" (`soSanhThue`) sai. Người dùng có thể chọn sai cách tính thuế. `thứ tự` hoá đơn cũng quyết định cái nào thắng (`break` ở hoá đơn đầu tiên khớp).

**Sửa:** so số hoá đơn theo token có ranh giới (regex `(?<!\d)0*1234(?!\d)` sau khi bỏ số 0 đầu ở cả hai phía). Yêu cầu thêm độ lệch tiền (`LECH_TIEN`) hoặc khoảng ngày rộng hơn (ví dụ 90 ngày). Nếu nhiều hoá đơn cùng khớp thì đưa vào `canXem`. Thêm test cho hai ca trên vào `khopChungTu.test.ts`.

### P1-4. Tệp JS không tồn tại trả `200 text/html`; service worker cache luôn bản HTML đó [PROD + ĐỌC MÃ]

- `vercel.json` viết lại `/(.*)` → `/index.html`. `curl https://www.mimiwallet.online/assets/khong-ton-tai-abc123.js` → **200, `Content-Type: text/html`**, kèm `nosniff`.
- `public/sw.js:85-95` (stale-while-revalidate cho mọi GET cùng origin) lưu phản hồi `res.ok` đó vào cache, dưới URL của tệp JS.
- Sau mỗi lần deploy, tab đang mở bấm sang route lazy (`App.tsx:35+`, `lazy(() => import(...))`) sẽ không tải được chunk: "Failed to fetch dynamically imported module"/MIME. Không có xử lý `vite:preloadError`: `boot.js` chỉ bắt lỗi lúc khởi động. Người dùng thấy màn trắng hoặc ErrorBoundary.

**Sửa:**
1. `vercel.json`: chỉ rewrite các đường không có phần mở rộng, ví dụ `"source": "/((?!assets/|video/|.*\\.[a-z0-9]+$).*)"`, để `/assets/*` thiếu trả 404.
2. `sw.js`: chỉ cache khi `res.ok && res.headers.get('content-type')` khớp loại mong đợi (không cache `text/html` cho request không phải navigate). Nâng `PHIEN_BAN`.
3. Thêm `window.addEventListener('vite:preloadError', () => location.reload())` (một lần, có chặn vòng lặp).

---

## P2 — nên sửa

| # | Vị trí | Vấn đề | Tình huống | Đề xuất |
|---|---|---|---|---|
| P2-1 | `ThanhLichSu.tsx:266,337-346` + `:23` | `ThanhBen` chỉ ẩn bằng CSS (`hidden lg:flex`), còn `moLichSu` mặc định `true`. Trên điện thoại, `DanhSachLichSu` vẫn mount và gọi `docLichSu` ở **mọi** lần mở app, cùng `useCoMoHinh`, `MeoSong` (4 bộ nghe window). Mở bảng lịch sử trên điện thoại thì đọc thêm một lần nữa. [ĐỌC MÃ] | Thêm 1 truy vấn Supabase mỗi lần tải trên điện thoại | Chỉ render `ThanhBen` khi `matchMedia('(min-width:1024px)')`, hoặc render `DanhSachLichSu` có điều kiện theo breakpoint |
| P2-2 | `PetMimi.tsx:130-134` | `viec_can_lam` gọi khi mount và mỗi 5 phút **kể cả khi pet đang ẩn** (mặc định ẩn với người mới). `viec` không bị xoá khi đổi phạm vi. [ĐỌC MÃ] | Tải thêm edge function cho mọi phiên; danh sách việc của phạm vi cũ còn tới lần nạp sau | Chỉ nạp khi `!cd.an`; xoá `viec` khi `phamVi` đổi |
| P2-3 | `HoiMimiTrongModule.tsx:29` | Câu hỏi trong module gửi với `nguon: 'pet'` nên hiện **hai** thông báo: toast và bong bóng/khay pet chưa đọc (`petHoi.ts:46`). [ĐỌC MÃ] | Trả lời một câu mà người dùng nhận hai thông báo | Thêm nguồn `'module'` và lọc nó khỏi `useLanHoiPet` |
| P2-4 | `VideoMeoMimi.tsx:36-51,70` | Video tự chạy, lặp, không có nút dừng và không tôn trọng `prefers-reduced-motion` (WCAG 2.2.2 mức A: nội dung chuyển động >5 giây phải dừng được). `preload="auto"` tải 2,57 MB trên điện thoại / 6,38 MB trên máy tính ở mọi lần vào trang chủ. [PROD: `mimi-meo-dong-xu.mp4` 2.569.410 B tải ở 390px; header `Cache-Control: public, max-age=0, must-revalidate`] | Người dùng mạng 4G hoặc tiết kiệm dữ liệu tốn 2,5 MB; người nhạy chuyển động không tắt được | Có reduced-motion thì chỉ hiện poster; thêm nút tạm dừng; điện thoại dùng `preload="metadata"`; `vercel.json` thêm `Cache-Control: public, max-age=31536000, immutable` cho `/video/*` và đổi tên tệp khi đổi video |
| P2-5 | `index.html:2`, `src/i18n/index.ts` | `<html lang="vi">` không đổi khi chuyển ngôn ngữ. [PROD: chọn `ko`, h1 là tiếng Hàn nhưng `lang="vi"`] | Trình đọc màn hình đọc tiếng Hàn/Anh bằng giọng Việt | `i18n.on('languageChanged', l => document.documentElement.lang = l)` |
| P2-6 | `DashboardLayout.tsx:118,285,325,401,411`; `naoMimi.ts:54-55,116,140,181-185` | Chuỗi tiếng Việt cứng trong khung dashboard ("Tìm hóa đơn theo tên hoặc số...", "Huỷ", "+ Tuỳ chỉnh công cụ", "Dùng MIMI như ứng dụng", "Hỗ trợ", "Đăng xuất", tiêu đề dự phòng "Dashboard", `CAU_NGUNG_CHO`, `TEN_QUY_TRINH`, lỗi "Câu hỏi trống.") [ĐỌC MÃ] | Giao diện EN/KO/ZH lẫn tiếng Việt | Đưa vào `kg.*` |
| P2-7 | `ThanhLichSu.tsx:80` | "Cuộc hỏi mới" focus ô hỏi bằng `setTimeout(50)`. Khi đang ở trang module, `TroLyPage` (lazy) có thể chưa mount nên mất focus. [ĐỌC MÃ] | Người dùng bàn phím phải bấm tìm ô hỏi | Focus bằng `useEffect` trong `TroLyPage` khi `location.state?.focus` |
| P2-8 | `src/lib/tien.ts:25-27` | `sangBigInt` không kiểm đầu vào: `NaN`/`undefined` → `RangeError`, chuỗi thập phân `"1500000.00"` → `SyntaxError`. `laTien` coi chuỗi thập phân là "không có số" nên hiện "—". Các nơi gọi hiện tại (`kiemSoatChi.ts:11`, `formatters.ts:12`) có chặn `laTien`; `TacTuPage.tsx:866,1196,1782-1789` tin kiểu. `Math.round(-2.5) = -2` làm tròn lệch về dương. [ĐỌC MÃ; chưa thấy nguồn nào gửi chuỗi thập phân — "chưa kiểm được" toàn bộ dữ liệu thật] | Một trường null từ máy chủ làm sập trang Kiểm soát agent | `sangBigInt` ném lỗi có tên rõ hoặc nhận `^-?\d+(\.0+)?$`; làm tròn đối xứng |
| P2-9 | `20260918150000_hoi_thoai_quyet_dinh.sql` (policy SELECT `user_id = auth.uid()`) | Thành viên đã bị gỡ khỏi công ty vẫn đọc được các câu trả lời có số liệu của công ty đó tới 180 ngày. [ĐỌC MÃ] | Kế toán nghỉ việc vẫn xem được doanh thu cũ | Thêm `AND public.la_thanh_vien(company_id)` vào policy SELECT |
| P2-10 | `tro-ly/index.ts:196-212` (`deXuatChinhThuc`) | `xac_nhan` nhận đề xuất từ hội thoại tới 180 ngày tuổi. Việc chạm tiền vẫn an toàn vì `tac-tu` `duyet` cập nhật có điều kiện `trang_thai = 'cho_duyet'` (`tac-tu/index.ts:271-286`). Hai lần `xac_nhan` cùng khoá tạo hai dòng nhật ký `cho_chay`. [ĐỌC MÃ] | Nhật ký quyết định có bản trùng; đề xuất cũ xác nhận được qua API | Giới hạn tuổi hội thoại (ví dụ 24 giờ) và chống trùng theo `(hoi_thoai_id, de_xuat_khoa)` đang `cho_chay` |
| P2-11 | `ThanhLichSu.tsx:62-68` | Mỗi câu hỏi mới (kể cả của pet/module) làm đọc lại toàn bộ 300 dòng lịch sử. `daThuDocLai` không bị xoá khi đổi phạm vi. [ĐỌC MÃ] | Thêm một truy vấn cho mỗi câu hỏi | Chèn dòng mới vào `dong` cục bộ từ `traLoi.hoi_thoai_id` thay vì đọc lại |

---

## Đã kiểm, không thấy lỗi

- **Route/deep link:** `/dashboard` → `TroLyPage`; `/dashboard/tro-ly` → `ChuyenVeKhongGian` giữ `search`, `hash`, `state` (`?hoi=…` vẫn chạy); `/dashboard/cashflow` vẫn có; `ProtectedRoute` chờ `loading`. [ĐỌC MÃ]
- **Luồng xác nhận thanh toán:** máy chủ tra đề xuất chính thức theo `hoi_thoai_id + company_id + user_id`; không tin tham số trình duyệt; `deXuatDuocPhep` theo vai trò; `ket_qua_quyet_dinh` đối chiếu trạng thái thật (`doiChieuQuyetDinh`); duyệt chi nguyên tử theo `trang_thai`. Lịch sử mở lại bỏ `ket_qua`/đề xuất (`docCuoc`), nên không bấm lại được đề xuất cũ từ giao diện. [ĐỌC MÃ]
- **Logic thuế:** ngưỡng 1 tỷ / trần 3 tỷ đồng nhất giữa `soSanhThue.ts:49-52`, `_shared/luat/he-luat.ts:222-224`, `_shared/ledger/internal-transfer.ts:242-251`; trừ ngưỡng trước khi nhân tỷ lệ; "đúng bằng ngưỡng" chưa phải nộp. Căn cứ pháp lý (Nghị định 141/2026) **chưa kiểm được**: văn bản ngoài phạm vi kiến thức của người kiểm.
- **i18n:** không có khoá gốc trùng giữa các module khi gộp nông (`{...vi, ...kgVi, ...}`). Mọi khoá `t('kg.*' | 'man.*' | 'sidebar.*')` trong khung dashboard, `kg.module.*.ten/hoi`, `kg.trang.*`, `kg.lichSu.nhom.*` đều có trong `vi`; `dongBoNgonNgu.test.ts` bảo đảm đủ 4 ngôn ngữ. Trên production, chuyển sang `ko` không có khoá thô ở trang chủ. [TÁI HIỆN + PROD]
- **Service worker và video:** bỏ qua `destination === 'video'`/`Range`, nên không cache 206. Không cache Supabase/`/functions/`. [ĐỌC MÃ]
- **CSP:** không có script nội tuyến (`boot.js` tách riêng; script rỗng còn lại là JSON-LD); `media-src 'self'` cho `/video/*`; trang chủ production ở 390px không có lỗi console. [PROD]
- **Bố cục 390px trang chủ:** `scrollWidth = 390`, không phần tử nào tràn ngang. [PROD]

## Chưa kiểm được

- Dashboard trên production (cần đăng nhập): tràn ngang 390px của thanh công cụ module, header, bảng lịch sử; lỗi console/CSP khi dùng thật (Bankhub iframe, ảnh Google, TTS).
- Trình đọc màn hình và thứ tự focus thật trong Popover/Tooltip của dải biểu tượng (mới đọc mã: nút có `aria-label`, `aria-expanded`, `aria-pressed`; nút xoá lịch sử hiện khi `focus-visible`).
- Hiệu năng đo thật (LCP khi có video 6,4 MB trên máy tính).
