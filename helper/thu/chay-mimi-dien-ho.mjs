// Chạy MIMI (vite dev) tại http://localhost:8081 với cờ VITE_DIEN_CONG=1, để thử điền hộ từ giao diện thật.
// Chạy: node helper/thu/chay-mimi-dien-ho.mjs
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const goc = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const p = spawn('npx', ['vite', '--port', '8081', '--strictPort'], { cwd: goc, stdio: 'inherit', shell: true, env: { ...process.env, VITE_DIEN_CONG: '1' } });
p.on('exit', (c) => process.exit(c ?? 0));
