# Go-live MIMI Wallet trên Google Play (CH Play)

> Soạn 30/09/2026. Tài liệu này **đề xuất**, chưa sửa gì trong `src/`, `supabase/`, `public/`, `vercel.json`.
> Mọi đoạn mã bên dưới là bản nháp để người giữ phần đó áp dụng (Claude giữ `src/**`, Codex giữ `supabase/**`).
> Kế thừa và **thay phần lỗi thời** của `docs/SAN_SANG_GOOGLE_PLAY.md` (24/09). Bảng kiểm cũ ghi
> "biểu tượng maskable: đã xong" — sai, xem mục 2.2.
>
> Nguyên tắc: không bịa con số hay yêu cầu. Chỗ nào chưa chắc thì ghi **CHƯA CHẮC** và nói cách kiểm.
> Vân tay SHA-256, tên gói, mật khẩu khoá: **chủ sở hữu điền**, tài liệu chỉ để chỗ trống có đánh dấu `<<…>>`.

---

## 0. Tóm tắt — những gì đang chặn go-live

| # | Việc chặn | Vì sao chặn | Ai làm |
|---|---|---|---|
| B1 | **Thu phí trong app bằng chuyển khoản VietQR** (gói tháng ở Cài đặt, mua lượt xuất tờ khai ở Tờ khai) | Chính sách Thanh toán của Play: phần mềm quản lý tài chính bán trong app phải dùng Google Play Billing; Việt Nam **không** có trong danh sách được dùng billing thay thế. Xem mục 3.1 | Quyết định: chủ sở hữu; code: `src/` |
| B2 | **Chưa có tài khoản Play Console tổ chức** (cần D-U-N-S) | App tài chính nên dùng tài khoản tổ chức; tài khoản cá nhân mới còn phải qua kiểm thử kín 12 người × 14 ngày | Chủ sở hữu |
| B3 | **Chưa có vỏ Android (TWA)** và khoá ký | Không có AAB thì không có gì để nộp | Dev + chủ sở hữu |
| B4 | **`/.well-known/assetlinks.json` chưa có, và hiện trả về `index.html` (200, text/html)** | Không xác minh được thì app mở ra có thanh địa chỉ trình duyệt — trông như web bọc, dễ bị từ chối vì chất lượng | Dev (sau khi có vân tay) |
| B5 | **Chính sách bảo mật lỗi thời so với mã** — nói dữ liệu chỉ rời hệ thống trong 4 trường hợp, nhưng nay chat và ảnh chứng từ được gửi tới nhà cung cấp mô hình AI qua OpenRouter; chưa nhắc thông báo đẩy, giọng nói; vẫn nhắc "xác minh danh tính" (eKYC đã gỡ) | Play đòi chính sách bảo mật khớp với Data safety và hành vi thật | **Agent đang làm trang chính sách cho hồ sơ Bộ Công Thương** — xem mục 2.6 |
| B6 | **Không có email hỗ trợ** (`CONTACT.email` rỗng) | Play bắt buộc email liên hệ trên trang cửa hàng; trang `/xoa-tai-khoan` hiện chỉ có địa chỉ trụ sở làm đường gửi yêu cầu xoá | Chủ sở hữu |
| B7 | **Xoá tài khoản chưa xoá tệp trong kho** (`chung-tu`, `tai-lieu`) | Play đòi xoá dữ liệu gắn với tài khoản; hiện chỉ dòng DB bị CASCADE, ảnh chứng từ và tài liệu còn nằm lại | `supabase/` (Codex) |
| B8 | **Không có nút báo nội dung AI có vấn đề trong app** | Chính sách Nội dung do AI tạo: chatbot là tính năng chính thì phải cho báo/gắn cờ mà không rời app | `src/` + bảng lưu |
| B9 | **Biểu tượng maskable là ảnh nền trong suốt, sát mép** | Launcher cắt mất tai và cằm mèo; cần tệp maskable riêng | Thiết kế |

Mọi việc khác (ảnh chụp màn hình, Data safety, xếp hạng nội dung…) là việc điền form, không chặn về kỹ thuật.

---

## 1. Chọn cách đóng gói: **TWA (Bubblewrap)**, không phải Capacitor

### 1.1 Đối chiếu từng tính năng

