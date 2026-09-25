/**
 * Người dùng không được thấy đường dẫn mã nguồn (25/09/2026: trang Fintech từng hiện
 * "Xem supabase/functions/_shared/pqcCrypto.ts."). Đường dẫn trong chú thích thì được; trong CHUỖI
 * hiển thị thì không. Test đọc mọi file giao diện, bỏ chú thích, rồi tìm dấu vết đường dẫn mã.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const GOC = join(__dirname, '..');

function tatCaFile(thuMuc: string): string[] {
  return readdirSync(thuMuc).flatMap((ten) => {
    const p = join(thuMuc, ten);
    if (statSync(p).isDirectory()) return tatCaFile(p);
    return /\.tsx$/.test(ten) && !/\.test\.tsx$/.test(ten) ? [p] : [];
  });
}

/** Bỏ chú thích khối, chú thích dòng và chú thích JSX; giữ nguyên chuỗi. */
const boChuThich = (s: string) =>
  s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');

const DAU_VET = /supabase\/functions|_shared\/|\bsrc\/(lib|pages|components)\/|[A-Za-z0-9_-]+\.(ts|tsx|sql)\b/;

describe('không lộ đường dẫn mã nguồn ra giao diện', () => {
  it('không chuỗi hiển thị nào chứa đường dẫn mã', () => {
    const lo: string[] = [];
    for (const f of tatCaFile(GOC)) {
      const ma = boChuThich(readFileSync(f, 'utf8'));
      ma.split('\n').forEach((dong, i) => {
        // Câu import là mã, không phải chữ hiển thị.
        if (/^\s*(import|export)\b|from ['"]/.test(dong)) return;
        const chuoi = dong.match(/(['"`])(?:(?!\1).)*\1|>[^<>{}]+</g) ?? [];
        if (chuoi.some((c) => DAU_VET.test(c))) lo.push(`${f.slice(GOC.length)}:${i + 1}: ${dong.trim().slice(0, 120)}`);
      });
    }
    expect(lo).toEqual([]);
  });
});
