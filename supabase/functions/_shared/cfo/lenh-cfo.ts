/**
 * Lệnh CFO bằng lời — chủ doanh nghiệp nói một câu, MIMI dựng thay đổi phân quyền cho agent.
 *
 * "Agent quảng cáo mỗi lần tối đa 2 triệu, 20 triệu một tháng, trên 1 triệu phải hỏi tôi, chỉ giờ hành chính."
 * → bốn thay đổi trên chính sách chi của đúng agent đó, kèm bảng trước/sau, kèm chạy thử trên các khoản
 * agent đã xin 30 ngày qua, rồi CHỜ chủ bấm áp dụng. Lưu đi qua đúng cửa `tac-tu → luu_chinh_sach`
 * (kiểm quyền ở máy chủ, ghi nhật ký trước/sau) — module này không ghi gì.
 *
 * VÌ SAO KHÔNG ĐỂ MÔ HÌNH DỊCH CÂU. Đây là chỗ đổi trần tiền của một doanh nghiệp. Bộ đọc là luật cố định,
 * chạy giống nhau mỗi lần, test được, và phần nào không chắc thì nói "chưa hiểu" thay vì đoán. Mô hình (nếu
 * có) chỉ viết lời; nó không chạm được vào con số trong đề xuất.
 *
 * LẰN RANH ĐỎ KHÔNG LỆNH NÀO MỞ ĐƯỢC: agent tự chuyển tiền, nộp thuế, ký số, hoặc bỏ hẳn trần chi. MIMI không
 * giữ và không chuyển tiền của khách (Nghị định 52/2024/NĐ-CP), nên lệnh kiểu này bị từ chối và nói vì sao.
 *
 * NỚI THÌ CẢNH BÁO, SIẾT THÌ THÔI. Mỗi thay đổi được gắn "siết" hoặc "nới". Nới trần quá 3 lần mức cũ, bỏ
 * duyệt, mở người nhận lạ — đều hiện cảnh báo trong hộp xác nhận. Lệnh mâu thuẫn (mỗi lần > mỗi ngày) không
 * ra nút áp dụng: MIMI không tự nâng một trần khác cho khớp, vì đó là nới trần sau lưng chủ.
 *
 * Ba ngôn ngữ: tiếng Việt (có hoặc không dấu), tiếng Anh, tiếng Trung giản thể.
 */
import {
  type ChinhSach,
  docKhungGio,
  type KhungGioChi,
  moTaKhungGio,
  NHOM_CHI,
  type NhomChi,
  TEN_NHOM_CHI,
  xetYeuCau,
  type KetQuaXet,
} from '../tac-tu/chinh-sach.ts';
import { duocLam, HANH_DONG, type HanhDong, QUYEN, TEN_VAI_TRO, VAI_TRO, type VaiTro } from '../quyen/vai-tro.ts';

export type NgonNgu = 'vi' | 'en' | 'zh';

export function nhanNgonNgu(cau: string): NgonNgu {
  if (/[一-鿿]/.test(cau)) return 'zh';
  if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(cau)) return 'vi';
  // Không dấu: tiếng Việt gõ không dấu vẫn có những từ này.
  if (/\b(moi|thang|ngay|trieu|duyet|cho|khong|duoc|gio|hanh chinh|tam dung|toi da)\b/i.test(cau)) return 'vi';
  return 'en';
}

/** Chữ thường, bỏ dấu, đ → d. Giữ chữ Hán. */
export function boDau(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();
}

// ── Đọc số tiền ───────────────────────────────────────────────────────────────

export interface SoTien { gia_tri: number; tu: number; den: number }

const DON_VI: [RegExp, number][] = [
  [/^(百万)/, 1_000_000],
  [/^(亿)/, 100_000_000],
  [/^(万)/, 10_000],
  [/^(千)/, 1_000],
  [/^\s*(ty|ti|ty dong|billion|bn|b)\b/, 1_000_000_000],
  [/^\s*(trieu|tr|million|mil|m)\b/, 1_000_000],
  [/^\s*(nghin|ngan|thousand|k)\b/, 1_000],
];

/**
 * Mọi số tiền trong câu đã bỏ dấu: "2 trieu", "2tr", "2.5m", "500k", "5.000.000", "5,000,000 vnd", "200万".
 * Số không có đơn vị và nhỏ hơn 1.000 bị bỏ qua (giờ, ngày, số lần — không phải tiền).
 */
export function docSoTien(s: string): SoTien[] {
  const ra: SoTien[] = [];
  const re = /(\d+(?:[.,]\d+)*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const tho = m[1];
    const sau = s.slice(m.index + tho.length);
    let heSo = 0;
    let dai = 0;
    for (const [r, h] of DON_VI) {
      const k = r.exec(sau);
      if (k) { heSo = h; dai = k[0].length; break; }
    }
    // Số ngay sau là giờ ("8h", "20:00", "8am") thì không phải tiền.
    if (!heSo && /^\s*(h|gio|:\d|am|pm|点)/.test(sau)) continue;
    let so: number;
    if (heSo) {
      // Có đơn vị: "2,5 trieu" / "2.5m" là số thập phân; "1.500 nghin" là nghìn.
      const nhom = tho.split(/[.,]/);
      so = nhom.length === 2 && nhom[1].length <= 2 ? Number(`${nhom[0]}.${nhom[1]}`) : Number(nhom.join(''));
      so = Math.round(so * heSo);
    } else {
      so = Number(tho.replace(/[.,]/g, ''));
      if (so < 1_000) continue;
    }
    if (!Number.isFinite(so) || so <= 0) continue;
    // Bỏ đuôi tiền tệ khỏi khoảng chiếm của số, cho bộ ghép từ khoá đo khoảng cách đúng.
    const duoi = /^\s*(d|dong|vnd|₫)\b/.exec(s.slice(m.index + tho.length + dai));
    ra.push({ gia_tri: so, tu: m.index, den: m.index + tho.length + dai + (duoi ? duoi[0].length : 0) });
  }
  return ra;
}

// ── Đọc lệnh ──────────────────────────────────────────────────────────────────

export type TruongTien = 'hanMucMoiLan' | 'hanMucNgay' | 'hanMucThang' | 'nguongCanDuyet' | 'hanMucMoiNguoiNhanThang';

