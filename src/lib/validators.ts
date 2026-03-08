import { z } from 'zod';

export const emailSchema = z.string().trim().email('Email không hợp lệ').max(255);

export const phoneSchema = z.string().regex(/^0\d{9}$/, 'Số điện thoại không hợp lệ (VD: 0912345678)');

export const taxIdSchema = z.string().regex(/^\d{10}$/, 'Mã số thuế phải có 10 chữ số');

export const passwordSchema = z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự');

export const companyNameSchema = z.string().trim().min(2, 'Tên công ty quá ngắn').max(200);

export const getPasswordStrength = (pw: string): number => {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
};
