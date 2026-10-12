/**
 * NGÀNH NGHỀ THEO MÃ VSIC CẤP 4 — lưu cái người dùng khai, gợi ý cái có căn cứ (12/10/2026).
 *
 * Vì sao có file này (đề BTL86-58 "cá nhân hoá theo ngành nghề"): hồ sơ chỉ có ô `companies.industry`
 * chữ tự do, không dùng được để suy gì. Người dùng giờ khai mã ngành cấp 4 (4 chữ số) đúng như trên giấy
 * chứng nhận đăng ký, nhiều ngành, chọn một ngành chính.
 *
 * MIMI KHÔNG giữ danh mục VSIC trong kho, nên KHÔNG tự điền tên ngành: tên do người dùng chép từ giấy
 * đăng ký. Mã chỉ được kiểm hình dạng (4 chữ số).
 *
 * DÙNG NGÀNH ĐỂ LÀM GÌ — chỉ một việc có căn cứ: với HỘ KINH DOANH, gợi ý NHÓM HOẠT ĐỘNG dùng cho tỷ lệ
 * thuế đã có trong hệ luật (`NHOM_NGANH`, `TY_LE_GTGT`, `TY_LE_TNCN` ở `he-luat.ts`). Đó là GỢI Ý: nhóm
 * tỷ lệ xác định theo hoạt động thật, không theo mã đăng ký — người dùng bấm xác nhận thì mới ghi vào
 * `ho_so_thue.nhom_nganh`. Chỉ gợi ý khi phần đầu của mã chỉ ra một nhóm rõ ràng (sản xuất, bán buôn
 * bán lẻ, vận tải, lưu trú, ăn uống, cho thuê máy móc đồ dùng…); mã mà cùng một ngành có thể rơi vào hai
 * nhóm (xây dựng có hay không bao thầu nguyên vật liệu, sửa chữa, đại lý, quảng cáo…) thì KHÔNG gợi ý và
 * nói vì sao.
 *
 * CHƯA LÀM, CÓ CHỦ Ý: cảnh báo "ngành kinh doanh có điều kiện". Danh mục ở Phụ lục IV Luật Đầu tư viết bằng
 * lời, không theo mã VSIC; ghép mã → ngành có điều kiện mà không có bảng đối chiếu chính thức là đoán.
 *
 * Mã phân theo Hệ thống ngành kinh tế Việt Nam ban hành kèm Quyết định 27/2018/QĐ-TTg (phần đầu 2 chữ số
 * = ngành cấp 2). Chưa đối chiếu với bản hệ thống ngành mới hơn, nếu có. Hàm thuần.
 */
import { NHOM_NGANH, TEN_NHOM_NGANH, type NhomNganh } from './he-luat.ts';

export interface NganhVsic {
  /** Mã cấp 4, đúng 4 chữ số. */
  ma: string;
  /** Tên ngành người dùng chép từ giấy chứng nhận đăng ký. */
  ten: string;
}

export const TOI_DA_NGANH = 30;

export function docNganhVsic(v: unknown, chinh: unknown): { ok: true; nganh: NganhVsic[]; nganh_chinh: string | null } | { ok: false; cau: string } {
  if (!Array.isArray(v)) return { ok: false, cau: 'Danh sách ngành không hợp lệ.' };
  if (v.length > TOI_DA_NGANH) return { ok: false, cau: `Tối đa ${TOI_DA_NGANH} ngành.` };
  const ra: NganhVsic[] = [];
  for (const x of v) {
    const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
    const ma = typeof o.ma === 'string' ? o.ma.trim() : '';
    const ten = typeof o.ten === 'string' ? o.ten.trim().replace(/\s+/g, ' ') : '';
    if (!/^\d{4}$/.test(ma)) return { ok: false, cau: 'Mã ngành cấp 4 gồm đúng 4 chữ số (ví dụ 4711).' };
    if (ten.length < 2 || ten.length > 200) return { ok: false, cau: `Ghi tên ngành ${ma} như trên giấy chứng nhận đăng ký (2–200 ký tự).` };
    if (ra.some((n) => n.ma === ma)) return { ok: false, cau: `Mã ngành ${ma} bị trùng.` };
    ra.push({ ma, ten });
  }
  if (chinh != null && chinh !== '' && (typeof chinh !== 'string' || !ra.some((n) => n.ma === chinh))) {
    return { ok: false, cau: 'Ngành chính phải là một trong các ngành đã khai.' };
  }
  // Có ngành mà chưa chọn ngành chính: lấy ngành đầu — giấy đăng ký cũng ghi ngành chính trước.
  const nganhChinh = typeof chinh === 'string' && chinh ? chinh : ra[0]?.ma ?? null;
  return { ok: true, nganh: ra, nganh_chinh: nganhChinh };
}