export type ThayDoi =
  | { loai: 'tien'; truong: TruongTien; gia_tri: number }
  | { loai: 'khung_gio'; gia_tri: KhungGioChi; gia_dinh?: string }
  | { loai: 'ngoai_khung_gio'; gia_tri: 'tu_choi' | 'cho_duyet' }
  | { loai: 'nhom_chi'; gia_tri: NhomChi[] }
  | { loai: 'chi_nguoi_nhan_da_duyet'; gia_tri: boolean }
  | { loai: 'bo_duyet' }
  | { loai: 'tam_dung' }
  | { loai: 'bat_lai' };

export type LanRanh = 'chuyen_tien' | 'nop_thue' | 'ky_so' | 'bo_tran';

export interface LenhDaDoc {
  thay_doi: ThayDoi[];
  lan_ranh: LanRanh[];
  /** Có từ khoá chính sách mà không ghép được với con số nào — nói ra, không đoán. */
  chua_hieu: string[];
}

const TU_TIEN: { truong: TruongTien; re: RegExp }[] = [
  { truong: 'hanMucMoiNguoiNhanThang', re: /moi nguoi nhan|mot nguoi nhan|per recipient|each recipient|per payee|每个收款人|单个收款人/g },
  { truong: 'hanMucMoiLan', re: /moi lan|mot lan|moi khoan|mot khoan|moi giao dich|per transaction|per payment|each payment|per txn|a payment|单笔|每笔|每次/g },
  { truong: 'hanMucNgay', re: /moi ngay|mot ngay|1 ngay|trong ngay|per day|a day|daily|each day|每天|每日|一天|单日/g },
  { truong: 'hanMucThang', re: /moi thang|mot thang|1 thang|trong thang|per month|a month|monthly|each month|每月|一个月|单月/g },
];
const TU_DUYET = /hoi toi|hoi minh|hoi em|phai duyet|can duyet|xin duyet|xin phep|toi duyet|need(?:s)? (?:my )?approval|require(?:s)? (?:my )?approval|ask me|check with me|approve first|审批|批准|问我|经我同意/;
const TU_TREN = /(?:^|\s)(tren|qua|hon|vuot|above|over|more than|exceed(?:s|ing)?|greater than)\s*$|超过\s*$|以上/;
const TU_MOI_KHOAN_DUYET = /(moi khoan|tat ca cac khoan|tat ca khoan|every payment|all payments|each payment|every request|所有付款|每笔都|全部)/;
const TU_BO_DUYET = /khong can (hoi|duyet)|bo (buoc )?duyet|no approval|without approval|skip approval|无需审批|不用审批|不需要审批/;

const TU_TAM_DUNG = /tam dung|ngung (agent|chi|lai)|dong bang|khoa agent|\bpause\b|\bfreeze\b|\bsuspend\b|暂停|冻结/;
const TU_BAT_LAI = /bat lai|mo lai|cho chay lai|\bresume\b|unpause|reactivate|恢复/;

const LAN_RANH: [LanRanh, RegExp][] = [
  ['chuyen_tien', /tu (dong )?(chuyen|tra|thanh toan)|tu chuyen tien|chuyen tien (thay|giup|ho)|auto[- ]?pay|automatically (pay|transfer|send|wire)|(transfer|move|send|wire) (the )?money (for me|on my behalf|automatically)|let (it|the agent|agents?) (pay|transfer|send|wire)|自动转账|自动付款|直接转账|替我转账|帮我转账/],
  ['nop_thue', /nop thue (thay|giup|ho)|tu (dong )?nop (thue|to khai)|ke khai thay|file (my |the )?tax(es)? (for me|automatically|on my behalf)|(auto|automatically)[- ]?file|submit (the |my )?tax|自动报税|替我报税|帮我报税|自动申报/],
  ['ky_so', /ky so|chu ky so|ky (to khai|xml|thay)|sign (the |my )?(tax|xml|return|form)s?|digital signature|数字签名|签署|代签/],
  ['bo_tran', /khong gioi han|bo (het )?han muc|bo tran|unlimited|no limit|remove (all |the )?limits?|without (any )?limit|无限|不限额|取消限额/],
];

const NHOM_TU: [NhomChi, RegExp][] = [
  ['quang_cao', /quang cao|\bads?\b|advertis\w*|marketing|广告|推广/],
  ['phan_mem', /phan mem|software|saas|subscription|thue bao|软件|订阅/],
  ['ha_tang_ai', /ha tang ai|\bapi\b|server|may chu|cloud|hosting|\bai\b|服务器|云服务|算力/],
  ['nha_cung_cap', /nha cung cap|supplier|vendor|hang hoa|供应商|货款/],
  ['van_chuyen', /van chuyen|shipping|logistics|delivery|giao hang|运输|物流|快递/],
];
const TU_CHI_CHO = /chi (duoc )?(chi|tra|dung)( cho| vao)?|only (for|on|spend on|pay for)|spend only on|只能(用于|花在|支付)?|仅限/;

const TU_TRA_DA_DUYET = /chi tra (cho )?(nguoi nhan|tai khoan) (da duyet|trong danh sach|quen)|only (pay )?(approved|known|whitelisted|listed) (recipients?|payees?|vendors?)|只付给(已批准|白名单)|仅限已批准收款人/;
const TU_NGUOI_LA_HOI = /nguoi nhan (moi|la) (thi )?(phai |can )?(hoi|duyet)|new (recipients?|payees?) (need|require)s? approval|新收款人(需要|需)审批/;

const TU_GIO_HANH_CHINH = /gio hanh chinh|gio lam viec|office hours|business hours|working hours|工作时间|上班时间/;
const TU_NGOAI_GIO = /ngoai gio|outside (of )?(office |business |working )?hours|after hours|非工作时间|下班后|工作时间外/;
const TU_CAM = /cam|tu choi|khong (duoc|cho)|block|deny|refuse|reject|not allowed|禁止|不允许|拒绝/;