| Tính năng MIMI dùng | Nằm ở đâu trong mã | TWA (Chrome chạy trang thật) | Capacitor (WebView) |
|---|---|---|---|
| Chụp chứng từ bằng camera | `<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment">` — `src/components/chung-tu/NutQuetChungTu.tsx:124-126` | Chrome tự xử lý input file + capture, tự xin quyền camera của Chrome. Không cần quyền trong APK | Cần cấu hình file chooser và quyền CAMERA trong app |
| Tải tệp lên (sao kê xlsx/csv, ảnh, `.mimi`) | `NhapSaoKe.tsx:102`, `DocBaoCaoPage.tsx:179`, `ChongSuaChungTu.tsx:232`, `ChiPhiAiPage.tsx:811` | Chạy như Chrome | Chạy nếu cấu hình file chooser |
| Tải tệp xuống (blob + `download`) | `src/lib/csv.ts`, `ThuVienChungTuPage.tsx`, `TacTuPage.tsx`, `ChongSuaChungTu.tsx` | Chrome tải vào Downloads — **cần thử trên máy** | Cần plugin Filesystem |
| Mở tài liệu ở tab mới (`window.open` URL ký tạm) | `TaiLieuPage.tsx:43`, `ViecCanLamPage.tsx:169` | Mở Custom Tab / Chrome — chạy | Cần xử lý riêng |
| Nhập giọng nói (Web Speech API + `getUserMedia` để xin quyền mic) | `src/hooks/useNgheGiong.ts` | Chrome Android có `webkitSpeechRecognition`; **cần thử** trong TWA | Dữ liệu tương thích MDN ghi WebView "mirror" Chrome, nhưng chưa thử thật — CHƯA CHẮC |
| Thông báo đẩy Web Push (VAPID, service worker `push`) | `src/lib/thongBao.ts`, `public/sw.js` | Có. Bật **notification delegation** (`enableNotifications: true`) để thông báo mang tên/biểu tượng app và đi qua quyền `POST_NOTIFICATIONS` của Android 13+ | **Không**: MDN ghi `PushManager` trên WebView Android = không hỗ trợ → phải chuyển sang FCM + sửa hàm `thong-bao` |
| Đăng nhập Google (Supabase `signInWithOAuth`, `redirectTo: origin + /dashboard`) | `src/store/useAuthStore.ts:93-101` | Chạy: luồng đi qua Chrome thật; khi rời origin đã xác minh (supabase.co, accounts.google.com) TWA hiện thanh địa chỉ tạm, quay về `www.mimiwallet.online` thì ẩn | Google cấm gửi yêu cầu OAuth vào "embedded user-agent" → phải thay bằng Google Sign-In gốc + `signInWithIdToken` |
| Magic link / đặt lại mật khẩu qua email | `useAuthStore.ts:77-86`, `ForgotPassword.tsx:38-39` | Link đi qua `…supabase.co/auth/v1/verify` rồi mới về tên miền → thường mở trong Chrome, không nhảy vào app. TWA **dùng chung bộ nhớ với Chrome** (cùng origin) nên phiên vẫn thấy trong app nếu Chrome là trình duyệt chạy TWA — **cần thử**, nhất là máy Samsung dùng Samsung Internet | Phiên nằm trong WebView riêng, không thấy phiên của trình duyệt |
| Iframe BankHub | CSP `frame-src https://link.bankhub.dev …` | Như web | Như web |
| Sao chép (clipboard) | nhiều chỗ | Như web | Như web |