export interface GoiYNhom {
  ma: string;
  /** null = không gợi ý (mã có thể rơi vào nhiều nhóm, hoặc MIMI chưa có căn cứ phân nhóm). */
  nhom: NhomNganh | null;
  vi_sao: string;
}

/** Ngành cấp 2 → nhóm rõ ràng. Mã cấp 4 nằm trong `NGOAI_LE` thì không gợi ý dù ngành cấp 2 có nhóm. */
const THEO_CAP_2: { tu: number; den: number; nhom: NhomNganh; ten: string }[] = [
  { tu: 10, den: 32, nhom: 'san_xuat_van_tai', ten: 'công nghiệp chế biến, chế tạo' },
  { tu: 45, den: 47, nhom: 'phan_phoi_hang_hoa', ten: 'bán buôn, bán lẻ' },
  { tu: 49, den: 51, nhom: 'san_xuat_van_tai', ten: 'vận tải' },
  { tu: 55, den: 55, nhom: 'dich_vu', ten: 'dịch vụ lưu trú' },
  { tu: 56, den: 56, nhom: 'san_xuat_van_tai', ten: 'dịch vụ ăn uống' },
  { tu: 77, den: 77, nhom: 'cho_thue_tai_san', ten: 'cho thuê máy móc, thiết bị, đồ dùng (không phải bất động sản)' },
  { tu: 96, den: 96, nhom: 'dich_vu', ten: 'dịch vụ phục vụ cá nhân' },
];

const NGOAI_LE: Record<string, string> = {
  4513: 'Đại lý ô tô: bán đúng giá hưởng hoa hồng hay mua đứt bán đoạn thì rơi vào nhóm khác nhau.',
  4520: 'Bảo dưỡng, sửa chữa xe: có kèm phụ tùng hay chỉ công sửa thì rơi vào nhóm khác nhau.',
  4542: 'Bảo dưỡng, sửa chữa xe máy: có kèm phụ tùng hay chỉ công sửa thì rơi vào nhóm khác nhau.',
  4610: 'Đại lý, môi giới: bán đúng giá hưởng hoa hồng hay mua đứt bán đoạn thì rơi vào nhóm khác nhau.',
  7740: 'Cho thuê tài sản vô hình không phải tài sản hữu hình — MIMI chưa có căn cứ xếp nhóm.',
};

const KHONG_GOI_Y_CAP_2: { tu: number; den: number; vi_sao: string }[] = [
  { tu: 41, den: 43, vi_sao: 'Xây dựng: có bao thầu nguyên vật liệu hay không thì rơi vào nhóm khác nhau — chọn theo hợp đồng thật.' },
  { tu: 68, den: 68, vi_sao: 'Bất động sản: cho thuê nhà, đất dùng mẫu tờ khai riêng (hoạt động đặc thù), không theo nhóm tỷ lệ chung.' },
];

/** Gợi ý nhóm hoạt động cho MỘT mã ngành cấp 4. Không bao giờ tự ghi — chỉ trả gợi ý kèm lý do. */
export function goiYNhomTuVsic(ma: string): GoiYNhom {
  if (!/^\d{4}$/.test(ma)) return { ma, nhom: null, vi_sao: 'Mã ngành không đúng 4 chữ số.' };
  if (NGOAI_LE[ma]) return { ma, nhom: null, vi_sao: NGOAI_LE[ma] };
  const c2 = Number(ma.slice(0, 2));
  const kg = KHONG_GOI_Y_CAP_2.find((x) => c2 >= x.tu && c2 <= x.den);
  if (kg) return { ma, nhom: null, vi_sao: kg.vi_sao };
  const r = THEO_CAP_2.find((x) => c2 >= x.tu && c2 <= x.den);
  if (!r) return { ma, nhom: null, vi_sao: 'MIMI chưa có căn cứ xếp mã này vào nhóm tỷ lệ thuế — chọn nhóm theo hoạt động thật.' };
  return {
    ma, nhom: r.nhom,
    vi_sao: `Mã ${ma} thuộc ngành ${r.ten} (2 chữ số đầu ${ma.slice(0, 2)}) → nhóm "${TEN_NHOM_NGANH[r.nhom]}". Nhóm tỷ lệ thuế tính theo hoạt động thật, không theo mã đăng ký — xác nhận nếu đúng với việc bạn làm.`,
  };
}

/** Gợi ý cho ngành chính, chỉ khi nhóm gợi ý chưa có trong hồ sơ. */
export function goiYNhomChoHoSo(nganhChinh: string | null, daCo: readonly string[]): (GoiYNhom & { da_co: boolean }) | null {
  if (!nganhChinh) return null;
  const g = goiYNhomTuVsic(nganhChinh);
  return { ...g, da_co: !!g.nhom && daCo.includes(g.nhom) };
}

export const laNhomNganh = (x: unknown): x is NhomNganh => typeof x === 'string' && (NHOM_NGANH as readonly string[]).includes(x);
