/**
 * Soạn tờ khai thuế của hộ kinh doanh, cá nhân kinh doanh — đúng mẫu hành chính đang có hiệu lực.
 *
 * ĐÚNG MẪU NÀO. Mẫu 01/TKN-CNKD (Thông báo doanh thu/Tờ khai thuế năm) và mẫu 01/CNKD (Tờ khai
 * thuế đối với hộ kinh doanh, cá nhân kinh doanh), bản ban hành kèm Thông tư 50/2026/TT-BTC —
 * Thông tư này thay bốn mẫu của Thông tư 18/2026/TT-BTC (Điều 3). Tên chỉ tiêu, mã chỉ tiêu, thứ
 * tự dòng, câu "(Áp dụng...)" và câu Ghi chú trong file này chép từ chính mẫu trong kho Công báo
 * MIMI đã cào, không viết lại theo trí nhớ.
 *
 * CHỈ ĐIỀN Ô NÀO CÓ CĂN CỨ VÀ CÓ SỐ THẬT. Ô nào MIMI không tính được từ dữ liệu (doanh thu không
 * chịu thuế, doanh thu 0%, số thuế được miễn) thì để trống — người dùng hoặc kế toán điền, chứ
 * không điền 0 cho đẹp. Mỗi con số điền vào đều có một dòng trong `cach_tinh` nói nó ra từ đâu.
 *
 * MIMI KHÔNG NỘP THAY. Kết quả là bản nháp để in hoặc chép sang eTax/Cổng dịch vụ công.
 *
 * Hàm thuần, test bằng vitest.
 */
import {
  CAN_CU, cuoiQuy, hanNopQuy, NGUONG_DOANH_THU, NGUONG_KHAI_THANG, ngayVN, TEN_NHOM_NGANH, TEN_NGUON_DOANH_THU,
  tienVN, TY_LE_GTGT, TY_LE_TNCN,
  type NhomNganh, type SuKienThue, type SuyLuan,
} from './he-luat.ts';

export type Mau = '01/TKN-CNKD' | '01/CNKD';

export type KyToKhai =
  | { loai: 'nam'; nam: number }
  | { loai: '6_thang_dau'; nam: number }
  | { loai: 'quy'; nam: number; quy: number };

export interface CotToKhai {
  khoa: string;
  /** Mã chỉ tiêu của cột, khi mẫu có đánh mã (01/CNKD có, 01/TKN-CNKD không). */
  ma: string | null;
  nhan: string;
  nhom: 'gtgt' | 'tncn';
}

export interface DongToKhai {
  stt: string;
  ma: string | null;
  nhan: string;
  /** 0: dòng nhóm; 1: dòng ngành trong nhóm. */
  cap: 0 | 1;
  o: Record<string, number | null>;
  la_tong?: boolean;
}

export interface ChiTieuDau {
  ma: string;
  nhan: string;
  gia_tri: string | null;
}

export interface ToKhai {
  mau: Mau;
  kem_theo: string;
  tieu_de: string;
  ap_dung: string;
  ky_chu: string;
  han_nop: string;
  danh_dau: { nhan: string; chon: boolean }[];
  chi_tieu: ChiTieuDau[];
  phan_a: string;
  don_vi_tien: string;
  cot: CotToKhai[];
  dong: DongToKhai[];
  /** Câu Ghi chú in trên chính mẫu (nguyên văn). */
  ghi_chu_mau: string[];
  /** MIMI giải thích từng con số đã điền. */
  cach_tinh: string[];
  canh_bao: string[];
  can_cu: string[];
}

export type KetQuaSoan =
  | { ok: true; to_khai: ToKhai }
  | { ok: false; ly_do: string; can_cu: string[] };

export const TEN_MAU: Record<Mau, string> = {
  '01/TKN-CNKD': 'Thông báo doanh thu/Tờ khai thuế năm',
  '01/CNKD': 'Tờ khai thuế đối với hộ kinh doanh, cá nhân kinh doanh',
};

const KEM_THEO_TT50 = 'Kèm theo Thông tư số 50/2026/TT-BTC ngày 13/5/2026 của Bộ trưởng Bộ Tài chính';
const DON_VI_TIEN = 'Đơn vị tiền: Đồng Việt Nam';

