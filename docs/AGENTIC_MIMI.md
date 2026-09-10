# Agentic MIMI Wallet — lớp kiểm soát tài chính cho doanh nghiệp chạy bằng AI

> *The financial control layer for AI-powered businesses.*
> Bắt đầu 10/09/2026. Tài liệu này là hợp đồng giữa MIMI và agent gọi vào MIMI.

## Một câu

Agent của doanh nghiệp **xin** chi qua MIMI; MIMI **xét** theo chính sách chủ doanh nghiệp đặt,
**hỏi người** khi cần, **dựng lệnh trả** VietQR, và **đối soát sao kê** để biết tiền đã đi thật.
Mọi bước nằm trong một nhật ký chỉ thêm.

## Ranh giới không vượt

| MIMI làm | MIMI không làm |
|---|---|
| Xét, duyệt, từ chối theo luật tất định | Giữ tiền, lưu "số dư" |
| Dựng lệnh trả VietQR có mã tham chiếu | Tự chuyển tiền |
| Đọc sao kê để xác nhận đã chi | Đánh dấu "đã chi" khi chưa thấy sao kê |
| Ghi nhật ký mọi quyết định | Sửa hay xoá nhật ký |

Giữ hoặc chuyển tiền hộ khách cần giấy phép trung gian thanh toán (Nghị định 52/2024/NĐ-CP).
Khi có đối tác ngân hàng với API **Payment Initiation**, bước "người trả bằng app" được thay
bằng lệnh gửi thẳng ngân hàng — bộ luật, nhật ký và đối soát giữ nguyên.

## Vòng đời một khoản chi

```
agent xin_chi ──► dang_xet ──► tu_choi                 (vượt trần, sai nhóm, người lạ bị chặn…)
                          ├──► cho_duyet ──► da_duyet  (chủ doanh nghiệp bấm Duyệt)
                          │              └─► tu_choi / huy
                          └──► da_duyet ─────────────► da_chi   (sao kê SePay khớp mã tham chiếu)
                                          └─► huy
```

- **Ghi trước, xét sau.** Yêu cầu được ghi ở `dang_xet` rồi mới đọc tổng hạn mức đã giữ
  (gồm `dang_xet`, `cho_duyet`, `da_duyet`, `da_chi`). Hai yêu cầu đồng thời không cùng lọt trần.
- **Từ chối thắng chờ duyệt.** Vượt trần không được đẩy sang người duyệt.
- **Mặc định chặt.** Agent mới: mọi khoản phải duyệt, chỉ chi cho người nhận trong danh sách.
- **Thu hồi là vĩnh viễn** và huỷ mọi khoản chưa trả của agent đó.

## API cho agent

`POST https://xzymxgdavepvygdcmfup.supabase.co/functions/v1/tac-tu`
Header: `x-mimi-agent-key: mimi_ak_…` · `Content-Type: application/json`

### `xem_chinh_sach`
```json
{ "hanh_dong": "xem_chinh_sach" }
```
Trả `chinh_sach`, `han_muc_con_lai { moi_lan, ngay, thang }`, `nhom_chi`. Agent nên hỏi trước khi xin.

### `xin_chi`
```json
{
  "hanh_dong": "xin_chi",
  "so_tien": 500000,
  "ngan_hang_bin": "970422",
  "so_tai_khoan": "0123456789",
  "ten_nguoi_nhan": "CONG TY ABC",
  "nhom_chi": "ha_tang_ai",
  "muc_dich": "Nạp tiền API mô hình tháng 9",
  "so_hoa_don": "00001234",
  "ma_yeu_cau": "don-2026-09-001"
}
```
- `nhom_chi`: `ha_tang_ai` · `phan_mem` · `quang_cao` · `nha_cung_cap` · `van_chuyen` · `khac`
- `ma_yeu_cau`: khoá chống trùng. Gửi lại cùng giá trị → nhận lại yêu cầu cũ, `trung_lap: true`.
- HTTP 200 khi `cho_duyet` hoặc `da_duyet`; 422 khi `tu_choi`.

Kết quả luôn có `ly_do: [{ ma, cau }]`. Mã:

| Mã | Nghĩa | Agent nên |
|---|---|---|
| `TRONG_CHINH_SACH` | Tự duyệt | Chuyển `lenh_tra` cho người trả |
| `TREN_NGUONG_DUYET`, `NGUOI_NHAN_MOI` | Chờ người | Hỏi lại sau bằng `xem_yeu_cau` |
| `VUOT_HAN_MUC_MOI_LAN/NGAY/THANG` | Vượt trần | Giảm số tiền hoặc chờ kỳ sau |
| `NGUOI_NHAN_CHUA_DUYET` | Người lạ bị chặn | Báo chủ doanh nghiệp thêm người nhận |
| `NHOM_CHI_KHONG_DUOC_PHEP`, `NHOM_CHI_KHONG_RO` | Sai nhóm | Sửa `nhom_chi` |
| `THIEU_MUC_DICH`, `SO_TIEN_KHONG_HOP_LE`, `NGAN_HANG_KHONG_RO`, `SO_TAI_KHOAN_KHONG_HOP_LE` | Sai dữ liệu | Sửa rồi gửi lại |
| `TAC_TU_TAM_DUNG`, `TAC_TU_DA_THU_HOI`, `CHINH_SACH_HET_HAN` | Bị khoá | Dừng, báo người |
| `NGUOI_DUYET_TU_CHOI` | Người từ chối | Đọc `cau`, không gửi lại y nguyên |

Khi `trang_thai = "da_duyet"`, `lenh_tra` chứa BIN, số tài khoản, số tiền và
`noi_dung_chuyen_khoan` (mã `MIMIxxxxxx`). Nội dung phải giữ nguyên thì sao kê mới tự xác nhận.

### `xem_yeu_cau`
```json
{ "hanh_dong": "xem_yeu_cau", "ma_yeu_cau": "don-2026-09-001" }
```
`trang_thai = "da_chi"` kèm `da_chi { giao_dich_id, so_tien, luc }` là bằng chứng từ sao kê.

## Dữ liệu

`tac_tu` · `chinh_sach_chi` · `nguoi_nhan_duoc_phep` · `yeu_cau_chi` · `nhat_ky_tac_tu`
(migration `20260911090000_tac_tu_kiem_soat_chi.sql`). Người dùng chỉ **đọc** qua RLS; mọi ghi
đi qua edge function. Khoá agent chỉ lưu SHA-256. Nhật ký có trigger chặn UPDATE.

## Mã nguồn

| Phần | File | Test |
|---|---|---|
| Bộ luật | `supabase/functions/_shared/tac-tu/chinh-sach.ts` | `chinh-sach.test.ts` |
| Khớp sao kê | `_shared/tac-tu/khop-chi.ts`, nối DB ở `doi-soat.ts` | `khop-chi.test.ts` |
| Khoá | `_shared/tac-tu/khoa.ts` | `khoa.test.ts` |
| Cổng | `supabase/functions/tac-tu/index.ts` | — |
| Đối soát sau webhook | `supabase/functions/bank-webhook/index.ts` | — |
| Màn hình | `src/pages/TacTuPage.tsx` (`/dashboard/tac-tu`) | — |

## Chưa làm — theo thứ tự nên làm

1. **MCP server** bọc ba hành động của agent, để Claude / ChatGPT / Cursor gọi MIMI không cần viết HTTP.
2. **Đối soát trên đường Cas** (`bank-link` sync) — hiện chỉ chạy sau webhook SePay.
3. **Chi không qua MIMI**: tiền ra tới nhà cung cấp AI (OpenAI, Anthropic, Google…) mà không có yêu cầu
   nào → cảnh báo. Đây là phần "nhìn thấy chi tiêu AI" mà Ramp ra mắt 16/07/2026.
4. **Gắn chứng từ**: khoản `da_chi` có `so_hoa_don` → khớp với `gdt_invoices` ở trang Chứng từ.
5. **Payment Initiation** qua ngân hàng đối tác — bỏ bước người trả tay.
6. Gỡ M2M cũ (`device_wallets` có cột `balance` không có tiền thật đứng sau) khi trang này chạy thật.