function docNgay(s: string): number[] | null {
  if (/thu 2 (den|toi|-|–) thu 7|t2 ?- ?t7|mon(day)?\s*(-|to|through)\s*sat(urday)?|周一(至|到)周六/.test(s)) return [1, 2, 3, 4, 5, 6];
  if (/thu 2 (den|toi|-|–) thu 6|t2 ?- ?t6|weekdays?|mon(day)?\s*(-|to|through)\s*fri(day)?|工作日|周一(至|到)周五/.test(s)) return [1, 2, 3, 4, 5];
  if (/ca tuan|moi ngay trong tuan|every day|7 days|全周|每周七天/.test(s)) return [1, 2, 3, 4, 5, 6, 7];
  return null;
}

function docKhung(s: string): { k: KhungGioChi; gia_dinh?: string } | null {
  const m = /(\d{1,2})(?:[:h](\d{2})?)?\s*(am|pm|点)?\s*(?:-|–|den|toi|to|until|至|到)\s*(\d{1,2})(?:[:h](\d{2})?)?\s*(am|pm|点|h|gio)?/.exec(s);
  const ngay = docNgay(s);
  if (m && (/[:h]|am|pm|点|gio/.test(m[0]))) {
    let tu = Number(m[1]);
    let den = Number(m[4]);
    if (m[3] === 'pm' && tu < 12) tu += 12;
    if (m[6] === 'pm' && den < 12) den += 12;
    const tuPhut = tu * 60 + Number(m[2] ?? 0);
    const denPhut = den * 60 + Number(m[5] ?? 0);
    if (tu <= 24 && den <= 24 && tuPhut !== denPhut && tuPhut < 1440 && denPhut <= 1440 && denPhut > 0) {
      return { k: { tuPhut, denPhut, thu: ngay ?? [1, 2, 3, 4, 5, 6, 7] } };
    }
  }
  if (TU_GIO_HANH_CHINH.test(s)) {
    return { k: { tuPhut: 8 * 60, denPhut: 17 * 60 + 30, thu: ngay ?? [1, 2, 3, 4, 5] }, gia_dinh: 'gio_hanh_chinh' };
  }
  return null;
}

/** Đọc một câu lệnh đã được bỏ tên agent. Không biết gì về chính sách hiện có. */
export function docLenh(cauGoc: string): LenhDaDoc {
  const s = ` ${boDau(cauGoc).replace(/\s+/g, ' ')} `;
  const thay: ThayDoi[] = [];
  const chuaHieu: string[] = [];
  const lanRanh = LAN_RANH.filter(([, re]) => re.test(s)).map(([l]) => l);

  if (TU_TAM_DUNG.test(s)) thay.push({ loai: 'tam_dung' });
  else if (TU_BAT_LAI.test(s)) thay.push({ loai: 'bat_lai' });

  // Khung giờ trước: số trong khung giờ không được bị đọc thành tiền (docSoTien đã bỏ số có "h"/":").
  const kh = docKhung(s);
  if (kh) thay.push({ loai: 'khung_gio', gia_tri: kh.k, ...(kh.gia_dinh ? { gia_dinh: kh.gia_dinh } : {}) });
  if (TU_NGOAI_GIO.test(s)) {
    const sau = s.slice(s.search(TU_NGOAI_GIO));
    if (TU_CAM.test(sau)) thay.push({ loai: 'ngoai_khung_gio', gia_tri: 'tu_choi' });
    else if (TU_DUYET.test(sau)) thay.push({ loai: 'ngoai_khung_gio', gia_tri: 'cho_duyet' });
  }

  // Nhóm chi: chỉ khi có "chỉ được chi cho / only for" — tên agent ("agent quảng cáo") không phải lệnh.
  const viTriChi = s.search(TU_CHI_CHO);
  if (viTriChi >= 0) {
    const sau = s.slice(viTriChi);
    const nhom = NHOM_TU.filter(([, re]) => re.test(sau)).map(([n]) => n);
    if (nhom.length) thay.push({ loai: 'nhom_chi', gia_tri: nhom });
  }

  if (TU_TRA_DA_DUYET.test(s)) thay.push({ loai: 'chi_nguoi_nhan_da_duyet', gia_tri: true });
  else if (TU_NGUOI_LA_HOI.test(s)) thay.push({ loai: 'chi_nguoi_nhan_da_duyet', gia_tri: false });

  // Tiền: ghép mỗi số với từ khoá gần nhất (tham lam theo khoảng cách), mỗi từ khoá dùng một lần.
  const so = docSoTien(s);
  const coDuyet = TU_DUYET.test(s);
  type Moc = { truong: TruongTien; tu: number; den: number };
  const moc: Moc[] = [];
  for (const { truong, re } of TU_TIEN) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) moc.push({ truong, tu: m.index, den: m.index + m[0].length });
  }
  // "mỗi người nhận" chứa "một"... không trùng; nhưng "mỗi khoản" trong "trên 1 triệu mỗi khoản phải hỏi" vẫn là mỗi lần.
  const daDung = new Set<number>();
  const conSo: SoTien[] = [];
  for (const x of so) {
    const truoc = s.slice(Math.max(0, x.tu - 16), x.tu);
    if (coDuyet && TU_TREN.test(truoc)) {
      thay.push({ loai: 'tien', truong: 'nguongCanDuyet', gia_tri: x.gia_tri });
      continue;
    }
    conSo.push(x);
  }
  const cap = conSo.flatMap((x, i) => moc.map((mk, j) => ({
    i, j, kc: mk.tu >= x.den ? mk.tu - x.den : x.tu >= mk.den ? x.tu - mk.den : 0,
  }))).sort((a, b) => a.kc - b.kc);
  const soDaGhep = new Set<number>();
  for (const c of cap) {
    if (soDaGhep.has(c.i) || daDung.has(c.j) || c.kc > 40) continue;
    soDaGhep.add(c.i);
    daDung.add(c.j);
    thay.push({ loai: 'tien', truong: moc[c.j].truong, gia_tri: conSo[c.i].gia_tri });
  }
  conSo.forEach((x, i) => {
    if (!soDaGhep.has(i)) chuaHieu.push(s.slice(Math.max(0, x.tu - 20), x.den + 12).trim());
  });

  if (coDuyet && !thay.some((t) => t.loai === 'tien' && t.truong === 'nguongCanDuyet') && TU_MOI_KHOAN_DUYET.test(s)
    && !thay.some((t) => t.loai === 'ngoai_khung_gio' && t.gia_tri === 'cho_duyet')) {
    thay.push({ loai: 'tien', truong: 'nguongCanDuyet', gia_tri: 0 });
  }
  if (TU_BO_DUYET.test(s)) thay.push({ loai: 'bo_duyet' });

  // Cùng một trường đọc ra hai lần thì lấy lần sau (người nói thường sửa ở cuối câu).
  const cuoi = new Map<string, ThayDoi>();
  for (const t of thay) cuoi.set(t.loai === 'tien' ? `tien:${t.truong}` : t.loai, t);
  return { thay_doi: [...cuoi.values()], lan_ranh: lanRanh, chua_hieu: chuaHieu };
}

