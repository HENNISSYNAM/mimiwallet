import { webcrypto } from 'node:crypto';
import { describe, expect, it } from 'vitest';

// jsdom không có crypto.subtle; Deno và trình duyệt thì có sẵn.
if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
import {
  cacTangMerkle, chieuCaoBitcoin, docTepOts, docVaruint, ghiVarbytes, ghiVaruint, HEADER_MAGIC, noi, opTuLaLenGoc,
  sangHex, sha256, tachPhanCho, TAG_BITCOIN, TAG_CHO, tepOts, tuHex, uriCho, OP_APPEND, OP_PREPEND, OP_SHA256,
} from './ots';

const la = async (i: number) => sha256(new TextEncoder().encode(`chứng từ ${i}`));
/** Payload chứng thực chờ theo chuẩn: varbytes(varbytes(uri)) — lớp ngoài là của TimeAttestation. */
const choCua = (uri: string) => noi([0x00], tuHex(TAG_CHO), ghiVarbytes(ghiVarbytes(new TextEncoder().encode(uri))));

describe('mã hoá cơ bản', () => {
  it('varuint LEB128', () => {
    expect(ghiVaruint(0)).toEqual([0]);
    expect(ghiVaruint(127)).toEqual([0x7f]);
    expect(ghiVaruint(128)).toEqual([0x80, 0x01]);
    expect(ghiVaruint(300)).toEqual([0xac, 0x02]);
    expect(docVaruint(new Uint8Array([0xac, 0x02]), 0)).toEqual({ gt: 300, pos: 2 });
  });

  it('header đúng chuẩn python-opentimestamps', () => {
    expect(sangHex(HEADER_MAGIC)).toBe('004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e89294');
  });
});

describe('cây Merkle', () => {
  it('op từ mọi lá dẫn đúng về gốc, với số lá chẵn lẫn lẻ', async () => {
    for (const n of [1, 2, 3, 5, 8]) {
      const ds = await Promise.all(Array.from({ length: n }, (_, i) => la(i)));
      const tang = await cacTangMerkle(ds);
      const goc = tang[tang.length - 1][0];
      for (let i = 0; i < n; i++) {
        // Dấu thời gian giả: op lên gốc rồi một chứng thực chờ — đọc lại phải thấy thông điệp = gốc.
        const dtg = noi(opTuLaLenGoc(tang, i), choCua('https://lich'));
        const { ds: ct } = await docTepOts(tepOts(ds[i], new Uint8Array(), dtg));
        expect(sangHex(ct[0].thongDiep)).toBe(sangHex(goc));
      }
    }
  });
});

describe('bằng chứng từ máy chủ lịch', () => {
  it('tách phần chờ, nối bằng chứng Bitcoin, đọc được chiều cao khối và thông điệp tại khối', async () => {
    const ds = await Promise.all([0, 1, 2].map(la));
    const tang = await cacTangMerkle(ds);
    const goc = tang[2][0];
    const muoi = tuHex('11'.repeat(16));
    // Phản hồi lịch dựng theo định dạng: append muối, sha256, chứng thực chờ.
    const phanHoi = noi([OP_APPEND], ghiVarbytes(muoi), [OP_SHA256], choCua('https://a.pool.opentimestamps.org'));
    const cho = await tachPhanCho(phanHoi, goc);
    expect(cho.uri).toBe('https://a.pool.opentimestamps.org');
    expect(sangHex(cho.camKet)).toBe(sangHex(await sha256(noi(goc, muoi))));

    // Bằng chứng nâng cấp: prepend, sha256, chứng thực Bitcoin khối 812345.
    const truoc = tuHex('22'.repeat(4));
    const nangCap = noi([OP_PREPEND], ghiVarbytes(truoc), [OP_SHA256], [0x00], tuHex(TAG_BITCOIN), ghiVarbytes(new Uint8Array(ghiVaruint(812345))));
    const tep = tepOts(ds[1], opTuLaLenGoc(tang, 1), noi(cho.tienTo, nangCap));
    const { digest, ds: ct } = await docTepOts(tep);
    expect(sangHex(digest)).toBe(sangHex(ds[1]));
    expect(ct).toHaveLength(1);
    expect(chieuCaoBitcoin(ct[0])).toBe(812345);
    expect(sangHex(ct[0].thongDiep)).toBe(sangHex(await sha256(noi(truoc, cho.camKet))));
    expect(uriCho(ct[0])).toBeNull();
  });

  it('nhánh 0xff: đọc được cả hai chứng thực', async () => {
    const d = await la(9);
    const dtg = noi([0xff], choCua('https://a'), choCua('https://b'));
    const { ds } = await docTepOts(tepOts(d, new Uint8Array(), dtg));
    expect(ds.map(uriCho)).toEqual(['https://a', 'https://b']);
  });

  it('tệp hỏng hoặc phản hồi lạ thì báo lỗi, không đoán', async () => {
    await expect(docTepOts(new Uint8Array(10))).rejects.toThrow();
    await expect(tachPhanCho(noi([OP_SHA256]), new Uint8Array(32))).rejects.toThrow();
    await expect(tachPhanCho(noi([0xff, 0x00]), new Uint8Array(32))).rejects.toThrow();
  });
});