/** Hậu tố dòng của từng nhóm ngành trên hai mẫu. */
const HAU_TO_TKN: Record<NhomNganh, string> = {
  phan_phoi_hang_hoa: 'a', dich_vu: 'b', cho_thue_tai_san: 'c', san_xuat_van_tai: 'd', noi_dung_so: 'e', khac: 'g',
};
const HAU_TO_CNKD: Record<NhomNganh, string> = {
  phan_phoi_hang_hoa: '(a)', dich_vu: '(b)', cho_thue_tai_san: '(c)', san_xuat_van_tai: '(d)', noi_dung_so: '(đ)', khac: '(e)',
};

const THU_TU_NGANH: NhomNganh[] = ['phan_phoi_hang_hoa', 'dich_vu', 'cho_thue_tai_san', 'san_xuat_van_tai', 'noi_dung_so', 'khac'];

const COT_TKN: CotToKhai[] = [
  { khoa: 'tong_dt', ma: null, nhan: 'Tổng doanh thu', nhom: 'gtgt' },
  { khoa: 'dt_khong_chiu', ma: null, nhan: 'Trong đó: doanh thu không chịu thuế GTGT', nhom: 'gtgt' },
  { khoa: 'dt_0', ma: null, nhan: 'Trong đó: doanh thu chịu thuế suất 0%', nhom: 'gtgt' },
  { khoa: 'thue_gtgt', ma: null, nhan: 'Số thuế phải nộp', nhom: 'gtgt' },
  { khoa: 'dt_chiu_tncn', ma: null, nhan: 'Doanh thu chịu thuế', nhom: 'tncn' },
  { khoa: 'dt_duoc_tru', ma: null, nhan: 'Doanh thu được trừ để xác định doanh thu tính thuế', nhom: 'tncn' },
  { khoa: 'thue_tncn', ma: null, nhan: 'Số thuế phải nộp', nhom: 'tncn' },
];

const COT_CNKD: CotToKhai[] = [
  { khoa: 'tong_dt', ma: '[11]', nhan: 'Tổng doanh thu', nhom: 'gtgt' },
  { khoa: 'dt_khong_chiu', ma: '[12]', nhan: 'Trong đó: doanh thu không chịu thuế GTGT', nhom: 'gtgt' },
  { khoa: 'dt_0', ma: '[13]', nhan: 'Trong đó: doanh thu chịu thuế suất 0%', nhom: 'gtgt' },
  { khoa: 'thue_gtgt', ma: '[14]', nhan: 'Số thuế phải nộp', nhom: 'gtgt' },
  { khoa: 'dt_chiu_tncn', ma: '[15]', nhan: 'Doanh thu chịu thuế', nhom: 'tncn' },
  { khoa: 'dt_duoc_tru', ma: '[16]', nhan: 'Doanh thu được trừ để xác định doanh thu tính thuế', nhom: 'tncn' },
  { khoa: 'thue_tncn', ma: '[17]', nhan: 'Số thuế phải nộp', nhom: 'tncn' },
];

const oTrong = (): Record<string, number | null> => ({
  tong_dt: null, dt_khong_chiu: null, dt_0: null, thue_gtgt: null, dt_chiu_tncn: null, dt_duoc_tru: null, thue_tncn: null,
});

const TEN_CO_DINH = 'Hoạt động sản xuất, kinh doanh hàng hóa, cung cấp dịch vụ có địa điểm kinh doanh cố định';
const TEN_TMDT_TKN = 'Hoạt động kinh doanh trên nền tảng thương mại điện tử, nền tảng số khác';
const TEN_TMDT_CNKD = 'Hoạt động kinh doanh trên nền tảng thương mại điện tử, nền tảng số khác không có chức năng đặt hàng trực tuyến và chức năng thanh toán';