**Kết luận:** TWA giữ nguyên mọi tính năng web mà **không phải viết lại** đăng nhập Google, đẩy thông báo hay giọng nói. Capacitor buộc viết lại ít nhất hai thứ (OAuth, push). Chọn **Bubblewrap CLI** thay vì PWABuilder vì
Bubblewrap v1.25.0 có ghi chú "Bump targetSdkVersion to 36"; còn issue PWABuilder về targetSdk 36 (pwa-builder/PWABuilder#6160) chưa thấy lời giải khi tra. Dù dùng gì, **mở `app/build.gradle` kiểm `targetSdkVersion 36` trước khi tải lên**.

Cấu hình bắt buộc: `fallbackType: "customtabs"` — **không** dùng `"webview"`, vì fallback WebView làm hỏng đúng ba thứ ở trên (OAuth Google, push, có thể cả giọng nói).

### 1.2 Giới hạn TWA cần biết

- Máy không có trình duyệt hỗ trợ TWA thì mở Custom Tab (có thanh địa chỉ). Chấp nhận được.
- Quyền camera/mic là quyền **site** trong Chrome, không phải quyền app. Người dùng chặn thì phải mở lại trong cài đặt site — `useNgheGiong.ts` đã có hộp "bi_chan" chỉ cách mở.
- Thông báo trên Android 13+: có báo cáo `Notification.requestPermission()` không kích hoạt hộp quyền gốc trong một số cấu hình (android-browser-helper issue #563). **Phải thử trên máy Android 13+ thật.**

---

## 2. Kiểm repo: sẵn sàng cho Play/TWA

### 2.1 Bảng kiểm

| Hạng mục | Trạng thái | Ghi chú / bằng chứng |
|---|---|---|
| HTTPS, tên miền riêng | **Đã có** | `www.mimiwallet.online`; apex `mimiwallet.online` trả 308 về www (đã thử 30/09) |
| Manifest: `id`, `start_url`, `scope`, `display` | **Đã có** | `id: "/"`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`, `lang: "vi"` |
| Manifest phục vụ đúng kiểu | **Đã có** | `Content-Type: application/manifest+json` (đã thử) |
| Icon 192 & 512 `any` | **Đã có** | `public/mimi-cat-192.png`, `public/mimi-cat-512.png` |
| Icon **maskable** 512 | **Thiếu** | Đang dùng lại chính ảnh `any`: nền trong suốt (4 góc alpha = 0), hình sát mép (khung 21..490 px); ~50.900 điểm ảnh đục nằm ngoài vùng an toàn (hình tròn bán kính 40%). Cần tệp riêng — mục 2.2 |
| Icon đơn sắc cho thông báo | **Thiếu** | Bubblewrap `monochromeIconUrl`; `sw.js` đang dùng ảnh màu làm `badge` |
| `screenshots`, `categories` trong manifest | **Thiếu** | Không bắt buộc cho Play (ảnh cửa hàng tải riêng lên Console) nhưng nên có |
| `/.well-known/assetlinks.json` | **Thiếu** + **đang bị nuốt** | `curl` 30/09 → `200 text/html` (nội dung `index.html`). Mục 2.3 |
| Service worker, trang mất mạng | **Đã có** | `public/sw.js`: điều hướng ưu tiên mạng, rớt mạng trả vỏ `/` đã cache hoặc trang "Không có mạng"; cố ý không cache dữ liệu Supabase |
| CSP | **Đã có, tương thích** | TWA là Chrome nên CSP chạy y như web. OAuth là điều hướng cấp cao (không bị `form-action`/`connect-src` chặn); đẩy thông báo do trình duyệt gọi dịch vụ push, không qua `connect-src`. Không cần sửa |
| Chính sách bảo mật | **Có nhưng lỗi thời** | `/privacy` (`src/pages/Privacy.tsx`, cập nhật 19/08/2026). Mục 2.6 |
| Điều khoản | **Đã có** | `/terms` |
| Xoá tài khoản trong app | **Đã có** | Cài đặt → `DeleteAccountSection` → hàm `delete-account` (thu hồi uỷ quyền BankHub, xoá `invites`, `auth.admin.deleteUser` + CASCADE) |
| Xoá tệp trong kho khi xoá tài khoản | **Thiếu** | Hàm `delete-account` không đụng `storage`. Mục 2.5 |
| Trang xoá tài khoản trên web | **Có, thiếu kênh gửi yêu cầu** | `/xoa-tai-khoan` công khai; khi `CONTACT.email` rỗng thì chỉ in địa chỉ trụ sở |
| Email hỗ trợ | **Thiếu** | `src/config/company.ts:69` `email: ''` |
| URL chuyển hướng OAuth | **Đã có, cần chủ sở hữu kiểm** | TWA chạy trên đúng origin `https://www.mimiwallet.online`, nên **không cần thêm URL mới**. Kiểm Supabase → Authentication → URL Configuration có `https://www.mimiwallet.online/**` và Site URL là bản **www** |
| Báo cáo nội dung AI trong app | **Thiếu** | Chỉ có câu hỏi khảo sát một lần (`CauHoiNhanh`), không có nút báo từng câu trả lời |
| Chữ "khoản vay" còn sót | **Cần sửa** | Mô tả trang `/login` (`src/App.tsx:149`): "…xem dòng tiền, hoá đơn, **khoản vay**…" — mâu thuẫn với việc đã bỏ cho vay và với khai báo Financial features |
| Hộp "Dùng như ứng dụng" | **Cần sửa khi lên Play** | `HopTaiUngDung.tsx`: "MIMI chưa có trên App Store hay Google Play" — sau khi lên, đổi chữ và trỏ tới trang Play; trong TWA thì ẩn nút cài bản web |
| Tài khoản cho người duyệt Play | **Cần chủ sở hữu làm** | Đăng ký đang là thí điểm kín (trigger mời). Phải cấp tài khoản thử trong Play Console → App access. Không ghi mật khẩu vào repo |

### 2.2 Biểu tượng — đề xuất

Thêm tệp **mới** `public/mimi-cat-maskable-512.png` (512×512, nền đặc, ví dụ `#FFFFFF` hoặc `#F97316`; hình mèo thu nhỏ để nằm gọn trong hình tròn đường kính 80% = 410 px ở giữa) và `public/mimi-cat-mono-96.png` (trắng trên nền trong suốt, cho thông báo). Kiểm bằng maskable.app trước khi dùng.

Icon cửa hàng Play tải riêng: 512×512, PNG 32-bit có alpha, tối đa 1024 KB — `mimi-cat-512.png` (286 KB) đạt.

### 2.3 `assetlinks.json` và `vercel.json`

**Hiện trạng đã kiểm (30/09/2026):**

```
GET https://www.mimiwallet.online/.well-known/assetlinks.json → 200 text/html (index.html)
GET https://www.mimiwallet.online/robots.txt                 → 200 text/plain
```

Dòng hai cho thấy **tệp tĩnh có thật được ưu tiên hơn rewrite** `/(.*) → /index.html`. Nên khi thêm `public/.well-known/assetlinks.json`, Vercel sẽ phục vụ đúng tệp. (Vite 5.4.21 chép cả thư mục bắt đầu bằng dấu chấm: `copyDir` dùng `readdirSync`, không lọc dotfile.)

Tài liệu Vercel ghi `/.well-known` "reserved and cannot be redirected or rewritten", nhưng phép thử ở trên cho thấy nó **đang bị rewrite**. Tin phép thử, không tin câu đó.

Vấn đề còn lại: nếu tệp bị xoá hay gõ sai tên, trình xác minh Android nhận HTML với mã 200 thay vì 404 — lỗi im lặng. Sửa để đường `.well-known` không bao giờ rơi về SPA, và ép đúng Content-Type:

```diff
--- a/vercel.json
+++ b/vercel.json
@@
   "rewrites": [
     {
-      "source": "/(.*)",
+      "source": "/:path((?!\\.well-known/).*)",
       "destination": "/index.html"
     }
   ],
   "headers": [
+    {
+      "source": "/.well-known/assetlinks.json",
+      "headers": [
+        { "key": "Content-Type", "value": "application/json" },
+        { "key": "Access-Control-Allow-Origin", "value": "*" }
+      ]
+    },
     {
       "source": "/(.*)",
```

(Cú pháp lookahead `/:path((?!…).*)` theo ví dụ trong tài liệu rewrite của Vercel.)

**Tệp mới `public/.well-known/assetlinks.json`** — chỉ tạo khi đã có vân tay thật:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "<<PACKAGE_ID — ví dụ online.mimiwallet.app, CHỦ SỞ HỮU CHỐT, KHÔNG ĐỔI ĐƯỢC SAU KHI PHÁT HÀNH>>",
    "sha256_cert_fingerprints": [
      "<<SHA256 KHOÁ KÝ ỨNG DỤNG CỦA PLAY APP SIGNING — LẤY TRONG PLAY CONSOLE>>",
      "<<SHA256 KHOÁ UPLOAD — để thử APK cài tay qua adb>>"
    ]
  }
}]
```

- Vân tay **khoá ký ứng dụng** lấy ở Play Console: *Protected with Play → Play Store distribution → Go to Play app signing → App signing key* (tên menu theo trang trợ giúp Play App Signing; giao diện có thể đổi). Bản tải từ Play được ký bằng khoá này.
- Vân tay **khoá upload** lấy từ keystore của mình (`keytool -list -v -keystore android.keystore`) hoặc `bubblewrap fingerprint list`.
- Nên ghi cả hai: tài liệu Chrome khuyên có cả hai để gỡ lỗi bản cài tay.
- Chỉ khai host `www.mimiwallet.online`. Apex chuyển 308, mà tệp assetlinks không nên đi qua chuyển hướng.

Kiểm sau khi deploy:

```bash
curl -sI https://www.mimiwallet.online/.well-known/assetlinks.json   # phải là 200 + application/json
curl -s  "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://www.mimiwallet.online&relation=delegate_permission/common.handle_all_urls"
```

### 2.4 Manifest — đề xuất

```diff
--- a/public/manifest.webmanifest
+++ b/public/manifest.webmanifest
@@
   "display": "standalone",
   "background_color": "#ffffff",
   "theme_color": "#F97316",
