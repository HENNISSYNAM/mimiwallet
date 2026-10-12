/**
 * Phần THUẦN của khung "tạo agent bằng hội thoại" (kiểu BotFather của Telegram).
 *
 * VÌ SAO TÁCH KHỎI COMPONENT. Hội thoại là một máy trạng thái: bước nào, câu trả
 * lời nào hợp lệ, bước sau là gì, cuối cùng gửi gì cho máy chủ. Để ở đây thì test
 * được không cần dựng giao diện, và giao diện chỉ còn việc vẽ tin nhắn và nút.
 *
 * KHÔNG CÓ ĐƯỜNG THỨ HAI. Kết quả cuối cùng là thân của đúng các hành động máy chủ
 * sẵn có (`tao_tac_tu`, `luu_chinh_sach`, `doi_trang_thai`, `xoay_khoa`) — cùng
 * kiểm quyền, cùng kiểm đầu vào, cùng nhật ký như các nút trên trang. Hội thoại
 * chỉ là cách khác để điền form, không phải cửa sau qua chính sách.
 */
import { chuanHoaTen, docKhungGio, NHOM_CHI, TEN_NHOM_CHI, type KhungGioChi, type NhomChi } from '@/lib/tacTu';

export const CAC_BUOC = [
  'ten',
  'nhom',
  'moiLan',
  'ngay',
  'thang',
  'nguong',
  'nguoiNhan',
  'tranNguoiNhan',
  'khungGio',
  'ngoaiGio',
  'hetHan',
  'xacNhan',
] as const;
export type Buoc = (typeof CAC_BUOC)[number];

/** Câu trả lời đã nhận. Trường nào chưa hỏi tới thì chưa có. */
export interface Nhap {
  ten?: string;
  /** `null` = mọi nhóm. */
  nhom?: string[] | null;
  moiLan?: number;
  ngay?: number;
  thang?: number;
  nguong?: number;
  chiNguoiDaDuyet?: boolean;
  /** `null` = không đặt trần riêng cho từng người nhận. */
  tranNguoiNhan?: number | null;
  /** `null` = mọi lúc. */
  khungGio?: KhungGioChi | null;
  ngoaiGio?: 'cho_duyet' | 'tu_choi';
  /** Số ngày tới khi chính sách hết hạn. `null` = không hết hạn. */
  hetHanNgay?: number | null;
}

/** Mã lỗi để giao diện dịch thành câu. */
export type LoiNhap =
  | 'TEN_DAI'
  | 'NHOM_RONG'
  | 'NHOM_LA'
  | 'TIEN_SAI'
  | 'NGAY_NHO_HON_MOI_LAN'
  | 'THANG_NHO_HON_NGAY'
  | 'CO_KHONG'
  | 'GIO_SAI'
  | 'HET_HAN_SAI';

export type KetQuaNhap = { ok: true; nhap: Nhap } | { ok: false; loi: LoiNhap };

/** Trần một số tiền nhập tay — cùng trần với máy chủ (`TRAN_SO_TIEN`). */
const TRAN_TIEN = 10_000_000_000_000;

/**
 * Đọc số tiền người Việt hay gõ: "500k", "2tr", "1,5 triệu", "1.500.000", "2 tỷ".
 * Trả số nguyên đồng, hoặc `null` khi không đọc được. Tiền luôn là số nguyên đồng:
 * "1,5tr" ra 1.500.000, còn "1,5" trơn (không đơn vị) là sai vì không có đồng lẻ.
 */
export function docTien(s: string): number | null {
  const t = s.trim().toLowerCase().replace(/\s+/g, '').replace(/đồng|dong$|vnd|đ|₫/g, '');
  const m = t.match(/^(\d+(?:[.,]\d+)*)(k|nghìn|nghin|ngàn|ngan|tr|triệu|trieu|m|tỷ|ty|tỉ|ti|b)?$/);
  if (!m) return null;
  const [, so, donVi] = m;
  const heSo =
    !donVi ? 1
      : ['k', 'nghìn', 'nghin', 'ngàn', 'ngan'].includes(donVi) ? 1_000
        : ['tr', 'triệu', 'trieu', 'm'].includes(donVi) ? 1_000_000
          : 1_000_000_000;
  let giaTri: number;
  if (heSo === 1) {
    // Không đơn vị: dấu chấm/phẩy chỉ là phân cách hàng nghìn ("1.500.000").
    if (!/^\d{1,3}([.,]\d{3})*$|^\d+$/.test(so)) return null;
    giaTri = Number(so.replace(/[.,]/g, ''));
  } else {
    // Có đơn vị: một dấu phẩy/chấm là phần thập phân ("1,5tr").
    if (!/^\d+([.,]\d+)?$/.test(so)) return null;
    giaTri = Math.round(Number(so.replace(',', '.')) * heSo);
  }
  if (!Number.isSafeInteger(giaTri) || giaTri <= 0 || giaTri > TRAN_TIEN) return null;
  return giaTri;
}