function dongTKN(): DongToKhai[] {
  const ds: DongToKhai[] = [{ stt: '1', ma: '[08]', nhan: TEN_CO_DINH, cap: 0, o: oTrong() }];
  THU_TU_NGANH.forEach((n, i) => ds.push({ stt: `1.${i + 1}`, ma: `[08${HAU_TO_TKN[n]}]`, nhan: TEN_NHOM_NGANH[n], cap: 1, o: oTrong() }));
  ds.push({ stt: '2', ma: '[09]', nhan: TEN_TMDT_TKN, cap: 0, o: oTrong() });
  THU_TU_NGANH.forEach((n, i) => ds.push({ stt: `2.${i + 1}`, ma: `[09${HAU_TO_TKN[n]}]`, nhan: TEN_NHOM_NGANH[n], cap: 1, o: oTrong() }));
  ds.push({ stt: '3', ma: '[10]', nhan: 'Hoạt động đại lý xổ số, bảo hiểm, bán hàng đa cấp', cap: 0, o: oTrong() });
  ds.push({ stt: '', ma: '[11]', nhan: 'Tổng cộng', cap: 0, o: oTrong(), la_tong: true });
  ds.push({ stt: '', ma: '[12]', nhan: 'Số thuế được miễn', cap: 0, o: oTrong(), la_tong: true });
  ds.push({ stt: '', ma: '[13]', nhan: 'Số thuế còn phải nộp', cap: 0, o: oTrong(), la_tong: true });
  return ds;
}

function dongCNKD(): DongToKhai[] {
  const ds: DongToKhai[] = [
    { stt: 'I', ma: null, nhan: TEN_CO_DINH, cap: 0, o: oTrong() },
    { stt: '', ma: null, nhan: 'Trụ sở kinh doanh:', cap: 0, o: oTrong() },
  ];
  THU_TU_NGANH.forEach((n, i) => ds.push({ stt: `1.${i + 1}`, ma: HAU_TO_CNKD[n], nhan: TEN_NHOM_NGANH[n], cap: 1, o: oTrong() }));
  ds.push({ stt: 'II', ma: null, nhan: TEN_TMDT_CNKD, cap: 0, o: oTrong() });
  THU_TU_NGANH.forEach((n, i) => ds.push({ stt: `2.${i + 1}`, ma: HAU_TO_CNKD[n], nhan: TEN_NHOM_NGANH[n], cap: 1, o: oTrong() }));
  ds.push({ stt: 'III', ma: null, nhan: 'Hoạt động cấp hóa đơn điện tử có mã của cơ quan thuế theo từng lần phát sinh', cap: 0, o: oTrong() });
  ds.push({ stt: 'IV', ma: '[18]', nhan: 'Tổng cộng', cap: 0, o: oTrong(), la_tong: true });
  ds.push({ stt: 'V', ma: '[19]', nhan: 'Số thuế được miễn', cap: 0, o: oTrong(), la_tong: true });
  ds.push({ stt: 'VI', ma: '[20]', nhan: 'Số thuế còn phải nộp', cap: 0, o: oTrong(), la_tong: true });
  return ds;
}

/** Dòng của một nhóm ngành trong phần đúng kênh bán. */
function timDong(ds: DongToKhai[], mau: Mau, tmdt: boolean, n: NhomNganh): DongToKhai {
  const tien = tmdt ? (mau === '01/TKN-CNKD' ? '2.' : '2.') : '1.';
  const i = THU_TU_NGANH.indexOf(n) + 1;
  const d = ds.find((x) => x.cap === 1 && x.stt === `${tien}${i}`);
  if (!d) throw new Error(`Không thấy dòng ${tien}${i} trên mẫu ${mau}`);
  return d;
}

const chiTieuChung = (ten: string | null, mst: string | null): ChiTieuDau[] => [
  { ma: '[02]', nhan: 'Lần đầu', gia_tri: '✔' },
  { ma: '[03]', nhan: 'Bổ sung lần thứ', gia_tri: null },
  { ma: '[04]', nhan: 'Người nộp thuế', gia_tri: ten },
  { ma: '[05]', nhan: 'Mã số thuế', gia_tri: mst },
  { ma: '[06]', nhan: 'Tổ chức/cá nhân kê khai, nộp thuế thay theo ủy quyền (nếu có)', gia_tri: null },
  { ma: '[07]', nhan: 'Tên đại lý thuế (nếu có)', gia_tri: null },
];

const DANH_DAU_TKN = [
  'Hộ kinh doanh, cá nhân kinh doanh có doanh thu năm từ 01 tỷ đồng trở xuống',
  'Hộ kinh doanh, cá nhân kinh doanh mới ra kinh doanh có doanh thu năm từ 01 tỷ đồng trở xuống',
  'Hộ kinh doanh, cá nhân kinh doanh nộp thuế TNCN theo phương pháp thuế suất nhân với doanh thu tính thuế đề nghị hoàn thuế',
  'Cá nhân trực tiếp ký hợp đồng làm đại lý xổ số, bảo hiểm, bán hàng đa cấp, hoạt động kinh doanh khác chưa khấu trừ, nộp thuế trong năm',
];

