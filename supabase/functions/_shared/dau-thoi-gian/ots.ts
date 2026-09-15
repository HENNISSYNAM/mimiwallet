/**
 * Đọc/ghi bằng chứng OpenTimestamps (.ots) — tự viết, không phụ thuộc gì.
 *
 * Thư viện JS chính thức (`opentimestamps` trên npm) kéo theo `request`, `fs`, bitcore — không
 * chạy được trong edge function. Định dạng đủ nhỏ để viết lại theo mã nguồn chuẩn
 * python-opentimestamps (đối chiếu 15/09/2026):
 *   - Tệp: HEADER_MAGIC, uint8 phiên bản 1, op băm tệp (0x08 = SHA256), 32 byte digest, dấu thời gian.
 *   - Dấu thời gian: chuỗi mục; mọi mục trừ mục cuối có tiền tố 0xff. Mục là chứng thực
 *     (0x00 + tag 8 byte + varbytes payload) hoặc op (tag + đối số) theo sau là dấu thời gian con.
 *   - Op: 0x08 SHA256, 0xf0 append(varbytes), 0xf1 prepend(varbytes).
 *   - varuint: LEB128 không dấu; varbytes: varuint độ dài + byte.
 *   - Chứng thực chờ: tag 83dfe30d2ef90c8e, payload = varbytes(uri).
 *   - Chứng thực Bitcoin: tag 0588960d73d71901, payload = varuint(chiều cao khối).
 *
 * File không import gì để Deno và vitest cùng dùng.
 */

const chu = (s: string) => Array.from(s, (c) => c.charCodeAt(0));

export const HEADER_MAGIC = new Uint8Array([
  0x00, ...chu('OpenTimestamps'), 0x00, 0x00, ...chu('Proof'), 0x00, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94,
]);
export const OP_SHA256 = 0x08;
export const OP_APPEND = 0xf0;
export const OP_PREPEND = 0xf1;
export const TAG_CHO = '83dfe30d2ef90c8e';
export const TAG_BITCOIN = '0588960d73d71901';
const DO_DAI_TOI_DA = 4096;
const DO_SAU_TOI_DA = 512;

export class LoiOts extends Error {}