const CO = ['co', 'có', 'yes', 'y', 'ok', 'dung', 'đúng', 'chi nguoi da duyet'];
const KHONG = ['khong', 'không', 'no', 'n', 'ko', 'k'];

/** Thứ viết tắt → ISO (1 = thứ Hai … 7 = Chủ nhật). */
const THU_VIET_TAT: Record<string, number> = { t2: 1, t3: 2, t4: 3, t5: 4, t6: 5, t7: 6, cn: 7 };

/**
 * Đọc khung giờ gõ tay: "8-20", "08:00–20:00", "8h-17h30 t2-t6", "22-6 t2-cn".
 * Không ghi thứ = mọi ngày. Đi qua `docKhungGio` để cùng một luật khuôn với máy chủ.
 */
export function docKhungGioGo(s: string): KhungGioChi | null {
  const t = s.trim().toLowerCase().replace(/\s+/g, ' ');
  const m = t.match(/^(\d{1,2})(?:[:h](\d{2})?)?\s*[-–]\s*(\d{1,2})(?:[:h](\d{2})?)?(?:\s+(t[2-7]|cn)\s*[-–]\s*(t[2-7]|cn))?$/);
  if (!m) return null;
  const tu = Number(m[1]) * 60 + Number(m[2] ?? 0);
  const den = Number(m[3]) * 60 + Number(m[4] ?? 0);
  let thu = [1, 2, 3, 4, 5, 6, 7];
  if (m[5] && m[6]) {
    const a = THU_VIET_TAT[m[5]];
    const b = THU_VIET_TAT[m[6]];
    if (a > b) return null;
    thu = Array.from({ length: b - a + 1 }, (_, i) => a + i);
  }
  const k = docKhungGio({ tu_phut: tu, den_phut: den, thu });
  return k === 'sai' ? null : k;
}

/** Khung giờ gợi ý trên nút: giờ hành chính mở rộng và giờ hành chính mọi ngày. */
export const KHUNG_GOI_Y = {
  ngayThuong: { tuPhut: 480, denPhut: 1200, thu: [1, 2, 3, 4, 5] } as KhungGioChi,
  moiNgay: { tuPhut: 480, denPhut: 1200, thu: [1, 2, 3, 4, 5, 6, 7] } as KhungGioChi,
};

/** Tìm nhóm chi theo mã hoặc tên ("quang_cao", "Quảng cáo", "quang cao"). */
function timNhom(s: string): NhomChi | null {
  const t = chuanHoaTen(s.replace(/_/g, ' '));
  if (!t) return null;
  return (
    NHOM_CHI.find((n) => chuanHoaTen(n.replace(/_/g, ' ')) === t) ??
    NHOM_CHI.find((n) => chuanHoaTen(TEN_NHOM_CHI[n]).startsWith(t)) ??
    null
  );
}

/**
 * Nhận một câu trả lời cho `buoc`. Giá trị từ NÚT đến ở dạng máy (ví dụ "500000",
 * "co", "moi_luc"); giá trị GÕ TAY đến ở dạng người — cả hai đi chung một cửa.
 */
