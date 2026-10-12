#!/usr/bin/env bash
# Triển khai đợt 10–12/10/2026 lên production — CHỦ DỰ ÁN CHẠY (hệ thống quyền của Claude Code chặn trợ lý tự áp).
# Chạy từ thư mục gốc repo:  bash scripts/trien-khai-2026-10-12.sh
# Thứ tự bắt buộc: migration → function → đẩy code web. Function mới đọc cột/bảng mới; web mới gọi hành động mới.
set -euo pipefail
REF=xzymxgdavepvygdcmfup

echo "== 1. Áp 5 migration (điền hộ, luật agent khung giờ/trần người nhận, sổ xu + mua xu, mẫu 05/KK-TNCN, câu trả lời nghĩa vụ + ngành)"
npx supabase db push --linked --dry-run
read -r -p "Đúng 5 migration ở trên? Gõ y để áp: " ok; [ "$ok" = "y" ] || exit 1
npx supabase db push --linked

echo "== 2. Triển khai 11 function bị ảnh hưởng (đã dò theo đồ thị import)"
for fn in to-khai tro-ly tac-tu tax-summary subscription-billing bank-webhook cas-webhook thong-bao mcp bank-link sao-ke; do
  npx supabase functions deploy "$fn" --project-ref "$REF"
done

echo "== 3. (Tuỳ chọn) bật điền hộ cho riêng công ty thử: npx supabase secrets set DIEN_CONG_ENABLED=<id công ty> --project-ref $REF"

echo "== 4. Gỡ 3 function không còn ai gọi (code đã xoá khỏi repo)"
npx supabase functions delete macro-news --project-ref "$REF" || true
npx supabase functions delete elevenlabs-tts --project-ref "$REF" || true
npx supabase functions delete ai-trung-gian --project-ref "$REF" || true

echo "== 5. Đẩy code web (Vercel tự triển khai khi lên main)"
git push origin main

echo "Xong. Kiểm nhanh: mở www.mimiwallet.online → Cài đặt (Năng lượng MIMI, Nạp thêm xu), Tờ khai (tab Thuế TNCN), Nhắc thuế (Hồ sơ nghĩa vụ), Kiểm soát agent (/taoagent)."