export function sangHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export function tuHex(h: string): Uint8Array {
  if (!/^([0-9a-f]{2})*$/i.test(h)) throw new LoiOts('Chuỗi hex không hợp lệ.');
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function noi(...phan: (Uint8Array | number[])[]): Uint8Array {
  const tong = phan.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(tong);
  let o = 0;
  for (const p of phan) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export async function sha256(b: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', b));
}

export function ghiVaruint(n: number): number[] {
  if (!Number.isSafeInteger(n) || n < 0) throw new LoiOts('varuint phải là số nguyên không âm.');
  const out: number[] = [];
  do {
    let b = n % 128;
    n = Math.floor(n / 128);
    if (n > 0) b |= 0x80;
    out.push(b);
  } while (n > 0);
  return out;
}

export function docVaruint(b: Uint8Array, pos: number): { gt: number; pos: number } {
  let gt = 0;
  let nhan = 1;
  for (;;) {
    if (pos >= b.length) throw new LoiOts('Hết dữ liệu khi đọc varuint.');
    const x = b[pos++];
    gt += (x & 0x7f) * nhan;
    if (!(x & 0x80)) return { gt, pos };
    nhan *= 128;
    if (nhan > 2 ** 49) throw new LoiOts('varuint quá lớn.');
  }
}

export const ghiVarbytes = (d: Uint8Array) => noi(ghiVaruint(d.length), d);

// ── Cây Merkle ─────────────────────────────────────────────────────────────────
// Nút = SHA256(trái || phải). Số nút lẻ thì nút cuối được đẩy thẳng lên, không băm.

export async function cacTangMerkle(la: Uint8Array[]): Promise<Uint8Array[][]> {
  if (!la.length) throw new LoiOts('Cây Merkle cần ít nhất một lá.');
  const tang = [la];
  while (tang[tang.length - 1].length > 1) {
    const truoc = tang[tang.length - 1];
    const sau: Uint8Array[] = [];
    for (let j = 0; j < truoc.length; j += 2) {
      sau.push(j + 1 < truoc.length ? await sha256(noi(truoc[j], truoc[j + 1])) : truoc[j]);
    }
    tang.push(sau);
  }
  return tang;
}

/** Các op đưa lá thứ `i` lên gốc — dùng làm phần đầu của dấu thời gian trong tệp .ots. */
export function opTuLaLenGoc(tang: Uint8Array[][], i: number): Uint8Array {
  if (i < 0 || i >= tang[0].length) throw new LoiOts('Vị trí lá ngoài cây.');
  const ops: (Uint8Array | number[])[] = [];
  for (let t = 0; t < tang.length - 1; t++) {
    const nut = tang[t];
    if (i % 2 === 0) {
      if (i + 1 < nut.length) ops.push([OP_APPEND], ghiVarbytes(nut[i + 1]), [OP_SHA256]);
    } else {
      ops.push([OP_PREPEND], ghiVarbytes(nut[i - 1]), [OP_SHA256]);
    }
    i = Math.floor(i / 2);
  }
  return noi(...ops);
}

// ── Đọc dấu thời gian ──────────────────────────────────────────────────────────

export interface ChungThuc {
  tag: string;
  payload: Uint8Array;
  /** Thông điệp tại điểm chứng thực. Với Bitcoin: phải bằng merkle root của khối. */
  thongDiep: Uint8Array;
}

async function apDungOp(tag: number, b: Uint8Array, pos: number, msg: Uint8Array): Promise<{ kq: Uint8Array; pos: number }> {
  if (tag === OP_SHA256) return { kq: await sha256(msg), pos };
  if (tag === OP_APPEND || tag === OP_PREPEND) {
    const { gt: dai, pos: p } = docVaruint(b, pos);
    if (dai > DO_DAI_TOI_DA || p + dai > b.length) throw new LoiOts('Đối số op quá dài hoặc thiếu.');
    const doiSo = b.slice(p, p + dai);
    const kq = tag === OP_APPEND ? noi(msg, doiSo) : noi(doiSo, msg);
    if (kq.length > DO_DAI_TOI_DA) throw new LoiOts('Kết quả op quá dài.');
    return { kq, pos: p + dai };
  }
  throw new LoiOts(`Op 0x${tag.toString(16)} chưa hỗ trợ.`);
}

/** Đọc một dấu thời gian bắt đầu ở `pos`, áp lên `thongDiep`; trả mọi chứng thực gặp được. */
export async function docDauThoiGian(b: Uint8Array, thongDiep: Uint8Array, pos = 0, doSau = 0): Promise<{ pos: number; ds: ChungThuc[] }> {
  if (doSau > DO_SAU_TOI_DA) throw new LoiOts('Bằng chứng lồng quá sâu.');
  const ds: ChungThuc[] = [];
  for (;;) {
    if (pos >= b.length) throw new LoiOts('Hết dữ liệu giữa dấu thời gian.');
    let tag = b[pos++];
    let laMucCuoi = true;
    if (tag === 0xff) {
      laMucCuoi = false;
      if (pos >= b.length) throw new LoiOts('Hết dữ liệu sau 0xff.');
      tag = b[pos++];
    }
    if (tag === 0x00) {
      if (pos + 8 > b.length) throw new LoiOts('Tag chứng thực thiếu.');
      const t = sangHex(b.slice(pos, pos + 8));
      pos += 8;
      const { gt: dai, pos: p } = docVaruint(b, pos);
      if (dai > 8192 || p + dai > b.length) throw new LoiOts('Payload chứng thực quá dài hoặc thiếu.');
      ds.push({ tag: t, payload: b.slice(p, p + dai), thongDiep });
      pos = p + dai;
    } else {
      const op = await apDungOp(tag, b, pos, thongDiep);
      const con = await docDauThoiGian(b, op.kq, op.pos, doSau + 1);
      pos = con.pos;
      ds.push(...con.ds);
    }
    if (laMucCuoi) return { pos, ds };
  }
}

export function uriCho(c: ChungThuc): string | null {
  if (c.tag !== TAG_CHO) return null;
  const { gt: dai, pos } = docVaruint(c.payload, 0);
  return new TextDecoder().decode(c.payload.slice(pos, pos + dai));
}

export function chieuCaoBitcoin(c: ChungThuc): number | null {
  return c.tag === TAG_BITCOIN ? docVaruint(c.payload, 0).gt : null;
}

/**
 * Phản hồi của máy chủ lịch cho một digest là một đường thẳng op kết thúc bằng chứng thực chờ.
 * Tách ra: phần op (để nối với bằng chứng Bitcoin về sau) và cam kết cần hỏi lại lịch.
 */
export async function tachPhanCho(phanHoi: Uint8Array, goc: Uint8Array): Promise<{ tienTo: Uint8Array; camKet: Uint8Array; uri: string }> {
  let pos = 0;
  let msg = goc;
  for (let buoc = 0; buoc < DO_SAU_TOI_DA; buoc++) {
    if (pos >= phanHoi.length) throw new LoiOts('Phản hồi lịch kết thúc mà chưa có chứng thực.');
    const tag = phanHoi[pos];
    if (tag === 0xff) throw new LoiOts('Phản hồi lịch phân nhánh — chưa hỗ trợ.');
    if (tag === 0x00) {
      const { ds } = await docDauThoiGian(phanHoi, msg, pos);
      const uri = ds.length === 1 ? uriCho(ds[0]) : null;
      if (!uri) throw new LoiOts('Phản hồi lịch không kết thúc bằng một chứng thực chờ.');
      return { tienTo: phanHoi.slice(0, pos), camKet: msg, uri };
    }
    const op = await apDungOp(tag, phanHoi, pos + 1, msg);
    msg = op.kq;
    pos = op.pos;
  }
  throw new LoiOts('Phản hồi lịch quá dài.');
}

/** Tệp .ots cho một lá: magic, phiên bản, SHA256, digest lá, op lên gốc, dấu thời gian của gốc. */
export function tepOts(la: Uint8Array, opLenGoc: Uint8Array, dauThoiGianGoc: Uint8Array): Uint8Array {
  if (la.length !== 32) throw new LoiOts('Digest lá phải 32 byte.');
  return noi(HEADER_MAGIC, [0x01, OP_SHA256], la, opLenGoc, dauThoiGianGoc);
}

/** Đọc lại tệp .ots: trả digest và chứng thực — để test và để kiểm bản sao lưu. */
export async function docTepOts(tep: Uint8Array): Promise<{ digest: Uint8Array; ds: ChungThuc[] }> {
  const n = HEADER_MAGIC.length;
  if (tep.length < n + 34 || sangHex(tep.slice(0, n)) !== sangHex(HEADER_MAGIC)) throw new LoiOts('Không phải tệp OpenTimestamps.');
  if (tep[n] !== 0x01 || tep[n + 1] !== OP_SHA256) throw new LoiOts('Phiên bản hoặc op băm không hỗ trợ.');
  const digest = tep.slice(n + 2, n + 34);
  const { pos, ds } = await docDauThoiGian(tep, digest, n + 34);
  if (pos !== tep.length) throw new LoiOts('Tệp có dữ liệu thừa.');
  return { digest, ds };
}
