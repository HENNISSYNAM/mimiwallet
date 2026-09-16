/**
 * Hệ luật thuế phía giao diện — nhập lại đúng một bản mã dùng chung với edge function `to-khai`,
 * để màn hình và máy chủ không bao giờ nói hai điều khác nhau về cùng một quy định.
 */
export * from '../../supabase/functions/_shared/luat/he-luat.ts';
export * from '../../supabase/functions/_shared/luat/to-khai.ts';
export type { CanCuDaKiem } from '../../supabase/functions/_shared/luat/doc-can-cu.ts';