export function nhanTraLoi(buoc: Buoc, giaTri: string, nhap: Nhap): KetQuaNhap {
  const v = giaTri.trim();
  const thuong = v.toLowerCase();
  switch (buoc) {
    case 'ten':
      // Cùng giới hạn với máy chủ (`tao_tac_tu`: 2–80 ký tự), báo sớm thay vì đợi lỗi 400.
      if (v.length < 2 || v.length > 80) return { ok: false, loi: 'TEN_DAI' };
      return { ok: true, nhap: { ...nhap, ten: v } };

    case 'nhom': {
      if (['moi_nhom', 'tat ca', 'tất cả', 'moi nhom', 'mọi nhóm', 'all'].includes(thuong)) {
        return { ok: true, nhap: { ...nhap, nhom: null } };
      }
      const phan = v.split(/[,;]/).map((x) => x.trim()).filter(Boolean);
      if (!phan.length) return { ok: false, loi: 'NHOM_RONG' };
      const ds: string[] = [];
      for (const p of phan) {
        const n = timNhom(p);
        if (!n) return { ok: false, loi: 'NHOM_LA' };
        if (!ds.includes(n)) ds.push(n);
      }
      return { ok: true, nhap: { ...nhap, nhom: ds } };
    }

    case 'moiLan':
    case 'ngay':
    case 'thang':
    case 'nguong': {
      // Ngưỡng duyệt nhận 0 ("mọi khoản đều phải duyệt"); hạn mức thì không.
      const n = buoc === 'nguong' && (v === '0' || thuong === 'moi_khoan') ? 0 : docTien(v);
      if (n === null) return { ok: false, loi: 'TIEN_SAI' };
      if (buoc === 'ngay' && nhap.moiLan !== undefined && n < nhap.moiLan) return { ok: false, loi: 'NGAY_NHO_HON_MOI_LAN' };
      if (buoc === 'thang' && nhap.ngay !== undefined && n < nhap.ngay) return { ok: false, loi: 'THANG_NHO_HON_NGAY' };
      return { ok: true, nhap: { ...nhap, [buoc]: n } };
    }

    case 'nguoiNhan':
      if (CO.includes(thuong)) return { ok: true, nhap: { ...nhap, chiNguoiDaDuyet: true } };
      if (KHONG.includes(thuong)) return { ok: true, nhap: { ...nhap, chiNguoiDaDuyet: false } };
      return { ok: false, loi: 'CO_KHONG' };

    case 'tranNguoiNhan': {
      if (['khong_gioi_han', 'khong', 'không', 'ko'].includes(thuong)) return { ok: true, nhap: { ...nhap, tranNguoiNhan: null } };
      const n = docTien(v);
      if (n === null) return { ok: false, loi: 'TIEN_SAI' };
      return { ok: true, nhap: { ...nhap, tranNguoiNhan: n } };
    }

    case 'khungGio': {
      if (['moi_luc', 'mọi lúc', 'moi luc', 'khong', 'không'].includes(thuong)) {
        return { ok: true, nhap: { ...nhap, khungGio: null } };
      }
      if (thuong === 'ngay_thuong') return { ok: true, nhap: { ...nhap, khungGio: KHUNG_GOI_Y.ngayThuong } };
      if (thuong === 'moi_ngay') return { ok: true, nhap: { ...nhap, khungGio: KHUNG_GOI_Y.moiNgay } };
      const k = docKhungGioGo(v);
      if (!k) return { ok: false, loi: 'GIO_SAI' };
      return { ok: true, nhap: { ...nhap, khungGio: k } };
    }

    case 'ngoaiGio':
      if (thuong === 'cho_duyet' || thuong === 'tu_choi') return { ok: true, nhap: { ...nhap, ngoaiGio: thuong } };
      return { ok: false, loi: 'CO_KHONG' };

    case 'hetHan': {
      if (['khong_het_han', 'khong', 'không', 'ko'].includes(thuong)) return { ok: true, nhap: { ...nhap, hetHanNgay: null } };
      const n = Number(v.replace(/\s*(ngày|ngay|d)$/i, ''));
      if (!Number.isInteger(n) || n < 1 || n > 3650) return { ok: false, loi: 'HET_HAN_SAI' };
      return { ok: true, nhap: { ...nhap, hetHanNgay: n } };
    }

    case 'xacNhan':
      return { ok: true, nhap };
  }
}

/** Bước "ngoài giờ thì sao" chỉ có nghĩa khi đã đặt khung giờ. */
const boQua = (b: Buoc, nhap: Nhap) => b === 'ngoaiGio' && !nhap.khungGio;

export function buocTiep(b: Buoc, nhap: Nhap): Buoc {
  let i = CAC_BUOC.indexOf(b) + 1;
  while (i < CAC_BUOC.length - 1 && boQua(CAC_BUOC[i], nhap)) i++;
  return CAC_BUOC[Math.min(i, CAC_BUOC.length - 1)];
}

