import { Fragment, type ReactNode } from 'react';

/**
 * Câu trả lời của mô hình hay có **chữ đậm** kiểu markdown. Hiện nguyên dấu sao trên màn hình (gặp thật khi quay
 * demo 16/10/2026) trông như lỗi. Chỉ nhận đúng cặp `**…**`: không dựng HTML từ chữ của mô hình, nên không có đường
 * nào chèn mã vào trang. Dấu sao lẻ còn lại giữ nguyên.
 */
export function ChuDam({ van }: { van: string }): ReactNode {
  const phan = van.split(/\*\*([^*\n][^*]*?)\*\*/g);
  return phan.map((p, i) => (i % 2 === 1 ? <strong key={i} className="font-semibold">{p}</strong> : <Fragment key={i}>{p}</Fragment>));
}

/** Cùng câu, bỏ cặp dấu sao — cho giọng đọc và chỗ chỉ nhận chữ thường. */
export const boDauSao = (van: string) => van.replace(/\*\*([^*\n][^*]*?)\*\*/g, '$1');
