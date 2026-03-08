export const formatVND = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
};

export const formatVNDShort = (amount: number): string => {
  if (amount >= 1_000_000_000_000) return `₫${(amount / 1_000_000_000_000).toFixed(1)}T`;
  if (amount >= 1_000_000_000) return `₫${(amount / 1_000_000_000).toFixed(1)} tỷ`;
  if (amount >= 1_000_000) return `₫${(amount / 1_000_000).toFixed(0)}M`;
  return formatVND(amount);
};

export const formatNumber = (n: number): string => {
  return new Intl.NumberFormat('vi-VN').format(n);
};

export const formatPercent = (n: number): string => `${n.toFixed(1)}%`;

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatDateShort = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};
