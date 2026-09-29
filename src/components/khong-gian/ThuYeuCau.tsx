/**
 * "THỬ YÊU CẦU MIMI" (29/09/2026). Chỉ những câu bộ não MIMI hiểu được hôm nay (lấy từ `GOI_Y_THEO_NHOM`, có
 * test ý định) — bấm vào là ĐIỀN SẴN vào ô hỏi để người dùng xem lại rồi gửi, không chạy một việc giả.
 */
import type { NhomNangLuc } from '@/lib/troLy';

export const YEU_CAU_MAU: readonly { nhan: string; cau: string; nhom: NhomNangLuc }[] = [
  { nhan: 'Phân tích dòng tiền', cau: 'Dòng tiền 6 tháng qua thế nào?', nhom: 'ngan_hang' },
  { nhan: 'Tiền về khớp hoá đơn nào', cau: 'Tiền về tháng này khớp hoá đơn nào?', nhom: 'ngan_hang' },
  { nhan: 'Nghĩa vụ thuế năm nay', cau: 'Năm nay tôi có phải nộp thuế không?', nhom: 'chung_tu' },
  { nhan: 'Khoản chi thiếu chứng từ', cau: 'Khoản chi nào chưa có chứng từ?', nhom: 'chung_tu' },
  { nhan: 'Báo cáo thu chi', cau: 'Báo cáo thu chi 6 tháng', nhom: 'bao_cao' },
  { nhan: 'Phát hiện khoản trả trùng', cau: 'Có khoản nào bị trả trùng không?', nhom: 'bao_cao' },
];

export function ThuYeuCau({ onChon }: { onChon: (cau: string, nhom: NhomNangLuc) => void }) {
  return (
    <section aria-labelledby="thu-yeu-cau" className="mt-6">
      <h2 id="thu-yeu-cau" className="mb-2 text-sm font-medium text-muted-foreground">Thử yêu cầu MIMI</h2>
      <div className="flex flex-wrap gap-2">
        {YEU_CAU_MAU.map((y) => (
          <button key={y.cau} type="button" onClick={() => onChon(y.cau, y.nhom)}
            className="rounded-full border border-border/70 bg-card/80 px-3.5 py-1.5 text-sm text-foreground hover:border-primary/30 hover:bg-primary/5">
            {y.nhan}
          </button>
        ))}
      </div>
    </section>
  );
}