const DANH_DAU_CNKD = [
  'Hộ kinh doanh, cá nhân kinh doanh thuộc đối tượng nộp thuế TNCN trên doanh thu tính thuế',
  'Hộ kinh doanh, cá nhân kinh doanh thuộc đối tượng nộp thuế TNCN trên thu nhập tính thuế',
  'Hộ kinh doanh, cá nhân kinh doanh chỉ có hoạt động kinh doanh trên nền tảng thương mại điện tử, nền tảng số khác không có chức năng đặt hàng trực tuyến và chức năng thanh toán',
  'Hộ kinh doanh, cá nhân kinh doanh khai các loại thuế khác (thuế TTĐB, thuế tài nguyên, thuế/phí bảo vệ môi trường)',
  'Trường hợp đề nghị cấp hóa đơn điện tử có mã của cơ quan thuế theo lần phát sinh',
];

const AP_DUNG_TKN =
  '(Áp dụng đối với hộ kinh doanh, cá nhân kinh doanh có doanh thu năm từ 01 tỷ đồng trở xuống; hộ kinh doanh, cá nhân kinh doanh nộp thuế TNCN theo phương pháp thuế suất nhân với doanh thu tính thuế đề nghị hoàn thuế; cá nhân trực tiếp ký hợp đồng làm đại lý xổ số, bảo hiểm, bán hàng đa cấp, hoạt động kinh doanh khác chưa khấu trừ, nộp thuế trong năm)';

export function soanToKhai(
  sk: SuKienThue,
  sl: SuyLuan,
  hoSo: { ten: string | null; mst: string | null },
  ky: KyToKhai,
): KetQuaSoan {
  if (sk.loai !== 'ho_kinh_doanh') {
    return { ok: false, ly_do: 'MIMI soạn được tờ khai của hộ kinh doanh, cá nhân kinh doanh. Tờ khai của doanh nghiệp (GTGT, TNDN) vẫn lập bằng phần mềm kế toán hoặc HTKK.', can_cu: [] };
  }
  if (ky.nam !== sk.nam) return { ok: false, ly_do: `Kỳ tính thuế (${ky.nam}) khác năm đang phân tích (${sk.nam}).`, can_cu: [] };
  const dtQuy = sk.doanhThuQuy;
  const dtNam = sl.doanh_thu_nam;
  if (!dtQuy || dtNam === null) {
    return { ok: false, ly_do: 'Chưa có doanh thu. Kết nối Tổng cục Thuế hoặc ngân hàng, hoặc nhập doanh thu từng quý, rồi soạn lại.', can_cu: [] };
  }
  if (!sk.kenh) return { ok: false, ly_do: 'Chưa biết bạn bán ở địa điểm cố định hay trên nền tảng số — tờ khai tách hai phần này.', can_cu: [] };
  if (sk.kenh === 'tmdt_co_thanh_toan') {
    return {
      ok: false,
      ly_do: 'Bán trên sàn có chức năng thanh toán: sàn khấu trừ, khai thay và nộp thay thuế cho từng giao dịch. MIMI không soạn tờ khai chồng lên phần sàn đã khai — đối chiếu chứng từ khấu trừ của sàn, phần doanh thu ngoài sàn thì khai riêng.',
      can_cu: ['nd68_d11_k1'],
    };
  }
  const tmdt = sk.kenh === 'tmdt_khong_thanh_toan';

  return ky.loai === 'quy'
    ? soanCNKD(sk, sl, hoSo, ky, dtQuy, dtNam, tmdt)
    : soanTKN(sk, sl, hoSo, ky, dtQuy, dtNam, tmdt);
}

