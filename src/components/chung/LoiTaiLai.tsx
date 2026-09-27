import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * "Chưa tải được — thử lại" (27/09/2026, rà lỗi im lặng Go-Live mục 27).
 *
 * Trước đây nhiều danh sách đọc máy chủ rồi bỏ qua `error`: mạng chập chờn là người dùng thấy
 * "Chưa có tài khoản nào được liên kết" / "Chưa có hoá đơn" — một câu SAI, và có thể đẩy họ làm lại
 * việc đã làm (liên kết ngân hàng lần hai). Lỗi thì phải nói là lỗi, và cho thử lại tại chỗ.
 */
export function LoiTaiLai({ cau, thuLai, className = '' }: { cau: string; thuLai?: () => void; className?: string }) {
  return (
    <div role="alert" className={`flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-foreground ${className}`}>
      <AlertTriangle size={14} className="shrink-0 text-amber-600" />
      <span className="flex-1">{cau}</span>
      {thuLai && (
        <button onClick={thuLai} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          <RefreshCw size={12} /> Thử lại
        </button>
      )}
    </div>
  );
}
