// Phục vụ biểu mẫu thử tại http://127.0.0.1:47380/ (chỉ máy này) để chạy trọn luồng từ giao diện MIMI.
// Chạy: node helper/thu/phuc-vu.mjs   — mở http://127.0.0.1:47380/?mst=<MST trong hồ sơ MIMI>
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'bieu-mau-thu.html'));
http.createServer((_q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); })
  .listen(47380, '127.0.0.1', () => console.log('Biểu mẫu thử: http://127.0.0.1:47380/?mst=<MST hồ sơ>'));