+  "categories": ["finance", "business", "productivity"],
+  "prefer_related_applications": false,
   "icons": [
@@
     {
-      "src": "/mimi-cat-512.png",
+      "src": "/mimi-cat-maskable-512.png",
       "sizes": "512x512",
       "type": "image/png",
       "purpose": "maskable"
     }
   ],
+  "screenshots": [
+    { "src": "/screenshots/tro-ly-1080x1920.png", "sizes": "1080x1920", "type": "image/png", "form_factor": "narrow", "label": "Hỏi MIMI về tiền, hoá đơn, thuế" },
+    { "src": "/screenshots/chung-tu-1080x1920.png", "sizes": "1080x1920", "type": "image/png", "form_factor": "narrow", "label": "Chụp chứng từ, gắn vào khoản chi" }
+  ],
   "id": "/"
 }
```

`start_url` giữ `/` (lý do đã ghi trong `SAN_SANG_GOOGLE_PLAY.md`: người duyệt mở lần đầu phải thấy app làm gì). Trong twa-manifest đặt `startUrl: "/?nguon=twa"` để web biết đang chạy trong app (mục 3.1). Nên thêm (không bắt buộc): ở `Landing`, người đã đăng nhập mở từ app thì chuyển thẳng `/dashboard`.

Sau khi phát hành, có thể thêm `related_applications` trỏ tới gói Play.

### 2.5 Xoá tài khoản phải xoá cả tệp — đề xuất cho `supabase/functions/delete-account/index.ts` (Codex)

Ảnh chứng từ nằm ở kho `chung-tu`, đường dẫn `{company_id}/{chung_tu_id}.{ext}`; tài liệu ở `tai-lieu`, thư mục đầu là `company_id`. Cả hai do service role ghi, nên xoá người dùng **không** kéo theo tệp. Thêm trước Bước 3:

```ts
// ---- Bước 2b: xoá tệp trong kho của mọi công ty người dùng sở hữu ----------
for (const bucket of ["chung-tu", "tai-lieu", "secure-documents"]) {
  for (const cid of companyIds) {
    // list() không đệ quy: lặp theo trang; tai-lieu có thể có thư mục con → cần duyệt sâu.
    let offset = 0;
    for (;;) {
      const { data: tep, error } = await supabase.storage.from(bucket).list(cid, { limit: 1000, offset });
      if (error || !tep?.length) break;
      await supabase.storage.from(bucket).remove(tep.map((t) => `${cid}/${t.name}`));
      if (tep.length < 1000) break;
      offset += 1000;
    }
  }
}
```

Cần viết test và kiểm cấu trúc thư mục thật của `tai-lieu` (có thư mục con hay không) trước khi áp. Nếu có dữ liệu phải giữ vì nghĩa vụ kế toán/thuế, Play cho giữ "vì lý do chính đáng như… tuân thủ quy định" **với điều kiện nói rõ cho người dùng** — thì phải ghi điều đó trên `/xoa-tai-khoan` và trong chính sách bảo mật.

Trang `/xoa-tai-khoan`: Play đòi trang cho phép **gửi** yêu cầu xoá mà không cần cài lại app. Có `CONTACT.email` là đạt; chỉ địa chỉ bưu điện thì yếu.

### 2.6 Chính sách bảo mật — **không đề xuất trang mới**

Một agent khác đang làm các trang chính sách công khai (bảo mật, điều khoản, hoàn tiền…) cho hồ sơ Bộ Công Thương. **Dùng chung các trang đó cho Play**, đừng dựng trang trùng. Chỉ chuyển cho agent đó danh sách những gì Play cần thấy trong chính sách bảo mật, rút từ mã (30/09):

1. Nội dung chat và **ảnh chứng từ** được gửi tới nhà cung cấp mô hình AI qua OpenRouter (`supabase/functions/_shared/ai/nha-cung-cap.ts`, `_shared/tro-ly/mo-hinh.ts:300` gửi `image_url`). Bản hiện tại nói dữ liệu chỉ rời hệ thống trong 4 trường hợp — không còn đúng.
2. Ảnh chứng từ được **lưu** (kho `chung-tu`) khi người dùng chọn lưu; tài liệu MIMI soạn lưu ở kho `tai-lieu`.
3. **Giọng nói**: nhận dạng bằng dịch vụ có sẵn của trình duyệt (Chrome gửi âm thanh tới dịch vụ nhận giọng của trình duyệt); MIMI chỉ nhận chữ.
4. **Thông báo đẩy**: lưu đăng ký push (endpoint) và 120 ký tự user agent (`src/lib/thongBao.ts:101`).
5. Tra mã số thuế qua `api.xinvoice.vn` (chỉ gửi MST).
6. Đóng dấu thời gian (`dau-thoi-gian`, OpenTimestamps) — chỉ gửi mã băm.
7. Nhà cung cấp dữ liệu ngân hàng: BankHub/Cas/SePay (đang nói chung là "nhà cung cấp dịch vụ tổng hợp dữ liệu ngân hàng" — đủ nếu không muốn nêu tên).
8. Bỏ mục "Dữ liệu xác minh danh tính" nếu eKYC không còn chạy (`PaymentMethods.tsx` ghi eKYC đã gỡ 17/08).
9. Mục 6 nói ngắt ngân hàng "trong mục Fintech Hub" — nay là `/dashboard/ket-noi`.
10. Hạ tầng: Supabase (Singapore), Vercel.

---

## 3. Chính sách Google Play cho app tài chính/kế toán ở Việt Nam

### 3.1 Thanh toán — **chặn lớn nhất**

Hiện MIMI bán trong app: gói tháng (`SettingsPage` → `SubscriptionPayment`) và lượt xuất tờ khai (`ToKhaiPage.tsx:665`), trả bằng chuyển khoản VietQR (`supabase/functions/subscription-billing`).

Chính sách Play (trang "Understanding Google Play's Payments policy"):

- Play Billing bắt buộc cho "Cloud software and services (such as … business productivity software, or financial management software)" → **gói tháng của MIMI thuộc nhóm này.**
- Nhưng: "Purchases for goods or services like insurance, stock trades, investment consulting, or tax preparation and filing should not use Google Play's billing system." → **lượt xuất tờ khai có thể thuộc "tax preparation and filing"**. CHƯA CHẮC Google xếp nó như vậy: nên hỏi Play Developer Support trước.
- App không được dẫn người dùng tới cách trả khác "via in-app promotions, webviews, buttons, links, messaging, or user interface flows".
- Billing thay thế / user choice billing chỉ mở cho một số nước (Úc, Brazil, Indonesia, Nhật, Nam Phi, Anh, EEA; thêm Hàn, Ấn, Mỹ theo chương trình riêng). **Việt Nam không có.**
- App được phép **chỉ dùng** (consumption-only): người dùng đăng nhập và dùng thứ đã trả ở nơi khác. Khi đó được nói kiểu "Vào website để nâng cấp" nhưng **không có link trực tiếp**.

**Đề xuất cho bản Play đầu tiên: consumption-only.** Nhanh nhất, rủi ro thấp nhất:

1. Khi chạy trong TWA (nhận biết bằng `startUrl: "/?nguon=twa"` lưu vào `sessionStorage`, hoặc `document.referrer` bắt đầu bằng `android-app://<<PACKAGE_ID>>`), **ẩn** `SubscriptionPayment` ở Cài đặt và Tờ khai.
2. Thay bằng câu không có link: "Nâng cấp gói tại mimiwallet.online trên trình duyệt."
3. Quyền đã mua trên web vẫn dùng được trong app.