export function buocTruoc(b: Buoc, nhap: Nhap): Buoc {
  let i = CAC_BUOC.indexOf(b) - 1;
  while (i > 0 && boQua(CAC_BUOC[i], nhap)) i--;
  return CAC_BUOC[Math.max(i, 0)];
}

/**
 * Thân của `luu_chinh_sach`. Chỉ gửi ba trường mới khi người dùng thật sự đặt —
 * máy chủ coi "không gửi" là "giữ nguyên", nên CSDL chưa chạy migration mới vẫn
 * tạo được agent với chính sách cơ bản.
 */
export function thanLuuChinhSach(nhap: Nhap, tacTuId: string, bayGio = new Date()): Record<string, unknown> {
  const than: Record<string, unknown> = {
    tac_tu_id: tacTuId,
    han_muc_moi_lan: nhap.moiLan,
    han_muc_ngay: nhap.ngay,
    han_muc_thang: nhap.thang,
    nguong_can_duyet: nhap.nguong,
    nhom_chi_duoc_phep: nhap.nhom ?? null,
    chi_tra_nguoi_nhan_da_duyet: nhap.chiNguoiDaDuyet ?? true,
    het_han: nhap.hetHanNgay ? new Date(bayGio.getTime() + nhap.hetHanNgay * 86_400_000).toISOString() : null,
  };
  if (nhap.khungGio) {
    than.khung_gio_chi = { tu_phut: nhap.khungGio.tuPhut, den_phut: nhap.khungGio.denPhut, thu: nhap.khungGio.thu };
    than.ngoai_khung_gio = nhap.ngoaiGio ?? 'cho_duyet';
  }
  if (nhap.tranNguoiNhan) than.han_muc_moi_nguoi_nhan_thang = nhap.tranNguoiNhan;
  return than;
}

/* ── Lệnh ─────────────────────────────────────────────────────────── */

/** Như /setcommands của BotFather: danh sách lệnh hiện cho người dùng. */
export const CAC_LENH = ['taoagent', 'danhsach', 'hanmuc', 'tamdung', 'batlai', 'thuhoi', 'khoamoi', 'quaylai', 'huy', 'trogiup'] as const;
export type Lenh = (typeof CAC_LENH)[number];

/** Lệnh nào cần tên agent đi kèm. */
export const LENH_CAN_AGENT: ReadonlySet<Lenh> = new Set(['hanmuc', 'tamdung', 'batlai', 'thuhoi', 'khoamoi']);

/** "/hanmuc agent quảng cáo" → { lenh: 'hanmuc', thamSo: 'agent quảng cáo' }. Không phải lệnh → null. */
export function docLenh(s: string): { lenh: Lenh; thamSo: string } | { lenh: null; ten: string } | null {
  const m = s.trim().match(/^\/([a-z]+)(?:@\S+)?(?:\s+(.*))?$/i);
  if (!m) return null;
  const ten = m[1].toLowerCase();
  // Tên tiếng Anh như Telegram, cho người quen BotFather.
  const biDanh: Record<string, Lenh> = { newbot: 'taoagent', mybots: 'danhsach', cancel: 'huy', help: 'trogiup', start: 'trogiup', back: 'quaylai' };
  const lenh = (CAC_LENH as readonly string[]).includes(ten) ? (ten as Lenh) : biDanh[ten];
  if (!lenh) return { lenh: null, ten };
  return { lenh, thamSo: (m[2] ?? '').trim() };
}

/**
 * Tìm agent theo tên gõ kèm lệnh. Trùng khít (sau chuẩn hoá) thắng; không thì mọi
 * agent có tên chứa chuỗi gõ. Nhiều kết quả → giao diện hỏi lại bằng nút, KHÔNG
 * tự chọn cái đầu: thu hồi nhầm agent là không hoàn tác được.
 */
export function timAgent<T extends { id: string; ten: string }>(ds: T[], thamSo: string): T[] {
  const t = chuanHoaTen(thamSo);
  if (!t) return [];
  const khit = ds.filter((a) => chuanHoaTen(a.ten) === t);
  if (khit.length) return khit;
  return ds.filter((a) => chuanHoaTen(a.ten).includes(t));
}