// ── Chọn agent ────────────────────────────────────────────────────────────────

export interface AgentCfo { id: string; ten: string; trang_thai: string }

/**
 * Agent câu lệnh nói tới: tên agent (không dấu, không phân biệt hoa thường) xuất hiện trong câu. Tên dài
 * thắng tên ngắn ("Agent quảng cáo Tết" thắng "Agent quảng cáo"). Chỉ có một agent đang dùng thì là nó.
 */
/**
 * Vị trí tên trong câu, chỉ tính khi đứng thành CỤM TỪ riêng: agent tên "hi" không được khớp vào giữa chữ "chi"
 * hay "this" (gặp thật trên cửa hàng demo 16/10/2026). Tên chữ Hán thì không có ranh giới từ, so thẳng.
 */
function viTriTen(s: string, ten: string): number {
  if (!ten) return -1;
  if (/[一-鿿]/.test(ten)) return s.indexOf(ten);
  const chu = (c: string | undefined) => !!c && /[a-z0-9]/.test(c);
  for (let i = s.indexOf(ten); i >= 0; i = s.indexOf(ten, i + 1)) {
    if (!chu(s[i - 1]) && !chu(s[i + ten.length])) return i;
  }
  return -1;
}

export function chonAgent(cau: string, ds: AgentCfo[]): { agent: AgentCfo | null; cau_con_lai: string; mo_ho: AgentCfo[] } {
  const dang = ds.filter((a) => a.trang_thai !== 'thu_hoi');
  const s = boDau(cau);
  const khop = dang
    .map((a) => {
      const ten = boDau(a.ten).trim();
      const bo = ten.replace(/^(agent|tac tu|bot)\s+/, '');
      const thay = viTriTen(s, ten) >= 0 ? ten : bo.length >= 3 && viTriTen(s, bo) >= 0 ? bo : null;
      return thay ? { a, thay } : null;
    })
    .filter((x): x is { a: AgentCfo; thay: string } => !!x)
    .sort((x, y) => y.thay.length - x.thay.length);
  if (khop.length) {
    const i = viTriTen(s, khop[0].thay);
    return { agent: khop[0].a, cau_con_lai: `${s.slice(0, i)} ${s.slice(i + khop[0].thay.length)}`, mo_ho: [] };
  }
  if (dang.length === 1) return { agent: dang[0], cau_con_lai: s, mo_ho: [] };
  return { agent: null, cau_con_lai: s, mo_ho: dang };
}

// ── Áp và kiểm ────────────────────────────────────────────────────────────────

export type HuongThayDoi = 'siet' | 'noi' | 'giu';

export interface DongSoSanh {
  muc: string;
  truoc: string;
  sau: string;
  huong: HuongThayDoi;
}

export interface KetQuaApDung {
  moi: ChinhSach;
  dong: DongSoSanh[];
  /** Lệnh tự mâu thuẫn hoặc vi phạm khuôn của máy chủ — không ra nút áp dụng. */
  loi: string[];
  /** Nới đáng chú ý — vẫn áp được, nhưng hộp xác nhận phải nói. */
  canh_bao: string[];
  tam_dung: boolean;
  bat_lai: boolean;
}

/** Nới một trần quá ngần này lần mức cũ thì cảnh báo. */
export const HE_SO_NOI_LON = 3;

