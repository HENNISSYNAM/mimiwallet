/**
 * Chạy bộ case vàng qua bộ luật và chấm điểm. Dùng chung cho test (đòi 100%) và
 * cho `scripts/kiem-nghiem.ts` (xuất báo cáo). Không đọc CSDL, không gọi mạng.
 */
import { MA_LY_DO, xetYeuCau, type KetQuaXet, type MaLyDo } from '../chinh-sach.ts';
import {
  BO_CASE_VANG,
  BOI_CANH_CHUAN,
  CHINH_SACH_CHUAN,
  TEN_NHOM_CASE,
  YEU_CAU_CHUAN,
  type CaseVang,
  type NhomCase,
} from './bo-case-vang.ts';

export interface KetQuaCase {
  id: string;
  nhom: NhomCase;
  moTa: string;
  nguon: string;
  dat: boolean;
  kyVong: KetQuaXet;
  thucTe: KetQuaXet;
  maThucTe: string[];
  loi: string[];
}

export interface BangDiem {
  tong: number;
  dat: number;
  tyLe: number;
  theoNhom: Array<{ nhom: NhomCase; ten: string; dat: number; tong: number }>;
  /** Mã lý do không case nào chạm tới — lỗ hổng độ phủ. */
  maChuaPhu: MaLyDo[];
  ketQua: KetQuaCase[];
}

export function chayMotCase(c: CaseVang): KetQuaCase {
  const q = xetYeuCau({ ...YEU_CAU_CHUAN, ...c.yc }, { ...CHINH_SACH_CHUAN, ...c.cs }, { ...BOI_CANH_CHUAN, ...c.bc });
  const ma = q.lyDo.map((l) => l.ma);
  const loi: string[] = [];
  if (q.ketQua !== c.kyVong.ketQua) loi.push(`kết quả ${q.ketQua}, kỳ vọng ${c.kyVong.ketQua}`);
  for (const m of c.kyVong.phaiCo ?? []) if (!ma.includes(m)) loi.push(`thiếu mã ${m}`);
  for (const m of c.kyVong.khongDuocCo ?? []) if (ma.includes(m)) loi.push(`không được có mã ${m}`);
  // Mỗi lý do phải có câu cho người đọc — chủ doanh nghiệp duyệt dựa vào câu, không dựa vào mã.
  for (const l of q.lyDo) if (!l.cau || l.cau.trim().length < 10) loi.push(`mã ${l.ma} thiếu câu giải thích`);
  return {
    id: c.id, nhom: c.nhom, moTa: c.moTa, nguon: c.nguon,
    dat: loi.length === 0, kyVong: c.kyVong.ketQua, thucTe: q.ketQua, maThucTe: ma, loi,
  };
}

export function chayBoCase(bo: CaseVang[] = BO_CASE_VANG): BangDiem {
  const ketQua = bo.map(chayMotCase);
  const dat = ketQua.filter((k) => k.dat).length;
  const theoNhom = (Object.keys(TEN_NHOM_CASE) as NhomCase[]).map((nhom) => {
    const trong = ketQua.filter((k) => k.nhom === nhom);
    return { nhom, ten: TEN_NHOM_CASE[nhom], dat: trong.filter((k) => k.dat).length, tong: trong.length };
  });
  // Độ phủ tính trên mã THỰC TẾ trả ra, không phải mã kỳ vọng ghi tay.
  const daPhu = new Set(ketQua.flatMap((k) => k.maThucTe));
  const maChuaPhu = MA_LY_DO.filter((m) => !daPhu.has(m));
  return { tong: ketQua.length, dat, tyLe: ketQua.length ? dat / ketQua.length : 0, theoNhom, maChuaPhu, ketQua };
}

export function bangDiemMarkdown(b: BangDiem): string {
  const phanTram = (x: number) => `${(x * 100).toFixed(1).replace('.', ',')}%`;
  const dong = [
    `**${b.dat}/${b.tong} case đạt (${phanTram(b.tyLe)})** · độ phủ mã lý do: ${MA_LY_DO.length - b.maChuaPhu.length}/${MA_LY_DO.length}`,
    '',
    '| Nhóm | Đạt | Tổng |',
    '|---|---|---|',
    ...b.theoNhom.map((n) => `| ${n.ten} | ${n.dat} | ${n.tong} |`),
  ];
  if (b.maChuaPhu.length) dong.push('', `Mã lý do chưa có case: ${b.maChuaPhu.map((m) => `\`${m}\``).join(', ')}`);
  const truot = b.ketQua.filter((k) => !k.dat);
  if (truot.length) {
    dong.push('', '### Case trượt', '', '| Case | Mô tả | Lỗi |', '|---|---|---|');
    for (const k of truot) dong.push(`| ${k.id} | ${k.moTa} | ${k.loi.join('; ')} |`);
  }
  return dong.join('\n');
}
