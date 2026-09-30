# Bài toán công nghệ lõi — để một hãng kiểm toán Big 4 cần tới MIMI

> 29/09/2026. Người viết đóng vai kiến trúc sư fintech/regtech có kinh nghiệm kiểm toán và tư vấn
> thuế Big 4. Đây là **tài liệu đặt bài toán**, chưa phải kế hoạch đã duyệt, chưa viết dòng mã nào.
> Mọi khẳng định về chuẩn mực và pháp luật đều có đường dẫn ở cuối mỗi mục. Nguồn thứ cấp (báo, trang
> phần mềm, công ty luật) được ghi rõ là thứ cấp: **trước khi đưa vào sản phẩm phải đối chiếu văn bản
> gốc trong kho Công báo của MIMI** (`supabase/functions/_shared/luat/`).

## 0. Nói thật trước

**Mục tiêu của chủ dự án:** *"học kiến thức phát triển những kĩ thuật công nghệ lõi giúp tối ưu tác
vụ, nâng tính chuyên môn đến mức Big 4 cũng cần mình"*.

**Hiện trạng (đo ngày 29/09/2026, `docs/SO_DIEM_AUDIT.md`):** 17 người dùng, 16 công ty, **0/16 kích
hoạt**, 3 giao dịch thật, 0 khách trả phí. 4/7 liên kết đọc sao kê là `mock`. Hoá đơn điện tử đã gỡ
khỏi production vì Casso chưa bật. Trục `auditability_evidence_graph` được đề nghị 6,2/10.

**Ba điều cần nhìn thẳng:**

1. **Khách hàng của MIMI không phải đối tượng kiểm toán bắt buộc.** Luật Kiểm toán độc lập (Điều 37)
   và NĐ 17/2012 (Điều 15) bắt buộc kiểm toán với doanh nghiệp có vốn đầu tư nước ngoài, tổ chức tín
   dụng, tổ chức tài chính, bảo hiểm…; Luật 56/2024 bổ sung doanh nghiệp quy mô lớn. Hộ kinh doanh và
   phần lớn doanh nghiệp nhỏ trong nước không nằm trong nhóm đó. Vậy nên Big 4 sẽ **không** cần MIMI
   theo kiểu "khách kiểm toán của họ dùng MIMI" trong ngắn hạn.
2. **Big 4 đã có nền tảng dữ liệu riêng** (EY Helix, KPMG Clara, Deloitte Omnia, PwC Aura/Halo). MIMI
   không cạnh tranh ở lớp phân tích của kiểm toán viên. Chỗ MIMI có thể đứng là **lớp dữ liệu nguồn có
   bằng chứng**: dữ liệu đi ra từ MIMI thì kiểm toán viên, cán bộ thuế hay chuyên viên thẩm định nhận
   luôn, không phải làm lại.
3. **"Big 4 cần mình" là một giả thuyết, chưa phải sự thật.** Tài liệu này biến nó thành một chuẩn
   đo được: *một kiểm toán viên độc lập tự thực hiện lại (re-perform) được con số MIMI đưa ra, từ dòng
   sao kê tới dòng tờ khai, mà không phải hỏi đội MIMI*. Đạt được chuẩn đó thì kế toán dịch vụ và hộ
   kinh doanh (khách chính hiện nay) được lợi trước, còn Big 4 là người kiểm chuẩn cuối cùng.

**Những cửa có thật để Big 4 (hoặc hãng tầm trung) chạm tới MIMI** — mỗi cửa là giả thuyết, cần kiểm:

| Cửa | Ai trong hãng | Họ cần gì từ dữ liệu SME | Bài toán liên quan |
|---|---|---|---|
| Thẩm định tài chính (financial due diligence) cho thương vụ mua chuỗi / nhượng quyền | Deal Advisory | Đối chiếu tiền về ngân hàng với doanh thu khai báo (thực hành gọi là "proof of cash") | B1, B2 |
| Tư vấn thuế hộ kinh doanh và SME sau cải cách 2026 | Tax | Tính lại nghĩa vụ theo đúng văn bản có hiệu lực ở từng thời điểm | B4 |
| Doanh nghiệp FDI hoặc quy mô lớn có nhà cung cấp / đại lý là SME | Audit, Risk | Hồ sơ bằng chứng của bên thứ ba, kiểm tra ngoại lệ | B1, B3, B5 |
| MIMI trở thành "tổ chức cung cấp dịch vụ" của một đơn vị được kiểm toán | Audit (ISA 402) | Báo cáo ISAE 3402 / SOC | B7 |
| Chính MIMI đi xin báo cáo SOC 2 / ISAE 3402 | Risk Assurance | Hợp đồng dịch vụ đảm bảo (MIMI là người trả tiền) | B7 |