Phác thảo (`src/lib/chayTrongApp.ts`, tệp mới — chưa tạo):

```ts
const KHOA = 'mimi:trong-app-play';
export function ghiNhanNguonApp(): void {
  try {
    const q = new URLSearchParams(location.search);
    if (q.get('nguon') === 'twa' || document.referrer.startsWith('android-app://')) sessionStorage.setItem(KHOA, '1');
  } catch { /* chế độ riêng tư */ }
}
export const dangChayTrongAppPlay = (): boolean => { try { return sessionStorage.getItem(KHOA) === '1'; } catch { return false; } };
```

Gọi `ghiNhanNguonApp()` trong `src/main.tsx` trước khi render; bọc hai chỗ dùng `SubscriptionPayment` bằng `dangChayTrongAppPlay()`.

**Hướng sau (nếu muốn bán trong app):** Play Billing cho TWA qua Digital Goods API + Payment Request API (Chrome 101+, Bubblewrap `playBilling.enabled` + `alphaDependencies.enabled`), cần tài khoản thanh toán Play, và **máy chủ phải xác nhận (acknowledge) giao dịch** — không xác nhận thì sau 3 ngày Google hoàn tiền và thu hồi. Phí dịch vụ: xem biểu phí chính thức của Google, tài liệu này không ghi con số.

