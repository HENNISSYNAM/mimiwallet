// Sinh cặp khoá Ed25519 THẬT cho Orchestrator (ký) ↔ Cloud Agent Runtime (kiểm). Xem docs/CLOUD_AGENT_RUNTIME.md.
//
//   node scripts/sinh-khoa-runtime.mjs          → in khoá công khai, ghi khoá riêng ra .env.runtime.local
//   node scripts/sinh-khoa-runtime.mjs --ghi    → như trên + ghi khoá công khai vào cloud-runtime/khoa.ts
//
// Sau đó: npx supabase secrets set --env-file .env.runtime.local   (rồi XOÁ tệp đó khỏi máy nếu không cần giữ)
//
// Vì sao khoá riêng ra tệp chứ không in ra màn hình: màn hình hay bị chụp/dán vào chat; tệp `.env.runtime.local` khớp
// mẫu `*.local` trong .gitignore nên không bị commit. Không ghi đè tệp đã có — đổi khoá là việc cố ý, xoá tệp cũ trước.
import { webcrypto } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const goc = join(dirname(fileURLToPath(import.meta.url)), '..');
const tepEnv = join(goc, '.env.runtime.local');
const tepKhoa = join(goc, 'cloud-runtime', 'khoa.ts');

if (existsSync(tepEnv)) {
  console.error(`Đã có ${tepEnv} — không ghi đè. Xoá tệp đó trước nếu thật sự muốn đổi khoá.`);
  process.exit(1);
}

const cap = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
const congKhai = Buffer.from(await webcrypto.subtle.exportKey('raw', cap.publicKey)).toString('base64url');
const rieng = Buffer.from(await webcrypto.subtle.exportKey('pkcs8', cap.privateKey)).toString('base64url');

writeFileSync(tepEnv, `# Khoá riêng Orchestrator — KHÔNG commit, KHÔNG dán vào chat.\nMIMI_RUNTIME_PRIVATE_KEY=${rieng}\n`, { mode: 0o600 });
console.log(`Khoá riêng (PKCS8 base64url) đã ghi vào ${tepEnv}`);
console.log(`Khoá công khai (raw base64url): ${congKhai}`);

if (process.argv.includes('--ghi')) {
  const cu = readFileSync(tepKhoa, 'utf8');
  const moi = cu.replace(/export const KHOA_CONG_KHAI_ORCHESTRATOR = '[^']*';/, `export const KHOA_CONG_KHAI_ORCHESTRATOR = '${congKhai}';`);
  if (moi === cu) {
    console.error('Không tìm thấy dòng KHOA_CONG_KHAI_ORCHESTRATOR trong cloud-runtime/khoa.ts — dán tay.');
    process.exit(1);
  }
  writeFileSync(tepKhoa, moi);
  console.log('Đã ghi khoá công khai vào cloud-runtime/khoa.ts.');
} else {
  console.log("Dán khoá công khai vào cloud-runtime/khoa.ts (KHOA_CONG_KHAI_ORCHESTRATOR), hoặc chạy lại với --ghi.");
}
console.log('Tiếp: npx supabase secrets set --env-file .env.runtime.local');