const TU = {
  vi: {
    hanMucMoiLan: 'Trần mỗi khoản', hanMucNgay: 'Trần mỗi ngày', hanMucThang: 'Trần mỗi tháng',
    nguongCanDuyet: 'Trên mức này phải có người duyệt', hanMucMoiNguoiNhanThang: 'Trần mỗi người nhận / tháng',
    khung: 'Khung giờ được chi', ngoai: 'Ngoài khung giờ', nhom: 'Nhóm chi được phép', nhan: 'Người nhận lạ',
    trangThai: 'Trạng thái agent', moiLuc: 'Mọi lúc', moiNhom: 'Mọi nhóm', khongGioiHan: 'Không giới hạn riêng',
    tuChoi: 'Từ chối', choDuyet: 'Chờ người duyệt', moiKhoanDuyet: 'Mọi khoản đều phải duyệt',
    laTuChoi: 'Từ chối (chỉ trả người nhận trong danh sách)', laHoi: 'Phải có người duyệt',
    hoatDong: 'Đang chạy', tamDung: 'Tạm dừng',
    thuTu: (a: string, b: string) => `${a} phải nhỏ hơn hoặc bằng ${b}. Nói thêm ${b.toLowerCase()} mới trong cùng lệnh — MIMI không tự nâng trần khác cho khớp.`,
    noiLon: (m: string, h: number) => `${m} tăng hơn ${h} lần mức cũ.`,
    boDuyet: 'Bỏ bước duyệt: mọi khoản trong trần sẽ tự được duyệt (người trả vẫn là người, bằng app ngân hàng).',
    moNguoiLa: 'Người nhận chưa có trong danh sách sẽ không còn bị từ chối thẳng, mà vào hàng chờ duyệt.',
    batLai: 'Bật lại agent: nó xin chi được ngay theo chính sách sau khi áp dụng.',
  },
  en: {
    hanMucMoiLan: 'Cap per payment', hanMucNgay: 'Cap per day', hanMucThang: 'Cap per month',
    nguongCanDuyet: 'Above this, an approver must sign off', hanMucMoiNguoiNhanThang: 'Cap per recipient / month',
    khung: 'Allowed spending hours', ngoai: 'Outside those hours', nhom: 'Allowed spending categories', nhan: 'Unknown recipients',
    trangThai: 'Agent status', moiLuc: 'Any time', moiNhom: 'All categories', khongGioiHan: 'No separate cap',
    tuChoi: 'Refuse', choDuyet: 'Wait for approver', moiKhoanDuyet: 'Every payment needs approval',
    laTuChoi: 'Refuse (pay listed recipients only)', laHoi: 'Needs an approver',
    hoatDong: 'Running', tamDung: 'Paused',
    thuTu: (a: string, b: string) => `${a} must be at most ${b}. Say the new ${b.toLowerCase()} in the same command — MIMI will not raise another cap on its own to make it fit.`,
    noiLon: (m: string, h: number) => `${m} rises more than ${h}× the old value.`,
    boDuyet: 'Approval removed: every payment within the caps is approved automatically (a person still pays from the banking app).',
    moNguoiLa: 'Unlisted recipients will no longer be refused outright; they go to the approval queue.',
    batLai: 'Agent resumes: it can request spending under the new policy as soon as you apply.',
  },
  zh: {
    hanMucMoiLan: '单笔上限', hanMucNgay: '每日上限', hanMucThang: '每月上限',
    nguongCanDuyet: '超过此金额须审批', hanMucMoiNguoiNhanThang: '单个收款人每月上限',
    khung: '允许付款时段', ngoai: '时段之外', nhom: '允许的支出类别', nhan: '陌生收款人',
    trangThai: '智能体状态', moiLuc: '任何时间', moiNhom: '所有类别', khongGioiHan: '不单独设限',
    tuChoi: '拒绝', choDuyet: '等待审批', moiKhoanDuyet: '每笔都须审批',
    laTuChoi: '拒绝（只付给名单内收款人）', laHoi: '须审批',
    hoatDong: '运行中', tamDung: '已暂停',
    thuTu: (a: string, b: string) => `${a}必须不超过${b}。请在同一条指令中给出新的${b}——MIMI 不会自行提高其他上限来凑合。`,
    noiLon: (m: string, h: number) => `${m}提高超过原值的 ${h} 倍。`,
    boDuyet: '取消审批：上限内的每笔付款将自动批准（付款仍由人在银行 App 完成）。',
    moNguoiLa: '名单外的收款人不再被直接拒绝，而是进入审批队列。',
    batLai: '恢复智能体：应用后即可按新规则申请付款。',
  },
} as const;

export const tuCfo = (n: NgonNgu) => TU[n];

const TEN_NHOM: Record<NgonNgu, Record<NhomChi, string>> = {
  vi: TEN_NHOM_CHI,
  en: { ha_tang_ai: 'AI infrastructure, APIs, servers', phan_mem: 'Software, subscriptions', quang_cao: 'Advertising', nha_cung_cap: 'Goods suppliers', van_chuyen: 'Shipping', khac: 'Other' },
  zh: { ha_tang_ai: 'AI 基础设施、API、服务器', phan_mem: '软件、订阅', quang_cao: '广告', nha_cung_cap: '货物供应商', van_chuyen: '物流运输', khac: '其他' },
};

const THU_TEN: Record<NgonNgu, string[]> = {
  vi: [],
  en: ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  zh: ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'],
};

const hhmm = (p: number) => `${String(Math.floor(p / 60)).padStart(2, '0')}:${String(p % 60).padStart(2, '0')}`;

export function moTaKhung(k: KhungGioChi | null | undefined, n: NgonNgu): string {
  if (!k) return TU[n].moiLuc;
  if (n === 'vi') return moTaKhungGio(k);
  const thu = [...k.thu].sort((a, b) => a - b);
  const lien = thu.length > 2 && thu.every((t, i) => i === 0 || t === thu[i - 1] + 1);
  const ngay = thu.length === 7 ? (n === 'en' ? 'every day' : '每天')
    : lien ? `${THU_TEN[n][thu[0]]}–${THU_TEN[n][thu[thu.length - 1]]}` : thu.map((t) => THU_TEN[n][t]).join(', ');
  return `${hhmm(k.tuPhut)}–${hhmm(k.denPhut)}, ${ngay}`;
}

export const vndCfo = (v: number) => `${Math.round(v).toLocaleString('vi-VN')} ₫`;

const doRongKhung = (k: KhungGioChi | null | undefined) => {
  if (!k) return 7 * 1440;
  const phut = k.tuPhut < k.denPhut ? k.denPhut - k.tuPhut : 1440 - k.tuPhut + k.denPhut;
  return phut * k.thu.length;
};