### 3.2 Khai báo Financial features (bắt buộc với **mọi** app, kể cả kiểm thử kín)

Các nhóm trong form: Banking and loans · Payments and transfers (ví điện tử, chuyển tiền) · Purchase agreements · Trading and funds · Support services (credit monitoring, financial advice, insurance) · hoặc "My app doesn't provide any financial features".

Đối chiếu MIMI (không giữ tiền, không cho vay, không chuyển tiền; dựng mã VietQR để người dùng tự trả bằng app ngân hàng; đọc sao kê; nhắc thuế; trợ lý AI trả lời về tài chính/thuế):

- Không phải Banking/loans, không Trading, không Purchase agreements.
- "Payments and transfers": MIMI không xử lý thanh toán — nhiều khả năng **không**.
- "Financial advice": trợ lý AI trả lời câu hỏi thuế/tài chính — **CHƯA CHẮC**. Chủ sở hữu quyết; nếu phân vân, khai sát thực tế hơn là khai "không có gì", vì khai sai có thể bị gỡ.
- Chính sách Financial Services có yêu cầu riêng theo nước (Mỹ, Ấn, Indonesia, Philippines, Nigeria, Kenya, Pakistan, Thái Lan) — **Việt Nam không có trong danh sách** khi tra 30/09/2026. Các yêu cầu đó chủ yếu dành cho vay cá nhân, MIMI đã bỏ.

Trước khi khai: dọn chữ "khoản vay" ở `/login` (mục 2.1) để nội dung app khớp lời khai.

### 3.3 Data safety — suy từ mã

"Collected" = dữ liệu truyền ra khỏi máy. Chuyển cho **nhà cung cấp dịch vụ** xử lý thay mình theo chỉ dẫn thì **không** tính là "shared". Chủ sở hữu cần xác nhận hợp đồng với OpenRouter/nhà cung cấp mô hình đúng là quan hệ xử lý thay (không dùng dữ liệu cho mục đích riêng) thì mới khai "không chia sẻ".

| Nhóm Play | Loại | Có? | Nguồn trong mã | Bắt buộc/Tuỳ chọn | Mục đích |
|---|---|---|---|---|---|
| Personal info | Email address | Có | Đăng ký, OTP, Google | Bắt buộc | Account management, App functionality |
| Personal info | Name | Có | Metadata từ đăng nhập Google; tên người trong danh bạ đối tác | Tuỳ chọn | Account management, App functionality |
| Personal info | User IDs | Có | ID người dùng Supabase | Bắt buộc | Account management |
| Personal info | Address, Phone number, Other info (MST) | Có | Hồ sơ công ty, danh bạ khách hàng/đối tác | Tuỳ chọn | App functionality |
| Financial info | Other financial info | Có | Giao dịch ngân hàng, số dư, hoá đơn, tờ khai, số tài khoản người nhận trong lệnh VietQR | Tuỳ chọn (không nối ngân hàng vẫn dùng được một phần) | App functionality |
| Financial info | Purchase history | Có | Hoá đơn thuê bao MIMI (`subscription-billing`) | Tuỳ chọn | App functionality, Account management |
| Financial info | User payment info | **Không** | MIMI không nhận thẻ hay thông tin đăng nhập ngân hàng | — | — |
| Photos and videos | Photos | Có | Ảnh chứng từ: gửi AI để đọc; lưu kho `chung-tu` nếu người dùng chọn | Tuỳ chọn | App functionality |
| Audio files | Voice or sound recordings | **CHƯA CHẮC — nghiêng về Không** | Âm thanh đi tới dịch vụ nhận giọng của trình duyệt, MIMI chỉ nhận chữ; Google không có hướng dẫn riêng cho Web Speech API trong TWA | — | — |
| Files and docs | Files and docs | Có | Tệp sao kê tải lên; tài liệu lưu ở kho `tai-lieu`. (Đọc báo cáo tài chính ở `/dashboard/doc-bao-cao` xử lý trên máy — không tính) | Tuỳ chọn | App functionality |
| Messages | Other in-app messages | Có | Nội dung chat với trợ lý (kể cả câu nói đã đổi thành chữ) | Tuỳ chọn | App functionality |
| App activity | App interactions / Other user-generated content | Có | Phản hồi (`phan_hoi_khach`), chính sách chi, ghi chú | Tuỳ chọn | App functionality, Analytics (nếu dùng phản hồi để cải tiến) |
| Device or other IDs | Device or other IDs | Có (khai cho chắc) | Đăng ký push (endpoint) + user agent | Tuỳ chọn | App functionality |
| App info and performance | Crash logs / Diagnostics | Không thấy | Không có Sentry/analytics SDK trong `src/` hay `package.json`; **kiểm log Vercel/Supabase** có coi là thu thập hay không | — | — |
| Location, Contacts (danh bạ máy), Calendar, Health, Web browsing | — | Không | — | — | — |

Thực hành bảo mật: mã hoá khi truyền — **Có** (HTTPS/HSTS). Người dùng yêu cầu xoá được — **Có** (sau khi làm B7).

### 3.4 API mục tiêu