Nguồn: [Kreston — đối tượng bắt buộc kiểm toán](https://kreston.vn/cac-doi-tuong-bat-buoc-phai-kiem-toan-theo-phap-luat-viet-nam/) (thứ cấp),
[Bộ Tài chính — hỏi đáp chính sách](https://portal.mof.gov.vn/hoidapcstc/home/cthoidap/157710),
[Luật 56/2024/QH15 — Cổng văn bản Chính phủ](https://vanban.chinhphu.vn/?classid=1&docid=212484&orggroupid=1&pageid=27160),
[TLA Law — bổ sung doanh nghiệp quy mô lớn](https://tlalaw.vn/bo-sung-doi-tuong-kiem-toan-bat-buoc-doanh-nghiep-co-quy-mo-lon.tla) (thứ cấp),
[EY Helix](https://www.ey.com/en_gl/services/audit/technology/helix),
[AAA — Data-Driven Audits: nền tảng phân tích kiểm toán](https://publications.aaahq.org/cia/article/19/1/A1/13004/Data-Driven-Audits-Audit-Analytic-Platforms-and).

---

## 1. Big 4 thực sự cần gì — nghiên cứu

### 1.1 Chuẩn mực kiểm toán (ISA và VSA)

| Chuẩn | Yêu cầu cốt lõi | Hàm ý cho dữ liệu và công nghệ của MIMI |
|---|---|---|
| **ISA 315 (Revised 2019)** / VSA 315 — nhận diện và đánh giá rủi ro | Hiểu hệ thống thông tin và các kiểm soát IT chung (GITC: phát triển chương trình, thay đổi chương trình, vận hành, truy cập). Cho phép dùng công cụ tự động trên toàn bộ dữ liệu (sổ cái, sổ chi tiết, dữ liệu vận hành) để phân tích, tính lại, thực hiện lại và đối chiếu | Kiểm toán viên sẽ hỏi: **dữ liệu sinh ra thế nào, ai sửa được, thay đổi mã được kiểm soát ra sao**. MIMI đã có RLS theo thành viên, CI, bảng chỉ-thêm; còn thiếu phần trình bày thành "mô tả hệ thống" |
| **ISA 330** / VSA 330 — biện pháp xử lý rủi ro | Thử nghiệm kiểm soát và thử nghiệm cơ bản tương xứng với rủi ro | Mỗi con số cần truy được về bản ghi gốc để chọn mẫu |
| **ISA 500** / VSA 500 — bằng chứng kiểm toán | Đánh giá tính **thích hợp và đáng tin cậy** của thông tin dùng làm bằng chứng. Với thông tin do đơn vị tạo ra (IPE) phải có bằng chứng về **độ chính xác và đầy đủ** | Không chỉ đưa con số mà còn đưa **bằng chứng rằng tập dữ liệu là đủ** (B2) và **chưa bị sửa** (B1) |
| **Dự thảo ISA 330 / 500 / 520 sửa đổi** (IAASB công bố 05/08/2026, nhận góp ý tới **15/12/2026**) | Định nghĩa lại bằng chứng kiểm toán cho môi trường số; siết yêu cầu đánh giá độ liên quan và độ tin cậy | Cơ hội: MIMI có thể **gửi thư góp ý công khai** về bằng chứng số của SME — một dấu vết chuyên môn công khai, miễn phí, không phải tự nhận |
| **ISA 240 (Revised)** — gian lận (ban hành 07/2025, hiệu lực cho kỳ bắt đầu từ **15/12/2026**) | Bắt buộc thử nghiệm tính phù hợp của bút toán nhật ký và các điều chỉnh, bút toán cuối kỳ; hướng dẫn dùng công cụ tự động để tìm bút toán bất thường, rủi ro cao | Chấm điểm rủi ro bút toán / giao dịch có giải thích (B5). SME không có sổ cái kép → phải có bước dựng sổ (B6) |
| **ISA 505 / VSA 505** — xác nhận từ bên ngoài | Xác nhận phải đi **trực tiếp từ bên thứ ba tới kiểm toán viên**, kiểm toán viên kiểm soát quy trình gửi | **Dữ liệu ngân hàng qua quyền đọc (grant) của khách hàng KHÔNG phải thư xác nhận.** MIMI không được gọi nó là "xác nhận ngân hàng". Nó là IPE có nguồn tốt hơn tệp PDF khách gửi |
| **ISA 520 / VSA 520** — thủ tục phân tích | Phân tích như thử nghiệm cơ bản và ở cuối cuộc kiểm toán | `phan-tich/chenh-lech.ts` đã đi đúng khuôn (sự thật / suy luận / chưa biết) |
| **ISA 402 + ISAE 3402** — đơn vị dùng tổ chức dịch vụ | Kiểm toán viên của đơn vị dùng dịch vụ đọc báo cáo Type 1 (thiết kế) / Type 2 (thiết kế + hiệu quả vận hành) của tổ chức dịch vụ | Khi khách của MIMI bị kiểm toán, MIMI là tổ chức dịch vụ. Không có báo cáo thì kiểm toán viên phải tự thử nghiệm → tốn kém → khách bị khuyên bỏ MIMI (B7) |

Việt Nam: hệ thống 37 chuẩn mực kiểm toán ban hành theo **Thông tư 214/2012/TT-BTC**, hiệu lực từ
01/01/2014, cấu trúc theo ISA (bản ISA trước các lần sửa đổi gần đây).

Nguồn: [IAASB — Giới thiệu ISA 315 (Revised 2019)](https://www.ifac.org/_flysystem/azure-private/publications/files/IAASB-Introduction-to-ISA-315.pdf),
[ICAEW — ISA 315, hệ thống IT và rủi ro](https://www.icaew.com/technical/audit-and-assurance/audit/risk-assessment-internal-control-and-response/isa-315-the-entitys-it-systems-and-related-risks),
[IAASB — Dự thảo sửa ISA 330, 500, 520 (08/2026)](https://www.iaasb.org/publications/proposed-revisions-audit-evidence-risk-response-isa-330-isa-500-isa-520),
[IAASB — ISA 240 (Revised)](https://www.iaasb.org/publications/isa-240-revised-auditor-s-responsibilities-relating-fraud-audit-financial-statements),
[IAASB — thông cáo 07/2025](https://www.iaasb.org/news-events/2025-07/iaasb-revises-fraud-standard-enhance-public-trust),
[ICAEW — thử nghiệm bút toán theo ISA 240 và công cụ tự động](https://www.icaew.com/technical/audit-and-assurance/audit/risk-assessment-internal-control-and-response/journals-testing-meeting-isa-240-and-the-role-of-automated-software-tools),
[IAASB — tổng quan ISAE 3402](https://www.iaasb.org/publications/staff-overview-international-standard-assurance-engagements-isae-3402-assurance-reports-controls),
[VNAA — 37 chuẩn mực theo TT 214/2012](https://vnaa.com.vn/he-thong-367-chuan-muc-kiem-toan-viet-nam),
[VSA 500](https://docs.kreston.vn/vbpl/kiem-toan/chuan-muc-kiem-toan/vsa-500/),
[VSA 505](https://docs.kreston.vn/vbpl/kiem-toan/chuan-muc-kiem-toan/vsa-505/),
[VSA 520](https://docs.kreston.vn/vbpl/kiem-toan/chuan-muc-kiem-toan/vsa-520/) (ba trang cuối là bản đăng lại của Kreston, thứ cấp).

### 1.2 Chế độ kế toán Việt Nam — đổi lớn từ 2026

| Văn bản | Điểm chính | Hàm ý |
|---|---|---|
| **TT 99/2025/TT-BTC** (27/10/2025) — thay TT 200/2014 | Áp dụng từ năm tài chính bắt đầu 01/01/2026. Chuyển từ "tuân thủ quy định" sang "áp dụng nguyên tắc"; doanh nghiệp tự thiết kế tài khoản từ cấp 2 và mẫu chứng từ | Hệ tài khoản **không còn cố định** → cần lớp ánh xạ tài khoản có phiên bản (B6) |
| **TT 133/2016** — doanh nghiệp nhỏ và vừa | **Không bị TT 99 thay**; SME được giữ TT 133 hoặc tự nguyện chuyển TT 99 (áp dụng nhất quán ít nhất một năm tài chính) | Một SME có thể đổi chế độ giữa các năm → ánh xạ phải theo kỳ |
| **TT 152/2025/TT-BTC** (31/12/2025) — kế toán hộ, cá nhân kinh doanh, thay TT 88/2021 | Hiệu lực 01/01/2026; lưu chứng từ giấy hoặc điện tử; thời hạn lưu tối thiểu 5 năm, hoá đơn lưu theo luật thuế | Đây là **chế độ sổ sách của đúng khách hàng chính của MIMI**. Sổ MIMI sinh ra phải khớp mẫu sổ của TT 152 |
| **Luật Kế toán 88/2015**, Điều 41 + NĐ 174/2016 | Chứng từ dùng trực tiếp để ghi sổ và lập báo cáo tài chính, sổ kế toán, báo cáo tài chính năm: lưu **ít nhất 10 năm**; tài liệu cho quản lý, điều hành: ít nhất 5 năm | Chính sách lưu và xoá của MIMI phải chịu được 10 năm với doanh nghiệp. Bảng "không khoá ngoại, chứng từ bị xoá thì dấu vết vẫn còn" (`so_cai_chung_tu`) đi đúng hướng |

Nguồn: [Thư viện pháp luật — điểm mới TT 99/2025](https://thuvienphapluat.vn/ma-so-thue/phap-luat-thue/tong-hop-diem-moi-thong-tu-992025ttbtc-thay-the-thong-tu-200-che-do-ke-toan-doanh-nghiep-213879.html),
[TT 99 có thay TT 133?](https://thuvienphapluat.vn/ma-so-thue/phap-luat-thue/thong-tu-992025-co-thay-the-thong-tu-1332016-che-do-ke-toan-doanh-nghiep-nho-va-vua-213873.html),
[TT 152/2025 — văn bản](https://thuvienphapluat.vn/van-ban/Ke-toan-Kiem-toan/Thong-tu-152-2025-TT-BTC-huong-dan-ke-toan-cho-cac-ho-kinh-doanh-680351.aspx),
[IFA — thời hạn lưu trữ chứng từ](https://ifa.com.vn/vi/thoi-han-luu-tru-chung-tu-ke-toan) (thứ cấp; cần đối chiếu Điều 41 Luật 88/2015 và NĐ 174/2016 gốc).

### 1.3 Hoá đơn điện tử và thuế

| Văn bản | Điểm chính | Hàm ý |
|---|---|---|
| **NĐ 123/2020 sửa bởi NĐ 70/2025** (hiệu lực 01/06/2025; sửa 40/61 điều) | Bổ sung hoá đơn điện tử khởi tạo từ máy tính tiền có kết nối dữ liệu với cơ quan thuế; hộ và doanh nghiệp doanh thu trên 1 tỷ/năm phải dùng | Nguồn hoá đơn bán của hộ kinh doanh sẽ ngày càng nằm ở cơ quan thuế → đối chiếu hoá đơn ↔ tiền về trở thành việc hằng ngày |
| **TT 32/2025/TT-BTC** — **thay TT 78/2021** từ 01/06/2025 | Hướng dẫn NĐ 123 và NĐ 70: ký hiệu mẫu, xử lý hoá đơn sai sót (thay thế, điều chỉnh) | Yêu cầu nhiệm vụ nhắc "TT 78/2021" — **văn bản này đã hết hiệu lực**; kho luật của MIMI phải ghi quan hệ bãi bỏ này |
| **QĐ 1450/QĐ-TCT** (07/10/2021), sửa bởi QĐ 1510/QĐ-TCT (21/09/2022) | Đặc tả kỹ thuật: hoá đơn điện tử là **tệp XML**, thành phần dữ liệu, phương thức truyền nhận | MIMI có thể **đọc thẳng XML hoá đơn** người dùng tải từ cổng, không phụ thuộc Casso. XML mang chữ ký số → kiểm được tính xác thực (ISA 500) |
| **Luật Quản lý thuế 38/2019** → **Luật 108/2025/QH15** (thông qua 10/12/2025, hiệu lực **01/07/2026**; Điều 13 và hoá đơn điện tử của hộ tại Điều 26 áp dụng từ 01/01/2026) | Trọng tâm chuyển đổi số; tổ chức tín dụng định kỳ cung cấp số tài khoản theo mã số thuế và kết nối, chia sẻ thông tin giao dịch với cơ quan thuế | **Cơ quan thuế sẽ thấy dòng tiền ngân hàng của hộ kinh doanh.** Doanh thu khai phải giải thích được so với tiền vào — đúng nỗi đau "tiền vào ≠ doanh thu" (`docs/KIEM_DINH_CHUYEN_MON.md`). Yêu cầu nhiệm vụ nhắc Luật 38/2019 — **đã hết hiệu lực từ 01/07/2026** |
| **NĐ 68/2026** (05/03/2026) sửa bởi **NĐ 141/2026** (29/04/2026) | Ngưỡng không chịu GTGT và TNCN của hộ **nâng từ 500 triệu lên 1 tỷ/năm, áp dụng từ 01/01/2026** | Ví dụ thật của **quy định đổi hồi tố giữa năm**: tờ khai tính trước 29/04 theo 500 triệu phải tính lại. Đây là lý do cần B4 |
| **NĐ 117/2025** (hiệu lực 01/07/2025) | Sàn thương mại điện tử, nền tảng số có chức năng thanh toán khấu trừ, nộp thay GTGT và TNCN cho hộ, cá nhân | Tiền về từ sàn là **doanh thu đã bị khấu trừ thuế** → cần tách và đối chiếu chứng từ khấu trừ (`phan-loai/tien-vao.ts` đã nhận ra tiền sàn) |

Nguồn: [Báo Chính phủ — nội dung mới NĐ 70/2025](https://baochinhphu.vn/nhung-noi-dung-moi-cua-nghi-dinh-so-70-2025-nd-cp-ve-hoa-don-chung-tu-102250903091616929.htm),
[Thư viện pháp luật — NĐ 70/2025](https://thuvienphapluat.vn/van-ban/Thue-Phi-Le-Phi/Nghi-dinh-70-2025-ND-CP-sua-doi-Nghi-dinh-123-2020-ND-CP-hoa-don-chung-tu-577816.aspx),
[Expertis — TT 32/2025](https://expertis.vn/van-ban/thong-tu-32-2025-tt-btc/) (thứ cấp),
[QĐ 1450/QĐ-TCT](https://thuvienphapluat.vn/van-ban/Thue-Phi-Le-Phi/Quyet-dinh-1450-QD-TCT-2021-thanh-phan-chua-du-lieu-nghiep-vu-hoa-don-dien-tu-490526.aspx),
[QĐ 1510/QĐ-TCT](https://caselaw.vn/van-ban-phap-luat/554221-quyet-dinh-so-1510-qd-tct-ngay-21-09-2022-cua-tong-cuc-truong-tong-cuc-thue-sua-doi-quyet-dinh-1450-qd-tct-quy-dinh-ve-thanh-phan-chua-du-lieu-nghiep-vu-hoa-don-dien-tu-va-phuong-thuc-truyen-nhan-voi-co-quan-thue),
[Công báo — Luật 108/2025/QH15](https://congbao.chinhphu.vn/van-ban/luat-so-108-2025-qh15-468670.htm),
[KPMG Việt Nam — bản Luật 108/2025](https://assets.kpmg.com/content/dam/kpmgsites/vn/pdf/2026/01/law-on-tax-administration-no-108-vi.pdf),
[Cổng văn bản Chính phủ — NĐ 68/2026](https://vanban.chinhphu.vn/?pageid=27160&docid=217111),
[Báo Chính phủ — NĐ 141/2026 nâng ngưỡng 1 tỷ](https://baochinhphu.vn/chinh-thuc-nang-nguong-chiu-thue-voi-ho-kinh-doanh-len-01-ty-dong-nam-ap-dung-tu-1-1-2026-102260429185517215.htm),
[VBPL — NĐ 117/2025](https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=178299).

### 1.4 Dữ liệu và công nghệ kiểm toán

| Chủ đề | Thực hành chuẩn | Hàm ý |
|---|---|---|
| **Chuẩn dữ liệu kiểm toán AICPA (Audit Data Standards)** | Chuẩn tự nguyện cho: Sổ cái (hệ tài khoản, danh mục nguồn, bảng cân đối thử, chi tiết sổ cái), Order-to-Cash, Procure-to-Pay | Khuôn xuất dữ liệu **kiểm toán viên đã quen**. MIMI xuất theo khuôn này là "nói tiếng của họ" (B6) |
| **OECD SAF-T 2.0** | Tệp chuẩn để trao đổi dữ liệu kế toán với cơ quan thuế và kiểm toán viên: header, danh mục, bút toán sổ cái, chứng từ nguồn; bản 2.0 thêm tồn kho, tài sản cố định. Mỗi nước tự định nghĩa lược đồ | **Lượt tra cứu này không tìm thấy quy định SAF-T nào của Việt Nam.** Không được tuyên bố "chuẩn SAF-T Việt Nam". Dùng SAF-T làm khuôn tham chiếu, không làm lời hứa tuân thủ |
| **Nền tảng Big 4** | EY Helix (GL Analyzer: phân tích bút toán sổ cái mọi cỡ), Halo của PwC (trích xuất, chuyển đổi, phân tích giao dịch từ ERP), KPMG Clara, Deloitte Omnia | Họ **nhập** dữ liệu sổ cái. MIMI thắng khi dữ liệu nhập vào sạch, có bằng chứng, không cần làm lại |
| **Luật Benford** (Nigrini) | Kiểm tra chữ số đầu, chữ số thứ hai, hai chữ số đầu; đo độ phù hợp bằng MAD (Drake & Nigrini 2000). Hai chữ số đầu: 0–0,0012 rất phù hợp; 0,0012–0,0018 chấp nhận được; 0,0018–0,0022 phù hợp biên; trên 0,0022 không phù hợp | Chỉ có nghĩa với **tập đủ lớn và đủ trải** — một hộ vài trăm giao dịch một năm thường **không đủ**. Là tín hiệu phụ, không bao giờ là kết luận (B5) |
| **Khớp ba chiều** (đơn mua ↔ phiếu nhập ↔ hoá đơn, rồi ↔ thanh toán) | Kiểm soát chuẩn của chu trình mua hàng (P2P) | Hộ kinh doanh gần như không có đơn mua, phiếu nhập. Với SME Việt Nam, bài toán thực tế là **khớp 2 chiều có mở rộng** (tiền ↔ hoá đơn XML ↔ hợp đồng / ảnh phiếu khi có) (B3) |
| **Chuỗi băm và cây Merkle** | Nhật ký chỉ-thêm có bằng chứng bao hàm (inclusion proof) — mô hình Certificate Transparency (RFC 6962); neo thời gian công khai (OpenTimestamps) | MIMI **đã có** chuỗi băm + neo Bitcoin cho hoá đơn và chứng từ quét. Thiếu: dòng sao kê, quyết định, tờ khai, và bộ kiểm độc lập |

Nguồn: [AICPA ADS — Sổ cái](https://www.aicpa-cima.com/resources/download/general-ledger-standard-audit-data-standards),
[AICPA ADS — Order to Cash](https://www.aicpa-cima.com/resources/download/order-to-cash-subledger-standard-audit-data-standards),
[AICPA ADS — Procure to Pay](https://www.aicpa-cima.com/resources/download/procure-to-pay-subledger-standard-audit-data-standards),
[OECD — Hướng dẫn SAF-T 2.0](https://web-archive-storage.oecd.org/aemint-web-archive-prod/web-archive/cc/ccd3b76ffdaf3c1f3e185a390dba41be2876b0e826925278bbb3e62ad37442bf.pdf),
[EY Helix](https://www.ey.com/en_gl/services/audit/technology/helix),
[Nigrini — Forensic Analytics, ch.3](https://www.oreilly.com/library/view/forensic-analytics-2nd/9781119585763/c03.xhtml),
[Cerqueti & Lupi — Severe testing of Benford's law (arXiv)](https://arxiv.org/pdf/2202.05237),
[RFC 6962 — Certificate Transparency](https://www.rfc-editor.org/rfc/rfc6962),
[OpenTimestamps](https://opentimestamps.org).

### 1.5 Bảo mật, riêng tư, lưu trú dữ liệu

| Chủ đề | Nội dung | Hàm ý |
|---|---|---|
| **SOC 2** — AICPA Trust Services Criteria 2017 (điểm trọng tâm sửa 2022) | 5 nhóm: Bảo mật (Common Criteria CC1–CC9), Sẵn sàng, Toàn vẹn xử lý, Bảo mật thông tin, Riêng tư. Type 1 (thiết kế) / Type 2 (vận hành trong 3–12 tháng) | "Toàn vẹn xử lý" là nhóm **khớp nhất** với lõi của MIMI: con số đúng, đủ, kịp thời, được phép |
| **ISAE 3402** (IAASB, 2009) | Báo cáo đảm bảo về kiểm soát ở tổ chức dịch vụ, liên quan tới báo cáo tài chính của đơn vị dùng dịch vụ | Chuẩn quốc tế tương đương SOC 1; đáng làm khi có khách bị kiểm toán |
| **Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15** (hiệu lực 01/01/2026) + **NĐ 356/2025** | Quyền được biết, đồng ý, truy cập, sửa, **yêu cầu xoá**; phân loại dữ liệu cơ bản / nhạy cảm | **Xung đột phải thiết kế trước:** quyền xoá của chủ thể dữ liệu ↔ nghĩa vụ lưu 10 năm của Luật Kế toán ↔ chuỗi băm chỉ-thêm. Lời giải: băm không chứa dữ liệu cá nhân thô; xoá nội dung, giữ mã băm và lý do lưu theo luật |
| **NĐ 53/2022** (Luật An ninh mạng), Điều 26 | Dữ liệu người dùng Việt Nam phải lưu trong nước với một số lĩnh vực (viễn thông, thương mại điện tử, **thanh toán trực tuyến**, mạng xã hội…); lưu tối thiểu 24 tháng | Cần xác định MIMI có thuộc diện không (khi còn thu tiền qua QR) và **vùng lưu trữ Supabase hiện tại là đâu** — tài liệu này không kiểm được điều đó |

Nguồn: [AICPA — TSC 2017 (sửa 2022)](https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022),
[IAASB — ISAE 3402](https://www.iaasb.org/publications/staff-overview-international-standard-assurance-engagements-isae-3402-assurance-reports-controls),
[Luật 91/2025/QH15](https://thuvienphapluat.vn/van-ban/Bo-may-hanh-chinh/Luat-Bao-ve-du-lieu-ca-nhan-2025-so-91-2025-QH15-625628.aspx),
[NĐ 356/2025/NĐ-CP](https://thuvienphapluat.vn/van-ban/Quyen-dan-su/Nghi-dinh-356-2025-ND-CP-huong-dan-Luat-Bao-ve-du-lieu-ca-nhan-687428.aspx),
[NĐ 53/2022/NĐ-CP](https://english.luatvietnam.vn/decree-no-53-2022-nd-cp-dated-august-15-2022-of-the-government-detailing-a-number-of-articles-of-the-law-on-cyber-security-228170-doc1.html).

---

## 2. Bản đồ: nhu cầu → MIMI đang có gì → khoảng trống

Đường dẫn tính từ gốc kho. `_shared` = `supabase/functions/_shared`.

| # | Nhu cầu (chuẩn) | MIMI đã có (đọc từ mã) | Khoảng trống |
|---|---|---|---|
| 1 | Bất biến, truy vết (ISA 500, ISA 230, Luật KT Điều 41) | **Sổ cái băm nối chuỗi** `so_cai_chung_tu` + neo Merkle lên Bitcoin qua OpenTimestamps (`supabase/migrations/20260915230000_so_cai_chung_tu.sql`, `supabase/functions/dau-thoi-gian/index.ts`, `_shared/dau-thoi-gian/ots.ts`); hàm `kiem_so_cai` phát hiện mắt xích hỏng và bản ghi lệch | Chuỗi **chỉ phủ** `gdt_invoices` và `chung_tu_quet`. **Không phủ** `transactions` (dòng sao kê), `quyet_dinh_chung_tu`, `nhat_ky_quyet_dinh`, tờ khai nháp. Không có bằng chứng bao hàm cho **một** bản ghi xuất ra ngoài kèm bộ kiểm độc lập. `kiem_so_cai` chỉ chạy bằng service role |
| 2 | Nhật ký quyết định, phân quyền người duyệt | `nhat_ky_quyet_dinh` chỉ-thêm, trigger chặn sửa (`20260918150000_hoi_thoai_quyet_dinh.sql`); `quyet_dinh_chung_tu` chỉ-thêm, hoàn tác bằng `huy_luc` (`20260929140000_quyet_dinh_chung_tu.sql`); 5 vai trò gồm `ke_toan`, `nguoi_duyet` (`_shared/quyen/vai-tro.ts`); máy chủ chốt kết quả việc chạm tiền (`_shared/doi-soat/quyet-dinh.ts`) | Quyết định chưa vào chuỗi băm. Chưa có **tách nhiệm** bắt buộc (người lập ≠ người duyệt) được kiểm bằng test |
| 3 | Bằng chứng đứng sau con số (ISA 500) | `BangChung { loai, id[], so_ban_ghi, ma_bam }` gắn vào từng số của trợ lý (`_shared/tro-ly/kieu.ts`, MIMI-P1-001) | `id` có thể bị cắt; `ma_bam` băm tập bản ghi nhưng không nối vào sổ cái → không chứng minh được với người ngoài |
| 4 | Tính đầy đủ của dữ liệu ngân hàng (IPE) | Đọc sao kê Excel/CSV theo từ đồng nghĩa cột, máy chủ kiểm lại từng dòng (`_shared/sao-ke/doc-sao-ke.ts`); chuỗi chống trùng; `sao_ke_nhap` ghi số dòng đọc / mới / trùng, khoảng ngày; đọc đủ theo trang (`_shared/doc-het.ts`); công bố độ đầy đủ (MIMI-P0-002) | Cột `so_du` được **đọc nhưng không dùng để kiểm liên tục**. Không có số dư đầu kỳ / cuối kỳ, không có mã băm tệp gốc, không phát hiện khoảng trống ngày giữa các lần nhập. Không có chỉ báo "tài khoản X tháng Y: đủ / thiếu" |
| 5 | Doanh thu đúng (VAS/TT 152, luật thuế) | Bốn con số không trộn `tien_vao / uoc_tinh / da_xac_nhan / hoa_don` (`_shared/doanh-thu/so-lieu.ts`); loại chuyển nội bộ (`_shared/ledger/internal-transfer.ts`, `tai-khoan.ts`); gợi ý khoản không phải doanh thu, không tự loại (`_shared/phan-loai/tien-vao.ts`); chia theo nhóm hoạt động có người xác nhận (`_shared/doanh-thu/theo-hoat-dong.ts`) | Ghi nhận **theo kỳ** (bán chịu) chưa có; cột `currency` chưa có ở `transactions`, `invoices` (`docs/KIEM_DINH_CHUYEN_MON.md`) |
| 6 | Đối soát, ngoại lệ có giải thích | Ghép tiền về ↔ hoá đơn bán bằng điểm (+40/+40/+20), mơ hồ thì không tự chọn (`_shared/doi-soat/cham-diem.ts`); tiền ra ↔ chứng từ (`_shared/chung-tu/khop-chung-tu.ts`); công nợ trả nhiều đợt (`_shared/ledger/receivables.ts`); QR khớp chính xác (`_shared/ledger/reconcile-qr.ts`); fixture precision/recall (MIMI-P1-005) | Chưa có bộ ca **do kế toán dán nhãn** trên dữ liệu thật; chưa đọc **XML hoá đơn** (QĐ 1450) trực tiếp; không kiểm chữ ký số người bán; `gdt-invoice-map.ts` không có dòng hàng hoá (số lượng, đơn giá) |
| 7 | Luật có phiên bản theo ngày hiệu lực | `PHIEN_BAN_HE_LUAT = '2026-09-17.1'` (`_shared/luat/he-luat.ts`); quan hệ bãi bỏ trích nguyên văn, chỉ `chac_chan` được tự loại (`_shared/luat/hieu-luc.ts`); căn cứ đối chiếu với kho mỗi lần chạy (`_shared/luat/doc-can-cu.ts`); tờ khai đúng mẫu TT 50/2026, ô không có căn cứ để trống (`_shared/luat/to-khai.ts`) | Ngưỡng và tỷ lệ là **hằng số trong mã**, không phải dữ liệu có `hieu_luc_tu/den`. Không tính lại được "kỳ Q1/2026 theo luật ngày 01/04/2026" và "theo luật hôm nay" rồi so. Không có **song thời gian** (thời điểm sự kiện ↔ thời điểm MIMI biết) |
| 8 | Bất thường, rủi ro bút toán (ISA 240) | 6 dấu hiệu có giải thích, không gắn chữ "AI", nói "dấu hiệu" không nói "lừa đảo" (`_shared/bat-thuong/phat-hien.ts`) | Là luật **chống lừa đảo trước khi chuyển tiền**, chưa phải thử nghiệm rủi ro bút toán: không có cut-off, số tròn, ngày nghỉ, trả trùng, bên liên quan, Benford. Ngưỡng sàn 20 triệu vô hiệu hoá bội số trung vị với hộ nhỏ (`KIEM_DINH_CHUYEN_MON.md`) |
| 9 | Xuất dữ liệu cho kiểm toán viên | Xuất CSV an toàn (chống CSV injection, BOM) (`src/lib/csv.ts`) | **Không có sổ kép** ("MIMI chưa có sổ kế toán" — `KIEM_DINH_CHUYEN_MON.md`). Không có bảng cân đối thử, không có ánh xạ tài khoản TT 152/133/99, không có khuôn ADS |
| 10 | Kiểm soát nền tảng (ISA 315 GITC, SOC 2) | RLS theo thành viên + **cross-tenant negative test trên CSDL thật** (`supabase/kiem/rls-cheo-cong-ty.sql`); khoá cột token; CI chạy tsc, test, build, deno check (`.github/workflows/kiem.yml`); mã hoá lai hậu lượng tử cho trường nhạy cảm (`_shared/pqcCrypto.ts`); ánh xạ allow-list khi đọc hoá đơn thuế — không kéo CCCD, hộ chiếu (`_shared/tax/gdt-invoice-map.ts`); ghi lỗi giao diện `client_error` | Chưa có ma trận kiểm soát, chưa rà soát quyền định kỳ, chưa có cảnh báo vận hành (`SO_DIEM_AUDIT.md`: telemetry `partial`), chưa có chính sách lưu và xoá theo luật |
| 11 | Độ chính xác tiền | BigInt tới đồng (vòng 29/09) | Không có cột tiền tệ, tỷ giá |
| 12 | Đánh giá AI | Bộ chấm offline, cổng CI (`_shared/eval/`); 54/300 ca | Không có bộ ca "kiểm toán viên thực hiện lại" |

**Kết luận bản đồ.** MIMI có **ba tài sản hiếm** so với sản phẩm cùng hạng: (a) chuỗi băm + neo
thời gian công khai đang chạy, (b) kỷ luật "không đoán — mơ hồ thì hỏi người, ghi lại ai quyết", (c) hệ
luật thuế trích nguyên văn có kiểm hiệu lực. Ba tài sản đó **chưa nối với nhau thành một đồ thị bằng
chứng**, và **tầng dưới cùng — tính đầy đủ của sao kê — chưa được chứng minh**. Đó là nơi đặt bài toán.

---

## 3. Đặt bài toán — 7 bài toán lõi, xếp theo đòn bẩy

Thang xếp hạng: (1) Big 4 / hãng kiểm toán **thực hiện lại được** mà không hỏi MIMI; (2) hộ kinh
doanh / kế toán dịch vụ **được lợi ngay**; (3) dựng trên tài sản đã có; (4) không phụ thuộc đối tác
đang tắc (Casso hoá đơn).

| Hạng | Bài toán | Đòn bẩy Big 4 | Lợi ích SME ngay | Dựa trên cái có | Công sức |
|---|---|---|---|---|---|
| **1** | B1 — Đồ thị bằng chứng băm nối chuỗi, gói bằng chứng tự kiểm được | Rất cao | Cao | Cao | M |
| **2** | B2 — Chứng minh tính đầy đủ của sao kê (cuộn số dư) | Cao | Rất cao | Trung bình | S–M |
| **3** | B4 — Động cơ thuế theo phiên bản, tính lại theo ngày hiệu lực | Cao (Tax) | Rất cao | Cao | M |
| 4 | B3 — Đối soát liên tục + khớp hoá đơn XML có chữ ký | Trung bình–cao | Cao | Cao | M–L |
| 5 | B5 — Chấm điểm rủi ro giao dịch kiểu ISA 240 | Trung bình | Trung bình | Trung bình | M |
| 6 | B6 — Sổ kép tối thiểu + xuất khuôn dữ liệu kiểm toán | Cao nhưng xa | Thấp–trung bình | Thấp | L |
| 7 | B7 — Kiểm soát nền tảng sẵn sàng SOC 2 / ISAE 3402 | Cao khi có khách lớn | Thấp | Trung bình | L (quy trình) |

---

### B1 — Đồ thị bằng chứng: từ dòng sao kê tới dòng tờ khai, băm nối chuỗi, ai cũng tự kiểm được

**Phát biểu.** Cho một con số MIMI đưa ra (ví dụ "doanh thu Q3 dùng cho tờ khai 01/CNKD: X đồng"), sinh
một **gói bằng chứng** để người ngoài, không cần truy cập MIMI, chứng minh được ba điều: (i) X bằng tổng
đúng những bản ghi được liệt kê; (ii) mỗi bản ghi và mỗi quyết định của người (xác nhận "khoản này là
tiền vay", "chi này không có chứng từ vì…") tồn tại, chưa bị sửa kể từ thời điểm neo; (iii) phép tính
dùng đúng phiên bản luật nào.

**Ai cần, vì sao.**
- Kế toán dịch vụ: khi cơ quan thuế hỏi (Luật 108/2025 cho cơ quan thuế thấy dòng tiền ngân hàng) thì có
  hồ sơ giải thích từng đồng chênh giữa tiền vào và doanh thu khai.
- Kiểm toán viên / Deal Advisory: bằng chứng về IPE (ISA 500) và "proof of cash" không phải làm lại.
- Cán bộ thuế: không cần tin MIMI, chỉ cần chạy bộ kiểm.

**Đầu vào.** `transactions`, `gdt_invoices`, `chung_tu_quet`, `quyet_dinh_chung_tu`, `transaction_labels`
(phân loại tiền vào), `nhat_ky_quyet_dinh`, tờ khai nháp, `PHIEN_BAN_HE_LUAT` và câu căn cứ.

**Đầu ra.** Tệp `.zip` "Gói bằng chứng kỳ K": `manifest.json` (danh sách nút và cạnh của đồ thị: dòng sao
kê → chứng từ → quyết định → dòng tờ khai), CSV từng loại bản ghi ở dạng chuẩn hoá `v1|…`, bằng chứng
bao hàm Merkle cho từng lá, tệp `.ots`, và **bộ kiểm độc lập** (một script ngắn, không phụ thuộc MIMI)
tính lại tổng, băm lại từng dòng, kiểm đường Merkle, kiểm `.ots`.

**Tiêu chí nghiệm thu (đo được).**
1. 100% bản ghi thuộc 6 loại trên có mắt xích trong sổ cái (mở rộng `so_cai_chung_tu.loai`).
2. Tính lại mọi ô số của tờ khai nháp từ gói: **chênh 0 đồng**.
3. Thử làm giả: 1.000 đột biến ngẫu nhiên (sửa 1 trường, xoá 1 dòng, chèn 1 dòng, đổi thứ tự) → bộ kiểm
   phát hiện **1.000/1.000**.
4. Bộ kiểm độc lập ≤ 300 dòng, chạy được bằng Python hoặc Node chuẩn, không mạng (trừ bước tuỳ chọn
   kiểm khối Bitcoin).
5. Sinh gói cho 10.000 giao dịch trong ≤ 60 giây trên edge function.
6. Gói **không chứa** trường ngoài allow-list (không CCCD, hộ chiếu, số điện thoại của người mua).
7. Thử với người thật: một kế toán hoặc kiểm toán viên ngoài đội lấy 25 mẫu ngẫu nhiên, truy từ dòng tờ
   khai về dòng sao kê và ngược lại trong ≤ 30 phút **mà không hỏi đội MIMI**.

**Kỹ thuật.** Chuẩn hoá bản ghi có phiên bản (đã có `v1|` và cách thoát `\|`); chuỗi băm theo công ty
(đã có, khoá `pg_advisory_xact_lock`); cây Merkle theo lô neo + bằng chứng bao hàm kiểu RFC 6962; neo
OpenTimestamps (đã có); đồ thị bằng chứng dạng bảng cạnh `(nut_nguon, nut_dich, loai_canh, boi_ai, luc)`
chỉ-thêm; băm tập kết quả trợ lý (`BangChung.ma_bam`) nối vào sổ cái để câu trả lời cũ cũng kiểm được.

**Dữ liệu cần.** Không cần dữ liệu mới từ đối tác. Chạy được ngay trên sao kê tải lên.

**Rủi ro, ràng buộc pháp lý.**
- **Quyền xoá (Luật 91/2025) ↔ lưu 10 năm (Luật Kế toán) ↔ chỉ-thêm**: mắt xích chỉ chứa mã băm; xoá
  nội dung thì giữ mã băm và lý do lưu theo luật. Phải có ý kiến luật sư trước khi hứa.
- Đổi hàm chuẩn hoá là đổi mã băm mọi bản ghi về sau → phiên bản hoá (`v2|`), không bao giờ sửa `v1`.
- Không gọi là "blockchain hoá hoá đơn", không gọi là "được cơ quan thuế công nhận". Chỉ nói: *chứng minh
  được bản ghi tồn tại và chưa đổi kể từ thời điểm X*.
- Chỉ mã gốc Merkle 32 byte rời MIMI (đã đúng trong thiết kế hiện tại).

**Công sức: M** (4–6 tuần một kỹ sư). **Vì sao hạng 1:** tận dụng thứ MIMI đã làm tốt hơn phần lớn sản
phẩm cùng loại; ra một vật thể cụ thể (gói bằng chứng) để mang đi gặp kế toán và hãng kiểm toán.

---

### B2 — Chứng minh sao kê là ĐỦ: cuộn số dư, phát hiện khoảng trống, chỉ báo độ phủ

**Phát biểu.** Mọi con số của MIMI (doanh thu ước tính, mốc 1 tỷ, chi thiếu chứng từ) chỉ đúng nếu tập
giao dịch **đủ**. Hiện MIMI công bố độ đầy đủ theo nguồn nhưng không **chứng minh** được. Bài toán: với
mỗi tài khoản × mỗi tháng, kết luận `đủ / thiếu / chưa rõ` kèm bằng chứng, dựa trên phương trình
**số dư đầu + tổng ghi có − tổng ghi nợ = số dư cuối**, liên tục qua các tệp và các nguồn.

**Ai cần, vì sao.** Đây là câu hỏi đầu tiên của mọi kiểm toán viên về IPE (ISA 500) và của mọi phép
"proof of cash". Với hộ kinh doanh, thiếu một tháng sao kê là doanh thu thấp hơn thật → **khai thiếu**,
đúng chiều sai trái luật (`phan-loai/tien-vao.ts` đã phân tích hai chiều sai không cân nhau).

**Đầu vào.** Các tệp sao kê (Excel/CSV, cột `so_du` đã được đọc), luồng Cas/SePay, `sao_ke_nhap`.

**Đầu ra.** Bảng `do_phu_tai_khoan (company_id, tai_khoan, thang, trang_thai, so_du_dau, so_du_cuoi,
chenh, nguon, bang_chung)`; danh sách lỗ hổng ("thiếu 12/03–18/03", "hai tệp chồng nhau nhưng lệch 1
dòng"); mã băm tệp gốc lưu cùng `sao_ke_nhap`; thẻ trên màn Tổng quan: "Sao kê VCB …123: đủ 8/9 tháng —
thiếu tháng 3".

**Tiêu chí nghiệm thu.**
1. Cuộn số dư đúng tới đồng (BigInt) cho mọi cặp dòng liên tiếp có `so_du`; chênh ≠ 0 thì chỉ ra dòng.
2. Bộ ca từ **≥ 5 ngân hàng** (dữ liệu thật đã xin phép và ẩn danh, hoặc tệp mẫu công khai của ngân
   hàng): chèn giả 200 lỗi (xoá dòng, trùng dòng, mất ngày, đảo dấu) → phát hiện **200/200**.
3. Tệp sạch: báo động giả ≤ 1% số tài khoản-tháng.
4. Khi tệp không có cột số dư: trạng thái `chua_ro` kèm câu giải thích — **không bao giờ** ra `du`.
5. Đối chiếu chéo luồng API ↔ tệp tải lên cho cùng tài khoản và ngày: báo từng dòng chỉ có một bên.
6. Doanh thu ước tính trên Tổng quan và tờ khai nháp hiện rõ "dựa trên N/M tháng đã chứng minh đủ".

**Kỹ thuật.** Sắp xếp ổn định theo (ngày, thứ tự trong tệp) vì sao kê Việt Nam hay trùng giờ; xử lý
ngân hàng in số dư theo ngày thay vì theo dòng; khoảng ngày của mỗi lần nhập (`tu_ngay/den_ngay` đã có)
→ hợp các khoảng → phát hiện lỗ; băm SHA-256 tệp gốc để lần nhập lại cùng tệp được nhận ra; nút đồ thị B1
cho mỗi kết luận độ phủ.

**Dữ liệu cần.** Mẫu sao kê của các ngân hàng phổ biến (hiện `doc-sao-ke.ts` dò theo từ đồng nghĩa, đã
có test). Cần xin 5–10 bộ sao kê thật có đồng ý bằng văn bản.

**Rủi ro.** Một số ngân hàng xuất sao kê không có số dư theo dòng → nhiều tài khoản rơi vào `chua_ro`,
phải nói thật. Không được "làm mượt" để ra `du`. Không gọi là "xác nhận ngân hàng" (VSA 505).

**Công sức: S–M** (2–3 tuần). **Vì sao hạng 2:** rẻ, sửa đúng tầng móng, giúp ngay hộ kinh doanh, và là
điều kiện để B1 có ý nghĩa (chuỗi băm của một tập thiếu vẫn là tập thiếu).

---

### B4 — Động cơ nghĩa vụ thuế có phiên bản: tính lại theo luật hiệu lực ở bất kỳ thời điểm nào

**Phát biểu.** Biến ngưỡng, tỷ lệ, hạn nộp và quy tắc suy luận từ **hằng số trong mã** thành **dữ liệu
có hiệu lực theo thời gian** (`hieu_luc_tu`, `hieu_luc_den`, `can_cu`, `van_ban_sua_doi`), rồi cho phép
tính nghĩa vụ theo hai trục thời gian: *luật áp dụng cho kỳ nào* và *MIMI biết luật đó từ khi nào*. Mỗi
tờ khai nháp lưu mã băm của bộ luật và mã băm của tập dữ liệu (nối B1).

**Ví dụ có thật làm bài kiểm.** NĐ 68/2026 (05/03/2026) đặt ngưỡng 500 triệu; NĐ 141/2026 (29/04/2026)
nâng lên 1 tỷ **áp dụng từ 01/01/2026**. Một tờ khai Q1/2026 soạn ngày 15/04 và soạn lại ngày 15/05 cho
kết quả khác nhau vì luật đổi hồi tố. Động cơ phải: (a) tái tạo đúng kết quả ngày 15/04; (b) tính kết
quả đúng hôm nay; (c) liệt kê mọi tờ khai nháp bị ảnh hưởng và giải thích chênh lệch bằng câu trích căn
cứ.

**Ai cần, vì sao.** Hộ kinh doanh và kế toán dịch vụ đang sống giữa một năm luật đổi liên tục (NĐ 68,
NĐ 141, TT 18/2026, TT 50/2026, TT 152/2025, Luật 108/2025). Đội Tax của Big 4 bán đúng năng lực này cho
khách lớn; không có ai làm cho hộ kinh doanh ở mức có căn cứ nguyên văn.

**Đầu vào.** Kho Công báo đã cào (`doan_phap_luat`), quan hệ hiệu lực (`_shared/luat/hieu-luc.ts`),
dữ kiện người nộp (`_shared/nghia-vu/tinh.ts`), doanh thu theo hoạt động.

**Đầu ra.** Bảng `quy_tac_thue (ma, tham_so, hieu_luc_tu, hieu_luc_den, can_cu[], phien_ban, bam)`; hàm
`tinhNghiaVu({ ky, luatTaiNgay, duLieuTaiNgay })`; báo cáo khác biệt giữa hai phiên bản luật cho cùng
dữ liệu; tờ khai nháp kèm `bam_bo_luat` + `bam_du_lieu`.

**Tiêu chí nghiệm thu.**
1. Mọi ngưỡng, tỷ lệ trong `he-luat.ts` chuyển thành dữ liệu; test đảm bảo không còn hằng số thuế nào
   trong mã (quét như `du-lieu-that.test.ts` đang làm).
2. Bộ ca vàng: mọi ví dụ tính toán có trong văn bản gốc (phụ lục, mẫu kê khai) mà kho có → khớp **100%**.
3. Ca NĐ 68 → NĐ 141: tái tạo đúng cả hai kết quả và câu giải thích chênh.
4. Đổi một quy tắc → danh sách tờ khai nháp bị ảnh hưởng xuất hiện trong ≤ 1 phút, **không tự sửa** tờ
   khai nào (lằn ranh đỏ số 6, `docs/THANG_DIEM_QUYET_DINH.md`: không tự động giảm số phải khai).
5. Một chuyên viên thuế ngoài đội rà 20 kết luận ngẫu nhiên: 0 kết luận sai căn cứ; mọi kết luận "chưa
   hỗ trợ" được nói ra, không bị đoán.

**Kỹ thuật.** Mô hình song thời gian (valid time / transaction time); quy tắc dạng dữ liệu + bộ suy luận
thuần (đã có kiến trúc "cạnh nhân quả" trong `he-luat.ts`); kiểm thử theo thuộc tính (tăng doanh thu
không bao giờ làm giảm nghĩa vụ trong cùng nhóm ngành); ký mã băm bộ luật.

**Rủi ro.** Diễn giải pháp luật sai là rủi ro lớn nhất của cả sản phẩm (trục `tax_legal_correctness` 5,8).
Cần **một chuyên gia thuế có chứng chỉ hành nghề** duyệt bộ quy tắc trước mỗi lần đổi phiên bản. Không
tuyên bố "đúng luật", chỉ nói "theo bộ quy tắc phiên bản X, căn cứ …".

**Công sức: M** (4–5 tuần kỹ sư + thời gian duyệt của chuyên gia thuế).

---

### B3 — Đối soát liên tục, ngoại lệ giải thích được, khớp hoá đơn điện tử XML có chữ ký

**Phát biểu.** Mỗi khi có dòng sao kê mới, MIMI ghép với hoá đơn (bán ra, mua vào) và chứng từ; kết quả
thuộc một trong ba nhóm `khop_chac / can_xem / ngoai_le`, mỗi cặp có điểm và lý do; ngoại lệ vào hàng đợi
người duyệt có hạn xử lý. Mở rộng nguồn hoá đơn bằng **nhập tệp XML** theo QĐ 1450/QĐ-TCT (người dùng
tải từ cổng hoá đơn), kiểm **chữ ký số người bán** và mã của cơ quan thuế — không phụ thuộc Casso.

**Ai cần.** Kế toán dịch vụ (việc tốn giờ nhất mỗi quý); kiểm toán viên chu trình bán hàng / mua hàng
(ISA 330, thử nghiệm chi tiết); cơ quan thuế khi đối chiếu hoá đơn đầu vào.

**Đầu vào.** Dòng sao kê, XML hoá đơn, ảnh chứng từ, `invoices`, `gdt_invoices` (khi Casso bật lại).

**Đầu ra.** Bảng cặp ghép có điểm, lý do, người chốt; hàng đợi ngoại lệ có tuổi; chỉ số theo kỳ: % dòng
chi có chứng từ, % hoá đơn bán đã thu, tuổi ngoại lệ.

**Tiêu chí nghiệm thu.**
1. Bộ ≥ 500 cặp **do kế toán dán nhãn** trên dữ liệu thật (ẩn danh, có đồng ý).
2. Nhóm `khop_chac`: precision ≥ 99,5% (một cặp sai trên 200 là chạm tờ khai). Recall báo cáo trung
   thực, không ép.
3. Mọi cặp mơ hồ (hai ứng viên cùng điểm) vào `can_xem` — 100%, như quy tắc đã có.
4. XML: kiểm lược đồ, kiểm chữ ký số, nhận ra hoá đơn thay thế / điều chỉnh theo TT 32/2025; hoá đơn chữ
   ký hỏng thì đánh dấu, không ghép tự động.
5. Thời gian kế toán xử lý một quý của một hộ giảm, đo bằng đồng hồ trên 3 kế toán thật (so trước/sau).

**Kỹ thuật.** Chấm điểm hiện có (`cham-diem.ts`) + ghép tối ưu một-một có ràng buộc (bài toán gán, thuật
toán Hungarian) cho trường hợp một–một, và ghép tập con cho "một lần chuyển trả nhiều hoá đơn" (giới hạn
kích thước để tránh bùng nổ tổ hợp); chuẩn hoá tên (bỏ dấu, viết tắt "CT TNHH", "CTY"); XMLDSig.

**Rủi ro.** Hoá đơn thay thế / điều chỉnh / huỷ: `hoa-don/vong-doi.ts` hiện chỉ chắc mã `1` — cần đối
chiếu bảng mã chính thức trước khi dùng. Chữ ký số: cần chuỗi chứng thư của tổ chức chứng thực chữ ký số
công cộng Việt Nam.

**Công sức: M–L.**

---

### B5 — Chấm điểm rủi ro giao dịch theo tinh thần ISA 240, có giải thích

**Phát biểu.** Với SME không có sổ cái kép, "bút toán" là dòng sao kê + chứng từ + quyết định phân loại.
Xây bộ thử nghiệm chuẩn, mỗi thử nghiệm có mã, mô tả, tham chiếu chuẩn mực, ngưỡng **tương đối theo quy
mô của chính công ty**, và câu giải thích có số cụ thể. Đầu ra dùng cho hai người: kế toán (việc cần
xem trước khi chốt kỳ) và kiểm toán viên (danh sách chọn mẫu có lý do).

**Danh mục thử nghiệm đề xuất (mỗi cái một mã):** cut-off (giao dịch trong 5 ngày quanh ngày khoá kỳ);
số tròn; giao dịch ngày nghỉ, lễ, ngoài giờ; trả trùng (cùng người nhận, cùng số tiền, trong N ngày);
người nhận mới + số lớn (đã có); tách nhỏ dưới ngưỡng duyệt (đã có); đổi số tài khoản người nhận (đã có);
bên liên quan (tên người nhận trùng tên chủ / thành viên); khoản phân loại lại sau khi đã khai; Benford hai
chữ số đầu **chỉ khi N ≥ 1.000 và số tiền trải ≥ 3 bậc độ lớn**, đo bằng MAD theo ngưỡng Nigrini.

**Tiêu chí nghiệm thu.**
1. Mỗi cảnh báo có mã, tham chiếu, câu có số, danh sách bản ghi căn cứ (như `DauHieu.can_cu` đã có).
2. Bỏ ngưỡng sàn tuyệt đối 20 triệu làm điều kiện cứng; thay bằng hàm của phân phối riêng công ty (sửa
   điều `KIEM_DINH_CHUYEN_MON.md` đã nêu).
3. Tỷ lệ "đáng xem" do kế toán chấm trên ≥ 300 cảnh báo thật được **đo và công bố**; ngưỡng mục tiêu đặt
   sau khi có số nền, không đặt trước.
4. Benford không bao giờ xuất hiện một mình như kết luận; tập nhỏ thì nói "không đủ dữ liệu để kiểm".
5. Không một câu nào dùng chữ "gian lận", "lừa đảo" — chỉ "dấu hiệu" (quy tắc đã có).

**Rủi ro.** Báo động giả làm người dùng bỏ qua mọi cảnh báo. Mô hình học máy **không** dùng ở giai đoạn
này: không có nhãn thật, và kiểm toán viên cần lý do, không cần điểm hộp đen.

**Công sức: M.**

---

### B6 — Sổ kép tối thiểu sinh từ sự kiện, xuất khuôn dữ liệu kiểm toán

**Phát biểu.** Từ sự kiện đã có (dòng sao kê, chứng từ, quyết định phân loại, hoá đơn), sinh **bút toán
kép** theo quy tắc ánh xạ có phiên bản sang hệ tài khoản / mẫu sổ của TT 152/2025 (hộ), TT 133/2016 hoặc
TT 99/2025 (doanh nghiệp). Xuất: hệ tài khoản, bảng cân đối thử, chi tiết sổ cái, danh mục nguồn — theo
khuôn AICPA ADS; ánh xạ tham chiếu sang cấu trúc SAF-T 2.0 cho khách nước ngoài.

**Tiêu chí nghiệm thu.** Σ Nợ = Σ Có mọi kỳ; bảng cân đối thử cuộn từ chi tiết chênh 0 đồng; tiền trên sổ
khớp B2; mỗi bút toán trỏ về nút đồ thị B1; một kiểm toán viên nhập tệp xuất vào công cụ của họ (Excel,
IDEA hoặc tương đương) không phải sửa cột; mẫu sổ TT 152 in ra được và một kế toán dịch vụ ký xác nhận
đúng mẫu.

**Rủi ro.** Đây là **bước biến MIMI thành phần mềm kế toán** — cạnh tranh với MISA, Fast, và kéo theo trách
nhiệm pháp lý của sổ sách. Chỉ làm khi B1–B4 đã có khách thật dùng. Không tuyên bố "đạt chuẩn SAF-T".

**Công sức: L.**

---

### B7 — Kiểm soát nền tảng sẵn sàng SOC 2 / ISAE 3402

**Phát biểu.** Viết "mô tả hệ thống" và ma trận kiểm soát ánh xạ vào TSC CC1–CC9 + Toàn vẹn xử lý; tự động
thu bằng chứng vận hành (CI, test RLS chéo công ty, rà quyền định kỳ, thay đổi migration có người duyệt,
cảnh báo sự cố); chính sách lưu và xoá theo Luật Kế toán + Luật 91/2025; xác định vùng lưu trữ và diện áp
dụng NĐ 53/2022.

**Tiêu chí nghiệm thu.** Đánh giá khoảng trống (readiness) do một bên độc lập làm; ≥ 90% kiểm soát có bằng
chứng tự động trong 3 tháng liên tục; test RLS chéo công ty chạy trong CI (hiện mới chạy tay một cặp A–B).

**Rủi ro.** Tốn tiền (báo cáo Type 2 cần giai đoạn quan sát 3–12 tháng và phí hãng kiểm toán). **Không
làm báo cáo chính thức trước khi có khách cần nó.** Làm trước phần rẻ: tự động hoá bằng chứng, vì nó cũng
nâng trục `reliability_observability`.

**Công sức: L** (chủ yếu quy trình).

---

### Không đặt thành bài toán — và vì sao

- **Cổng xác nhận ngân hàng thay kiểm toán viên.** VSA 505 đòi thư trả lời đi thẳng từ bên thứ ba tới
  kiểm toán viên, do kiểm toán viên kiểm soát. MIMI đứng giữa là phá chuẩn.
- **Chấm điểm tín dụng, giới thiệu khoản vay.** Chủ dự án đã bỏ mọi lời hứa cho vay từ 17/08/2026.
- **"AI phát hiện gian lận".** Chưa có nhãn thật, chưa có lý do để tin; nói ra là vi phạm lằn ranh đỏ số 4.
- **Đưa hoá đơn lên chuỗi công khai / NFT.** Đã cân nhắc và loại có lý do trong migration sổ cái (công bố
  dữ liệu thuế của khách).

---

## 4. Lộ trình 90 ngày — học và dựng

**Nguyên tắc.** Lộ trình này **không được chen trước** việc số một đang mở: *5 hộ kinh doanh thật kích
hoạt* (`SO_DIEM_AUDIT.md`). B2 và B1 được chọn chính vì chúng phục vụ luôn việc đó: hộ nào nhập sao kê
đều được lợi từ "sao kê của bạn đã đủ chưa".

### Tuần 1–2 — Học nền, không viết mã

| Chủ đề | Nguồn cụ thể | Đầu ra học tập |
|---|---|---|
| Rủi ro, bằng chứng, gian lận | ISA 315 (Revised 2019), ISA 500, ISA 240 (Revised) — Sổ tay IAASB miễn phí; VSA 315/500/505/520 theo TT 214/2012 | Một trang: "5 câu một kiểm toán viên sẽ hỏi về dữ liệu MIMI" |
| Thử nghiệm bút toán | ICAEW — journals testing và công cụ tự động (link mục 1.1) | Danh mục thử nghiệm B5 bản nháp |
| Khuôn dữ liệu kiểm toán | AICPA Audit Data Standards (GL, O2C, P2P); OECD SAF-T 2.0 guidance | Bảng ánh xạ cột MIMI → ADS |
| Chế độ kế toán mới | TT 152/2025 (hộ), TT 133/2016, TT 99/2025; Luật Kế toán Điều 41 | Mẫu sổ hộ kinh doanh MIMI phải khớp |
| Hoá đơn | NĐ 123/2020 + NĐ 70/2025, TT 32/2025, QĐ 1450 + 1510 (đặc tả XML) | Một tệp XML thật đã phân tích trường |
| Thuế hộ kinh doanh | NĐ 68/2026, NĐ 141/2026, Luật 108/2025 | Dòng thời gian thay đổi luật 2026 cho B4 |
| Kỹ thuật | RFC 6962 (Merkle, inclusion proof); OpenTimestamps; Nigrini, *Forensic Analytics* chương 3–4 | Bản thiết kế gói bằng chứng B1 |

Việc song song: **đặt lịch 3 buổi 45 phút** với (a) 2 kế toán dịch vụ đang lo hộ kinh doanh, (b) 1
kiểm toán viên hoặc trưởng nhóm của một hãng kiểm toán tầm trung (danh sách công ty kiểm toán được chấp
thuận công khai trên trang Bộ Tài chính / VACPA). Câu hỏi: *"Nếu khách đưa anh/chị gói này, anh/chị còn
phải làm gì nữa mới dùng được?"* — **không chào bán, không xin hợp tác**.

### Tuần 3–5 — Dựng B2 (tính đầy đủ sao kê)

- Mã băm tệp gốc, số dư đầu/cuối vào `sao_ke_nhap`; hàm thuần cuộn số dư + hợp khoảng ngày; bảng độ phủ;
  thẻ trên Tổng quan.
- Bộ ca 200 lỗi chèn giả trên tệp của ≥ 5 ngân hàng.
- **Kiểm với người:** 2 kế toán dịch vụ nhập sao kê của một khách thật (có đồng ý) — ghi lại mỗi lần
  MIMI nói "thiếu" có đúng không. Câu phản hồi `sao_ke_khop` (`docs/DONG_VONG_PHAN_HOI.md`) là thước đo.

### Tuần 5–9 — Dựng B1 (đồ thị bằng chứng + gói tự kiểm)

- Mở rộng `so_cai_chung_tu.loai` cho `transactions`, `quyet_dinh_chung_tu`, `transaction_labels`, tờ
  khai nháp; bảng cạnh đồ thị; bằng chứng bao hàm Merkle; xuất gói; bộ kiểm độc lập.
- Thử 1.000 đột biến; đo thời gian sinh gói.
- **Kiểm với người:** đưa kiểm toán viên tầm trung một gói của **công ty demo có nhãn dữ liệu thử**
  (không dùng dữ liệu khách khi chưa có đồng ý). Đo: số mẫu trong 25 mẫu họ truy được không cần hỏi,
  thời gian, và danh sách "còn thiếu gì". Ghi nguyên văn vào `docs/`.

### Tuần 8–12 — Dựng B4 (thuế có phiên bản)

- Chuyển hằng số thuế thành dữ liệu có hiệu lực; hàm tính theo hai trục thời gian; ca NĐ 68 → NĐ 141;
  báo cáo tờ khai bị ảnh hưởng.
- **Kiểm với người:** một người có chứng chỉ hành nghề dịch vụ làm thủ tục về thuế (hoặc kế toán dịch vụ
  lâu năm) rà 20 kết luận ngẫu nhiên, ký tên vào biên bản rà.

### Việc nền chạy suốt 90 ngày (rẻ, không chờ)

- Đưa test RLS chéo công ty vào CI (bước đầu của B7).
- Viết **thư góp ý công khai** gửi IAASB về dự thảo ISA 330/500/520 (hạn 15/12/2026): chủ đề "bằng chứng
  số của doanh nghiệp siêu nhỏ tại thị trường mới nổi — dữ liệu ngân hàng qua quyền đọc của khách và chuỗi
  băm có neo thời gian". Đây là dấu vết chuyên môn công khai, kiểm chứng được, không phải tự nhận.
- Cột `currency` cho `transactions` và `invoices` trước khi có thêm dữ liệu thật.

### Cổng kiểm cuối ngày 90 — chỉ tính cái đo được

| Chỉ số | Đạt khi |
|---|---|
| Hộ kinh doanh thật dùng B2 | ≥ 5 hộ có ít nhất 1 tài khoản-tháng được chứng minh `du` |
| Kiểm toán viên ngoài thực hiện lại | ≥ 20/25 mẫu truy được không hỏi đội MIMI |
| Thử làm giả | 1.000/1.000 bị phát hiện |
| Thuế có phiên bản | Ca NĐ 68 → NĐ 141 tái tạo đúng; 0 kết luận sai căn cứ trên 20 mẫu được rà |
| Lời nói ra ngoài | 0 câu tiếp thị chưa kiểm (không "chuẩn Big 4", không "được kiểm toán công nhận", không "SAF-T") |

**Nếu đạt:** mới là lúc xin gặp Deal Advisory hoặc Tax của một hãng Big 4 — mang theo biên bản rà của
kiểm toán viên tầm trung và gói bằng chứng, hỏi họ *đúng một câu*: "gói này tiết kiệm cho anh/chị bước nào
trong một thương vụ / một hồ sơ thuế hộ kinh doanh?" **Nếu không đạt:** sửa theo biên bản rà, không đổi
câu chuyện.

---

## 5. Danh sách nguồn (gộp)

Chuẩn mực quốc tế:
[IAASB ISA 315 R2019 — giới thiệu](https://www.ifac.org/_flysystem/azure-private/publications/files/IAASB-Introduction-to-ISA-315.pdf) ·
[ICAEW ISA 315 và IT](https://www.icaew.com/technical/audit-and-assurance/audit/risk-assessment-internal-control-and-response/isa-315-the-entitys-it-systems-and-related-risks) ·
[IAASB dự thảo ISA 330/500/520 (08/2026)](https://www.iaasb.org/publications/proposed-revisions-audit-evidence-risk-response-isa-330-isa-500-isa-520) ·
[IAASB ISA 240 (Revised)](https://www.iaasb.org/publications/isa-240-revised-auditor-s-responsibilities-relating-fraud-audit-financial-statements) ·
[IAASB thông cáo ISA 240 (07/2025)](https://www.iaasb.org/news-events/2025-07/iaasb-revises-fraud-standard-enhance-public-trust) ·
[ICAEW thử nghiệm bút toán](https://www.icaew.com/technical/audit-and-assurance/audit/risk-assessment-internal-control-and-response/journals-testing-meeting-isa-240-and-the-role-of-automated-software-tools) ·
[IAASB ISAE 3402](https://www.iaasb.org/publications/staff-overview-international-standard-assurance-engagements-isae-3402-assurance-reports-controls) ·
[AICPA TSC 2017 (2022)](https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022) ·
[AICPA ADS — GL](https://www.aicpa-cima.com/resources/download/general-ledger-standard-audit-data-standards) ·
[AICPA ADS — O2C](https://www.aicpa-cima.com/resources/download/order-to-cash-subledger-standard-audit-data-standards) ·
[AICPA ADS — P2P](https://www.aicpa-cima.com/resources/download/procure-to-pay-subledger-standard-audit-data-standards) ·
[OECD SAF-T 2.0](https://web-archive-storage.oecd.org/aemint-web-archive-prod/web-archive/cc/ccd3b76ffdaf3c1f3e185a390dba41be2876b0e826925278bbb3e62ad37442bf.pdf)

Việt Nam — kiểm toán, kế toán:
[VNAA — VSA theo TT 214/2012](https://vnaa.com.vn/he-thong-367-chuan-muc-kiem-toan-viet-nam) ·
[VSA 500](https://docs.kreston.vn/vbpl/kiem-toan/chuan-muc-kiem-toan/vsa-500/) ·
[VSA 505](https://docs.kreston.vn/vbpl/kiem-toan/chuan-muc-kiem-toan/vsa-505/) ·
[VSA 520](https://docs.kreston.vn/vbpl/kiem-toan/chuan-muc-kiem-toan/vsa-520/) ·
[Đối tượng bắt buộc kiểm toán (Kreston)](https://kreston.vn/cac-doi-tuong-bat-buoc-phai-kiem-toan-theo-phap-luat-viet-nam/) ·
[Bộ Tài chính — hỏi đáp](https://portal.mof.gov.vn/hoidapcstc/home/cthoidap/157710) ·
[Luật 56/2024/QH15](https://vanban.chinhphu.vn/?classid=1&docid=212484&orggroupid=1&pageid=27160) ·
[TT 99/2025](https://thuvienphapluat.vn/ma-so-thue/phap-luat-thue/tong-hop-diem-moi-thong-tu-992025ttbtc-thay-the-thong-tu-200-che-do-ke-toan-doanh-nghiep-213879.html) ·
[TT 99 và TT 133](https://thuvienphapluat.vn/ma-so-thue/phap-luat-thue/thong-tu-992025-co-thay-the-thong-tu-1332016-che-do-ke-toan-doanh-nghiep-nho-va-vua-213873.html) ·
[TT 152/2025](https://thuvienphapluat.vn/van-ban/Ke-toan-Kiem-toan/Thong-tu-152-2025-TT-BTC-huong-dan-ke-toan-cho-cac-ho-kinh-doanh-680351.aspx) ·
[Thời hạn lưu trữ (IFA, thứ cấp)](https://ifa.com.vn/vi/thoi-han-luu-tru-chung-tu-ke-toan)

Việt Nam — hoá đơn, thuế, dữ liệu:
[NĐ 70/2025 (Báo Chính phủ)](https://baochinhphu.vn/nhung-noi-dung-moi-cua-nghi-dinh-so-70-2025-nd-cp-ve-hoa-don-chung-tu-102250903091616929.htm) ·
[TT 32/2025 (Expertis)](https://expertis.vn/van-ban/thong-tu-32-2025-tt-btc/) ·
[QĐ 1450/QĐ-TCT](https://thuvienphapluat.vn/van-ban/Thue-Phi-Le-Phi/Quyet-dinh-1450-QD-TCT-2021-thanh-phan-chua-du-lieu-nghiep-vu-hoa-don-dien-tu-490526.aspx) ·
[Luật 108/2025/QH15 (Công báo)](https://congbao.chinhphu.vn/van-ban/luat-so-108-2025-qh15-468670.htm) ·
[NĐ 68/2026](https://vanban.chinhphu.vn/?pageid=27160&docid=217111) ·
[NĐ 141/2026](https://baochinhphu.vn/chinh-thuc-nang-nguong-chiu-thue-voi-ho-kinh-doanh-len-01-ty-dong-nam-ap-dung-tu-1-1-2026-102260429185517215.htm) ·
[NĐ 117/2025](https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=178299) ·
[Luật 91/2025/QH15](https://thuvienphapluat.vn/van-ban/Bo-may-hanh-chinh/Luat-Bao-ve-du-lieu-ca-nhan-2025-so-91-2025-QH15-625628.aspx) ·
[NĐ 356/2025](https://thuvienphapluat.vn/van-ban/Quyen-dan-su/Nghi-dinh-356-2025-ND-CP-huong-dan-Luat-Bao-ve-du-lieu-ca-nhan-687428.aspx) ·
[NĐ 53/2022](https://english.luatvietnam.vn/decree-no-53-2022-nd-cp-dated-august-15-2022-of-the-government-detailing-a-number-of-articles-of-the-law-on-cyber-security-228170-doc1.html)

Kỹ thuật, phân tích:
[EY Helix](https://www.ey.com/en_gl/services/audit/technology/helix) ·
[AAA — nền tảng phân tích kiểm toán](https://publications.aaahq.org/cia/article/19/1/A1/13004/Data-Driven-Audits-Audit-Analytic-Platforms-and) ·
[Nigrini — Forensic Analytics ch.3](https://www.oreilly.com/library/view/forensic-analytics-2nd/9781119585763/c03.xhtml) ·
[Cerqueti & Lupi — Benford (arXiv)](https://arxiv.org/pdf/2202.05237) ·
[RFC 6962](https://www.rfc-editor.org/rfc/rfc6962) ·
[OpenTimestamps](https://opentimestamps.org)

**Điều tài liệu này KHÔNG khẳng định:** không có con số thị trường nào; không có khách, đối tác, chứng
nhận nào của MIMI; không khẳng định Big 4 nào quan tâm tới MIMI. "Proof of cash" là thuật ngữ thực hành
thẩm định tài chính, dùng ở đây để gọi tên việc, không trích dẫn một chuẩn mực.