/** Áp các thay đổi lên chính sách hiện có, đối chiếu từng mục, và kiểm như máy chủ sẽ kiểm. */
export function apThayDoi(cu: ChinhSach, ds: ThayDoi[], n: NgonNgu, trangThai: string): KetQuaApDung {
  const t = TU[n];
  const moi: ChinhSach = { ...cu };
  const dong: DongSoSanh[] = [];
  const loi: string[] = [];
  const canhBao: string[] = [];
  let tamDung = false;
  let batLai = false;

  const tien = (truong: TruongTien, v: number) => {
    const truoc = cu[truong] ?? null;
    moi[truong] = v as never;
    const huong: HuongThayDoi = truoc === v ? 'giu' : truoc === null ? 'siet' : v < truoc ? 'siet' : 'noi';
    const hien = (x: number | null) => (x === null ? t.khongGioiHan : truong === 'nguongCanDuyet' && x === 0 ? t.moiKhoanDuyet : vndCfo(x));
    dong.push({ muc: t[truong], truoc: hien(truoc), sau: hien(v), huong });
    if (huong === 'noi' && truoc !== null && truoc > 0 && v > truoc * HE_SO_NOI_LON) canhBao.push(t.noiLon(t[truong], HE_SO_NOI_LON));
  };

  for (const x of ds) {
    switch (x.loai) {
      case 'tien': tien(x.truong, x.gia_tri); break;
      case 'bo_duyet': {
        // "Không cần duyệt" = ngưỡng duyệt bằng trần mỗi khoản (sau khi đã áp trần mới nếu có).
        const tran = ds.find((y) => y.loai === 'tien' && y.truong === 'hanMucMoiLan') as { gia_tri: number } | undefined;
        tien('nguongCanDuyet', tran?.gia_tri ?? moi.hanMucMoiLan);
        canhBao.push(t.boDuyet);
        break;
      }
      case 'khung_gio': {
        const truoc = cu.khungGioChi ?? null;
        moi.khungGioChi = x.gia_tri;
        const huong: HuongThayDoi = doRongKhung(x.gia_tri) < doRongKhung(truoc) ? 'siet' : doRongKhung(x.gia_tri) > doRongKhung(truoc) ? 'noi' : 'giu';
        dong.push({ muc: t.khung, truoc: moTaKhung(truoc, n), sau: moTaKhung(x.gia_tri, n), huong });
        break;
      }
      case 'ngoai_khung_gio': {
        const truoc = cu.ngoaiKhungGio ?? 'cho_duyet';
        moi.ngoaiKhungGio = x.gia_tri;
        const ten = (v: string) => (v === 'tu_choi' ? t.tuChoi : t.choDuyet);
        dong.push({ muc: t.ngoai, truoc: ten(truoc), sau: ten(x.gia_tri), huong: truoc === x.gia_tri ? 'giu' : x.gia_tri === 'tu_choi' ? 'siet' : 'noi' });
        break;
      }
      case 'nhom_chi': {
        const truoc = cu.nhomChiDuocPhep;
        moi.nhomChiDuocPhep = x.gia_tri;
        const ten = (v: string[] | null) => (v ? v.map((g) => TEN_NHOM[n][g as NhomChi] ?? g).join(', ') : t.moiNhom);
        const rongHon = truoc !== null && x.gia_tri.some((g) => !truoc.includes(g));
        const hepHon = truoc === null || truoc.some((g) => !x.gia_tri.includes(g as NhomChi));
        dong.push({ muc: t.nhom, truoc: ten(truoc), sau: ten(x.gia_tri), huong: rongHon ? 'noi' : hepHon ? 'siet' : 'giu' });
        break;
      }
      case 'chi_nguoi_nhan_da_duyet': {
        const truoc = cu.chiTraNguoiNhanDaDuyet;
        moi.chiTraNguoiNhanDaDuyet = x.gia_tri;
        const ten = (v: boolean) => (v ? t.laTuChoi : t.laHoi);
        dong.push({ muc: t.nhan, truoc: ten(truoc), sau: ten(x.gia_tri), huong: truoc === x.gia_tri ? 'giu' : x.gia_tri ? 'siet' : 'noi' });
        if (truoc && !x.gia_tri) canhBao.push(t.moNguoiLa);
        break;
      }
      case 'tam_dung':
        if (trangThai !== 'tam_dung') {
          tamDung = true;
          dong.push({ muc: t.trangThai, truoc: t.hoatDong, sau: t.tamDung, huong: 'siet' });
        }
        break;
      case 'bat_lai':
        if (trangThai === 'tam_dung') {
          batLai = true;
          dong.push({ muc: t.trangThai, truoc: t.tamDung, sau: t.hoatDong, huong: 'noi' });
          canhBao.push(t.batLai);
        }
        break;
    }
  }

  // Cùng luật với máy chủ (`tac-tu → luu_chinh_sach`): mỗi khoản ≤ mỗi ngày ≤ mỗi tháng.
  if (moi.hanMucMoiLan > moi.hanMucNgay) loi.push(t.thuTu(t.hanMucMoiLan, t.hanMucNgay));
  if (moi.hanMucNgay > moi.hanMucThang) loi.push(t.thuTu(t.hanMucNgay, t.hanMucThang));
  return { moi, dong, loi, canh_bao: canhBao, tam_dung: tamDung, bat_lai: batLai };
}

/** Mặc định khi agent chưa có dòng chính sách — cùng số với `CHINH_SACH_MAC_DINH` của cổng agent (chặt nhất). */
export const CHINH_SACH_GOC: ChinhSach = {
  hanMucMoiLan: 2_000_000, hanMucNgay: 5_000_000, hanMucThang: 50_000_000, nguongCanDuyet: 0,
  nhomChiDuocPhep: null, chiTraNguoiNhanDaDuyet: true, hetHan: null, soYeuCauMoiGio: 30,
  khungGioChi: null, ngoaiKhungGio: 'cho_duyet', hanMucMoiNguoiNhanThang: null,
};

/** Dòng `chinh_sach_chi` (số bigint về dạng chuỗi) → `ChinhSach`. Khung giờ hỏng thì đóng chặt, như cổng agent. */
export function chinhSachTuDong(r: Record<string, unknown> | null | undefined): ChinhSach {
  if (!r) return CHINH_SACH_GOC;
  const k = docKhungGio(r.khung_gio_chi);
  const so = (v: unknown, mac: number) => (v === undefined || v === null || v === '' ? mac : Number(v));
  return {
    hanMucMoiLan: so(r.han_muc_moi_lan, CHINH_SACH_GOC.hanMucMoiLan),
    hanMucNgay: so(r.han_muc_ngay, CHINH_SACH_GOC.hanMucNgay),
    hanMucThang: so(r.han_muc_thang, CHINH_SACH_GOC.hanMucThang),
    nguongCanDuyet: so(r.nguong_can_duyet, 0),
    nhomChiDuocPhep: Array.isArray(r.nhom_chi_duoc_phep) ? (r.nhom_chi_duoc_phep as string[]) : null,
    chiTraNguoiNhanDaDuyet: r.chi_tra_nguoi_nhan_da_duyet === undefined ? true : Boolean(r.chi_tra_nguoi_nhan_da_duyet),
    hetHan: typeof r.het_han === 'string' ? r.het_han : null,
    soYeuCauMoiGio: r.so_yeu_cau_moi_gio === undefined ? 30 : r.so_yeu_cau_moi_gio === null ? null : Number(r.so_yeu_cau_moi_gio),
    khungGioChi: k === 'sai' ? { tuPhut: 0, denPhut: 1440, thu: [] } : k,
    ngoaiKhungGio: r.ngoai_khung_gio === 'tu_choi' ? 'tu_choi' : 'cho_duyet',
    hanMucMoiNguoiNhanThang: r.han_muc_moi_nguoi_nhan_thang == null ? null : Number(r.han_muc_moi_nguoi_nhan_thang),
  };
}