Từ 31/08/2026, app mới và bản cập nhật phải **target Android 16 (API 36)**; có thể xin gia hạn tới 01/11/2026. Bubblewrap v1.25.0 đã nâng targetSdk lên 36 — vẫn kiểm `app/build.gradle` sau khi `init`.

### 3.5 Xếp hạng nội dung, đối tượng, khai báo khác

- **Content rating**: điền bảng hỏi IARC trong Play Console. Khai sai có thể bị gỡ. MIMI không có bạo lực, cờ bạc hay nội dung người lớn; có AI tạo chữ; không có tương tác giữa người dùng với nhau (chỉ người với trợ lý). Kết quả do IARC cấp, không đoán trước ở đây.
- **Target audience**: 18+ (doanh nghiệp). Không nhắm trẻ em.
- **Ads**: Không có quảng cáo.
- **App access**: cấp tài khoản thử cho người duyệt (vì đăng ký là thí điểm kín). Lưu ý rủi ro đã ghi ở tài liệu cũ: nút demo dùng chung một tài khoản Supabase.
- **AI-Generated Content**: MIMI là chatbot tạo chữ, tương tác là tính năng chính → **phải có báo/gắn cờ nội dung xúc phạm ngay trong app** (B8). Đề xuất: nút "Báo câu trả lời này" dưới mỗi câu trả lời của trợ lý trong `TroLyPage`, ghi vào `phan_hoi_khach` (đã có `guiPhanHoi` ở `src/lib/phanHoi.ts`) kèm id tin nhắn; cần thêm cột/loại ở bảng — việc của `supabase/`.
- **News app**: có mục tin (`/tai-nguyen`, `macro-news`) nhưng không phải chức năng chính → khai "không phải app tin tức".
- **Quyền ảnh/video**: TWA không xin `READ_MEDIA_IMAGES`; chọn ảnh qua bộ chọn hệ thống → không vướng chính sách Photo and Video Permissions.

### 3.6 Riêng Việt Nam

- Tra 30/09/2026: **không thấy** yêu cầu riêng cho Việt Nam trong chính sách Financial Services hay khai báo Financial features của Play; Việt Nam không có trong danh sách billing thay thế.
- Luật Việt Nam vẫn áp dụng độc lập với Play (bảo vệ dữ liệu cá nhân, thương mại điện tử — hồ sơ Bộ Công Thương đang do agent khác làm). Tài liệu này không kết luận pháp lý; cần người có chuyên môn xác nhận.

---

## 4. Lệnh Bubblewrap

Cần: Node, JDK 17, Android SDK (Bubblewrap tự đề nghị tải ở lần chạy đầu). Làm ở thư mục **ngoài** repo web, ví dụ `C:\mimi-android\`.

```bash
npm i -g @bubblewrap/cli
bubblewrap doctor

mkdir mimi-android && cd mimi-android
bubblewrap init --manifest="https://www.mimiwallet.online/manifest.webmanifest"
#   Trả lời hỏi đáp:
#   - Domain: www.mimiwallet.online      - URL path (startUrl): /?nguon=twa
#   - Application ID (packageId): <<PACKAGE_ID>>   ← không đổi được sau khi phát hành
#   - Tên app: MIMI Wallet ; launcher: MIMI
#   - Display: standalone ; màu theme #F97316 ; nền #FFFFFF
#   - Icon: /mimi-cat-512.png ; maskable: /mimi-cat-maskable-512.png ; monochrome: /mimi-cat-mono-96.png
#   - Keystore: tạo mới → đây là KHOÁ UPLOAD (mục 5, bước 3)

# Sửa twa-manifest.json:
#   "enableNotifications": true,
#   "fallbackType": "customtabs",
#   "appVersionCode": 1, "appVersionName": "1.0.0"
#   (không bật playBilling ở bản đầu — mục 3.1)
bubblewrap update --skipVersionUpgrade

bubblewrap build          # ra app-release-bundle.aab (nộp Play) + app-release-signed.apk (thử máy)
bubblewrap install        # cài APK vào máy qua adb để thử

# Sau khi Play Console tạo khoá ký ứng dụng:
bubblewrap fingerprint add "<<SHA256 KHOÁ KÝ ỨNG DỤNG>>" --name=play-app-signing
bubblewrap fingerprint add "<<SHA256 KHOÁ UPLOAD>>" --name=upload
bubblewrap fingerprint generateAssetLinks --output=assetlinks.json
#   → chép nội dung vào public/.well-known/assetlinks.json của repo web, deploy, curl kiểm (mục 2.3)