function soanTKN(
  sk: SuKienThue,
  sl: SuyLuan,
  hoSo: { ten: string | null; mst: string | null },
  ky: Extract<KyToKhai, { loai: 'nam' | '6_thang_dau' }>,
  dtQuy: [number, number, number, number],
  dtNam: number,
  tmdt: boolean,
): KetQuaSoan {
  if (dtNam > NGUONG_DOANH_THU) {
    return {
      ok: false,
      ly_do: `Doanh thu năm ${tienVN(dtNam)} đã vượt 01 tỷ đồng: không dùng Thông báo doanh thu năm nữa, mà khai theo quý trên mẫu 01/CNKD kể từ quý ${sl.quy_vuot}/${ky.nam}.`,
      can_cu: ['nd68_d8_k1a_vuot', 'nd141_d1_k1', 'tt50_mau_cnkd'],
    };
  }
  const nuaDau = ky.loai === '6_thang_dau';
  const dt = nuaDau ? dtQuy[0] + dtQuy[1] : dtNam;
  const dong = dongTKN();
  const canhBao: string[] = [];
  const cachTinh: string[] = [];
  const canCu = ['nd68_d3_k1', 'nd68_d4_k1', 'nd141_d1_k1', 'tt18_d4_k1a', 'tt50_d3', 'tt50_mau_tkn', 'nd68_d5_k1'];

  if (nuaDau) canCu.push('nd68_d9_k1');
  else canCu.push('nd68_d8_k1a');

  const tong = dong.find((d) => d.ma === '[11]') as DongToKhai;
  tong.o.tong_dt = dt;
  if (sk.nhomNganh.length === 1) {
    const n = sk.nhomNganh[0];
    timDong(dong, '01/TKN-CNKD', tmdt, n).o.tong_dt = dt;
    cachTinh.push(`Dòng ${TEN_NHOM_NGANH[n]}: ${tienVN(dt)} — toàn bộ doanh thu của kỳ, vì hồ sơ thuế của bạn chỉ có một nhóm ngành.`);
  } else if (sk.nhomNganh.length === 0) {
    canhBao.push('Hồ sơ thuế chưa ghi nhóm ngành, nên MIMI chỉ điền dòng Tổng cộng. Chọn nhóm ngành để MIMI điền đúng dòng.');
  } else {
    canhBao.push('Bạn có nhiều nhóm ngành: MIMI không tự chia doanh thu cho từng dòng. Tự tách doanh thu theo ngành rồi điền vào từng dòng; dòng Tổng cộng đã có sẵn.');
  }
  cachTinh.push(
    `[11] Tổng cộng: ${tienVN(dt)} = ${nuaDau ? 'doanh thu quý 1 + quý 2' : 'doanh thu 4 quý'} (${dtQuy.map((x) => tienVN(x)).join(' + ')})${sk.nguonDoanhThu ? `, ${TEN_NGUON_DOANH_THU[sk.nguonDoanhThu]}` : ''}.`,
  );
  cachTinh.push('Các cột số thuế để trống theo đúng Ghi chú của mẫu: doanh thu năm từ 01 tỷ đồng trở xuống thì chỉ thông báo doanh thu.');

  if (sl.tam_tinh && !nuaDau) {
    canhBao.push(`Năm ${ky.nam} chưa kết thúc: số trên đây là lũy kế tới ${ngayVN(sk.homNay)}. Nộp sau 31/12, hạn 31/01/${ky.nam + 1}.`);
  }
  if (!hoSo.mst) canhBao.push('Hồ sơ công ty chưa có mã số thuế — điền ở Cài đặt rồi soạn lại, tờ khai thiếu mã số thuế thì không nộp được.');
  if (sk.daNopThueTrongNam) {
    canhBao.push('Bạn đã nộp thuế trong năm: đánh dấu mục đề nghị hoàn và điền số tiền ở phần E của mẫu — MIMI không biết bạn đã nộp bao nhiêu.');
    canCu.push('nd141_d4_k1', 'tt18_d5_k1');
  }

  const chiTieu: ChiTieuDau[] = [
    { ma: '[01a]', nhan: 'Kỳ tính thuế: Năm', gia_tri: nuaDau ? null : String(ky.nam) },
    { ma: '[01b]', nhan: '6 tháng đầu năm', gia_tri: nuaDau ? String(ky.nam) : null },
    { ma: '[01c]', nhan: '6 tháng cuối năm', gia_tri: null },
    ...chiTieuChung(hoSo.ten, hoSo.mst),
  ];

  return {
    ok: true,
    to_khai: {
      mau: '01/TKN-CNKD',
      kem_theo: KEM_THEO_TT50,
      tieu_de: 'THÔNG BÁO DOANH THU/TỜ KHAI THUẾ NĂM',
      ap_dung: AP_DUNG_TKN,
      ky_chu: nuaDau ? `6 tháng đầu năm ${ky.nam}` : `Năm ${ky.nam}`,
      han_nop: nuaDau ? `${ky.nam}-07-31` : `${ky.nam + 1}-01-31`,
      danh_dau: DANH_DAU_TKN.map((nhan, i) => ({
        nhan,
        chon: i === 0 ? !nuaDau : i === 1 ? nuaDau : i === 2 ? !!sk.daNopThueTrongNam : false,
      })),
      chi_tieu: chiTieu,
      phan_a: 'A. XÁC ĐỊNH NGHĨA VỤ THUẾ GTGT, TNCN',
      don_vi_tien: DON_VI_TIEN,
      cot: COT_TKN,
      dong,
      ghi_chu_mau: [CAN_CU.tt50_mau_tkn.trich],
      cach_tinh: cachTinh,
      canh_bao: canhBao,
      can_cu: [...new Set(canCu)],
    },
  };
}

