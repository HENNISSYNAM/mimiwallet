# Prompt tạo ảnh cho deck pitch MIMI (GPT Image / ChatGPT)

Deck: https://claude.ai/artifact/9brbB2582evbvMpgDq2Sqz — 20 slide, bảng màu cố định:

| Vai trò | Mã màu |
|---|---|
| Nền tối (mực) | #13211C |
| Nền sáng (giấy) | #F6F2E9 |
| Cam MIMI | #E07B24 |
| Xanh lá | #1E7A55 |

## Ba luật để ảnh được cộng điểm, không bị trừ

1. **Ảnh minh hoạ, không phải ảnh thật.** Không tạo ảnh "khách hàng", "đám đông người dùng", "lễ ký kết", "giải thưởng" hay ảnh chụp màn hình giả.
   - Stick 'Em được điểm vì ảnh của họ là thật.
   - Giám khảo hỏi "đây là khách của bạn à?" mà ảnh là AI thì mất điểm phần *Validation* và *Team*.
   - Ảnh người thật (đội, khách chạy thử) phải là ảnh chụp thật.
2. **Không chữ, không logo trong ảnh.** Chữ trên slide do deck lo. GPT hay viết sai chữ tiếng Việt, và logo thật (ngân hàng, MISA…) có thể vi phạm nhãn hiệu.
3. **Một phong cách cho cả bộ.** Dán nguyên đoạn **STYLE** dưới đây vào đầu MỌI prompt.

## STYLE (dán vào đầu mọi prompt)

```
Warm flat editorial illustration with subtle paper grain and soft risograph texture, bold simple shapes, gentle shadows, no outlines heavier than 2px. Strict palette: deep ink green #13211C, warm paper #F6F2E9, MIMI orange #E07B24, leaf green #1E7A55, plus at most one muted neutral. Modern Vietnamese everyday setting, optimistic and calm, not cartoonish-childish. Absolutely no text, no letters, no numbers, no logos, no brand names, no watermarks, no UI screenshots.
```

## Nhân vật mèo MIMI (giữ giống nhau giữa các ảnh)

Tạo ảnh **D** trước, rồi dùng chính ảnh đó làm ảnh tham chiếu ("use this exact cat") cho ảnh **G** và mọi ảnh có mèo.

```
MIMI the mascot: a friendly orange tabby cat (#E07B24 fur with darker stripes), round green eyes, small white muzzle, wears a tiny leaf-green (#1E7A55) scarf, upright confident posture, clever and kind expression.
```

---

## A. Bìa — slide 1 (bên phải, thay khối màu)
**Cỡ:** 1024×1536 (dọc). **Đặt tại:** x 1376→1920, phủ hết chiều cao.
```
[STYLE] [MIMI]. Portrait composition. A small Vietnamese household shop at dusk — a corner grocery with stacked goods and a hanging lamp. The middle-aged female shop owner smiles at her phone at the counter; MIMI the cat sits on the counter beside a neat stack of receipts, one paw on them, as if it has just sorted them. Warm orange lamplight against a deep ink-green evening sky. Leave the bottom 15% calm and uncluttered.
```

## B. Vì sao lúc này — slide 2 (nửa phải)
**Cỡ:** 1536×1024 (ngang). **Đặt tại:** nửa phải, bo góc 32px.
```
[STYLE]. Wide view of a lively Vietnamese street of household businesses in the morning: a phở stall, a phone-repair kiosk, a tailor, a fruit shop with tube-house façades and motorbikes parked in front. On every shop counter there is a smartphone lying face-down, hinting that the business now runs from a phone. Calm, hopeful, slightly elevated viewpoint. No signs with readable text.
```

## C1. Vấn đề 01 "Tiền vào ≠ doanh thu" — slide 5, thẻ trái
**Cỡ:** 1024×1024. **Đặt tại:** góc trên phải của thẻ, 240×240.
```
[STYLE]. Simple icon-like scene on warm paper background: one bank-transfer envelope splitting into four colored streams — a shopping bag (sales), a house with a heart (family money), a bank building (loan), a returning arrow (refund). Only the shopping-bag stream glows orange; the others are muted green. Centered, generous empty space.
```

## C2. Vấn đề 02 "Thuê kế toán đắt" — slide 5, thẻ phải
**Cỡ:** 1024×1024. **Đặt tại:** góc trên phải của thẻ, 240×240.
```
[STYLE]. Simple icon-like scene on warm paper background: a tired shop owner at night under a desk lamp, buried in a tall pile of paper receipts and a calculator, a clock on the wall showing late hours. Mood: overwhelmed but sympathetic, not dramatic. Centered, generous empty space.
```

## D. "MIMI changes that" — slide 6 (góc phải dưới, thay khối tối)
**Cỡ:** 1024×1024, **nền trong suốt** (yêu cầu transparent background, PNG).
```
[STYLE] [MIMI]. Full-body MIMI the cat standing on a stack of neatly squared receipts, holding a glowing leaf-green check-mark shape like a badge, looking at the viewer with a confident smile. Transparent background, no ground shadow beyond a soft ellipse.
```

## E. Hai mảnh của giải pháp — slide 7 (tuỳ chọn, trên đầu mỗi thẻ)
**Cỡ:** 1024×1024 × 2 ảnh, **nền trong suốt**.
```
E1: [STYLE] [MIMI]. A shop owner holding a phone while MIMI the cat, perched on her shoulder, points at the screen. Transparent background, waist-up, friendly.
E2: [STYLE] [MIMI]. An accountant at a tidy desk with one laptop showing many small client cards (abstract shapes only), MIMI the cat sitting beside the laptop sorting cards. Transparent background.
```

## F. Mở rộng ASEAN và Hàn Quốc — slide 16 (nền, mờ 25%, phía sau thẻ)
**Cỡ:** 1536×1024.
```
[STYLE]. Stylized minimal map of Southeast Asia and the Korean peninsula drawn as soft leaf-green landmasses on deep ink-green sea. Vietnam glows orange. Thin orange dotted arcs fly from Vietnam to Korea, Indonesia, the Philippines and Thailand. No country names, no borders text, very simple shapes, lots of negative space.
```

## G. Kết — slide 20 (góc phải trên, thay khối xanh)
**Cỡ:** 1024×1024, **nền trong suốt**.
```
[STYLE] [MIMI]. MIMI the cat waving goodbye with one paw, the other paw holding a small shop-key with a leaf charm, warm smile. Transparent background.
```

---

## KHÔNG tạo bằng AI

| Slide | Cần gì |
|---|---|
| 9 (What an owner sees) | Đã có ảnh chụp thật của sản phẩm. Giữ nguyên. |
| 11 (traction) | Ảnh thật của đợt chạy thử nếu có, kèm đồng ý của khách. Không có thì để trống. |
| 19 (đội ngũ) | Ảnh chân dung thật của từng thành viên, nền giống nhau (tường sáng hoặc nền giấy #F6F2E9). |

## Gửi ảnh lại cho Claude

- Lưu PNG vào `Downloads\MIMI ẢNH\pitch\`, đặt tên đúng mã: `A.png`, `B.png`, `C1.png`…
- Nhắn "đưa ảnh vào deck". Claude tải ảnh lên và đặt đúng chỗ ghi ở trên.
- Footer các slide có ảnh minh hoạ ghi thêm "Illustration".