# Mỗi bản cập nhật:
bubblewrap update --appVersionName="1.0.1"
bubblewrap build
```

Kiểm trên máy thật (Android 13+ và một máy Samsung) trước khi lên kênh kín: mở app không có thanh địa chỉ; đăng nhập Google; magic link; chụp chứng từ; mic; bật thông báo và nhận một thông báo thử; tải CSV xuống; mất mạng thì hiện trang "Không có mạng"; xoá tài khoản.

---

## 5. Các bước của chủ sở hữu

1. **Email hỗ trợ** `hotro@mimiwallet.online` (hoặc tương tự) → điền `CONTACT.email`. Rẻ nhất, gỡ B6 và nâng trang xoá tài khoản.
2. **D-U-N-S** cho CTCP CLI Nutrix (MST 0319436143), rồi tạo **tài khoản Play Console loại tổ chức**. Google: app cung cấp sản phẩm tài chính nên chọn tài khoản tổ chức; tài khoản tổ chức bắt buộc D-U-N-S. Tên, địa chỉ khai với Google phải khớp giấy đăng ký (`src/config/company.ts`).
   - Nếu buộc dùng **tài khoản cá nhân tạo sau 13/11/2023**: phải kiểm thử kín với **ít nhất 12 người thử đã opt-in liên tục ít nhất 14 ngày** rồi mới xin quyền production. Trang trợ giúp chỉ nói luật này cho tài khoản cá nhân.
3. **Khoá**: keystore Bubblewrap tạo là **khoá upload** — cất ở hai nơi (ví dụ trình quản lý mật khẩu + ổ ngoài mã hoá), không để trong repo. App mới được Play App Signing ghi danh tự động khi tải AAB lên: Google giữ **khoá ký ứng dụng**. Mất khoá upload thì xin đặt lại được; đừng tự tạo khoá ký ứng dụng riêng nếu không hiểu rõ.
4. **Tạo app** trong Console: tên "MIMI Wallet", tiếng Việt mặc định, app (không phải game), miễn phí.
5. **App content**: Privacy policy URL (trang do agent Bộ Công Thương hoàn thiện), App access (tài khoản thử), Ads = không, Content rating (IARC), Target audience 18+, News = không, **Data safety** (mục 3.3), **Financial features** (mục 3.2), Government app = không, đường xoá tài khoản `https://www.mimiwallet.online/xoa-tai-khoan`.
6. **Store listing**: mô tả ngắn/dài (không hứa cho vay, không chứng nhận chưa có), icon 512×512 PNG ≤1024 KB, **feature graphic 1024×500** JPEG/PNG 24-bit không alpha, **ít nhất 2 ảnh chụp** điện thoại (tối đa 8/loại thiết bị; 9:16 tối thiểu 1080×1920 để đủ điều kiện ảnh chất lượng cao), danh mục Finance hoặc Business, email hỗ trợ.
7. **Internal testing**: tải `app-release-bundle.aab` → lấy vân tay khoá ký ứng dụng → deploy `assetlinks.json` → cài từ Play (không phải adb) để kiểm app mở **không** có thanh địa chỉ.
8. **Closed testing**: mời nhóm khách thí điểm; sửa lỗi. (Tài khoản cá nhân: đủ 12 người × 14 ngày.)
9. **Production**: nộp duyệt; theo dõi thư từ chối trong Console. Xin quyền production/duyệt có thể mất vài ngày — không hứa ngày ra mắt trước khi qua bước 7.
10. **Sau khi lên**: sửa `HopTaiUngDung.tsx` trỏ tới trang Play; thêm `related_applications`; mỗi năm kiểm lại mốc target API.

---

## 6. Nguồn (tra 29–30/09/2026)

- Payments policy — https://support.google.com/googleplay/android-developer/answer/9858738
- Understanding Google Play's Payments policy (consumption-only, tax preparation, financial management software) — https://support.google.com/googleplay/android-developer/answer/10281818
- User choice billing — nước đủ điều kiện — https://support.google.com/googleplay/android-developer/answer/13821247
- Financial features declaration — https://support.google.com/googleplay/android-developer/answer/13849271
- Financial Services policy — https://support.google.com/googleplay/android-developer/answer/9876821
- Data safety — https://support.google.com/googleplay/android-developer/answer/10787469
- Account deletion requirements — https://support.google.com/googleplay/android-developer/answer/13327111
- AI-Generated Content policy — https://support.google.com/googleplay/android-developer/answer/13985936
- Content ratings — https://support.google.com/googleplay/android-developer/answer/9859655
- Preview assets (icon, feature graphic, ảnh chụp) — https://support.google.com/googleplay/android-developer/answer/9866151
- Kiểm thử cho tài khoản cá nhân mới (12 người, 14 ngày) — https://support.google.com/googleplay/android-developer/answer/14151465
- Chọn loại tài khoản, D-U-N-S — https://support.google.com/googleplay/android-developer/answer/13634885
- Play App Signing — https://support.google.com/googleplay/android-developer/answer/9842756
- Target API level — https://developer.android.com/google/play/requirements/target-sdk
- TWA quick start — https://developer.chrome.com/docs/android/trusted-web-activity/quick-start
- TWA: khoá ký và assetlinks — https://developer.chrome.com/docs/android/trusted-web-activity/android-for-web-devs
- TWA + Play Billing — https://developer.chrome.com/docs/android/trusted-web-activity/receive-payments-play-billing
- Notification delegation demo — https://github.com/GoogleChrome/android-browser-helper/tree/main/demos/twa-notification-delegation ; issue #563 — https://github.com/GoogleChrome/android-browser-helper/issues/563
- Bubblewrap CLI — https://github.com/GoogleChromeLabs/bubblewrap/blob/main/packages/cli/README.md ; releases — https://github.com/GoogleChromeLabs/bubblewrap/releases
- PWABuilder targetSdk 36 — https://github.com/pwa-builder/pwabuilder/issues/6160
- Google OAuth — cấm embedded user-agent — https://developers.google.com/identity/protocols/oauth2/policies
- Vercel rewrites — https://vercel.com/docs/routing/rewrites
- MDN browser-compat-data (`PushManager` WebView Android = không) — https://github.com/mdn/browser-compat-data/blob/main/api/PushManager.json