/** Thân lệnh `tac-tu → luu_chinh_sach` từ chính sách mới — đủ mọi trường, để không trường nào bị lặng lẽ xoá. */
export function thanLuuChinhSach(tacTuId: string, cs: ChinhSach, kyVong: string | null) {
  return {
    tac_tu_id: tacTuId,
    han_muc_moi_lan: cs.hanMucMoiLan,
    han_muc_ngay: cs.hanMucNgay,
    han_muc_thang: cs.hanMucThang,
    nguong_can_duyet: cs.nguongCanDuyet,
    nhom_chi_duoc_phep: cs.nhomChiDuocPhep,
    chi_tra_nguoi_nhan_da_duyet: cs.chiTraNguoiNhanDaDuyet,
    het_han: cs.hetHan,
    so_yeu_cau_moi_gio: cs.soYeuCauMoiGio ?? null,
    khung_gio_chi: cs.khungGioChi ? { tu_phut: cs.khungGioChi.tuPhut, den_phut: cs.khungGioChi.denPhut, thu: cs.khungGioChi.thu } : null,
    ngoai_khung_gio: cs.ngoaiKhungGio ?? 'cho_duyet',
    han_muc_moi_nguoi_nhan_thang: cs.hanMucMoiNguoiNhanThang ?? null,
    ky_vong_cap_nhat: kyVong,
  };
}

// ── Chạy thử trên lịch sử ─────────────────────────────────────────────────────

export interface YeuCauCu {
  id: string;
  so_tien: number;
  created_at: string;
  nhom_chi: string | null;
  ngan_hang_bin: string | null;
  so_tai_khoan: string | null;
  muc_dich: string;
}

export interface DemQuyetDinh { tu_dong_duyet: number; cho_duyet: number; tu_choi: number }

export interface KetQuaChayThu {
  so_khoan: number;
  truoc: DemQuyetDinh;
  sau: DemQuyetDinh;
  /** Khoản đổi kết quả, để bảng bằng chứng trỏ đúng bản ghi. */
  doi: { id: string; tu: KetQuaXet; sang: KetQuaXet }[];
}

/**
 * Xét lại từng khoản agent đã xin, theo thứ tự thời gian, bằng CHÍNH bộ luật `xetYeuCau` — một lần với
 * chính sách cũ, một lần với chính sách mới. Hạn mức đã giữ cộng dồn trong lượt chạy thử (khoản bị từ
 * chối không giữ hạn mức). Kiểm người nhận được giữ cố định (coi như đã có trong danh sách từ trước) để
 * chỉ đo phần chính sách đổi; trạng thái agent coi như đang chạy.
 */
export function chayThu(ds: YeuCauCu[], cu: ChinhSach, moi: ChinhSach): KetQuaChayThu {
  const theoGio = [...ds].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const mot = (cs: ChinhSach) => {
    const kq = new Map<string, KetQuaXet>();
    const ngay = new Map<string, number>();
    const thang = new Map<string, number>();
    const nhanThang = new Map<string, number>();
    const gio: number[] = [];
    for (const y of theoGio) {
      const luc = new Date(y.created_at);
      const vn = new Date(luc.getTime() + 7 * 3_600_000).toISOString();
      const kN = vn.slice(0, 10);
      const kT = vn.slice(0, 7);
      const kNh = `${kT}:${y.ngan_hang_bin}:${y.so_tai_khoan}`;
      const trongGio = gio.filter((g) => luc.getTime() - g < 3_600_000).length;
      const bin = y.ngan_hang_bin ?? '970422';
      const stk = y.so_tai_khoan && /^\d{6,19}$/.test(y.so_tai_khoan) ? y.so_tai_khoan : '000000';
      const q = xetYeuCau(
        { soTien: y.so_tien, nganHangBin: bin, soTaiKhoan: stk, nhomChi: y.nhom_chi && (NHOM_CHI as readonly string[]).includes(y.nhom_chi) ? y.nhom_chi : 'khac', mucDich: y.muc_dich.length >= 5 ? y.muc_dich : 'chạy thử' },
        { ...cs, hetHan: null },
        {
          trangThaiTacTu: 'hoat_dong',
          daGiuNgay: ngay.get(kN) ?? 0,
          daGiuThang: thang.get(kT) ?? 0,
          nguoiNhanDaDuyet: [{ nganHangBin: bin, soTaiKhoan: stk, themLuc: '2000-01-01T00:00:00Z' }],
          nganHangHopLe: true,
          luc,
          soYeuCauGioQua: trongGio,
          daGiuNguoiNhanThang: nhanThang.get(kNh) ?? 0,
        },
      );
      kq.set(y.id, q.ketQua);
      gio.push(luc.getTime());
      if (q.ketQua !== 'tu_choi') {
        ngay.set(kN, (ngay.get(kN) ?? 0) + y.so_tien);
        thang.set(kT, (thang.get(kT) ?? 0) + y.so_tien);
        nhanThang.set(kNh, (nhanThang.get(kNh) ?? 0) + y.so_tien);
      }
    }
    return kq;
  };
  const a = mot(cu);
  const b = mot(moi);
  const dem = (m: Map<string, KetQuaXet>): DemQuyetDinh => {
    const d = { tu_dong_duyet: 0, cho_duyet: 0, tu_choi: 0 };
    for (const v of m.values()) d[v] += 1;
    return d;
  };
  return {
    so_khoan: theoGio.length,
    truoc: dem(a),
    sau: dem(b),
    doi: theoGio.filter((y) => a.get(y.id) !== b.get(y.id)).map((y) => ({ id: y.id, tu: a.get(y.id)!, sang: b.get(y.id)! })),
  };
}

// ── Phân quyền cho NGƯỜI: gợi ý vai trò ít quyền nhất ─────────────────────────