function soanCNKD(
  sk: SuKienThue,
  sl: SuyLuan,
  hoSo: { ten: string | null; mst: string | null },
  ky: Extract<KyToKhai, { loai: 'quy' }>,
  dtQuy: [number, number, number, number],
  dtNam: number,
  tmdt: boolean,
): KetQuaSoan {
  if (ky.quy < 1 || ky.quy > 4) return { ok: false, ly_do: 'Quý phải từ 1 đến 4.', can_cu: [] };
  if (dtNam <= NGUONG_DOANH_THU) {
    return {
      ok: false,
      ly_do: `Doanh thu năm ${tienVN(dtNam)} chưa vượt 01 tỷ đồng: chưa phải khai theo quý. Việc cần làm là Thông báo doanh thu năm trên mẫu 01/TKN-CNKD, hạn 31/01/${ky.nam + 1}.`,
      can_cu: ['nd68_d3_k1', 'nd68_d4_k1', 'nd68_d8_k1a', 'nd141_d1_k1'],
    };
  }
  if (dtNam > NGUONG_KHAI_THANG) {
    return { ok: false, ly_do: 'Doanh thu năm trên 50 tỷ đồng: khai thuế GTGT theo tháng. MIMI chưa soạn tờ khai tháng.', can_cu: ['nd68_d10_k1b'] };
  }
  const quyVuot = sl.quy_vuot ?? 1;
  if (ky.quy < quyVuot) {
    return {
      ok: false,
      ly_do: `Quý ${ky.quy}/${ky.nam} chưa phải khai: doanh thu lũy kế chỉ vượt 01 tỷ đồng từ quý ${quyVuot}. Khai thuế, nộp thuế kể từ quý ${quyVuot}.`,
      can_cu: ['nd68_d8_k1a_vuot', 'nd141_d1_k1'],
    };
  }
  if (!sk.nhomNganh.length) {
    return { ok: false, ly_do: 'Chưa biết nhóm ngành: không có nhóm ngành thì không có tỷ lệ thuế để tính. Chọn nhóm ngành trong hồ sơ thuế.', can_cu: ['luat48_d12_k2b1', 'luat109_d7_k3b'] };
  }
  const pp = sl.phuong_phap;
  if (!pp) {
    return {
      ok: false,
      ly_do: 'Doanh thu trên 01 tỷ đến 03 tỷ đồng: chọn phương pháp tính TNCN (theo tỷ lệ trên doanh thu, hay theo thu nhập) rồi MIMI mới đánh dấu đúng ô trên tờ khai.',
      can_cu: ['nd68_d4_k5a', 'nd68_d4_k5b'],
    };
  }

  const dt = dtQuy[ky.quy - 1];
  const luyKeTruoc = dtQuy.slice(0, ky.quy - 1).reduce((s, x) => s + x, 0);
  const dong = dongCNKD();
  const canhBao: string[] = [];
  const cachTinh: string[] = [];
  const canCu = [
    'nd68_d3_k2', 'nd68_d4_k1', 'nd141_d1_k1', 'nd68_d8_k1a_vuot', 'nd68_d10_k1a', 'tt18_d4_k1b', 'tt50_d3', 'tt50_mau_cnkd',
    'nd68_d8_k3a', 'nd68_d8_k3e', 'luat109_d7_k3a', 'nd68_d4_k3', 'nd68_d5_k1',
  ];
  if (pp === 'thu_nhap') canCu.push('nd68_d10_k2b', 'tt18_d4_k1c');

  // Tỷ lệ GTGT: nhiều ngành mà không tách được doanh thu thì áp tỷ lệ cao nhất (TT 69/2025 Điều 5 khoản 2).
  const nhieuNganh = sk.nhomNganh.length > 1;
  const nganhGtgt = [...sk.nhomNganh].sort((a, b) => (TY_LE_GTGT[b].ty_le ?? -1) - (TY_LE_GTGT[a].ty_le ?? -1))[0];
  const nganhChinh = nhieuNganh ? nganhGtgt : sk.nhomNganh[0];
  const tyGtgt = TY_LE_GTGT[nganhChinh];
  const tyTncn = TY_LE_TNCN[nganhChinh];
  canCu.push(...tyGtgt.can_cu, ...tyTncn.can_cu);
  if (nhieuNganh) canCu.push('tt69_d5_k2');

  const duocTru = Math.max(0, Math.min(dt, NGUONG_DOANH_THU - luyKeTruoc));
  const dtTinhThue = Math.max(0, dt - duocTru);
  const thueGtgt = tyGtgt.ty_le === null ? null : Math.round(dt * tyGtgt.ty_le);
  const thueTncn = nhieuNganh ? null : Math.round(dtTinhThue * tyTncn.ty_le);

  const d = timDong(dong, '01/CNKD', tmdt, nganhChinh);
  d.o.tong_dt = dt;
  d.o.thue_gtgt = thueGtgt;
  d.o.dt_chiu_tncn = dt;
  d.o.dt_duoc_tru = duocTru;
  d.o.thue_tncn = thueTncn;

  const tong = dong.find((x) => x.ma === '[18]') as DongToKhai;
  const conPhaiNop = dong.find((x) => x.ma === '[20]') as DongToKhai;
  tong.o.tong_dt = dt;
  tong.o.thue_gtgt = thueGtgt;
  tong.o.dt_chiu_tncn = dt;
  tong.o.dt_duoc_tru = duocTru;
  tong.o.thue_tncn = thueTncn;
  conPhaiNop.o.thue_gtgt = thueGtgt;
  conPhaiNop.o.thue_tncn = thueTncn;

  const pct = (x: number) => `${String(Math.round(x * 1000) / 10).replace('.', ',')}%`;
  cachTinh.push(`[11] Tổng doanh thu quý ${ky.quy}: ${tienVN(dt)}${sk.nguonDoanhThu ? ` — ${TEN_NGUON_DOANH_THU[sk.nguonDoanhThu]}` : ''}.`);
  cachTinh.push(
    thueGtgt === null
      ? `[14] Số thuế GTGT: để trống — kho văn bản MIMI đã đối chiếu chưa có tỷ lệ % riêng cho nhóm ${TEN_NHOM_NGANH[nganhChinh]}. Hỏi cơ quan thuế hoặc kế toán.`
      : `[14] Số thuế GTGT = ${tienVN(dt)} × ${pct(tyGtgt.ty_le as number)} = ${tienVN(thueGtgt)} (tỷ lệ % theo nhóm ngành ${TEN_NHOM_NGANH[nganhChinh]}).`,
  );
  cachTinh.push(
    `[16] Doanh thu được trừ: ${tienVN(duocTru)} — mức trừ 01 tỷ đồng cho cả năm, các quý trước đã dùng ${tienVN(Math.min(luyKeTruoc, NGUONG_DOANH_THU))}. Đây là cách MIMI chia mức trừ theo quý từ quy định mức trừ theo năm; kế toán có thể chia khác, kiểm lại.`,
  );
  cachTinh.push(
    thueTncn === null
      ? '[17] Số thuế TNCN: để trống — bạn có nhiều nhóm ngành, mỗi nhóm một thuế suất, MIMI không tự chia doanh thu.'
      : `[17] Số thuế TNCN = (${tienVN(dt)} − ${tienVN(duocTru)}) × ${pct(tyTncn.ty_le)} = ${tienVN(thueTncn)}.`,
  );
  cachTinh.push('[12], [13], [19] để trống: MIMI không biết phần doanh thu không chịu thuế, doanh thu 0% và số thuế được miễn của bạn.');

  if (ky.quy === quyVuot) {
    canhBao.push(`Quý ${ky.quy} là quý doanh thu lũy kế vượt 01 tỷ đồng. Văn bản trong kho nói khai thuế "kể từ quý phát sinh doanh thu trên 01 tỷ" nhưng không nói rõ thuế GTGT có tính trên doanh thu các quý trước đó hay không — hỏi cơ quan thuế trước khi nộp.`);
  }
  if (nhieuNganh) {
    canhBao.push(`Nhiều nhóm ngành: MIMI áp tỷ lệ GTGT cao nhất (${TEN_NHOM_NGANH[nganhChinh]}) cho toàn bộ doanh thu, đúng cách xử lý khi không tách được doanh thu theo từng tỷ lệ. Tách được thì khai theo từng mức tỷ lệ sẽ có lợi hơn.`);
  }
  if (pp === 'thu_nhap') {
    canhBao.push(`Bạn tính TNCN trên thu nhập: số ở [17] là tạm nộp theo tỷ lệ trên doanh thu quý; cuối năm quyết toán trên mẫu 02/CNKD-TNCN-QTT, hạn 31/03/${ky.nam + 1}.`);
  }
  const cuoi = cuoiQuy(ky.quy, ky.nam);
  if (sk.homNay <= cuoi) canhBao.push(`Quý ${ky.quy} chưa kết thúc (hết ngày ${ngayVN(cuoi)}): số liệu còn chạy, soạn lại sau khi chốt quý.`);
  if (!hoSo.mst) canhBao.push('Hồ sơ công ty chưa có mã số thuế — điền ở Cài đặt rồi soạn lại.');

  const chiTieu: ChiTieuDau[] = [
    { ma: '[01a]', nhan: 'Kỳ tính thuế: Tháng', gia_tri: null },
    { ma: '[01b]', nhan: 'Quý', gia_tri: `${ky.quy}/${ky.nam}` },
    { ma: '[01c]', nhan: 'Lần phát sinh', gia_tri: null },
    ...chiTieuChung(hoSo.ten, hoSo.mst),
  ];

  return {
    ok: true,
    to_khai: {
      mau: '01/CNKD',
      kem_theo: KEM_THEO_TT50,
      tieu_de: 'TỜ KHAI THUẾ ĐỐI VỚI HỘ KINH DOANH, CÁ NHÂN KINH DOANH',
      ap_dung: CAN_CU.tt50_mau_cnkd.trich,
      ky_chu: `Quý ${ky.quy}/${ky.nam}`,
      han_nop: hanNopQuy(ky.quy, ky.nam),
      danh_dau: DANH_DAU_CNKD.map((nhan, i) => ({
        nhan,
        chon: i === 0 ? pp === 'doanh_thu' : i === 1 ? pp === 'thu_nhap' : i === 2 ? tmdt : false,
      })),
      chi_tieu: chiTieu,
      phan_a: 'A. KÊ KHAI THUẾ GTGT, TNCN',
      don_vi_tien: DON_VI_TIEN,
      cot: COT_CNKD,
      dong,
      ghi_chu_mau: [],
      cach_tinh: cachTinh,
      canh_bao: canhBao,
      can_cu: [...new Set(canCu)],
    },
  };
}

/** Kỳ nên soạn cho hôm nay: quý đang tới hạn nếu đã vượt ngưỡng, còn lại là thông báo doanh thu năm. */
export function kyGoiY(sk: SuKienThue, sl: SuyLuan): KyToKhai {
  if (sl.doanh_thu_nam !== null && sl.doanh_thu_nam > NGUONG_DOANH_THU) {
    const thang = Number(sk.homNay.slice(5, 7));
    const quyHienTai = Math.ceil(thang / 3);
    const quy = Math.max(sl.quy_vuot ?? 1, Math.max(1, quyHienTai - 1));
    return { loai: 'quy', nam: sk.nam, quy: Math.min(4, quy) };
  }
  return { loai: 'nam', nam: sk.nam };
}