const VIEC_TU: [HanhDong, RegExp][] = [
  ['duyet_chi', /duyet chi|duyet (cac )?khoan|approve (payments?|spending|expenses?)|sign off (on )?(payments?|spending)|审批付款|批准付款|审批支出/],
  ['tao_yeu_cau_chi', /(tao|lap|gui) (yeu cau|de nghi) chi|request (payments?|spending)|raise (payment )?requests?|申请付款|提交付款申请/],
  ['soan_to_khai', /soan (to khai|ho so thue)|lam (to khai|thue)|draft (the )?tax|prepare (the )?tax|tax (forms?|returns?)|起草申报|准备税表|报税表/],
  ['ghi_chung_tu', /ghi (chung tu|so)|nhap (chung tu|hoa don)|record (documents?|receipts?|invoices?)|bookkeeping|记账|录入凭证/],
  ['quan_ly_agent', /quan ly agent|chinh (sach|han muc) (chi|agent)|manage agents?|set (agent )?limits|管理智能体|设置限额/],
  ['quan_ly_thanh_vien', /moi (nguoi|thanh vien)|quan ly thanh vien|invite (people|members)|manage (members|team)|邀请成员|管理成员/],
  ['noi_ngan_hang', /noi (ngan hang|tai khoan)|lien ket ngan hang|connect (the )?bank|link (the )?bank|连接银行|绑定银行/],
  ['xem', /\bxem\b|theo doi|view|see (the )?(numbers|reports|books)|read[- ]only|查看|只看/],
];
const TU_PHU_DINH = /(nhung |va )?(khong (duoc|cho)|cam|but not|not allowed to|must not|cannot|can't|without|但不|不能|不许|不可以)/;
const TU_NGUOI = /ke toan|thu quy|nhan vien|vo toi|chong toi|con toi|em toi|chi toi|anh toi|nguoi nha|accountant|bookkeeper|staff|employee|assistant|my (wife|husband|son|daughter|partner|brother|sister)|会计|出纳|员工|助理|家人|我(妻子|丈夫|儿子|女儿|哥哥|姐姐)/;
const TU_QUYEN = /quyen|vai tro|phan quyen|cho (phep )?.{0,40}(duoc|lam|soan|duyet|xem|ghi)|role|permission|access|let .{0,24} (approve|draft|view|see|record)|权限|角色|让.{0,10}(审批|查看|记账)/;

/** Thứ tự từ ít quyền tới nhiều quyền — gợi ý vai trò ĐẦU TIÊN đủ việc cần làm và không chạm việc bị cấm. */
const THU_TU_VAI_TRO: VaiTro[] = ['nguoi_xem', 'ke_toan', 'nguoi_duyet', 'quan_tri', 'chu_so_huu'];

export interface GoiYVaiTro {
  can: HanhDong[];
  cam: HanhDong[];
  vai_tro: VaiTro | null;
  /** Vai trò nào cũng phải bỏ một việc cần làm hoặc chạm một việc bị cấm. */
  mau_thuan: boolean;
}

export const laLenhPhanQuyenNguoi = (cau: string) => {
  const s = boDau(cau);
  return TU_NGUOI.test(s) && TU_QUYEN.test(s) && VIEC_TU.some(([, re]) => re.test(s));
};

export function goiYVaiTro(cau: string): GoiYVaiTro {
  const s = boDau(cau);
  const viTriPhuDinh = s.search(TU_PHU_DINH);
  const can: HanhDong[] = [];
  const cam: HanhDong[] = [];
  for (const [hd, re] of VIEC_TU) {
    const m = re.exec(s);
    if (!m) continue;
    (viTriPhuDinh >= 0 && m.index > viTriPhuDinh ? cam : can).push(hd);
  }
  if (!can.includes('xem')) can.unshift('xem');
  const vai = THU_TU_VAI_TRO.find((v) => can.every((h) => duocLam(v, h)) && !cam.some((h) => duocLam(v, h))) ?? null;
  return { can, cam, vai_tro: vai, mau_thuan: vai === null };
}

const TEN_VAI_TRO_NN: Record<NgonNgu, Record<VaiTro, string>> = {
  vi: TEN_VAI_TRO,
  en: { chu_so_huu: 'Owner', quan_tri: 'Admin', nguoi_duyet: 'Approver', ke_toan: 'Accountant', nguoi_xem: 'Viewer' },
  zh: { chu_so_huu: '企业主', quan_tri: '管理员', nguoi_duyet: '审批人', ke_toan: '会计', nguoi_xem: '查看者' },
};
export const tenVaiTro = (v: VaiTro, n: NgonNgu) => TEN_VAI_TRO_NN[n][v];

const TEN_VIEC: Record<NgonNgu, Partial<Record<HanhDong, string>>> = {
  vi: {
    xem: 'Xem số liệu', ghi_chung_tu: 'Ghi chứng từ', soan_to_khai: 'Soạn tờ khai', tao_yeu_cau_chi: 'Tạo đề nghị chi',
    duyet_chi: 'Duyệt chi', quan_ly_agent: 'Đặt chính sách agent', quan_ly_thanh_vien: 'Mời / đổi thành viên', noi_ngan_hang: 'Nối ngân hàng',
  },
  en: {
    xem: 'View numbers', ghi_chung_tu: 'Record documents', soan_to_khai: 'Draft tax forms', tao_yeu_cau_chi: 'Raise payment requests',
    duyet_chi: 'Approve payments', quan_ly_agent: 'Set agent policies', quan_ly_thanh_vien: 'Invite / change members', noi_ngan_hang: 'Connect bank',
  },
  zh: {
    xem: '查看数据', ghi_chung_tu: '录入凭证', soan_to_khai: '起草税表', tao_yeu_cau_chi: '提交付款申请',
    duyet_chi: '审批付款', quan_ly_agent: '设置智能体规则', quan_ly_thanh_vien: '邀请 / 调整成员', noi_ngan_hang: '连接银行',
  },
};
export const VIEC_HIEN: HanhDong[] = ['xem', 'ghi_chung_tu', 'soan_to_khai', 'tao_yeu_cau_chi', 'duyet_chi', 'quan_ly_agent', 'quan_ly_thanh_vien', 'noi_ngan_hang'];
export const tenViec = (h: HanhDong, n: NgonNgu) => TEN_VIEC[n][h] ?? h;

/** Cho test: mọi việc trong bảng hiện đều là hành động thật trong ma trận quyền. */
export const VIEC_HIEN_HOP_LE = VIEC_HIEN.every((h) => (HANH_DONG as readonly string[]).includes(h) && QUYEN[h].length > 0) && VAI_TRO.length === 5;
